"""Probability calibration, confidence shrinking and abstention policy.

The service must never report a falsely high score when the evidence is weak.
This module provides:

* temperature scaling (fit on held-out data) to soften over-confident outputs;
* ECE / Brier helpers for calibration reporting;
* confidence shrinking toward the uniform distribution when evidence is thin,
  the top-2 margin is small, or the branches disagree;
* a confidence band + abstention flags (`is_low_confidence`,
  `requires_vet_review`, `inconclusive`).

Argmax is preserved by uniform shrinking, so the best-guess disease is stable.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

import numpy as np

EPS = 1e-9


def _normalize(probs: np.ndarray) -> np.ndarray:
    probs = np.clip(np.asarray(probs, dtype=np.float64), 0.0, None)
    total = float(probs.sum())
    if total <= 0:
        return np.full(len(probs), 1.0 / len(probs))
    return probs / total


def _logit(probs: np.ndarray) -> np.ndarray:
    return np.log(np.clip(np.asarray(probs, dtype=np.float64), EPS, 1.0))


def softmax(logits: np.ndarray) -> np.ndarray:
    logits = np.asarray(logits, dtype=np.float64)
    logits = logits - np.max(logits, axis=-1, keepdims=True)
    exp = np.exp(logits)
    return exp / np.sum(exp, axis=-1, keepdims=True)


def apply_temperature(probs: np.ndarray, temperature: float) -> np.ndarray:
    """Temperature-scale a probability vector (T>1 softens, T<1 sharpens)."""
    temperature = max(float(temperature), 1e-3)
    probs = _normalize(probs)
    return softmax(_logit(probs) / temperature)


def negative_log_likelihood(logits: np.ndarray, labels: np.ndarray) -> float:
    logits = np.asarray(logits, dtype=np.float64)
    logits = logits - np.max(logits, axis=1, keepdims=True)
    logsumexp = np.log(np.sum(np.exp(logits), axis=1, keepdims=True))
    log_probs = logits - logsumexp
    return float(-log_probs[np.arange(len(labels)), labels].mean())


def fit_temperature(
    logits: np.ndarray,
    labels: np.ndarray,
    bounds: tuple[float, float] = (1.0, 8.0),
) -> float:
    """Fit a single temperature by minimising NLL. Clamped to >=1 (soften only)."""
    from scipy.optimize import minimize_scalar

    logits = np.asarray(logits, dtype=np.float64)
    labels = np.asarray(labels)

    def objective(log_t: float) -> float:
        temperature = math.exp(log_t)
        return negative_log_likelihood(logits / temperature, labels)

    result = minimize_scalar(
        objective,
        bounds=(math.log(bounds[0]), math.log(bounds[1])),
        method="bounded",
    )
    return float(math.exp(result.x))


def expected_calibration_error(
    probs: np.ndarray, labels: np.ndarray, n_bins: int = 10
) -> float:
    probs = np.asarray(probs, dtype=np.float64)
    labels = np.asarray(labels)
    confidence = probs.max(axis=1)
    predictions = probs.argmax(axis=1)
    correct = (predictions == labels).astype(np.float64)

    bins = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    for index in range(n_bins):
        low, high = bins[index], bins[index + 1]
        if index == 0:
            mask = (confidence >= low) & (confidence <= high)
        else:
            mask = (confidence > low) & (confidence <= high)
        if not mask.any():
            continue
        ece += float(mask.mean()) * abs(
            float(correct[mask].mean()) - float(confidence[mask].mean())
        )
    return ece


def brier_score(probs: np.ndarray, labels: np.ndarray) -> float:
    probs = np.asarray(probs, dtype=np.float64)
    labels = np.asarray(labels)
    onehot = np.zeros_like(probs)
    onehot[np.arange(len(labels)), labels] = 1.0
    return float(np.mean(np.sum((probs - onehot) ** 2, axis=1)))


def select_confidence_threshold(
    probs: np.ndarray,
    labels: np.ndarray,
    target_accuracy: float = 0.97,
    min_coverage: float = 0.30,
    default: float = 0.70,
) -> dict:
    """Lowest threshold whose selective accuracy meets ``target_accuracy``."""
    probs = np.asarray(probs, dtype=np.float64)
    labels = np.asarray(labels)
    confidence = probs.max(axis=1)
    predictions = probs.argmax(axis=1)
    correct = predictions == labels

    best: Optional[float] = None
    for threshold in np.linspace(0.30, 0.995, 140):
        mask = confidence >= threshold
        coverage = float(mask.mean())
        if coverage < min_coverage:
            continue
        accuracy = float(correct[mask].mean()) if mask.any() else 0.0
        if accuracy >= target_accuracy:
            best = float(threshold)
            break

    chosen = best if best is not None else default
    mask = confidence >= chosen
    return {
        "threshold": round(chosen, 4),
        "coverage": round(float(mask.mean()), 4),
        "selective_accuracy": (
            round(float(correct[mask].mean()), 4) if mask.any() else 0.0
        ),
    }


def shrink_toward_uniform(
    probs: np.ndarray, alpha: float, support: Optional[np.ndarray] = None
) -> np.ndarray:
    """Blend with the uniform distribution. Preserves argmax.

    ``alpha`` in [0, 1]: 0 = unchanged, 1 = fully uniform.  When ``support`` is
    a boolean mask, shrinking happens only inside the supported classes (used
    for the vision branch, which structurally cannot output BRD/Mastitis).
    """
    probs = _normalize(probs)
    alpha = float(min(max(alpha, 0.0), 0.95))
    if alpha <= 0.0:
        return probs

    if support is None:
        uniform = np.full(len(probs), 1.0 / len(probs))
        return _normalize((1.0 - alpha) * probs + alpha * uniform)

    support = np.asarray(support, dtype=bool)
    if support.shape != probs.shape or not support.any():
        uniform = np.full(len(probs), 1.0 / len(probs))
        return _normalize((1.0 - alpha) * probs + alpha * uniform)

    mass = float(probs[support].sum())
    within = probs[support] / mass if mass > 0 else np.full(
        int(support.sum()), 1.0 / int(support.sum())
    )
    uniform = np.full(int(support.sum()), 1.0 / int(support.sum()))
    blended = (1.0 - alpha) * within + alpha * uniform
    adjusted = np.zeros_like(probs)
    adjusted[support] = blended
    return _normalize(adjusted)


@dataclass
class ConfidenceDecision:
    band: str
    is_low_confidence: bool
    requires_vet_review: bool
    inconclusive: bool
    margin: float
    entropy: float
    alpha: float


def decide_confidence(
    probs: np.ndarray,
    *,
    min_confidence: float,
    margin_min: float = 0.10,
    evidence_ok: bool = True,
    branch_disagreement: bool = False,
    support: Optional[np.ndarray] = None,
    alpha_insufficient: float = 0.65,
    alpha_disagreement: float = 0.50,
    alpha_margin: float = 0.40,
    alpha_lowprob: float = 0.30,
    high_threshold: float = 0.80,
    high_margin: float = 0.25,
) -> tuple[np.ndarray, ConfidenceDecision]:
    """Shrink probabilities and return a confidence decision.

    Returns the adjusted probability vector plus the decision metadata.
    """
    probs = _normalize(probs)
    ordered = np.sort(probs)[::-1]
    top = float(ordered[0])
    second = float(ordered[1]) if len(ordered) > 1 else 0.0
    margin = top - second
    entropy = float(-np.sum(probs * np.log(np.clip(probs, EPS, 1.0))))

    alpha = 0.0
    reasons = []
    if not evidence_ok:
        alpha = max(alpha, alpha_insufficient)
        reasons.append("insufficient evidence")
    if branch_disagreement:
        alpha = max(alpha, alpha_disagreement)
        reasons.append("image/symptom disagreement")
    if margin < margin_min:
        alpha = max(alpha, alpha_margin)
        reasons.append("small top-2 margin")
    if top < min_confidence:
        alpha = max(alpha, alpha_lowprob)
        reasons.append("low top probability")

    adjusted = shrink_toward_uniform(probs, alpha, support=support)
    adjusted_ordered = np.sort(adjusted)[::-1]
    adjusted_top = float(adjusted_ordered[0])
    adjusted_margin = adjusted_top - (
        float(adjusted_ordered[1]) if len(adjusted_ordered) > 1 else 0.0
    )

    low = bool(alpha > 0.0) or adjusted_top < min_confidence
    if low:
        band = "low"
    elif adjusted_top >= high_threshold and adjusted_margin >= high_margin:
        band = "high"
    elif adjusted_top >= 0.60:
        band = "medium"
    else:
        band = "low"
        low = True

    decision = ConfidenceDecision(
        band=band,
        is_low_confidence=low,
        requires_vet_review=low,
        inconclusive=low,
        margin=round(float(adjusted_margin), 4),
        entropy=round(float(entropy), 4),
        alpha=round(float(alpha), 4),
    )
    return adjusted, decision
