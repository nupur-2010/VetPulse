import pytest

from app.constants import CLASSES
from app.predictor import get_predictor
from app.schemas.prediction import PredictionRequest

IMAGE_PATH = "data/images/val/Lumpy_Skin_Disease/Lumpy_Skin_Disease_00000.jpg"


@pytest.fixture(scope="module")
def predictor():
    return get_predictor()


def test_models_loaded(predictor):
    assert predictor.ready
    assert predictor.symptom_ready
    assert predictor.vision_ready


def test_fmd_symptom_only(predictor):
    result = predictor.predict(
        PredictionRequest(
            symptoms=["Fever", "Mouth ulcers", "Excessive salivation", "Difficulty standing"],
            temperature=40.5,
            symptom_duration="4-7 days",
            severity="severe",
        )
    )
    assert result.predicted_disease == "Foot and Mouth Disease"
    assert 0 <= result.confidence <= 100
    assert set(result.class_probabilities) == set(CLASSES)
    assert abs(sum(result.class_probabilities.values()) - 100.0) < 0.5
    assert "is_simulated" not in result.model_dump()
    assert result.used_symptoms and not result.used_image
    assert result.top_contributing_factors


def test_healthy_symptom_only(predictor):
    result = predictor.predict(
        PredictionRequest(symptoms=[], temperature=38.5, severity="mild")
    )
    assert result.predicted_disease == "Healthy"
    assert result.severity == "mild"


def test_mastitis(predictor):
    result = predictor.predict(
        PredictionRequest(
            symptoms=["Swollen udder", "Pain during milking", "Abnormal milk", "Fever"],
            temperature=39.6,
            duration=3,
            severity="moderate",
        )
    )
    assert result.predicted_disease == "Mastitis"


def test_brd(predictor):
    result = predictor.predict(
        PredictionRequest(
            symptoms=["Cough", "Nasal discharge", "Difficulty breathing", "Fever"],
            temperature=40.5,
            duration=4,
            severity="moderate",
        )
    )
    assert result.predicted_disease == "Bovine Respiratory Disease"
    assert result.class_probabilities["Bovine Respiratory Disease"] > 50


def test_fusion_with_image(predictor):
    result = predictor.predict(
        PredictionRequest(
            symptoms=["Skin nodules", "Swelling", "Fever"],
            temperature=40.0,
            severity="severe",
            image_paths=[IMAGE_PATH],
        )
    )
    assert result.used_image and result.used_symptoms
    assert result.fusion_weights == {"vision": 0.6, "symptoms": 0.4}
    assert result.predicted_disease == "Lumpy Skin Disease"
    assert result.image_assessment is not None


def test_image_only(predictor):
    result = predictor.predict(PredictionRequest(image_paths=[IMAGE_PATH]))
    assert result.used_image and not result.used_symptoms
    assert result.predicted_disease == "Lumpy Skin Disease"
    assert result.class_probabilities["Bovine Respiratory Disease"] == 0.0


def test_unknown_symptom_is_ignored(predictor):
    result = predictor.predict(
        PredictionRequest(
            symptoms=["random_symptom", "unknown_sign"],
            temperature=40.5,
            duration=2,
            severity="moderate",
        )
    )
    assert result.predicted_disease in CLASSES


# ---------------------------------------------------------------- reliability


def test_sparse_symptom_is_low_confidence(predictor):
    result = predictor.predict(PredictionRequest(symptoms=["Cough"]))
    assert result.is_low_confidence
    assert result.confidence_band == "low"
    assert result.confidence < 60
    assert result.evidence_count == 1
    assert result.confidence_note
    assert abs(sum(result.class_probabilities.values()) - 100.0) < 0.5


def test_isolated_high_fever_is_low_confidence(predictor):
    result = predictor.predict(
        PredictionRequest(symptoms=[], temperature=40.5)
    )
    assert result.is_low_confidence
    assert result.confidence_band == "low"
    assert result.confidence < 60


def test_full_report_is_high_confidence(predictor):
    result = predictor.predict(
        PredictionRequest(
            symptoms=[
                "Fever",
                "Mouth ulcers",
                "Excessive salivation",
                "Difficulty standing",
            ],
            temperature=40.5,
            duration=4,
            severity="severe",
        )
    )
    assert result.predicted_disease == "Foot and Mouth Disease"
    assert not result.is_low_confidence
    assert result.confidence_band == "high"
    assert result.confidence > 90
    assert result.requires_vet_review


def test_disease_prediction_requires_vet_review(predictor):
    result = predictor.predict(
        PredictionRequest(
            symptoms=[
                "Swollen udder",
                "Pain during milking",
                "Abnormal milk",
                "Fever",
            ],
            temperature=39.6,
            duration=3,
            severity="moderate",
        )
    )
    assert result.predicted_disease == "Mastitis"
    assert result.requires_vet_review
    assert not result.is_low_confidence


def test_image_only_reliable_fields(predictor):
    result = predictor.predict(PredictionRequest(image_paths=[IMAGE_PATH]))
    assert result.confidence_band in {"high", "medium", "low"}
    assert 0 <= result.confidence <= 100
    assert result.calibration_applied
    assert abs(sum(result.class_probabilities.values()) - 100.0) < 0.5
