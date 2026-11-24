# Phoenix Backend MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A FastAPI backend that turns a live camera stream of Russian Sign Language into text (Slovo pretrained ONNX model), turns speech audio into subtitles (Whisper), and serves dictionary/history/contribution data for the Learn, History and Settings pages.

**Architecture:** One FastAPI app. `/ws/sign` receives JPEG frames, a per-connection `SignStream` resamples and buffers them, and a shared `SignRecognizer` (ONNX Runtime) classifies sliding 32-frame windows into Slovo glosses. `POST /api/stt` runs faster-whisper. SQLAlchemy async stores dictionary entries, history and contributions (Postgres in prod, SQLite in tests). Heavy models load once at startup; inference runs in a thread pool so the event loop stays free.

**Tech Stack:** Python 3.12+, FastAPI, uvicorn, pydantic-settings, SQLAlchemy 2 async (asyncpg / aiosqlite), onnxruntime, opencv-python-headless, numpy, faster-whisper, pytest + pytest-asyncio + httpx, Docker Compose.

**Spec:** `docs/API.md` (the API contract shared with the frontend). Context: coordinator brief in project thread (Slovo dataset, RSL first, 1-week MVP, no avatar).

## Global Constraints

- The wire format in `docs/API.md` is fixed: field names, message types, error codes, status codes and limits there are exact.
- Model input: tensor `float32[1, 1, 3, T, 224, 224]`, `T = session.get_inputs()[0].shape[3]` (32 for `mvit32-2`). Frames: BGR→RGB, letterbox to 224×224 with pad value 114, then `(x - mean) / std` with `mean = [123.675, 116.28, 103.53]`, `std = [58.395, 57.12, 57.375]` (0–255 scale, no /255), HWC→CHW. Copied from Slovo `demo.py`.
- Model native rate: 15 fps (Slovo mvit32-2 = every 2nd frame of ~30 fps video). Server resamples client `fps` to 15.
- Class list: `data/rsl_classes.json`, 1001 strings, index 1000 is `"---"` (no sign — never emitted).
- Limits: JPEG frame ≤ 300 KB; STT audio ≤ 10 MB and ≤ 60 s; contribution video ≤ 20 MB; dictionary `limit` 1–200.
- Model weights are NOT in git. Paths come from env (`SIGN_MODEL_PATH`, `STT_MODEL`). If missing, app still starts and reports `"missing"` in `/api/health`.
- Tests must never need real weights or network: sign tests use a generated ONNX model (`tests/fake_model.py`), STT tests use a fake engine.
- All config via `app/config.py` `Settings` (env prefix none, `.env` supported).

## Review Focus

1. Client sends frames faster than inference can run (slow CPU) → server must drop old frames and send one `overloaded` error, never grow memory unbounded or lag minutes behind. Test in Task 2 (`test_stream_drops_when_backlog_exceeds_limit`).
2. Garbage binary on the socket (PNG, truncated JPEG, 1 MB blob) → `bad_frame` error, socket stays open, next valid frame still works. Test in Task 5.
3. Client sends `stop` before any window was full (signed < 2 s) → `final` with empty `signs` and `history_id: null`, no DB row. Test in Task 5.
4. Model emits the same gloss on overlapping windows → only one `sign` message; low-confidence and `"---"` predictions are suppressed. Test in Task 2.
5. STT gets silence or an unsupported file type → 200 with `text: ""` for silence, 415 for non-audio. Test in Task 3.

---

## File Structure

```
app/
  main.py            create_app(), lifespan (load models, create tables, seed dictionary), routers, CORS
  config.py          Settings
  errors.py          ApiError + exception handlers producing {"error":{code,message}}
  deps.py            get_db(), require_client_id(), optional_client_id()
  db.py              engine/session factory, Base, init_db()
  models.py          DictionaryEntry, HistoryItem, Contribution (SQLAlchemy)
  sign/
    classes.py       load_classes(), categorize()
    preprocess.py    decode_jpeg(), letterbox(), to_model_frame()
    recognizer.py    SignRecognizer, Prediction
    stream.py        SignStream (resample, buffer, sliding window, dedup)
    ws.py            /ws/sign router
  stt/
    engine.py        SttEngine protocol, FasterWhisperEngine, SttResult
    router.py        POST /api/stt
  api/
    meta.py          /api/health, /api/languages
    dictionary.py    /api/dictionary
    history.py       /api/history (+ save_history() helper used by ws and stt)
    contributions.py /api/contributions
data/rsl_classes.json
scripts/download_models.sh
tests/  conftest.py, fake_model.py, test_*.py
Dockerfile, docker-compose.yml, .env.example, README.md, pyproject.toml
```

---

### Task 1: Scaffold, config, DB models, meta endpoints

**Files:** Create `pyproject.toml`, `app/__init__.py`, `app/main.py`, `app/config.py`, `app/errors.py`, `app/deps.py`, `app/db.py`, `app/models.py`, `app/api/meta.py`, `app/sign/classes.py`, `tests/conftest.py`, `tests/test_meta.py`, `.gitignore`, `.env.example`.

**Interfaces (Produces):**
- `Settings` fields: `database_url: str = "sqlite+aiosqlite:///./phoenix.db"`, `cors_origins: str = "http://localhost:3000,http://localhost:5173"`, `sign_model_path: str = "models/mvit32-2.onnx"`, `sign_model_name: str = "mvit32-2"`, `sign_classes_path: str = "data/rsl_classes.json"`, `sign_target_fps: int = 15`, `sign_stride: int = 8`, `sign_min_confidence: float = 0.5`, `sign_max_backlog_frames: int = 64`, `stt_model: str = "small"`, `stt_device: str = "cpu"`, `stt_compute_type: str = "int8"`, `upload_dir: str = "uploads"`, `load_models: bool = True`. `get_settings() -> Settings` (lru_cache).
- `class ApiError(Exception): __init__(self, status: int, code: str, message: str)`; handlers also map `RequestValidationError` → 400 `invalid_request`.
- `get_db() -> AsyncIterator[AsyncSession]`; `require_client_id(x_client_id: str | None = Header(None)) -> uuid.UUID` raises `ApiError(400,"invalid_client_id",...)`; `parse_client_id(raw: str | None) -> uuid.UUID | None`.
- Models: `DictionaryEntry(id:int pk, lang:str, text:str, category:str, class_index:int, translation_en:str|None, translation_uz:str|None, video_url:str|None)`, unique (lang, class_index); `HistoryItem(id, client_id: Uuid indexed, direction:str, lang:str, text:str, signs: JSON list|None, created_at: datetime tz default now)`; `Contribution(id, client_id, entry_id FK, file_path:str, status:str="pending", created_at)`.
- `init_db(engine)` creates tables; `seed_dictionary(session, classes: list[str], lang="rsl")` inserts entries for every class except `"---"` if table empty for that lang (idempotent).
- `load_classes(path) -> list[str]`; `categorize(text) -> Literal["letter","word","phrase"]` (len==1 → letter; contains space → phrase; else word).
- `create_app(settings: Settings | None = None) -> FastAPI`; `app.state.sign_recognizer` and `app.state.stt_engine` set to loaded objects or `None`. Loading wrapped so a missing file logs a warning and leaves `None`. Tasks 2–4 provide the loaders; in Task 1 both stay `None` and lifespan calls hooks `load_sign_recognizer(settings)` / `load_stt_engine(settings)` imported lazily, each returning `None` until implemented.
- `tests/conftest.py`: fixture `settings` (tmp sqlite file, `load_models=False`, tmp upload dir), `app`, `client` (httpx `AsyncClient` over `ASGITransport`, lifespan run via `asgi-lifespan` or `app.router.lifespan_context`), `client_id` (fresh uuid str).

- [ ] Step 1: Write `tests/test_meta.py`: `test_health_reports_missing_models` (GET /api/health → 200, `sign_model == "missing"`, `stt_model == "missing"`, `status == "ok"`); `test_languages_lists_rsl` (`sign_languages[0] == {"code":"rsl","name":"Русский жестовый язык","classes":1000,"available":False}` when model missing; `speech_languages` codes `["uz","ru","en"]`); `test_categorize` (`"А"`→letter, `"привет"`→word, `"в то время как"`→phrase); `test_seed_dictionary_is_idempotent` (seed twice → 1000 rows); `test_unknown_client_id_error_shape` (call a tiny test-only route using `require_client_id` with `X-Client-Id: nope` → 400 and body `{"error":{"code":"invalid_client_id", ...}}`).
- [ ] Step 2: Run `pytest tests/test_meta.py -v` → FAIL (import errors).
- [ ] Step 3: Implement the files above. `classes` count for `/api/languages` = number of non-`"---"` classes.
- [ ] Step 4: Run `pytest -v` → PASS.
- [ ] Step 5: Commit `feat: scaffold app, config, db models, meta endpoints`.

---

### Task 2: Sign recognition core (preprocess, recognizer, stream)

**Files:** Create `app/sign/preprocess.py`, `app/sign/recognizer.py`, `app/sign/stream.py`, `tests/fake_model.py`, `tests/test_sign_core.py`. Modify `app/main.py` only to implement `load_sign_recognizer`.

**Interfaces:**
- Consumes: `Settings` (Task 1), `load_classes`.
- Produces:
  - `decode_jpeg(data: bytes) -> np.ndarray` (BGR uint8 HxWx3); raises `BadFrame(ValueError)` if not decodable, not starting with `b"\xff\xd8"`, or `len(data) > 300_000`.
  - `letterbox(img, size=224) -> np.ndarray` — Slovo `resize()` semantics, pad 114.
  - `to_model_frame(img_bgr) -> np.ndarray` float32 `[3,224,224]`, normalized per Global Constraints.
  - `@dataclass Prediction: text: str; confidence: float; alternatives: list[tuple[str, float]]` (top-3 excluding the winner).
  - `class SignRecognizer: __init__(self, model_path: str, classes: list[str], name: str)`; property `window: int` (from input shape dim 3); `predict(frames: list[np.ndarray]) -> Prediction` (len must equal `window`; stacks to `[1,1,3,T,224,224]`; applies softmax unless outputs already sum to ~1 and are in [0,1]). Thread-safe for concurrent `predict` calls (ORT sessions are).
  - `class SignStream: __init__(self, recognizer: SignRecognizer, client_fps: int, target_fps: int = 15, stride: int = 8, min_confidence: float = 0.5, max_backlog: int = 64)`; `add_frame(frame: np.ndarray) -> None` (keeps frame only if the resampler selects it: accumulate `target_fps/client_fps`, keep when ≥1; if client_fps ≤ target keep all); `ready() -> bool` (buffer ≥ window and stride frames have arrived since last inference); `next_window() -> list[np.ndarray]` (the latest `window` frames; marks stride consumed); `accept(pred: Prediction) -> SignEvent | None` (returns None for `"---"`, confidence < min_confidence, or same text as last emitted; else appends to phrase); `dropped_since_last_check() -> int`; `phrase -> list[str]`; `reset()`.
  - `@dataclass SignEvent: text, confidence, alternatives, phrase: str, index: int`.
  - Backlog rule: buffer is a deque of maxlen `window + max_backlog`; frames beyond it are dropped and counted.
  - `load_sign_recognizer(settings) -> SignRecognizer | None`.
- `tests/fake_model.py`: `make_fake_model(path, window=32, num_classes=1001, winner: int = 5) -> str` builds an ONNX graph with input `float32[1,1,3,window,224,224]` → output `float32[1,num_classes]` logits whose argmax is `winner` (e.g. ReduceMean over input + constant bias vector). Uses `onnx.helper`.

- [ ] Step 1: Write tests: `test_decode_jpeg_rejects_png_and_oversize`; `test_letterbox_shape_and_padding` (640×480 input → 224×224, top rows == 114); `test_to_model_frame_normalization` (all-114 grey image → channel values ≈ `(114-mean)/std`); `test_recognizer_window_from_model` (fake model window=32 → `recognizer.window == 32`); `test_recognizer_predicts_winner` (winner=5 → `text == classes[5]`, `0 < confidence ≤ 1`, 3 alternatives); `test_stream_resamples_30fps_to_15` (60 frames at client_fps=30 → 30 kept); `test_stream_dedups_and_filters` (accept same text twice → second None; `"---"` → None; confidence 0.2 → None; new text → event index 1, phrase "a b"); `test_stream_drops_when_backlog_exceeds_limit` (window 32, max_backlog 8, add 100 frames without consuming → buffer len 40, dropped == 60).
- [ ] Step 2: Run `pytest tests/test_sign_core.py -v` → FAIL.
- [ ] Step 3: Implement.
- [ ] Step 4: Run → PASS. Also time one `predict` on the fake model and print it (sanity only).
- [ ] Step 5: Commit `feat: sign recognition core with ONNX recognizer and streaming buffer`.

---

### Task 3: Speech-to-text

**Files:** Create `app/stt/__init__.py`, `app/stt/engine.py`, `app/stt/router.py`, `tests/test_stt.py`. Modify `app/main.py` to include router and implement `load_stt_engine`.

**Interfaces:**
- Consumes: `ApiError`, `get_db`, `parse_client_id`, `save_history` (Task 4; until merged, import inside the handler — if `save_history=true` call `app.api.history.save_history`).
- Produces:
  - `@dataclass SttSegment(start: float, end: float, text: str)`; `@dataclass SttResult(text: str, language: str, duration: float, segments: list[SttSegment])`.
  - `class SttEngine(Protocol): def transcribe(self, path: str, language: str | None) -> SttResult`.
  - `class FasterWhisperEngine: __init__(model: str, device: str, compute_type: str)`; `transcribe` uses `vad_filter=True`, `beam_size=1`; joins segment texts with spaces, stripped.
  - `load_stt_engine(settings) -> SttEngine | None` (catches any error → None).
  - Router: `POST /api/stt` per API.md §4. Validates content-type prefix `audio/` or `video/webm` or extension in {webm, ogg, wav, mp3, m4a} → else 415; size > 10 MB → 413; `language` not in {uz,ru,en} → 400; engine None → 503 `model_unavailable`; `duration > 60` → 400. Writes upload to a temp file, runs `transcribe` via `run_in_threadpool`, deletes temp file.
- Tests inject a `FakeSttEngine` via `app.state.stt_engine`.

- [ ] Step 1: Tests: `test_stt_returns_text` (fake returns "Salom" uz → 200 body matches API.md shape, `history_id is None`); `test_stt_saves_history_when_asked` (save_history=true + X-Client-Id → `history_id` int, GET /api/history shows `speech_to_text`) — mark `xfail` if Task 4 not merged yet, remove xfail at integration; `test_stt_rejects_non_audio` (text/plain → 415); `test_stt_too_large` (11 MB → 413); `test_stt_bad_language` (`language=de` → 400); `test_stt_no_engine` (engine None → 503 `model_unavailable`); `test_stt_silence_returns_empty_text` (fake returns "" → 200, `text == ""`).
- [ ] Step 2: Run → FAIL. Step 3: implement. Step 4: Run → PASS.
- [ ] Step 5: Commit `feat: speech-to-text endpoint with faster-whisper`.

---

### Task 4: Dictionary, history, contributions REST

**Files:** Create `app/api/dictionary.py`, `app/api/history.py`, `app/api/contributions.py`, `tests/test_dictionary.py`, `tests/test_history.py`, `tests/test_contributions.py`. Modify `app/main.py` to include routers.

**Interfaces:**
- Consumes: Task 1 models, deps, `ApiError`.
- Produces:
  - `async def save_history(db: AsyncSession, client_id: uuid.UUID, direction: Literal["sign_to_text","speech_to_text"], lang: str, text: str, signs: list[str] | None) -> int` (commits, returns id).
  - Endpoints exactly per API.md §5, §6, §7. Dictionary `q` uses `ilike` (note: SQLite `lower()` doesn't fold Cyrillic — match on `func.lower` on Postgres; in SQLite tests search with exact-case Cyrillic and ASCII; document). Dictionary `translations.ru = text`. History ordered `created_at desc, id desc`. Contributions stored to `{upload_dir}/contributions/{uuid4}.{ext}`, accepts `video/webm`, `video/mp4` only (415 otherwise), 413 over 20 MB, `consent` must be true.

- [ ] Step 1: Tests: dictionary — `test_list_paginates` (limit=10 → 10 items, total 1000), `test_search` (`q=привет` → item text "привет"), `test_category_filter` (`category=letter` → total 33), `test_get_by_id_and_404`, `test_limit_bounds` (limit=500 → 400 `invalid_request`). history — `test_history_scoped_to_client` (save for A, GET as B → total 0), `test_history_newest_first_and_filter`, `test_delete_one_and_all` (204, then gone; deleting another client's id → 404), `test_history_requires_client_id` (no header → 400). contributions — `test_contribution_created` (201, file exists on disk, status pending), `test_contribution_requires_consent` (400), `test_contribution_unknown_entry` (404), `test_contribution_wrong_type` (415).
- [ ] Step 2: Run → FAIL. Step 3: implement. Step 4: Run → PASS.
- [ ] Step 5: Commit `feat: dictionary, history and contributions endpoints`.

---

### Task 5: `/ws/sign` endpoint (integration of Task 2 + 4)

**Files:** Create `app/sign/ws.py`, `tests/test_ws_sign.py`. Modify `app/main.py`.

**Interfaces:** Consumes `SignStream`, `SignRecognizer`, `decode_jpeg`, `to_model_frame`, `BadFrame`, `save_history`, `parse_client_id`.

Behaviour per API.md §3. Per connection: validate `client_id` and `lang` before `accept()`? — accept first, send `error`, then close with 4400/4503 (browsers can't read pre-accept rejections). After `start`, binary frames → decode + preprocess in threadpool → `stream.add_frame`. When `stream.ready()` and no inference is in flight for this connection, launch `asyncio.create_task(run_in_threadpool(recognizer.predict, window))`; on completion `accept()` → send `sign`. At most one in-flight inference per connection; a global `asyncio.Semaphore(settings.max_concurrent_inferences=4)` (add to Settings) bounds total. If `dropped_since_last_check() > 0`, send one `overloaded` error at most every 5 s. `stop` → await in-flight inference, send `final`, save history if `save_history` and phrase non-empty, reset stream. `reset` → reset without saving. Invalid JSON / unknown type / binary before start → `bad_message`.

- [ ] Step 1: Tests (Starlette `TestClient` websocket; app with fake model winner=classes index of "привет", window 32): `test_ws_rejects_bad_client_id` (error `invalid_client_id`, close code 4400); `test_ws_rejects_unknown_lang`; `test_ws_model_missing` (recognizer None → `model_unavailable`, 4503); `test_ws_full_flow` (start fps=15 → ready with window_frames 32; send 40 JPEGs → receive `sign` text "привет" index 0; stop → final text "привет", `history_id` int; GET /api/history shows it); `test_ws_bad_frame_keeps_socket` (send PNG → `bad_frame`; then valid flow still works); `test_ws_stop_before_window` (start, 5 frames, stop → final signs [] history_id null); `test_ws_frame_before_start` → `bad_message`.
- [ ] Step 2: FAIL. Step 3: implement. Step 4: PASS (full suite).
- [ ] Step 5: Commit `feat: realtime sign recognition websocket`.

---

### Task 6: Packaging, deploy and docs

**Files:** Create `Dockerfile`, `docker-compose.yml` (api + postgres:16, volume for models/uploads), `scripts/download_models.sh` (curl Slovo `mvit32-2.onnx` from the URL in README into `models/`; pre-download whisper `small` by running a one-line python), `README.md` (run locally, run tests, env vars, deploy notes CPU vs GPU, model license attribution CC BY-SA 4.0 Slovo), `scripts/smoke_ws.py` (sends frames from a video file or webcam-less synthetic frames to a running server and prints messages).

- [ ] Step 1: `docker build` (if docker available; else `python -m compileall app` and `uvicorn app.main:app` boots and `/api/health` returns 200 with models missing).
- [ ] Step 2: Full `pytest -v` → PASS.
- [ ] Step 3: Commit `chore: docker, model download script, README`.

## Out of scope (Phase 2)
Avatar/text-to-sign, LLM sentence smoothing of gloss sequences, Uzbek/English dictionary translations and sign videos, accounts/auth, fine-tuning on contributions, Alembic migrations (v1 uses `create_all`), server-side TTS.
