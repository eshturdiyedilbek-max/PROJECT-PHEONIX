# Backendni o'z kompyuteringda ishga tushirish (Colab'siz)

GPU ham, pul ham kerak emas. Server kompyuteringning protsessorida (CPU) ishlaydi, Cloudflare esa unga bepul `https://...trycloudflare.com` manzil beradi. Sayt (Vercel) shu manzilga ulanadi.

## Bir buyruq

Repo papkasida terminal oching va yozing:

```bash
./deploy/run_local.sh
```

Birinchi marta 5-10 daqiqa oladi (Python, kutubxonalar, ~300 MB model yuklanadi). Keyingi safar 1 daqiqa. Oxirida manzil chiqadi:

```
Sayt + API:  https://xxxx.trycloudflare.com
```

Shu manzilni ochsang, sayt to'liq ishlaydi (sayt ham, API ham bitta manzilda).

## Boshqa buyruqlar

| Buyruq | Nima qiladi |
|---|---|
| `./deploy/run_local.sh stop` | serverni o'chiradi |
| `./deploy/run_local.sh status` | ishlayaptimi, manzili qanaqa |
| `./deploy/run_local.sh logs` | oxirgi log qatorlari |

## Bilish kerak

- Kompyuter yoqiq va internetga ulangan turishi kerak. Yopsang, sayt "demo rejim"ga o'tadi.
- Har qayta ishga tushirganda manzil o'zgaradi. `GITHUB_TOKEN` bersang, skript yangi manzilni `frontend/server.json`ga o'zi yozadi va Vercel 1 daqiqada yangilanadi.
- CPU GPU'dan sekinroq: bitta so'z bir necha soniyada chiqadi. Tezroq kerak bo'lsa: `RSL_MODEL=mvit16-4 ./deploy/run_local.sh` (2 baravar yengil, aniqlik biroz past).
- Gemini (yaxshiroq ovoz → matn) uchun `backend/.env` fayliga `GEMINI_API_KEY=...` yoz. Bo'lmasa Whisper ishlatiladi.
- Fayllar `~/.phoenix` papkasida turadi. O'chirib tashlasang hammasi tozalanadi.
