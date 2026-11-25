# VetPulse AI — Disease Coverage and Evaluation Report

Prepared from the locally trained and evaluated model artifacts in `apps/ai-service/models/`.

- Scope: 5 output classes (Healthy + 4 diseases)
- Inputs: clinical signs, temperature, duration, severity, and optional photos
- Runtime: CPU-only, local inference
- Evaluation date: November 2026

---

## 1. One-slide summary

| Question | Answer |
| --- | --- |
| What does it predict? | **Healthy**, **Foot and Mouth Disease (FMD)**, **Lumpy Skin Disease (LSD)**, **Mastitis**, **Bovine Respiratory Disease (BRD)** |
| Can it use photos? | Yes, for **Healthy / FMD / LSD** only |
| Can it use symptoms only? | Yes, for all 5 classes |
| Symptom inputs | 30 clinical signs + temperature + duration + severity |
| Image inputs | 1–4 photos, plus optional symptoms |
| Fusion | `0.60 × vision + 0.40 × symptoms` when both are present |
| Headline symptom accuracy | **99.43%** on 874 held-out rows (90.7% synthetic) |
| Headline real symptom accuracy | **100%** on 81 real held-out records (FMD, Mastitis, BRD only) |
| Headline vision accuracy | **91.89%** top-1 on 555 real field photos (3 classes) |
| Headline fusion accuracy | **98.93%** on 563 mixed held-out cases; **99.32%** on 147 strict real cases |
| Safety behaviour | Low-confidence results are flagged `inconclusive`; any disease result sets `requires_vet_review=true` |
| Deployment | CPU inference, ~29 ms per image and ~2 ms per symptom-only case |

---

## 2. What it can predict

| Output class | Image model | Symptom model | Notes |
| --- | --- | --- | --- |
| Healthy | Yes | Yes | Normal / no disease class |
| Foot and Mouth Disease | Yes | Yes | Has both real photos and real symptom records |
| Lumpy Skin Disease | Yes | Yes | Real photos; no real symptom-only records, so symptom branch uses synthetic profiles |
| Mastitis | No | Yes | No public RGB dataset; public data is thermal udder imaging / sensor tables |
| Bovine Respiratory Disease | No | Yes | Not a skin/lesion disease; no public RGB dataset |

**Important scope statement:** this is a 5-class screening classifier, not a general cattle-disease detector. Other diseases are outside the label set. An unknown disease may be forced into one of the 5 classes, but the reliability layer should mark weak evidence as low confidence.

### 2.1 Symptom vocabulary (30 signs)

| Group | Symptoms |
| --- | --- |
| General | Fever, Reduced appetite, Weakness, Weight loss, Dehydration, Reduced milk production |
| Skin | Skin nodules, Swelling, Lesions, Wounds, Hair loss |
| Mouth & digestive | Excessive salivation, Mouth ulcers, Difficulty chewing, Diarrhoea, Bloating, Reduced rumination |
| Respiratory | Cough, Nasal discharge, Difficulty breathing, Rapid breathing |
| Udder & reproductive | Swollen udder, Abnormal milk, Pain during milking, Reproductive problems, Abnormal discharge |
| Movement | Lameness, Difficulty standing, Joint swelling, Sudden weakness |

Free-text aliases such as “drooling”, “blisters”, “high fever”, “mastitis-like milk changes”, “lame”, etc. are mapped to these canonical terms.

### 2.2 Other inputs

- Temperature: 35–45 °C
- Duration: days, or UI buckets such as “1 day”, “2–3 days”, “4–7 days”, “1–2 weeks”, “more than 2 weeks”
- Severity: mild, moderate, severe, critical
- Images: 1–4 photos of the affected area

---

## 3. Models and training setup

| Branch | Model | Input | Training / validation | Key settings |
| --- | --- | --- | --- | --- |
| Symptoms | XGBoost | 33 features: 30 symptom flags + temperature + duration + severity | 3,495 train / 874 validation | 400 trees, depth 6, learning rate 0.08, subsample 0.9, colsample 0.9, `multi:softprob`, hist |
| Vision | MobileNetV3-Small | 224 × 224 RGB image | 2,220 train / 555 validation | ImageNet pretrained; 5 epochs head at 1e-3 + 5 epochs fine-tune at 1e-4; AdamW; batch 32 |
| Fusion | Late fusion | Image + symptom probabilities | — | `0.60 × vision + 0.40 × symptoms` when both are present |

Vision training augmentation: RandomResizedCrop (0.8–1.0), horizontal flip, rotation ±12°, colour jitter (brightness/contrast 0.15, saturation 0.1).

Real reference symptom rows are upweighted **2×** during tabular training so that real clinical patterns are not drowned out by synthetic rows.

### 3.1 Calibration and abstention

- Temperature scaling is fitted on real held-out data.
- Fitted temperatures are effectively **1.0** (vision 1.000004, symptom 1.000005), meaning the raw models were already well calibrated; temperature scaling made almost no change.
- The main reliability mechanism is **evidence-aware confidence shrinking plus abstention**.
- When evidence is weak, probabilities are shrunk toward uniform while preserving the argmax. The best-guess disease stays stable, but confidence drops and the result is flagged.

Shrink strengths:

| Trigger | Shrink α | Meaning |
| --- | --- | --- |
| Fewer than 2 independent signals | 0.65 | Sparse report: one symptom, temperature-only, duration-only, etc. |
| Image/symptom disagreement | 0.50 | Branches point to different diseases |
| Top-2 margin < 0.10 | 0.40 | Model is unsure between the top two classes |
| Top probability below branch minimum | 0.30 | Raw confidence is already low |
| No trigger | 0.0 | No extra shrinking |

Confidence bands:

| Band | Rule |
| --- | --- |
| High | Image-only: confidence ≥ 0.95 and margin ≥ 0.50. Symptom/fusion: confidence ≥ 0.90 and margin ≥ 0.30 |
| Medium | Confidence ≥ 0.60 after shrinking and no low-confidence trigger |
| Low | Any low trigger, or final confidence < 0.60 |

Behaviour:

- `predicted_disease` remains the best guess.
- `is_low_confidence` and `inconclusive` carry the abstention signal.
- Any non-Healthy prediction sets `requires_vet_review=true`.
- The UI should treat low-confidence results as “collect more evidence”, not as a confirmed diagnosis.

---

## 4. Data

### 4.1 Provenance

| Dataset | Used for | Licence |
| --- | --- | --- |
| Zenodo 7779246 (FMD Cattle) | FMD + healthy oral/foot photos | CC BY 4.0 |
| Zenodo 11003967 (LSD DataHub) | LSD severity photos, deduplicated | CC BY 4.0 |
| Mendeley `ggpwpscjvm` (FMD-LSD field benchmark) | FMD / healthy / LSD field photos | CC BY 4.0 |
| Hugging Face `scorder96/cattle-disease-prediction` | 93-signal symptom matrix (2,044 rows); 404 real rows map to the VetPulse bovine classes | MIT |

### 4.2 Split summary

| Dataset | Total | Train | Held-out | Composition |
| --- | ---: | ---: | ---: | --- |
| Vision | 2,775 photos | 2,220 | 555 | Healthy 315, FMD 83, LSD 157 in validation |
| Symptoms | 4,369 rows | 3,495 | 874 | 404 real + 3,965 synthetic |
| Real symptom subset | 404 rows | 323 | 81 | FMD 86, Mastitis 99, BRD 219; holdout FMD 17, Mastitis 20, BRD 44 |
| Fusion, mixed | 563 cases | — | 563 | Healthy 120, FMD 83, LSD 120, Mastitis 120, BRD 120; clinically consistent pairs, upper bound |
| Fusion, strict real | 147 cases | — | 81 unique symptom rows | FMD 83 photos paired against 17 held-out FMD rows; Mastitis 20; BRD 44 |
| Fusion, full real | 302 cases | includes training rows | not held out | FMD 83, Mastitis 99, BRD 120 |

### 4.3 What is real vs synthetic

- **Vision:** all 2,775 photos are real public field/clinical images.
- **Symptoms:** 404 real clinical reference rows and 3,965 clinically informed synthetic rows.
- The 874-row symptom validation set is **793 synthetic + 81 real** (90.7% synthetic).
- The 404-row “all real” symptom result includes **323 rows the model trained on**; it is not a generalization result.
- The 81-row real holdout is the honest symptom generalization set, but it covers only FMD, Mastitis, and BRD. There are no real symptom-only rows for Healthy or LSD.

---

## 5. Headline metrics

### 5.1 Main results

| Evaluation | n | Accuracy (95% CI) | Balanced accuracy | Macro F1 | Top-2 accuracy |
| --- | ---: | ---: | ---: | ---: | ---: |
| Symptoms, held-out | 874 | **99.43%** (98.67–99.76) | 99.41% | 99.42% | 100% |
| Symptoms, real-only holdout | 81 | **100%** (95.47–100) | 100% | 100% | — |
| Vision, real field photos | 555 | **91.89%** (89.32–93.89) | 92.37% | 90.97% | 98.92% |
| Fusion, mixed held-out | 563 | **98.93%** (97.69–99.51) | 98.93% | 98.89% | 99.82% |
| Fusion, strict real | 147 cases / 81 unique records | **99.32%** (96.25–99.88)* | 99.60% | 99.80% | — |
| Fusion, full real | 302 cases | **99.67%** (98.15–99.94)* | 99.60% | 99.80% | 100% |
| Fresh synthetic symptom check | 2,000 | 99.15% | 99.15% | 99.15% | 99.80% |

\* The confidence interval assumes independent cases. The strict fusion set repeats 17 held-out FMD symptom rows across 83 photos, so the effective independent symptom sample is 81 and the interval is optimistic. The full fusion set includes training rows and is not a generalization estimate.

### 5.2 Additional overall metrics

| Evaluation | Log loss | ROC-AUC (macro, one-vs-rest) |
| --- | ---: | ---: |
| Symptoms, 874 | 0.0137 | 0.99996 |
| Vision, 555 | 0.2711 | 0.98203 |
| Fusion, 563 | 0.0907 | 0.99982 |

---

## 6. Per-class metrics

### 6.1 Symptom model — 874 held-out rows

| Class | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| Healthy | 100.00% | 100.00% | 100.00% | 153 |
| Foot and Mouth Disease | 97.78% | 99.44% | 98.60% | 177 |
| Lumpy Skin Disease | 99.37% | 98.13% | 98.74% | 160 |
| Mastitis | 100.00% | 100.00% | 100.00% | 180 |
| Bovine Respiratory Disease | 100.00% | 99.51% | 99.75% | 204 |

### 6.2 Symptom model — 81 real held-out rows

| Class | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| Foot and Mouth Disease | 100% | 100% | 100% | 17 |
| Mastitis | 100% | 100% | 100% | 20 |
| Bovine Respiratory Disease | 100% | 100% | 100% | 44 |

Healthy and LSD are absent from the real holdout, so they are omitted rather than shown as zero.

### 6.3 Vision model — 555 real field photos

| Class | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| Healthy | 96.97% | 91.43% | 94.12% | 315 |
| Foot and Mouth Disease | 86.67% | 93.98% | 90.17% | 83 |
| Lumpy Skin Disease | 85.71% | 91.72% | 88.62% | 157 |

### 6.4 Fusion — 563 mixed held-out cases

| Class | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| Healthy | 98.33% | 98.33% | 98.33% | 120 |
| Foot and Mouth Disease | 97.62% | 98.80% | 98.20% | 83 |
| Lumpy Skin Disease | 98.32% | 97.50% | 97.91% | 120 |
| Mastitis | 100.00% | 100.00% | 100.00% | 120 |
| Bovine Respiratory Disease | 100.00% | 100.00% | 100.00% | 120 |

### 6.5 Fusion — strict / full real (3 classes present)

| Class | Precision | Recall | F1 | Strict support | Full support |
| --- | ---: | ---: | ---: | ---: | ---: |
| Foot and Mouth Disease | 100.00% | 98.80% | 99.39% | 83 | 83 |
| Mastitis | 100.00% | 100.00% | 100.00% | 20 | 99 |
| Bovine Respiratory Disease | 100.00% | 100.00% | 100.00% | 44 | 120 |

Macro F1 over the three present classes: **99.80%** in both strict and full evaluations.

---

## 7. Confusion matrices

Rows are actual labels; columns are predicted labels.

### 7.1 Symptom model — 874 rows

Class order: `Healthy, FMD, LSD, Mastitis, BRD`

```text
                 Healthy   FMD   LSD   Mastitis   BRD
Healthy              153     0     0          0     0
FMD                    0   176     1          0     0
LSD                    0     3   157          0     0
Mastitis               0     0     0        180     0
BRD                    0     1     0          0   203
```

Five errors total: FMD→LSD ×1, LSD→FMD ×3, BRD→FMD ×1.

### 7.2 Vision model — 555 photos

Class order: `Healthy, FMD, LSD`

```text
            Healthy   FMD   LSD
Healthy         288     7    20
FMD               1    78     4
LSD               8     5   144
```

45 errors total (8.11%). Top-2 accuracy is 98.92%.

### 7.3 Fusion — 563 mixed cases

Class order: `Healthy, FMD, LSD, Mastitis, BRD`

```text
                 Healthy   FMD   LSD   Mastitis   BRD
Healthy              118     1     1          0     0
FMD                    0    82     1          0     0
LSD                    2     1   117          0     0
Mastitis               0     0     0        120     0
BRD                    0     0     0          0   120
```

Six errors total. Mastitis and BRD are perfect in this set.

### 7.4 Fusion — strict and full real

Class order: `Healthy, FMD, LSD, Mastitis, BRD`

```text
Strict (147 cases)
                 Healthy   FMD   LSD   Mastitis   BRD
Healthy                0     0     0          0     0
FMD                    0    82     1          0     0
LSD                    0     0     0          0     0
Mastitis               0     0     0         20     0
BRD                    0     0     0          0    44

Full (302 cases)
                 Healthy   FMD   LSD   Mastitis   BRD
Healthy                0     0     0          0     0
FMD                    0    82     1          0     0
LSD                    0     0     0          0     0
Mastitis               0     0     0         99     0
BRD                    0     0     0          0   120
```

One error in each real fusion set: FMD→LSD.

---

## 8. Calibration and selective prediction

### 8.1 ECE and Brier score

“Raw” means temperature-calibrated model probabilities before evidence shrinking. “Served” means the final API output after evidence-aware shrinking/abstention, which is what the user sees.

| Output | Raw ECE | Raw Brier | Served ECE | Served Brier |
| --- | ---: | ---: | ---: | ---: |
| Vision, 555 | 5.58% | 0.1352 | 7.57% | 0.1441 |
| Symptom, 81 real holdout | 0.84% | 0.0011 | 0.83% | 0.0011 |
| Fusion, strict 147 | — | — | 5.14% | 0.0290 |
| Fusion, full 302 | — | — | 2.38% | 0.0138 |
| Symptom, all 404 (includes training) | — | — | 0.26% | 0.00023 |

The vision ECE rises after shrinking because confidence is deliberately reduced on weak images. That is a safety trade-off, not a regression: selective accuracy is the metric to present.

### 8.2 Confidence-band distribution

| Evaluation | High | Medium | Low |
| --- | ---: | ---: | ---: |
| Vision, 555 | 184 (33.15%) | 240 (43.24%) | 131 (23.60%) |
| Symptom, 81 real holdout | 78 (96.30%) | 3 (3.70%) | 0 |
| Fusion, strict 147 | 126 (85.71%) | 16 (10.88%) | 5 (3.40%) |
| Fusion, full 302 | 283 (93.71%) | 14 (4.64%) | 5 (1.66%) |

### 8.3 Selective accuracy

| Evaluation | Confident coverage | Confident accuracy | High-band coverage | High-band accuracy | Errors | High-band errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Vision, 555 | 76.40% | 97.64% | 33.15% | 97.83% | 45 | 4 |
| Symptom, 81 | 100% | 100% | 96.30% | 100% | 0 | 0 |
| Fusion, strict 147 | 96.60% | 100% | 85.71% | 100% | 1 | 0 |
| Fusion, full 302 | 98.34% | 100% | 93.71% | 100% | 1 | 0 |

- Vision low-confidence subset accuracy: 73.28%.
- Fusion strict/full low-confidence subset accuracy: 80% (4 of 5 correct; the one error is in the low band).
- Only **4 of 45** vision errors (8.89%) are shown in the high band; those 4 are 2.17% of all high-band vision predictions.

### 8.4 Edge cases: sparse reports

| Case | Independent signals | Prediction | Confidence | Band |
| --- | ---: | --- | ---: | --- |
| Cough only | 1 | Healthy | 35.96% | Low |
| Fever only | 1 | Healthy | 47.75% | Low |
| Isolated 40.5 °C | 1 | Healthy | 45.28% | Low |
| Unknown symptom + fever | 1 | Healthy | 45.28% | Low |
| Duration only | 1 | Healthy | 33.54% | Low |
| Skin nodules only | 1 | Healthy | 47.38% | Low |
| Normal 38.5 °C, no signs | 1 | Healthy | 99.94% | High |
| Two strong FMD signs | 3 | Foot and Mouth Disease | 99.13% | High |
| Full FMD picture | 6 | Foot and Mouth Disease | 100% | High |
| Full mastitis picture | 6 | Mastitis | 99.99% | High |
| Full BRD picture | 6 | Bovine Respiratory Disease | 100% | High |
| Unknown symptom only | 0 | Rejected: HTTP 400 | — | — |

The low-confidence “Healthy” outputs are intentional behaviour: with one nonspecific signal, the system does not over-commit. The UI should show “inconclusive / collect more evidence” rather than “healthy”.

---

## 9. Latency

CPU-only, local service, end-to-end request path.

| Path | n | Mean | p95 |
| --- | ---: | ---: | ---: |
| Vision only | 555 | 28.643 ms | 44.259 ms |
| Symptoms only, real holdout | 81 | 1.993 ms | 2.634 ms |
| Symptoms only, all real | 404 | 2.226 ms | 4.258 ms |
| Fusion, strict real | 147 | 26.321 ms | 59.607 ms |
| Fusion, full real | 302 | 11.936 ms | 43.170 ms |
| Fusion, mixed | 563 | 22.040 ms | 42.646 ms |

Model-only forward pass:

- Tabular: 0.0161 ms per sample
- Vision: 24.9967 ms per sample
- Fusion: 22.04 ms mean per sample

The end-to-end numbers include preprocessing, calibration, evidence checks, and response assembly.

---

## 10. Feature importance (XGBoost gain)

| Feature | Share of gain |
| --- | ---: |
| Cough | 18.57% |
| Pain during milking | 13.24% |
| Skin nodules | 12.69% |
| Swollen udder | 11.71% |
| Mouth ulcers | 11.39% |
| Abnormal milk | 7.94% |
| Difficulty chewing | 2.96% |
| Nasal discharge | 2.95% |
| Fever | 2.77% |
| Reproductive problems | 2.35% |

The top features are clinically plausible: respiratory signs for BRD, udder/milking signs for Mastitis, skin nodules for LSD, and mouth/salivation signs for FMD.

---

## 11. Error analysis

### Vision

- 45 errors / 555 = 8.11%.
- Main confusions: Healthy→LSD (20), Healthy→FMD (7), LSD→Healthy (8), LSD→FMD (5), FMD→LSD (4), FMD→Healthy (1).
- High-band errors: 4. These are rare but real; mandatory vet review is justified.
- Top-2 accuracy 98.92% means the correct class is almost always in the shortlist even when top-1 is wrong.

### Symptoms

- 5 errors / 874 = 0.57%.
- FMD→LSD ×1, LSD→FMD ×3, BRD→FMD ×1.
- No real-holdout errors.

### Fusion

- 6 errors / 563 = 1.07%.
- Healthy→FMD ×1, Healthy→LSD ×1, FMD→LSD ×1, LSD→Healthy ×2, LSD→FMD ×1.
- Strict/full real: 1 error (FMD→LSD), and it is in the low-confidence band.

---

## 12. Limitations and responsible interpretation

1. **Not a general disease detector.** Only 5 classes are supported. Other cattle diseases are out of scope and may be forced into one of the 5 labels; the confidence layer is the safety net, not a guarantee.
2. **Vision is same-source holdout, not cross-dataset validation.** The 555 photos come from three public datasets and are held out from training, but they are not a prospective clinic sample. 91.9% is not a guarantee of field accuracy on new farms, breeds, cameras, or disease stages.
3. **Vision has class imbalance.** Validation has 315 Healthy, 83 FMD, 157 LSD. FMD and LSD have lower precision and recall than Healthy.
4. **Symptom training is synthetic-heavy.** 3,965 of 4,369 rows are synthetic. The 99.43% headline is mostly a synthetic-data result.
5. **The honest symptom holdout is small.** 81 real records, only FMD/Mastitis/BRD, and no Healthy/LSD. 100% on 81 records has a 95% lower confidence bound of about 95.5%.
6. **The 404-row real symptom result is not generalization.** 323 of those rows were in training.
7. **No real symptom-only data for Healthy or LSD.** Those classes rely on clinically informed synthetic profiles in the symptom branch.
8. **Mastitis and BRD cannot be detected from images.** Image-only mode fixes their probabilities at zero. They require symptoms.
9. **Fusion headline is an upper bound.** The 563 mixed cases use clinically consistent symptom+image pairs. The README explicitly says to read this as an upper bound; contradictory real-world cues will score lower.
10. **Strict real fusion repeats FMD symptom rows.** The 147 cases are built from 81 unique held-out records; 17 FMD rows are paired with 83 photos. Treat the effective independent symptom n as 81.
11. **Calibration temperature is ~1.0.** Temperature scaling did not materially change the probabilities. Reliability comes from evidence gating and abstention, not from a large temperature correction.
12. **Confidence is model confidence, not clinical probability.** A low-confidence “Healthy” means “not enough evidence”, not “the animal is healthy”.
13. **Single-label model.** Co-infections and multiple simultaneous diseases are not represented.
14. **No prospective or regulatory validation.** This is a decision-support prototype, not a diagnostic device. Every disease prediction requires veterinarian review.

---

## 13. Safe claims for the presentation

| Say this | Avoid this |
| --- | --- |
| “Screens for 4 priority cattle diseases plus Healthy.” | “Detects all cattle diseases.” |
| “91.9% top-1 on 555 held-out real field photos for the 3 image-supported classes.” | “99% accurate in the field.” |
| “97.6% accurate when the vision model is confident enough to answer.” | “Always 91.9% confident.” |
| “99.4% on 874 held-out symptom rows, most of which are synthetic.” | “99.4% on real farm data.” |
| “100% on 81 real held-out symptom records for FMD, mastitis and BRD.” | “100% accurate on all diseases.” |
| “98.9% on 563 mixed cases; 99.3% on 147 strict real cases built from 81 held-out records.” | “99.3% on independent real cases.” |
| “Runs on CPU at about 29 ms per image and 2 ms per symptom-only case.” | “Real-time cloud diagnosis.” |
| “Flags weak evidence as low confidence and requires vet review for disease results.” | “Replaces the veterinarian.” |

---

## 14. Suggested presentation outline

1. Title: VetPulse AI — 5-class cattle health screening
2. Scope: 4 diseases + Healthy; symptoms and/or photos
3. Architecture: XGBoost symptoms + MobileNetV3-Small vision + 0.6/0.4 late fusion
4. Data: public datasets, real vs synthetic, splits
5. Headline metrics: honest real-world view, not just the mixed upper bound
6. Per-class performance and confusion matrices
7. Calibration and abstention: confidence bands, selective accuracy, sparse-input examples
8. Latency and CPU deployment
9. Limitations and clinical safety
10. Demo or next-step validation

---

## 15. Artifact index

| Artifact | Path |
| --- | --- |
| Full reliability metrics | `apps/ai-service/models/metrics_reliability.json` |
| Full held-out evaluation | `apps/ai-service/models/metrics_full_evaluation.json` |
| Real-world evaluation | `apps/ai-service/models/metrics_real_world.json` |
| Tabular training metrics | `apps/ai-service/models/metrics_tabular_train.json` |
| Vision training metrics | `apps/ai-service/models/metrics_vision_train.json` |
| Calibration parameters | `apps/ai-service/models/calibration.json` |
| Evaluation script | `apps/ai-service/scripts/evaluate_reliability.py` |
| Model provenance / README | `apps/ai-service/model/README.md` |
