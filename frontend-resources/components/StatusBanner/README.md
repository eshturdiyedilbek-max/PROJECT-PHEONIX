A bordered message that tells the person what state the translator is in and what they can do about it, in one of three statuses.

Use it for every state in `states.md` that needs the person's attention: a language that is missing on the server ("Translation temporarily unavailable"), a busy server, a closed connection. Do not use it for form validation next to a field.

## What the consumer provides

- `data-status`: `ok`, `warn` or `danger`. Pick it from the table in `states.md`; `danger` for blocking failures, `warn` for things the person can wait out, `ok` for ready and saved.
- A status icon (inline SVG, so it takes `currentColor` from `status-*`): check for `ok`, triangle for `warn`, octagon for `danger`.
- A status word in `.ph-banner__label` ("Unavailable", "Busy", "Ready"): the word is required, not the color.
- A plain-language message in `.ph-banner__message`. Optionally the API `code` in `.ph-banner__code`, below the message.
- Optionally one action in `.ph-banner__action`: a `.ph-btn` ("Resume", "Try again") or a `.ph-btn--quiet`.

## Markup

```html
<div class="ph-banner" data-status="danger" role="alert">
  <svg class="ph-icon">…octagon…</svg>
  <div class="ph-banner__body">
    <span class="ph-banner__label">Unavailable</span>
    <p class="ph-banner__message">Translation is temporarily unavailable for this language.</p>
  </div>
  <div class="ph-banner__action"><button class="ph-btn ph-btn--quiet">Choose another language</button></div>
</div>
```

## Rules

- Border and icon take the status color; text stays `ink` on `surface-raised`. Only the status word is colored, and it holds 5.2:1 or more in both themes.
- `role="alert"` for `danger`; `role="status"` for `ok` and `warn`.
- Never use `accent` for a banner. Never convey status by color alone.
- The informational `overloaded` notice clears itself on the next `sign` message; do not make it dismissible by hand.
