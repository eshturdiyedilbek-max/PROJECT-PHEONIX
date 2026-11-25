# Phoenix front-end resources

Design tokens, fonts, logo, component styles and interface rules for the Phoenix frontend (Translate, Learn, History, Settings). Built against the API contract in [`docs/API.md`](../docs/API.md) (v1.3, backend commit `a52e6af`).

The colors, type pairing and logo are **proposed starter values, not an established brand**. The backend repo has no visual styles, so these were chosen to fit the contract and checked for contrast in both themes. Replace them when the real brand exists.

## What is here

| Path | What |
| --- | --- |
| `tokens.json` | Source of truth: color (Light, Dark), type, spacing, radius |
| `tokens.css` | The same tokens compiled to CSS variables, type classes and `@font-face`. Load it first |
| `components/bundle.css` | Styles for the four components (`ph-*` classes). Load it after `tokens.css` |
| `components/<Name>/README.md` | Guide for each component and the logo |
| `components/<Name>/preview.html` | Static preview. Open it in a browser; add `?theme=dark` for the dark theme |
| `states.md` | What every API state and error looks like in the UI |
| `fonts/` | Golos Text and Geologica (WOFF2) with their OFL licenses |
| `assets/Logos/` | Logo SVGs and their usage notes |

## Use it

Copy this folder into the frontend (for example under `public/`), then:

```html
<html lang="ru" data-theme="light"> <!-- "dark" for the dark theme -->
<link rel="stylesheet" href="/frontend-resources/tokens.css">
<link rel="stylesheet" href="/frontend-resources/components/bundle.css">
```

Reference colors, spacing and radii as CSS variables (`var(--surface)`, `var(--space-3)`, `var(--radius-md)`), never as pasted hex values. If you change a token, change `tokens.json` and regenerate `tokens.css`.

---

Phoenix translates between sign language and words: a camera turns Russian or American Sign Language into live text, a natural sentence (in Russian, English or Uzbek) and optional speech, and a microphone turns Uzbek, Russian or English speech into subtitles. It also has a dictionary to learn signs, a history of past translations, and settings. Read `states.md` before building any screen that talks to the server.

The backend defines behavior, languages, states and licensing but no visual styling. Every color, size and radius in `tokens.json` is a **starter value** chosen to fit that behavior and checked for contrast; swap them for the frontend's real styles when those exist. The four UI components exist because the API contract tells the frontend to build exactly those pieces (a banner, a "listening…" subtitle line, a language picker with greyed-out entries, a dictionary card with optional fields).

## Using this system

1. Read this file, then `states.md` for any screen that talks to the server.
2. Take colors, type, spacing and radii only from `tokens.json`, as CSS variables, never as pasted hex values. Take structure from the four component guides and `components/bundle.css`.
3. Build only the pages in the Page map. If something is missing here (a logo, an icon set, a brand color), say so and leave a plain placeholder; do not invent one.
4. Check every new color pair for contrast in both themes before using it.
5. Design the empty, loading and error state of every screen and panel, not only the filled one. `states.md` covers the server's states; an empty History, for example, says what will appear there and how to start.
6. Before shipping, run an automated design check on the finished frontend, for example Impeccable's open-source detector (`npx impeccable detect src/`), and fix what it reports.

## Avoid the generic AI look

Plain and honest beats impressive here. Do not:

- use gradients (above all blue to purple), glow or glass effects, or gradient text;
- use emoji, including hand emoji, as icons, logos or decoration; no mascot, robot or stock "hands" illustration;
- write marketing copy ("AI-powered", "seamless", "revolutionary") or invent numbers, testimonials or accuracy claims. Recognition is imperfect (the model config lists about 64% top-1 for Russian and 63% for American Sign Language), so show each sign's `confidence` and `alternatives`, and never promise "accurate" or "instant";
- stack identical rounded cards in a uniform three-column grid, nest cards inside cards, put a rounded-square icon tile above headings, or center every heading. Let the job set the layout: Translate is one camera frame and one subtitle panel, Learn is a searchable list;
- flatten the hierarchy. Make one thing per view dominant (the subtitle panel on Translate, the search field on Learn) and let the rest recede with `ink-muted` text and quiet buttons. Never put `ink-muted` on a colored fill; on `accent` use `on-accent`;
- show everything at once. Keep alternatives, raw signs and settings out of the Translate view until they are needed;
- fall back to Inter, Roboto or Arial out of habit. Set text in `sans` and headings in `display`;
- ship the starter `accent` as the final brand. It is a placeholder: replace it with the real brand color and re-check contrast first.

## Content fundamentals

- **Write for two people at once**: the person signing and the person reading or talking to them. Use short, literal sentences. Never name models, frame rates or engines in the UI.
- **Show every language by its own name.** Build the picker from `GET /api/languages` and print each `name` as returned: `Русский жестовый язык`, `American Sign Language`, `Русский`, `English`, `O'zbekcha`. Put `english_name` under it in `body-sm` and `ink-muted` only when it differs from `name`.
- **Three scripts, two families.** Russian is Cyrillic, English and Uzbek are Latin. Set text in `sans` (Golos Text) and headings, the live subtitle and the name in `display` (Geologica). Both cover Cyrillic and Latin, including the Uzbek `ʻ` (`oʻzbek`) and the Cyrillic letters Ў Қ Ғ Ҳ; check that any new text mixing scripts renders without a fallback box.
- **Print recognized text exactly as returned.** Do not change case, add punctuation, translate, or de-duplicate. RSL words arrive lowercase (`привет`), fingerspelled letters uppercase (`А`, `Ё`), and a phrase is signs joined by spaces (`привет утро`).
- **Show the sentence as the result, keep the raw signs as the source.** When the person stops, the server may return `sentence`: a natural sentence, in Russian, English or Uzbek (`target_lang`, `sentence_lang`). Show and speak `sentence`; show the raw `signs` under it in `ink-muted`. Voice follows `sentence_lang`; if the browser has no voice for it, show text only and say so in Settings.
- **Render nothing for empty speech.** The speech endpoint returns `"text": ""` when it hears nothing; do not show an empty subtitle.
- **Never show an API `code` or `message` to an end user.** Map codes to plain words with the table in `states.md`. If you show a code at all, put it in `code` on `surface-sunken` under the plain sentence.
- **Words the contract itself uses** (keep them): a "translation temporarily unavailable" banner and a "listening…" indicator. Real sample strings to use in mockups: `привет`, `утро`, `здравствуйте`, `Salom, qalaysiz?`.

## Visual foundations

- **Color.** Page on `surface`; cards, banners and the subtitle panel on `surface-raised`; the camera frame and code chips on `surface-sunken`. Text is `ink`, secondary text `ink-muted`. `accent` marks the one primary action in a view and links, nothing else. `on-accent` is the text on an `accent` fill.
- **Status uses three colors and always an icon and a word.** `status-ok` (blue) for ready and saved, `status-warn` for overloaded or non-commercial, `status-danger` for blocking failures. Never tell two statuses apart by hue alone, and never use `accent` for a status.
- **Type.** Live text in `subtitle`, page titles in `title`, section and card headings in `heading`, default text in `body`, secondary lines in `body-sm`, labels and tags in `caption`. Nothing below 12px. Codes in `code`. `subtitle`, `title` and `heading` use `display`; `body`, `body-sm` and `caption` use `sans`; never mix a third family in.
- **Space and shape.** Spacing steps are `space-1` to `space-5` (4, 8, 16, 24, 32px). Controls and banners use `radius-md`; cards, the camera frame and the subtitle panel use `radius-lg`; chips use `radius-sm`.
- **Borders, not shadows.** No shadow tokens exist. Separate layers with `border` and a surface step. A bordered control uses `border` at 1px; a banner uses a full 1px border in its status color, never a one-sided accent stripe.
- **Never put text on live video.** Contrast on a moving camera image cannot be guaranteed. Keep the video in a `surface-sunken` frame with `radius-lg` and set subtitles in a `surface-raised` panel beside or under it.
- **Focus.** Every interactive element shows a 2px solid `focus` ring with a 2px offset, so it lands on a surface and never on an `accent` fill.
- **Motion.** None is defined. Append recognized words to the line without animating them, and honor `prefers-reduced-motion` for anything you add.

## Accessibility

- Text holds 4.5:1 and borders, focus rings and icons 3:1 on `surface`, `surface-raised` and `surface-sunken` in both themes (Light, Dark). A new pair gets the same check in both.
- Mark the subtitle line `aria-live="polite"` so a screen reader announces new words without interrupting.
- Never give feedback by sound alone. Voice output (browser speech synthesis) is optional and set in Settings; every state it speaks also appears as text.

## Iconography

The source ships no icons. The component previews use plain geometric status marks (check, triangle, octagon, info) drawn inline so they take `currentColor`. These are placeholders: pick one icon set before shipping and keep one ink color per icon.

## Logo

The mark is two mirrored pairs of quarter-circle arcs that rise from the lower corners and cross in the middle: a pair of wings and a flame, the same arcs as the cover. It is a proposal drawn for this system, not an established brand mark. The files are in `assets/Logos/`; the `Logo` guide has the rules.

- Use `phoenix-mark-ink.svg` on Light surfaces and `phoenix-mark-reversed.svg` on Dark ones. Use the accent files at most once per view.
- Next to the name, set `Phoenix` in `title` with the mark on its left, 28px tall, a `space-2` gap.
- Never recolor it, add a gradient, shadow or glow, or put it in a rounded-square tile except through `phoenix-app-icon.svg`.

## Licensing, consent and privacy

- **About page credit (required):** Slovo dataset and Russian models, CC BY-SA 4.0, © ai-forever (Kapitanov et al., "Slovo: Russian Sign Language Dataset", 2023). Speech recognition uses Whisper (MIT). Fonts: Golos Text (© 2019 The Golos Text Project Authors) and Geologica (© 2020 The Geologica Project Authors), SIL Open Font License 1.1; credit them on the same page and keep the license texts in `fonts/` with any copy of the font files.
- **Non-commercial languages:** when `commercial_use` is `false` (American Sign Language today), show a visible "Demo only, non-commercial" tag next to that language in the picker and on the Translate header, in `caption` with a `status-warn` icon.
- **Contributions need explicit consent.** Show an unchecked consent checkbox before upload, name what is sent (a short video of the person performing a dictionary sign) and that it grows the dataset, and send only when it is checked. The server refuses a request without `consent: true`.
- **Say when Google processes audio.** A speech response with `engine: gemini` means the audio went to Google. The contract asks for a privacy-policy mention; also put one plain line next to the microphone control.
- **No accounts.** The browser keeps a random client id; history is tied to it. Settings must offer a "save history" switch and a "clear history" button.

## Page map

| Page | Uses |
| --- | --- |
| Translate | `LanguagePicker`, `SubtitleLine`, `StatusBanner`, camera frame on `surface-sunken` |
| Learn (Dictionary) | `DictionaryCard`, `LanguagePicker`, consent checkbox for contributions |
| History | History rows in `body` with a `caption` direction tag, delete controls |
| Settings | `LanguagePicker` (sign and speech), switches for voice output, save history and "make a sentence", sentence language (`ru`, `en`, `uz`), "clear history" button |
