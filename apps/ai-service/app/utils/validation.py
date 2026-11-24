from typing import List

from ..schemas.prediction import PredictionRequest


def validate_symptoms(symptoms: List[str]) -> tuple[bool, str]:
    """Validate that symptoms is a list of non-empty strings."""
    if not isinstance(symptoms, list):
        return False, "Symptoms must be a list"
    for symptom in symptoms:
        if not isinstance(symptom, str):
            return False, f"Symptom must be a string, got {type(symptom)}"
        if len(symptom.strip()) == 0:
            return False, "Symptom cannot be empty"
    return True, ""


def validate_prediction_request(request: PredictionRequest) -> tuple[bool, str]:
    """Validate a prediction request for symptom-only, image-only or fused input."""
    valid, msg = validate_symptoms(request.symptoms or [])
    if not valid:
        return False, msg

    if request.temperature is not None:
        if not isinstance(request.temperature, (int, float)):
            return False, "Temperature must be a number"
        if request.temperature < 35.0 or request.temperature > 45.0:
            return False, "Temperature must be between 35.0 and 45.0 Celsius"

    if request.duration is not None:
        if not isinstance(request.duration, (int, float)):
            return False, "Duration must be a number"
        if request.duration < 0:
            return False, "Duration cannot be negative"

    for ref in request.all_image_refs():
        if not isinstance(ref, str):
            return False, "Image reference must be a string"

    has_signal = bool(
        request.symptoms
        or request.temperature is not None
        or request.duration is not None
        or request.duration_label()
        or request.all_image_refs()
    )
    if not has_signal:
        return False, "Provide at least one symptom, temperature, duration or image"

    return True, ""
