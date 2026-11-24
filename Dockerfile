FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends curl ffmpeg libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY pyproject.toml ./
COPY app ./app
RUN pip install .
COPY data ./data
COPY scripts ./scripts

ENV SIGN_MODEL_PATH=/srv/models/mvit32-2.onnx UPLOAD_DIR=/srv/uploads HF_HOME=/srv/models/hf
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD curl -fs http://localhost:8000/api/health || exit 1
CMD ["sh", "-c", "[ -s \"$SIGN_MODEL_PATH\" ] || PYTHON=python ./scripts/download_models.sh || true; exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1"]
