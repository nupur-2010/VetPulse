"""Live HTTP test of the VetPulse AI service on real-world data."""

import httpx
import json
import time
import sys
import os
import glob
import pandas as pd

sys.path.insert(0, os.getcwd())

BASE = "http://127.0.0.1:8001"
wait = 30
for i in range(wait):
    try:
        r = httpx.get(f"{BASE}/health", timeout=2)
        if r.status_code < 500:
            print("Service ready")
            break
    except Exception:
        pass
    time.sleep(1)
else:
    print("Service not ready — timed out")
    sys.exit(1)

# --- health + model-info ---
h = httpx.get(f"{BASE}/health", timeout=5).json()
print("\n=== HEALTH ===")
print(json.dumps(h, indent=2))

m = httpx.get(f"{BASE}/model-info", timeout=5).json()
print("\n=== MODEL INFO ===")
for k, v in m.items():
    print(f"  {k}: {v}")

# === REAL-WORLD LIVE PREDICTIONS ===

print("\n" + "=" * 60)
print("REAL-WORLD LIVE PREDICTIONS")
print("=" * 60)

def show(name, r):
    print(f"\n--- {name} ---")
    print(f"  Prediction: {r['predicted_disease']}")
    print(f"  Confidence: {r['confidence']}%")
    print(f"  Class probs: {r['class_probabilities']}")
    print(f"  Provider: {r['provider']}")
    print(f"  Top factors: {r['top_contributing_factors']}")
    if r.get("fusion_weights"):
        print(f"  Fusion weights: {r['fusion_weights']}")
    if r.get("image_assessment"):
        print(f"  Image assessment: {r['image_assessment']}")

# 1. FMD symptom-only
r = httpx.post(f"{BASE}/predict", json={
    "symptoms": ["Fever", "Mouth ulcers", "Excessive salivation", "Difficulty standing"],
    "temperature": 40.5,
    "symptom_duration": "4-7 days",
    "severity": "severe"
}, timeout=30).json()
show("FMD Symptom-Only", r)

# 2. Healthy
r = httpx.post(f"{BASE}/predict", json={
    "symptoms": [],
    "temperature": 38.5,
    "severity": "mild"
}, timeout=30).json()
show("Healthy", r)

# 3. Mastitis
r = httpx.post(f"{BASE}/predict", json={
    "symptoms": ["Swollen udder", "Pain during milking", "Abnormal milk", "Fever"],
    "temperature": 39.6,
    "duration": 3,
    "severity": "moderate"
}, timeout=30).json()
show("Mastitis", r)

# 4. BRD
r = httpx.post(f"{BASE}/predict", json={
    "symptoms": ["Cough", "Nasal discharge", "Difficulty breathing", "Fever"],
    "temperature": 40.7,
    "symptom_duration": "2-3 days",
    "severity": "moderate"
}, timeout=30).json()
show("Bovine Respiratory Disease", r)

# 5. LSD real image + symptoms (fusion)
lsd_img = "data/images/val/Lumpy_Skin_Disease/Lumpy_Skin_Disease_00000.jpg"
r = httpx.post(f"{BASE}/predict", json={
    "symptoms": ["Skin nodules", "Swelling", "Fever"],
    "temperature": 40.0,
    "severity": "severe",
    "image_paths": [lsd_img]
}, timeout=30).json()
show("LSD — Real Image + Symptoms (Fusion)", r)

# 6. FMD image-only
fmd_img = "data/images/val/Foot_and_Mouth_Disease/Foot_and_Mouth_Disease_00000.jpg"
r = httpx.post(f"{BASE}/predict", json={"image_paths": [fmd_img]}, timeout=30).json()
show("FMD — Real Image Only", r)

# 7. Healthy image-only
healthy_img = "data/images/val/Healthy/Healthy_00000.jpg"
r = httpx.post(f"{BASE}/predict", json={"image_paths": [healthy_img]}, timeout=30).json()
show("Healthy — Real Image Only", r)

# 8. Full accuracy sweep — all 157 real LSD images (fusion)
print("\n--- LSD Fusion — All 157 Real Val Images ---")
correct = 0
counts = {}
for img_path in sorted(glob.glob("data/images/val/Lumpy_Skin_Disease/*.jpg"))[:157]:
    r = httpx.post(f"{BASE}/predict", json={
        "symptoms": ["Skin nodules", "Swelling", "Fever"],
        "temperature": 40.0,
        "severity": "severe",
        "image_paths": [str(img_path)]
    }, timeout=30).json()
    pred = r["predicted_disease"]
    counts[pred] = counts.get(pred, 0) + 1
    if pred == "Lumpy Skin Disease":
        correct += 1
acc = correct / 157
print(f"  Accuracy: {correct}/157 = {acc:.4f} ({acc*100:.2f}%)")
print(f"  Predictions: {counts}")

# 9. Full accuracy sweep — all 315 real Healthy images
print("\n--- Healthy Image-Only — All 315 Real Val Images ---")
correct = 0
counts = {}
for img_path in sorted(glob.glob("data/images/val/Healthy/*.jpg"))[:315]:
    r = httpx.post(f"{BASE}/predict", json={"image_paths": [str(img_path)]}, timeout=30).json()
    pred = r["predicted_disease"]
    counts[pred] = counts.get(pred, 0) + 1
    if pred == "Healthy":
        correct += 1
acc = correct / 315
print(f"  Accuracy: {correct}/315 = {acc:.4f} ({acc*100:.2f}%)")
print(f"  Predictions: {counts}")

# 10. Full accuracy sweep — all 83 real FMD images
print("\n--- FMD Image-Only — All 83 Real Val Images ---")
correct = 0
counts = {}
for img_path in sorted(glob.glob("data/images/val/Foot_and_Mouth_Disease/*.jpg"))[:83]:
    r = httpx.post(f"{BASE}/predict", json={"image_paths": [str(img_path)]}, timeout=30).json()
    pred = r["predicted_disease"]
    counts[pred] = counts.get(pred, 0) + 1
    if pred == "Foot and Mouth Disease":
        correct += 1
acc = correct / 83
print(f"  Accuracy: {correct}/83 = {acc:.4f} ({acc*100:.2f}%)")
print(f"  Predictions: {counts}")

# 11. BRD on all 219 real symptom rows from the reference matrix
print("\n--- BRD — All 219 Real Reference Rows ---")
sys.path.insert(0, os.getcwd())
from app.constants import SEVERITY_LEVELS
from app.features import feature_name_for_symptom, SYMPTOMS

frame = pd.read_csv("data/cattle_symptoms.csv")
frame = frame[frame["source"].str.startswith("reference:")]
frame_brd = frame[frame["disease"] == "Bovine Respiratory Disease"]
correct = 0
for _, row in frame_brd.iterrows():
    symptoms = [s for s in SYMPTOMS if float(row[feature_name_for_symptom(s)]) > 0.5]
    r = httpx.post(f"{BASE}/predict", json={
        "symptoms": symptoms,
        "temperature": float(row["temperature"]),
        "duration": float(row["duration_days"]),
        "severity": SEVERITY_LEVELS[int(row["severity"])]
    }, timeout=30).json()
    if r["predicted_disease"] == "Bovine Respiratory Disease":
        correct += 1
acc = correct / len(frame_brd)
print(f"  Accuracy: {correct}/{len(frame_brd)} = {acc:.4f} ({acc*100:.2f}%)")

# 12. Mastitis on all 99 real reference rows
print("\n--- Mastitis — All 99 Real Reference Rows ---")
frame_mast = frame[frame["disease"] == "Mastitis"]
correct = 0
for _, row in frame_mast.iterrows():
    symptoms = [s for s in SYMPTOMS if float(row[feature_name_for_symptom(s)]) > 0.5]
    r = httpx.post(f"{BASE}/predict", json={
        "symptoms": symptoms,
        "temperature": float(row["temperature"]),
        "duration": float(row["duration_days"]),
        "severity": SEVERITY_LEVELS[int(row["severity"])]
    }, timeout=30).json()
    if r["predicted_disease"] == "Mastitis":
        correct += 1
acc = correct / len(frame_mast)
print(f"  Accuracy: {correct}/{len(frame_mast)} = {acc:.4f} ({acc*100:.2f}%)")

# 13. FMD on all 86 real reference rows
print("\n--- FMD — All 86 Real Reference Rows ---")
frame_fmd = frame[frame["disease"] == "Foot and Mouth Disease"]
correct = 0
for _, row in frame_fmd.iterrows():
    symptoms = [s for s in SYMPTOMS if float(row[feature_name_for_symptom(s)]) > 0.5]
    r = httpx.post(f"{BASE}/predict", json={
        "symptoms": symptoms,
        "temperature": float(row["temperature"]),
        "duration": float(row["duration_days"]),
        "severity": SEVERITY_LEVELS[int(row["severity"])]
    }, timeout=30).json()
    if r["predicted_disease"] == "Foot and Mouth Disease":
        correct += 1
acc = correct / len(frame_fmd)
print(f"  Accuracy: {correct}/{len(frame_fmd)} = {acc:.4f} ({acc*100:.2f}%)")

print("\n" + "=" * 60)
print("ALL LIVE TESTS COMPLETE")
print("=" * 60)
