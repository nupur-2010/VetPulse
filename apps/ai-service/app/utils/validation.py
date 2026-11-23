from typing import List, Dict, Any
from ..schemas.prediction import PredictionRequest


def validate_symptoms(symptoms: List[str]) -> tuple[bool, str]:
    """Validate that symptoms is a non-empty list of strings."""
    if not isinstance(symptoms, list):
        return False, "Symptoms must be a list"
    if len(symptoms) == 0:
        return False, "At least one symptom is required"
    for symptom in symptoms:
        if not isinstance(symptom, str):
            return False, f"Symptom must be a string, got {type(symptom)}"
        if len(symptom.strip()) == 0:
            return False, "Symptom cannot be empty"
    return True, ""


def validate_prediction_request(request: PredictionRequest) -> tuple[bool, str]:
    """Validate a prediction request."""
    if request.symptoms is None:
        return False, "Symptoms are required"

    valid, msg = validate_symptoms(request.symptoms)
    if not valid:
        return False, msg

    if request.temperature is not None:
        if not isinstance(request.temperature, (int, float)):
            return False, "Temperature must be a number"
        if request.temperature < 35.0 or request.temperature > 45.0:
            return False, "Temperature must be between 35.0 and 45.0 Celsius"

    if request.duration is not None:
        if not isinstance(request.duration, int):
            return False, "Duration must be an integer"
        if request.duration < 0:
            return False, "Duration cannot be negative"

    if request.image_refs is not None:
        if not isinstance(request.image_refs, list):
            return False, "Image references must be a list"
        for ref in request.image_refs:
            if not isinstance(ref, str):
                return False, "Image reference must be a string"

    return True, ""
