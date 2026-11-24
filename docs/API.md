# Phoenix Backend — API Contract v1

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
| 503 | `model_unavailable` | model weights not loaded on server |

## 2. Health and languages

### `GET /api/health`
```json
{ "status": "ok", "sign_model": "loaded", "stt_model": "loaded", "version": "0.1.0" }
```
`sign_model` / `stt_model` is `"loaded"` or `"missing"`. Show a "translation temporarily unavailable" banner on Translate if missing.

### `GET /api/languages`
Sign languages the recognizer supports. Use it for the language picker in Settings/Translate. Only `rsl` exists in v1; Uzbek/others appear here later without frontend changes.
```json
{
  "sign_languages": [
    { "code": "rsl", "name": "Русский жестовый язык", "classes": 1000, "available": true }
  ],
  "speech_languages": [
    { "code": "uz", "name": "O'zbekcha" },
    { "code": "ru", "name": "Русский" },
    { "code": "en", "name": "English" }
  ]
}
```

## 3. Sign → text (real-time) — `WS /ws/sign`

Translate page, camera mode. The browser streams camera frames as JPEG; the server runs the Slovo video model and pushes back each recognized sign.

**Why frames and not MediaPipe keypoints:** Slovo's pretrained models (MViTv2) are trained on raw RGB video, not landmarks. Sending small JPEGs keeps accuracy as published and keeps the frontend simple (no MediaPipe needed in the browser for v1).

### Connect
```
ws://localhost:8000/ws/sign?client_id=<uuid>&lang=rsl
```

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
{ "type": "start", "fps": 15, "save_history": true }
```
- `fps` (int, 5–30, default 15): how many frames per second you will send. Server resamples to what the model needs. **Recommended: 15.**
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
{ "type": "ready", "session_id": "6f1c…", "lang": "rsl", "model": "mvit32-2", "window_frames": 32, "target_fps": 15 }
```
The first sign can arrive after about `window_frames / target_fps` seconds (~2 s). Show a "listening…" indicator until then.

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
- Speak it with the browser: `speechSynthesis.speak(new SpeechSynthesisUtterance(text))` with `lang = "ru-RU"` (Settings can toggle voice on/off). No server TTS in v1.

**`final`** — reply to `stop`:
```json
{ "type": "final", "session_id": "6f1c…", "text": "привет утро", "signs": ["привет", "утро"], "history_id": 42 }
```
`history_id` is `null` if nothing was recognized or `save_history` was false.

**`error`**:
```json
{ "type": "error", "code": "bad_frame", "message": "Frame is not a valid JPEG" }
```
| code | meaning | socket |
|---|---|---|
| `invalid_client_id` | bad/missing `client_id` | closed (4400) |
| `unsupported_language` | `lang` not available | closed (4400) |
| `model_unavailable` | weights missing on server | closed (4503) |
| `bad_message` | unknown/invalid JSON, or frames before `start` | stays open |
| `bad_frame` | binary is not a JPEG or > 300 KB | stays open, frame ignored |
| `overloaded` | server is behind; frames are being dropped | stays open, informational |

Reconnect advice: on unexpected close, wait 1 s, 2 s, 4 s… (max 10 s) and reconnect, then send `start` again.

## 4. Speech → text (subtitles) — `POST /api/stt`

Translate page, hearing person speaks. Record short chunks with `MediaRecorder` (recommended 3–6 s, `audio/webm;codecs=opus`) and POST each one; render returned `text` as subtitles.

Request: `multipart/form-data`
| field | type | required | notes |
|---|---|---|---|
| `audio` | file | yes | webm, ogg, wav, mp3, m4a. ≤ 10 MB, ≤ 60 s |
| `language` | string | no | `uz`, `ru`, `en`. Omit for auto-detect |
| `save_history` | bool | no | default `false` (chunks are short; save when you have a full utterance) |

Headers: `X-Client-Id` (required only when `save_history=true`).

Response `200`:
```json
{
  "text": "Salom, qalaysiz?",
  "language": "uz",
  "duration": 3.4,
  "segments": [ { "start": 0.0, "end": 1.9, "text": "Salom, qalaysiz?" } ],
  "history_id": null
}
```
Empty speech returns `"text": ""` with 200 (don't show an empty subtitle).

## 5. Dictionary (Learn page) — `GET /api/dictionary`

All 1000 signs the RSL model knows (letters, words, phrases).

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

`translations.en/uz` and `video_url` are `null` in v1 (filled in later — design the card so they're optional). Category: `letter` = single letter of the fingerspelling alphabet, `phrase` = more than one word, else `word`.

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

The server allows origins from the `CORS_ORIGINS` env var (comma-separated). Dev default: `http://localhost:3000,http://localhost:5173`. Tell the backend your deployed frontend URL.
