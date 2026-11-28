---
version: 1
slug: "mobile-index-html"
primary_target: "mobile/index.html"
related_targets: []
---

# Mobile app (Android, Capacitor) — Operate

Scope: the whole phone app in mobile/ (conversation, dictionary, history, profile + sign-in). Visitor mode: Operate.
Audience: a deaf signer (RSL/ASL) and a hearing person sharing one phone; temur's judges testing the APK.
Job: hold a short two-way exchange on one phone; sign in with Google or GitHub so history follows the account.
Constraints: white + red world from DESIGN.md (one red, tinted ink, Geologica/Golos), Material 3 structure (navigation bar, top app bars, filled/tonal buttons, chips, snackbars, bottom sheets), system Back, edge-to-edge insets, UZ/RU/EN everywhere, demo mode clearly labelled, no skeleton hands, no text over live camera.

## Direction contract
THESIS: One phone, two people, one red line. The conversation screen is split: the half nearest the holder reads the other person; the far half is rotated 180° for the person across the table. Refuses the category default of a single camera screen with a caption strip.
OWN-WORLD: White ground, ink tinted from red, red used for the line, the primary action and the current tab only. Geologica for anything said or signed (22px+), Golos for controls. Material 3 shapes: 28px sheets, pill buttons, 12px cards.
STORY: Open, see both halves at once, press the red button on the line, sign; words appear on your side, the finished sentence appears big on the other side and is spoken.
MEMORABLE: The red line itself: it carries the status and the finish button, and a finished sentence crosses it.
FORM: seed:9ff3848c9464fcbb (degraded roll, no challengers); dealt lead "face-to-face split" chosen by temur.
RISKS: text over camera (keep the preview a framed window), upside-down half unreadable (large type, generous margins), nav bar eating the split (nav hides while a conversation is live).
