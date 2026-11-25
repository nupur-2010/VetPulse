FROM python:3.11-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Runtime libraries required by Pillow / OpenCV / PyTorch.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 libglib2.0-0 libsm6 libxext6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch first so the requirements file resolves to it
# instead of pulling the multi-gigabyte CUDA wheels from PyPI.
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
