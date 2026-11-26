# O'zgarishlar tarixi

Har bir versiyada nima qo'shilgani va o'zgargani. Sanalar 2026 yil.


## 2026-11-26: kamera xabarlari va lug'at video qo'llanmasi

- Kamera ochilmasa, endi sababi aniq yoziladi (oldindan ko'rish oynasi bloklagan, ruxsat yo'q, boshqa dastur band qilgan, https emas, kamera yo'q) va nima qilish kerakligi aytiladi. Yonida "Namuna video bilan sinash" tugmasi bor. Kamera ochilmasa urinish sarflanmaydi.
- Lug'atdagi har bir so'zda video qo'llanma: o'zimizdagi kliplar (Slovo RSL, 3D ASL) sahifaning o'zida o'ynaydi, qolganlari uchun tirik odam ko'rsatgan video Spread The Sign / SignASL'da yangi oynada ochiladi.
- Qidiruvda aniq mos so'z birinchi chiqadi.

## 2026-11-26: ro'yxatdan o'tish, Pro va voucher

### Qo'shildi
- Email va parol bilan ro'yxatdan o'tish va kirish (Akkaunt sahifasi). Namoyish versiyasi: akkaunt shu brauzerda saqlanadi, parol faqat PBKDF2 xeshi ko'rinishida.
- To'lov sahifasi (`#tolov`): karta raqamidan turini aniqlaydi (Visa, Mastercard, UzCard, Humo, Mir, Amex, UnionPay), muddat, CVV, voucher. "Faqat voucher" usuli kartasiz ochadi. `TBA ACADEMY` voucheri Pro'ni bepul ochadi. Karta orqali to'lov hali hech qanday to'lov tizimiga ulanmagan va sayt buni ochiq aytadi.
- Bepul rejada 15 ta urinish, Pro'da oyiga 1 000 ta. Tarjima sahifasida qolgan urinishlar ko'rinadi.
- Pro ochilganda tabrik ekrani: konfetti, logotip chiziladi, iliq so'zlar.
- Bosh sahifada katta "Tarjimani boshlash" tugmasi.

### O'zgardi
- Narxlar: "Tashkilot" rejasi olib tashlandi, Pro afzalliklari aniq ko'rsatildi.
- Tarjima dock'da boshida yo'q: katta tugma orqali kirilgandan keyin dock'da paydo bo'ladi.
- "Xush kelibsiz" 3D sahnasida endi bitta odam; ostidagi ASL yozuvi olib tashlandi.

## 2026-11-26: sayt internetda va Android ilovasi

### Qo'shildi
- Android ilovasi (`app/`, Capacitor 8): saytning o'zi telefon ichida, kamera va mikrofon ruxsatlari bilan, gapni telefonning ovoz dvigateli o'qiydi. Ikonka va ochilish ekrani oq-qizil uslubda.
- GitHub Actions APK ni o'zi yig'adi: har PR'da "Artifacts", `main` ga har push'da "Releases".
- Vercel uchun `vercel.json`: sayt bepul doimiy manzilda, `main` o'zgarsa o'zi yangilanadi.
- Saytni telefonga o'rnatish (PWA): `manifest.webmanifest`, ikonkalar.
- Qadam-baqadam ko'rsatma: `deploy/SAYT-VA-ILOVA.md`.

### O'zgardi
- Brauzer yorlig'idagi logo qizil (oldin eski yashil rang edi).
- Bosh sahifadagi 3D qo'llar endi haqiqiy **ASL WELCOME** belgisini ko'rsatadi: tekis kaft (B shakli) yondan, kaft yon tomonga qarab, katta yoy bilan ko'krak markaziga keladi va kaft yuqoriga qaraydi. Ikki kishi navbat bilan, oldidan ko'rinib turadi (sviterli gavda, bo'yindan kesilgan). Manba: Lifeprint (ASL University), Wiktionary.

## 2026-11-25: yangi dizayn (oq va qizil)

### Qo'shildi
- Bosh sahifa: ikki kishining qo'llari "xush kelibsiz" deb imo-ishora qiladi (three.js 3D tasvir, "3D" belgisi bilan; model MIT, `frontend/assets/hands/`), ostida tanlangan tilda "Xush kelibsiz".
- Uch til: o'zbek, rus, ingliz. Til almashtirgich saytdagi har bir bo'limga ta'sir qiladi (bosh sahifa, tarjima, lug'at, tarix, sozlamalar, xato va holat xabarlari, namoyish rejimi).
- Pastda shisha (liquid glass) dock: sichqoncha yaqinlashganda belgilar kattalashadi, telefonda yozuvlari bilan to'liq kenglikda.
- Aylantirganda storyboard: "Bir suhbat, besh lahza", kamera, so'zlar, gap, ovoz va javob ketma-ket.
- `PRODUCT.md`, `DESIGN.md`, `.impeccable/`: impeccable dizayn ko'nikmasi bo'yicha mahsulot va dizayn tizimi hujjatlari.
- `docs/progress/` ga yangi dizayn rasmlari.

### O'zgardi
- Ranglar: toza oq fon va bitta qizil (#d9241c). Standart mavzu yorug', standart til o'zbekcha.

### Olib tashlandi
- Oldingi dizayndagi skelet 3D qo'l (`hero3d.js`, `hand-model.js`) va skelet qo'lli demo video (`demo.mp4`, `demo-poster.jpg`). Haqiqiy yozuv `frontend/assets/demo/real.mp4` ga qo'yilsa, bosh sahifada o'zi chiqadi.

## 2026-11-25: bosh sahifa uchun demo video

### Qo'shildi
- Motion-graphics demo video (`frontend/assets/demo/demo.mp4`): 87 soniya, 1080p, 120 fps, o'zbekcha matn. To'rt vaziyat (shifoxona, do'kon, ko'cha, idora; RSL va ASL), ikki tomonlama suhbat, ish jarayoni, ochiq resurslar va texnologiyalar, tillar, sinov natijalari. Videoda tashqi xizmat nomlari ko'rsatilmaydi (gap tuzish qadami "Phoenix" deb chiqadi). Bosh sahifadagi "Jonli namoyish" bo'limida avtomatik chiqadi, muqovasi `demo-poster.jpg`.
- Video manbasi `tools/motion-video/`: canvas sahnasi, Playwright bilan kadrlarni chizish, ffmpeg bilan yig'ish. Videoni bitta buyruq bilan qayta yaratish mumkin.

## 2026-11-25: namoyish rejimi (serversiz ishlaydi)

### Qo'shildi
- Sayt endi ikki rejimda ishlaydi. Server javob bersa **jonli** (`/ws/sign`, `/api/*`), javob bermasa **namoyish** rejimi. Namoyish standart: GPU yoki server bo'lmasa ham sayt doim ochiladi.
- Namoyish rejimida tarjima namuna imo-ishoralar ketma-ketligini (RSL va ASL, 4 tadan gap) ishonch foizi va muqobillari bilan ko'rsatadi, "Tugatish" bosilsa tanlangan tilda gap chiqadi va o'qiladi. Kamera ruxsat berilmasa ham ishlaydi.
- Namoyishda subtitr namuna javoblar bilan (mikrofon ishlatilmaydi), lug'at to'liq 3000 ta imo-ishora bilan (`frontend/js/demo-dictionary.js`, `backend/scripts/make_demo_dictionary.py` yaratadi), tarix brauzerda saqlanadi. Video yuborish faqat jonli rejimda.
- Ekranda doim "Namoyish rejimi" belgisi va tarjima sahifasida tushuntirish turadi, shuning uchun namuna so'zlar haqiqiy tanish deb ko'rsatilmaydi.
- Sozlamalar > Ish rejimi: Avtomatik, Faqat server, Namoyish.

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
