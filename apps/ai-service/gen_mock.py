#!/usr/bin/env python3
"""Generate mock_provider.py"""
import os

# The file path
fpath = "C:/Users/BIT/Desktop/VetPulse/apps/ai-service/app/providers/mock_provider.py"

# Build the content
lines = []
lines.append('import uuid')
lines.append('from datetime import datetime')
lines.append('from typing import List, Dict')
lines.append('')
lines.append('from ..schemas.prediction import (')
lines.append('    PredictionRequest,')
lines.append('    PredictionResponse,')
lines.append('    PossibleCondition,')
lines.append('    ImageAssessment,')
lines.append(')')
lines.append('from .base_provider import BasePredictionProvider')
lines.append('')

# Add SCENARIOS dictionary
lines.append('SCENARIOS = {')
scenarios = [
    ("healthy", "Healthy", 0.95, "LOW", ["normal", "healthy", "active"], ["fever", "swelling"], "Continue regular monitoring"),
    ("fmd", "Foot-and-Mouth Disease", 0.87, "CRITICAL", ["fever", "salivation", "ulcer"], ["skin nodule"], "ISOLATE animal immediately"),
    ("lumpy_skin", "Lumpy Skin Disease", 0.82, "HIGH", ["nodule", "lump", "swelling"], ["mouth"], "ISOLATE animal immediately"),
    ("mastitis", "Mastitis", 0.89, "MODERATE", ["udder", "milk"], ["respiratory"], "Continue milking"),
    ("brd", "Bovine Respiratory Disease", 0.84, "HIGH", ["cough", "respiratory"], ["mouth ulcer"], "ISOLATE affected animal"),
    ("theileriosis", "Theileriosis", 0.78, "HIGH", ["fever", "weakness", "tick"], ["mouth ulcer"], "Blood smear examination"),
    ("babesiosis", "Babesiosis", 0.76, "HIGH", ["fever", "anemia", "tick"], ["mouth ulcer"], "Blood smear examination"),
    ("anaplasmosis", "Anaplasmosis", 0.74, "MODERATE", ["fever", "icterus", "tick"], [], "Blood smear examination"),
    ("blackleg", "Blackleg", 0.81, "CRITICAL", ["sudden weakness", "lameness"], ["respiratory"], "EMERGENCY veterinary attention"),
    ("bovine_ephemeral_fever", "Bovine Ephemeral Fever", 0.73, "MODERATE", ["fever", "nasal discharge"], [], "Anti-inflammatory medication"),
    ("insufficient_info", "Insufficient Information", 0.0, "UNKNOWN", [], [], "Provide more detailed symptom information"),
    ("uncertain", "Uncertain Prediction", 0.30, "UNKNOWN", [], [], "Consult with veterinarian"),
]
for key, name, conf, sev, pos_keywords, neg_keywords, first_rec in scenarios:
    lines.append(f'    "{key}": {{')
    lines.append(f'        "name": "{name}",')
    lines.append(f'        "confidence": {conf},')
    lines.append(f'        "severity": "{sev}",')
    lines.append(f'        "possible_conditions": [PossibleCondition(disease="{name}", confidence={conf})],')
    lines.append(f'        "supporting_symptoms": ["{pos_keywords[0] if pos_keywords else "N/A"}"],')
    lines.append(f'        "recommendations": ["{first_rec}"],')
    lines.append('    },')
lines.append('}')

# MockPredictionProvider class
lines.append('')
lines.append('class MockPredictionProvider(BasePredictionProvider):')
lines.append('    def __init__(self):')
lines.append('        self.provider_name = "mock"')
lines.append('        self.model_status = "MOCK"')
lines.append('        self.model_version = "1.0.0-mock"')
lines.append('')
lines.append('    def _normalize_symptom(self, symptom: str) -> str:')
lines.append('        return symptom.lower().strip().replace("-", "_").replace(" ", "_")')
lines.append('')
lines.append('    async def predict(self, request: PredictionRequest) -> PredictionResponse:')
lines.append('        scenario_key = "uncertain"')
lines.append('        symptoms = request.symptoms or []')
lines.append('        temp = request.temperature')
lines.append('')
lines.append('        # Find best matching scenario')
lines.append('        scores = {}')
lines.append('        for key, scen in SCENARIOS.items():')
lines.append('            if key in ("healthy", "insufficient_info", "uncertain"):')
lines.append('                continue')
lines.append('            matches = 0')
lines.append('            for kw in scen.get("keywords", []):')
lines.append('                for sym in symptoms:')
lines.append('                    if kw.lower() in self._normalize_symptom(sym):')
lines.append('                        matches += 1')
lines.append('                        break')
lines.append('            if matches > 0:')
lines.append('                scores[key] = matches * 10')
lines.append('        if scores:')
lines.append('            scenario_key = max(scores, key=scores.get)')
lines.append('        elif not symptoms or len(symptoms) < 2:')
lines.append('            scenario_key = "insufficient_info"')
lines.append('')
lines.append('        scenario = SCENARIOS[scenario_key]')
lines.append('        pred_id = str(uuid.uuid4())')
lines.append('        return PredictionResponse(')
lines.append('            prediction_id=pred_id,')
lines.append('            provider=self.provider_name,')
lines.append('            model_status=self.model_status,')
lines.append('            is_simulated=True,')
lines.append('            predicted_disease=scenario["name"],')
lines.append('            confidence=scenario["confidence"],')
lines.append('            severity=scenario["severity"],')
lines.append('            possible_conditions=scenario["possible_conditions"],')
lines.append('            supporting_symptoms=scenario["supporting_symptoms"],')
lines.append('            recommendations=scenario["recommendations"],')
lines.append('            disclaimer="This is a simulated prediction for testing purposes only.",')
lines.append('            predicted_at=datetime.utcnow(),')
lines.append('        )')
lines.append('')
lines.append('    async def health(self) -> dict:')
lines.append('        return {"status": "HEALTHY", "provider": self.provider_name, "model_status": self.model_status}')
lines.append('')
lines.append('    async def model_info(self) -> dict:')
lines.append('        return {')
lines.append('            "name": "Mock Cattle Disease Detection Model",')
lines.append('            "version": self.model_version,')
lines.append('            "status": self.model_status,')
lines.append('            "is_simulated": True,')
lines.append('        }')

# Write file
content = "\n".join(lines)
with open(fpath, "w") as f:
    f.write(content)
print(f"Created {fpath}")
