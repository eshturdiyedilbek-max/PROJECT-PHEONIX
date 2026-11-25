The large live text panel on Translate: a "listening…" state while the recognizer warms up, then the phrase from signs, then the finished sentence, or the subtitle from speech.

Use one panel per direction. Sign to text fills it from WebSocket `sign` messages; speech to subtitles fills it from each `POST /api/stt` response.

## What the consumer provides

- The phrase: the `phrase` field of the latest `sign` message (all signs so far, joined by spaces), or the appended `text` of speech responses. Print it exactly as received.
- State: `listening` (after `ready`, until the first sign, about 2 seconds), `phrase` (live signs), `waiting` (stopped, sentence pending, 1 to 3 seconds, only when `ready` said `smoothing: true`) or `final` (the `sentence` from the `final` message, with `sentence_lang` for the `lang` attribute).
- For `final`: the raw `signs` and, when `smoothed` is true and `sentence_lang` differs from the sign language's text, a "Translated to <language name>" note in the meta row.
- Optional meta row: `confidence` as a percent (`83%`) and the `alternatives` as non-interactive chips (`здравствуйте 7%`). Hide the row when there are no alternatives.
- The language of the text, for the `lang` attribute (`ru`, `en`, `uz`), so screen readers pronounce it correctly.

## Markup

```html
<section class="ph-subtitle" aria-live="polite" lang="ru">
  <p class="ph-subtitle__text">привет утро</p>
  <div class="ph-subtitle__meta">
    <span>Confidence 83%</span>
    <span class="ph-subtitle__alt">здравствуйте 7%</span>
  </div>
</section>
```

The listening state replaces the text paragraph with `.ph-subtitle__listening` (a ring icon and the word "Listening…"). The waiting state keeps the phrase paragraph and adds a `.ph-subtitle__status` line under it ("Making a sentence…"). Replace the paragraph with the sentence when `final` arrives; never show both sentence and phrase as two large lines.

## Rules

- Text is `subtitle` in `ink` on `surface-raised`. Never place it over the camera image.
- Append words without animation. Do not de-duplicate: the server never sends the same sign twice in a row.
- Render nothing, not an empty panel with a border, when a speech response returns `"text": ""`; keep the previous subtitle.
- `aria-live="polite"` so new words are announced without cutting off the screen reader.
- When voice output is on, speak the new `text` with the voice for `tts_lang`; the text stays visible either way.
