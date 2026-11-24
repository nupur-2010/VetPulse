"""Build the cattle symptom dataset.

1. Ingests the published 93-signal cattle disease matrix
   (``data/raw/cattle_disease_prediction/Training.csv``) and maps its bovine
   records onto the VetPulse 5-class schema and 30-symptom vocabulary.
2. Ingests any other downloaded animal-disease CSVs found under data/raw.
3. Generates clinically-informed synthetic rows for every class, so that
   Lumpy Skin Disease and Healthy (absent from the reference matrix) are
   still covered.
4. Writes data/cattle_symptoms.csv with a stratified ``split`` column so the
   tabular model is scored on held-out rows.

Usage:
    python scripts/build_symptom_dataset.py
    python scripts/build_symptom_dataset.py --n-per-class 500 --seed 42
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import List, Optional

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.constants import CLASSES, SEVERITY_LEVELS, SYMPTOMS  # noqa: E402
from app.features import (  # noqa: E402
    FEATURE_NAMES,
    canonicalize_symptoms,
    feature_name_for_symptom,
    normalize_text,
    parse_duration_days,
    parse_severity,
)

DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
OUTPUT_PATH = DATA_DIR / "cattle_symptoms.csv"

# Base probability of each symptom for each disease class.
SYMPTOM_PROFILES = {
    "Healthy": {
        "Reduced appetite": 0.03,
        "Weakness": 0.02,
        "Reduced milk production": 0.02,
        "Hair loss": 0.02,
    },
    "Foot and Mouth Disease": {
        "Fever": 0.95,
        "Mouth ulcers": 0.92,
        "Excessive salivation": 0.88,
        "Difficulty chewing": 0.72,
        "Lameness": 0.66,
        "Difficulty standing": 0.55,
        "Reduced appetite": 0.80,
        "Weakness": 0.62,
        "Dehydration": 0.45,
        "Reduced milk production": 0.52,
        "Swelling": 0.22,
        "Nasal discharge": 0.14,
        "Rapid breathing": 0.10,
        "Diarrhoea": 0.10,
        "Bloating": 0.08,
    },
    "Lumpy Skin Disease": {
        "Skin nodules": 0.95,
        "Fever": 0.90,
        "Swelling": 0.76,
        "Lesions": 0.72,
        "Reduced milk production": 0.66,
        "Reduced appetite": 0.60,
        "Weakness": 0.52,
        "Weight loss": 0.36,
        "Lameness": 0.34,
        "Dehydration": 0.30,
        "Joint swelling": 0.30,
        "Difficulty standing": 0.24,
        "Nasal discharge": 0.16,
        "Excessive salivation": 0.14,
        "Abnormal discharge": 0.10,
    },
    "Mastitis": {
        "Swollen udder": 0.95,
        "Pain during milking": 0.90,
        "Abnormal milk": 0.92,
        "Reduced milk production": 0.82,
        "Fever": 0.70,
        "Reduced appetite": 0.50,
        "Swelling": 0.46,
        "Weakness": 0.40,
        "Dehydration": 0.26,
        "Lameness": 0.12,
        "Difficulty standing": 0.10,
    },
    "Bovine Respiratory Disease": {
        "Fever": 0.90,
        "Cough": 0.88,
        "Nasal discharge": 0.86,
        "Difficulty breathing": 0.70,
        "Rapid breathing": 0.66,
        "Reduced appetite": 0.70,
        "Weakness": 0.56,
        "Dehydration": 0.40,
        "Weight loss": 0.34,
        "Reduced milk production": 0.30,
        "Difficulty standing": 0.15,
        "Lameness": 0.10,
        "Excessive salivation": 0.10,
    },
}

TEMPERATURE_PROFILE = {
    "Healthy": (38.5, 0.25),
    "Foot and Mouth Disease": (40.3, 0.40),
    "Lumpy Skin Disease": (40.0, 0.40),
    "Mastitis": (39.6, 0.40),
    "Bovine Respiratory Disease": (40.4, 0.50),
}

DURATION_PROFILE = {
    "Healthy": (0.5, 0.4),
    "Foot and Mouth Disease": (5.0, 2.0),
    "Lumpy Skin Disease": (8.0, 3.0),
    "Mastitis": (3.5, 1.5),
    "Bovine Respiratory Disease": (4.0, 1.8),
}

SEVERITY_PROFILE = {
    "Healthy": [0.95, 0.05, 0.00, 0.00],
    "Foot and Mouth Disease": [0.02, 0.18, 0.55, 0.25],
    "Lumpy Skin Disease": [0.02, 0.48, 0.40, 0.10],
    "Mastitis": [0.35, 0.50, 0.15, 0.00],
    "Bovine Respiratory Disease": [0.30, 0.55, 0.15, 0.00],
}

DISEASE_KEYWORDS = {
    "Healthy": ["healthy", "normal", "no disease", "fit"],
    "Foot and Mouth Disease": [
        "foot and mouth",
        "foot-and-mouth",
        "foot & mouth",
        "fmd",
        "aphthous",
        "hoof and mouth",
    ],
    "Lumpy Skin Disease": ["lumpy skin", "lumpy", "lsd", "nodular", "skin disease"],
    "Mastitis": ["mastitis", "udder infection", "mammary"],
    "Bovine Respiratory Disease": [
        "bovine respiratory",
        "respiratory",
        "brd",
        "pneumonia",
        "shipping fever",
        "lung",
    ],
}

ANIMAL_KEYWORDS = ["cattle", "cow", "bovine", "calf", "calves", "dairy", "heifer", "bull"]

# The reference matrix uses 26 bovine diagnoses. Only the three that map onto
# VetPulse's image-backed diseases are used; the rest are out of scope.
BINARY_MATRIX_DISEASE_MAP = {
    "foot and mouth": "Foot and Mouth Disease",
    "mastitis": "Mastitis",
    "calf pneumonia": "Bovine Respiratory Disease",
    "infectious bovine rhinotracheitis": "Bovine Respiratory Disease",
}

# VetPulse symptom -> one or more columns of the 93-signal reference matrix.
# Names are compared after app.features.normalize_text, so "high_temp" is
# matched as "high temp".
BINARY_SYMPTOM_MAP = {
    "Fever": ["fever", "high temp", "intermittent fever"],
    "Reduced appetite": ["anorexia", "loss of appetite", "reduces feed intake"],
    "Weakness": ["weakness", "lethargy", "dull", "depression"],
    "Weight loss": ["weight loss", "emaciation"],
    "Dehydration": ["dehydration"],
    "Reduced milk production": ["reduction milk vields", "reduced fat"],
    "Swelling": ["swelling", "oedema"],
    "Lesions": ["mucosal lesions", "blisters", "hyperaemia"],
    "Excessive salivation": ["salivation", "drooling", "frothing of mouth", "frothing", "saliva"],
    "Mouth ulcers": ["ulcers", "blisters"],
    "Difficulty chewing": ["painful tongue", "swollen tongue"],
    "Diarrhoea": ["diarrhoea", "highly diarrhoea", "mild diarrhoea", "dysentery"],
    "Bloating": ["gaseous stomach"],
    "Reduced rumination": ["rumenstasis", "reduced rumination"],
    "Cough": ["coughing"],
    "Nasal discharge": ["nasel discharges"],
    "Difficulty breathing": ["dyspnea", "diffculty breath", "shallow breathing", "swollen pharyngeal"],
    "Rapid breathing": ["rapid breathing", "raised breathing", "tachycardia", "high pulse rate"],
    "Swollen udder": ["udder swelling", "udder hardeness"],
    "Abnormal milk": ["milk flakes", "milk watery", "milk clots"],
    "Pain during milking": ["udder pain", "udder heat", "udder redness"],
    "Reproductive problems": ["infertility", "decreased fertility", "reduced fertility", "abortions", "stillbirths"],
    "Lameness": ["lameness"],
    "Difficulty standing": ["unwillingness to move", "ankylosis", "arthrogyposis"],
    "Joint swelling": ["arthrogyposis"],
}


def _map_disease(value: str) -> Optional[str]:
    text = normalize_text(value)
    for disease, keywords in DISEASE_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return disease
    return None


def _find_column(columns: List[str], candidates: List[str]) -> Optional[str]:
    for candidate in candidates:
        for column in columns:
            if candidate in normalize_text(column):
                return column
    return None


def _row_from_kaggle(record: pd.Series, columns: dict, source: str) -> Optional[dict]:
    disease = _map_disease(str(record.get(columns.get("disease", ""), "")))
    if disease is None:
        return None

    symptom_text = str(record.get(columns.get("symptoms", ""), "") or "")
    raw_symptoms = [part for part in re.split(r"[,;|/]+", symptom_text) if part.strip()]
    canonical, _unknown = canonicalize_symptoms(raw_symptoms)

    temperature = None
    if columns.get("temperature"):
        try:
            temperature = float(record.get(columns["temperature"]))
            if not (30.0 <= temperature <= 46.0):
                temperature = None
        except (TypeError, ValueError):
            temperature = None

    duration_days = parse_duration_days(None, str(record.get(columns.get("duration", ""), "") or ""))
    severity = parse_severity(str(record.get(columns.get("severity", ""), "") or "moderate"))

    if temperature is None:
        temperature = float(np.random.normal(*TEMPERATURE_PROFILE[disease]))
    if duration_days <= 0 and disease != "Healthy":
        duration_days = max(1.0, float(np.random.normal(*DURATION_PROFILE[disease])))

    active_set = set(canonical)
    row = {
        "temperature": round(float(np.clip(temperature, 36.0, 42.5)), 2),
        "duration_days": round(float(np.clip(duration_days, 0.0, 45.0)), 2),
        "severity": float(SEVERITY_LEVELS.index(severity)),
    }
    for symptom in SYMPTOMS:
        row[feature_name_for_symptom(symptom)] = 1.0 if symptom in active_set else 0.0
    row["disease"] = disease
    row["source"] = source
    return row


def load_kaggle_datasets(raw_dir: Path) -> List[dict]:
    rows: List[dict] = []
    if not raw_dir.exists():
        return rows

    csv_files = sorted(raw_dir.rglob("*.csv"))
    for csv_path in csv_files:
        try:
            frame = pd.read_csv(csv_path, low_memory=False)
        except Exception as exc:  # pragma: no cover - defensive
            print(f"[skip] {csv_path.name}: {exc}")
            continue
        if frame.empty:
            continue

        columns = list(frame.columns)
        animal_col = _find_column(columns, ["animal", "species", "host", "livestock"])
        disease_col = _find_column(columns, ["disease", "diagnosis", "condition", "label", "class"])
        symptom_col = _find_column(columns, ["symptom", "sign", "clinical", "observation"])
        if disease_col is None:
            continue

        mapped = {
            "disease": disease_col,
            "symptoms": symptom_col,
            "temperature": _find_column(columns, ["temperature", "temp"]),
            "duration": _find_column(columns, ["duration", "days"]),
            "severity": _find_column(columns, ["severity", "intensity"]),
        }

        frame = frame.copy()
        if animal_col is not None:
            animal_text = frame[animal_col].astype(str).str.lower()
            mask = animal_text.apply(
                lambda value: any(keyword in value for keyword in ANIMAL_KEYWORDS)
            )
            if mask.any():
                frame = frame[mask]

        added = 0
        for _, record in frame.iterrows():
            row = _row_from_kaggle(record, mapped, source=csv_path.stem)
            if row is not None:
                rows.append(row)
                added += 1
        print(f"[kaggle] {csv_path.name}: +{added} cattle rows")

    return rows


def load_binary_symptom_matrix(raw_dir: Path, seed: int = 42) -> List[dict]:
    """Map the published 93-signal cattle disease matrix onto VetPulse rows."""
    rows: List[dict] = []
    if not raw_dir.exists():
        return rows

    rng = np.random.default_rng(seed)
    for csv_path in sorted(raw_dir.rglob("*.csv")):
        try:
            frame = pd.read_csv(csv_path, low_memory=False)
        except Exception as exc:  # pragma: no cover - defensive
            continue
        lookup = {normalize_text(column): column for column in frame.columns}
        if "prognosis" not in lookup:
            continue

        added = 0
        for _, record in frame.iterrows():
            disease = BINARY_MATRIX_DISEASE_MAP.get(
                normalize_text(record[lookup["prognosis"]])
            )
            if disease is None:
                continue

            active = set()
            for symptom, source_names in BINARY_SYMPTOM_MAP.items():
                for source_name in source_names:
                    column = lookup.get(source_name)
                    if column is None:
                        continue
                    try:
                        if float(record[column]) > 0.5:
                            active.add(symptom)
                            break
                    except (TypeError, ValueError):
                        continue

            temp_mean, temp_std = TEMPERATURE_PROFILE[disease]
            if "Fever" not in active:
                temp_mean -= 0.9
            temperature = float(np.clip(rng.normal(temp_mean, temp_std), 36.2, 42.2))
            duration = float(np.clip(rng.normal(*DURATION_PROFILE[disease]), 0.5, 40.0))
            severity_probs = np.array(SEVERITY_PROFILE[disease], dtype=float)
            severity_idx = int(
                rng.choice(len(SEVERITY_LEVELS), p=severity_probs / severity_probs.sum())
            )

            row = {
                "temperature": round(temperature, 2),
                "duration_days": round(duration, 2),
                "severity": float(severity_idx),
            }
            for symptom in SYMPTOMS:
                row[feature_name_for_symptom(symptom)] = 1.0 if symptom in active else 0.0
            row["disease"] = disease
            row["source"] = f"reference:{csv_path.stem}"
            rows.append(row)
            added += 1

        if added:
            print(f"[reference] {csv_path.name}: +{added} cattle rows")

    return rows


def generate_synthetic(n_per_class: int = 800, seed: int = 42) -> List[dict]:
    rng = np.random.default_rng(seed)
    rows: List[dict] = []

    for disease in CLASSES:
        profile = SYMPTOM_PROFILES[disease]
        for _ in range(n_per_class):
            active = {symptom for symptom, prob in profile.items() if rng.random() < prob}

            # Clinical noise: missed observations and occasional unrelated signs.
            for symptom in list(active):
                if rng.random() < 0.08:
                    active.discard(symptom)
            if rng.random() < 0.04:
                active.add(SYMPTOMS[int(rng.integers(0, len(SYMPTOMS)))])

            min_symptoms = 0 if disease == "Healthy" else 2
            while len(active) < min_symptoms:
                active.add(SYMPTOMS[int(rng.integers(0, len(SYMPTOMS)))])

            temp_mean, temp_std = TEMPERATURE_PROFILE[disease]
            temperature = float(np.clip(rng.normal(temp_mean, temp_std), 36.2, 42.2))

            if disease == "Healthy" and rng.random() < 0.06:
                temperature = float(np.clip(rng.normal(39.0, 0.25), 38.6, 39.4))

            # Fever is strongly linked to elevated temperature in diseased animals.
            if disease != "Healthy":
                if temperature >= 39.6 and rng.random() < 0.90:
                    active.add("Fever")
                elif temperature < 39.0 and rng.random() < 0.55:
                    active.discard("Fever")

            duration_mean, duration_std = DURATION_PROFILE[disease]
            duration = float(np.clip(rng.normal(duration_mean, duration_std), 0.0, 40.0))
            if disease == "Healthy" and rng.random() < 0.80:
                duration = float(rng.uniform(0.0, 1.0))

            severity_probs = np.array(SEVERITY_PROFILE[disease], dtype=float)
            severity_idx = int(rng.choice(len(SEVERITY_LEVELS), p=severity_probs / severity_probs.sum()))

            row = {
                "temperature": round(temperature, 2),
                "duration_days": round(duration, 2),
                "severity": float(severity_idx),
            }
            for symptom in SYMPTOMS:
                row[feature_name_for_symptom(symptom)] = 1.0 if symptom in active else 0.0
            row["disease"] = disease
            row["source"] = "synthetic"
            rows.append(row)

    return rows


def assign_split(frame: pd.DataFrame, seed: int = 42, val_fraction: float = 0.2) -> pd.DataFrame:
    """Stratify the split by disease and by real-vs-synthetic provenance."""
    rng = np.random.default_rng(seed)
    frame = frame.copy()
    is_real = (frame["source"].astype(str) != "synthetic").astype(int)
    frame["split"] = "train"
    for (_disease, _is_real), group in frame.groupby(["disease", is_real], sort=True):
        indices = group.index.to_numpy()
        if len(indices) < 2:
            continue
        shuffled = rng.permutation(indices)
        n_val = max(1, int(round(len(shuffled) * val_fraction)))
        frame.loc[shuffled[:n_val], "split"] = "val"
    return frame


def build_dataset(
    n_per_class: int = 800,
    seed: int = 42,
    output_path: Path = OUTPUT_PATH,
    val_fraction: float = 0.2,
) -> pd.DataFrame:
    print(f"Scanning reference CSVs in {RAW_DIR} ...")
    kaggle_rows = load_kaggle_datasets(RAW_DIR)
    reference_rows = load_binary_symptom_matrix(RAW_DIR, seed)
    real_rows = kaggle_rows + reference_rows
    print(
        f"Loaded {len(real_rows)} real cattle rows "
        f"({len(reference_rows)} from the 93-signal matrix)"
    )

    print(f"Generating {n_per_class * len(CLASSES)} synthetic rows ...")
    synthetic_rows = generate_synthetic(n_per_class=n_per_class, seed=seed)

    all_rows = real_rows + synthetic_rows
    frame = pd.DataFrame(all_rows)
    for symptom in SYMPTOMS:
        name = feature_name_for_symptom(symptom)
        if name not in frame.columns:
            frame[name] = 0.0
    frame = frame[FEATURE_NAMES + ["disease", "source"]]

    # De-duplicate exact feature rows but keep class balance reasonable.
    # Real rows are inserted first, so they survive de-duplication.
    frame = frame.drop_duplicates(subset=FEATURE_NAMES + ["disease"]).reset_index(drop=True)
    frame = assign_split(frame, seed=seed, val_fraction=val_fraction)
    frame = frame.sample(frac=1.0, random_state=seed).reset_index(drop=True)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(output_path, index=False)
    print(f"Saved {len(frame)} rows to {output_path}")
    print(frame["disease"].value_counts().to_string())
    print("Split counts:")
    print(frame["split"].value_counts().to_string())
    print("Real rows per split:")
    print(
        frame[frame["source"] != "synthetic"]
        .groupby(["split", "disease"])
        .size()
        .to_string()
    )
    return frame


def main() -> None:
    parser = argparse.ArgumentParser(description="Build cattle symptom dataset")
    parser.add_argument("--n-per-class", type=int, default=800)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--val-fraction", type=float, default=0.2)
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    args = parser.parse_args()
    build_dataset(
        n_per_class=args.n_per_class,
        seed=args.seed,
        output_path=args.output,
        val_fraction=args.val_fraction,
    )


if __name__ == "__main__":
    main()
