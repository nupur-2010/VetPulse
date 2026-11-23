# Model Directory

This directory is reserved for the actual cattle disease detection model.

## Current Status
No model is currently loaded. The AI service is running in MOCK mode.

## Future Model Integration

When a real model is ready:
1. Add model weights (.pt, .h5, .onnx, etc.) to this directory or mount from secure storage
2. Add preprocessing pipelines if required
3. Update the model metadata in model/README.md
4. Implement ModelPredictionProvider in app/providers/
5. Set AI_PROVIDER=model in environment
6. Run validation tests

## Model Requirements

The model must:
- Accept symptom data (structured)
- Accept image data (optional, for multimodal predictions)
- Return predictions in the standard PredictionResponse schema
- Support batch predictions
- Have <2s inference time

## DO NOT:
- Download pretrained models from the internet
- Use real patient data for testing
- Commit model weights to version control
