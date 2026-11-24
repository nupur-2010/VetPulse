import asyncio

from ..predictor import Predictor
from ..schemas.prediction import PredictionRequest, PredictionResponse
from .base_provider import BasePredictionProvider


class LocalPredictionProvider(BasePredictionProvider):
    """Runs the locally trained tabular + vision late-fusion predictor."""

    def __init__(self, predictor: Predictor):
        self.predictor = predictor
        self.provider_name = "local-fusion"
        self.model_status = "LOADED" if predictor.ready else "NOT_LOADED"
        self.model_version = "1.0.0"

    async def predict(self, request: PredictionRequest) -> PredictionResponse:
        return await asyncio.to_thread(self.predictor.predict, request)

    async def health(self) -> dict:
        return {
            "status": "HEALTHY" if self.predictor.ready else "DEGRADED",
            "provider": self.provider_name,
            "model_status": self.model_status,
            "symptom_model_loaded": self.predictor.symptom_ready,
            "vision_model_loaded": self.predictor.vision_ready,
        }

    async def model_info(self) -> dict:
        return self.predictor.info()
