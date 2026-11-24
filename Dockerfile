FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends curl ffmpeg libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY pyproject.toml ./
COPY app ./app
RUN pip install .
COPY data ./data
COPY config ./config
COPY scripts ./scripts

ENV UPLOAD_DIR=/srv/uploads HF_HOME=/srv/models/hf
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD curl -fs http://localhost:8000/api/health || exit 1
# models/ is a volume: download on first boot (no-op later), then serve.
# --ws-max-size caps one WebSocket message at 1 MB (frames are <= 300 KB).
CMD ["sh", "-c", "python scripts/download_models.py || true; exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --ws-max-size 1048576 --timeout-graceful-shutdown 10"]
