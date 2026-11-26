// App language: O'zbekcha, Русский, English. Every visible string lives here.
// HTML: data-i18n="key" (text), data-i18n-ph (placeholder), data-i18n-aria (aria-label). JS: t('key', {var}).
import { settings } from './settings.js';

export const UI_LANGS = [['uz', "O'zbekcha"], ['ru', 'Русский'], ['en', 'English']];

const D = {
  'app.name': ['Phoenix', 'Phoenix', 'Phoenix'],
  'demo.tag': ['Namoyish', 'Демо', 'Demo'],
  'demo.long': ['Namoyish rejimi: server ulanmagan, so\'zlar namuna.', 'Демо-режим: сервер не подключён, слова примерные.', 'Demo mode: no server connected, the words are samples.'],

  // sign-in
  'in.title': ['Ikki kishi, bitta telefon', 'Двое людей, один телефон', 'Two people, one phone'],
  'in.lead': ['Imo-ishora matn va ovozga aylanadi, javob esa subtitr bo\'lib qaytadi.', 'Жесты становятся текстом и голосом, ответ возвращается субтитрами.', 'Signs become text and voice, and the reply comes back as subtitles.'],
  'in.google': ['Google bilan kirish', 'Войти через Google', 'Continue with Google'],
  'in.github': ['GitHub bilan kirish', 'Войти через GitHub', 'Continue with GitHub'],
  'in.skip': ['Kirmasdan davom etish', 'Продолжить без входа', 'Continue without an account'],
  'in.why': ['Kirsangiz, tarjimalar tarixi boshqa telefonda ham ochiladi.', 'Со входом история переводов откроется и на другом телефоне.', 'Signed in, your translation history opens on any phone.'],
  'in.off': ['Bu kirish usuli hali sozlanmagan.', 'Этот способ входа ещё не настроен.', 'This sign-in method is not set up yet.'],
  'in.webOnly': ['Google bilan kirish telefondagi ilovada ishlaydi.', 'Вход через Google работает в приложении на телефоне.', 'Google sign-in works in the phone app.'],
  'in.failed': ['Kirib bo\'lmadi: {msg}', 'Не удалось войти: {msg}', 'Sign-in failed: {msg}'],
  'in.cancelled': ['Kirish bekor qilindi.', 'Вход отменён.', 'Sign-in cancelled.'],
  'in.welcome': ['Xush kelibsiz, {name}!', 'Добро пожаловать, {name}!', 'Welcome, {name}!'],
  'in.local': ['Kirdingiz. Server ulanganda tarix akkauntga bog\'lanadi.', 'Вы вошли. Когда сервер подключится, история привяжется к аккаунту.', 'Signed in. History links to your account once a server is connected.'],
  'in.relink': ['Akkauntni serverga ulash uchun qayta kiring.', 'Войдите ещё раз, чтобы привязать аккаунт к серверу.', 'Sign in again to link your account to this server.'],
  'in.relinkBtn': ['Ulash', 'Привязать', 'Link'],
  'in.expired': ['Kirish muddati tugadi, qayta kiring.', 'Срок входа истёк, войдите снова.', 'Your sign-in expired. Sign in again.'],

  // GitHub device flow sheet
  'gh.title': ['GitHub\'da shu kodni kiriting', 'Введите этот код на GitHub', 'Enter this code on GitHub'],
  'gh.step': ['GitHub sahifasi ochiladi. Kodni joylang va «Authorize» ni bosing, keyin shu yerga qayting.', 'Откроется страница GitHub. Вставьте код, нажмите «Authorize» и вернитесь сюда.', 'A GitHub page opens. Paste the code, tap "Authorize", then come back here.'],
  'gh.copy': ['Nusxa olish', 'Копировать', 'Copy'],
  'gh.copied': ['Kod nusxalandi', 'Код скопирован', 'Code copied'],
  'gh.open': ['GitHub\'ni ochish', 'Открыть GitHub', 'Open GitHub'],
  'gh.wait': ['Tasdiqlashingizni kutyapman…', 'Жду подтверждения…', 'Waiting for you to confirm…'],
  'gh.expired': ['Kod eskirdi. Qaytadan urinib ko\'ring.', 'Код устарел. Попробуйте ещё раз.', 'The code expired. Try again.'],
  'gh.denied': ['GitHub\'da rad etildi.', 'Отклонено на GitHub.', 'Declined on GitHub.'],
  'gh.loading': ['Kod olinmoqda…', 'Получаю код…', 'Getting a code…'],

  // nav
  'nav.talk': ['Suhbat', 'Беседа', 'Talk'],
  'nav.dict': ['Lug\'at', 'Словарь', 'Dictionary'],
  'nav.history': ['Tarix', 'История', 'History'],
  'nav.me': ['Profil', 'Профиль', 'Profile'],

  // talk
  'talk.they': ['Imo qiluvchi', 'Жестующий', 'Signer'],
  'talk.hearing': ['Eshituvchi', 'Слышащий', 'Hearing person'],
  'talk.signedTitle': ['U imo bilan aytdi', 'Сказано жестами', 'Signed'],
  'talk.saidTitle': ['U ovoz bilan aytdi', 'Сказано голосом', 'Said aloud'],
  'talk.signedEmpty': ['Imo qiluvchi ko\'rsatgan gap shu yerda katta harflarda chiqadi.', 'Здесь крупно появится фраза, показанная жестами.', 'The signed sentence appears here in large type.'],
  'talk.saidEmpty': ['Mikrofonni yoqing: gapirganingiz shu yerda subtitr bo\'ladi.', 'Включите микрофон: ваша речь появится здесь субтитрами.', 'Turn on the microphone: what you say appears here as subtitles.'],
  'talk.yourSigns': ['Ko\'rsatgan so\'zlaringiz', 'Ваши жесты', 'Your signs'],
  'talk.start': ['Boshlash', 'Начать', 'Start'],
  'talk.finish': ['Gapni yakunlash', 'Закончить фразу', 'Finish sentence'],
  'talk.end': ['Suhbatni tugatish', 'Завершить беседу', 'End conversation'],
  'talk.mic': ['Gapirish', 'Говорить', 'Speak'],
  'talk.micOn': ['Tinglayapman', 'Слушаю', 'Listening'],
  'talk.say': ['Qayta o\'qish', 'Озвучить', 'Read aloud'],
  'talk.reset': ['Tozalash', 'Очистить', 'Clear'],
  'talk.flip': ['Telefon kimda: almashtirish', 'Чей телефон: поменять', 'Who holds the phone: switch'],
  'talk.holderHearing': ['Telefon eshituvchida · orqa kamera', 'Телефон у слышащего · задняя камера', 'Hearing person holds it · back camera'],
  'talk.holderSigner': ['Telefon imo qiluvchida · old kamera', 'Телефон у жестующего · фронтальная камера', 'Signer holds it · front camera'],
  'talk.camOff': ['Kamera o\'chiq', 'Камера выключена', 'Camera off'],
  'talk.camOn': ['Kamera', 'Камера', 'Camera'],
  'talk.noCam': ['Kamera yo\'q, namuna davom etadi', 'Нет камеры, идёт пример', 'No camera, the sample keeps going'],
  'talk.made': ['{lang} tilida gap tuzildi', 'Фраза составлена: {lang}', 'Sentence made in {lang}'],
  'talk.raw': ['So\'zma-so\'z', 'Слово в слово', 'Word for word'],
  'talk.signLang': ['Imo tili', 'Язык жестов', 'Sign language'],
  'talk.target': ['Natija tili', 'Язык результата', 'Output language'],

  'st.off': ['Boshlash tugmasini bosing', 'Нажмите «Начать»', 'Tap Start'],
  'st.camera': ['Kamera ochilmoqda…', 'Открываю камеру…', 'Opening the camera…'],
  'st.connecting': ['Ulanmoqda…', 'Подключаюсь…', 'Connecting…'],
  'st.retry': ['Qayta ulanish {s} s dan keyin', 'Переподключение через {s} с', 'Reconnecting in {s} s'],
  'st.listening': ['Imo kutilmoqda', 'Жду жестов', 'Watching for signs'],
  'st.got': ['So\'z tanildi', 'Жест распознан', 'Sign recognised'],
  'st.making': ['Gap tuzilmoqda…', 'Составляю фразу…', 'Making a sentence…'],
  'st.sentence': ['Gap tayyor', 'Фраза готова', 'Sentence ready'],
  'st.nothing': ['Hech narsa tanilmadi', 'Ничего не распознано', 'Nothing recognised'],
  'st.paused': ['Pauza: harakat yo\'q edi', 'Пауза: не было движения', 'Paused: no activity'],

  // errors and states
  'b.camDenied': ['Kameraga ruxsat berilmadi. Telefon sozlamalaridan ruxsat bering.', 'Нет доступа к камере. Разрешите его в настройках телефона.', 'Camera access was denied. Allow it in the phone settings.'],
  'b.camMissing': ['Kamera topilmadi.', 'Камера не найдена.', 'No camera found.'],
  'b.micDenied': ['Mikrofonga ruxsat berilmadi.', 'Нет доступа к микрофону.', 'Microphone access was denied.'],
  'b.server': ['Server bilan aloqa yo\'q. Profil > Server manzilini tekshiring.', 'Нет связи с сервером. Проверьте Профиль > Адрес сервера.', 'Can\'t reach the server. Check Profile > Server address.'],
  'b.model': ['{lang} modeli serverda yuklanmagan.', 'Модель {lang} не загружена на сервере.', 'The {lang} model is not loaded on the server.'],
  'b.busy': ['Server band, bir oz kuting.', 'Сервер занят, подождите.', 'The server is busy, wait a moment.'],
  'b.idle': ['Uzoq harakat bo\'lmadi, pauza qilindi.', 'Долго не было движения, пауза.', 'Nothing happened for a while, paused.'],
  'b.resume': ['Davom etish', 'Продолжить', 'Resume'],
  'b.cpu': ['Server GPU\'siz ishlayapti: javob sekin keladi.', 'Сервер работает без GPU: ответ будет медленным.', 'The server has no GPU: answers will be slow.'],

  // dictionary
  'dict.title': ['Lug\'at', 'Словарь', 'Dictionary'],
  'dict.search': ['So\'z qidirish', 'Поиск слова', 'Search a word'],
  'dict.all': ['Hammasi', 'Все', 'All'],
  'dict.word': ['So\'zlar', 'Слова', 'Words'],
  'dict.letter': ['Harflar', 'Буквы', 'Letters'],
  'dict.phrase': ['Iboralar', 'Фразы', 'Phrases'],
  'dict.count': ['{n} ta', '{n}', '{n}'],
  'dict.more': ['Yana ko\'rsatish', 'Показать ещё', 'Show more'],
  'dict.none': ['«{q}» topilmadi. Boshqa yozilishini sinang yoki imo tilini almashtiring.', '«{q}» не найдено. Попробуйте другое написание или другой язык жестов.', 'No match for "{q}". Try another spelling or switch the sign language.'],
  'dict.hint': ['Phoenix shu so\'zlarni taniydi. RSL so\'zlari ruscha, ASL so\'zlari inglizcha yozilgan.', 'Phoenix распознаёт эти слова. Слова РЖЯ записаны по-русски, ASL по-английски.', 'Phoenix recognises these words. RSL words are written in Russian, ASL words in English.'],
  'dict.asl': ['ASL faqat namoyish uchun, tijoratda emas', 'ASL только для демо, не для коммерции', 'ASL is for demos only, not commercial use'],

  // history
  'hist.title': ['Tarix', 'История', 'History'],
  'hist.clear': ['Hammasini o\'chirish', 'Удалить всё', 'Delete all'],
  'hist.clearAsk': ['Butun tarix o\'chirilsinmi?', 'Удалить всю историю?', 'Delete the whole history?'],
  'hist.cleared': ['Tarix o\'chirildi', 'История удалена', 'History deleted'],
  'hist.deleted': ['O\'chirildi', 'Удалено', 'Deleted'],
  'hist.undo': ['Qaytarish', 'Вернуть', 'Undo'],
  'hist.del': ['O\'chirish', 'Удалить', 'Delete'],
  'hist.emptyT': ['Hali tarjima yo\'q', 'Переводов пока нет', 'No translations yet'],
  'hist.emptyP': ['Suhbatda yakunlangan har bir gap va subtitr shu yerga tushadi.', 'Каждая законченная фраза и субтитр из беседы попадут сюда.', 'Every finished sentence and subtitle from a talk lands here.'],
  'hist.toTalk': ['Suhbatni boshlash', 'Начать беседу', 'Start a talk'],
  'hist.sign': ['Imo → matn', 'Жесты → текст', 'Sign → text'],
  'hist.speech': ['Nutq → matn', 'Речь → текст', 'Speech → text'],
  'hist.today': ['Bugun', 'Сегодня', 'Today'],
  'hist.yesterday': ['Kecha', 'Вчера', 'Yesterday'],
  'hist.account': ['Akkauntingizga saqlanadi: {name}', 'Сохраняется в аккаунт: {name}', 'Saved to your account: {name}'],
  'hist.device': ['Faqat shu telefonda saqlanadi. Kirsangiz, akkauntga o\'tadi.', 'Хранится только на этом телефоне. Войдите, чтобы перенести в аккаунт.', 'Stored on this phone only. Sign in to move it to your account.'],
  'hist.error': ['Tarixni yuklab bo\'lmadi.', 'Не удалось загрузить историю.', 'Could not load the history.'],
  'hist.retry': ['Qayta urinish', 'Повторить', 'Retry'],

  // profile / settings
  'me.title': ['Profil', 'Профиль', 'Profile'],
  'me.guest': ['Mehmon', 'Гость', 'Guest'],
  'me.guestP': ['Kiring: tarix akkauntingizda saqlanadi va boshqa telefonda ochiladi.', 'Войдите: история сохранится в аккаунте и откроется на другом телефоне.', 'Sign in: history is kept in your account and opens on other phones.'],
  'me.signOut': ['Chiqish', 'Выйти', 'Sign out'],
  'me.signedOut': ['Akkauntdan chiqdingiz', 'Вы вышли из аккаунта', 'Signed out'],
  'me.via': ['{p} orqali', 'через {p}', 'via {p}'],
  'me.pending': ['Server ulanmagan: akkaunt hozircha shu telefonda', 'Сервер не подключён: аккаунт пока на телефоне', 'No server yet: the account lives on this phone for now'],
  'me.translate': ['Tarjima', 'Перевод', 'Translation'],
  'me.voice': ['Gapni ovoz bilan o\'qish', 'Озвучивать фразу', 'Read sentences aloud'],
  'me.smooth': ['So\'zlardan gap tuzish', 'Составлять фразу из слов', 'Make sentences from words'],
  'me.save': ['Tarixni saqlash', 'Сохранять историю', 'Keep history'],
  'me.speechLang': ['Eshituvchining tili', 'Язык слышащего', 'Hearing person\'s language'],
  'me.auto': ['Avtomatik', 'Автоматически', 'Automatic'],
  'me.app': ['Ilova', 'Приложение', 'App'],
  'me.uiLang': ['Ilova tili', 'Язык приложения', 'App language'],
  'me.theme': ['Mavzu', 'Тема', 'Theme'],
  'me.light': ['Yorug\'', 'Светлая', 'Light'],
  'me.dark': ['Qorong\'i', 'Тёмная', 'Dark'],
  'me.system': ['Telefondagidek', 'Как в системе', 'System'],
  'me.server': ['Server', 'Сервер', 'Server'],
  'me.api': ['Server manzili', 'Адрес сервера', 'Server address'],
  'me.apiHint': ['Colab yoki Kaggle bergan https://….trycloudflare.com manzili', 'Адрес https://….trycloudflare.com из Colab или Kaggle', 'The https://….trycloudflare.com address from Colab or Kaggle'],
  'me.check': ['Tekshirish', 'Проверить', 'Check'],
  'me.mode': ['Ish rejimi', 'Режим работы', 'Mode'],
  'me.modeAuto': ['Avto', 'Авто', 'Auto'],
  'me.modeLive': ['Server', 'Сервер', 'Server'],
  'me.modeDemo': ['Namoyish', 'Демо', 'Demo'],
  'me.ok': ['Server ishlayapti', 'Сервер работает', 'Server is up'],
  'me.fail': ['Server javob bermadi', 'Сервер не ответил', 'The server did not answer'],
  'me.about': ['Ilova haqida', 'О приложении', 'About'],
  'me.privacy': ['Kamera kadrlari va ovoz faqat siz kiritgan serverga yuboriladi. Serverda Gemini yoqilgan bo\'lsa, ovoz Google\'ning Gemini xizmatida matnga aylanadi.', 'Кадры камеры и голос отправляются только на указанный вами сервер. Если на сервере включён Gemini, голос распознаёт сервис Google Gemini.', 'Camera frames and audio go only to the server you entered. If that server has Gemini on, speech is transcribed by Google\'s Gemini service.'],
  'me.version': ['Versiya {v}', 'Версия {v}', 'Version {v}'],

  // sheets / misc
  'sheet.close': ['Yopish', 'Закрыть', 'Close'],
  'sheet.cancel': ['Bekor qilish', 'Отмена', 'Cancel'],
  'sheet.done': ['Tayyor', 'Готово', 'Done'],
  'yes': ['Ha', 'Да', 'Yes'],

  'sign.rsl': ['RSL · rus imo tili', 'РЖЯ · русский жестовый', 'RSL · Russian signs'],
  'sign.asl': ['ASL · amerika imo tili', 'ASL · американский жестовый', 'ASL · American signs'],
  'sign.rslShort': ['RSL', 'РЖЯ', 'RSL'],
  'sign.aslShort': ['ASL', 'ASL', 'ASL'],
  'lname.uz': ['O\'zbekcha', 'Узбекский', 'Uzbek'],
  'lname.ru': ['Ruscha', 'Русский', 'Russian'],
  'lname.en': ['Inglizcha', 'Английский', 'English'],

  // used by the shared demo.js
  'contrib.demo': ['Namoyish rejimida video serverga yuborilmaydi.', 'В демо-режиме видео не отправляется.', 'In demo mode the video is not sent.'],

  'err.network': ['Server bilan aloqa yo\'q.', 'Нет связи с сервером.', 'Can\'t reach the server.'],
  'err.internal_error': ['Serverda xato chiqdi. Qaytadan urinib ko\'ring.', 'Ошибка на сервере. Попробуйте ещё раз.', 'Something went wrong on the server. Try again.'],
  'err.auth_unavailable': ['Bu kirish usuli serverda sozlanmagan.', 'Этот способ входа не настроен на сервере.', 'This sign-in method is not set up on the server.'],
  'err.invalid_token': ['Kirishni tasdiqlab bo\'lmadi.', 'Не удалось подтвердить вход.', 'The sign-in could not be verified.'],
  'err.provider_unavailable': ['Google yoki GitHub bilan aloqa yo\'q.', 'Нет связи с Google или GitHub.', 'Can\'t reach Google or GitHub.'],
  'err.session_expired': ['Kirish muddati tugadi, qayta kiring.', 'Срок входа истёк, войдите снова.', 'Your sign-in expired. Sign in again.'],
  'err.model_unavailable': ['Tarjima hozircha ishlamayapti.', 'Перевод сейчас недоступен.', 'Translation is unavailable right now.']
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
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}
export function setLang(l) {
  if (!(l in IDX) || l === lang) return;
  lang = l; settings.set('uiLang', l); applyI18n(); listeners.forEach(fn => fn(l));
}
export const onLangChange = fn => listeners.add(fn);
