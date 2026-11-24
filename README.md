# Phoenix Backend

Backend for a sign-language translator: Russian Sign Language (camera) → text/speech, and speech → subtitles.

- **API contract for the frontend:** [`docs/API.md`](docs/API.md)
- **Implementation plan:** [`docs/superpowers/plans/2026-11-24-phoenix-backend-mvp.md`](docs/superpowers/plans/2026-11-24-phoenix-backend-mvp.md)

## How it works

| Feature | Endpoint | Engine |
|---|---|---|
| Sign → text (real time), Russian | `WS /ws/sign?lang=rsl` (JPEG frames in, words out) | Slovo `mvit32-2` ONNX (1000 RSL signs, ~64% top-1) via ONNX Runtime |
| Sign → text (real time), English | `WS /ws/sign?lang=asl` | SignFlow-A ONNX (2000 ASL/WLASL words, 63.3% top-1). **Non-commercial** (WLASL licence) |
| Speech → subtitles | `POST /api/stt` | Gemini (default when `GEMINI_API_KEY` is set; strong Uzbek) or faster-whisper; auto-fallback to Whisper |
| Signs → natural sentence (ru/en/uz) | `POST /api/sentence`, and `final` on `/ws/sign` | Gemini, falls back to plain words |
| Learn / Dictionary | `GET /api/dictionary` | Postgres, seeded from `data/rsl_classes.json` |
| History | `/api/history` | Postgres, scoped by `X-Client-Id` |
| Dataset collection | `POST /api/contributions` | video files on disk + Postgres row |

Text-to-speech happens in the browser (`speechSynthesis`), so there's no TTS endpoint.

## Run locally

```bash
python -m venv .venv && .venv/bin/pip install -e '.[dev]'
./scripts/download_models.sh          # sign models (~140-150 MB each) + Whisper; needs internet
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
| `SIGN_VARIANTS` | *(defaults from JSON)* | pick a model per language, e.g. `rsl=mvit16-4,asl=signflow-a`. Variants and their frame rates live in `config/sign_languages.json` |
| `SIGN_LANGUAGES_ENABLED` | *(all)* | e.g. `rsl` to load only Russian (saves RAM) |
| `WS_IDLE_TIMEOUT_S` / `MAX_WS_CONNECTIONS` | `30` / `100` | close silent sockets / cap live translations |
| `MAX_CONCURRENT_STT` | `2` | Whisper jobs at once; the rest queue |
| `LOG_LEVEL` | `INFO` | |
| `GEMINI_API_KEY` | *(empty)* | Google AI Studio key; put it in `.env` (git-ignored), never in code |
| `STT_ENGINE` | `auto` | `auto` = Gemini if a key is set, else Whisper; or force `gemini` / `whisper` |
| `GEMINI_MODELS` / `GEMINI_SENTENCE_MODELS` | see `.env.example` | models tried in order when one is overloaded (503) |
| `SMOOTH_BY_DEFAULT` | `true` | WS `final` includes a Gemini sentence unless the client sends `"smooth": false` |
| `SIGN_STRIDE` | `8` | frames between inferences (lower = faster reaction, more compute) |
| `SIGN_MIN_CONFIDENCE` | `0.5` | below this a prediction is ignored |
| `MAX_CONCURRENT_INFERENCES` | `4` | global cap on parallel sign inferences |
| `STT_MODEL` / `STT_DEVICE` / `STT_COMPUTE_TYPE` | `small` / `cpu` / `int8` | e.g. `large-v3` / `cuda` / `float16` on GPU |

## Sign languages and models

`config/sign_languages.json` lists each sign language, its label file, and its model variants. A model's name says its frame rate: `mvit32-2` = 32 frames, every 2nd frame of 30 fps video → 15 fps; `mvit16-4` → 7.5 fps. The server tells the client the rate in the WebSocket `ready` message and resamples whatever the client sends, so switching variants needs no frontend change. To add a language (e.g. Uzbek later): add a labels JSON in `data/`, an entry in the config, and the ONNX file.

ASL notes: SignFlow-A ships no label file. Its 2000 outputs are the WLASL-2000 glosses in **alphabetical order** (Python `sorted()`: "a", "a lot", "abdomen", …), not the `WLASL_v0.3.json` order. Verified on 34 labelled WLASL test clips with the real model: 25/34 top-1 (74%), 34/34 top-5; every miss was a near-synonym (same→similar, speak→talk). The `WLASL_v0.3.json` order scored 0/34. The model has no "no sign" class, so pauses are detected only by confidence (`min_confidence` 0.6 for ASL).

## Deploy notes

- **Speed:** on a laptop CPU one 32-frame inference takes ~8 s (measured), so CPU is not real-time. Use a GPU host, or `SIGN_VARIANTS=rsl=mvit16-4` (half the frames) for a CPU demo.

- One uvicorn worker per machine (models are loaded once per process). Scale by adding machines.
- CPU works for demos, but MViTv2 on 32 frames is heavy; for several simultaneous users use a GPU host and install `onnxruntime-gpu` (the recognizer picks CUDA automatically). If the server falls behind it drops old frames and sends an `overloaded` notice rather than lagging.
- Tables are created on startup (`create_all`); migrations (Alembic) come later.

## Licenses

Slovo dataset and models: CC BY-SA 4.0, © ai-forever (Kapitanov et al., "Slovo: Russian Sign Language Dataset", 2023). Attribute them in the product's About page. Whisper: MIT.
