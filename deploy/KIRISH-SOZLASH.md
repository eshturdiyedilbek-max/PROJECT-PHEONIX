# Google va GitHub bilan kirishni yoqish

Saytdagi va ilovadagi "Google bilan kirish" va "GitHub bilan kirish" tugmalari haqiqiy kirish qiladi:
odam Google yoki GitHub sahifasiga o'tadi, akkauntini tanlaydi, rozilik beradi va saytga qaytib, akkauntga kirgan holda turadi.
Buning uchun Google va GitHub'da Phoenix'ni bir marta ro'yxatdan o'tkazish kerak.

Natijada 4 ta narsa olasan:

| Nima | Sirmi? | Qayerga yoziladi |
|---|---|---|
| Google **Client ID** | Yo'q | `backend/config/auth.json` (repo) |
| Google **Client secret** | **Ha** | Faqat Colab Secrets (`GOOGLE_CLIENT_SECRET`) |
| GitHub **Client ID** | Yo'q | `backend/config/auth.json` (repo) |
| GitHub **Client secret** | **Ha** | Faqat Colab Secrets (`GITHUB_CLIENT_SECRET`) |

**Ikkala secret'ni hech qachon repoga, chatga yoki skrinshotga qo'yma.** Ular faqat serverda turadi.

Hammasi taxminan 20 daqiqa. Kompyuterdagi brauzerda qil.

Quyida `SAYT` deb yozilgan joyga saytning doimiy manzilini qo'y, oxirida `/` bilan.
Masalan: `https://project-pheonix-abc.vercel.app/` (Vercel'da loyiha sahifasidagi **Domains** dan ko'rasan).
Colab beradigan `trycloudflare.com` manzili har safar o'zgaradi, shuning uchun kirish Vercel manzilida ishlaydi.

---

## 1. Google (taxminan 10 daqiqa)

### 1.1 Loyiha yaratish
1. https://console.cloud.google.com ni och, Google akkauntingga kir.
2. Tepada, "Google Cloud" yozuvining o'ng tomonidagi loyiha tanlagichni bos.
3. **New project** → Project name: `Phoenix` → **Create**. 10-20 soniya kut.
4. Yana loyiha tanlagichni bosib, **Phoenix** ni tanla.

### 1.2 Kirish oynasi (OAuth consent / Google Auth Platform)
1. Chap menyu (☰) → **APIs & Services → OAuth consent screen** (yangi ko'rinishda **Google Auth Platform**).
2. **Get started**. App name: `Phoenix`. User support email: o'z gmail'ing. **Next**.
3. Audience: **External**. **Next**.
4. Contact information: o'z gmail'ing. **Next**, shartlarga belgi qo'yib **Create**.
5. Chapda **Audience**: hamma kira olishi uchun **Publish app** ni bos.
   (Bosmasang, faqat "Test users" ro'yxatiga qo'shgan gmail'lar kira oladi.)

### 1.3 Web client (sayt uchun)
1. Chapda **Clients** → **Create client**.
2. Application type: **Web application**. Name: `Phoenix web`.
3. **Authorized JavaScript origins** → **Add URI**: `SAYT` ni oxiridagi `/` siz yoz (masalan `https://project-pheonix-abc.vercel.app`).
4. **Authorized redirect URIs** → **Add URI**: `SAYT` ni aynan, oxiridagi `/` bilan yoz (masalan `https://project-pheonix-abc.vercel.app/`).
5. **Create**.
6. Chiqqan oynadan ikkalasini nusxala:
   - **Client ID** (`123456789-abc...xyz.apps.googleusercontent.com`)
   - **Client secret** (`GOCSPX-...`). Buni faqat bloknotga qo'y, keyin Colab Secrets'ga o'tkazasan.

### 1.4 Android client (telefon ilovasi uchun, bir marta)
1. Yana **Create client** → Application type: **Android** → Name: `Phoenix Android`.
2. Package name: `uz.phoenix.signs`
3. SHA-1 certificate fingerprint:
   ```
   40:12:5F:08:06:8B:15:20:65:E7:68:80:7B:09:BC:C8:AF:4B:EE:E4
   ```
4. **Create**. Bu yerdan hech narsa nusxalash shart emas.

---

## 2. GitHub (taxminan 5 daqiqa)

1. https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**.
2. To'ldir:
   - Application name: `Phoenix`
   - Homepage URL: `SAYT`
   - Authorization callback URL: `SAYT` (aynan, oxiridagi `/` bilan)
3. **Register application**.
4. **Enable Device Flow** ga belgi qo'y (telefon ilovasi shu usulda kiradi) va **Update application**.
5. Sahifa tepasidagi **Client ID** ni nusxala (`Ov23li...`).
6. **Generate a new client secret** ni bos va chiqqan secret'ni darhol nusxala (GitHub uni faqat bir marta ko'rsatadi).

---

## 3. Ochiq ma'lumotlarni repoga yozish

1. GitHub'da repo ichida `backend/config/auth.json` faylini och → qalam (✏️ **Edit this file**).
2. To'ldir (secret'lar bu yerga YOZILMAYDI):
   ```json
   "google_web_client_id": "123456789-abc...xyz.apps.googleusercontent.com",
   "github_client_id": "Ov23li...",
   "web_redirect_uris": ["https://project-pheonix-abc.vercel.app/"]
   ```
3. **Commit changes...** → **Commit changes**.

## 4. Secret'larni serverga berish (Colab)

1. Colab'da chap paneldagi kalit belgisi (🔑 **Secrets**) ni bos.
2. **Add new secret** bilan ikkitasini qo'sh va ikkalasida **Notebook access** ni yoq:
   - `GOOGLE_CLIENT_SECRET` = Google'dan olgan `GOCSPX-...`
   - `GITHUB_CLIENT_SECRET` = GitHub'dan olgan secret
3. Daftarni qaytadan ishga tushir (**Runtime → Run all**). 3-qadam ularni o'qiydi va serverga beradi.

## 5. Tekshirish

1. `SAYT` ni och → yuqoridagi odamcha belgisi (Akkaunt).
2. **Google bilan kirish** → Google akkaunt tanlash sahifasi ochiladi → akkauntni tanla → saytga qaytasan, ismingni ko'rasan.
3. Chiqib, **GitHub bilan kirish** → GitHub'da **Authorize** → yana saytga qaytasan.
   Google va GitHub'dagi email bir xil bo'lsa, ikkalasi bitta akkaunt bo'ladi.

### Muammo bo'lsa
| Nima ko'rinadi | Sababi |
|---|---|
| Tugmalar xira, "hali yoqilmagan" deyapti | `auth.json` dagi ID bo'sh, yoki Colab'da secret qo'shilmagan / daftar qayta ishga tushirilmagan |
| "Bu manzilda ... kirib bo'lmaydi" | Sayt `web_redirect_uris` da yo'q manzildan ochilgan (masalan trycloudflare). Ko'rsatilgan asosiy saytga o't |
| Google: "Error 400: redirect_uri_mismatch" | 1.3 dagi redirect URI `SAYT` bilan aynan bir xil emas (oxiridagi `/` ni tekshir) |
| Google: "Access blocked" / "app not verified" | 1.2 ning 5-qadami qilinmagan (Publish app), yoki gmail Test users'da yo'q |
| GitHub: "The redirect_uri is not associated with this application" | 2-bo'limdagi callback URL `SAYT` bilan bir xil emas |
| "Kirish kodi eskirgan yoki allaqachon ishlatilgan" | Sahifa yangilangan yoki orqaga qaytilgan. Tugmani qaytadan bos |
| Telefon ilovasi: "Developer console is not set up correctly" | 1.4 dagi package name yoki SHA-1 xato |
