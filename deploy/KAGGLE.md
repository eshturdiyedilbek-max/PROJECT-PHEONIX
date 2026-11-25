# Phoenix'ni Kaggle'ning bepul GPU'sida ishga tushirish

Colab'da bepul GPU tez-tez band bo'ladi. Kaggle har hafta **30 soat bepul GPU** beradi (T4). [`phoenix_kaggle.ipynb`](phoenix_kaggle.ipynb) Colab notebookdagi hamma qadamni bajaradi: kodni oladi, o'rnatadi, modellarni yuklaydi, tezlikni o'lchaydi, serverni GPU'da ishga tushiradi va ochiq HTTPS/WSS havola beradi.

## Bir martalik tayyorgarlik (taxminan 10 daqiqa)

### 1. Kaggle akkaunti va telefon tasdig'i
1. https://www.kaggle.com ga kiring, o'ng yuqoridagi **Sign In** tugmasini bosing va **Sign in with Google** ni tanlang.
2. O'ng yuqoridagi profil rasmingizni bosing, keyin **Settings**.
3. **Phone verification** bo'limida **Verify** ni bosing, telefon raqamingizni kiriting va SMS'dagi kodni yozing.
   Telefon tasdiqlanmasa Kaggle GPU va internetni yoqib bermaydi.

### 2. GitHub token (repo maxfiy bo'lgani uchun)
1. https://github.com/settings/personal-access-tokens/new ni oching.
2. **Token name**: `phoenix-kaggle`. **Expiration**: 7 days.
3. **Repository access**: **Only select repositories**, keyin `PROJECT-PHEONIX` ni tanlang.
4. **Repository permissions** ichida **Contents** ni toping va **Read-only** qiling.
5. Pastdagi **Generate token** ni bosing va chiqqan tokenni nusxalang (u faqat bir marta ko'rsatiladi).

### 3. Notebookni Kaggle'ga yuklash
1. `phoenix_kaggle.ipynb` faylini kompyuteringizga oling: GitHub'da `deploy/phoenix_kaggle.ipynb` ni oching va **Download raw file** tugmasini bosing (yuklab olish belgisi).
2. Kaggle'da chap tomondagi **+ Create** tugmasini bosing, keyin **New Notebook**.
3. Yuqori menyuda **File > Import Notebook** ni bosing, faylni oynaga tashlang va **Import** ni bosing.

### 4. GPU va internetni yoqish
O'ng paneldagi **Session options** bo'limida (panel ko'rinmasa, o'ng chetdagi kichik `<` belgisini bosing):
1. **Accelerator**: **GPU T4 x2** ni tanlang va chiqqan oynada **Turn on GPU T4 x2** ni bosing. P100 ni tanlamang.
2. **Internet**: **On** holatiga o'tkazing.

### 5. Kalitlarni Secrets'ga qo'yish
1. Yuqori menyuda **Add-ons > Secrets** ni bosing.
2. **Add Secret** ni bosing. **Label**: `GITHUB_TOKEN`, **Value**: 2-qadamdagi token. **Save**.
3. Yana **Add Secret**. **Label**: `GEMINI_API_KEY`, **Value**: Gemini kaliti. **Save**. (Ixtiyoriy. Kalitsiz gap tuzish ishlamaydi, nutqni Whisper taniydi.)
4. Ikkala kalit yonidagi katakcha belgilanganiga ishonch hosil qiling (shu notebook o'qishi uchun). Oynani yoping.

Kalitlar ekranga chiqmaydi va repoga yozilmaydi. Secrets'ni o'tkazib yuborsangiz, notebook ularni yashirin maydonga kiritishni so'raydi.

## Har safar ishga tushirish

1. Notebookni oching (Kaggle'da **Code > Your Work**).
2. Yuqoridagi **Run All** tugmasini bosing. Birinchi marta 5-10 daqiqa ketadi.
3. **7a** qadam tezlikni ko'rsatadi, masalan: `RSL (mvit32-2) on CUDA: ... ms per word -> FAST ENOUGH for live`. Shu qatorni yuboring, tezlikni bilib olamiz.
4. **7b** qadam oxirida shunday blok chiqadi:
   ```
   ==================== PHOENIX IS LIVE ====================
    Website:            https://<tasodifiy-nom>.trycloudflare.com
    Sign WebSocket:     wss://<tasodifiy-nom>.trycloudflare.com/ws/sign?lang=rsl
   ```
   **Website** havolasini oching: sayt ham, API ham shu bitta manzilda.
5. Ish tugagach oxirgi katakni (**Stop the server and tunnel**) ishga tushiring va o'ng yuqoridagi quvvat belgisi orqali **Stop session** qiling. Aks holda haftalik GPU soatlari behuda ketadi.

## Bilib qo'ying

- **Havola har safar o'zgaradi** (7b qayta ishga tushganda yoki sessiya qayta boshlanganda).
- Tabni ochiq qoldiring va vaqti-vaqti bilan notebookni bosib turing: Kaggle harakatsiz sessiyani to'xtatadi. Bitta sessiya ko'pi bilan 12 soat.
- Har yangi sessiya bo'sh boshlanadi: modellar qayta yuklanadi (~2 daqiqa), tarix va yuborilgan videolar o'chadi.
- Haftalik GPU qoldig'i: profil rasmi > **Settings** yoki notebookning o'ng panelida ko'rinadi.
- Namoyishdan 15 daqiqa oldin ishga tushiring.
- Gemini kalitini hakaton tugagach bekor qiling.

## Muammo bo'lsa

| Xabar | Nima qilish kerak |
|---|---|
| `No GPU in this session` | 4-qadam: Accelerator = GPU T4 x2, keyin yana **Run All** |
| `No internet` | 4-qadam: Internet = On. Tugma bosilmasa, telefon tasdiqlanmagan (1-qadam) |
| `GITHUB_TOKEN is required` yoki klonlashda 403/404 | 5-qadam: Secret nomi aynan `GITHUB_TOKEN`, katakcha belgilangan, tokenda *Contents: Read-only* bor |
| `a model is running on CPU` | 5-qadamni (Install) va keyin 7b ni qayta ishga tushiring. Log: `!grep -iE "cuda|cudnn" /tmp/phoenix_data/phoenix_server.log` |
| Model yuklanmadi | 6-qadamni qayta ishga tushiring (tayyor fayllar o'tkazib yuboriladi) |
| `server crashed` | 7b logning oxirini ko'rsatadi; to'liq log `/tmp/phoenix_data/phoenix_server.log` |
| `this is a P100` | Accelerator'ni **GPU T4 x2** ga almashtiring |

## Colab'dan farqi (texnik)

| | Colab | Kaggle |
|---|---|---|
| Kalitlar | `google.colab.userdata` | `kaggle_secrets.UserSecretsClient` |
| Fayllar | `/content` | `/tmp/phoenix` (kod, modellar), `/tmp/phoenix_data` (log, baza) |
| GPU | T4 | T4 x2 (bittasi ishlatiladi, `CUDA_VISIBLE_DEVICES=0`) |
| Video sinovi (8-qadam) | fayl yuklash oynasi | **Add Input > Upload**, keyin `VIDEO_PATH` ga yo'lini yozing |
| Qo'shimcha tekshiruv | | Python 3.11+, internet yoqilgani, P100 ogohlantirishi |

Server, tunnel (Cloudflare quick tunnel), tezlik testi va API bir xil. API: [`docs/API.md`](../docs/API.md).
