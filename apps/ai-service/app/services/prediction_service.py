from typing import Optional

from ..config import settings
from ..predictor import get_predictor
from ..schemas.prediction import (
    HealthResponse,
    ModelInfo,
    PredictionRequest,
    PredictionResponse,
)
from ..providers.base_provider import BasePredictionProvider
from ..providers.local_provider import LocalPredictionProvider
from ..providers.mock_provider import MockPredictionProvider


class PredictionService:
    """Factory and service layer for prediction providers."""

    def __init__(self):
        self._provider: Optional[BasePredictionProvider] = None
        self._initialize_provider()

    def _initialize_provider(self) -> None:
        provider_type = settings.AI_PROVIDER.lower().strip()

        if provider_type in {"local", "model", "real", "fusion"}:
            predictor = get_predictor()
            self._provider = LocalPredictionProvider(predictor)
        elif provider_type == "mock":
            self._provider = MockPredictionProvider()
        else:
            raise ValueError(
                f"Unknown AI_PROVIDER: {provider_type}. Use 'local' or 'mock'."
            )

    @property
    def provider(self) -> BasePredictionProvider:
        return self._provider

    async def predict(self, request: PredictionRequest) -> PredictionResponse:
        return await self._provider.predict(request)

    async def health(self) -> HealthResponse:
        health_data = await self._provider.health()
        return HealthResponse(
            status=health_data.get("status", "UNKNOWN"),
            provider=health_data.get("provider", "unknown"),
            model_status=health_data.get("model_status", "UNKNOWN"),
            symptom_model_loaded=bool(health_data.get("symptom_model_loaded", False)),
            vision_model_loaded=bool(health_data.get("vision_model_loaded", False)),
        )

    async def model_info(self) -> ModelInfo:
        info = await self._provider.model_info()
        return ModelInfo(
            name=info.get("name", "Unknown"),
            version=info.get("version", "0.0.0"),
            status=info.get("status", "UNKNOWN"),
            classes=info.get("classes", []),
            image_classes=info.get("image_classes", []),
            symptom_model_loaded=bool(info.get("symptom_model_loaded", False)),
            vision_model_loaded=bool(info.get("vision_model_loaded", False)),
            calibration=info.get("calibration"),
        )


_service: Optional[PredictionService] = None


def get_prediction_service() -> PredictionService:
    global _service
    if _service is None:
        _service = PredictionService()
    return _service
