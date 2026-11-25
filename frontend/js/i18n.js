// Interface language: O'zbekcha, Русский, English. Every visible string lives here.
// HTML marks text with data-i18n="key" (textContent), data-i18n-ph (placeholder), data-i18n-aria (aria-label),
// data-i18n-title (title); JS calls t('key', {var}). Changing the language re-applies everything at once.
import { settings } from './settings.js';

export const UI_LANGS = [['uz', "O'zbekcha", 'UZ'], ['ru', 'Русский', 'RU'], ['en', 'English', 'EN']];

const D = {
  // ---- shell ----
  'meta.title': ['Phoenix · imo-ishora tarjimoni', 'Phoenix · переводчик жестового языка', 'Phoenix · sign language translator'],
  'brand.home': ['Phoenix, bosh sahifa', 'Phoenix, главная', 'Phoenix, home'],
  'nav.home': ['Bosh sahifa', 'Главная', 'Home'],
  'nav.translate': ['Tarjima', 'Перевод', 'Translate'],
  'nav.learn': ["Lug'at", 'Словарь', 'Dictionary'],
  'nav.history': ['Tarix', 'История', 'History'],
  'nav.settings': ['Sozlamalar', 'Настройки', 'Settings'],
  'nav.dock': ['Asosiy menyu', 'Главное меню', 'Main menu'],
  'lang.label': ['Sayt tili', 'Язык сайта', 'Site language'],
  'mode.tag': ['Namoyish rejimi', 'Демо-режим', 'Demo mode'],
  'mode.tagTitle': ["Server ulanmagan: sayt namuna ma'lumotlar bilan ishlayapti", 'Сервер не подключён: сайт работает на примерах', 'No server connected: the site runs on sample data'],
  'intro.sub': ['imo-ishora · matn · ovoz', 'жест · текст · голос', 'sign · text · voice'],
  'footer.line': ['Phoenix · imo-ishora tarjimoni, xakaton loyihasi', 'Phoenix · переводчик жестового языка, хакатон-проект', 'Phoenix · sign language translator, a hackathon project'],
  'footer.lic': [
    "Slovo ma'lumotlar to'plami va rus modellari: CC BY-SA 4.0, © ai-forever. ASL modeli WLASL asosida, faqat notijorat foydalanish uchun. Nutqni tanish: Whisper (MIT) va Gemini. Shriftlar: Golos Text va Geologica, SIL OFL 1.1.",
    'Датасет Slovo и русские модели: CC BY-SA 4.0, © ai-forever. Модель ASL основана на WLASL, только некоммерческое использование. Распознавание речи: Whisper (MIT) и Gemini. Шрифты: Golos Text и Geologica, SIL OFL 1.1.',
    'Slovo dataset and Russian models: CC BY-SA 4.0, © ai-forever. The ASL model is based on WLASL, non-commercial use only. Speech recognition: Whisper (MIT) and Gemini. Fonts: Golos Text and Geologica, SIL OFL 1.1.'
  ],

  // ---- landing ----
  'hero.title': ['Imo-ishorani matnga va ovozga aylantiradi', 'Превращает жесты в текст и голос', 'Turns sign language into text and voice'],
  'hero.lead': [
    "Kameraga imo-ishora qiling. Phoenix har bir so'zni taniydi, gap tuzadi va uni tanlangan tilda ko'rsatib, ovoz chiqarib o'qiydi.",
    'Покажите жесты в камеру. Phoenix узнаёт каждое слово, собирает предложение, показывает его на выбранном языке и читает вслух.',
    'Sign in front of the camera. Phoenix recognizes each word, builds a sentence, shows it in the language you pick and reads it aloud.'
  ],
  'hero.render': ['3D', '3D', '3D'],
  'story.lead': ['Pastga aylantiring: imo-ishoradan ovozgacha va javob qaytguncha.', 'Прокрутите вниз: от жеста до голоса и обратно до ответа.', 'Scroll down: from a sign to a voice, and back to a reply.'],
  'story.sample': ['Namuna suhbat', 'Пример разговора', 'Sample conversation'],
  'close.lead': ['Kamera va brauzer yetarli. Ro\'yxatdan o\'tish shart emas.', 'Нужны только камера и браузер. Без регистрации.', 'A camera and a browser are all it takes. No sign-up.'],
  'footer.hands': ['3D qo\'l modeli: WebXR Input Profiles «generic-hand», © Amazon, MIT litsenziyasi. 3D chizish: three.js (MIT).', '3D-модель руки: WebXR Input Profiles «generic-hand», © Amazon, лицензия MIT. 3D-рендер: three.js (MIT).', '3D hand model: WebXR Input Profiles "generic-hand", © Amazon, MIT License. 3D rendering: three.js (MIT).'],
  'hero.try': ["Sinab ko'rish", 'Попробовать', 'Try it'],
  'hero.how': ['Qanday ishlaydi', 'Как это работает', 'How it works'],
  'hero.note': ["Ro'yxatdan o'tish shart emas. Kamera brauzerda yoqiladi.", 'Регистрация не нужна. Камера включается в браузере.', 'No sign-up. The camera turns on in your browser.'],
  'hero.welcome': ['Xush kelibsiz', 'Добро пожаловать', 'Welcome'],
  'hero.welcomeSign': ['Imo-ishora tilida «Xush kelibsiz» · 3D tasvir', '«Добро пожаловать» на жестовом языке · 3D-визуализация', '"Welcome" in sign language · 3D render'],
  'hero.videoAria': ['Ikki kishining qo\'llari imo-ishora tilida «Xush kelibsiz» deydi, 3D tasvir', 'Руки двух людей показывают «Добро пожаловать» на жестовом языке, 3D-визуализация', 'Two people\'s hands sign "Welcome", a 3D render'],

  'story.title': ['Bir suhbat, besh lahza', 'Один разговор, пять моментов', 'One conversation, five moments'],
  'story.s1.k': ['Salomlashish', 'Приветствие', 'Greeting'],
  'story.s1.t': ['Odam kameraga imo-ishora qiladi', 'Человек показывает жесты в камеру', 'A person signs to the camera'],
  'story.s1.p': ['Hech narsa o\'rnatilmaydi: brauzer kamerani yoqadi va kadrlarni serverga yuboradi.', 'Ничего устанавливать не нужно: браузер включает камеру и отправляет кадры на сервер.', 'Nothing to install: the browser turns on the camera and streams frames to the server.'],
  'story.s2.k': ['Tanish', 'Распознавание', 'Recognition'],
  'story.s2.t': ["Har bir so'z ishonch foizi bilan", 'Каждое слово с процентом уверенности', 'Each word with a confidence score'],
  'story.s2.p': ["Model 2 soniyalik oynani ko'rib, so'zni va muqobillarini beradi.", 'Модель смотрит на окно в 2 секунды и выдаёт слово и альтернативы.', 'The model watches a 2-second window and returns the word and its alternatives.'],
  'story.s3.k': ['Gap', 'Предложение', 'Sentence'],
  'story.s3.t': ["So'zlardan to'liq gap", 'Из слов получается предложение', 'Words become a full sentence'],
  'story.s3.p': ["Imo-ishora tilida grammatika boshqacha. Phoenix so'zlarni odatdagi gapga aylantiradi va tanlangan tilga o'giradi.", 'У жестового языка своя грамматика. Phoenix превращает слова в обычное предложение и переводит его.', 'Sign language has its own grammar. Phoenix turns the words into a normal sentence and translates it.'],
  'story.s4.k': ['Ovoz', 'Голос', 'Voice'],
  'story.s4.t': ['Gap ovoz chiqarib o\'qiladi', 'Предложение звучит вслух', 'The sentence is read aloud'],
  'story.s4.p': ['Eshituvchi odam ekranga qaramasa ham gapni eshitadi.', 'Слышащий человек слышит фразу, даже не глядя на экран.', 'The hearing person hears it without looking at the screen.'],
  'story.s5.k': ['Javob', 'Ответ', 'Reply'],
  'story.s5.t': ['Javob subtitr bo\'lib qaytadi', 'Ответ возвращается субтитрами', 'The reply comes back as subtitles'],
  'story.s5.p': ['Eshituvchi gapiradi, uning gapi matn bo\'lib ekranga chiqadi. Suhbat ikki tomonlama.', 'Слышащий говорит, его речь появляется текстом. Разговор идёт в обе стороны.', 'The hearing person speaks and their words appear as text. The conversation goes both ways.'],
  'story.cam': ['Kamera', 'Камера', 'Camera'],
  'story.sentence': ['Salom, men shifokorman.', 'Привет, я врач.', 'Hello, I am a doctor.'],
  'story.reply': ['Xush kelibsiz! Qanday yordam bera olaman?', 'Добро пожаловать! Чем могу помочь?', 'Welcome! How can I help?'],

  'demo.title': ['Namoyish videosi', 'Демо-видео', 'Demo video'],
  'demo.sub': ['Phoenix haqiqiy suhbatda qanday ishlashi.', 'Как Phoenix работает в настоящем разговоре.', 'How Phoenix works in a real conversation.'],
  'demo.aria': ['Phoenix namoyish videosi', 'Демо-видео Phoenix', 'Phoenix demo video'],
  'news.title': ['Phoenix nimalar qiladi', 'Что умеет Phoenix', 'What Phoenix does'],
  'news.1t': ['Ikki tomonlama suhbat', 'Разговор в обе стороны', 'Two-way conversation'],
  'news.1d': ["Imo-ishora qiluvchi ham, gapiruvchi ham bitta ekranda bir-birining gapini matn ko'rinishida o'qiydi.", 'Тот, кто показывает жесты, и тот, кто говорит, читают друг друга на одном экране.', 'The signer and the speaker read each other as text on one screen.'],
  'news.2t': ["So'zlardan to'liq gap", 'Из слов в предложение', 'From words to a sentence'],
  'news.2d': ["Imo-ishora tilida grammatika boshqacha. Gemini tanilgan so'zlarni odatdagi gapga aylantiradi.", 'У жестового языка своя грамматика. Gemini превращает распознанные слова в обычное предложение.', 'Sign language has its own grammar. Gemini turns the recognized words into a normal sentence.'],
  'news.3t': ["O'zbekcha natija", 'Результат на узбекском', 'Uzbek output'],
  'news.3d': ["Rus va amerika imo-ishoralari o'zbek tilida matn va ovoz bo'lib chiqadi.", 'Русские и американские жесты выходят текстом и голосом на узбекском.', 'Russian and American signs come out as Uzbek text and voice.'],
  'news.4t': ['Bepul GPU', 'Бесплатный GPU', 'Free GPU'],
  'news.4d': ["Tanish modeli Google Colab'ning bepul T4 GPU'sida ishga tushadi.", 'Модель распознавания запускается на бесплатном GPU T4 в Google Colab.', "The recognition model runs on Google Colab's free T4 GPU."],
  'news.5t': ['Hisobsiz', 'Без аккаунта', 'No account'],
  'news.5d': ["Login yo'q. Tarix shu brauzerga bog'langan.", 'Без входа. История привязана к этому браузеру.', 'No login. History stays tied to this browser.'],

  // ---- translate ----
  'tx.title': ['Tarjima', 'Перевод', 'Translate'],
  'tx.demoTag': ['Faqat namoyish, tijorat uchun emas', 'Только демо, не для коммерции', 'Demo only, non-commercial'],
  'tx.camOff': ["Kamera o'chiq", 'Камера выключена', 'Camera off'],
  'tx.camOn': ['Kamera yoqilgan', 'Камера включена', 'Camera on'],
  'tx.camHint': ['"Boshlash" tugmasini bosing. Brauzer kameraga ruxsat so\'raydi.', 'Нажмите «Начать». Браузер попросит доступ к камере.', 'Press "Start". Your browser will ask for camera access.'],
  'tx.noCam': ['Kamerasiz namoyish', 'Демо без камеры', 'Demo without camera'],
  'tx.noCamHint': ["Kamera ochilmadi, lekin namoyish shu holatda ham ishlaydi.", 'Камера не открылась, но демо работает и так.', "The camera didn't open, but the demo works anyway."],
  'tx.fps': ['kadr/s', 'кадр/с', 'fps'],
  'tx.start': ['Boshlash', 'Начать', 'Start'],
  'tx.camStop': ["Kamerani o'chirish", 'Выключить камеру', 'Turn camera off'],
  'tx.finish': ['Tugatish va gap tuzish', 'Закончить и собрать фразу', 'Finish and make a sentence'],
  'tx.reset': ['Tozalash', 'Очистить', 'Clear'],
  'tx.signLang': ['Kamera taniydigan til', 'Какой язык жестов читает камера', 'Sign language the camera reads'],
  'tx.signs': ['{n} ta imo-ishora', '{n} жестов', '{n} signs'],
  'tx.notLoaded': ['Serverda yuklanmagan', 'Не загружено на сервере', 'Not loaded on the server'],
  'tx.target': ['Gap tili', 'Язык фразы', 'Sentence language'],
  'tx.fromSign': ['Imo-ishoradan', 'Из жестов', 'From signs'],
  'tx.making': ['Gap tuzilmoqda…', 'Собираю фразу…', 'Making a sentence…'],
  'tx.conf': ['Ishonch', 'Уверенность', 'Confidence'],
  'tx.smooth': ['Gap tuzish', 'Собирать фразу', 'Make sentence'],
  'tx.sub': ['Subtitr', 'Субтитры', 'Subtitles'],
  'tx.say': ["Qayta o'qish", 'Прочитать снова', 'Read again'],
  'tx.on': ['yoqilgan', 'вкл', 'on'],
  'tx.off': ["o'chiq", 'выкл', 'off'],
  'tx.fromSpeech': ['Eshituvchi nutqidan', 'Из речи слышащего', 'From the hearing person'],
  'tx.listening': ['Tinglanmoqda…', 'Слушаю…', 'Listening…'],
  'tx.privacy': ['Ovoz serverda matnga aylantiriladi. Gemini ishlatilsa, ovoz Google xizmatiga yuboriladi.', 'Голос превращается в текст на сервере. Если используется Gemini, звук отправляется в сервис Google.', 'Speech is turned into text on the server. With Gemini, the audio is sent to a Google service.'],
  'tx.privacyGemini': ["Ovoz Google'ning Gemini xizmatida matnga aylantiriladi.", 'Голос распознаётся сервисом Google Gemini.', "Speech is transcribed by Google's Gemini service."],
  'tx.privacyWhisper': ['Ovoz serverdagi Whisper modelida matnga aylantiriladi.', 'Голос распознаётся моделью Whisper на сервере.', 'Speech is transcribed by the Whisper model on the server.'],
  'tx.privacyDemo': ['Namoyish rejimi: mikrofon ishlatilmaydi, subtitrlar namuna.', 'Демо-режим: микрофон не используется, субтитры примерные.', 'Demo mode: no microphone, the subtitles are samples.'],
  'st.off': ["Kamera o'chiq", 'Камера выключена', 'Camera off'],
  'st.camera': ['Kamera yoqilmoqda…', 'Включаю камеру…', 'Starting camera…'],
  'st.connecting': ['Serverga ulanmoqda…', 'Подключаюсь к серверу…', 'Connecting…'],
  'st.listening': ['Imo-ishora qiling…', 'Показывайте жесты…', 'Start signing…'],
  'st.got': ["So'z tanildi", 'Слово распознано', 'Word recognized'],
  'st.sentence': ['Gap tayyor', 'Фраза готова', 'Sentence ready'],
  'st.paused': ["To'xtatildi", 'Пауза', 'Paused'],
  'st.nothing': ["Hech qanday imo-ishora tanilmadi. Qaytadan urinib ko'ring.", 'Жесты не распознаны. Попробуйте ещё раз.', 'No signs were recognized. Try again.'],
  'st.retry': ['Ulanish uzildi. {s} soniyadan keyin qayta ulanadi…', 'Связь прервалась. Переподключение через {s} с…', 'Connection lost. Reconnecting in {s} s…'],
  'res.made': ['Tuzilgan gap · {lang}', 'Собранная фраза · {lang}', 'Sentence · {lang}'],
  'res.raw': ["Tanilgan so'zlar", 'Распознанные слова', 'Recognized words'],
  'sign.rsl': ['RSL · Rus imo-ishora tili', 'РЖЯ · Русский жестовый язык', 'RSL · Russian Sign Language'],
  'sign.asl': ['ASL · Amerika imo-ishora tili', 'ASL · Американский жестовый язык', 'ASL · American Sign Language'],
  'b.demo.l': ['Namoyish rejimi', 'Демо-режим', 'Demo mode'],
  'b.demo.t': ["Server ulanmagan, shuning uchun so'zlar namuna ketma-ketligidan chiqadi va haqiqiy imo-ishora tanilmaydi. Haqiqiy tanish uchun Sozlamalar > Server manziliga Colab havolasini qo'ying.", 'Сервер не подключён, поэтому слова идут из примера, настоящие жесты не распознаются. Для настоящего распознавания вставьте ссылку Colab в Настройки > Адрес сервера.', 'No server is connected, so the words come from a sample sequence and real signs are not recognized. For real recognition, paste the Colab link in Settings > Server address.'],
  'b.toSettings': ['Sozlamalar', 'Настройки', 'Settings'],
  'b.camNo.l': ['Kamera ishlamaydi', 'Камера не работает', 'Camera unavailable'],
  'b.camNo.t': ["Brauzer kamerani qo'llab-quvvatlamaydi yoki sahifa xavfsiz (https) manzilda ochilmagan.", 'Браузер не поддерживает камеру или страница открыта не по https.', "The browser doesn't support the camera, or the page isn't on https."],
  'b.camDenied.l': ['Kameraga ruxsat berilmadi', 'Нет доступа к камере', 'Camera access denied'],
  'b.camDenied.t': ['Brauzer manzil satridagi kamera belgisini bosib, ruxsat bering.', 'Нажмите значок камеры в адресной строке и разрешите доступ.', 'Click the camera icon in the address bar and allow access.'],
  'b.camMissing.l': ['Kamera topilmadi', 'Камера не найдена', 'No camera found'],
  'b.camMissing.t': ["Kamera ulanganini va boshqa dastur ishlatmayotganini tekshiring.", 'Проверьте, что камера подключена и не занята другой программой.', "Check that a camera is connected and not used by another app."],
  'b.server.l': ["Server bilan aloqa yo'q", 'Нет связи с сервером', "Can't reach the server"],
  'b.server.t': ['Server manzilini Sozlamalarda tekshiring.', 'Проверьте адрес сервера в Настройках.', 'Check the server address in Settings.'],
  'b.serverRetry.t': ["Qayta ulanishga urinyapmiz. Server ishlayotganini va manzil to'g'riligini tekshiring.", 'Пробуем переподключиться. Проверьте, что сервер работает и адрес верный.', 'Trying to reconnect. Check that the server is running and the address is right.'],
  'b.recheck': ['Qayta tekshirish', 'Проверить снова', 'Check again'],
  'b.idle.l': ["To'xtatildi", 'Пауза', 'Paused'],
  'b.idle.t': ['30 soniya davomida hech narsa yuborilmagani uchun ulanish yopildi.', 'Соединение закрыто: 30 секунд ничего не отправлялось.', 'The connection closed because nothing was sent for 30 seconds.'],
  'b.resume': ['Davom etish', 'Продолжить', 'Resume'],
  'b.model.l': ['Tarjima hozircha ishlamayapti', 'Перевод сейчас недоступен', 'Translation is unavailable right now'],
  'b.model.t': ["{lang} uchun model serverda yuklanmagan. Boshqa tilni tanlab ko'ring.", 'Модель для {lang} не загружена на сервере. Выберите другой язык.', 'The {lang} model is not loaded on the server. Try the other language.'],
  'b.slow.l': ['Ulanish sekin', 'Медленное соединение', 'Slow connection'],
  'b.slow.t': ["Ba'zi kadrlar o'tkazib yuborildi.", 'Часть кадров пропущена.', 'Some frames were skipped.'],
  'b.busy.l': ["Hozir foydalanuvchilar ko'p", 'Сейчас много пользователей', 'Many people are translating'],
  'b.busy.t': ['Bir necha soniyadan keyin qayta urinamiz…', 'Попробуем снова через несколько секунд…', 'Trying again in a few seconds…'],
  'b.cpu.l': ['Server sekin ishlayapti', 'Сервер работает медленно', 'The server is slow'],
  'b.cpu.t': ["Model GPU'siz ishlayapti, har bir so'z bir necha soniya oladi. Tezroq ishlashi uchun Colab GPU'da ishga tushiring.", 'Модель работает без GPU, каждое слово занимает несколько секунд. Запустите на GPU в Colab.', 'The model runs without a GPU, so each word takes several seconds. Run it on a Colab GPU.'],
  'b.micNo.l': ['Mikrofon ishlamaydi', 'Микрофон не работает', 'Microphone unavailable'],
  'b.micNo.t': ["Bu brauzer ovoz yozishni qo'llab-quvvatlamaydi.", 'Этот браузер не умеет записывать звук.', "This browser can't record audio."],
  'b.micDenied.l': ['Mikrofonga ruxsat berilmadi', 'Нет доступа к микрофону', 'Microphone access denied'],
  'b.micDenied.t': ['Brauzer manzil satridagi mikrofon belgisini bosib, ruxsat bering.', 'Нажмите значок микрофона в адресной строке и разрешите доступ.', 'Click the microphone icon in the address bar and allow access.'],

  // ---- learn ----
  'learn.title': ["Lug'at", 'Словарь', 'Dictionary'],
  'learn.intro': ["Phoenix taniy oladigan barcha imo-ishoralar. Video namunalar keyinroq qo'shiladi.", 'Все жесты, которые знает Phoenix. Видеопримеры добавим позже.', 'Every sign Phoenix knows. Video examples come later.'],
  'learn.ph': ['Qidirish: привет, вода, hello', 'Поиск: привет, вода, hello', 'Search: привет, вода, hello'],
  'learn.search': ['Qidirish', 'Найти', 'Search'],
  'learn.searchAria': ["Lug'atdan qidirish", 'Поиск по словарю', 'Search the dictionary'],
  'learn.lang': ['Til', 'Язык', 'Language'],
  'learn.type': ['Turi', 'Тип', 'Type'],
  'learn.all': ['Hammasi', 'Все', 'All'],
  'cat.word': ["So'z", 'Слово', 'Word'],
  'cat.phrase': ['Ibora', 'Фраза', 'Phrase'],
  'cat.letter': ['Harf', 'Буква', 'Letter'],
  'learn.loading': ['Yuklanmoqda…', 'Загрузка…', 'Loading…'],
  'learn.total': ['{n} ta imo-ishora', '{n} жестов', '{n} signs'],
  'learn.none': ["Hech narsa topilmadi. Boshqa so'z bilan qidirib ko'ring.", 'Ничего не найдено. Попробуйте другое слово.', 'Nothing found. Try another word.'],
  'learn.noVideo': ["Video namuna hali yo'q", 'Видеопримера пока нет', 'No video example yet'],
  'learn.more': ["Ko'proq ko'rsatish", 'Показать ещё', 'Show more'],
  'contrib.title': ['Imo-ishora yuborish', 'Отправить жест', 'Send a sign'],
  'contrib.intro': ["Lug'atdan bitta so'zni tanlang va uni kameraga ko'rsatib, 4 soniyalik video yuboring. Videolar tanish modelini yaxshilash uchun yig'iladi.", 'Выберите слово в словаре, покажите его в камеру и отправьте 4-секундное видео. Видео собираются, чтобы улучшить модель.', 'Pick a word from the dictionary, sign it to the camera and send a 4-second video. Videos are collected to improve the model.'],
  'contrib.picked': ["Tanlangan so'z:", 'Выбранное слово:', 'Selected word:'],
  'contrib.none': ['hali tanlanmagan', 'пока не выбрано', 'none yet'],
  'contrib.consent': ["Videoim ma'lumotlar to'plamiga qo'shilishiga roziman.", 'Я согласен(на), чтобы моё видео добавили в датасет.', 'I agree to add my video to the dataset.'],
  'contrib.send': ['4 soniya yozib yuborish', 'Записать 4 секунды и отправить', 'Record 4 seconds and send'],
  'contrib.denied': ['Kameraga ruxsat berilmadi.', 'Нет доступа к камере.', 'Camera access denied.'],
  'contrib.rec': ["Yozilmoqda… imo-ishorani ko'rsating", 'Запись… покажите жест', 'Recording… show the sign'],
  'contrib.sending': ['Yuborilmoqda…', 'Отправка…', 'Sending…'],
  'contrib.ok': ['Rahmat! Video qabul qilindi.', 'Спасибо! Видео получено.', 'Thank you! The video was received.'],
  'contrib.demo': ['Namoyish rejimida video serverga yuborilmaydi. Server ulanganda ishlaydi.', 'В демо-режиме видео не отправляется. Заработает, когда сервер подключён.', 'In demo mode the video is not sent. It works once a server is connected.'],

  // ---- history ----
  'hist.title': ['Tarix', 'История', 'History'],
  'hist.intro': ["Oldingi tarjimalar. Ular shu brauzerga bog'langan, boshqa hech kim ko'rmaydi.", 'Прошлые переводы. Они привязаны к этому браузеру, их больше никто не видит.', 'Past translations. They are tied to this browser and nobody else sees them.'],
  'hist.empty': ["Hali tarjima yo'q.", 'Переводов пока нет.', 'No translations yet.'],
  'hist.start': ['Tarjimani boshlang', 'Начать перевод', 'Start translating'],
  'hist.fromSign': ['Imo-ishoradan', 'Из жестов', 'From signs'],
  'hist.fromSpeech': ['Nutqdan', 'Из речи', 'From speech'],
  'hist.raw': ["Tanilgan so'zlar: {w}", 'Распознанные слова: {w}', 'Recognized words: {w}'],
  'hist.delete': ["O'chirish", 'Удалить', 'Delete'],

  // ---- settings ----
  'set.title': ['Sozlamalar', 'Настройки', 'Settings'],
  'set.intro': ['Bu sozlamalar shu brauzerda saqlanadi.', 'Эти настройки хранятся в этом браузере.', 'These settings are saved in this browser.'],
  'set.uiLang': ['Sayt tili', 'Язык сайта', 'Site language'],
  'set.uiLangHint': ["Barcha bo'limlar shu tilda ko'rsatiladi.", 'Все разделы показываются на этом языке.', 'Every section is shown in this language.'],
  'set.voice': ["Gapni ovoz chiqarib o'qish", 'Читать фразу вслух', 'Read the sentence aloud'],
  'set.voiceHint': ["Brauzer ovozi bilan. Ovoz bo'lmasa, faqat matn chiqadi.", 'Голосом браузера. Если голоса нет, будет только текст.', "With the browser's voice. Without one, only text is shown."],
  'set.smooth': ["So'zlardan gap tuzish", 'Собирать фразу из слов', 'Make a sentence from the words'],
  'set.smoothHint': ["Tugatganingizda tanilgan so'zlar to'liq gapga aylanadi.", 'Когда закончите, слова превращаются в полное предложение.', 'When you finish, the words become a full sentence.'],
  'set.speech': ['Eshituvchi nutqi tili', 'Язык речи слышащего', "Hearing person's language"],
  'set.speechHint': ['Subtitr uchun. "Avtomatik" tilni o\'zi aniqlaydi.', 'Для субтитров. «Авто» определяет язык сам.', 'For subtitles. "Auto" detects the language.'],
  'set.auto': ['Avtomatik', 'Авто', 'Auto'],
  'set.hist': ['Tarixni saqlash', 'Сохранять историю', 'Save history'],
  'set.histHint': ["O'chirsangiz, yangi tarjimalar saqlanmaydi.", 'Если выключить, новые переводы не сохраняются.', "When off, new translations aren't saved."],
  'set.theme': ['Mavzu', 'Тема', 'Theme'],
  'set.themeAuto': ["Tizim bo'yicha", 'Как в системе', 'System'],
  'set.themeLight': ["Yorug'", 'Светлая', 'Light'],
  'set.themeDark': ["Qorong'i", 'Тёмная', 'Dark'],
  'set.mode': ['Ish rejimi', 'Режим работы', 'Mode'],
  'set.modeHint': ["\"Avtomatik\": server javob bersa jonli tanish, bo'lmasa namoyish. Namoyishda so'zlar namuna ketma-ketligidan chiqadi.", '«Авто»: если сервер отвечает, настоящее распознавание, иначе демо. В демо слова идут из примера.', '"Auto": live recognition when a server answers, otherwise demo. In demo the words come from a sample.'],
  'set.modeLive': ['Faqat server', 'Только сервер', 'Server only'],
  'set.modeDemo': ['Namoyish', 'Демо', 'Demo'],
  'set.api': ['Server manzili', 'Адрес сервера', 'Server address'],
  'set.apiHint': ["Bo'sh qoldirsangiz, sayt ochilgan server ishlatiladi. Colab havolasini shu yerga qo'ying.", 'Оставьте пустым, чтобы использовать сервер этого сайта. Вставьте сюда ссылку Colab.', 'Leave empty to use the server this site came from. Paste the Colab link here.'],
  'set.checking': ['Tekshirilmoqda…', 'Проверяю…', 'Checking…'],
  'set.demoNow': ['Hozir namoyish rejimi: server ishlatilmayapti.', 'Сейчас демо-режим: сервер не используется.', 'Demo mode now: no server in use.'],
  'set.connected': ['Ulandi: {url} (versiya {v})', 'Подключено: {url} (версия {v})', 'Connected: {url} (version {v})'],
  'set.failed': ["Ulanib bo'lmadi: {url}", 'Не удалось подключиться: {url}', "Couldn't connect: {url}"],
  'set.clear': ['Tarixni tozalash', 'Очистить историю', 'Clear history'],
  'set.clearHint': ["Shu brauzerdagi barcha yozuvlar o'chadi.", 'Удалятся все записи в этом браузере.', 'Deletes every entry in this browser.'],
  'set.clearBtn': ['Tozalash', 'Очистить', 'Clear'],
  'set.cleared': ['Tozalandi', 'Очищено', 'Cleared'],
  'set.clearFail': ["Xato, qayta urinib ko'ring", 'Ошибка, попробуйте снова', 'Error, try again'],

  // ---- errors (REST codes) ----
  'err.invalid_client_id': ['Bu qurilmada nimadir xato ketdi. Sahifani yangilang.', 'Что-то пошло не так на этом устройстве. Обновите страницу.', 'Something went wrong on this device. Reload the page.'],
  'err.invalid_request': ["Kiritilgan ma'lumotni tekshiring.", 'Проверьте введённые данные.', 'Please check what you entered.'],
  'err.not_found': ["Bu yozuv endi yo'q.", 'Эта запись удалена.', 'That item is gone.'],
  'err.file_too_large': ['Fayl juda katta.', 'Файл слишком большой.', 'That file is too large.'],
  'err.unsupported_media_type': ["Bu fayl turi qo'llab-quvvatlanmaydi.", 'Этот тип файла не поддерживается.', "That file type isn't supported."],
  'err.internal_error': ["Serverda xato chiqdi. Qaytadan urinib ko'ring.", 'Ошибка на сервере. Попробуйте ещё раз.', 'Something went wrong on the server. Please try again.'],
  'err.upstream_error': ["Nutq xizmati band. Qaytadan urinib ko'ring.", 'Сервис речи занят. Попробуйте ещё раз.', 'The speech service is busy. Please try again.'],
  'err.model_unavailable': ['Tarjima hozircha ishlamayapti.', 'Перевод сейчас недоступен.', 'Translation is unavailable right now.'],
  'err.network': ["Server bilan aloqa yo'q. Server manzilini Sozlamalarda tekshiring.", 'Нет связи с сервером. Проверьте адрес в Настройках.', "Can't reach the server. Check the address in Settings."],
  'lname.uz': ["O'zbekcha", 'Узбекский', 'Uzbek'],
  'lname.ru': ['Ruscha', 'Русский', 'Russian'],
  'lname.en': ['Inglizcha', 'Английский', 'English']
};

const IDX = { uz: 0, ru: 1, en: 2 };
let lang = IDX[settings.get('uiLang')] !== undefined ? settings.get('uiLang') : 'uz';
const listeners = new Set();

export const getLang = () => lang;

export function t(key, vars) {
  const row = D[key];
  let s = row ? row[IDX[lang]] ?? row[0] : key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return s;
}

export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.documentElement.lang = lang;
  document.title = t('meta.title');
  document.querySelectorAll('[data-ui-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.uiLang === lang)));
}

export function setLang(next) {
  if (IDX[next] === undefined || next === lang) return;
  lang = next;
  settings.set('uiLang', next);
  applyI18n();
  listeners.forEach(fn => fn(lang));
}

export const onLangChange = fn => listeners.add(fn);
