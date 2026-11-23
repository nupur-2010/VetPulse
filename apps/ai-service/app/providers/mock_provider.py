import uuid
from datetime import datetime
from typing import List, Dict

from ..schemas.prediction import (
    PredictionRequest,
    PredictionResponse,
    PossibleCondition,
    ImageAssessment,
)
from .base_provider import BasePredictionProvider

SCENARIOS = {
    "healthy": {
        "name": "Healthy",
        "confidence": 0.95,
        "severity": "LOW",
        "possible_conditions": [PossibleCondition(disease="Healthy", confidence=0.95)],
        "supporting_symptoms": ["normal"],
        "recommendations": ["Continue regular monitoring"],
    },
    "fmd": {
        "name": "Foot-and-Mouth Disease",
        "confidence": 0.87,
        "severity": "CRITICAL",
        "possible_conditions": [PossibleCondition(disease="Foot-and-Mouth Disease", confidence=0.87)],
        "supporting_symptoms": ["fever"],
        "recommendations": ["ISOLATE animal immediately"],
    },
    "lumpy_skin": {
        "name": "Lumpy Skin Disease",
        "confidence": 0.82,
        "severity": "HIGH",
        "possible_conditions": [PossibleCondition(disease="Lumpy Skin Disease", confidence=0.82)],
        "supporting_symptoms": ["nodule"],
        "recommendations": ["ISOLATE animal immediately"],
    },
    "mastitis": {
        "name": "Mastitis",
        "confidence": 0.89,
        "severity": "MODERATE",
        "possible_conditions": [PossibleCondition(disease="Mastitis", confidence=0.89)],
        "supporting_symptoms": ["udder"],
        "recommendations": ["Continue milking"],
    },
    "brd": {
        "name": "Bovine Respiratory Disease",
        "confidence": 0.84,
        "severity": "HIGH",
        "possible_conditions": [PossibleCondition(disease="Bovine Respiratory Disease", confidence=0.84)],
        "supporting_symptoms": ["cough"],
        "recommendations": ["ISOLATE affected animal"],
    },
    "theileriosis": {
        "name": "Theileriosis",
        "confidence": 0.78,
        "severity": "HIGH",
        "possible_conditions": [PossibleCondition(disease="Theileriosis", confidence=0.78)],
        "supporting_symptoms": ["fever"],
        "recommendations": ["Blood smear examination"],
    },
    "babesiosis": {
        "name": "Babesiosis",
        "confidence": 0.76,
        "severity": "HIGH",
        "possible_conditions": [PossibleCondition(disease="Babesiosis", confidence=0.76)],
        "supporting_symptoms": ["fever"],
        "recommendations": ["Blood smear examination"],
    },
    "anaplasmosis": {
        "name": "Anaplasmosis",
        "confidence": 0.74,
        "severity": "MODERATE",
        "possible_conditions": [PossibleCondition(disease="Anaplasmosis", confidence=0.74)],
        "supporting_symptoms": ["fever"],
        "recommendations": ["Blood smear examination"],
    },
    "blackleg": {
        "name": "Blackleg",
        "confidence": 0.81,
        "severity": "CRITICAL",
        "possible_conditions": [PossibleCondition(disease="Blackleg", confidence=0.81)],
        "supporting_symptoms": ["sudden weakness"],
        "recommendations": ["EMERGENCY veterinary attention"],
    },
    "bovine_ephemeral_fever": {
        "name": "Bovine Ephemeral Fever",
        "confidence": 0.73,
        "severity": "MODERATE",
        "possible_conditions": [PossibleCondition(disease="Bovine Ephemeral Fever", confidence=0.73)],
        "supporting_symptoms": ["fever"],
        "recommendations": ["Anti-inflammatory medication"],
    },
    "insufficient_info": {
        "name": "Insufficient Information",
        "confidence": 0.0,
        "severity": "UNKNOWN",
        "possible_conditions": [PossibleCondition(disease="Insufficient Information", confidence=0.0)],
        "supporting_symptoms": ["N/A"],
        "recommendations": ["Provide more detailed symptom information"],
    },
    "uncertain": {
        "name": "Uncertain Prediction",
        "confidence": 0.3,
        "severity": "UNKNOWN",
        "possible_conditions": [PossibleCondition(disease="Uncertain Prediction", confidence=0.3)],
        "supporting_symptoms": ["N/A"],
        "recommendations": ["Consult with veterinarian"],
    },
}

class MockPredictionProvider(BasePredictionProvider):
    def __init__(self):
        self.provider_name = "mock"
        self.model_status = "MOCK"
        self.model_version = "1.0.0-mock"

    def _normalize_symptom(self, symptom: str) -> str:
        return symptom.lower().strip().replace("-", "_").replace(" ", "_")

    async def predict(self, request: PredictionRequest) -> PredictionResponse:
        scenario_key = "uncertain"
        symptoms = request.symptoms or []
        temp = request.temperature

        # Find best matching scenario
        scores = {}
        for key, scen in SCENARIOS.items():
            if key in ("healthy", "insufficient_info", "uncertain"):
                continue
            matches = 0
            for kw in scen.get("keywords", []):
                for sym in symptoms:
                    if kw.lower() in self._normalize_symptom(sym):
                        matches += 1
                        break
            if matches > 0:
                scores[key] = matches * 10
        if scores:
            scenario_key = max(scores, key=scores.get)
        elif not symptoms or len(symptoms) < 2:
            scenario_key = "insufficient_info"

        scenario = SCENARIOS[scenario_key]
        pred_id = str(uuid.uuid4())
        return PredictionResponse(
            prediction_id=pred_id,
            provider=self.provider_name,
            model_status=self.model_status,
            is_simulated=True,
            predicted_disease=scenario["name"],
            confidence=scenario["confidence"],
            severity=scenario["severity"],
            possible_conditions=scenario["possible_conditions"],
            supporting_symptoms=scenario["supporting_symptoms"],
            recommendations=scenario["recommendations"],
            disclaimer="This is a simulated prediction for testing purposes only.",
            predicted_at=datetime.utcnow(),
        )

    async def health(self) -> dict:
        return {"status": "HEALTHY", "provider": self.provider_name, "model_status": self.model_status}

    async def model_info(self) -> dict:
        return {
            "name": "Mock Cattle Disease Detection Model",
            "version": self.model_version,
            "status": self.model_status,
            "is_simulated": True,
        }