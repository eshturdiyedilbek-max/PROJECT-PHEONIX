# Interface states

Every state below comes from the backend's API contract (v1.3). The "Show" column is the required behavior; wording in quotes is a suggestion, written in the plain voice of the README. Colors name tokens; every status shows an icon and a word as well.

## Translate: sign to text (WebSocket)

| Moment | Server message | Show |
| --- | --- | --- |
| Connecting | none yet; the client sent `start` | "Connecting…" in `body`, `ink-muted`; camera frame visible |
| Warm-up | `ready` | "Listening…" until the first sign. The first sign arrives after about `window_frames / target_fps` seconds (about 2 s). Use `text_lang` for the subtitle language and `tts_lang` for voice. Send frames at `recommended_fps`. `smoothing: false` means no sentence will be made (the person opted out, or the server has no Gemini key): never show the "Making a sentence…" state then |
| A sign is recognized | `sign` | Append `text` to the `SubtitleLine`, or render `phrase`. The same sign is never sent twice in a row, so do not de-duplicate. `confidence` is 0 to 1 (show as a percent in `caption`); `alternatives` are secondary |
| User stops, sentence pending | none yet | With smoothing on, `final` takes 1 to 3 s longer (a Gemini call). Keep the phrase on screen and add "Making a sentence…" under it |
| Result arrives | `final` | Show `sentence` as the result and speak that one, not the raw `text`. `sentence_lang` is its language. `smoothed: false` means `sentence` equals the raw `text`: show it the same way and say nothing about failure. Keep the raw `signs` available as secondary text. `history_id: null` means nothing was recognized or saving was off; do not link to History then |
| User clears | client sends `reset` | Empty the line without saving |

## Translate: errors and closes

| `code` | Socket | Status | What the person sees | What the client does |
| --- | --- | --- | --- | --- |
| `invalid_client_id` | closed 4400 | `status-danger` | "Something went wrong on this device." | Make a new random id, store it, reconnect once |
| `unsupported_language` | closed 4400 | `status-danger` | "That language isn't available." | Select the first language with `available: true` |
| `model_unavailable` | closed 4503 | `status-danger` | "Translation is temporarily unavailable for this language." | Do not auto-retry. Offer the other available languages |
| `overloaded` (closing) | closed 4503 | `status-warn` | "Many people are translating right now. Trying again…" | Retry after a few seconds with the backoff below |
| `overloaded` (open) | stays open | `status-warn` | "The connection is slow; some frames were skipped." Non-blocking | Arrives at most every 5 s. Clear the notice when the next `sign` arrives |
| `idle_timeout` | closed 4408 | `status-warn` | "Paused because nothing was sent for 30 seconds." with a "Resume" button | Reconnect only when the person returns |
| `bad_message` | stays open | none | nothing | A client bug (unknown message or frames before `start`). Log it |
| `bad_frame` | stays open | none | nothing | The frame was ignored. Check size (max 300 KB) and JPEG encoding |
| `inference_failed` | stays open | none | nothing | The model failed on one window. Keep sending frames |

Unexpected close: wait 1 s, 2 s, 4 s and so on up to 10 s, reconnect, and send `start` again. Switching language means closing the socket and opening a new one.

## Translate: speech to subtitles (REST)

| Case | Show |
| --- | --- |
| Chunk sent (3 to 6 s recommended) | Append returned `text` to the `SubtitleLine` in `subtitle` |
| `"text": ""` | Nothing. No empty subtitle |
| Audio over 10 MB or 60 s | `file_too_large` (413): "That recording is too long." |
| Unsupported format | `unsupported_media_type` (415): "That audio format isn't supported." |
| Response `engine` is `gemini` | The audio was processed by Google. Say so in the privacy policy (the contract asks for it) and in one line next to the microphone control |
| `upstream_error` (502) | Only when the person's setup asked for the Gemini engine explicitly and it failed. The default engine falls back to Whisper on its own, so a normal flow never shows this. "The speech service is busy. Please try again." with a retry action |

## Health and language availability

| Signal | Show |
| --- | --- |
| `GET /api/health` reports the selected language as `"missing"` | Banner on Translate: "Translation temporarily unavailable" (`status-danger`) |
| `GET /api/languages` entry has `available: false` | Show it in the picker greyed out and not selectable, with the reason in text, not by greying alone |
| `commercial_use: false` | "Demo only, non-commercial" tag beside the language (`status-warn`) |
| `sign_devices` says `cpu` for the selected language | Live translation takes several seconds per word. Show a non-blocking `status-warn` notice on Translate: "Translation is slow on this server." `cuda` needs no notice |
| `sentence_smoothing: false` | Hide the "make a sentence" switch and the sentence-language choice in Settings; `final` will carry the raw text |
| `stt_engines`, `stt_default` | Informational. The client does not need to pick an engine; omit it and the server chooses `stt_default` |

## REST errors

All REST errors have the shape `{ "error": { "code", "message" } }`. Map by `code`, not by `message`.

| HTTP | `code` | What the person sees |
| --- | --- | --- |
| 400 | `invalid_client_id` | Same recovery as the socket case above |
| 400 | `invalid_request` | "Please check what you entered." For a contribution, this includes `consent` not being true |
| 404 | `not_found` | "That item is gone." (a history entry or dictionary item that was removed) |
| 413 | `file_too_large` | "That file is too large." |
| 415 | `unsupported_media_type` | "That file type isn't supported." |
| 500 | `internal_error` | "Something went wrong on our side. Please try again." |
| 502 | `upstream_error` | "The speech service is busy. Please try again." (see the speech table above) |
| 503 | `model_unavailable` | Same as the Translate banner |

`POST /api/sentence` never fails for a normal request: it always returns 200 and, if Gemini is down, returns the plain words with `smoothed: false`. Handle that like the `smoothed: false` case on `final`.

## Dictionary and History data

- **Dictionary items**: `translations` for the other languages and `video_url` are `null` for now. A `DictionaryCard` must look complete without them and show them when they arrive. `category` is `letter`, `word` or `phrase`.
- **History items**: newest first. When a sentence was made, `text` is that sentence and `signs` keeps the raw words. `direction` is `sign_to_text` (has `signs`) or `speech_to_text` (`signs` is `null`). `created_at` is ISO-8601 UTC; show it in the viewer's local time.
- **Pages of results**: `limit` 1 to 200, default 50 for the dictionary and 20 for history; use `total` to know when to stop.
