import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .predictor import get_predictor
from .schemas.prediction import (
    HealthResponse,
    ModelInfo,
    PredictionRequest,
    PredictionResponse,
)
from .services.prediction_service import get_prediction_service
from .utils.validation import validate_prediction_request

logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting VetPulse AI service (provider=%s)", settings.AI_PROVIDER)
    predictor = get_predictor()
    if not predictor.ready:
        logger.error("No model artifacts loaded; /predict will return 503")
    service = get_prediction_service()
    app.state.predictor = predictor
    app.state.prediction_service = service
    logger.info("Prediction service ready: %s", service.provider.provider_name)
    yield
    logger.info("Shutting down VetPulse AI service")


app = FastAPI(
    title="VetPulse AI Service",
    description="Locally trained tabular + vision cattle disease prediction",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    service = get_prediction_service()
    return await service.health()


@app.get("/model-info", response_model=ModelInfo, tags=["model"])
async def model_info():
    service = get_prediction_service()
    return await service.model_info()


async def _run_prediction(request: PredictionRequest) -> PredictionResponse:
    valid, message = validate_prediction_request(request)
    if not valid:
        raise HTTPException(status_code=400, detail=message)

    service = get_prediction_service()
    try:
        return await service.predict(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Prediction error")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/predict", response_model=PredictionResponse, tags=["prediction"])
async def predict(request: PredictionRequest):
    return await _run_prediction(request)


@app.post("/assess", response_model=PredictionResponse, tags=["prediction"])
async def assess(request: PredictionRequest):
    """Alias used by clients that call the route 'assessment'."""
    return await _run_prediction(request)
