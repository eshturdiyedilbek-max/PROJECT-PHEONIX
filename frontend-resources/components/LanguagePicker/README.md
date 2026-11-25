A single-choice list of sign languages, built from the server's `GET /api/languages`, with unavailable entries greyed out and non-commercial ones tagged.

Use it on Translate, Learn and Settings wherever the person chooses a sign language. Switching languages on Translate closes the socket and opens a new one with the other `lang`.

## What the consumer provides

- The list from `/api/languages` `sign_languages`, in the order returned. Do not hard-code languages: new ones (Uzbek later) appear there without a frontend change.
- Per entry: `name` (main line, in its own script), `english_name` (second line, only when it differs from `name`), `classes` (the "1000 signs" tag), `available`, `commercial_use`.
- The selected `code`, remembered on the device (Settings keeps it client-side).

## Markup

Native radios inside a `fieldset`:

```html
<fieldset class="ph-picker">
  <legend>Sign language</legend>
  <label class="ph-option">
    <input type="radio" name="lang" value="rsl" checked>
    <span class="ph-option__text">
      <span class="ph-option__name">Русский жестовый язык</span>
      <span class="ph-option__sub">Russian Sign Language</span>
    </span>
    <span class="ph-option__tags"><span class="ph-tag">1000 signs</span></span>
  </label>
</fieldset>
```

## Rules

- A selected row has a 2px `accent` border; unselected rows a 1px `border`. Selection is also the radio state, not color alone.
- `available: false`: set `aria-disabled="true"` on the label and `disabled` on the input, show the row on `surface-sunken` with `ink-muted` text, and add an "Unavailable" tag. Grey alone is not an explanation; the tag is.
- `commercial_use: false`: add the tag "Demo only, non-commercial" with a `status-warn` icon. The row stays selectable.
- Rows are at least 44px high. Focus shows the 2px `focus` ring around the whole row.
- Speech language (`auto`, `uz`, `ru`, `en`) uses the same markup with the entries of `speech_languages` and an "Auto-detect" first row.
