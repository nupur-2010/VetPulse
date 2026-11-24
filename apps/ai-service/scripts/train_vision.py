"""Train the MobileNetV3-Small cattle image classifier.

Phase 1 (5 epochs): frozen backbone, train classifier head at lr=1e-3.
Phase 2 (5 epochs): unfreeze the last two feature blocks, fine-tune at lr=1e-4.

Usage:
    python scripts/train_vision.py
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.constants import IMAGE_CLASSES, IMAGE_CLASS_DIRS  # noqa: E402

DATA_DIR = ROOT / "data" / "images"
MODEL_PATH = ROOT / "models" / "cattle_vision.pth"
META_PATH = ROOT / "models" / "vision_meta.json"
METRICS_PATH = ROOT / "models" / "metrics_vision_train.json"

INPUT_SIZE = 224
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]


def pick_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def pick_num_workers() -> int:
    if os.name == "nt":
        return 0
    return min(4, os.cpu_count() or 1)


def build_model(num_classes: int, pretrained: bool = True) -> nn.Module:
    weights = None
    if pretrained:
        try:
            weights = models.MobileNet_V3_Small_Weights.DEFAULT
            model = models.mobilenet_v3_small(weights=weights)
            print("Loaded ImageNet pretrained MobileNetV3-Small weights.")
        except Exception as exc:  # pragma: no cover - offline fallback
            print(f"Pretrained weights unavailable ({exc}); training from scratch.")
            model = models.mobilenet_v3_small(weights=None)
    else:
        model = models.mobilenet_v3_small(weights=None)

    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(in_features, num_classes)
    return model


def build_loaders(batch_size: int, num_workers: int):
    train_transform = transforms.Compose(
        [
            transforms.RandomResizedCrop(INPUT_SIZE, scale=(0.8, 1.0), ratio=(0.9, 1.1)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=12),
            transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
            transforms.ToTensor(),
            transforms.Normalize(MEAN, STD),
        ]
    )
    eval_transform = transforms.Compose(
        [
            transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(MEAN, STD),
        ]
    )

    train_dir = DATA_DIR / "train"
    val_dir = DATA_DIR / "val"
    if not train_dir.exists() or not val_dir.exists():
        raise FileNotFoundError(
            f"Image dataset missing. Expected {train_dir} and {val_dir}. "
            "Run scripts/build_image_dataset.py first."
        )

    train_dataset = datasets.ImageFolder(train_dir, transform=train_transform)
    val_dataset = datasets.ImageFolder(val_dir, transform=eval_transform)

    expected = {IMAGE_CLASS_DIRS[name] for name in IMAGE_CLASSES}
    found = set(train_dataset.classes)
    if not expected.issubset(found):
        raise ValueError(
            f"Train folders {sorted(found)} do not contain all expected classes {sorted(expected)}"
        )

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
        persistent_workers=num_workers > 0,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
        persistent_workers=num_workers > 0,
    )
    return train_loader, val_loader, train_dataset, val_dataset


def evaluate(model: nn.Module, loader: DataLoader, device: torch.device):
    model.eval()
    all_labels = []
    all_preds = []
    total_loss = 0.0
    criterion = nn.CrossEntropyLoss()
    with torch.inference_mode():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            total_loss += float(criterion(outputs, labels).item()) * images.size(0)
            preds = outputs.argmax(dim=1)
            all_labels.extend(labels.cpu().tolist())
            all_preds.extend(preds.cpu().tolist())
    accuracy = float(accuracy_score(all_labels, all_preds)) if all_labels else 0.0
    mean_loss = total_loss / max(1, len(all_labels))
    return accuracy, mean_loss, all_labels, all_preds


def class_weights_for(dataset: datasets.ImageFolder) -> torch.Tensor:
    targets = np.array([label for _, label in dataset.samples])
    counts = np.bincount(targets, minlength=len(dataset.classes)).astype(np.float64)
    counts[counts == 0] = 1.0
    weights = counts.sum() / (len(counts) * counts)
    print("Class weights:", dict(zip(dataset.classes, np.round(weights, 3))))
    return torch.tensor(weights, dtype=torch.float32)


def run_phase(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    device: torch.device,
    epochs: int,
    lr: float,
    phase_name: str,
    best_accuracy: float,
    best_state: dict | None,
    class_weights: torch.Tensor | None = None,
) -> tuple[float, dict | None]:
    weight = class_weights.to(device) if class_weights is not None else None
    criterion = nn.CrossEntropyLoss(weight=weight, label_smoothing=0.05)
    optimizer = torch.optim.AdamW(
        [param for param in model.parameters() if param.requires_grad],
        lr=lr,
        weight_decay=1e-4,
    )

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        seen = 0
        start = time.time()
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad(set_to_none=True)
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            running_loss += float(loss.item()) * images.size(0)
            seen += images.size(0)

        accuracy, val_loss, _labels, _preds = evaluate(model, val_loader, device)
        elapsed = time.time() - start
        print(
            f"[{phase_name}] epoch {epoch}/{epochs} | "
            f"train_loss={running_loss / max(1, seen):.4f} | "
            f"val_loss={val_loss:.4f} | val_acc={accuracy:.4f} | {elapsed:.1f}s"
        )
        if accuracy > best_accuracy:
            best_accuracy = accuracy
            best_state = copy.deepcopy(model.state_dict())
            print(f"  new best val accuracy: {best_accuracy:.4f}")
    return best_accuracy, best_state


def train(
    epochs_head: int = 5,
    epochs_finetune: int = 5,
    batch_size: int = 32,
    seed: int = 42,
    pretrained: bool = True,
) -> dict:
    torch.manual_seed(seed)
    np.random.seed(seed)

    device = pick_device()
    num_workers = pick_num_workers()
    print(f"Device: {device} | num_workers: {num_workers}")

    train_loader, val_loader, train_dataset, val_dataset = build_loaders(batch_size, num_workers)
    print(f"Train images: {len(train_dataset)} | Val images: {len(val_dataset)}")
    print(f"Classes: {train_dataset.classes}")

    model = build_model(len(train_dataset.classes), pretrained=pretrained).to(device)
    class_weights = class_weights_for(train_dataset)

    for param in model.parameters():
        param.requires_grad = False
    for param in model.classifier.parameters():
        param.requires_grad = True

    best_accuracy = 0.0
    best_state = None
    best_accuracy, best_state = run_phase(
        model, train_loader, val_loader, device, epochs_head, 1e-3, "head",
        best_accuracy, best_state, class_weights,
    )

    for block in list(model.features)[-2:]:
        for param in block.parameters():
            param.requires_grad = True

    best_accuracy, best_state = run_phase(
        model, train_loader, val_loader, device, epochs_finetune, 1e-4, "finetune",
        best_accuracy, best_state, class_weights,
    )

    if best_state is not None:
        model.load_state_dict(best_state)

    accuracy, val_loss, labels, preds = evaluate(model, val_loader, device)
    class_names = train_dataset.classes
    report = classification_report(
        labels, preds, labels=list(range(len(class_names))), target_names=class_names, digits=4
    )
    matrix = confusion_matrix(labels, preds, labels=list(range(len(class_names))))
    print(f"\nBest validation accuracy: {best_accuracy:.4f}")
    print(f"Final validation accuracy: {accuracy:.4f}")
    print("\nClassification report:")
    print(report)
    print("Confusion matrix (rows=true, cols=pred):")
    print(matrix)

    idx_to_class = {index: name for name, index in train_dataset.class_to_idx.items()}
    checkpoint = {
        "state_dict": model.state_dict(),
        "classes": class_names,
        "class_to_idx": train_dataset.class_to_idx,
        "idx_to_class": idx_to_class,
        "arch": "mobilenet_v3_small",
        "input_size": INPUT_SIZE,
        "mean": MEAN,
        "std": STD,
        "val_accuracy": float(best_accuracy),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
    }
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    torch.save(checkpoint, MODEL_PATH)
    print(f"\nSaved checkpoint to {MODEL_PATH}")

    meta = {key: value for key, value in checkpoint.items() if key != "state_dict"}
    META_PATH.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"Saved class metadata to {META_PATH}")

    metrics = {
        "best_val_accuracy": float(best_accuracy),
        "final_val_accuracy": accuracy,
        "val_loss": val_loss,
        "classes": class_names,
        "classification_report": classification_report(
            labels,
            preds,
            labels=list(range(len(class_names))),
            target_names=class_names,
            output_dict=True,
            zero_division=0,
        ),
        "confusion_matrix": matrix.tolist(),
        "n_train": len(train_dataset),
        "n_val": len(val_dataset),
        "device": str(device),
    }
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"Saved training metrics to {METRICS_PATH}")
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Train cattle vision model")
    parser.add_argument("--epochs-head", type=int, default=5)
    parser.add_argument("--epochs-finetune", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--no-pretrained", action="store_true")
    args = parser.parse_args()
    train(
        epochs_head=args.epochs_head,
        epochs_finetune=args.epochs_finetune,
        batch_size=args.batch_size,
        seed=args.seed,
        pretrained=not args.no_pretrained,
    )


if __name__ == "__main__":
    main()
