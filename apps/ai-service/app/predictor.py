"""Late-fusion inference for the VetPulse cattle disease models."""

from __future__ import annotations

import base64
import io
import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import httpx
import joblib
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

from .calibration import apply_temperature, decide_confidence
from .config import settings
from .constants import (
    BRD_INDEX,
    CLASSES,
    DEFAULT_SEVERITY,
    DISCLAIMER,
    IMAGE_CLASS_DIRS,
    IMAGE_CLASSES,
    MASTITIS_INDEX,
    RECOMMENDATIONS,
    SEVERITY_TO_INT,
)
from .features import (
    FEATURE_NAMES,
    build_feature_dict,
    canonicalize_symptoms,
    feature_name_for_symptom,
    parse_duration_days,
    parse_severity,
)
from .schemas.prediction import (
    ImageAssessment,
    PossibleCondition,
    PredictionRequest,
    PredictionResponse,
)

logger = logging.getLogger(__name__)

_DIR_TO_CLASS = {directory: name for name, directory in IMAGE_CLASS_DIRS.items()}
_DEFAULT_MEAN = [0.485, 0.456, 0.406]
_DEFAULT_STD = [0.229, 0.224, 0.225]

# Safe defaults used when models/calibration.json is absent.
_DEFAULT_CALIBRATION = {
    "vision": {"temperature": 1.0, "min_confidence": 0.70},
    "symptom": {"temperature": 1.0, "min_confidence": 0.60},
    "fusion": {"min_confidence": 0.60},
    "policy": {
        "margin_min": 0.10,
        "alpha_insufficient": 0.65,
        "alpha_disagreement": 0.50,
        "alpha_margin": 0.40,
        "alpha_lowprob": 0.30,
    },
}


def _normalize(probabilities: np.ndarray) -> np.ndarray:
    probabilities = np.clip(np.asarray(probabilities, dtype=np.float64), 0.0, None)
    total = float(probabilities.sum())
    if total <= 0:
        return np.full(len(probabilities), 1.0 / len(probabilities))
    return probabilities / total


def _pick_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


class Predictor:
    """Loads both models once and serves aligned 5-class predictions."""

    def __init__(self) -> None:
        self.device = _pick_device()
        self.symptom_model = None
        self.symptom_artifact: Optional[dict] = None
        self.vision_model: Optional[nn.Module] = None
        self.vision_checkpoint: Optional[dict] = None
        self.vision_checkpoint_classes: List[str] = []
        self.feature_names: List[str] = list(FEATURE_NAMES)
        self.transform = None
        self.symptom_ready = False
        self.vision_ready = False
        self.load_error: Optional[str] = None
        self.calibration: dict = dict(_DEFAULT_CALIBRATION)

    @property
    def ready(self) -> bool:
        return self.symptom_ready or self.vision_ready

    def load(self) -> None:
        self._load_symptom_model()
        self._load_vision_model()
        self._load_calibration()
        if not self.ready:
            self.load_error = (
                "No model artifacts loaded. Run scripts/train_tabular.py and "
                "scripts/train_vision.py first."
            )
            logger.error(self.load_error)
        else:
            logger.info(
                "Predictor ready (symptom=%s, vision=%s, device=%s)",
                self.symptom_ready,
                self.vision_ready,
                self.device,
            )

    def _load_symptom_model(self) -> None:
        path = settings.model_dir / "symptom_model.joblib"
        if not path.exists():
            logger.warning("Symptom model not found at %s", path)
            return
        try:
            artifact = joblib.load(path)
            self.symptom_artifact = artifact
            self.symptom_model = artifact["model"]
            self.feature_names = list(artifact.get("feature_names", FEATURE_NAMES))
            self.symptom_ready = True
            logger.info(
                "Loaded symptom model (val_accuracy=%.4f)",
                float(artifact.get("val_accuracy", 0.0)),
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("Failed to load symptom model: %s", exc)

    def _load_vision_model(self) -> None:
        path = settings.model_dir / "cattle_vision.pth"
        if not path.exists():
            logger.warning("Vision checkpoint not found at %s", path)
            return
        try:
            checkpoint = torch.load(path, map_location="cpu", weights_only=False)
            classes = list(checkpoint.get("classes", []))
            model = models.mobilenet_v3_small(weights=None)
            model.classifier[3] = nn.Linear(model.classifier[3].in_features, len(classes))
            model.load_state_dict(checkpoint["state_dict"])
            model.to(self.device)
            model.eval()

            mean = checkpoint.get("mean", _DEFAULT_MEAN)
            std = checkpoint.get("std", _DEFAULT_STD)
            size = int(checkpoint.get("input_size", 224))
            self.transform = transforms.Compose(
                [
                    transforms.Resize((size, size)),
                    transforms.ToTensor(),
                    transforms.Normalize(mean, std),
                ]
            )
            self.vision_model = model
            self.vision_checkpoint = checkpoint
            self.vision_checkpoint_classes = classes
            self.vision_ready = True
            logger.info(
                "Loaded vision model (%s classes, val_accuracy=%.4f)",
                len(classes),
                float(checkpoint.get("val_accuracy", 0.0)),
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("Failed to load vision model: %s", exc)

    def _load_calibration(self) -> None:
        path = settings.model_dir / "calibration.json"
        if not path.exists():
            logger.info("No calibration.json found; using safe defaults")
            return
        try:
            with path.open("r", encoding="utf-8") as handle:
                loaded = json.load(handle)
            for branch in ("vision", "symptom", "fusion", "policy"):
                if isinstance(loaded.get(branch), dict):
                    self.calibration.setdefault(branch, {})
                    self.calibration[branch].update(loaded[branch])
            logger.info(
                "Loaded calibration (vision T=%.3f, symptom T=%.3f)",
                self._calibration_value("vision", "temperature", 1.0),
                self._calibration_value("symptom", "temperature", 1.0),
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Could not load calibration.json (%s); using defaults", exc)

    def _calibration_value(self, branch: str, key: str, default: float) -> float:
        try:
            return float(self.calibration.get(branch, {}).get(key, default))
        except (TypeError, ValueError):
            return float(default)

    # ------------------------------------------------------------------ images
    def _load_one_image(self, ref: str) -> Image.Image:
        ref = str(ref).strip()
        if ref.startswith("data:image"):
            _header, encoded = ref.split(",", 1)
            return Image.open(io.BytesIO(base64.b64decode(encoded))).convert("RGB")

        if ref.startswith(("http://", "https://")):
            try:
                with httpx.Client(
                    timeout=settings.IMAGE_TIMEOUT, follow_redirects=True
                ) as client:
                    response = client.get(ref)
                    response.raise_for_status()
                    return Image.open(io.BytesIO(response.content)).convert("RGB")
            except Exception as exc:
                logger.warning("Could not download image %s (%s); trying local copy", ref, exc)

        path = Path(ref)
        candidates: List[Path] = [path]
        if not path.is_absolute():
            candidates.extend(
                [
                    settings.upload_dir / ref,
                    settings.data_dir / ref,
                    settings.model_dir.parent / ref,
                ]
            )
        if path.name:
            candidates.append(settings.upload_dir / path.name)
        if ref.startswith("/uploads/"):
            candidates.append(settings.upload_dir / Path(ref).name)

        for candidate in candidates:
            if candidate.exists() and candidate.is_file():
                return Image.open(candidate).convert("RGB")
        raise FileNotFoundError(f"Image not found: {ref}")

    def _resolve_images(self, refs: List[str]) -> List[Image.Image]:
        images: List[Image.Image] = []
        for ref in refs[: settings.MAX_IMAGES]:
            try:
                images.append(self._load_one_image(ref))
            except Exception as exc:
                logger.warning("Skipping image %s: %s", ref, exc)
        return images

    # --------------------------------------------------------------- inference
    def _symptom_probabilities(
        self,
        symptoms: List[str],
        temperature: Optional[float],
        duration_days: float,
        severity: str,
    ) -> np.ndarray:
        row = build_feature_dict(symptoms, temperature, duration_days, severity)
        vector = np.array(
            [[float(row.get(name, 0.0)) for name in self.feature_names]], dtype=np.float32
        )
        raw = np.asarray(self.symptom_model.predict_proba(vector))[0]
        probabilities = np.zeros(len(CLASSES), dtype=np.float64)
        for column, class_index in enumerate(self.symptom_model.classes_):
            index = int(class_index)
            if 0 <= index < len(probabilities):
                probabilities[index] = float(raw[column])
        probabilities = _normalize(probabilities)
        return apply_temperature(
            probabilities, self._calibration_value("symptom", "temperature", 1.0)
        )

    def _canonical_vision_class(self, name: str) -> Optional[str]:
        if name in CLASSES:
            return name
        if name in _DIR_TO_CLASS:
            return _DIR_TO_CLASS[name]
        normalized = name.replace("_", " ").strip()
        for candidate in IMAGE_CLASSES:
            if candidate.lower() == normalized.lower():
                return candidate
        return None

    def _vision_probabilities(
        self, images: List[Image.Image]
    ) -> Tuple[np.ndarray, str, float]:
        tensors = [self.transform(image) for image in images]
        batch = torch.stack(tensors).to(self.device)
        with torch.inference_mode():
            logits = self.vision_model(batch)
            raw_probabilities = torch.softmax(logits, dim=1).mean(dim=0).cpu().numpy()
        probabilities = apply_temperature(
            raw_probabilities, self._calibration_value("vision", "temperature", 1.0)
        )

        five_class = np.zeros(len(CLASSES), dtype=np.float64)
        for index, checkpoint_class in enumerate(self.vision_checkpoint_classes):
            canonical = self._canonical_vision_class(checkpoint_class)
            if canonical is not None and canonical in CLASSES:
                five_class[CLASSES.index(canonical)] += float(probabilities[index])

        # BRD and Mastitis have no image class: keep them at zero so the
        # tabular branch drives them.
        five_class[BRD_INDEX] = 0.0
        five_class[MASTITIS_INDEX] = 0.0
        five_class = _normalize(five_class)

        vision_only = [
            (canonical, float(probabilities[index]))
            for index, checkpoint_class in enumerate(self.vision_checkpoint_classes)
            if (canonical := self._canonical_vision_class(checkpoint_class)) is not None
        ]
        top_class, top_confidence = max(vision_only, key=lambda item: item[1])
        return five_class, top_class, top_confidence

    # ------------------------------------------------------------------ output
    def _severity(self, predicted: str, reported: Optional[str]) -> str:
        if predicted == "Healthy":
            return "mild"
        severity = DEFAULT_SEVERITY[predicted]
        if reported and SEVERITY_TO_INT[reported] > SEVERITY_TO_INT[severity]:
            severity = reported
        return severity

    def _top_factors(
        self,
        symptoms: List[str],
        temperature: Optional[float],
        duration_days: float,
        severity: Optional[str],
        image_used: bool,
        vision_class: Optional[str],
        vision_confidence: float,
    ) -> List[str]:
        importances: Dict[str, float] = {}
        if self.symptom_artifact:
            importances = self.symptom_artifact.get("feature_importances", {})

        scored: List[Tuple[float, str]] = []
        for symptom in symptoms:
            score = float(importances.get(feature_name_for_symptom(symptom), 0.05))
            scored.append((score, symptom))

        if temperature is not None:
            score = float(importances.get("temperature", 0.05)) * (1.0 + abs(temperature - 38.5))
            scored.append((score, f"Body temperature {temperature:.1f}°C"))

        if duration_days > 0:
            score = float(importances.get("duration_days", 0.05)) * min(duration_days, 14.0) / 5.0
            scored.append((score, f"Symptom duration {duration_days:.0f} days"))

        if severity:
            scored.append(
                (float(importances.get("severity", 0.03)), f"Reported severity: {severity}")
            )

        if image_used and vision_class:
            scored.append(
                (
                    0.30 + vision_confidence,
                    f"Image findings consistent with {vision_class} "
                    f"({vision_confidence * 100:.1f}% vision confidence)",
                )
            )

        scored.sort(key=lambda item: item[0], reverse=True)
        factors: List[str] = []
        for _score, text in scored:
            if text not in factors:
                factors.append(text)
            if len(factors) >= 5:
                break
        return factors or ["No significant symptoms or image findings"]

    def predict(self, request: PredictionRequest) -> PredictionResponse:
        if not self.ready:
            raise RuntimeError(self.load_error or "Models are not loaded")

        symptoms, _unknown = canonicalize_symptoms(request.symptoms)
        duration_days = parse_duration_days(request.duration, request.duration_label())
        reported_severity = parse_severity(request.severity) if request.severity else None
        effective_severity = reported_severity or "moderate"

        images = self._resolve_images(request.all_image_refs()) if self.vision_ready else []
        used_image = bool(images)
        used_symptoms = bool(
            self.symptom_ready
            and (
                symptoms
                or request.temperature is not None
                or duration_days > 0
            )
        )

        if not used_image and not used_symptoms:
            raise ValueError(
                "Provide at least one symptom, temperature, duration or a valid image."
            )

        symptom_probs = None
        vision_probs = None
        vision_class = None
        vision_confidence = 0.0

        if used_symptoms:
            symptom_probs = self._symptom_probabilities(
                symptoms, request.temperature, duration_days, effective_severity
            )
        if used_image:
            vision_probs, vision_class, vision_confidence = self._vision_probabilities(images)

        fusion_weights: Optional[Dict[str, float]] = None
        if used_symptoms and used_image:
            final = (
                settings.VISION_WEIGHT * vision_probs
                + settings.SYMPTOM_WEIGHT * symptom_probs
            )
            fusion_weights = {
                "vision": settings.VISION_WEIGHT,
                "symptoms": settings.SYMPTOM_WEIGHT,
            }
            provider = "local-fusion"
        elif used_symptoms:
            final = symptom_probs
            provider = "local-tabular"
        else:
            final = vision_probs
            provider = "local-vision"

        final = _normalize(final)

        # ------------------------------------------------ evidence sufficiency
        evidence_count = len(symptoms)
        if request.temperature is not None:
            evidence_count += 1
        if duration_days > 0:
            evidence_count += 1
        if used_image:
            evidence_count += 1

        if used_image:
            # An uploaded photo is an independent, high-information signal.
            evidence_ok = True
        else:
            symptom_count = len(symptoms)
            temperature_value = request.temperature
            if symptom_count >= 2:
                evidence_ok = True
            elif symptom_count == 1:
                # One sign plus an abnormal temperature is meaningful; one sign
                # with a normal temperature (or nothing else) is not.
                evidence_ok = temperature_value is not None and (
                    temperature_value >= 39.3 or temperature_value <= 37.5
                )
            elif temperature_value is not None:
                # A normal temperature with no signs is a valid wellness check;
                # an isolated fever is ambiguous and must not look certain.
                evidence_ok = 37.0 <= temperature_value < 39.3
            else:
                evidence_ok = False

        branch_disagreement = False
        if (
            used_image
            and used_symptoms
            and symptom_probs is not None
            and vision_probs is not None
        ):
            vision_top = int(np.argmax(vision_probs))
            symptom_top = int(np.argmax(symptom_probs))
            # Only penalise disagreement on classes the vision model can see.
            # It cannot detect Mastitis/BRD, so those never count as conflict.
            if (
                CLASSES[symptom_top] in IMAGE_CLASSES
                and vision_top != symptom_top
                and float(vision_probs[vision_top]) >= 0.5
                and float(symptom_probs[symptom_top]) >= 0.5
            ):
                branch_disagreement = True

        if used_image and used_symptoms:
            min_confidence = self._calibration_value("fusion", "min_confidence", 0.60)
        elif used_symptoms:
            min_confidence = self._calibration_value("symptom", "min_confidence", 0.60)
        else:
            min_confidence = self._calibration_value("vision", "min_confidence", 0.70)

        policy = self.calibration.get("policy", {})
        if not isinstance(policy, dict):
            policy = {}

        # The vision branch structurally cannot output BRD/Mastitis, so a
        # low-confidence image-only result is shrunk within the classes it can
        # actually see (keeps those probabilities at exactly zero).
        support = None
        if used_image and not used_symptoms:
            support = np.array([name in IMAGE_CLASSES for name in CLASSES], dtype=bool)
            high_threshold, high_margin = 0.95, 0.50
        else:
            high_threshold, high_margin = 0.90, 0.30

        adjusted, decision = decide_confidence(
            final,
            min_confidence=min_confidence,
            margin_min=float(policy.get("margin_min", 0.10)),
            evidence_ok=evidence_ok,
            branch_disagreement=branch_disagreement,
            support=support,
            alpha_insufficient=float(policy.get("alpha_insufficient", 0.65)),
            alpha_disagreement=float(policy.get("alpha_disagreement", 0.50)),
            alpha_margin=float(policy.get("alpha_margin", 0.40)),
            alpha_lowprob=float(policy.get("alpha_lowprob", 0.30)),
            high_threshold=high_threshold,
            high_margin=high_margin,
        )

        predicted_index = int(np.argmax(adjusted))
        predicted_disease = CLASSES[predicted_index]
        confidence = round(float(adjusted[predicted_index]) * 100.0, 2)

        class_probabilities = {
            name: round(float(adjusted[index]) * 100.0, 2)
            for index, name in enumerate(CLASSES)
        }
        ranked = sorted(
            ((name, float(adjusted[index])) for index, name in enumerate(CLASSES)),
            key=lambda item: item[1],
            reverse=True,
        )
        possible_conditions = [
            PossibleCondition(disease=name, confidence=round(value, 4))
            for name, value in ranked[:3]
        ]

        confidence_reasons = []
        if not evidence_ok:
            confidence_reasons.append("too few independent signals")
        if branch_disagreement:
            confidence_reasons.append("the image and symptom branches disagree")
        if decision.margin < float(policy.get("margin_min", 0.10)):
            confidence_reasons.append("the top two conditions are close")
        if float(np.max(adjusted)) < min_confidence:
            confidence_reasons.append("the calibrated probability is low")

        confidence_note = None
        if decision.is_low_confidence:
            detail = "; ".join(
                dict.fromkeys(confidence_reasons)
            ) or "the evidence is limited"
            confidence_note = (
                f"Low confidence ({detail}). Collect more symptoms, upload a clearer "
                "photo of the affected area, or have a veterinarian examine the animal."
            )

        severity = self._severity(predicted_disease, reported_severity)
        top_factors = self._top_factors(
            symptoms,
            request.temperature,
            duration_days,
            reported_severity,
            used_image,
            vision_class,
            vision_confidence,
        )

        supporting = symptoms[:5]
        if used_image and vision_class and vision_class not in supporting:
            supporting = supporting + [f"Image: {vision_class}"]

        image_assessment = None
        if used_image:
            image_assessment = ImageAssessment(
                status="analyzed",
                note=f"Analyzed {len(images)} image(s) with the trained vision model.",
                predicted_class=vision_class,
                confidence=round(vision_confidence * 100.0, 2),
            )

        recommendations = list(RECOMMENDATIONS[predicted_disease])
        if confidence_note:
            recommendations.append(confidence_note)

        return PredictionResponse(
            prediction_id=str(uuid.uuid4()),
            provider=provider,
            model_status="LOADED",
            predicted_disease=predicted_disease,
            confidence=confidence,
            class_probabilities=class_probabilities,
            top_contributing_factors=top_factors,
            severity=severity,
            possible_conditions=possible_conditions,
            supporting_symptoms=supporting,
            recommendations=recommendations,
            disclaimer=DISCLAIMER,
            predicted_at=datetime.utcnow(),
            image_assessment=image_assessment,
            used_image=used_image,
            used_symptoms=used_symptoms,
            fusion_weights=fusion_weights,
            calibration_applied=True,
            confidence_band=decision.band,
            is_low_confidence=decision.is_low_confidence,
            requires_vet_review=(
                decision.requires_vet_review or predicted_disease != "Healthy"
            ),
            inconclusive=decision.inconclusive,
            top2_margin=decision.margin,
            evidence_count=evidence_count,
            unrecognized_symptoms=list(_unknown),
            confidence_note=confidence_note,
        )

    def info(self) -> dict:
        version = "1.0.0"
        if self.symptom_artifact:
            version = str(self.symptom_artifact.get("version", version))
        return {
            "name": "VetPulse Local Late-Fusion Disease Model",
            "version": version,
            "status": "LOADED" if self.ready else "NOT_LOADED",
            "classes": CLASSES,
            "image_classes": IMAGE_CLASSES,
            "symptom_model_loaded": self.symptom_ready,
            "vision_model_loaded": self.vision_ready,
            "device": str(self.device),
            "symptom_val_accuracy": (
                float(self.symptom_artifact.get("val_accuracy", 0.0))
                if self.symptom_artifact
                else None
            ),
            "vision_val_accuracy": (
                float(self.vision_checkpoint.get("val_accuracy", 0.0))
                if self.vision_checkpoint
                else None
            ),
            "calibration": {
                "vision_temperature": self._calibration_value(
                    "vision", "temperature", 1.0
                ),
                "vision_min_confidence": self._calibration_value(
                    "vision", "min_confidence", 0.70
                ),
                "symptom_temperature": self._calibration_value(
                    "symptom", "temperature", 1.0
                ),
                "symptom_min_confidence": self._calibration_value(
                    "symptom", "min_confidence", 0.60
                ),
                "fusion_min_confidence": self._calibration_value(
                    "fusion", "min_confidence", 0.60
                ),
            },
        }


_predictor: Optional[Predictor] = None


def get_predictor() -> Predictor:
    global _predictor
    if _predictor is None:
        _predictor = Predictor()
        _predictor.load()
    return _predictor
