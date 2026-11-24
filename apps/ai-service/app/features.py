"""Feature engineering shared by training scripts and the inference service."""

import re
from typing import Iterable, List, Optional, Tuple

from .constants import (
    DURATION_MAP,
    SEVERITY_ALIASES,
    SEVERITY_TO_INT,
    SYMPTOMS,
)

_UNKNOWN_TOKENS = {"normal", "healthy", "active", "none", "no symptoms", "n/a", "na"}


def slug(text: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "_", text.strip().lower())
    return text.strip("_")


def normalize_text(text: str) -> str:
    text = str(text).strip().lower()
    text = text.replace("_", " ").replace("-", " ")
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


SYMPTOM_LOOKUP = {normalize_text(s): s for s in SYMPTOMS}

_ALIASES = {
    "high temperature": "Fever",
    "high fever": "Fever",
    "temperature": "Fever",
    "loss of appetite": "Reduced appetite",
    "poor appetite": "Reduced appetite",
    "not eating": "Reduced appetite",
    "low appetite": "Reduced appetite",
    "tiredness": "Weakness",
    "lethargy": "Weakness",
    "body weight loss": "Weight loss",
    "loss of weight": "Weight loss",
    "thirst": "Dehydration",
    "reduced milk": "Reduced milk production",
    "drop in milk": "Reduced milk production",
    "milk drop": "Reduced milk production",
    "nodule": "Skin nodules",
    "nodules": "Skin nodules",
    "skin lumps": "Skin nodules",
    "lumps": "Skin nodules",
    "edema": "Swelling",
    "oedema": "Swelling",
    "lesion": "Lesions",
    "sores": "Lesions",
    "wound": "Wounds",
    "salivation": "Excessive salivation",
    "drooling": "Excessive salivation",
    "mouth ulcer": "Mouth ulcers",
    "mouth blister": "Mouth ulcers",
    "blisters": "Mouth ulcers",
    "blister": "Mouth ulcers",
    "chewing difficulty": "Difficulty chewing",
    "diarrhea": "Diarrhoea",
    "scours": "Diarrhoea",
    "bloat": "Bloating",
    "coughing": "Cough",
    "nasal dripping": "Nasal discharge",
    "breathing difficulty": "Difficulty breathing",
    "laboured breathing": "Difficulty breathing",
    "labored breathing": "Difficulty breathing",
    "fast breathing": "Rapid breathing",
    "udder swelling": "Swollen udder",
    "swollen quarter": "Swollen udder",
    "milk changes": "Abnormal milk",
    "abnormal milk color": "Abnormal milk",
    "painful milking": "Pain during milking",
    "milking pain": "Pain during milking",
    "reproductive problem": "Reproductive problems",
    "abnormal vaginal discharge": "Abnormal discharge",
    "lame": "Lameness",
    "lameness": "Lameness",
    "unable to stand": "Difficulty standing",
    "stiffness": "Difficulty standing",
    "joint swelling": "Joint swelling",
    "swollen joints": "Joint swelling",
    "collapse": "Sudden weakness",
    "sudden collapse": "Sudden weakness",
}

for _alias, _target in _ALIASES.items():
    SYMPTOM_LOOKUP.setdefault(normalize_text(_alias), _target)


def canonicalize_symptoms(symptoms: Optional[Iterable[str]]) -> Tuple[List[str], List[str]]:
    """Map free-text symptoms onto the exact frontend symptom vocabulary."""
    canonical: List[str] = []
    unknown: List[str] = []
    seen = set()
    for raw in symptoms or []:
        if raw is None:
            continue
        text = str(raw).strip()
        if not text:
            continue
        key = normalize_text(text)
        if key in _UNKNOWN_TOKENS:
            continue
        target = SYMPTOM_LOOKUP.get(key)
        if target is None:
            # Light fuzzy fallback: substring match on the canonical vocabulary.
            for lookup_key, candidate in SYMPTOM_LOOKUP.items():
                if key and (key in lookup_key or lookup_key in key):
                    target = candidate
                    break
        if target is None:
            unknown.append(text)
            continue
        if target not in seen:
            seen.add(target)
            canonical.append(target)
    return canonical, unknown


def parse_duration_days(duration: Optional[object], symptom_duration: Optional[str]) -> float:
    if duration is not None:
        try:
            return max(0.0, float(duration))
        except (TypeError, ValueError):
            pass

    if symptom_duration:
        key = normalize_text(str(symptom_duration))
        if key in DURATION_MAP:
            return DURATION_MAP[key]
        numbers = [float(n) for n in re.findall(r"\d+(?:\.\d+)?", key)]
        if numbers:
            days = sum(numbers) / len(numbers)
            if "week" in key:
                days *= 7.0
            elif "month" in key:
                days *= 30.0
            return max(0.0, days)
    return 0.0


def parse_severity(severity: Optional[str]) -> str:
    key = normalize_text(severity or "")
    return SEVERITY_ALIASES.get(key, "moderate")


def feature_name_for_symptom(symptom: str) -> str:
    return f"symptom_{slug(symptom)}"


FEATURE_NAMES = ["temperature", "duration_days", "severity"] + [
    feature_name_for_symptom(s) for s in SYMPTOMS
]


def build_feature_dict(
    symptoms: Optional[Iterable[str]],
    temperature: Optional[float],
    duration_days: float,
    severity: str,
) -> dict:
    active, _unknown = canonicalize_symptoms(symptoms)
    active_set = set(active)
    row = {
        "temperature": 38.5 if temperature is None else float(temperature),
        "duration_days": float(duration_days),
        "severity": float(SEVERITY_TO_INT.get(parse_severity(severity), 1)),
    }
    for symptom in SYMPTOMS:
        row[feature_name_for_symptom(symptom)] = 1.0 if symptom in active_set else 0.0
    return row


def row_to_vector(row: dict) -> List[float]:
    return [float(row[name]) for name in FEATURE_NAMES]
