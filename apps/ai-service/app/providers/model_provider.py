from ..schemas.prediction import PredictionRequest, PredictionResponse, ModelInfo
from .base_provider import BasePredictionProvider


class ModelPredictionProvider(BasePredictionProvider):
    """Placeholder for real model integration."""

    def __init__(self):
        self.provider_name = "model"
        self.model_status = "NOT_CONFIGURED"
        self.model_version = "0.0.0"
        self._loaded = False

    async def predict(self, request: PredictionRequest) -> PredictionResponse:
        raise RuntimeError(
            "No model is loaded. Please configure a valid model path and ensure "
            "AI_PROVIDER is set correctly. Currently running in MOCK mode."
        )

    async def health(self) -> dict:
        return {
            "status": "ERROR",
            "provider": self.provider_name,
            "model_status": self.model_status,
            "error": "No model loaded",
        }

    async def model_info(self) -> dict:
        return {
            "name": "Cattle Disease Detection Model",
            "version": self.model_version,
            "status": self.model_status,
            "is_simulated": False,
            "error": "No model loaded",
        }
