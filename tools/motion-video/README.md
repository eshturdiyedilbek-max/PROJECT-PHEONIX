# Motion-graphics video manbasi

Bosh sahifadagi demo video (`frontend/assets/demo/demo.mp4`) shu papkadagi koddan yaratilgan. Video kamera bilan yozilmagan: har bir kadr kodda chiziladi.

## Qanday ishlaydi

- `engine.js`: chizish vositalari (3D qo'l skeleti, so'z kartochkalari, ovoz to'lqini, logotip, matn animatsiyalari). Ranglar va shriftlar `frontend-resources/` dan.
- `sceneA.js`: videoning ssenariysi. Har bir kadr vaqtning funksiyasi: `draw(ctx, t)`.
- `render.js`: Playwright brauzerda sahnani ochadi va har bir kadrni PNG qilib saqlaydi.
- `build.sh`: kadrlarni 4 ta parallel jarayonda chizadi va ffmpeg bilan 1080p, 120 fps H.264 MP4 ga yig'adi (yana 720p 60 fps preview).
- `stills.js`: tekshirish uchun alohida soniyalardagi kadrlar.

## Ishga tushirish

Kerak: Node.js, Playwright (Chromium bilan), ffmpeg.

```bash
cd tools/motion-video
./build.sh A 4                 # out/phoenix-A-120fps.mp4 va out/phoenix-A-preview-720p.mp4
node stills.js A out 5 13 20   # 5, 13, 20-soniyadagi kadrlar
cp out/phoenix-A-120fps.mp4 ../../frontend/assets/demo/demo.mp4
```

35 soniya × 120 fps = 4200 kadr, 4 yadroli kompyuterda taxminan 5 daqiqa.

## Ssenariy (35 soniya)

1. Muammo: "U sizga nimadir demoqchi. Siz esa imo-ishora tilini bilmaysiz."
2. "Phoenix tushunadi."
3. Kamera qo'lni ko'radi, har bir imo-ishora so'z kartochkasiga aylanadi (HELLO, WHERE, DOCTOR) va muqobil variant ko'rsatiladi.
4. Gemini so'zlardan gap tuzadi: "Salom, shifokor qayerda?", gap ovoz chiqarib o'qiladi.
5. Javob: eshituvchining nutqi subtitrga aylanadi.
6. Imkoniyatlar: RSL va ASL, o'zbek/rus/ingliz tilida natija, ro'yxatdan o'tish shart emas.
7. Logotip.

Videoda faqat loyihada haqiqatan bor narsalar ko'rsatiladi, aniqlik foizlari yo'q (dizayn qoidasi: interfeysda aniqlik va'da qilinmaydi).
