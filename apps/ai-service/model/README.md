# Model Directory

Locally trained VetPulse artifacts live here. No API keys or cloud inference
are required — both branches run on CPU in-process.

## Artifacts

- `symptom_model.joblib` — XGBoost tabular classifier + feature encoder metadata
- `cattle_vision.pth` — MobileNetV3-Small image classifier checkpoint
- `vision_meta.json` — class index metadata for the vision model
- `metrics_*.json` — training and held-out evaluation metrics

## Training data

All sources are public and reproducible via `scripts/fetch_public_datasets.py`
(checksum-verified, resumable downloads):

| Dataset | Used for | License |
| --- | --- | --- |
| Zenodo 7779246 (FMD Cattle) | FMD + healthy oral/foot photos | CC BY 4.0 |
| Zenodo 11003967 (LSD DataHub) | LSD severity photos (deduped) | CC BY 4.0 |
| Mendeley ggpwpscjvm (FMD-LSD field benchmark) | FMD/healthy/LSD field photos | CC BY 4.0 |
| HF `scorder96/cattle-disease-prediction` | 93-signal symptom matrix (2044 rows) | MIT |

Build steps:

```bash
python scripts/fetch_public_datasets.py --all
python scripts/build_image_dataset.py
python scripts/build_symptom_dataset.py
python scripts/train_tabular.py
python scripts/train_vision.py
python scripts/evaluate.py
```

## Class coverage

| Class | Vision model | Symptom model |
| --- | --- | --- |
| Healthy | yes | yes |
| Foot and Mouth Disease | yes | yes |
| Lumpy Skin Disease | yes | yes |
| Mastitis | no (no public RGB dataset) | yes |
| Bovine Respiratory Disease | no (not a skin/lesion disease) | yes |

The vision model is therefore a 3-class classifier; Mastitis and BRD are
detected from clinical signs only. Reference rows (real symptom matrix) are
up-weighted 2x during tabular training.

## Held-out metrics

| Branch | Data | Accuracy | Macro F1 |
| --- | --- | --- | --- |
| Symptoms | 874 held-out rows | 0.994 | 0.994 |
| Vision | 555 held-out field photos | 0.919 | 0.910 |
| Fusion | 563 mixed cases | 0.989 | 0.989 |

The fusion figure uses clinically consistent symptom + image pairs and should
be read as an upper bound; real reports with contradictory cues will score
lower. These numbers replace the earlier synthetic-only 99%+ claims.

## Runtime behaviour

The service loads both artifacts once during FastAPI startup and fuses them:

- both inputs: `0.60 * vision + 0.40 * symptoms`
- symptoms only: tabular probabilities
- image only: vision probabilities (Mastitis and BRD fixed at 0)

Set `AI_PROVIDER=local` (default) to use these models. `AI_PROVIDER=mock` is a
keyword-only fallback for offline demos.
