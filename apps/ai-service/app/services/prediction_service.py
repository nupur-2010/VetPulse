from typing import Optional
from ..config import settings
from ..schemas.prediction import PredictionRequest, PredictionResponse, ModelInfo, HealthResponse
from ..providers.mock_provider import MockPredictionProvider
from ..providers.model_provider import ModelPredictionProvider
from ..providers.base_provider import BasePredictionProvider


class PredictionService:
    """Factory and service layer for prediction providers."""

    def __init__(self):
        self._provider: Optional[BasePredictionProvider] = None
        self._initialize_provider()

    def _initialize_provider(self):
        """Initialize the appropriate provider based on configuration."""
        provider_type = settings.AI_PROVIDER.lower()

        if provider_type == "mock":
            self._provider = MockPredictionProvider()
        elif provider_type == "model":
            model_provider = ModelPredictionProvider()
            # In production, we would check if model is actually loaded
            # For now, we'll raise an error if someone tries to use model mode
            if not model_provider._loaded:
                raise ValueError(
                    f"AI_PROVIDER is set to 'model' but no model is loaded. "
                    f"Please ensure MODEL_PATH is set correctly and a valid model exists at that path. "
                    f"Currently using MOCK mode. Set AI_PROVIDER=mock to use mock predictions."
                )
            self._provider = model_provider
        else:
            raise ValueError(f"Unknown AI_PROVIDER: {provider_type}. Use 'mock' or 'model'.")

    @property
    def provider(self) -> BasePredictionProvider:
        """Get the current provider."""
        return self._provider

    async def predict(self, request: PredictionRequest) -> PredictionResponse:
        """Make a prediction using the configured provider."""
        return await self._provider.predict(request)

    async def health(self) -> HealthResponse:
        """Get health status."""
        health_data = await self._provider.health()
        return HealthResponse(
            status=health_data.get("status", "UNKNOWN"),
            provider=health_data.get("provider", "unknown"),
            model_status=health_data.get("model_status", "UNKNOWN"),
        )

    async def model_info(self) -> ModelInfo:
        """Get model information."""
        info = await self._provider.model_info()
        return ModelInfo(
            name=info.get("name", "Unknown"),
            version=info.get("version", "0.0.0"),
            status=info.get("status", "UNKNOWN"),
            is_simulated=info.get("is_simulated", True),
        )


# Global service instance
_service: Optional[PredictionService] = None


def get_prediction_service() -> PredictionService:
    """Get or create the global prediction service instance."""
    global _service
    if _service is None:
        _service = PredictionService()
    return _service
