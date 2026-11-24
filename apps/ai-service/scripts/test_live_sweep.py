"""In-process live prediction tests using FastAPI TestClient — no HTTP overhead.
Tests every real val image + all 404 real symptom rows."""

import sys, os
sys.path.insert(0, os.getcwd())
os.chdir(r"C:\Users\BIT\VetPulse\apps\ai-service")

import glob
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from app.constants import SEVERITY_LEVELS
from app.features import feature_name_for_symptom, SYMPTOMS

client = TestClient(app)

# verify service
h = client.get("/health").json()
print(f"Service: {h}\n")

print("=" * 60)
print("LIVE PREDICTIONS — REAL DATA")
print("=" * 60)

# === individual cases ===
CASES = [
    ("FMD Symptom-Only", {
        "symptoms": ["Fever", "Mouth ulcers", "Excessive salivation", "Difficulty standing"],
        "temperature": 40.5, "symptomDuration": "4-7 days", "severity": "severe"
    }, "Foot and Mouth Disease"),
    ("Healthy (mild)", {
        "symptoms": [], "temperature": 38.5, "severity": "mild"
    }, "Healthy"),
    ("Mastitis", {
        "symptoms": ["Swollen udder", "Pain during milking", "Abnormal milk", "Fever"],
        "temperature": 39.6, "duration": 3, "severity": "moderate"
    }, "Mastitis"),
    ("BRD", {
        "symptoms": ["Cough", "Nasal discharge", "Difficulty breathing", "Fever"],
        "temperature": 40.7, "symptomDuration": "2-3 days", "severity": "moderate"
    }, "Bovine Respiratory Disease"),
    ("LSD Fusion (real img + symptoms)", {
        "symptoms": ["Skin nodules", "Swelling", "Fever"],
        "temperature": 40.0, "severity": "severe",
        "image_paths": ["data/images/val/Lumpy_Skin_Disease/Lumpy_Skin_Disease_00000.jpg"]
    }, "Lumpy Skin Disease"),
    ("FMD Image-Only", {
        "image_paths": ["data/images/val/Foot_and_Mouth_Disease/Foot_and_Mouth_Disease_00000.jpg"]
    }, "Foot and Mouth Disease"),
    ("Healthy Image-Only", {
        "image_paths": ["data/images/val/Healthy/Healthy_00000.jpg"]
    }, "Healthy"),
    ("LSD Image-Only", {
        "image_paths": ["data/images/val/Lumpy_Skin_Disease/Lumpy_Skin_Disease_00000.jpg"]
    }, "Lumpy Skin Disease"),
]

for name, payload, expected in CASES:
    r = client.post("/predict", json=payload).json()
    match = "OK" if r["predicted_disease"] == expected else "FAIL"
    print(f"{match} [{name}]")
    print(f"   Predicted: {r['predicted_disease']} ({r['confidence']}%)  provider={r['provider']}")
    print(f"   Probs: {r['class_probabilities']}")
    if r.get("fusion_weights"):
        print(f"   Fusion: {r['fusion_weights']}")
    print()

# === IMAGE-ONLY ACCURACY SWEEPS (vision branch, no symptoms) ===
print("=" * 60)
print("IMAGE-ONLY ACCURACY SWEEPS (real val photos)")
print("=" * 60)

for cls_dir, expected in [
    ("Lumpy_Skin_Disease", "Lumpy Skin Disease"),
    ("Healthy", "Healthy"),
    ("Foot_and_Mouth_Disease", "Foot and Mouth Disease"),
]:
    images = sorted(glob.glob(f"data/images/val/{cls_dir}/*.jpg"))
    correct = 0
    counts = {}
    for img_path in images:
        r = client.post("/predict", json={"image_paths": [str(img_path)]}).json()
        pred = r["predicted_disease"]
        counts[pred] = counts.get(pred, 0) + 1
        if pred == expected:
            correct += 1
    acc = correct / len(images)
    print(f"\n{expected} ({len(images)} images):")
    print(f"   Accuracy: {correct}/{len(images)} = {acc:.2%}")
    print(f"   Confusion: {counts}")

# === SYMPTOM ACCURACY ON ALL 404 REAL REFERENCE ROWS ===
print("\n" + "=" * 60)
print("SYMPTOM ACCURACY — ALL 404 REAL REFERENCE ROWS")
print("=" * 60)

frame = pd.read_csv("data/cattle_symptoms.csv")
frame = frame[frame["source"].str.startswith("reference:")]

for disease in ["Foot and Mouth Disease", "Mastitis", "Bovine Respiratory Disease"]:
    sub = frame[frame["disease"] == disease].reset_index(drop=True)
    correct = 0
    for _, row in sub.iterrows():
        symptoms = [s for s in SYMPTOMS if float(row[feature_name_for_symptom(s)]) > 0.5]
        payload = {
            "symptoms": symptoms,
            "temperature": float(row["temperature"]),
            "duration": float(row["duration_days"]),
            "severity": SEVERITY_LEVELS[int(row["severity"])]
        }
        r = client.post("/predict", json=payload).json()
        if r["predicted_disease"] == disease:
            correct += 1
    acc = correct / len(sub)
    print(f"\n{disease} ({len(sub)} real rows):")
    print(f"   Accuracy: {correct}/{len(sub)} = {acc:.2%}")

# === TOP-2 ACCURACY (fusion, all 555 val images) ===
print("\n" + "=" * 60)
print("TOP-2 VISION ACCURACY (555 real held-out val images)")
print("=" * 60)

correct_top1 = 0
correct_top2 = 0
counts = {}
for img_path in sorted(glob.glob("data/images/val/**/*.jpg", recursive=True)):
    r = client.post("/predict", json={"image_paths": [img_path]}).json()
    probs = r["class_probabilities"]
    sorted_probs = sorted(probs.items(), key=lambda x: x[1], reverse=True)
    top1 = sorted_probs[0][0]
    top2 = sorted_probs[1][0]
    cls_dir = os.path.basename(os.path.dirname(img_path))
    expected = {"Healthy": "Healthy", "Foot_and_Mouth_Disease": "Foot and Mouth Disease", "Lumpy_Skin_Disease": "Lumpy Skin Disease"}.get(cls_dir, "")
    if top1 == expected:
        correct_top1 += 1
    if expected in [top1, top2]:
        correct_top2 += 1
    counts[cls_dir] = counts.get(cls_dir, 0) + 1

total = sum(counts.values())
print(f"Top-1 Accuracy: {correct_top1}/{total} = {correct_top1/total:.2%}")
print(f"Top-2 Accuracy: {correct_top2}/{total} = {correct_top2/total:.2%}")
print(f"(Tested {total} real field photos)")

print("\n" + "=" * 60)
print("ALL TESTS COMPLETE")
print("=" * 60)
