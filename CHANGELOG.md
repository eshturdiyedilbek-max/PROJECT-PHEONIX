# O'zgarishlar tarixi

Har bir versiyada nima qo'shilgani va o'zgargani. Sanalar 2026 yil.

## 2026-11-28: Maxfiylik siyosati va ro'yxatdan o'tishda rozilik

### Qo'shildi
- Maxfiylik siyosati sahifasi (`#maxfiylik`), o'zbek, rus va ingliz tilida: kamera kadrlari, ovoz, matn, ikki kishilik suhbat va video qo'ng'iroq, tarix, video hissa, to'lov, akkaunt ma'lumotlari, saqlash muddatlari, huquqlar va aloqa. Matn `frontend/js/privacy-text.js` da, versiya va sana bilan.
- Ro'yxatdan o'tishda majburiy "Maxfiylik siyosati bilan tanishib chiqdim va unga roziman" belgisi. Belgisiz akkaunt ochilmaydi, rozilik versiyasi va vaqti akkauntga yoziladi. Google va GitHub tugmalari ostida ham rozilik izohi.
- Akkaunt sahifasida "Akkauntni o'chirish" (tasdiqlash bilan).
- Saytning pastki qismida va ovozli suhbat panelida siyosatga havola.

### O'zgardi
- Loyihani vaqtinchalik ish deb ko'rsatadigan yozuvlar sayt va repodan olib tashlandi. Phoenix to'laqonli mahsulot.

## 2026-11-28: Colab server sayt bilan o'zi ulanadi

### Qo'shildi
- Colab notebookda 7c qadami: server ishga tushgach, uning yangi manzili `frontend/server.json` ga GitHub orqali yoziladi, Vercel saytni bir daqiqada yangilaydi va hamma shu GPU serverga ulanadi. Token faqat o'qiy olsa, notebook qo'lda nima qilishni aytadi.
- `backend/scripts/smoke_chat.py`: ikki kishilik suhbatni (`/ws/chat`) tunnel orqali tekshiradi (xona ochadi, qo'shiladi, ikki tomonga bittadan gap yuboradi). Notebookning 8-qadami endi buni ham ishlatadi.
- Notebook sozlamalarida `UPDATE_SITE`, `SITE_URL` va video qo'ng'iroq uchun ixtiyoriy `CHAT_ICE_SERVERS` (TURN).

## 2026-11-28: bir-birini ko'rib suhbat, 10 ta imo-ishora tili, katta logo

### Qo'shildi
- Suhbatda video qo'ng'iroq: ikki kishi bir-birini ko'radi. Video brauzerdan brauzerga (WebRTC) boradi, server faqat ulanish xabarlarini uzatadi (`WS /ws/chat` ichida `type: "rtc"`). Imo-ishora tomonining kamerasi ham tanish, ham video uchun ishlaydi; ovozli tomon kamerasini xohlasa yoqadi. Suhbatdoshning kamerasi o'chiq bo'lsa, katta oynada o'zingiz ko'rinasiz.
- `GET /api/chat/ice` va `CHAT_ICE_SERVERS` (TURN server qo'shish uchun), 2 ta yangi test.
- Bosh sahifada "Dunyodagi eng ko'p ishlatiladigan 10 ta imo-ishora tili": Ethnologue hisoblari bo'yicha, masshtabli chiziqlar bilan. RSL va ASL "Ishlaydi", qolganlari "Tez orada". Suhbatda va Sozlamalarda ham shu 10 ta til ro'yxati.
- Imo-ishora tomoni suhbat boshlashdan oldin tilni (RSL/ASL) va gap qaysi tilda borishini (o'zbek, rus, ingliz) tanlaydi.

### O'zgardi
- Bosh sahifadagi 3D "Xush kelibsiz" qo'llari olib tashlandi; o'rnida katta Phoenix logosi chiziladi. Yuqoridagi kichik logo katta logo ekrandan chiqqanda paydo bo'ladi.
- Eski bitta ekranli "Tarjima" sahifasi olib tashlandi: tarjima endi faqat suhbat orqali. Eski `#translate` havolalari suhbatga ochiladi. three.js va 3D qo'l modellari repodan chiqarildi.



## 2026-11-28: ikki kishilik suhbat, sekinroq storyboard

### Qo'shildi
- Suhbat sahifasi (`#suhbat`): ikki kishi har biri o'z qurilmasidan gaplashadi. "Imo-ishora rejimi"dagi odamning kamerasi so'zlarni taniydi va tayyor gap suhbatdoshga boradi; "Ovozli rejim"dagi odamning gapi subtitr bo'lib boradi. Ikkalasi ham yozib yuborishi mumkin.
- Ikki yo'l: tasodifiy suhbatdosh (boshqa rejimda kutib turgan birinchi odam) yoki 6 belgili xona kodi va ulashiladigan havola (`?xona=KOD#suhbat`).
- Backend: `WS /ws/chat` va `GET /api/chat/stats` (`backend/app/chat/`), 6 ta yangi test. Protokol `docs/API.md` 10-bo'limda.
- Bosh sahifada ikki katta tugma: "Imo-ishora rejimi" va "Ovozli rejim", orasida ikki tomonga yuradigan qizil chiziq. Dock'da "Suhbat".

### O'zgardi
- Storyboard sekinroq: har bir sahna taxminan 1,5 ekran scroll oladi (oldin 1 ekrandan kam), sahna ichidagi qismlar scroll bilan birga harakatlanadi (so'zlar birma-bir chiqadi, gap o'zi yoziladi, progress chizig'i to'ladi), qadam matni sahnasi bilan birga turadi. Telefon ham shunday.

## 2026-11-26: namoyish rejimi olib tashlandi, lug'at videolari saytning o'zida

- "Namoyish rejimi" va "Faqat namoyish, tijorat uchun emas" yozuvlari olib tashlandi. Server bo'lmasa sayt soxta so'z va subtitr chiqarmaydi, "Tanish serveri hozir o'chiq" deb aytadi. Lug'at va tarix serversiz ham ishlaydi.
- Lug'at videolari endi sahifaning o'zida o'ynaydi. Colab'dagi yangi 6b katak har bir rus so'ziga Slovo videosini tayyorlaydi (`backend/scripts/fetch_dictionary_clips.py`). Videosi yo'q so'zda shunday deb yoziladi, boshqa lug'atga faqat kichik havola qoldi.

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
- O'zbekcha README: loyiha nima qiladi, qanday ishlaydi, texnologiyalar, repo tuzilishi, ishga tushirish, natijalar va cheklovlar.

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
