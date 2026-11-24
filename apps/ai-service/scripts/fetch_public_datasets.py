"""Download public cattle-disease datasets used to train the VetPulse models.

Every source here is openly licensed and needs no API key. Downloads are
resumable and verified against the published checksum, so re-running the
script after an interruption is safe.

Usage
-----
    python scripts/fetch_public_datasets.py --list
    python scripts/fetch_public_datasets.py --name fmd_cattle
    python scripts/fetch_public_datasets.py --all
    python scripts/fetch_public_datasets.py --all --verify-only
"""

from __future__ import annotations

import argparse
import hashlib
import shutil
import sys
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = SERVICE_ROOT / "data" / "raw"

USER_AGENT = "VetPulseDatasetFetcher/1.0 (+local research use)"

DATASETS: dict[str, dict] = {
    "fmd_cattle": {
        "title": "FMD Cattle (Zenodo 7779246)",
        "url": "https://zenodo.org/api/records/7779246/files/FMD_Cattle.zip/content",
        "archive": "FMD_Cattle.zip",
        "size": 191_144_108,
        "md5": "79185643478182c586a9c5f14e01cdd4",
        "license": "CC BY 4.0",
        "extract_to": "fmd_cattle",
        "source": "https://zenodo.org/records/7779246",
    },
    "lsd_datahub": {
        "title": "Lumpy Skin Disease DataHub (Zenodo 11003967)",
        "url": "https://zenodo.org/api/records/11003967/files/LumpySkinDisease_DataHub.zip/content",
        "archive": "LumpySkinDisease_DataHub.zip",
        "size": 511_548_905,
        "md5": "81d77de795a5aaf5c446b872335f64d5",
        "license": "CC BY 4.0",
        "extract_to": "lsd_datahub",
        "source": "https://zenodo.org/records/11003967",
    },
    "fmd_lsd_benchmark": {
        "title": "FMD-LSD field benchmark (Mendeley ggpwpscjvm)",
        "url": (
            "https://data.mendeley.com/public-files/datasets/ggpwpscjvm/files/"
            "18cdf313-82c9-4ff0-a887-0028519ac449/file_downloaded"
        ),
        "archive": "FMD_LSD.zip",
        "size": 467_523_974,
        "md5": None,
        "sha256": "f296b2548cca807b4a7fe662823cdd9d0ae41b4f5f1fd2d4cc17aea25d810fcf",
        "license": "CC BY 4.0",
        "extract_to": "fmd_lsd_benchmark",
        "source": "https://data.mendeley.com/datasets/ggpwpscjvm/1",
    },
    "cattle_disease_matrix_train": {
        "title": "93-signal cattle disease matrix - Training (HF scorder96)",
        "url": (
            "https://huggingface.co/datasets/scorder96/cattle-disease-prediction/"
            "resolve/main/Training.csv"
        ),
        "archive": "Training.csv",
        "size": 415_772,
        "sha256": "090a7000ac715f7b395575bc099309ebc3f528c3db79373f33dc408c923fba74",
        "license": "MIT",
        "subdir": "cattle_disease_prediction",
        "extract_to": None,
        "source": "https://huggingface.co/datasets/scorder96/cattle-disease-prediction",
    },
    "cattle_disease_matrix_test": {
        "title": "93-signal cattle disease matrix - Testing (HF scorder96)",
        "url": (
            "https://huggingface.co/datasets/scorder96/cattle-disease-prediction/"
            "resolve/main/Testing.csv"
        ),
        "archive": "Testing.csv",
        "size": 6_459,
        "sha256": "07119dccedf9712405ea62279df011f7663ef7142b9493a3318c9f555c00a5ce",
        "license": "MIT",
        "subdir": "cattle_disease_prediction",
        "extract_to": None,
        "source": "https://huggingface.co/datasets/scorder96/cattle-disease-prediction",
    },
}


def _hash_file(path: Path, algo: str) -> str:
    h = hashlib.new(algo)
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _already_complete(path: Path, spec: dict) -> bool:
    if not path.exists():
        return False
    expected_size = spec.get("size")
    if expected_size and path.stat().st_size != expected_size:
        return False
    return True


def verify(path: Path, spec: dict) -> bool:
    if not path.exists():
        print(f"  missing: {path}")
        return False
    size = path.stat().st_size
    if spec.get("size") and size != spec["size"]:
        print(f"  size mismatch: {size} != {spec['size']}")
        return False
    for algo in ("md5", "sha256"):
        expected = spec.get(algo)
        if not expected:
            continue
        actual = _hash_file(path, algo)
        if actual != expected:
            print(f"  {algo} mismatch: {actual} != {expected}")
            return False
        print(f"  {algo} ok")
    return True


def download(spec: dict, dest_dir: Path, retries: int = 6) -> Path:
    dest_dir = dest_dir / spec["subdir"] if spec.get("subdir") else dest_dir
    dest_dir.mkdir(parents=True, exist_ok=True)
    target = dest_dir / spec["archive"]

    if _already_complete(target, spec) and verify(target, spec):
        print(f"[skip] {spec['title']} already downloaded")
        return target

    attempt = 0
    while attempt < retries:
        attempt += 1
        have = target.stat().st_size if target.exists() else 0
        if spec.get("size") and have > spec["size"]:
            target.unlink()
            have = 0
        headers = {"User-Agent": USER_AGENT}
        if have:
            headers["Range"] = f"bytes={have}-"
        req = urllib.request.Request(spec["url"], headers=headers)
        print(
            f"[get ] {spec['title']} attempt {attempt}/{retries}"
            + (f" (resume at {have / 1e6:.1f} MB)" if have else "")
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                status = resp.status
                if have and status == 200:
                    have = 0
                    mode = "wb"
                else:
                    mode = "ab" if have else "wb"
                total = spec.get("size") or 0
                with target.open(mode) as out:
                    last = time.time()
                    start = time.time()
                    written = have
                    while True:
                        chunk = resp.read(1 << 16)
                        if not chunk:
                            break
                        out.write(chunk)
                        written += len(chunk)
                        now = time.time()
                        if now - last >= 5:
                            rate = (written - have) / max(now - start, 1e-6) / 1024
                            pct = f"{written / total * 100:5.1f}%" if total else "  ?  "
                            print(
                                f"        {pct} {written / 1e6:7.1f} MB  {rate:6.0f} KB/s",
                                flush=True,
                            )
                            last = now
            if spec.get("size") and target.stat().st_size != spec["size"]:
                raise IOError(
                    f"incomplete: {target.stat().st_size} of {spec['size']} bytes"
                )
            if verify(target, spec):
                print(f"[ok  ] {spec['title']} -> {target}")
                return target
            raise IOError("checksum verification failed")
        except (urllib.error.URLError, IOError, OSError) as exc:
            print(f"  attempt failed: {exc}")
            time.sleep(min(5 * attempt, 30))

    raise SystemExit(f"could not download {spec['title']} after {retries} attempts")


def extract(archive: Path, spec: dict) -> Path:
    if not spec.get("extract_to") or not zipfile.is_zipfile(archive):
        return archive
    out_dir = RAW_DIR / spec["extract_to"]
    if out_dir.exists() and any(out_dir.iterdir()):
        print(f"[skip] already extracted -> {out_dir}")
        return out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"[unzip] {archive.name} -> {out_dir}")
    with zipfile.ZipFile(archive) as zf:
        zf.extractall(out_dir)
    return out_dir


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--name", choices=sorted(DATASETS), help="dataset key")
    parser.add_argument("--all", action="store_true", help="fetch every dataset")
    parser.add_argument("--list", action="store_true", help="show the registry")
    parser.add_argument("--verify-only", action="store_true")
    parser.add_argument("--no-extract", action="store_true")
    parser.add_argument(
        "--dest", type=Path, default=RAW_DIR, help="download directory"
    )
    args = parser.parse_args()

    if args.list:
        for key, spec in sorted(DATASETS.items()):
            print(
                f"{key:22} {spec['size'] / 1e6:7.1f} MB  {spec['license']:10} "
                f"{spec['title']}\n{'':22} {spec['source']}"
            )
        return 0

    keys = sorted(DATASETS) if args.all else [args.name] if args.name else []
    if not keys:
        parser.error("choose --name, --all, or --list")

    if args.verify_only:
        ok = True
        for key in keys:
            spec = DATASETS[key]
            path = args.dest / spec["subdir"] if spec.get("subdir") else args.dest
            path = path / spec["archive"]
            print(f"verify {key}: {path}")
            ok &= verify(path, spec)
        return 0 if ok else 1

    for key in keys:
        spec = DATASETS[key]
        archive = download(spec, args.dest)
        if not args.no_extract:
            extract(archive, spec)
    return 0


if __name__ == "__main__":
    sys.exit(main())
