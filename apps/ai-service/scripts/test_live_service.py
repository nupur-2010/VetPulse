"""Live HTTP smoke test: starts uvicorn + a static image server, then verifies
the exact payload shape the Node API sends (including image_urls).

Usage:
    python scripts/test_live_service.py
"""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
API_PORT = 8011
IMAGE_PORT = 8899


def wait_for(url: str, timeout: float = 60.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            response = httpx.get(url, timeout=1.0)
            if response.status_code < 500:
                return
        except Exception:
            pass
        time.sleep(0.5)
    raise TimeoutError(f"Service did not start: {url}")


def main() -> None:
    api = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(API_PORT),
        ],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    images = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "http.server",
            str(IMAGE_PORT),
            "--bind",
            "127.0.0.1",
            "--directory",
            str(ROOT / "data" / "images" / "val"),
        ],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    try:
        wait_for(f"http://127.0.0.1:{API_PORT}/health")
        wait_for(f"http://127.0.0.1:{IMAGE_PORT}/")
        print("Services are up.")

        node_payload = {
            "symptoms": ["Fever", "Cough", "Nasal discharge", "Difficulty breathing"],
            "temperature": 40.7,
            "symptom_duration": "2-3 days",
            "severity": "moderate",
        }
        response = httpx.post(
            f"http://127.0.0.1:{API_PORT}/predict", json=node_payload, timeout=30.0
        )
        response.raise_for_status()
        result = response.json()
        assert result["predicted_disease"] == "Bovine Respiratory Disease", result
        assert result["used_image"] is False
        print(
            "[PASS] Node-style symptom payload ->",
            result["predicted_disease"],
            result["confidence"],
        )

        image_url = (
            f"http://127.0.0.1:{IMAGE_PORT}/Lumpy_Skin_Disease/"
            "Lumpy_Skin_Disease_00000.jpg"
        )
        fused_payload = {
            "symptoms": ["Skin nodules", "Swelling", "Fever"],
            "temperature": 40.1,
            "severity": "severe",
            "image_urls": [image_url],
        }
        response = httpx.post(
            f"http://127.0.0.1:{API_PORT}/predict", json=fused_payload, timeout=30.0
        )
        response.raise_for_status()
        result = response.json()
        assert result["used_image"] is True, result
        assert result["predicted_disease"] == "Lumpy Skin Disease", result
        print(
            "[PASS] image_url fusion ->",
            result["predicted_disease"],
            result["confidence"],
            result["fusion_weights"],
        )
        print("Live service checks passed.")
    finally:
        for process in (api, images):
            process.terminate()
        for process in (api, images):
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()


if __name__ == "__main__":
    main()
