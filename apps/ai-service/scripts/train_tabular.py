"""Train the tabular XGBoost symptom classifier.

Usage:
    python scripts/train_tabular.py
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.constants import CLASSES  # noqa: E402
from app.features import FEATURE_NAMES  # noqa: E402

DATA_PATH = ROOT / "data" / "cattle_symptoms.csv"
MODEL_PATH = ROOT / "models" / "symptom_model.joblib"
METRICS_PATH = ROOT / "models" / "metrics_tabular_train.json"


def train(
    data_path: Path = DATA_PATH,
    model_path: Path = MODEL_PATH,
    test_size: float = 0.2,
    seed: int = 42,
) -> dict:
    if not data_path.exists():
        raise FileNotFoundError(
            f"Dataset not found at {data_path}. Run scripts/build_symptom_dataset.py first."
        )

    frame = pd.read_csv(data_path)
    missing = [name for name in FEATURE_NAMES if name not in frame.columns]
    if missing:
        raise ValueError(f"Dataset is missing feature columns: {missing[:5]}...")
    if "disease" not in frame.columns:
        raise ValueError("Dataset is missing the 'disease' column")

    frame = frame[frame["disease"].isin(CLASSES)].copy()
    label_to_index = {name: index for index, name in enumerate(CLASSES)}
    frame["label"] = frame["disease"].map(label_to_index)
    frame = frame.dropna(subset=["label"])
    frame["label"] = frame["label"].astype(int)

    X = frame[FEATURE_NAMES].astype(np.float32)
    y = frame["label"].to_numpy()

    if "split" in frame.columns and (frame["split"] == "val").any():
        train_mask = (frame["split"] == "train").to_numpy()
        X_train, y_train = X[train_mask], y[train_mask]
        X_val, y_val = X[~train_mask], y[~train_mask]
        if "source" in frame.columns:
            val_real_mask = (frame["source"].astype(str) != "synthetic").to_numpy()[~train_mask]
        else:
            val_real_mask = None
    else:
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=test_size, random_state=seed, stratify=y
        )
        val_real_mask = None
    print(f"Training rows: {len(X_train)} | Validation rows: {len(X_val)}")

    # Published reference rows are upweighted so real-world patterns are not
    # swamped by the larger clinically-informed synthetic set.
    if "source" in frame.columns:
        real_mask = (frame["source"].astype(str) != "synthetic").to_numpy()
        weights = np.where(real_mask, 2.0, 1.0).astype(np.float32)
        if "split" in frame.columns and (frame["split"] == "val").any():
            train_weight = weights[train_mask]
        else:
            train_weight, _ = train_test_split(
                weights, test_size=test_size, random_state=seed, stratify=y
            )
        n_real_train = int((train_weight > 1.0).sum())
        print(f"Real reference rows in training: {n_real_train} (weight 2.0)")
    else:
        train_weight = None
        n_real_train = 0

    model = XGBClassifier(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        min_child_weight=1,
        reg_lambda=1.0,
        objective="multi:softprob",
        num_class=len(CLASSES),
        tree_method="hist",
        eval_metric="mlogloss",
        n_jobs=-1,
        random_state=seed,
    )
    model.fit(
        X_train,
        y_train,
        sample_weight=train_weight,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )

    y_pred = model.predict(X_val)
    accuracy = float(accuracy_score(y_val, y_pred))
    macro_f1 = float(f1_score(y_val, y_pred, average="macro"))
    weighted_f1 = float(f1_score(y_val, y_pred, average="weighted"))

    real_accuracy = None
    if val_real_mask is not None and val_real_mask.any():
        real_accuracy = float(accuracy_score(y_val[val_real_mask], y_pred[val_real_mask]))
        print(
            f"Validation accuracy on published reference rows only: "
            f"{real_accuracy:.4f} (n={int(val_real_mask.sum())})"
        )

    report = classification_report(
        y_val, y_pred, labels=list(range(len(CLASSES))), target_names=CLASSES, digits=4
    )
    matrix = confusion_matrix(y_val, y_pred, labels=list(range(len(CLASSES))))

    print(f"\nValidation accuracy: {accuracy:.4f}")
    print(f"Macro F1: {macro_f1:.4f} | Weighted F1: {weighted_f1:.4f}")
    print("\nClassification report:")
    print(report)
    print("Confusion matrix (rows=true, cols=pred):")
    print(matrix)

    importances = {
        name: float(value)
        for name, value in zip(FEATURE_NAMES, model.feature_importances_)
    }
    top_features = sorted(importances.items(), key=lambda item: item[1], reverse=True)[:10]
    print("\nTop features:")
    for name, value in top_features:
        print(f"  {name}: {value:.4f}")

    artifact = {
        "model": model,
        "feature_names": FEATURE_NAMES,
        "classes": CLASSES,
        "feature_importances": importances,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "val_accuracy": accuracy,
        "macro_f1": macro_f1,
        "weighted_f1": weighted_f1,
        "version": "1.1.0",
        "n_train": int(len(X_train)),
        "n_val": int(len(X_val)),
        "n_real_train": int(n_real_train),
        "real_val_accuracy": real_accuracy,
    }
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, model_path)
    print(f"\nSaved model artifact to {model_path}")

    metrics = {
        "accuracy": accuracy,
        "macro_f1": macro_f1,
        "weighted_f1": weighted_f1,
        "classification_report": classification_report(
            y_val,
            y_pred,
            labels=list(range(len(CLASSES))),
            target_names=CLASSES,
            output_dict=True,
            zero_division=0,
        ),
        "confusion_matrix": matrix.tolist(),
        "classes": CLASSES,
        "n_train": int(len(X_train)),
        "n_val": int(len(X_val)),
        "n_real_train": int(n_real_train),
        "real_val_accuracy": real_accuracy,
        "top_features": top_features,
    }
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"Saved training metrics to {METRICS_PATH}")
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Train tabular symptom model")
    parser.add_argument("--data", type=Path, default=DATA_PATH)
    parser.add_argument("--output", type=Path, default=MODEL_PATH)
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    train(args.data, args.output, args.test_size, args.seed)


if __name__ == "__main__":
    main()
