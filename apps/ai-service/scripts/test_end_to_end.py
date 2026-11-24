"""End-to-end API verification for symptom-only, fused and image-only payloads.

Usage:
    python scripts/test_end_to_end.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.main import app  # noqa: E402

IMAGE_PATH = str(ROOT / "data" / "images" / "val" / "Lumpy_Skin_Disease" / "Lumpy_Skin_Disease_00000.jpg")

CASES = [
    (
        "symptom_only_fmd",
        {
            "symptoms": ["Fever", "Mouth ulcers", "Excessive salivation", "Difficulty standing"],
            "temperature": 40.5,
            "symptomDuration": "4-7 days",
            "severity": "severe",
        },
        "Foot and Mouth Disease",
    ),
    (
        "symptom_only_brd",
        {
            "symptoms": ["Cough", "Nasal discharge", "Difficulty breathing", "Fever"],
            "temperature": 40.6,
            "symptom_duration": "2-3 days",
            "severity": "moderate",
        },
        "Bovine Respiratory Disease",
    ),
    (
        "symptom_plus_image_lsd",
        {
            "symptoms": ["Skin nodules", "Swelling", "Fever"],
            "temperature": 40.0,
            "severity": "severe",
            "image_paths": [IMAGE_PATH],
        },
        "Lumpy Skin Disease",
    ),
    (
        "image_only_lsd",
        {"image_paths": [IMAGE_PATH]},
        "Lumpy Skin Disease",
    ),
    (
        "healthy",
        {"symptoms": [], "temperature": 38.5, "severity": "mild"},
        "Healthy",
    ),
]


def check(result: dict, expected: str) -> None:
    required = {
        "prediction_id",
        "predicted_disease",
        "confidence",
        "class_probabilities",
        "top_contributing_factors",
        "severity",
        "recommendations",
    }
    missing = required - set(result)
    assert not missing, f"Missing keys: {missing}"
    assert "is_simulated" not in result, "simulated flag must not be returned"
    assert result["predicted_disease"] == expected, (
        f"expected {expected}, got {result['predicted_disease']}"
    )
    assert 0 <= result["confidence"] <= 100
    total = sum(result["class_probabilities"].values())
    assert abs(total - 100.0) < 0.5, f"class probabilities sum to {total}"
    assert result["top_contributing_factors"]


def main() -> None:
    with TestClient(app) as client:
        health = client.get("/health")
        health.raise_for_status()
        print("HEALTH:", health.json())

        info = client.get("/model-info")
        info.raise_for_status()
        print("MODEL-INFO:", json.dumps(info.json(), indent=2))

        for name, payload, expected in CASES:
            response = client.post("/predict", json=payload)
            assert response.status_code == 200, f"{name}: {response.status_code} {response.text}"
            result = response.json()
            check(result, expected)
            print(
                f"\n[PASS] {name}: {result['predicted_disease']} "
                f"({result['confidence']}%) provider={result['provider']} "
                f"used_image={result['used_image']} used_symptoms={result['used_symptoms']}"
            )
            print("  class_probabilities:", result["class_probabilities"])
            print("  top_contributing_factors:", result["top_contributing_factors"])

        alias = client.post("/assess", json=CASES[0][1])
        assert alias.status_code == 200, alias.text
        print("\n[PASS] /assess alias")

        invalid = client.post("/predict", json={"symptoms": []})
        assert invalid.status_code == 400, invalid.text
        print("[PASS] empty payload rejected with 400")

    print("\nAll end-to-end checks passed.")


if __name__ == "__main__":
    main()
