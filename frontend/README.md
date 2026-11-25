# Phoenix sayti (frontend)

Oddiy HTML, CSS va JavaScript. Build bosqichi, npm yoki framework yo'q: fayllar brauzerga o'zgarishsiz beriladi. Sayt [`../backend`](../backend) serveri tomonidan `/` manzilida beriladi, shuning uchun alohida ishga tushirish shart emas.

## Fayllar

| Fayl | Vazifasi |
| --- | --- |
| `index.html` | Barcha sahifalar bitta faylda. Har bir sahifa `<section data-view="...">` |
| `css/app.css` | Dizayn: [`../frontend-resources`](../frontend-resources/README.md) ranglari, shriftlari va komponentlari, hamda animatsiya |
| `js/main.js` | Sahifalar orasida o'tish (`#translate`, `#learn`, `#history`, `#sozlamalar`), kirish animatsiyasi, demo video |
| `js/translate.js` | Tarjima: kamera kadrlarini `WS /ws/sign` ga yuborish, so'zlar va gapni ko'rsatish, ovoz, mikrofon orqali subtitr (`POST /api/stt`) |
| `js/learn.js` | Lug'at (`GET /api/dictionary`) va video yuborish (`POST /api/contributions`) |
| `js/history.js` | Tarix (`GET/DELETE /api/history`) |
| `js/api.js` | Server bilan aloqa, xato xabarlari tanlangan tilda, brauzer identifikatori (`X-Client-Id`) |
| `js/settings.js` | Sozlamalar, brauzerning `localStorage` xotirasida |
| `js/demo.js`, `js/demo-dictionary.js` | Namoyish rejimi: server o'rnida namuna ma'lumotlar |
| `js/hero-hands.js` | Bosh sahifadagi ikki kishining "xush kelibsiz" deyayotgan 3D qo'llari (three.js). Model: [`assets/hands/`](assets/hands/README.md), MIT |
| `js/i18n.js` | Uch til (o'zbek, rus, ingliz): saytdagi har bir matn shu yerda |
| `js/motion.js` | Harakatni kamaytirish sozlamasi va `?motion=off` |
| `vendor/three/` | three.js r170 (MIT), build bosqichisiz ulangan |

Har bir server holati va xatosi uchun nima ko'rsatilishi [`../frontend-resources/states.md`](../frontend-resources/states.md) da yozilgan va shu bo'yicha qilingan.

## Ikki rejim

`js/api.js` dagi `resolveMode()` sayt ochilganda `/api/health` ni tekshiradi (3 soniya). Javob kelsa jonli rejim, kelmasa namoyish rejimi (`js/demo.js`). Ikkalasida ham bir xil funksiyalar va bir xil javob shakllari, shuning uchun sahifalar rejimni bilmaydi. `js/demo-dictionary.js` ni `backend/scripts/make_demo_dictionary.py` yaratadi.

## Lokal ishga tushirish

```bash
cd ../backend && .venv/bin/uvicorn app.main:app
# brauzerda: http://localhost:8000
```

Serversiz namoyish uchun: `python3 -m http.server 8080` (shu papkada), keyin http://localhost:8080.

Kamera faqat `https://` yoki `localhost` manzilida ishlaydi (brauzer talabi).

## Demo video

Haqiqiy ekran va kamera yozuvini `assets/demo/real.mp4` nomi bilan qo'ying. Bosh sahifada u o'zi paydo bo'ladi. Fayl bo'lmasa, bo'lim ko'rinmaydi.
