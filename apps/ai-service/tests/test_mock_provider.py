import pytest
from datetime import datetime
from app.schemas.prediction import PredictionRequest, PossibleCondition, ImageAssessment
from app.providers.mock_provider import MockPredictionProvider


@pytest.fixture
def provider():
    return MockPredictionProvider()


@pytest.fixture
def fmd_request():
    return PredictionRequest(
        symptoms=["fever", "excessive_salivation", "mouth_ulcers"],
        temperature=41.0,
        duration=3,
        animal_info={"species": "cattle", "breed": "Fresian"},
        image_refs=None,
    )


@pytest.fixture
def healthy_request():
    return PredictionRequest(
        symptoms=["normal", "healthy", "active"],
        temperature=38.0,
        duration=1,
        animal_info={"species": "cattle"},
        image_refs=None,
    )


@pytest.fixture
def insufficient_request():
    return PredictionRequest(
        symptoms=["fever"],
        temperature=None,
        duration=None,
        animal_info=None,
        image_refs=None,
    )


@pytest.mark.asyncio
async def test_provider_initialization(provider):
    assert provider.provider_name == "mock"
    assert provider.model_status == "MOCK"
    assert provider.model_version == "1.0.0-mock"


@pytest.mark.asyncio
async def test_health(provider):
    health = await provider.health()
    assert health["status"] == "HEALTHY"
    assert health["provider"] == "mock"
    assert health["model_status"] == "MOCK"


@pytest.mark.asyncio
async def test_model_info(provider):
    info = await provider.model_info()
    assert info["name"] == "Mock Cattle Disease Detection Model"
    assert info["version"] == "1.0.0-mock"
    assert info["status"] == "MOCK"
    assert info["is_simulated"] is True


@pytest.mark.asyncio
async def test_fmd_prediction(provider, fmd_request):
    result = await provider.predict(fmd_request)
    assert result.provider == "mock"
    assert result.model_status == "MOCK"
    assert result.is_simulated is True
    assert "Foot-and-Mouth" in result.predicted_disease or result.predicted_disease == "Uncertain Prediction"
    assert result.confidence >= 0.0
    assert result.prediction_id is not None
    assert len(result.recommendations) > 0
    assert "ISOLATE" in result.recommendations[0] or "consult" in result.recommendations[0].lower()
    assert "simulation" in result.disclaimer.lower()


@pytest.mark.asyncio
async def test_healthy_prediction(provider, healthy_request):
    result = await provider.predict(healthy_request)
    assert result.predicted_disease == "Healthy"
    assert result.severity == "LOW"
    assert result.confidence >= 0.90


@pytest.mark.asyncio
async def test_insufficient_info(provider, insufficient_request):
    result = await provider.predict(insufficient_request)
    assert result.severity == "UNKNOWN"


@pytest.mark.asyncio
async def test_prediction_id_unique(provider, fmd_request, healthy_request):
    result1 = await provider.predict(fmd_request)
    result2 = await provider.predict(healthy_request)
    assert result1.prediction_id != result2.prediction_id


@pytest.mark.asyncio
async def test_possible_conditions_returned(provider, fmd_request):
    result = await provider.predict(fmd_request)
    assert len(result.possible_conditions) > 0
    for condition in result.possible_conditions:
        assert condition.confidence >= 0.0
        assert condition.confidence <= 1.0
        assert len(condition.disease) > 0


@pytest.mark.asyncio
async def test_bovine_respiratory_disease(provider):
    request = PredictionRequest(
        symptoms=["cough", "nasal_discharge", "difficulty_breathing", "fever"],
        temperature=40.5,
        duration=4,
    )
    result = await provider.predict(request)
    assert "respiratory" in result.predicted_disease.lower() or "BRD" in result.predicted_disease


@pytest.mark.asyncio
async def test_mastitis(provider):
    request = PredictionRequest(
        symptoms=["swollen_udder", "abnormal_milk", "pain_during_milking"],
        temperature=39.5,
        duration=2,
    )
    result = await provider.predict(request)
    assert "mastitis" in result.predicted_disease.lower() or result.severity == "UNKNOWN"


@pytest.mark.asyncio
async def test_uncertain_prediction(provider):
    request = PredictionRequest(
        symptoms=["random_symptom", "unknown_sign"],
        temperature=37.5,
        duration=1,
    )
    result = await provider.predict(request)
    assert result.severity == "UNKNOWN"


@pytest.mark.asyncio
async def test_normalize_symptom(provider):
    assert provider._normalize_symptom("Fever") == "fever"
    assert provider._normalize_symptom("excessive-salivation") == "excessive_salivation"
    assert provider._normalize_symptom("  COUGH  ") == "cough"
