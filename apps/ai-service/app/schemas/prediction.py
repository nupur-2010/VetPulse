from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class PredictionRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    symptoms: List[str] = Field(
        default_factory=list,
        description="Observed symptom labels from the frontend",
        examples=[["Fever", "Mouth ulcers", "Excessive salivation"]],
    )
    temperature: Optional[float] = Field(
        None,
        description="Body temperature in Celsius",
        ge=35.0,
        le=45.0,
    )
    duration: Optional[float] = Field(
        None,
        description="Duration of symptoms in days",
        ge=0,
    )
    symptom_duration: Optional[str] = Field(
        None,
        description="Frontend duration label, e.g. '2-3 days'",
    )
    symptomDuration: Optional[str] = Field(
        None,
        description="CamelCase alias for symptom_duration",
    )
    severity: Optional[str] = Field(
        None,
        description="Reported severity: mild, moderate, severe or critical",
    )
    animal_info: Optional[Dict[str, Any]] = Field(
        None,
        description="Animal metadata (species, breed, age, weight, etc.)",
    )
    image_refs: Optional[List[str]] = Field(
        None,
        description="Image URLs, absolute paths or data URIs",
    )
    image_urls: Optional[List[str]] = Field(None, description="Image URLs")
    image_paths: Optional[List[str]] = Field(None, description="Local image paths")
    image_url: Optional[str] = Field(None, description="Single image URL")
    image_path: Optional[str] = Field(None, description="Single image path")

    def all_image_refs(self) -> List[str]:
        refs: List[str] = []
        for value in (self.image_refs, self.image_urls, self.image_paths):
            if value:
                refs.extend(value)
        if self.image_url:
            refs.append(self.image_url)
        if self.image_path:
            refs.append(self.image_path)
        seen = set()
        unique = []
        for ref in refs:
            if ref and ref not in seen:
                seen.add(ref)
                unique.append(ref)
        return unique

    def duration_label(self) -> Optional[str]:
        return self.symptom_duration or self.symptomDuration


class PossibleCondition(BaseModel):
    disease: str = Field(..., description="Disease name")
    confidence: float = Field(
        ...,
        description="Probability between 0 and 1",
        ge=0.0,
        le=1.0,
    )


class ImageAssessment(BaseModel):
    status: str = Field(..., description="Assessment status")
    note: Optional[str] = Field(None, description="Additional notes")
    predicted_class: Optional[str] = Field(None, description="Top image class")
    confidence: Optional[float] = Field(
        None, description="Vision confidence (0-100)", ge=0.0, le=100.0
    )


class PredictionResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    prediction_id: str = Field(..., description="Unique prediction identifier")
    provider: str = Field(..., description="Prediction provider name")
    model_status: str = Field(..., description="Model status")

    predicted_disease: str = Field(..., description="Primary predicted disease")
    confidence: float = Field(
        ...,
        description="Primary prediction confidence (0-100)",
        ge=0.0,
        le=100.0,
    )
    class_probabilities: Dict[str, float] = Field(
        ...,
        description="Probability for every target class (0-100)",
    )
    top_contributing_factors: List[str] = Field(
        default_factory=list,
        description="Human-readable symptoms and image findings driving the result",
    )

    severity: str = Field(..., description="Severity level: mild, moderate, severe, critical")
    possible_conditions: List[PossibleCondition] = Field(
        default_factory=list,
        description="Ranked alternative conditions (0-1 confidence)",
    )
    supporting_symptoms: List[str] = Field(
        default_factory=list,
        description="Symptoms supporting the prediction",
    )
    recommendations: List[str] = Field(default_factory=list)
    disclaimer: str = Field(...)
    predicted_at: datetime = Field(default_factory=datetime.utcnow)
    image_assessment: Optional[ImageAssessment] = None

    used_image: bool = Field(False, description="Whether an image contributed to the result")
    used_symptoms: bool = Field(False, description="Whether tabular data contributed")
    fusion_weights: Optional[Dict[str, float]] = Field(
        None, description="Weights applied to each branch"
    )

    # --- Reliability / abstention metadata (additive, backward compatible) ---
    calibration_applied: bool = Field(
        False, description="Whether temperature calibration was applied"
    )
    confidence_band: str = Field(
        "medium",
        description="Calibrated confidence band: high, medium or low",
    )
    is_low_confidence: bool = Field(
        False,
        description="True when evidence is too weak to trust the top prediction",
    )
    requires_vet_review: bool = Field(
        False,
        description="True when a veterinarian should review the case",
    )
    inconclusive: bool = Field(
        False,
        description="True when the model abstains from a confident diagnosis",
    )
    top2_margin: Optional[float] = Field(
        None,
        description="Calibrated gap between the top two class probabilities (0-1)",
    )
    evidence_count: int = Field(
        0,
        description="Number of independent signals used (symptoms, temperature, duration, image)",
    )
    unrecognized_symptoms: List[str] = Field(
        default_factory=list,
        description="Symptom labels the service could not map to a known feature",
    )
    confidence_note: Optional[str] = Field(
        None,
        description="Plain-language explanation when confidence is reduced",
    )


class ModelInfo(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    name: str = Field(..., description="Model name")
    version: str = Field(..., description="Model version")
    status: str = Field(..., description="Model status")
    classes: List[str] = Field(default_factory=list)
    image_classes: List[str] = Field(default_factory=list)
    symptom_model_loaded: bool = False
    vision_model_loaded: bool = False
    calibration: Optional[Dict[str, Any]] = Field(
        None, description="Active calibration temperatures and confidence thresholds"
    )


class HealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: str = Field(..., description="Service health status")
    provider: str = Field(..., description="Active provider")
    model_status: str = Field(..., description="Model status")
    symptom_model_loaded: bool = False
    vision_model_loaded: bool = False
