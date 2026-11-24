"""Large-scale evaluation for the tabular, vision and late-fusion branches.

Usage:
    python scripts/evaluate.py
    python scripts/evaluate.py --n-per-class 2000
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Dict, List

import numpy as np
import pandas as pd
import torch
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    log_loss,
    precision_recall_fscore_support,
    roc_auc_score,
    top_k_accuracy_score,
)
from torch.utils.data import DataLoader
from torchvision import datasets

ROOT = Path(__file__).resolve().parents[1]
for candidate in (ROOT, ROOT / "scripts"):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

from app.constants import (  # noqa: E402
    CLASSES,
    IMAGE_CLASS_DIRS,
    IMAGE_CLASSES,
    SEVERITY_LEVELS,
    SYMPTOMS,
)
from app.features import FEATURE_NAMES, feature_name_for_symptom  # noqa: E402
from app.predictor import get_predictor  # noqa: E402
from app.schemas.prediction import PredictionRequest  # noqa: E402
from build_symptom_dataset import generate_synthetic  # noqa: E402

MODELS_DIR = ROOT / "models"
IMAGES_DIR = ROOT / "data" / "images"
SYMPTOM_CSV = ROOT / "data" / "cattle_symptoms.csv"
_DIR_TO_CLASS = {directory: name for name, directory in IMAGE_CLASS_DIRS.items()}


def _jsonable(value):
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(item) for item in value]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    if isinstance(value, np.ndarray):
        return value.tolist()
    return value


def compute_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_proba: np.ndarray,
    class_names: List[str],
) -> Dict:
    labels = list(range(len(class_names)))
    y_proba = np.asarray(y_proba, dtype=np.float64)
    row_sums = y_proba.sum(axis=1, keepdims=True)
    row_sums[row_sums == 0] = 1.0
    y_proba = y_proba / row_sums
    accuracy = float(accuracy_score(y_true, y_pred))
    balanced = float(balanced_accuracy_score(y_true, y_pred))
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, zero_division=0
    )
    metrics: Dict = {
        "accuracy": accuracy,
        "balanced_accuracy": balanced,
        "macro_precision": float(np.mean(precision)),
        "macro_recall": float(np.mean(recall)),
        "macro_f1": float(f1_score(y_true, y_pred, labels=labels, average="macro", zero_division=0)),
        "weighted_f1": float(
            f1_score(y_true, y_pred, labels=labels, average="weighted", zero_division=0)
        ),
        "per_class": {
            name: {
                "precision": float(precision[index]),
                "recall": float(recall[index]),
                "f1": float(f1[index]),
                "support": int(support[index]),
            }
            for index, name in enumerate(class_names)
        },
        "classification_report": classification_report(
            y_true,
            y_pred,
            labels=labels,
            target_names=class_names,
            output_dict=True,
            zero_division=0,
        ),
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=labels).tolist(),
        "n_samples": int(len(y_true)),
    }
    if len(class_names) >= 2:
        try:
            metrics["top2_accuracy"] = float(
                top_k_accuracy_score(y_true, y_proba, k=2, labels=labels)
            )
        except Exception:
            metrics["top2_accuracy"] = None
        try:
            metrics["log_loss"] = float(log_loss(y_true, y_proba, labels=labels))
        except Exception:
            metrics["log_loss"] = None
        if len(np.unique(y_true)) == len(class_names):
            try:
                metrics["roc_auc_ovr_macro"] = float(
                    roc_auc_score(
                        y_true, y_proba, labels=labels, multi_class="ovr", average="macro"
                    )
                )
            except Exception:
                metrics["roc_auc_ovr_macro"] = None
    return metrics


def _load_holdout() -> pd.DataFrame:
    if not SYMPTOM_CSV.exists():
        raise FileNotFoundError(
            f"{SYMPTOM_CSV} missing. Run scripts/build_symptom_dataset.py first."
        )
    frame = pd.read_csv(SYMPTOM_CSV)
    if "split" in frame.columns and (frame["split"] == "val").any():
        return frame[frame["split"] == "val"].reset_index(drop=True)
    return frame.sample(frac=0.2, random_state=2024).reset_index(drop=True)


def evaluate_tabular(predictor, n_per_class: int, seed: int) -> Dict:
    frame = _load_holdout()
    print(f"\n=== Tabular evaluation on {len(frame)} held-out rows ===")
    y_true = frame["disease"].map({name: index for index, name in enumerate(CLASSES)}).to_numpy()
    X = frame[predictor.feature_names].astype(np.float32).to_numpy()

    start = time.perf_counter()
    y_pred = predictor.symptom_model.predict(X)
    probabilities = predictor.symptom_model.predict_proba(X)
    elapsed = time.perf_counter() - start

    metrics = compute_metrics(y_true, y_pred, probabilities, CLASSES)
    metrics["latency_ms_per_sample"] = round(elapsed / len(X) * 1000.0, 4)
    print(
        f"accuracy={metrics['accuracy']:.4f} macro_f1={metrics['macro_f1']:.4f} "
        f"balanced={metrics['balanced_accuracy']:.4f} "
        f"latency={metrics['latency_ms_per_sample']:.4f} ms/sample"
    )

    if "source" in frame.columns:
        real_mask = (frame["source"].astype(str) != "synthetic").to_numpy()
        if real_mask.any():
            real_metrics = compute_metrics(
                y_true[real_mask], y_pred[real_mask], probabilities[real_mask], CLASSES
            )
            present = np.unique(y_true[real_mask])
            real_macro_f1 = float(
                f1_score(
                    y_true[real_mask],
                    y_pred[real_mask],
                    labels=present.tolist(),
                    average="macro",
                    zero_division=0,
                )
            )
            metrics["reference_subset"] = {
                "n_samples": int(real_mask.sum()),
                "accuracy": real_metrics["accuracy"],
                "macro_f1_over_present_classes": real_macro_f1,
                "present_classes": [CLASSES[index] for index in present.tolist()],
                "confusion_matrix": real_metrics["confusion_matrix"],
            }
            print(
                f"reference rows only: n={int(real_mask.sum())} "
                f"accuracy={real_metrics['accuracy']:.4f} "
                f"macro_f1(present)={real_macro_f1:.4f}"
            )
    return metrics


def evaluate_vision_val(predictor) -> Dict:
    print("\n=== Vision evaluation on held-out val folder ===")
    val_dir = IMAGES_DIR / "val"
    dataset = datasets.ImageFolder(val_dir, transform=predictor.transform)
    loader = DataLoader(dataset, batch_size=32, shuffle=False, num_workers=0)
    checkpoint_to_target = []
    for name in predictor.vision_checkpoint_classes:
        canonical = predictor._canonical_vision_class(name)
        checkpoint_to_target.append(IMAGE_CLASSES.index(canonical) if canonical else -1)

    all_probs = []
    all_labels = []
    start = time.perf_counter()
    with torch.inference_mode():
        for images, labels in loader:
            logits = predictor.vision_model(images.to(predictor.device))
            probs = torch.softmax(logits, dim=1).cpu().numpy()
            aligned = np.zeros((len(images), len(IMAGE_CLASSES)), dtype=np.float64)
            for checkpoint_index, target_index in enumerate(checkpoint_to_target):
                if target_index >= 0:
                    aligned[:, target_index] = probs[:, checkpoint_index]
            all_probs.append(aligned)
            # ImageFolder labels are alphabetical; remap to IMAGE_CLASSES order.
            for label in labels.tolist():
                canonical = predictor._canonical_vision_class(dataset.classes[label])
                all_labels.append(IMAGE_CLASSES.index(canonical))
    elapsed = time.perf_counter() - start
    probabilities = np.vstack(all_probs)
    y_pred = probabilities.argmax(axis=1)
    metrics = compute_metrics(np.array(all_labels), y_pred, probabilities, IMAGE_CLASSES)
    metrics["latency_ms_per_sample"] = round(elapsed / len(dataset) * 1000.0, 4)
    print(
        f"accuracy={metrics['accuracy']:.4f} macro_f1={metrics['macro_f1']:.4f} "
        f"latency={metrics['latency_ms_per_sample']:.4f} ms/sample"
    )
    return metrics


def _row_to_request(row: pd.Series) -> Dict:
    symptoms = [s for s in SYMPTOMS if float(row[feature_name_for_symptom(s)]) > 0.5]
    return {
        "symptoms": symptoms,
        "temperature": float(row["temperature"]),
        "duration": float(row["duration_days"]),
        "severity": SEVERITY_LEVELS[int(row["severity"])],
    }


def evaluate_fusion(predictor) -> Dict:
    print("\n=== Late-fusion evaluation (real images + held-out symptoms) ===")
    val_dir = IMAGES_DIR / "val"
    frame = _load_holdout()
    symptom_pool: Dict[str, List[dict]] = {name: [] for name in CLASSES}
    for _, row in frame.iterrows():
        symptom_pool[row["disease"]].append(row.to_dict())
    for name in CLASSES:
        if not symptom_pool[name]:
            for row in generate_synthetic(n_per_class=40, seed=2025):
                if row["disease"] == name:
                    symptom_pool[name].append(row)

    samples = []
    for directory in sorted(val_dir.iterdir()):
        if not directory.is_dir():
            continue
        canonical = _DIR_TO_CLASS.get(directory.name)
        if canonical is None:
            continue
        pool = symptom_pool[canonical]
        for index, image_path in enumerate(sorted(directory.glob("*.jpg"))[:120]):
            payload = _row_to_request(pool[index % len(pool)])
            payload["image_paths"] = [str(image_path)]
            samples.append((canonical, payload))

    # Mastitis and BRD have no public photographs: evaluate them symptom-only.
    for name in ("Mastitis", "Bovine Respiratory Disease"):
        for row in symptom_pool[name][:120]:
            samples.append((name, _row_to_request(row)))

    y_true = []
    y_pred = []
    probabilities = []
    latencies = []
    for expected, payload in samples:
        start = time.perf_counter()
        result = predictor.predict(PredictionRequest(**payload))
        latencies.append((time.perf_counter() - start) * 1000.0)
        y_true.append(CLASSES.index(expected))
        y_pred.append(CLASSES.index(result.predicted_disease))
        probabilities.append(
            [result.class_probabilities[name] / 100.0 for name in CLASSES]
        )

    metrics = compute_metrics(
        np.array(y_true), np.array(y_pred), np.array(probabilities), CLASSES
    )
    metrics["latency_ms_mean"] = round(float(np.mean(latencies)), 3)
    metrics["latency_ms_p95"] = round(float(np.percentile(latencies, 95)), 3)
    metrics["n_samples"] = len(samples)
    print(
        f"fusion accuracy={metrics['accuracy']:.4f} macro_f1={metrics['macro_f1']:.4f} "
        f"latency_mean={metrics['latency_ms_mean']:.2f} ms p95={metrics['latency_ms_p95']:.2f} ms"
    )
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate all model branches")
    parser.add_argument("--n-per-class", type=int, default=2000)
    parser.add_argument("--seed", type=int, default=2024)
    args = parser.parse_args()

    predictor = get_predictor()
    if not predictor.ready:
        raise RuntimeError("Models are not loaded")

    results = {
        "tabular_holdout": evaluate_tabular(predictor, args.n_per_class, args.seed),
        "vision_val": evaluate_vision_val(predictor),
        "fusion_holdout": evaluate_fusion(predictor),
    }

    output = MODELS_DIR / "metrics_full_evaluation.json"
    output.write_text(json.dumps(_jsonable(results), indent=2), encoding="utf-8")
    print(f"\nSaved full metrics to {output}")

    print("\n=== Summary ===")
    for name, metrics in results.items():
        print(
            f"{name}: accuracy={metrics['accuracy']:.4f} "
            f"macro_f1={metrics['macro_f1']:.4f} n={metrics['n_samples']}"
        )


if __name__ == "__main__":
    main()
