# Product

<!-- impeccable:product-schema 1 -->

_Written 2026-11-25 from the team's confirmed project decisions (README, docs/API.md). Facts marked (inferred) were not asked directly._

## Platform

web

## Users
- Deaf and hard-of-hearing people who sign Russian Sign Language (RSL) or American Sign Language (ASL) and need to be understood by a hearing person in the moment: a clinic, a shop, a street, an office.
- The hearing person on the other side of the same screen, who reads or hears the signer and answers by speaking.
- Hackathon judges and mentors ("ustozlar") evaluating the MVP in one week. (inferred: they are the first real audience of the landing page)

## Product Purpose
Phoenix turns sign language seen by a browser camera into text and voice, and turns the hearing person's speech back into subtitles, so two people can hold one conversation on one screen. Success: a signer and a speaker finish a short real exchange without a human interpreter.

## Positioning
Two-way on one screen, in the browser, with Uzbek as an output language: Russian and American signs come out as Uzbek, Russian or English text and speech. No install, no account.

## Operating Context
- Browser only. Camera frames go over WebSocket to the backend (`/ws/sign?lang=rsl|asl`, `target_lang`), speech chunks to `/api/stt`, word lists to `/api/sentence`.
- Recognition needs a GPU; the free Colab/Kaggle T4 is the live path. Without a server the site runs a clearly labelled demo mode ("Namoyish rejimi") on sample data.
- History is tied to the browser (X-Client-Id), no login.

## Capabilities and Constraints
- Recognizes RSL (Slovo, 1000 words) and ASL (WLASL-based, 2000 words). There is no Uzbek sign dataset: Uzbek is an output language only, never a recognized sign language.
- Shows each recognized word with its confidence and alternatives; builds a sentence on "finish"; reads it aloud with the browser voice.
- ASL model is non-commercial (WLASL C-UDA) and must be labelled "Demo only, non-commercial".
- Speech may be transcribed by Google Gemini; the UI must say so when it happens.
- Never claim accuracy numbers, real-time speed, or features the backend does not have. Text-to-sign avatar is Phase 2 and must not be shown as working.

## Brand Commitments
- Name: Phoenix. Logo: the four-arc mark in `frontend/assets/logo.svg`.
- Fonts: Golos Text (text) and Geologica (display), self-hosted, SIL OFL.
- 2026-11-25 redesign brief (binding): white and red; animated landing; no skeleton or wireframe hands anywhere; the hero is real footage of two people signing "Welcome" with the localized caption under it; the whole site in Uzbek, Russian and English with a switch that changes every section; an Apple-style bottom dock with a liquid-glass look; a scroll-driven storyboard.
- Voice: plain, friendly, concrete. No "it's not X, it's Y" constructions, no hype.

## Evidence on Hand
- Real backend with tests; demo mode for when no GPU is running.
- No licensed footage of signers yet: the hero welcome clip is a labelled placeholder until the team films it (`frontend/assets/hero/README.md`).
- The existing motion-graphics demo video (`frontend/assets/demo/demo.mp4`) drew skeleton hands, so it was removed from the site; the team will supply a real demo recording.
- No testimonials, users, accuracy benchmarks or partners exist. Do not invent them.

## Product Principles
1. The conversation is the product: every surface shows both people, the signer and the speaker.
2. Say what happens, never more: demo is labelled demo, non-commercial is labelled non-commercial.
3. Real people, real hands: no synthetic or skeletal stand-ins for signers.
4. Works in the visitor's language: every string exists in UZ, RU and EN.

## Accessibility & Inclusion
- Primary users are deaf: nothing important may live only in sound; text never sits on top of live video.
- Large readable type for subtitles, WCAG AA contrast, keyboard reachable controls, reduced-motion respected.
