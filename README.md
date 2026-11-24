# Phoenix Backend

Backend for a sign-language translator: Russian Sign Language (camera) → text/speech, and speech → subtitles.

- **API contract for the frontend:** [`docs/API.md`](docs/API.md)
- **Implementation plan:** [`docs/superpowers/plans/2026-11-24-phoenix-backend-mvp.md`](docs/superpowers/plans/2026-11-24-phoenix-backend-mvp.md)

## How it works

| Feature | Endpoint | Engine |
|---|---|---|
| Sign → text (real time) | `WS /ws/sign` (JPEG frames in, words out) | Slovo `mvit32-2` ONNX (1000 RSL signs, ~64% top-1) via ONNX Runtime |
| Speech → subtitles | `POST /api/stt` | faster-whisper (`small` by default; uz/ru/en/auto) |
| Learn / Dictionary | `GET /api/dictionary` | Postgres, seeded from `data/rsl_classes.json` |
| History | `/api/history` | Postgres, scoped by `X-Client-Id` |
| Dataset collection | `POST /api/contributions` | video files on disk + Postgres row |

Text-to-speech happens in the browser (`speechSynthesis`), so there's no TTS endpoint.

## Run locally

```bash
python -m venv .venv && .venv/bin/pip install -e '.[dev]'
./scripts/download_models.sh          # Slovo ONNX (~140 MB) + Whisper; needs internet
cp .env.example .env                  # or leave DATABASE_URL unset to use SQLite
.venv/bin/uvicorn app.main:app --reload
open http://localhost:8000/docs
```

Without model files the server still starts; `/api/health` reports `"missing"` for that model and the WebSocket replies `model_unavailable`.

Try the sign WebSocket with a video of someone signing:

```bash
.venv/bin/python scripts/smoke_ws.py --video sign.mp4
```

## Docker

```bash
docker compose up --build    # api on :8000 + Postgres 16; models download on first boot into a volume
```

## Tests

```bash
.venv/bin/pytest                                   # SQLite, fake ONNX model, fake STT — no network
TEST_DATABASE_URL=postgresql+asyncpg://user@host/db .venv/bin/pytest   # same suite on Postgres
```

## Configuration (env vars)

| var | default | notes |
|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:///./phoenix.db` | use `postgresql+asyncpg://…` in prod |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | comma-separated frontend origins |
| `SIGN_MODEL_PATH` / `SIGN_MODEL_NAME` | `models/mvit32-2.onnx` / `mvit32-2` | any Slovo ONNX (mvit16-4, mvit48-2, swin…, resnet…) |
| `SIGN_STRIDE` | `8` | frames between inferences (lower = faster reaction, more compute) |
| `SIGN_MIN_CONFIDENCE` | `0.5` | below this a prediction is ignored |
| `MAX_CONCURRENT_INFERENCES` | `4` | global cap on parallel sign inferences |
| `STT_MODEL` / `STT_DEVICE` / `STT_COMPUTE_TYPE` | `small` / `cpu` / `int8` | e.g. `large-v3` / `cuda` / `float16` on GPU |

## Deploy notes

- One uvicorn worker per machine (models are loaded once per process). Scale by adding machines.
- CPU works for demos, but MViTv2 on 32 frames is heavy; for several simultaneous users use a GPU host and install `onnxruntime-gpu` (the recognizer picks CUDA automatically). If the server falls behind it drops old frames and sends an `overloaded` notice rather than lagging.
- Tables are created on startup (`create_all`); migrations (Alembic) come later.

## Licenses

Slovo dataset and models: CC BY-SA 4.0, © ai-forever (Kapitanov et al., "Slovo: Russian Sign Language Dataset", 2023). Attribute them in the product's About page. Whisper: MIT.
