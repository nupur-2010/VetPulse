from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from .config import settings
from .schemas.prediction import PredictionRequest, PredictionResponse, ModelInfo, HealthResponse
from .services.prediction_service import get_prediction_service, PredictionService
from .utils.validation import validate_prediction_request

logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting AI service with provider: {settings.AI_PROVIDER}")
    try:
        service = get_prediction_service()
        logger.info(f"Prediction service initialized: {service}")
    except Exception as e:
        logger.error(f"Failed to initialize prediction service: {e}")
        raise
    yield
    logger.info("Shutting down AI service")


app = FastAPI(
    title="VetPulse AI Service",
    description="Cattle disease prediction service",
    version="1.0.0",
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


@app.post("/predict", response_model=PredictionResponse, tags=["prediction"])
async def predict(request: PredictionRequest):
    valid, msg = validate_prediction_request(request)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    service = get_prediction_service()
    try:
        result = await service.predict(request)
        return result
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
