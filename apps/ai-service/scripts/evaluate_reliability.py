"""Real-world reliability evaluation (synthetic rows completely excluded).

Evaluates the *calibrated* predictor exactly as the API serves it:

  * vision   : 555 held-out real field photographs (data/images/val)
  * symptoms : 404 real clinical records (81 held-out val + 323 train rows)
  * fusion   : real image + real symptom pairs
               - full   : every real symptom row (includes training rows)
               - strict : held-out symptom rows only (honest generalisation)
  * edge     : sparse / ambiguous reports that previously looked certain

Reports accuracy, macro-F1 over present classes, ECE, Brier score, confidence
bands, selective accuracy / coverage, and error-confidence safety metrics.

Usage:
    python scripts/evaluate_reliability.py
"""

from __future__ import annotations

import json
import sys
import time
import warnings
from pathlib import Path
from typing import Dict, List, Sequence

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    top_k_accuracy_score,
)

ROOT = Path(__file__).resolve().parents[1]
for candidate in (ROOT, ROOT / "scripts"):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

from app.calibration import brier_score, expected_calibration_error  # noqa: E402
from app.constants import (  # noqa: E402
    CLASSES,
    IMAGE_CLASSES,
    IMAGE_CLASS_DIRS,
    SEVERITY_LEVELS,
    SYMPTOMS,
)
from app.features import feature_name_for_symptom  # noqa: E402
from app.predictor import get_predictor  # noqa: E402
from app.schemas.prediction import PredictionRequest  # noqa: E402

MODELS_DIR = ROOT / "models"
IMAGES_DIR = ROOT / "data" / "images"
SYMPTOM_CSV = ROOT / "data" / "cattle_symptoms.csv"
_DIR_TO_CLASS = {directory: name for name, directory in IMAGE_CLASS_DIRS.items()}
BANDS = ("high", "medium", "low")
warnings.filterwarnings("ignore", message="y_pred contains classes not in y_true")


def _jsonable(value):
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(item) for item in value]
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        return float(value)
    if isinstance(value, np.ndarray):
        return value.tolist()
    return value


def load_real_symptoms() -> pd.DataFrame:
    frame = pd.read_csv(SYMPTOM_CSV)
    frame = frame[frame["source"].astype(str).str.startswith("reference:")]
    return frame.reset_index(drop=True)


def row_to_request(row: pd.Series) -> PredictionRequest:
    symptoms = [s for s in SYMPTOMS if float(row[feature_name_for_symptom(s)]) > 0.5]
    return PredictionRequest(
        symptoms=symptoms,
        temperature=float(row["temperature"]),
        duration=float(row["duration_days"]),
        severity=SEVERITY_LEVELS[int(row["severity"])],
    )


def prob_vector(result, class_names: Sequence[str]) -> np.ndarray:
    values = np.array(
        [max(float(result.class_probabilities[name]) / 100.0, 0.0) for name in class_names],
        dtype=np.float64,
    )
    total = float(values.sum())
    if total <= 0:
        return np.full(len(class_names), 1.0 / len(class_names))
    return values / total


def reliability_metrics(
    y_true: Sequence[int],
    y_pred: Sequence[int],
    probs: np.ndarray,
    confidences: Sequence[float],
    low_flags: Sequence[bool],
    bands: Sequence[str],
    class_names: Sequence[str],
) -> Dict:
    y_true = np.asarray(y_true, dtype=int)
    y_pred = np.asarray(y_pred, dtype=int)
    probs = np.asarray(probs, dtype=np.float64)
    confidences = np.asarray(confidences, dtype=np.float64)
    low_flags = np.asarray(low_flags, dtype=bool)
    bands = np.asarray(bands)
    correct = y_pred == y_true
    wrong = ~correct
    labels = list(range(len(class_names)))
    present = sorted(set(y_true.tolist()))

    block: Dict = {
        "n_samples": int(len(y_true)),
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "macro_f1_present": float(
            f1_score(y_true, y_pred, labels=present, average="macro", zero_division=0)
        ),
        "present_classes": [class_names[index] for index in present],
        "ece": float(expected_calibration_error(probs, y_true)),
        "brier": float(brier_score(probs, y_true)),
        "mean_confidence": float(confidences.mean()),
        "median_confidence": float(np.median(confidences)),
        "low_confidence_rate": float(low_flags.mean()),
        "band_counts": {band: int(np.sum(bands == band)) for band in BANDS},
        "confusion_matrix": confusion_matrix(
            y_true, y_pred, labels=labels
        ).tolist(),
    }

    try:
        block["top2_accuracy"] = float(
            top_k_accuracy_score(y_true, probs, k=2, labels=labels)
        )
    except Exception:
        block["top2_accuracy"] = None

    confident = ~low_flags
    high = bands == "high"
    block["selective"] = {
        "confident_coverage": round(float(confident.mean()), 4),
        "confident_accuracy": (
            round(float(correct[confident].mean()), 4) if confident.any() else None
        ),
        "low_confidence_accuracy": (
            round(float(correct[low_flags].mean()), 4) if low_flags.any() else None
        ),
        "high_confidence_coverage": round(float(high.mean()), 4),
        "high_confidence_accuracy": (
            round(float(correct[high].mean()), 4) if high.any() else None
        ),
        "errors": int(wrong.sum()),
        "errors_shown_high_confidence": int(np.sum(wrong & high)),
        "error_high_confidence_share": (
            round(float(np.sum(wrong & high) / wrong.sum()), 4) if wrong.any() else 0.0
        ),
        "high_confidence_error_rate": (
            round(float(np.sum(wrong & high) / high.sum()), 4) if high.any() else 0.0
        ),
    }
    return block


def evaluate_vision(predictor) -> Dict:
    val_dir = IMAGES_DIR / "val"
    samples: List[tuple] = []
    for directory in sorted(val_dir.iterdir()):
        if not directory.is_dir():
            continue
        canonical = _DIR_TO_CLASS.get(directory.name)
        if canonical is None:
            continue
        for path in sorted(directory.glob("*.jpg")):
            samples.append((canonical, path))

    y_true, y_pred, probs, confidences, low_flags, bands = [], [], [], [], [], []
    latencies: List[float] = []

    for expected, path in samples:
        start = time.perf_counter()
        result = predictor.predict(PredictionRequest(image_paths=[str(path)]))
        latencies.append((time.perf_counter() - start) * 1000.0)

        y_true.append(IMAGE_CLASSES.index(expected))
        predicted = result.predicted_disease
        y_pred.append(IMAGE_CLASSES.index(predicted) if predicted in IMAGE_CLASSES else -1)
        probs.append(prob_vector(result, IMAGE_CLASSES))
        confidences.append(result.confidence)
        low_flags.append(result.is_low_confidence)
        bands.append(result.confidence_band)

    block = reliability_metrics(
        y_true, y_pred, np.vstack(probs), confidences, low_flags, bands, IMAGE_CLASSES
    )
    block["latency_ms_mean"] = round(float(np.mean(latencies)), 3)
    block["latency_ms_p95"] = round(float(np.percentile(latencies, 95)), 3)
    return block


def evaluate_symptoms(predictor, frame: pd.DataFrame) -> Dict:
    y_true, y_pred, probs, confidences, low_flags, bands = [], [], [], [], [], []
    latencies: List[float] = []

    for _, row in frame.iterrows():
        start = time.perf_counter()
        result = predictor.predict(row_to_request(row))
        latencies.append((time.perf_counter() - start) * 1000.0)

        y_true.append(CLASSES.index(row["disease"]))
        y_pred.append(CLASSES.index(result.predicted_disease))
        probs.append(prob_vector(result, CLASSES))
        confidences.append(result.confidence)
        low_flags.append(result.is_low_confidence)
        bands.append(result.confidence_band)

    block = reliability_metrics(
        y_true, y_pred, np.vstack(probs), confidences, low_flags, bands, CLASSES
    )
    block["latency_ms_mean"] = round(float(np.mean(latencies)), 3)
    block["latency_ms_p95"] = round(float(np.percentile(latencies, 95)), 3)
    return block


def evaluate_fusion(predictor, real_frame: pd.DataFrame, strict: bool) -> Dict:
    val_dir = IMAGES_DIR / "val"
    if strict and "split" in real_frame.columns:
        frame = real_frame[real_frame["split"] == "val"]
    else:
        frame = real_frame

    pool: Dict[str, List[pd.Series]] = {name: [] for name in CLASSES}
    for _, row in frame.iterrows():
        pool[row["disease"]].append(row)

    samples: List[tuple] = []

    # FMD is the only disease with both real photos and real symptom rows.
    for directory in sorted(val_dir.iterdir()):
        if not directory.is_dir():
            continue
        canonical = _DIR_TO_CLASS.get(directory.name)
        if canonical is None:
            continue
        rows = pool.get(canonical) or []
        if not rows:
            continue
        for index, path in enumerate(sorted(directory.glob("*.jpg"))):
            request = row_to_request(rows[index % len(rows)])
            request.image_paths = [str(path)]
            samples.append((canonical, request))

    # Mastitis and BRD have no public RGB photographs: symptom-only.
    for disease in ("Mastitis", "Bovine Respiratory Disease"):
        rows = pool.get(disease) or []
        limit = len(rows) if strict else min(120, len(rows))
        for row in rows[:limit]:
            samples.append((disease, row_to_request(row)))

    y_true, y_pred, probs, confidences, low_flags, bands = [], [], [], [], [], []
    latencies: List[float] = []

    for expected, request in samples:
        start = time.perf_counter()
        result = predictor.predict(request)
        latencies.append((time.perf_counter() - start) * 1000.0)

        y_true.append(CLASSES.index(expected))
        y_pred.append(CLASSES.index(result.predicted_disease))
        probs.append(prob_vector(result, CLASSES))
        confidences.append(result.confidence)
        low_flags.append(result.is_low_confidence)
        bands.append(result.confidence_band)

    block = reliability_metrics(
        y_true, y_pred, np.vstack(probs), confidences, low_flags, bands, CLASSES
    )
    block["latency_ms_mean"] = round(float(np.mean(latencies)), 3)
    block["latency_ms_p95"] = round(float(np.percentile(latencies, 95)), 3)
    block["strict_holdout"] = strict
    return block


def evaluate_edge_cases(predictor) -> List[Dict]:
    cases = [
        ("single_nonspecific_symptom_cough", PredictionRequest(symptoms=["Cough"])),
        ("single_symptom_fever", PredictionRequest(symptoms=["Fever"])),
        ("isolated_high_fever", PredictionRequest(symptoms=[], temperature=40.5)),
        (
            "normal_temperature_no_signs",
            PredictionRequest(symptoms=[], temperature=38.5),
        ),
        ("unknown_symptom_only", PredictionRequest(symptoms=["random_symptom"])),
        (
            "unknown_symptom_with_fever",
            PredictionRequest(symptoms=["random_symptom"], temperature=40.5),
        ),
        ("duration_only", PredictionRequest(duration=3)),
        (
            "single_specific_symptom_nodules",
            PredictionRequest(symptoms=["Skin nodules"]),
        ),
        (
            "two_strong_fmd_signs",
            PredictionRequest(symptoms=["Fever", "Mouth ulcers"], temperature=40.5),
        ),
        (
            "full_fmd",
            PredictionRequest(
                symptoms=[
                    "Fever",
                    "Mouth ulcers",
                    "Excessive salivation",
                    "Difficulty standing",
                ],
                temperature=40.5,
                symptom_duration="4-7 days",
                severity="severe",
            ),
        ),
        (
            "full_mastitis",
            PredictionRequest(
                symptoms=[
                    "Swollen udder",
                    "Pain during milking",
                    "Abnormal milk",
                    "Fever",
                ],
                temperature=39.6,
                duration=3,
                severity="moderate",
            ),
        ),
        (
            "full_brd",
            PredictionRequest(
                symptoms=[
                    "Cough",
                    "Nasal discharge",
                    "Difficulty breathing",
                    "Fever",
                ],
                temperature=40.5,
                duration=4,
                severity="moderate",
            ),
        ),
    ]

    output: List[Dict] = []
    for name, request in cases:
        try:
            result = predictor.predict(request)
        except ValueError as exc:
            output.append(
                {
                    "case": name,
                    "rejected": True,
                    "reason": str(exc),
                }
            )
            continue
        output.append(
            {
                "case": name,
                "predicted": result.predicted_disease,
                "confidence": result.confidence,
                "band": result.confidence_band,
                "is_low_confidence": result.is_low_confidence,
                "evidence_count": result.evidence_count,
                "top2_margin": result.top2_margin,
                "note": result.confidence_note,
            }
        )
    return output


def main() -> None:
    predictor = get_predictor()
    if not predictor.ready:
        raise RuntimeError("Models not loaded — train them first")

    real = load_real_symptoms()
    has_split = "split" in real.columns
    holdout = real[real["split"] == "val"] if has_split else real
    train = real[real["split"] == "train"] if has_split else real.iloc[0:0]

    print(f"Real symptom rows: all={len(real)} holdout={len(holdout)} train={len(train)}")
    print(
        "Holdout by disease: "
        + str(holdout["disease"].value_counts().to_dict())
    )

    results = {
        "split_counts": {
            "all": int(len(real)),
            "holdout": int(len(holdout)),
            "train": int(len(train)),
            "holdout_by_disease": holdout["disease"].value_counts().to_dict(),
        },
        "vision_real_field": evaluate_vision(predictor),
        "symptom_real_all": evaluate_symptoms(predictor, real),
        "symptom_real_holdout": evaluate_symptoms(predictor, holdout),
        "symptom_real_train": evaluate_symptoms(predictor, train),
        "fusion_real_full": evaluate_fusion(predictor, real, strict=False),
        "fusion_real_strict": evaluate_fusion(predictor, real, strict=True),
        "edge_cases": evaluate_edge_cases(predictor),
    }

    calibration_path = MODELS_DIR / "calibration.json"
    if calibration_path.exists():
        results["calibration"] = json.loads(
            calibration_path.read_text(encoding="utf-8")
        )

    output = MODELS_DIR / "metrics_reliability.json"
    output.write_text(
        json.dumps(_jsonable(results), indent=2), encoding="utf-8"
    )

    print("\n" + "=" * 78)
    print("REAL-WORLD RELIABILITY SUMMARY (calibrated, as served by the API)")
    print("=" * 78)
    keys = [
        "vision_real_field",
        "symptom_real_holdout",
        "symptom_real_all",
        "symptom_real_train",
        "fusion_real_strict",
        "fusion_real_full",
    ]
    for key in keys:
        m = results[key]
        s = m["selective"]
        conf_acc = s["confident_accuracy"]
        print(
            f"{key:24s} n={m['n_samples']:3d} "
            f"acc={m['accuracy']:.4f} "
            f"macroF1={m['macro_f1_present']:.4f} "
            f"ECE={m['ece']:.4f} "
            f"low={m['low_confidence_rate'] * 100:5.1f}% "
            f"conf_acc={conf_acc if conf_acc is not None else float('nan'):.4f} "
            f"err_high={s['error_high_confidence_share'] * 100:5.1f}%"
        )

    print("\nEdge cases (sparse / ambiguous reports):")
    for row in results["edge_cases"]:
        if row.get("rejected"):
            print(
                f"  {row['case']:34s} -> REJECTED (no usable evidence)"
            )
            continue
        print(
            f"  {row['case']:34s} -> {row['predicted']:34s} "
            f"conf={row['confidence']:6.2f} band={row['band']:6s} "
            f"low={str(row['is_low_confidence']):5s} signals={row['evidence_count']}"
        )

    print(f"\nSaved to {output}")


if __name__ == "__main__":
    main()
