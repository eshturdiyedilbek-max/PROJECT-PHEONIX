---
name: Phoenix
description: Sign language to text and voice and back, two people on one screen. White ground, one red line of meaning.
colors:
  red: "#d9241c"
  red-ink: "#a3160f"
  red-tint: "#fdeeec"
  on-red: "#ffffff"
  surface: "#ffffff"
  surface-sunken: "#f8f2f1"
  ink: "#1b1112"
  ink-muted: "#6b5b5c"
  border: "#9a8a8b"
  line: "#efe3e1"
  status-warn: "#8a5300"
  status-danger: "#a3160f"
  dark-red: "#ff5a4f"
  dark-red-ink: "#ff8a80"
  dark-red-tint: "#2a1312"
  dark-on-red: "#1b0807"
  dark-surface: "#140c0c"
  dark-surface-raised: "#1d1313"
  dark-surface-sunken: "#211616"
  dark-ink: "#f8eeed"
  dark-ink-muted: "#c4b2b1"
  dark-border: "#8f7c7b"
  dark-line: "#2f2120"
  dark-status-warn: "#f2b84b"
typography:
  display:
    fontFamily: "Geologica, Golos Text, system-ui, Segoe UI, Arial, sans-serif"
    fontSize: "clamp(44px, min(7.4vw, 11vh), 112px)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geologica, Golos Text, system-ui, Segoe UI, Arial, sans-serif"
    fontSize: "clamp(34px, 4.6vw, 64px)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Geologica, Golos Text, system-ui, Segoe UI, Arial, sans-serif"
    fontSize: "clamp(28px, 3.2vw, 40px)"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  subtitle:
    fontFamily: "Geologica, Golos Text, system-ui, Segoe UI, Arial, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  heading:
    fontFamily: "Geologica, Golos Text, system-ui, Segoe UI, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  lead:
    fontFamily: "Golos Text, system-ui, Segoe UI, Noto Sans, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Golos Text, system-ui, Segoe UI, Noto Sans, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "Golos Text, system-ui, Segoe UI, Noto Sans, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "Golos Text, system-ui, Segoe UI, Noto Sans, Arial, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "12px"
  lg: "20px"
  xl: "28px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "16px"
  "4": "24px"
  "5": "32px"
  "6": "48px"
  "7": "72px"
  "8": "120px"
components:
  button-primary:
    backgroundColor: "{colors.red}"
    textColor: "{colors.on-red}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.red-ink}"
    textColor: "{colors.on-red}"
  button-primary-big:
    backgroundColor: "{colors.red}"
    textColor: "{colors.on-red}"
    rounded: "{rounded.pill}"
    padding: "14px 26px"
    height: "56px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
    height: "44px"
  button-quiet-hover:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
  button-quiet-pressed:
    backgroundColor: "{colors.red-tint}"
    textColor: "{colors.ink}"
  button-invert:
    backgroundColor: "{colors.on-red}"
    textColor: "{colors.red}"
    rounded: "{rounded.pill}"
    padding: "14px 26px"
    height: "56px"
  tag:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  language-switch-active:
    backgroundColor: "{colors.red}"
    textColor: "{colors.on-red}"
    rounded: "{rounded.pill}"
    height: "36px"
  option-selected:
    backgroundColor: "{colors.red-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "44px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "52px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  subtitle-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.subtitle}"
    rounded: "{rounded.lg}"
    padding: "24px"
  story-field:
    backgroundColor: "{colors.red}"
    textColor: "{colors.on-red}"
    rounded: "{rounded.xl}"
    padding: "120px 0 72px"
  story-stage:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  media-frame:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
  dock-item:
    textColor: "{colors.ink}"
    size: "52px"
  dock-item-main:
    backgroundColor: "{colors.red}"
    textColor: "{colors.on-red}"
    size: "52px"
---

# Design System: Phoenix

## Overview

**Creative North Star: "The Line Between Two People"**

Phoenix is one conversation held on one screen, and the visual system is built around that single image: a true white ground where two people meet, and one committed vermilion red that carries meaning between them. The red is never sprinkled. It underlines the word that was just said, it marks the confidence number on a recognized sign, and at the two moments the page asks for attention it takes over a whole region: the scroll storyboard and the closing call. Everything else is ink tinted warm from that red, hairline rules, and generous air.

Type does the heavy lifting. Geologica at 800 weight with tight negative tracking sets the words people say, as big as subtitles in a cinema, because for a deaf reader the subtitle is the voice. Golos Text carries the reading. Media sits in large, softly rounded frames (20px and 28px) with hairline borders; reading text and subtitles always sit beside or below media, never on it. The only glass in the system is the bottom dock, an Apple-style liquid-glass bar that magnifies under the pointer; every other surface is opaque and flat.

Motion is masks and rises on an exponential ease-out: the hero stage unmasks from a rounded inset, the welcome word arrives like a subtitle, the red rule draws in beneath it, and the storyboard stage changes scene as five steps scroll past. Reduced motion collapses all of it to the final state.

**Key Characteristics:**
- True white (#ffffff) ground; one red that owns whole regions instead of decorating small ones.
- Ink and greys are tinted from the red, never neutral grey.
- Heavy Geologica display with tight tracking; Golos Text for reading at 16 to 18px.
- Pill controls, 20px and 28px media frames, 1px hairline rules for structure.
- Flat surfaces; depth comes from the red field and a few soft ambient shadows.
- The bottom dock is the only glass.
- Every piece of motion is a mask, a rise, or a drawn line, on `cubic-bezier(.16,1,.3,1)`.

## Colors

A white ground, warm red-tinted ink, and a single vermilion that means "this is the message".

### Primary
- **Phoenix Vermilion** (`red`): the line of meaning. Primary buttons, the active language pill, the rule under the welcome word, confidence figures, recording dots, progress bars, the storyboard field and the closing field. Holds 4.98:1 against white, so it may carry 16px+ semibold text on white and white text on itself.
- **Deep Vermilion** (`red-ink`): hover state of every red fill, and the danger status color. 7.8:1 on white.
- **Blush** (`red-tint`): the soft selected state: chosen options, pressed quiet buttons, the winning alternative, the ok banner, the glow under the hero stage, the search focus ring.
- **On Red** (`on-red`): text and inverted buttons sitting on a red field.

### Neutral
- **Paper White** (`surface`): page ground and every raised panel. Raised and base surfaces share it in light mode; panels separate by hairline, not by tone.
- **Warm Mist** (`surface-sunken`): tags, the language switch track, quiet-button hover, empty media slots, the reply card in the storyboard.
- **Red-Black Ink** (`ink`): all primary text, the focus outline, the ok status, the 1px rule that opens a list (news, history, settings). 18.5:1 on white.
- **Muted Ink** (`ink-muted`): leads, secondary lines, meta text. 6.4:1 on white, 5.8:1 on Warm Mist.
- **Rule Line** (`line`): the hairline between rows and around frames, tags, cards and panels.
- **Border** (`border`): the default banner stroke. Interactive strokes use ink at 18 to 40% alpha via `color-mix` instead.
- **Amber Warn** (`status-warn`): warning tags and banners only (the ASL non-commercial tag).

### Dark scheme
Dark mode inverts the ground to a red-black (`dark-surface`, with `dark-surface-raised` and `dark-surface-sunken` stepping up) and lifts the red to `dark-red` so it keeps 6.3:1 on the ground; text on red becomes `dark-on-red`. It applies through `data-theme="dark"` or the system preference when no theme is set. The red still owns the same regions.

### Named Rules
**The One Red Rule.** There is exactly one accent hue. Red either marks the single thing that matters in a component (the word, the number, the action) or fills an entire region. No second accent, no gradients of red, no red borders as decoration.

**The Tinted Ink Rule.** No neutral greys. Every ink, line and sunken tone carries the red's warmth (#1b1112, #6b5b5c, #efe3e1, #f8f2f1).

**The Ink Focus Rule.** Focus is a 2px ink outline offset 3px, in both schemes. Red never signals focus, so it stays free to mean "message".

## Typography

**Display Font:** Geologica (with Golos Text, system-ui fallback), self-hosted variable 100 to 900
**Body Font:** Golos Text (with system-ui, Segoe UI, Noto Sans, Arial), self-hosted variable 400 to 900

**Character:** Geologica at heavy weights is compact and modern, with the confident cut of signage; Golos Text is a calm, highly legible grotesque with full Cyrillic and Uzbek Latin coverage, so all three interface languages render in one voice.

### Hierarchy
- **Display** (800, `clamp(44px, min(7.4vw, 11vh), 112px)`, 0.95, -0.04em): the localized welcome word under the hero stage, set like a giant subtitle with a red rule beneath. The closing word scales further, to `clamp(52px, 10vw, 160px)` / 0.9.
- **Headline** (800, `clamp(34px, 4.6vw, 64px)`, 1.0, -0.04em): section titles. The storyboard title runs larger at `clamp(40px, 6.4vw, 96px)` / 0.95. Max width about 14ch.
- **Title** (700, `clamp(28px, 3.2vw, 40px)`, 1.12, -0.025em): page titles in the app views. The hero H1 is the same role at `clamp(30px, min(3.4vw, 5.4vh), 48px)` / 1.06, -0.035em, max 20ch. Storyboard step titles 700 `clamp(26px, 3vw, 40px)` / 1.08, max 16ch.
- **Subtitle** (700, 32px, 1.3, -0.02em): live recognized words and sentences, and speech subtitles (26px on phones). The largest reading size in the app because it is the conversation itself.
- **Heading** (600, 20px, 1.4, -0.01em): small headings, empty-state titles.
- **Lead** (400, 18px, 1.55): hero lead, story copy, news descriptions. 40 to 58ch.
- **Body** (400, 16px, 1.55): default reading text and button labels (buttons at 600).
- **Body small** (400, 14px, 20px): meta lines, helper text.
- **Label** (500, 12.5px, 16px, +0.01em): captions, tags, legends. Tags use 600 at 12px.

### Named Rules
**The Subtitle Size Rule.** Anything a person said, signed or will hear is set in Geologica at 22px or larger. Meta about it (confidence, time, language) drops to Golos Text at 12 to 14px. Hierarchy comes from that gap.

**The Tight Display Rule.** Display and headline sizes carry negative tracking from -0.025em to -0.04em and line-height at or below 1.12. Body text is never tracked.

## Layout

A single centered column, max width 1280px, with a 16px side gutter on phones (respecting safe-area insets) and 32px from 720px up. Spacing runs on an eight-step scale (4, 8, 16, 24, 32, 48, 72, 120px); sections breathe at 120px top and 72px bottom.

The landing is a vertical story, not a grid of cards. The hero is a wide, full-column media stage (`clamp(240px, 39vh, 520px)` tall; 4:3 on phones), the welcome word centered directly under it, then a hairline-topped row with headline and lead on the left (1.35fr) and actions right-aligned on the right (1fr). The storyboard is a two-column grid: steps scroll on the left (each about 52vh tall), and a sticky stage holds the right column, vertically centered. Below 960px the stage sticks at the top (`min(42vh, 360px)`) and the steps scroll under it. Lists (what it does, history, settings) are ruled tables: a 1px ink rule on top, 1px line rules between rows, a two-column term and description grid that collapses to one column under 960px.

The app views (translate, learn, history, settings) use the same column. Translate is a two-by-two grid (camera and controls left, subtitle panels right) that stacks to camera, panels, controls on tablet. The fixed dock reserves `84px + 24px` of bottom padding on every page.

Breakpoints: 560px (phone: dock spans the width, brand wordmark hides, hero row stacks with the button before the lead), 720px (gutter widens), 960px (two-column grids collapse).

## Elevation & Depth

Flat by default. Surfaces are opaque white separated by 1px hairlines, and the strongest depth cue is color: the red storyboard and closing fields sit behind the white page like a second sheet, with the storyboard's top corners rounded at 28px. Shadows are soft, ambient and low-contrast, used only where something floats or responds: the sticky story stage, hovered cards and buttons, and the dock. The 3D hero carries its own lighting (a warm key, a red rim, a soft floor shadow) inside the frame.

### Shadow Vocabulary
- **Soft ambient** (`box-shadow: 0 18px 40px -18px rgba(20,8,8,.18)`; dark `rgba(0,0,0,.6)`): the live subtitle panel at rest and learn cards on hover.
- **Button lift** (`box-shadow: 0 10px 24px -12px rgba(20,8,8,.3)`): primary button hover only.
- **Stage float** (`box-shadow: 0 30px 60px -30px rgba(0,0,0,.35)`): the white storyboard stage over the red field.
- **Dock glass** (layered outer drop plus inset white highlights, see Components): only the dock.

### Named Rules
**The One Glass Rule.** `backdrop-filter` glass belongs to the bottom dock alone. Every other surface, including the sticky top bar, is opaque.

**The Red Field Rule.** Depth on the landing comes from switching ground to red, not from stacking shadows. A red field gets white type and an inverted white button, and nothing else.

## Shapes

Soft but not bubbly. Controls are full pills (999px): buttons, tags, the language switch, the search field, confidence chips. Containers step through a small radius scale: 6px, 12px (options, inputs, selects, banners), 20px (cards, panels, the camera frame, phone hero), 28px (the hero stage, the storyboard field and stage, video slots). Borders are 1px hairlines in the rule color; interactive outlines use ink at 18 to 40% alpha. The hero stage enters from an inset clip with 48px rounded corners that opens to the full frame. The logo's four quarter-arcs are the recurring geometry and draw themselves in red on the entrance sheet.

## Components

### Buttons
Confident, pill-shaped, with a small physical response.
- **Shape:** full pill (999px), 44px minimum height; big variant 56px with 14px 26px padding at 17px.
- **Primary:** Phoenix Vermilion fill, white Golos Text 600 16px, padding 10px 18px, optional 20px trailing arrow icon.
- **Hover / Active:** fill deepens to Deep Vermilion with the button-lift shadow; the arrow slides 3px right on the ease-out; press scales to 0.97. Disabled at 45% opacity.
- **Quiet:** transparent with a 1px ink-22% stroke and ink text; hover fills Warm Mist and the stroke darkens to 40%; pressed (`aria-pressed`) gets a red stroke on Blush, with an on/off state pill inside.
- **Invert:** white fill with red text, used only on a red field (the closing call).

### Tags and chips
- **Tag:** pill, Warm Mist fill, 1px rule stroke, ink 600 12px, 3px 10px. The warn tag goes transparent with an amber stroke and text.
- **Confidence chip (storyboard):** pill, Warm Mist, Geologica 700 at `clamp(22px, 2.4vw, 32px)`, with the confidence figure in red tabular Golos Text 13px beside the word.

### Cards / Containers
- **Corner Style:** 20px.
- **Background:** Paper White, 1px rule stroke.
- **Shadow Strategy:** none at rest; hover lifts 2px with the soft ambient shadow and a stroke mixed 50% toward red. Selected cards take a 1px red inset ring.
- **Internal Padding:** 16px (cards), 24px (subtitle panels).

### Inputs / Fields
- **Style:** 44px tall, 12px radius, white fill, 1px ink-22% stroke, 16px horizontal padding. Search is a 52px pill at 18px text. Caret is red.
- **Focus:** search shifts its stroke to red with a 3px Blush ring; everything else uses the 2px ink focus outline.
- **Options (radio cards):** 44px, 12px radius, ink-18% stroke; checked becomes a red stroke plus red inset ring on Blush.
- **Switch:** 48 by 28px track at ink 16%, white knob; checked track turns red.

### Navigation
- **Top bar:** sticky, 64px, opaque white; a hairline appears under it once the page scrolls. Logo mark plus Geologica 700 20px wordmark (hidden under 560px), the demo-mode tag, and the UZ/RU/EN switch: a Warm Mist pill track whose active language is a solid red pill with white 700 13px letters.
- **Bottom dock:** the primary navigation, see below.

### Liquid-Glass Dock (signature)
A floating bar centered 14px above the bottom edge: 26px radius, 8px padding, a white-to-translucent vertical gradient (62% to 34%), `blur(20px) saturate(1.9) brightness(1.04)`, a 75%-white hairline, an outer drop shadow plus inset top highlight, and a soft-light radial sheen. Items are 52px rounded squares (14px radius) on 72% white; the main item (translate) is solid red with a white icon. On pointer devices items magnify under the cursor up to 1.55x within a 150px range on a cosine falloff; a dark ink tooltip rises above the hovered item; the current view gets a 5px red dot below. On touch or under 560px the dock spans the width with transparent items and small labels under each icon.

### Storyboard Stage (signature)
A white 28px-radius stage floating on the red field, sticky beside five scrolling steps. Each step brings its scene in with a fade, an 18px rise and a de-blur: the camera (dark frame, red record dot, white corner brackets, a pulsing frame stream), recognized words with confidence, the built sentence in Geologica 800, the voice (red speaker icon and equalizer), and the reply as a subtitle card. Five progress pills fill red and widen from 22 to 40px as the story advances. Inactive steps sit at 82% opacity.

### Hero Welcome Stage (signature)
A full-column 28px frame with a hairline border and a Blush radial glow rising from below, holding a three.js render of two people's hands signing "welcome" in turn, labelled with a small "3D" pill tag in the corner. Under it, the localized welcome word in Display with a 5 to 9px red rule that draws in from the left, and a muted caption. Without WebGL, a still render fills the frame.

### Subtitle Panel
The live conversation surface in the translate view: 20px radius, hairline stroke, soft ambient shadow, 24px padding, 240px minimum height. A muted label row, recognized words in Subtitle size each with a red confidence figure raised above, alternatives as small pills (the winner on Blush), and a hairline-topped meta row.

## Do's and Don'ts

### Do:
- **Do** let red fill a whole region (storyboard, closing call, landing footer) when the page needs a moment, and invert the button to white-on-red there.
- **Do** keep red to one meaning inside a component: the action, the said word's rule, or the confidence number.
- **Do** set everything a person said or signed in Geologica at 22px or more, and keep meta in Golos Text at 12 to 14px.
- **Do** separate panels with 1px hairlines (#efe3e1) and open ruled lists with a 1px ink line.
- **Do** use pills for controls and 20px or 28px radii for media and panels.
- **Do** animate with masks, rises and drawn rules on `cubic-bezier(.16,1,.3,1)`, and collapse everything to the end state under reduced motion.
- **Do** label any rendered or demo content as such (the "3D" tag on the hero, "Namoyish rejimi", the non-commercial ASL tag).
- **Do** show focus as a 2px ink outline offset 3px.

### Don't:
- **Don't** introduce a second accent hue or red gradients; the only gradients are the Blush glow under the hero stage and the dock's glass.
- **Don't** use neutral greys; every ink and rule tone is tinted from the red.
- **Don't** put `backdrop-filter` glass anywhere but the dock.
- **Don't** lay reading text or subtitles over live camera video or the hero render; only a small status pill in a corner (camera state, the "3D" tag) may sit on media.
- **Don't** draw skeleton, wireframe or landmark-dot hands anywhere; signers are shown as real people or as a labelled realistic render.
- **Don't** fall back to a split hero with a grid of feature cards; the landing is one story read top to bottom.
- **Don't** use red to signal focus or decoration-only borders.
