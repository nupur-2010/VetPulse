"""Optional keyword fallback used only when AI_PROVIDER=mock.

The production path is LocalPredictionProvider (tab + vision late fusion).
"""

import uuid
from datetime import datetime

from ..constants import CLASSES, DEFAULT_SEVERITY, DISCLAIMER, RECOMMENDATIONS
from ..features import canonicalize_symptoms
from ..schemas.prediction import (
    PossibleCondition,
    PredictionRequest,
    PredictionResponse,
)
from .base_provider import BasePredictionProvider

_KEYWORDS = {
    "Foot and Mouth Disease": {"Mouth ulcers", "Excessive salivation", "Difficulty chewing"},
    "Lumpy Skin Disease": {"Skin nodules", "Lesions", "Swelling"},
    "Mastitis": {"Swollen udder", "Abnormal milk", "Pain during milking"},
    "Bovine Respiratory Disease": {"Cough", "Nasal discharge", "Difficulty breathing"},
}


class MockPredictionProvider(BasePredictionProvider):
    def __init__(self):
        self.provider_name = "mock"
        self.model_status = "MOCK"
        self.model_version = "1.0.0-mock"

    def _normalize_symptom(self, symptom: str) -> str:
        return symptom.lower().strip().replace("-", "_").replace(" ", "_")

    async def predict(self, request: PredictionRequest) -> PredictionResponse:
        symptoms, _unknown = canonicalize_symptoms(request.symptoms)
        active = set(symptoms)

        scores = {"Healthy": 0.2}
        for disease, keywords in _KEYWORDS.items():
            matches = len(active & keywords)
            if matches:
                scores[disease] = float(matches)
        predicted = max(scores, key=scores.get)

        probabilities = {name: 5.0 for name in CLASSES}
        probabilities[predicted] = 70.0
        remaining = 30.0 / (len(CLASSES) - 1)
        for name in CLASSES:
            if name != predicted:
                probabilities[name] = round(remaining, 2)
        probabilities[predicted] = round(
            100.0 - sum(v for k, v in probabilities.items() if k != predicted), 2
        )

        return PredictionResponse(
            prediction_id=str(uuid.uuid4()),
            provider=self.provider_name,
            model_status=self.model_status,
            predicted_disease=predicted,
            confidence=probabilities[predicted],
            class_probabilities=probabilities,
            top_contributing_factors=symptoms or ["No symptoms reported"],
            severity=DEFAULT_SEVERITY[predicted],
            possible_conditions=[
                PossibleCondition(disease=name, confidence=value / 100.0)
                for name, value in sorted(
                    probabilities.items(), key=lambda item: item[1], reverse=True
                )[:3]
            ],
            supporting_symptoms=symptoms,
            recommendations=RECOMMENDATIONS[predicted],
            disclaimer=DISCLAIMER,
            predicted_at=datetime.utcnow(),
            used_image=False,
            used_symptoms=bool(symptoms),
        )

    async def health(self) -> dict:
        return {
            "status": "HEALTHY",
            "provider": self.provider_name,
            "model_status": self.model_status,
            "symptom_model_loaded": False,
            "vision_model_loaded": False,
        }

    async def model_info(self) -> dict:
        return {
            "name": "Mock Cattle Disease Detection Model",
            "version": self.model_version,
            "status": self.model_status,
            "classes": CLASSES,
            "image_classes": [],
            "symptom_model_loaded": False,
            "vision_model_loaded": False,
        }
