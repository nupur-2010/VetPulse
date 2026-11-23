# Model Integration Guide

This document describes how to integrate a real cattle disease detection model into the VetPulse AI service.

## Current Status

The AI service currently uses the `MockPredictionProvider` which returns simulated predictions for demonstration purposes. No actual machine learning model is loaded or used.

## Future Integration Steps

When your cattle disease detection model is ready, follow these steps to integrate it:

### Step 1: Prepare Model Artifacts

1. Save your model weights and checkpoints to:
   ```
   apps/ai-service/model/artifacts/
   ```

2. Save any preprocessing pipelines alongside the model.

3. Update `apps/ai-service/model/README.md` with model metadata.

### Step 2: Implement Model Provider

Create a new provider in `apps/ai-service/app/providers/model_provider.py`:

```python
from .base_provider import BasePredictionProvider
from ..schemas.prediction import PredictionRequest, PredictionResponse

class ModelPredictionProvider(BasePredictionProvider):
    def __init__(self, model_path: str):
        # Load your model here
        self.model = self._load_model(model_path)
    
    async def predict(self, request: PredictionRequest) -> PredictionResponse:
        # Implement prediction logic
        pass
    
    async def health(self) -> dict:
        return {"status": "healthy", "model_loaded": True}
    
    async def model_info(self) -> dict:
        return {"version": "1.0.0", "type": "cattle-disease"}
```

### Step 3: Configure Provider Selection

Set the environment variable:
```bash
AI_PROVIDER=model
```

### Step 4: Validate Integration

1. Run the AI service tests
2. Verify prediction response schema
3. Check error handling
4. Validate image handling (if applicable)

## Response Schema

All predictions (mock or real) must return data conforming to:

```typescript
interface PredictionResponse {
  prediction_id: string;
  provider: 'mock' | 'model';
  model_status: 'MOCK' | 'LOADED' | 'ERROR';
  is_simulated: boolean;
  predicted_disease: string | null;
  confidence: number | null;
  confidence_interpretation: 'high' | 'medium' | 'low' | 'uncertain';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  possible_conditions: Array<{
    disease: string;
    confidence: number;
  }>;
  supporting_symptoms: string[];
  recommendations: string[];
  image_assessment?: {
    status: 'not_analyzed' | 'analyzed' | 'unavailable';
    note?: string;
  };
  disclaimer: string;
  predicted_at: string;
}
```

## Important Notes

- Do NOT replace the Mock provider until the real model is fully validated
- Keep `AI_PROVIDER=mock` in development even after model integration
- The frontend does not need any changes when switching providers
- The database schema does not need modifications
- The API contract remains identical regardless of provider
