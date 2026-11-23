from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    symptoms: List[str] = Field(
        ...,
        description="List of observed symptoms",
        examples=[["fever", "excessive_salivation", "mouth_ulcers"]]
    )
    temperature: Optional[float] = Field(
        None,
        description="Body temperature in Celsius",
        ge=35.0,
        le=45.0
    )
    duration: Optional[int] = Field(
        None,
        description="Duration of symptoms in days",
        ge=0
    )
    animal_info: Optional[Dict[str, Any]] = Field(
        None,
        description="Animal metadata (species, breed, age, weight, etc.)"
    )
    image_refs: Optional[List[str]] = Field(
        None,
        description="References to uploaded images for analysis"
    )


class PossibleCondition(BaseModel):
    disease: str = Field(..., description="Disease name")
    confidence: float = Field(
        ...,
        description="Confidence score between 0 and 1",
        ge=0.0,
        le=1.0
    )


class ImageAssessment(BaseModel):
    status: str = Field(..., description="Assessment status")
    note: Optional[str] = Field(None, description="Additional notes")


class PredictionResponse(BaseModel):
    prediction_id: str = Field(..., description="Unique prediction identifier")
    provider: str = Field(..., description="Prediction provider name")
    model_status: str = Field(..., description="Model status")
    is_simulated: bool = Field(..., description="Whether prediction is simulated")
    predicted_disease: str = Field(..., description="Primary predicted disease")
    confidence: float = Field(
        ...,
        description="Primary prediction confidence",
        ge=0.0,
        le=1.0
    )
    severity: str = Field(..., description="Severity level: LOW, MODERATE, HIGH, CRITICAL")
    possible_conditions: List[PossibleCondition] = Field(
        ...,
        description="Alternative possible conditions"
    )
    supporting_symptoms: List[str] = Field(
        ...,
        description="Symptoms supporting the prediction"
    )
    recommendations: List[str] = Field(
        ...,
        description="Recommended actions"
    )
    disclaimer: str = Field(
        ...,
        description="Medical disclaimer"
    )
    predicted_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp of prediction"
    )
    image_assessment: Optional[ImageAssessment] = Field(
        None,
        description="Image analysis results if provided"
    )


class ModelInfo(BaseModel):
    name: str = Field(..., description="Model name")
    version: str = Field(..., description="Model version")
    status: str = Field(..., description="Model status")
    is_simulated: bool = Field(..., description="Whether model is simulated")


class HealthResponse(BaseModel):
    status: str = Field(..., description="Service health status")
    provider: str = Field(..., description="Active provider")
    model_status: str = Field(..., description="Model status")
