# O'zgarishlar tarixi

Har bir versiyada nima qo'shilgani va o'zgargani. Sanalar 2026 yil.

## 2026-11-25: bosh sahifa uchun demo video

### Qo'shildi
- Motion-graphics demo video (`frontend/assets/demo/demo.mp4`): 35 soniya, 1080p, 120 fps, o'zbekcha matn. Muammo, kamera orqali tanish, Gemini gap tuzishi, ovoz, javob subtitri va imkoniyatlarni ko'rsatadi. Bosh sahifadagi "Jonli namoyish" bo'limida avtomatik chiqadi, muqovasi `demo-poster.jpg`.
- Video manbasi `tools/motion-video/`: canvas sahnasi, Playwright bilan kadrlarni chizish, ffmpeg bilan yig'ish. Videoni bitta buyruq bilan qayta yaratish mumkin.

## 2026-11-25: haqiqiy sayt va tartibli repo

### Qo'shildi
- **Sayt (`frontend/`)**, Phoenix Studio dizaynida va serverga ulangan:
  - Bosh sahifa: "Sinab ko'rish" tugmasi, aylantiriladigan 3D qo'l, demo video joyi, "Ichida nima bor" va "Nimasi yangi" bo'limlari, kirish animatsiyasi.
  - Tarjima: kamera, kadrlarni `WS /ws/sign` ga yuborish, har bir so'z ishonch foizi va muqobillari bilan, "Tugatish va gap tuzish" (Gemini), gapni ovoz chiqarib o'qish, RSL/ASL va gap tilini (o'zbek, rus, ingliz) tanlash.
  - Subtitr: mikrofondan 4 soniyalik bo'laklar `POST /api/stt` ga, jim bo'laklar yuborilmaydi.
  - Xatolar va holatlar `frontend-resources/states.md` bo'yicha: server sekin (CPU), model yo'q, ulanish uzilsa 1-2-4…10 soniyada qayta ulanish, 30 soniya jimlikdan keyin "Davom etish".
  - Lug'at: 3000 ta imo-ishorani qidirish, tur va til bo'yicha filtr, rozilik bilan 4 soniyalik video yuborish.
  - Tarix: ko'rish, bittalab o'chirish, hammasini tozalash.
  - Sozlamalar: ovoz, gap tuzish, nutq tili, tarixni saqlash, mavzu, server manzili (Colab havolasi uchun, yoki `?api=` orqali).
- Server saytni `/` manzilida beradi (`SERVE_FRONTEND`, `FRONTEND_DIR`). Colab tunneli endi bitta havola: sayt ham, API ham.
- Sayt uchun testlar (`backend/tests/test_frontend.py`). Jami 108 ta test.
- "Ishlar davomida" bo'limi: dizayn izlanishlari, Colab va tayyor sayt rasmlari ([`docs/progress/`](docs/progress/README.md)).
- O'zbekcha README ustozlar va hakamlar uchun: loyiha nima qiladi, qanday ishlaydi, texnologiyalar, repo tuzilishi, ishga tushirish, natijalar va cheklovlar.

### O'zgardi
- Repo tuzilishi: server kodi `backend/` papkasiga ko'chdi (`app/`, `tests/`, `scripts/`, `config/`, `data/`, `pyproject.toml`, `Dockerfile`). Inglizcha texnik README endi `backend/README.md`.
- Colab notebook va Docker yangi tuzilishga moslandi. Notebook oxirida **Website** havolasini chiqaradi.
- `.env` fayli `backend/.env` yoki repo ildizida bo'lishi mumkin.

## 2026-11-25: dizayn tizimi
- `frontend-resources/`: ranglar (yorug' va qorong'i), Golos Text va Geologica shriftlari, logotip, komponentlar, holatlar qo'llanmasi.
- Bepul Google Colab T4 GPU uchun bir tugmali notebook (`deploy/`).

## 2026-11-24: server (backend)
- Rus imo-ishora tili (Slovo, 1000 so'z) va amerika imo-ishora tili (SignFlow-A, 2000 so'z) real vaqtda tanish, WebSocket orqali.
- Nutqdan matn: Gemini (o'zbek tili uchun yaxshiroq) va Whisper zaxira sifatida.
- So'zlardan gap: Gemini, ishlamasa so'zlar o'zicha qaytadi.
- Lug'at, tarix, video yuborish, salomatlik tekshiruvi API'lari. Docker Compose, PostgreSQL yoki SQLite.
- Tuzatish: ASL belgilari alifbo tartibida bo'lishi kerak ekan (aniqlik 0% dan 74% ga chiqdi).
