# Motion-graphics video manbasi

Oldingi dizayndagi demo va taqdimot videolari shu papkadagi koddan yaratilgan. Ular skelet qo'llarni chizadi, shuning uchun yangi saytda ishlatilmaydi. Video kamera bilan yozilmagan: har bir kadr kodda chiziladi.

## Qanday ishlaydi

- `engine.js`: chizish vositalari (3D qo'l skeleti, so'z kartochkalari, ovoz to'lqini, logotip, matn animatsiyalari). Ranglar va shriftlar `frontend-resources/` dan.
- `sceneD.js`: videoning ssenariysi. Har bir kadr vaqtning funksiyasi: `draw(ctx, t)`.
- `render.js`: Playwright brauzerda sahnani ochadi va har bir kadrni PNG qilib saqlaydi.
- `build.sh`: kadrlarni 4 ta parallel jarayonda chizadi va ffmpeg bilan 1080p, 120 fps H.264 MP4 ga yig'adi (yana 720p 60 fps preview).
- `stills.js`: tekshirish uchun alohida soniyalardagi kadrlar.

## Ishga tushirish

Kerak: Node.js, Playwright (Chromium bilan), ffmpeg.

```bash
cd tools/motion-video
./build.sh D 4                 # out/phoenix-D-120fps.mp4 va out/phoenix-D-preview-720p.mp4
node stills.js D out 5 13 20   # 5, 13, 20-soniyadagi kadrlar
```

87 soniya × 120 fps = 10440 kadr, 4 yadroli kompyuterda taxminan 10 daqiqa.

## Ssenariy (87 soniya)

1. Muammo: "U sizga nimadir demoqchi. Siz esa imo-ishora tilini bilmaysiz." Keyin "Phoenix tushunadi."
2. To'rt vaziyat, ekran ikkiga bo'lingan (chapda imo-ishora tomoni, o'ngda nutq tomoni):
   - Shifoxona (RSL): Я ГОЛОВА БОЛИТ → "Boshim og'riyapti." Javob: "Shifokor hozir keladi."
   - Do'kon (ASL): WATER WANT → "Menga suv kerak." Javob: "Mana, marhamat."
   - Ko'cha (ASL): SCHOOL WHERE → "Maktab qayerda?" Javob: "To'g'riga yuring, keyin chapga."
   - Idora (RSL): ТЫ ПОМОЧЬ Я → "Menga yordam bera olasizmi?" Javob: "Albatta, nima kerak?"
   Har bir so'z modellarning haqiqiy so'zlar ro'yxatidan olingan.
3. Qanday ishlaydi: kamera → WebSocket → video-transformer → so'z va muqobillar → gap tuzish → matn va ovoz; javob yo'li mikrofon → nutqni tanish → subtitr.
4. Ochiq resurslar va texnologiyalar: Slovo, WLASL, MViTv2, SignFlow-A, ONNX Runtime, FastAPI, faster-whisper, speechSynthesis, Google Colab T4, Docker, pytest.
5. Tillar: 1000 RSL va 2000 ASL so'zi taniladi, natija o'zbek, rus yoki ingliz tilida.
6. Sinov natijalari (README'dagi "Natijalar va cheklovlar" bo'limidan, kichik to'plam, taxminiy).
7. Login yo'q, brauzerda ishlaydi, bepul GPU, ikki tomonlama. Logotip.

Videoda tashqi xizmat nomlari (gap tuzish va nutqni tanish qadamlari "Phoenix" nomi bilan ko'rsatiladi; texnik tafsilotlar asosiy README'da), kalitlar, akkauntlar, shaxsiy ma'lumotlar va yopiq havolalar yo'q.
