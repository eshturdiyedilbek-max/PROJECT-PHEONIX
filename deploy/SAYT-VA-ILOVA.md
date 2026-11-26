# Saytni internetga chiqarish va Android ilovasi

Ikki qism: avval sayt doimiy manzilda (bepul, Vercel), keyin telefon uchun APK (GitHub o'zi yig'adi). Ikkalasida ham server bo'lmasa **namoyish rejimi** ishlaydi, Colab ishga tushsa, haqiqiy tanish ishlaydi.

## 1. Sayt: Vercel (bepul, bir marta sozlanadi)

1. https://vercel.com/signup ni oching va **Continue with GitHub** ni bosing. GitHub akkauntingiz bilan kiring.
2. "Plan" so'rasa **Hobby** (bepul) ni tanlang, ismingizni yozing.
3. **Add New...** → **Project** ni bosing.
4. Ro'yxatda `PROJECT-PHEONIX` ko'rinmasa: **Adjust GitHub App Permissions** → **Only select repositories** → `PROJECT-PHEONIX` ni tanlang → **Save**.
5. `PROJECT-PHEONIX` yonidagi **Import** ni bosing.
6. Hech narsani o'zgartirmang (sozlamalar repodagi `vercel.json` da bor) va **Deploy** ni bosing.
7. 1 daqiqadan keyin "Congratulations" chiqadi. Manzil `https://project-pheonix-....vercel.app` ko'rinishida bo'ladi. Shu sayt.

Bundan keyin `main` ga har bir o'zgarish kirganda Vercel saytni o'zi yangilaydi.

## 2. Saytni Colab serveriga ulash

Colab notebookni ishga tushiring (`deploy/COLAB.md`). Oxirida `https://xxxx.trycloudflare.com` havolasi chiqadi. Keyin ikki yo'ldan biri:

- **Havola bilan (eng oson):** sayt manzilining oxiriga `?api=` va Colab havolasini qo'shing:
  `https://project-pheonix-....vercel.app/?api=https://xxxx.trycloudflare.com`
  Shu havolani ochgan har kim darhol haqiqiy serverga ulanadi. Hakamlarga shu havolani bering.
- **Qo'lda:** saytda **Sozlamalar** → **Server manzili** ga Colab havolasini qo'ying.

Tepadagi "Namoyish rejimi" belgisi yo'qolsa, sayt serverga ulandi. Colab har safar yangi havola beradi, shuning uchun har ishga tushirishda havolani yangilang.

## 3. Android ilovasi (APK)

APK ni GitHub o'zi yig'adi, kompyuteringizga hech narsa o'rnatish shart emas.

**Yuklab olish:**
1. Telefonda brauzerda GitHub'ga kiring va repoga o'ting.
2. **Releases** bo'limini oching (repo bosh sahifasida o'ng tomonda, telefonda pastroqda).
3. Eng yangi "Phoenix ilovasi (Android)" ni oching va `Phoenix-NN.apk` ni bosing.

**O'rnatish:**
1. Yuklab olingan faylni oching.
2. "Noma'lum manbalardan o'rnatish" so'rasa: **Sozlamalar** → shu brauzer uchun **Ruxsat berish** ni yoqing → orqaga qayting → **O'rnatish**.
3. Play Protect ogohlantirsa: **Batafsil** → **Baribir o'rnatish**. Ilova Play Store'dan emasligi uchun shunday chiqadi.

**Ishlatish:**
- Ilova ochilganda namoyish rejimida ishlaydi.
- Haqiqiy tanish uchun: **Sozlamalar** → **Server manzili** ga Colab havolasini qo'ying (havolani o'zingizga Telegram'da yuborib, nusxa olib qo'yish qulay).
- **Tarjima** → **Boshlash** bosilganda kamera ruxsatini so'raydi, **Subtitr** bosilganda mikrofonni. Ikkalasiga **Ruxsat berish**.
- Gap telefonning o'z ovoz dvigateli bilan o'qiladi. O'zbekcha ovoz telefonda bo'lmasa, Sozlamalar → Til → Matnni nutqqa aylantirish dan Google ovozini o'rnating.

Yangi versiya chiqqanda yangi APK ni o'rnating: eski ilova ustidan yangilanadi, sozlamalar saqlanadi.

## Texnik tafsilotlar

- Ilova: [Capacitor](https://capacitorjs.com) 8, `app/` papkasida. Ichida `frontend/` saytining o'zi, o'zgarishsiz. Ovoz uchun `@capacitor-community/text-to-speech`.
- Yig'ish: `.github/workflows/android-apk.yml`. Har PR'da APK "Artifacts" ga, `main` ga har push'da "Releases" ga qo'yiladi.
- Imzo: repodagi test kaliti (`app/android/app/phoenix-debug.keystore`), har yangi APK eskisini yangilay olishi uchun. Play Store uchun alohida maxfiy kalit kerak bo'ladi.
- Lokal yig'ish (Android Studio va JDK 21 kerak): `cd app && npm ci && npm run apk`.
- Server: Colab notebook `CORS_ORIGINS="*"` bilan ishlaydi, shuning uchun Vercel sayti ham, ilova ham unga ulana oladi. Boshqa joyda server ko'tarsangiz, `CORS_ORIGINS` ga sayt manzilini va `https://localhost` (ilova) ni qo'shing.
