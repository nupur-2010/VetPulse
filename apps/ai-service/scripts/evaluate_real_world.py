"""Focused real-world evaluation — synthetic rows completely excluded.

Real-world sources:
  * Symptoms : rows in data/cattle_symptoms.csv whose source starts with
    "reference:" (real clinical records from the 93-signal cattle disease
    matrix on HuggingFace scorder96).
  * Images   : 555 held-out real field photographs in data/images/val,
    sourced from Zenodo 7779246, Zenodo 11003967, and Mendeley ggpwpscjvm.
  * Fusion   : real symptom record + real image pairs.

Synthetic-only figures are reported separately for comparison.
Saves results to models/metrics_real_world.json.

For the calibrated, API-served reliability metrics (confidence bands,
selective accuracy, abstention quality), run scripts/evaluate_reliability.py.

Usage:
    python scripts/evaluate_real_world.py
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Dict, List

import numpy as np
import pandas as pd
import torch
from sklearn.metrics import f1_score
from torch.utils.data import DataLoader
from torchvision import datasets

ROOT = Path(__file__).resolve().parents[1]
for candidate in (ROOT, ROOT / "scripts"):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

from app.constants import CLASSES, IMAGE_CLASSES, IMAGE_CLASS_DIRS, SEVERITY_LEVELS
from app.features import feature_name_for_symptom
from app.predictor import get_predictor
from app.schemas.prediction import PredictionRequest
from app.constants import SYMPTOMS

from evaluate import _jsonable, compute_metrics

MODELS_DIR = ROOT / "models"
IMAGES_DIR = ROOT / "data" / "images"
SYMPTOM_CSV = ROOT / "data" / "cattle_symptoms.csv"
_DIR_TO_CLASS = {directory: name for name, directory in IMAGE_CLASS_DIRS.items()}


# ------------------------------------------------------------------ helpers

def load_real_symptoms() -> pd.DataFrame:
    """Return only rows whose source is a real reference (not 'synthetic')."""
    frame = pd.read_csv(SYMPTOM_CSV)
    frame = frame[frame["source"].astype(str).str.startswith("reference:")]
    return frame.reset_index(drop=True)


def _build_request_from_row(row: pd.Series, predictor) -> PredictionRequest:
    """Convert a symptom DataFrame row into a PredictionRequest."""
    symptoms = [
        s for s in SYMPTOMS
        if float(row[feature_name_for_symptom(s)]) > 0.5
    ]
    return PredictionRequest(
        symptoms=symptoms,
        temperature=float(row["temperature"]),
        duration=float(row["duration_days"]),
        severity=SEVERITY_LEVELS[int(row["severity"])],
    )


def evaluate_real_tabular(predictor, frame: pd.DataFrame) -> Dict:
    """Symptom model on real reference rows only."""
    print(f"\n=== Symptom Branch — Real Reference Rows ({len(frame)}) ===")
    y_true = frame["disease"].map({n: i for i, n in enumerate(CLASSES)}).to_numpy()
    X = frame[predictor.feature_names].astype(np.float32).to_numpy()

    start = time.perf_counter()
    y_pred = predictor.symptom_model.predict(X)
    probs = predictor.symptom_model.predict_proba(X)
    elapsed = time.perf_counter() - start

    metrics = compute_metrics(y_true, y_pred, probs, CLASSES)
    metrics["latency_ms_per_sample"] = round(elapsed / len(X) * 1000.0, 4)

    # Real reference data only covers FMD/Mastitis/BRD; macro-F1 over classes
    # that actually appear is the meaningful figure (zero-support classes would
    # otherwise drag the 5-class macro-F1 down artificially).
    present = np.unique(y_true)
    metrics["present_classes"] = [CLASSES[i] for i in present.tolist()]
    metrics["macro_f1_present_classes"] = float(
        f1_score(y_true, y_pred, labels=present.tolist(), average="macro", zero_division=0)
    )

    # Per-disease breakdown
    disease_counts = frame["disease"].value_counts()
    print(f"  Real rows per disease: {dict(disease_counts)}")
    print(
        f"  Accuracy={metrics['accuracy']:.4f}  "
        f"Macro-F1(present)={metrics['macro_f1_present_classes']:.4f}  "
        f"Balanced={metrics['balanced_accuracy']:.4f}  "
        f"Latency={metrics['latency_ms_per_sample']:.4f} ms/sample"
    )
    for cls in CLASSES:
        p = metrics["per_class"].get(cls, {})
        if p.get("support", 0) > 0:
            print(
                f"    {cls:35s}  P={p['precision']:.3f}  R={p['recall']:.3f}  "
                f"F1={p['f1']:.3f}  n={p['support']}"
            )
    return metrics


def evaluate_vision_real(predictor) -> Dict:
    """Vision model on 555 held-out real field photos."""
    print("\n=== Vision Branch — Real Field Photos (555 held-out val) ===")
    val_dir = IMAGES_DIR / "val"
    dataset = datasets.ImageFolder(val_dir, transform=predictor.transform)
    loader = DataLoader(dataset, batch_size=32, shuffle=False, num_workers=0)

    checkpoint_to_target = []
    for name in predictor.vision_checkpoint_classes:
        canonical = predictor._canonical_vision_class(name)
        checkpoint_to_target.append(
            IMAGE_CLASSES.index(canonical) if canonical else -1
        )

    all_probs: List[np.ndarray] = []
    all_labels: List[int] = []

    start = time.perf_counter()
    with torch.inference_mode():
        for images, labels in loader:
            logits = predictor.vision_model(images.to(predictor.device))
            probs = torch.softmax(logits, dim=1).cpu().numpy()
            aligned = np.zeros((len(images), len(IMAGE_CLASSES)), dtype=np.float64)
            for ckpt_idx, tgt_idx in enumerate(checkpoint_to_target):
                if tgt_idx >= 0:
                    aligned[:, tgt_idx] = probs[:, ckpt_idx]
            all_probs.append(aligned)
            for label in labels.tolist():
                canonical = predictor._canonical_vision_class(dataset.classes[label])
                all_labels.append(IMAGE_CLASSES.index(canonical))
    elapsed = time.perf_counter() - start

    probabilities = np.vstack(all_probs)
    y_pred = probabilities.argmax(axis=1)
    metrics = compute_metrics(np.array(all_labels), y_pred, probabilities, IMAGE_CLASSES)
    metrics["latency_ms_per_sample"] = round(elapsed / len(dataset) * 1000.0, 4)

    per_class_counts = {IMAGE_CLASSES[i]: 0 for i in range(len(IMAGE_CLASSES))}
    for lbl in all_labels:
        per_class_counts[IMAGE_CLASSES[lbl]] += 1
    print(f"  Images per disease: {per_class_counts}")
    print(
        f"  Accuracy={metrics['accuracy']:.4f}  "
        f"Macro-F1={metrics['macro_f1']:.4f}  "
        f"Latency={metrics['latency_ms_per_sample']:.2f} ms/sample"
    )
    for cls in IMAGE_CLASSES:
        p = metrics["per_class"].get(cls, {})
        if p.get("support", 0) > 0:
            print(
                f"    {cls:35s}  P={p['precision']:.3f}  R={p['recall']:.3f}  "
                f"F1={p['f1']:.3f}  n={p['support']}"
            )
    return metrics


def evaluate_fusion_real(predictor, symptom_frame: pd.DataFrame) -> Dict:
    """Fusion branch on real symptom + real image pairs (Mastitis/BRD symptom-only)."""
    print("\n=== Fusion Branch — Real Symptoms + Real Images ===")

    val_dir = IMAGES_DIR / "val"
    symptom_pool: Dict[str, List[pd.Series]] = {c: [] for c in CLASSES}
    for _, row in symptom_frame.iterrows():
        symptom_pool[row["disease"]].append(row)

    samples: List[tuple] = []  # (expected_class, PredictionRequest)

    # Image classes: pair each real image with its corresponding real symptom row
    for directory in sorted(val_dir.iterdir()):
        if not directory.is_dir():
            continue
        canonical = _DIR_TO_CLASS.get(directory.name)
        if canonical is None:
            continue
        pool = symptom_pool[canonical]
        if not pool:
            continue
        for idx, image_path in enumerate(sorted(directory.glob("*.jpg"))):
            payload = _build_request_from_row(pool[idx % len(pool)], predictor)
            payload.image_paths = [str(image_path)]
            samples.append((canonical, payload))

    # Mastitis & BRD: symptom-only (no real photos exist for these)
    for disease in ("Mastitis", "Bovine Respiratory Disease"):
        pool = symptom_pool[disease]
        for row in pool[:120]:
            samples.append((disease, _build_request_from_row(row, predictor)))

    y_true, y_pred, probabilities, latencies = [], [], [], []
    errors = 0

    for expected, payload in samples:
        start = time.perf_counter()
        try:
            result = predictor.predict(payload)
            latencies.append((time.perf_counter() - start) * 1000.0)
            y_true.append(CLASSES.index(expected))
            y_pred.append(CLASSES.index(result.predicted_disease))
            probabilities.append(
                [result.class_probabilities[n] / 100.0 for n in CLASSES]
            )
        except Exception as exc:
            errors += 1
            print(f"  [skip] {expected}: {exc}")

    probabilities = np.array(probabilities, dtype=np.float64)
    row_sums = probabilities.sum(axis=1, keepdims=True)
    row_sums[row_sums == 0] = 1.0
    probabilities = probabilities / row_sums

    metrics = compute_metrics(
        np.array(y_true), np.array(y_pred), probabilities, CLASSES
    )
    metrics["latency_ms_mean"] = round(float(np.mean(latencies)), 3)
    metrics["latency_ms_p95"] = round(float(np.percentile(latencies, 95)), 3)
    metrics["n_samples"] = len(samples)
    metrics["n_errors"] = errors

    present = np.unique(np.array(y_true))
    metrics["present_classes"] = [CLASSES[i] for i in present.tolist()]
    metrics["macro_f1_present_classes"] = float(
        f1_score(
            np.array(y_true), np.array(y_pred),
            labels=present.tolist(), average="macro", zero_division=0
        )
    )

    # Per-disease counts in fusion sample
    disease_counts = {}
    for t in y_true:
        name = CLASSES[t]
        disease_counts[name] = disease_counts.get(name, 0) + 1
    print(f"  Fusion sample per disease: {disease_counts}")
    print(f"  Total samples={len(samples)}  errors={errors}")
    print(
        f"  Accuracy={metrics['accuracy']:.4f}  "
        f"Macro-F1(present)={metrics['macro_f1_present_classes']:.4f}  "
        f"Latency mean={metrics['latency_ms_mean']:.2f} ms  p95={metrics['latency_ms_p95']:.2f} ms"
    )
    for cls in CLASSES:
        p = metrics["per_class"].get(cls, {})
        if p.get("support", 0) > 0:
            print(
                f"    {cls:35s}  P={p['precision']:.3f}  R={p['recall']:.3f}  "
                f"F1={p['f1']:.3f}  n={p['support']}"
            )
    return metrics


def evaluate_synthetic_tabular(predictor, n_per_class: int = 400) -> Dict:
    """Symptom model on a fresh synthetic hold-out to show generalization gap."""
    print("\n=== Symptom Branch — Fresh Synthetic Hold-out (n=2000) ===")
    from scripts.build_symptom_dataset import generate_synthetic

    rows = generate_synthetic(n_per_class=n_per_class, seed=9999)
    frame = pd.DataFrame(rows)
    y_true = frame["disease"].map({n: i for i, n in enumerate(CLASSES)}).to_numpy()
    X = frame[predictor.feature_names].astype(np.float32).to_numpy()

    y_pred = predictor.symptom_model.predict(X)
    probs = predictor.symptom_model.predict_proba(X)
    metrics = compute_metrics(y_true, y_pred, probs, CLASSES)
    print(
        f"  Accuracy={metrics['accuracy']:.4f}  "
        f"Macro-F1={metrics['macro_f1']:.4f}"
    )
    return metrics


def main() -> None:
    predictor = get_predictor()
    if not predictor.ready:
        raise RuntimeError("Models not loaded — run scripts/train_tabular.py and train_vision.py first")

    real_frame = load_real_symptoms()
    print(f"Loaded {len(real_frame)} real reference symptom rows "
          f"(source=reference:*) — all synthetic rows excluded")

    results = {
        "symptom_real_reference": evaluate_real_tabular(predictor, real_frame),
        "vision_real_field": evaluate_vision_real(predictor),
        "fusion_real": evaluate_fusion_real(predictor, real_frame),
        "symptom_fresh_synthetic": evaluate_synthetic_tabular(predictor),
    }

    output = MODELS_DIR / "metrics_real_world.json"
    output.write_text(json.dumps(_jsonable(results), indent=2), encoding="utf-8")
    print(f"\nSaved to {output}")

    print("\n" + "=" * 60)
    print("SUMMARY — Real-World Only")
    print("=" * 60)
    for name, m in results.items():
        n = m.get("n_samples", sum(m["per_class"][c]["support"] for c in m["per_class"]))
        print(
            f"  {name:35s}  acc={m['accuracy']:.4f}  "
            f"macro_f1={m['macro_f1']:.4f}  n={n}"
        )
    print("=" * 60)


if __name__ == "__main__":
    main()
