"""Build the cattle image dataset from openly licensed field photographs.

Sources (downloaded by ``scripts/fetch_public_datasets.py``):

* ``data/raw/fmd_cattle/FMD_Cattle/{0,1}`` - Zenodo 7779246, CC BY 4.0.
  Folder ``0`` holds lesion-free mouths/feet, folder ``1`` holds FMD lesions.
* ``data/raw/lsd_datahub/.../lumpy_balanced.zip`` - Zenodo 11003967, CC BY 4.0.
  Files are named ``Normal*``, ``Mild*`` and ``Severe*``.

Images are de-duplicated by content hash, split per class into train/val, and
written as JPEGs to ``data/images/{train,val}/<class dir>``.

Mastitis and Bovine Respiratory Disease have no public RGB dataset, so they are
intentionally absent here and are predicted by the tabular branch only.

Synthetic images are generated only when a class has no real photographs at all
(e.g. an offline machine), never mixed into a class that has real data.

Usage:
    python scripts/build_image_dataset.py
    python scripts/build_image_dataset.py --val-fraction 0.2 --force
"""

from __future__ import annotations

import argparse
import hashlib
import random
import shutil
import sys
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.constants import IMAGE_CLASSES, IMAGE_CLASS_DIRS  # noqa: E402

DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
IMAGES_DIR = DATA_DIR / "images"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
MAX_SIDE = 640


# --------------------------------------------------------------------- sources
def _lsd_archive() -> Optional[Path]:
    base = RAW_DIR / "lsd_datahub"
    if not base.exists():
        return None
    for candidate in base.rglob("lumpy_balanced.zip"):
        return candidate
    for candidate in base.rglob("lumpy_unbalanced.zip"):
        return candidate
    return None


def _iter_fmd() -> Iterable[Tuple[str, Path]]:
    base = RAW_DIR / "fmd_cattle"
    if not base.exists():
        return
    for folder, label in (("0", "Healthy"), ("1", "Foot and Mouth Disease")):
        for directory in base.rglob(folder):
            if not directory.is_dir() or directory.parent.name != "FMD_Cattle":
                continue
            for path in sorted(directory.iterdir()):
                if path.suffix.lower() in IMAGE_EXTENSIONS:
                    yield label, path


def _iter_lsd(zf: zipfile.ZipFile) -> Iterable[Tuple[str, zipfile.ZipInfo]]:
    for info in sorted(zf.infolist(), key=lambda item: item.filename):
        if info.is_dir():
            continue
        if Path(info.filename).suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        if "__MACOSX" in info.filename:
            continue
        name = Path(info.filename).name.lower()
        if name.startswith("normal"):
            yield "Healthy", info
        elif name.startswith(("mild", "severe")):
            yield "Lumpy Skin Disease", info


def map_class_name(name: str) -> Optional[str]:
    text = name.lower().replace("-", " ").replace("_", " ")
    if ("foot" in text and "mouth" in text) or "fmd" in text:
        return "Foot and Mouth Disease"
    if "lumpy" in text or "lsd" in text:
        return "Lumpy Skin Disease"
    if "healthy" in text or "normal" in text:
        return "Healthy"
    return None


def _iter_benchmark() -> Iterable[Tuple[str, Path]]:
    """FMD-LSD field benchmark (Mendeley ggpwpscjvm), folder per class."""
    base = RAW_DIR / "fmd_lsd_benchmark"
    if not base.exists():
        return
    mapping = {
        "fmd": "Foot and Mouth Disease",
        "healthy fmd": "Healthy",
        "healthy lsd": "Healthy",
        "lsd": "Lumpy Skin Disease",
    }
    for path in sorted(base.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        label = mapping.get(path.parent.name.lower())
        if label:
            yield label, path


def _iter_loose_folders() -> Iterable[Tuple[str, Path]]:
    """Fallback for manually downloaded folder-per-class datasets."""
    if not RAW_DIR.exists():
        return
    for path in RAW_DIR.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        for parent in path.parents:
            label = map_class_name(parent.name)
            if label:
                yield label, path
                break


# ------------------------------------------------------------------- utilities
def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _load(data: bytes) -> Image.Image:
    image = Image.open(BytesIO(data))
    image = ImageOps.exif_transpose(image).convert("RGB")
    image.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    return image


def _collect() -> Tuple[Dict[str, List[Tuple[str, bytes]]], Dict[str, int]]:
    """Gather unique images per class from every real source."""
    buckets: Dict[str, List[Tuple[str, bytes]]] = {cls: [] for cls in IMAGE_CLASSES}
    seen: set[str] = set()
    duplicates = 0

    for label, path in _iter_fmd():
        if label not in buckets:
            continue
        data = path.read_bytes()
        digest = _sha256(data)
        if digest in seen:
            duplicates += 1
            continue
        seen.add(digest)
        buckets[label].append((path.name, data))

    for label, path in _iter_benchmark():
        data = path.read_bytes()
        digest = _sha256(data)
        if digest in seen:
            duplicates += 1
            continue
        seen.add(digest)
        buckets[label].append((path.name, data))

    archive = _lsd_archive()
    if archive is not None:
        with zipfile.ZipFile(archive) as zf:
            for label, info in _iter_lsd(zf):
                data = zf.read(info)
                digest = _sha256(data)
                if digest in seen:
                    duplicates += 1
                    continue
                seen.add(digest)
                buckets[label].append((Path(info.filename).name, data))

    if not any(buckets.values()):
        for label, path in _iter_loose_folders():
            if label not in buckets:
                continue
            data = path.read_bytes()
            digest = _sha256(data)
            if digest in seen:
                duplicates += 1
                continue
            seen.add(digest)
            buckets[label].append((path.name, data))

    stats = {cls: len(items) for cls, items in buckets.items()}
    stats["duplicates_removed"] = duplicates
    return buckets, stats


# ------------------------------------------------------------------ synthetic
def _coat_texture(rng: np.random.Generator, base: np.ndarray) -> np.ndarray:
    height, width, _ = base.shape
    noise = rng.normal(0.0, 6.0, size=(height, width, 1))
    low_freq = rng.normal(0.0, 1.0, size=(height // 16 + 1, width // 16 + 1, 1))
    low_freq = np.kron(low_freq, np.ones((16, 16, 1)))[:height, :width]
    low_freq = (low_freq - low_freq.mean()) * 8.0
    texture = noise + low_freq
    return np.clip(base.astype(np.float32) + texture, 0, 255).astype(np.uint8)


def _make_healthy(rng: np.random.Generator, image: Image.Image) -> Image.Image:
    draw = ImageDraw.Draw(image, "RGBA")
    width, height = image.size
    for _ in range(rng.integers(6, 14)):
        x = int(rng.integers(0, width))
        y = int(rng.integers(0, height))
        length = int(rng.integers(10, 45))
        draw.line([x, y, x + int(rng.integers(-4, 5)), y + length], fill=(90, 60, 40, 40), width=1)
    return image


def _make_fmd(rng: np.random.Generator, image: Image.Image) -> Image.Image:
    draw = ImageDraw.Draw(image, "RGBA")
    width, height = image.size
    for _ in range(rng.integers(5, 12)):
        x, y = int(rng.integers(15, width - 15)), int(rng.integers(15, height - 15))
        radius = int(rng.integers(5, 14))
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=(180, 40, 55, 190))
        draw.ellipse(
            [x - radius // 3, y - radius // 3, x + radius // 3, y + radius // 3],
            fill=(255, 235, 230, 170),
        )
    return image


def _make_lsd(rng: np.random.Generator, image: Image.Image) -> Image.Image:
    draw = ImageDraw.Draw(image, "RGBA")
    width, height = image.size
    for _ in range(rng.integers(16, 34)):
        x, y = int(rng.integers(10, width - 10)), int(rng.integers(10, height - 10))
        radius = int(rng.integers(4, 13))
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=(55, 35, 28, 235))
    return image


MAKERS = {
    "Healthy": _make_healthy,
    "Foot and Mouth Disease": _make_fmd,
    "Lumpy Skin Disease": _make_lsd,
}

BASE_COLORS = {
    "Healthy": (138, 94, 64),
    "Foot and Mouth Disease": (168, 118, 96),
    "Lumpy Skin Disease": (124, 84, 58),
}


def make_synthetic_image(cls: str, rng: np.random.Generator) -> Image.Image:
    size = 256
    base_color = np.array(BASE_COLORS[cls], dtype=np.float32)
    tint = rng.normal(0, 10, size=3)
    gradient = np.linspace(-14, 14, size).reshape(size, 1, 1)
    canvas = np.ones((size, size, 3), dtype=np.float32) * (base_color + tint)
    canvas = canvas + gradient
    canvas = _coat_texture(rng, canvas)
    image = Image.fromarray(canvas, "RGB")
    if rng.random() < 0.5:
        image = image.filter(ImageFilter.GaussianBlur(radius=float(rng.uniform(0.3, 1.1))))
    image = MAKERS[cls](rng, image)
    image = image.rotate(float(rng.uniform(-18, 18)), resample=Image.BILINEAR, expand=False)
    image = ImageEnhance.Brightness(image).enhance(float(rng.uniform(0.85, 1.15)))
    image = ImageEnhance.Contrast(image).enhance(float(rng.uniform(0.85, 1.15)))
    return image.resize((224, 224), Image.BILINEAR)


# ---------------------------------------------------------------------- output
def _reset_output() -> None:
    if IMAGES_DIR.exists():
        shutil.rmtree(IMAGES_DIR)
    for split in ("train", "val"):
        for cls in IMAGE_CLASSES:
            (IMAGES_DIR / split / IMAGE_CLASS_DIRS[cls]).mkdir(parents=True, exist_ok=True)


def _write(image: Image.Image, destination: Path) -> bool:
    try:
        image.save(destination, format="JPEG", quality=92)
        return True
    except Exception as exc:  # pragma: no cover - defensive
        print(f"[skip] {destination.name}: {exc}")
        return False


def build(val_fraction: float = 0.2, seed: int = 42, synthetic_per_class: int = 400) -> Dict:
    rng = random.Random(seed)
    buckets, stats = _collect()
    _reset_output()

    summary: Dict[str, Dict[str, int]] = {
        "train": {cls: 0 for cls in IMAGE_CLASSES},
        "val": {cls: 0 for cls in IMAGE_CLASSES},
    }
    synthetic_used: Dict[str, int] = {}

    for cls in IMAGE_CLASSES:
        items = buckets.get(cls, [])
        if not items:
            print(f"[warn] no real images for {cls}; generating synthetic fallback")
            n_rng = np.random.default_rng(seed)
            n_train = int(synthetic_per_class * (1 - val_fraction))
            n_val = synthetic_per_class - n_train
            for index in range(n_train):
                _write(
                    make_synthetic_image(cls, n_rng),
                    IMAGES_DIR / "train" / IMAGE_CLASS_DIRS[cls] / f"synthetic_{index:05d}.jpg",
                )
                summary["train"][cls] += 1
            for index in range(n_val):
                _write(
                    make_synthetic_image(cls, n_rng),
                    IMAGES_DIR / "val" / IMAGE_CLASS_DIRS[cls] / f"synthetic_{index:05d}.jpg",
                )
                summary["val"][cls] += 1
            synthetic_used[cls] = n_train + n_val
            continue

        rng.shuffle(items)
        n_val = max(1, int(round(len(items) * val_fraction)))
        split_items = {"val": items[:n_val], "train": items[n_val:]}
        for split, entries in split_items.items():
            target = IMAGES_DIR / split / IMAGE_CLASS_DIRS[cls]
            written = 0
            for name, data in entries:
                try:
                    image = _load(data)
                except Exception as exc:  # pragma: no cover - corrupt files
                    print(f"[skip] {name}: {exc}")
                    continue
                filename = f"{IMAGE_CLASS_DIRS[cls]}_{written:05d}.jpg"
                if _write(image, target / filename):
                    written += 1
            summary[split][cls] = written

    return {"counts": summary, "raw": stats, "synthetic": synthetic_used}


def main() -> None:
    parser = argparse.ArgumentParser(description="Build cattle image dataset")
    parser.add_argument("--val-fraction", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--synthetic-per-class",
        type=int,
        default=400,
        help="only used for classes with no real photographs",
    )
    args = parser.parse_args()

    print(f"Looking for real images under {RAW_DIR} ...")
    result = build(args.val_fraction, args.seed, args.synthetic_per_class)
    print(f"Unique real images per class: {result['raw']}")
    if result["synthetic"]:
        print(f"Synthetic fallback used: {result['synthetic']}")
    for split in ("train", "val"):
        print(f"{split}: {result['counts'][split]}")
    print(f"Dataset ready under {IMAGES_DIR}")


if __name__ == "__main__":
    main()
