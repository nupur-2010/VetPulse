# Model Integration Guide

VetPulse ships with locally trained models loaded inside the FastAPI service.
There is no external inference API and no API key. This document describes the
architecture, the request/response contract, and how to retrain or swap models.

## Architecture

```
POST /predict  ->  LocalPredictionProvider
                     |-- vision branch   (PyTorch MobileNetV3-Small, CPU)
                     |-- symptom branch  (XGBoost tabular, 33 features)
                     `-- late fusion     0.60 * vision + 0.40 * symptoms
```

- `AI_PROVIDER=local` (default) uses these models.
- `AI_PROVIDER=mock` returns deterministic sample scenarios for offline UI demos
  and labels them `provider: "mock"`, `model_status: "MOCK"`,
  `is_simulated: true`.

## Artifacts

```
apps/ai-service/model/
  symptom_model.joblib   XGBoost booster + feature metadata
  cattle_vision.pth      TorchScript-free state_dict checkpoint
  vision_meta.json       checkpoint class order + image size
  metrics_*.json         training / held-out metrics
```

Artifacts are loaded once at startup. `GET /model-info` reports the loaded
class lists, providers and fusion weights so the API and UI stay in sync.

## Disease coverage

| Class | Vision | Symptoms |
| --- | --- | --- |
| Healthy | yes | yes |
| Foot and Mouth Disease | yes | yes |
| Lumpy Skin Disease | yes | yes |
| Mastitis | no | yes |
| Bovine Respiratory Disease | no | yes |

Classes without an image class are zeroed in the vision vector before fusion,
so the symptom branch decides them. This is deliberate: the only public
mastitis imaging is thermal udder data from other species, and synthetic
textures would produce confident false positives.

## Retraining

```bash
cd apps/ai-service
python scripts/fetch_public_datasets.py --all   # checksum-verified download
python scripts/build_image_dataset.py           # dedupe + stratified split
python scripts/build_symptom_dataset.py         # reference matrix + priors
python scripts/train_tabular.py
python scripts/train_vision.py
python scripts/evaluate.py                      # writes metrics_full_evaluation.json
python -m pytest
```

`scripts/evaluate.py` scores recorded held-out folds only (real images,
held-out symptom rows), so the numbers cannot be inflated by resampling the
training distribution.

## Response contract

The API contract is provider-independent; the TypeScript types live in
`packages/shared-types`.

```typescript
interface PredictionResponse {
  prediction_id: string;
  provider: 'local' | 'mock';
  model_status: 'LOADED' | 'MOCK' | 'ERROR';
  is_simulated?: boolean;
  predicted_disease: string | null;
  confidence: number | null;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  class_probabilities: Record<string, number>;   // all 5 classes, percent
  top_contributing_factors: string[];
  possible_conditions: Array<{ disease: string; confidence: number }>;
  supporting_symptoms: string[];
  recommendations: string[];
  image_assessment?: {
    status: 'not_analyzed' | 'analyzed' | 'unavailable';
    note?: string;
  };
  used_image: boolean;
  used_symptoms: boolean;
  fusion_weights?: { vision: number; symptoms: number };
  disclaimer: string;
  predicted_at: string;
}
```

### Known limitation: no out-of-distribution rejection

The vision head is a closed 3-way softmax, so any image maps to Healthy, FMD or
LSD. Measured on unrelated inputs: a blank white frame scores FMD 76%, random
noise FMD 70%, a photo of a dog "Healthy" 99%. Only severe blur produces a low
maximum (38%) that would read as uncertain. There is no `unknown` class and no
abstention path, so callers must validate that an image actually shows cattle
before trusting the label. Training a rejection class on non-cattle photos is
the documented upgrade path.

## Swapping in a different model

1. Keep the same 5-class order in `app/constants.py`.
2. Write artifacts to `apps/ai-service/model/`.
3. Implement a provider under `app/providers/` returning `PredictionResponse`.
4. Select it with `AI_PROVIDER`.

No database, API or frontend changes are required.

## Validation checklist

- `python scripts/test_end_to_end.py` — provider routing, aliases, validation
- `python scripts/test_live_service.py` — running-service smoke test
- `python -m pytest` — model loading and per-class behaviour
