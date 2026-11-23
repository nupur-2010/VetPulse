from abc import ABC, abstractmethod
from ..schemas.prediction import PredictionRequest, PredictionResponse


class BasePredictionProvider(ABC):
    @abstractmethod
    async def predict(self, request: PredictionRequest) -> PredictionResponse:
        raise NotImplementedError

    @abstractmethod
    async def health(self) -> dict:
        raise NotImplementedError

    @abstractmethod
    async def model_info(self) -> dict:
        raise NotImplementedError
