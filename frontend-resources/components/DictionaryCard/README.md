One sign from the dictionary on the Learn page: the word, its category, and whichever translations and video exist.

The server fills `translations` for the entry's own language only and sends `video_url: null` for now, so the card must look complete with just a word and grow as data arrives. It is also where the person starts contributing a recording of that sign.

## What the consumer provides

- `text` (the word, letter or phrase) and `category` (`letter`, `word`, `phrase`) from `GET /api/dictionary`.
- `translations`: an object of `ru`, `en`, `uz`. The entry's own language is always filled and is already the heading, so skip it; render only the other non-null entries, each labeled with that language's own name (`Русский`, `English`, `O'zbekcha`).
- `video_url`: when non-null, a video in the 16:9 well. When null, render no well and no placeholder.
- Optionally an action: "Record this sign", which opens the consent step in the README's licensing rules.

## Markup

```html
<article class="ph-card" tabindex="0" lang="ru">
  <div class="ph-card__head">
    <h3 class="ph-card__word">привет</h3>
    <span class="ph-tag">Word</span>
  </div>
</article>
```

Letters use `ph-card__word--letter`. Translations go in a `<dl class="ph-card__translations">`.

## Rules

- Keep the text as stored: letters uppercase, words lowercase. Do not capitalize.
- Never render an empty row, a "not available" line or a gray placeholder for missing translations or video.
- Cards sit in a grid with `space-3` gaps; width follows the grid, up to 280px.
- The card is keyboard-focusable; the focus ring is the 2px `focus` outline with offset.
- The category tag is text ("Letter", "Word", "Phrase"); color never carries the category.
