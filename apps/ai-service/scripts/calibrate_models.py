"""Fit temperature scaling and confidence thresholds on REAL held-out data.

* Vision  : 555 held-out real field photographs in ``data/images/val``.
* Symptoms: real reference rows in ``data/cattle_symptoms.csv`` whose
  ``split == "val"`` (81 clinical records, never seen in training).
* Fusion  : a conservative fixed threshold (fusion is evaluated separately).

Writes ``models/calibration.json`` consumed by ``app/predictor.py``.

Usage:
    python scripts/calibrate_models.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import torch
from sklearn.metrics import accuracy_score
from torch.utils.data import DataLoader
from torchvision import datasets

ROOT = Path(__file__).resolve().parents[1]
for candidate in (ROOT, ROOT / "scripts"):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

from app.calibration import (  # noqa: E402
    apply_temperature,
    brier_score,
    expected_calibration_error,
    fit_temperature,
    select_confidence_threshold,
    softmax,
)
from app.constants import CLASSES, IMAGE_CLASSES  # noqa: E402
from app.predictor import get_predictor  # noqa: E402

MODELS_DIR = ROOT / "models"
IMAGES_DIR = ROOT / "data" / "images"
SYMPTOM_CSV = ROOT / "data" / "cattle_symptoms.csv"


def _real_val_symptoms() -> pd.DataFrame:
    frame = pd.read_csv(SYMPTOM_CSV)
    frame = frame[frame["source"].astype(str).str.startswith("reference:")]
    if "split" in frame.columns:
        frame = frame[frame["split"] == "val"]
    return frame.reset_index(drop=True)


def _fit_vision(predictor) -> Dict:
    dataset = datasets.ImageFolder(IMAGES_DIR / "val", transform=predictor.transform)
    loader = DataLoader(dataset, batch_size=32, shuffle=False, num_workers=0)

    canonical_to_ckpt: Dict[str, int] = {}
    for index, name in enumerate(predictor.vision_checkpoint_classes):
        canonical = predictor._canonical_vision_class(name)
        if canonical is not None:
            canonical_to_ckpt[canonical] = index

    all_logits: List[np.ndarray] = []
    ckpt_labels: List[int] = []
    target_labels: List[int] = []

    with torch.inference_mode():
        for images, labels in loader:
            logits = predictor.vision_model(images.to(predictor.device)).cpu().numpy()
            all_logits.append(logits)
            for label in labels.tolist():
                canonical = predictor._canonical_vision_class(dataset.classes[label])
                if canonical is None:
                    continue
                ckpt_labels.append(canonical_to_ckpt[canonical])
                target_labels.append(IMAGE_CLASSES.index(canonical))

    logits = np.vstack(all_logits)
    ckpt_labels_arr = np.asarray(ckpt_labels)
    target_labels_arr = np.asarray(target_labels)

    def align(probabilities: np.ndarray) -> np.ndarray:
        aligned = np.zeros((len(probabilities), len(IMAGE_CLASSES)), dtype=np.float64)
        for canonical, ckpt_index in canonical_to_ckpt.items():
            aligned[:, IMAGE_CLASSES.index(canonical)] = probabilities[:, ckpt_index]
        totals = aligned.sum(axis=1, keepdims=True)
        totals[totals == 0] = 1.0
        return aligned / totals

    probabilities_before = align(softmax(logits))
    temperature = fit_temperature(logits, ckpt_labels_arr, bounds=(1.0, 8.0))
    probabilities_after = align(softmax(logits / temperature))

    threshold = select_confidence_threshold(
        probabilities_after,
        target_labels_arr,
        target_accuracy=0.97,
        min_coverage=0.30,
        default=0.70,
    )
    accuracy = float(accuracy_score(target_labels_arr, probabilities_after.argmax(axis=1)))

    result = {
        "temperature": round(float(temperature), 6),
        "min_confidence": threshold["threshold"],
        "selective_accuracy": threshold["selective_accuracy"],
        "coverage_at_threshold": threshold["coverage"],
        "n_samples": int(len(target_labels_arr)),
        "accuracy": round(accuracy, 6),
        "ece_before": round(
            float(expected_calibration_error(probabilities_before, target_labels_arr)), 6
        ),
        "ece_after": round(
            float(expected_calibration_error(probabilities_after, target_labels_arr)), 6
        ),
        "brier_before": round(
            float(brier_score(probabilities_before, target_labels_arr)), 6
        ),
        "brier_after": round(
            float(brier_score(probabilities_after, target_labels_arr)), 6
        ),
    }
    print(
        "Vision calibration: T=%.4f  ECE %.4f -> %.4f  "
        "threshold=%.3f coverage=%.3f selective_acc=%.4f (n=%d)"
        % (
            result["temperature"],
            result["ece_before"],
            result["ece_after"],
            result["min_confidence"],
            result["coverage_at_threshold"],
            result["selective_accuracy"],
            result["n_samples"],
        )
    )
    return result


def _fit_symptoms(predictor, frame: pd.DataFrame) -> Tuple[Dict, Dict]:
    y_true = frame["disease"].map({name: index for index, name in enumerate(CLASSES)}).to_numpy()
    X = frame[predictor.feature_names].astype(np.float32).to_numpy()
    raw = np.asarray(predictor.symptom_model.predict_proba(X), dtype=np.float64)

    probabilities = np.zeros((len(X), len(CLASSES)), dtype=np.float64)
    for column, class_index in enumerate(predictor.symptom_model.classes_):
        index = int(class_index)
        if 0 <= index < len(CLASSES):
            probabilities[:, index] = raw[:, column]
    totals = probabilities.sum(axis=1, keepdims=True)
    totals[totals == 0] = 1.0
    probabilities = probabilities / totals

    logits = np.log(np.clip(probabilities, 1e-9, 1.0))
    temperature = fit_temperature(logits, y_true, bounds=(1.0, 8.0))
    calibrated = apply_temperature(probabilities, temperature)

    threshold = select_confidence_threshold(
        calibrated,
        y_true,
        target_accuracy=0.97,
        min_coverage=0.30,
        default=0.60,
    )
    # The real symptom set is perfectly separated, so the selector collapses to
    # the lowest threshold. Floor it: a diagnosis should carry real evidence.
    threshold["threshold"] = round(max(threshold["threshold"], 0.60), 4)
    mask = calibrated.max(axis=1) >= threshold["threshold"]
    threshold["coverage"] = round(float(mask.mean()), 4)
    threshold["selective_accuracy"] = (
        round(float((calibrated.argmax(axis=1) == y_true)[mask].mean()), 4)
        if mask.any()
        else 0.0
    )
    result = {
        "temperature": round(float(temperature), 6),
        "min_confidence": threshold["threshold"],
        "selective_accuracy": threshold["selective_accuracy"],
        "coverage_at_threshold": threshold["coverage"],
        "n_samples": int(len(y_true)),
        "accuracy": round(float(accuracy_score(y_true, calibrated.argmax(axis=1))), 6),
        "ece_before": round(float(expected_calibration_error(probabilities, y_true)), 6),
        "ece_after": round(float(expected_calibration_error(calibrated, y_true)), 6),
        "brier_before": round(float(brier_score(probabilities, y_true)), 6),
        "brier_after": round(float(brier_score(calibrated, y_true)), 6),
    }

    print(
        "Symptom calibration: T=%.4f  ECE %.4f -> %.4f  "
        "threshold=%.3f coverage=%.3f selective_acc=%.4f (n=%d)"
        % (
            result["temperature"],
            result["ece_before"],
            result["ece_after"],
            result["min_confidence"],
            result["coverage_at_threshold"],
            result["selective_accuracy"],
            result["n_samples"],
        )
    )
    return result, result


def main() -> None:
    predictor = get_predictor()
    if not predictor.ready:
        raise RuntimeError("Models not loaded — train them first")

    vision = _fit_vision(predictor)
    symptom_frame = _real_val_symptoms()
    symptom, _ = _fit_symptoms(predictor, symptom_frame)

    calibration = {
        "fitted_on": {
            "vision": "555 held-out real field photographs",
            "symptom": f"{len(symptom_frame)} held-out real clinical records",
        },
        "target_selective_accuracy": 0.97,
        "vision": vision,
        "symptom": symptom,
        "fusion": {"min_confidence": 0.60},
        "policy": {
            "margin_min": 0.10,
            "min_signal_count": 2,
            "alpha_insufficient": 0.65,
            "alpha_disagreement": 0.50,
            "alpha_margin": 0.40,
            "alpha_lowprob": 0.30,
        },
    }

    output = MODELS_DIR / "calibration.json"
    output.write_text(json.dumps(calibration, indent=2), encoding="utf-8")
    print(f"\nSaved calibration to {output}")


if __name__ == "__main__":
    main()
