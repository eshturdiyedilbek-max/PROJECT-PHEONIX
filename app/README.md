# Phoenix Android ilovasi

`frontend/` saytining o'zi, Capacitor ichida. Yuklab olish, o'rnatish va serverga ulash: [`../deploy/SAYT-VA-ILOVA.md`](../deploy/SAYT-VA-ILOVA.md).

| Fayl | Vazifasi |
| --- | --- |
| `capacitor.config.json` | Ilova nomi va identifikatori (`uz.phoenix.signs`) |
| `scripts/copy-web.mjs` | `../frontend` ni `www/` ga ko'chiradi (APK ichiga shu kiradi) |
| `assets/` | Ikonka va ochilish ekrani manbalari (`npx capacitor-assets generate --android`) |
| `android/` | Android loyihasi: kamera va mikrofon ruxsatlari `app/src/main/AndroidManifest.xml` da |

Yig'ish: `npm ci && npm run apk` (Android SDK va JDK 21 kerak) yoki GitHub Actions (`.github/workflows/android-apk.yml`).
