import asyncio
import logging

from ..predictor import Predictor
from ..schemas.prediction import PredictionRequest, PredictionResponse
from .base_provider import BasePredictionProvider
from .mock_provider import MockPredictionProvider

logger = logging.getLogger(__name__)


class LocalPredictionProvider(BasePredictionProvider):
    """Runs the locally trained tabular + vision late-fusion predictor."""

    def __init__(self, predictor: Predictor):
        self.predictor = predictor
        self.provider_name = "local-fusion"
        self.model_status = "LOADED" if predictor.ready else "FALLBACK_MOCK"
        self.model_version = "1.0.0"
        self._fallback = MockPredictionProvider()

    async def predict(self, request: PredictionRequest) -> PredictionResponse:
        if not self.predictor.ready:
            logger.warning(
                "Local model artifacts not loaded. Serving prediction using rule-based fallback."
            )
            return await self._fallback.predict(request)
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
        if not self.predictor.ready:
            return {
                "name": "VetPulse Cattle Disease Model (Fallback Heuristic)",
                "version": self.model_version,
                "status": "DEGRADED_FALLBACK",
                "ready": True,
            }
        return self.predictor.info()
