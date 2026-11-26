# Google va GitHub bilan kirishni yoqish

Ilovadagi "Google bilan kirish" va "GitHub bilan kirish" tugmalari ishlashi uchun ikkita **Client ID** kerak.
Ular sir emas (ilova ichida baribir turadi), shuning uchun ularni to'g'ridan-to'g'ri repoga yozamiz.
Hech qanday parol yoki "secret" kerak emas. Agar biror sayt "Client secret" ko'rsatsa, uni hech kimga yuborma va hech qayerga yozma.

Hammasi taxminan 15 daqiqa. Kompyuterdagi brauzerda qil.

---

## 1. Google (taxminan 10 daqiqa)

### 1.1 Loyiha yaratish
1. https://console.cloud.google.com ni och, Google akkauntingga kir.
2. Tepada, "Google Cloud" yozuvining o'ng tomonidagi loyiha tanlagichni bos (ba'zan "Select a project" deb yozilgan).
3. Ochilgan oynada o'ng tepada **New project** ni bos.
4. Project name: `Phoenix`. **Create** ni bos. 10-20 soniya kut.
5. Yana loyiha tanlagichni bosib, **Phoenix** ni tanla.

### 1.2 Kirish oynasini sozlash (OAuth consent)
1. Chap menyudan (☰) **APIs & Services → OAuth consent screen** ga o't. (Yangi ko'rinishda bu **Google Auth Platform** deb ataladi.)
2. **Get started** ni bos.
3. App name: `Phoenix`. User support email: o'z gmail'ing. **Next**.
4. Audience: **External** ni tanla. **Next**.
5. Contact information: yana o'z gmail'ing. **Next**, keyin shartlarga belgi qo'yib **Create**.
6. Chapda **Audience** ga o't. "Test users" bo'limida **Add users** ni bosib, ilovaga kiradigan gmail'larni yoz (o'zingniki va mentorlarniki). **Save**.
   - Ilova "Testing" holatida bo'lsa, faqat shu ro'yxatdagilar kira oladi. Hamma kirsin desang, shu sahifada **Publish app** ni bos.

### 1.3 Web client (shu ID bizga kerak)
1. Chapda **Clients** ga o't, **Create client** ni bos.
2. Application type: **Web application**.
3. Name: `Phoenix web`. Boshqa maydonlarni bo'sh qoldir. **Create**.
4. Chiqqan oynadagi **Client ID** ni nusxala. U shunga o'xshaydi: `123456789-abc...xyz.apps.googleusercontent.com`.
   Uni hozircha bloknotga qo'yib tur. (Client secret ham ko'rsatiladi: unga tegma, kerak emas.)

### 1.4 Android client (telefon ilovasiga ruxsat beradi)
1. Yana **Create client** ni bos.
2. Application type: **Android**.
3. Name: `Phoenix Android`.
4. Package name: `uz.phoenix.signs`
5. SHA-1 certificate fingerprint (shu qatorni aynan nusxala):
   ```
   40:12:5F:08:06:8B:15:20:65:E7:68:80:7B:09:BC:C8:AF:4B:EE:E4
   ```
   Bu GitHub Actions yig'adigan APK'ning imzosi (`app/android/app/phoenix-debug.keystore`). Har bir APK shu imzo bilan chiqadi, shuning uchun bu bir marta qilinadi.
6. **Create**. Bu yerdan hech narsa nusxalash shart emas.

---

## 2. GitHub (taxminan 3 daqiqa)

1. https://github.com/settings/developers ni och (yoki: avatar → **Settings** → chap menyuning eng pastida **Developer settings**).
2. **OAuth Apps** → **New OAuth App** (birinchi marta bo'lsa **Register a new application**).
3. To'ldir:
   - Application name: `Phoenix`
   - Homepage URL: `https://github.com/eshturdiyedilbek-max/PROJECT-PHEONIX`
   - Authorization callback URL: xuddi shu manzil (ishlatilmaydi, lekin maydon majburiy)
4. **Register application** ni bos.
5. Ochilgan sahifada **Enable Device Flow** ga belgi qo'y va pastdagi **Update application** ni bos. Bu muhim: ilova shu usulda kiradi.
6. Sahifa tepasidagi **Client ID** ni nusxala (`Ov23li...` ga o'xshaydi). **Generate a new client secret** ni bosma, kerak emas.

---

## 3. Ikkala ID ni repoga yozish

1. GitHub'da repo ichida `backend/config/auth.json` faylini och.
2. O'ng tepadagi qalam (✏️ **Edit this file**) ni bos.
3. Bo'sh qo'shtirnoqlar ichiga ID larni qo'y:
   ```json
   "google_web_client_id": "123456789-abc...xyz.apps.googleusercontent.com",
   "github_client_id": "Ov23li..."
   ```
4. **Commit changes...** → **Commit changes**.

Shundan keyin:
- GitHub Actions yangi `Phoenix.apk` ni o'zi yig'adi (Actions tabida ko'rinadi, 5-10 daqiqa).
- Colab yoki Kaggle server repodan shu faylni o'zi o'qiydi, serverda hech narsa sozlash shart emas.

## 4. Tekshirish

1. Telefonda yangi `Phoenix.apk` ni o'rnat.
2. Profil → Server manzili ga Colab/Kaggle bergan `https://....trycloudflare.com` ni qo'y, **Tekshirish**.
3. **Google bilan kirish**: telefon akkaunt tanlash oynasini ochadi, akkauntni tanla.
4. **GitHub bilan kirish**: ekranda kod chiqadi. **GitHub'ni ochish** ni bos, kodni joylab **Authorize** ni bos, ilovaga qayt.

### Muammo bo'lsa
| Nima ko'rinadi | Sababi |
|---|---|
| "Bu kirish usuli hali sozlanmagan" | `auth.json` dagi ID bo'sh yoki yangi APK hali o'rnatilmagan |
| Google: "Developer console is not set up correctly" yoki darhol bekor bo'ladi | Android client'da package name yoki SHA-1 xato, yoki Web client ID o'rniga Android client ID yozilgan |
| Google: "Access blocked" | Gmail Test users ro'yxatida yo'q (1.2, 6-qadam) |
| GitHub: "device flow is disabled" | 2-bo'limning 5-qadami qilinmagan |
| Kirdim, lekin "Server ulanmagan" deyapti | Server manzili kiritilmagan. Server ulanganda akkaunt o'zi bog'lanadi |
