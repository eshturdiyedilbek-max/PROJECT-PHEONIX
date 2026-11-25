# Phoenix Backend — API Contract v1.3

> **v1.3 (2026-11-25):** `/api/health` gains `sign_devices` (`cuda`/`cpu` per loaded sign model). Backward compatible. Colab GPU deploy: [`deploy/COLAB.md`](../deploy/COLAB.md).

> **v1.2 (2026-11-24):** Gemini added. `POST /api/sentence` turns recognized signs into a natural sentence (and can translate to Uzbek). `/ws/sign` `final` now also carries `sentence`/`smoothed`/`sentence_lang` (opt out with `"smooth": false`, choose language with `"target_lang"`). `/api/stt` can use Gemini (better Uzbek) or Whisper; response gains `engine`. New error `502 upstream_error`. Backward compatible.

> **v1.1 (2026-11-24):** English = American Sign Language (`asl`) added next to Russian (`rsl`). Pick it with `?lang=asl` on `/ws/sign` and `lang=asl` on `/api/dictionary`. `/api/languages` and the `ready` message now say which text/voice language a sign language produces. New WebSocket error codes: `idle_timeout`, `inference_failed`; `overloaded` can now also close the socket when the server is full. Everything from v1 still works unchanged.

This is the contract between the frontend (Translate, Learn/Dictionary, History, Settings pages) and the backend. If something here and the code disagree, the code is wrong.

- Base URL (dev): `http://localhost:8000`
- REST prefix: `/api`
- WebSocket prefix: `/ws` (use `ws://` in dev, `wss://` in prod)
- All JSON is UTF-8. Timestamps are ISO-8601 UTC strings, e.g. `"2026-11-24T19:30:00Z"`.
- Interactive docs (auto-generated): `GET /docs`

## 0. Client identity (no login in MVP)

There are no accounts in v1. On first visit the frontend generates a random UUID v4, stores it in `localStorage` (key suggestion: `phoenix_client_id`), and sends it on every request:

- REST: header `X-Client-Id: <uuid>`
- WebSocket: query param `?client_id=<uuid>`

History is scoped to this id. A missing or malformed id on an endpoint that needs it returns `400 invalid_client_id`.

## 1. Error format (all REST endpoints)

```json
{ "error": { "code": "invalid_client_id", "message": "X-Client-Id must be a UUID" } }
```

| HTTP | code | when |
|---|---|---|
| 400 | `invalid_client_id` | missing/bad `X-Client-Id` |
| 400 | `invalid_request` | bad params/body |
| 404 | `not_found` | id does not exist (or belongs to another client) |
| 413 | `file_too_large` | upload over limit |
| 415 | `unsupported_media_type` | wrong audio/video format |
| 500 | `internal_error` | unexpected server bug (please report) |
| 502 | `upstream_error` | Gemini (Google) failed and no fallback was possible; retry |
| 503 | `model_unavailable` | model weights not loaded on server |

## 2. Health and languages

### `GET /api/health`
```json
{
  "status": "ok",
  "sign_model": "loaded",
  "sign_models": { "rsl": "loaded", "asl": "missing" },
  "sign_devices": { "rsl": "cuda" },
  "stt_model": "loaded",
  "stt_engines": ["gemini", "whisper"],
  "stt_default": "gemini",
  "sentence_smoothing": true,
  "version": "0.2.0"
}
```
`sign_devices` says where each loaded sign model actually runs (`cuda` = GPU, fast enough for live; `cpu` = several seconds per word).
Each value is `"loaded"` or `"missing"`. `sign_model` is `"loaded"` if at least one sign language works; `sign_models` gives it per language. Show a "translation temporarily unavailable" banner on Translate if the selected language is missing.

### `GET /api/languages`
Sign languages the recognizer supports. Use it for the language picker in Settings/Translate; build the picker from this list (Uzbek and others will appear here later without frontend changes). Grey out entries with `"available": false`.
```json
{
  "sign_languages": [
    {
      "code": "rsl", "name": "Русский жестовый язык", "english_name": "Russian Sign Language",
      "classes": 1000, "available": true, "text_lang": "ru", "tts_lang": "ru-RU",
      "model": "mvit32-2", "commercial_use": true
    },
    {
      "code": "asl", "name": "American Sign Language", "english_name": "American Sign Language",
      "classes": 2000, "available": true, "text_lang": "en", "tts_lang": "en-US",
      "model": "signflow-a", "commercial_use": false
    }
  ],
  "speech_languages": [
    { "code": "uz", "name": "O'zbekcha" },
    { "code": "ru", "name": "Русский" },
    { "code": "en", "name": "English" }
  ]
}
```
- `text_lang`: language of the words the recognizer outputs (`rsl` → Russian words, `asl` → English words).
- `tts_lang`: voice to use with `speechSynthesis` for that language.
- `commercial_use: false` means the model's training data forbids commercial use (ASL/WLASL). Fine for demos; don't sell it.

## 3. Sign → text (real-time) — `WS /ws/sign`

Translate page, camera mode. The browser streams camera frames as JPEG; the server runs the Slovo video model and pushes back each recognized sign.

**Why frames and not MediaPipe keypoints:** Slovo's pretrained models (MViTv2) are trained on raw RGB video, not landmarks. Sending small JPEGs keeps accuracy as published and keeps the frontend simple (no MediaPipe needed in the browser for v1).

### Connect
```
ws://localhost:8000/ws/sign?client_id=<uuid>&lang=rsl     # Russian Sign Language
ws://localhost:8000/ws/sign?client_id=<uuid>&lang=asl     # American Sign Language (English)
```
To switch language, close the socket and open a new one with the other `lang`.

### Message flow

```
client                              server
  |-- {"type":"start", ...} ---------->|
  |<--------- {"type":"ready", ...} ---|
  |== binary JPEG frame ==============>|   (repeat, ~15 per second)
  |== binary JPEG frame ==============>|
  |<--------- {"type":"sign", ...} ----|   (whenever a new sign is recognized)
  |-- {"type":"stop"} ---------------->|
  |<--------- {"type":"final", ...} ---|   (server then keeps socket open; send "start" again for a new phrase, or close)
```

### Client → server

**Text frame `start`** (must be first):
```json
{ "type": "start", "fps": 15, "save_history": true, "smooth": true, "target_lang": "uz" }
```
- `smooth` (bool, default true): on `stop`, turn the recognized signs into a natural sentence with Gemini.
- `target_lang` (`ru` | `en` | `uz`, default = the sign language's own `text_lang`): language of that sentence. `uz` translates, e.g. RSL signs → Uzbek sentence.
- `fps` (int, 5–30, default 15): how many frames per second you will send. Server resamples to what the model needs. **Recommended: 15**, or exactly the `recommended_fps` from `ready` (a lighter model may need only 8).
- Frames sent much faster than the declared `fps` (more than 2× in one second) are skipped.
- `save_history` (bool, default true): store the final phrase in History.

**Binary frames**: one message = one JPEG image (the whole camera frame, not cropped).
- Recommended size: longest side 320–480 px, JPEG quality ~0.7. Max 300 KB per frame.
- How (browser): draw `<video>` to a `<canvas>` every `1000/fps` ms, `canvas.toBlob(cb, "image/jpeg", 0.7)`, `ws.send(blob)`.
- The signer's upper body and both hands should be in frame.

**Text frame `stop`**: ends the current phrase.
```json
{ "type": "stop" }
```

**Text frame `reset`**: clears the buffer and current phrase without saving (e.g. user pressed "clear").
```json
{ "type": "reset" }
```

### Server → client

**`ready`** — reply to `start`:
```json
{
  "type": "ready", "session_id": "6f1c…", "lang": "rsl", "model": "mvit32-2",
  "window_frames": 32, "target_fps": 15, "recommended_fps": 15,
  "text_lang": "ru", "tts_lang": "ru-RU",
  "smoothing": true, "target_lang": "uz"
}
```
`smoothing` is false if the client opted out or the server has no Gemini key.
The first sign can arrive after about `window_frames / target_fps` seconds (~2 s). Show a "listening…" indicator until then. `target_fps` can be fractional (e.g. `7.5`); if you want to save bandwidth, send at `recommended_fps`.

**`sign`** — a new sign was recognized (same sign is never sent twice in a row):
```json
{
  "type": "sign",
  "text": "привет",
  "confidence": 0.83,
  "alternatives": [ { "text": "здравствуйте", "confidence": 0.07 }, { "text": "пока", "confidence": 0.03 } ],
  "phrase": "привет",
  "index": 0
}
```
- `text`: the recognized word (Russian). Append it to the subtitle line.
- `phrase`: the full phrase so far (all signs joined by spaces) — you can just render this.
- `index`: 0-based position of this sign in the phrase.
- Speak it with the browser: `speechSynthesis.speak(new SpeechSynthesisUtterance(text))` with `lang` = `tts_lang` from `ready` (`ru-RU` or `en-US`; Settings can toggle voice on/off). No server TTS.

**`final`** — reply to `stop`:
```json
{
  "type": "final", "session_id": "6f1c…",
  "text": "Привет! утро", "signs": ["Привет!", "утро"],
  "sentence": "Xayrli tong!", "smoothed": true, "sentence_lang": "uz",
  "history_id": 42
}
```
- `text`: raw signs joined by spaces. `sentence`: what to show/speak as the final result. If Gemini failed or smoothing is off, `sentence` equals `text` and `smoothed` is false.
- `final` can take 1–3 s longer when smoothing is on (Gemini call). Keep showing `phrase` until it arrives.
- History stores `sentence` as the item's `text` (and the raw `signs`).
`history_id` is `null` if nothing was recognized or `save_history` was false.

**`error`**:
```json
{ "type": "error", "code": "bad_frame", "message": "Frame is not a valid JPEG" }
```
| code | meaning | socket |
|---|---|---|
| `invalid_client_id` | bad/missing `client_id` | closed (4400) |
| `unsupported_language` | `lang` not in `/api/languages` | closed (4400) |
| `model_unavailable` | that language's weights are missing on server | closed (4503) |
| `overloaded` | server already has the max number of live translations | closed (4503), retry after a few seconds |
| `idle_timeout` | no message (frame or JSON) for 30 s | closed (4408); reconnect when the user comes back |
| `bad_message` | unknown/invalid JSON, or frames before `start` | stays open |
| `bad_frame` | binary is not a JPEG or > 300 KB | stays open, frame ignored |
| `overloaded` | server is behind; frames are being dropped | stays open, informational (at most every 5 s) |
| `inference_failed` | the model crashed on one window | stays open, keep sending frames |

Reconnect advice: on unexpected close, wait 1 s, 2 s, 4 s… (max 10 s) and reconnect, then send `start` again.

## 4. Speech → text (subtitles) — `POST /api/stt`

Translate page, hearing person speaks. Record short chunks with `MediaRecorder` (recommended 3–6 s, `audio/webm;codecs=opus`) and POST each one; render returned `text` as subtitles.

Request: `multipart/form-data`
| field | type | required | notes |
|---|---|---|---|
| `audio` | file | yes | webm, ogg, wav, mp3, m4a. ≤ 10 MB, ≤ 60 s |
| `language` | string | no | `uz`, `ru`, `en`. Omit for auto-detect |
| `save_history` | bool | no | default `false` (chunks are short; save when you have a full utterance) |
| `engine` | string | no | `gemini` or `whisper`. Omit to use the server default (`stt_default` in `/api/health`). If the default Gemini fails, the server falls back to Whisper automatically; if you ask for `gemini` explicitly and it fails you get `502 upstream_error` |

Headers: `X-Client-Id` (required only when `save_history=true`).

Response `200`:
```json
{
  "text": "Salom, qalaysiz?",
  "language": "uz",
  "duration": 3.4,
  "segments": [ { "start": 0.0, "end": 1.9, "text": "Salom, qalaysiz?" } ],
  "history_id": null,
  "engine": "gemini"
}
```
With Gemini, `segments` is one segment covering the whole chunk. Audio sent to the Gemini engine is processed by Google; mention it in the privacy policy.

Empty speech returns `"text": ""` with 200 (don't show an empty subtitle).

## 4b. Signs → sentence — `POST /api/sentence`

Turn any list of recognized signs into a natural sentence (the WebSocket already does this on `stop`; use this endpoint to re-generate, e.g. in another language).

Request JSON:
```json
{ "signs": ["Я", "врач", "идти", "нужно", "сегодня"], "sign_lang": "rsl", "target_lang": "uz" }
```
| field | required | notes |
|---|---|---|
| `signs` | yes | 1–50 strings, each ≤ 100 chars, in recognition order |
| `sign_lang` | no | default `rsl` |
| `target_lang` | no | `ru`, `en`, `uz`; default = the sign language's `text_lang` |

Response `200` (always 200; falls back to the plain words if Gemini is down):
```json
{
  "sentence": "Men bugun shifokorga borishim kerak.",
  "source_text": "Я врач идти нужно сегодня",
  "target_lang": "uz",
  "smoothed": true,
  "model": "gemini-flash-lite-latest"
}
```

## 5. Dictionary (Learn page) — `GET /api/dictionary`

Every sign a recognizer knows: `lang=rsl` → 1000 Russian signs (letters, words, phrases), `lang=asl` → 2000 English (ASL) words.

`GET /api/dictionary?lang=rsl&q=при&category=word&limit=50&offset=0`
| param | default | notes |
|---|---|---|
| `lang` | `rsl` | sign language code |
| `q` | — | case-insensitive substring search on the word |
| `category` | — | `letter`, `word`, `phrase` |
| `limit` | 50 | 1–200 |
| `offset` | 0 | |

```json
{
  "items": [
    {
      "id": 123,
      "lang": "rsl",
      "text": "привет",
      "category": "word",
      "translations": { "ru": "привет", "en": null, "uz": null },
      "video_url": null
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```
`GET /api/dictionary/{id}` returns a single item (same shape) or `404`.

`translations` has the item's own language filled in (`ru` for `rsl`, `en` for `asl`); the others and `video_url` are `null` for now (filled in later — design the card so they're optional). Category: `letter` = single letter of the fingerspelling alphabet, `phrase` = more than one word, else `word`.

## 6. History — `/api/history`

All require `X-Client-Id`. Only that client's records are visible.

`GET /api/history?limit=20&offset=0&direction=sign_to_text`
```json
{
  "items": [
    {
      "id": 42,
      "direction": "sign_to_text",
      "lang": "rsl",
      "text": "привет утро",
      "signs": ["привет", "утро"],
      "created_at": "2026-11-24T19:30:00Z"
    },
    {
      "id": 41,
      "direction": "speech_to_text",
      "lang": "uz",
      "text": "Salom, qalaysiz?",
      "signs": null,
      "created_at": "2026-11-24T19:29:10Z"
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```
Newest first. `direction` is `sign_to_text` or `speech_to_text` (filter optional).

- `DELETE /api/history/{id}` → `204`
- `DELETE /api/history` → `204` (clears all for this client; the Settings "clear history" button)

## 7. Contribute a sample (Learn page, dataset collection) — `POST /api/contributions`

Lets a user record themselves performing a dictionary sign, to grow the dataset (and later Uzbek sign language). Show a consent checkbox; send only if checked.

Request `multipart/form-data`, header `X-Client-Id`:
| field | type | required | notes |
|---|---|---|---|
| `video` | file | yes | webm or mp4, ≤ 20 MB, ideally 2–5 s |
| `entry_id` | int | yes | dictionary item id being performed |
| `consent` | bool | yes | must be `true` |

Response `201`:
```json
{ "id": 7, "entry_id": 123, "status": "pending", "created_at": "2026-11-24T19:31:00Z" }
```
`400 invalid_request` if `consent` is not true; `404` if `entry_id` doesn't exist.

## 8. Settings page

No server endpoints in v1. Keep these client-side (localStorage): sign language (`rsl`), speech language (`auto`/`uz`/`ru`/`en`), voice output on/off, save history on/off (pass as `save_history`), and the "clear history" button (`DELETE /api/history`).

## 9. CORS

The server allows origins from the `CORS_ORIGINS` env var (comma-separated). Dev default: `http://localhost:3000,http://localhost:5173`. Tell the backend your deployed frontend URL. The bundled website in `frontend/` is served by the same server at `/`, so it needs no CORS setup.
