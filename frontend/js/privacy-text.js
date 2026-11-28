// Privacy Policy text in three languages, rendered by privacy.js on #maxfiylik.
// Blocks: a string is a paragraph, { h3 } a sub-heading, { list: [] } a bulleted list, { rows: [[a, b]] } a two-column table.
// Inline: **bold**, [text](url), {email}. Bump VERSION and UPDATED whenever the meaning changes:
// sign-up stores the version a person agreed to.

export const VERSION = '1.0';
export const UPDATED = '2026-11-28';
export const EMAIL = 'eshturdiyedilbek@gmail.com';

const GOOGLE_PP = 'https://policies.google.com/privacy';
const GITHUB_PP = 'https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement';

export const POLICY = {
  uz: {
    title: 'Maxfiylik siyosati',
    lead: "Phoenix imo-ishorani matnga, nutqni esa subtitrga aylantiradi. Buning uchun kamerangiz, mikrofoningiz va yozgan so'zlaringiz bilan ishlaymiz. Bu sahifa nimani olishimizni, nima qilishimizni va nimani hech qachon qilmasligimizni oddiy tilda tushuntiradi.",
    updated: 'Kuchga kirgan sana',
    version: 'Versiya',
    toc: 'Mundarija',
    back: "Ro'yxatdan o'tishga qaytish",
    glanceT: 'Qisqasi',
    glance: [
      ["Videongiz saqlanmaydi.", "Kamera kadrlari tanib bo'lingach darhol o'chiriladi."],
      ["Suhbatlar yozib olinmaydi.", "Video qo'ng'iroq to'g'ridan-to'g'ri ikki qurilma o'rtasida o'tadi."],
      ["Ma'lumotingiz sotilmaydi.", "Reklama yo'q, kuzatuvchi cookie yo'q."],
      ["Hammasi sizning qo'lingizda.", "Tarixni va akkauntni istalgan payt o'chirasiz."]
    ],
    sections: [
      { id: 'kim', h: 'Biz kimmiz', body: [
        "Ushbu siyosat Phoenix veb-sayti, Android ilovasi va ular bilan ishlaydigan serverlarga (birgalikda «Phoenix», «xizmat», «biz») taalluqli. Phoenix'dan foydalanish orqali siz shu siyosatda yozilganidek ma'lumotlaringiz qayta ishlanishiga rozilik bildirasiz.",
        "Shaxsga doir ma'lumotlaringiz uchun Phoenix javobgar. Har qanday savol bo'yicha {email} manziliga yozing."
      ] },
      { id: 'nima', h: "Qanday ma'lumotlarni olamiz", body: [
        "Faqat xizmat ishlashi uchun kerak bo'lgan narsani olamiz. Quyida har bir funksiya alohida yozilgan.",
        { h3: 'Akkaunt' },
        "Email va parol bilan ro'yxatdan o'tsangiz: ismingiz, email manzilingiz va parolingiz. Parol hech qachon ochiq ko'rinishda saqlanmaydi, faqat tuzli PBKDF2-SHA-256 xeshi saqlanadi. Shuningdek, Maxfiylik siyosatiga qaysi sanada va qaysi versiyasiga rozilik berganingizni yozib qo'yamiz.",
        "Google yoki GitHub orqali kirsangiz: o'sha xizmat bizga bergan ism, email, profil rasmi va akkaunt identifikatori. Parolingizni biz ko'rmaymiz, u Google yoki GitHub'da qoladi.",
        { h3: 'Kamera (imo-ishorani tanish)' },
        "Imo-ishora rejimida kamerani yoqsangiz, video kadrlar shifrlangan ulanish orqali serverimizga yuboriladi. Server ularni operativ xotirada tahlil qiladi, qaysi so'z ko'rsatilganini aniqlaydi va kadrlarni darhol o'chiradi. Kadrlar diskka yozilmaydi, saqlanmaydi va roziligingizsiz modelni o'qitishga ishlatilmaydi.",
        "Phoenix imo-ishorani taniydi, odamni emas. Biz yuzni tanish yoki shaxsni aniqlash bilan shug'ullanmaymiz va biometrik profil tuzmaymiz.",
        { h3: 'Mikrofon (nutqdan matnga)' },
        "Ovozli rejimda mikrofon tugmasini bossangiz, yozilgan qisqa ovoz parchasi serverimizga yuboriladi va matnga aylantiriladi. Bu ish yo bizning serverimizda, yo bizning nomimizdan ishlaydigan ishonchli bulutli nutqni tanish provayderida (Google LLC) bajariladi. Ovoz yozuvi matnga aylangach o'chiriladi, biz uni saqlamaymiz.",
        "Google ovozni o'z API foydalanish shartlari va [maxfiylik siyosati](" + GOOGLE_PP + ") asosida qayta ishlaydi.",
        { h3: "Matn va gap tuzish" },
        "Tanilgan so'zlardan grammatik to'g'ri gap tuzish va uni o'zbek, rus yoki ingliz tiliga o'girish uchun so'zlar ro'yxati xuddi shu provayderga yuborilishi mumkin. Unda faqat so'zlar bo'ladi, video yoki ovoz bo'lmaydi.",
        { h3: "Ikki kishilik suhbat va video qo'ng'iroq" },
        "Suhbatda yozgan yoki tanilgan matnli xabarlaringiz serverimiz orqali faqat suhbatdoshingizga yetkazish uchun o'tadi. Xabarlar saqlanmaydi va suhbat tugashi bilan xona yopiladi.",
        "Video va ovoz qo'ng'irog'i WebRTC orqali to'g'ridan-to'g'ri ikki qurilma o'rtasida, shifrlangan (DTLS-SRTP) holda uzatiladi. To'g'ridan-to'g'ri ulanib bo'lmasa, oqim relay server orqali o'tadi, lekin u ham shifrlangan bo'lib qoladi va saqlanmaydi. Ulanishni o'rnatish uchun STUN serverlari (jumladan Google'ning ommaviy STUN serveri) IP manzilingizni ko'radi.",
        { h3: 'Tarjima tarixi' },
        "Sozlamalarda «Tarixni saqlash» yoqilgan bo'lsa, tarjima qilingan matnlar (video yoki ovoz emas) saqlanadi: qurilmangizda va server ulangan bo'lsa, serverda tasodifiy brauzer identifikatoriga bog'langan holda. Uni istalgan payt o'chirishingiz yoki saqlashni o'chirib qo'yishingiz mumkin.",
        { h3: "Lug'atga video hissa qo'shish" },
        "Lug'at sahifasida o'z imo-ishorangiz videosini yubormoqchi bo'lsangiz, alohida rozilik belgisini qo'yasiz. Faqat shundan keyin video serverga yuklanadi va imo-ishorani tanishni yaxshilash uchun saqlanadi. Roziligingizni istalgan payt qaytarib olib, videoni o'chirishni so'rashingiz mumkin.",
        { h3: "To'lov" },
        "Pro rejani voucher bilan ochganingizda reja turi, sana va voucher nomi akkauntingizga yoziladi. Karta raqami, amal qilish muddati va CVV kodini biz saqlamaymiz. Karta orqali to'lov ulanganda u litsenziyaga ega to'lov provayderi orqali amalga oshiriladi va karta ma'lumotlari faqat o'sha provayderda bo'ladi.",
        { h3: "Texnik ma'lumotlar" },
        "Brauzeringiz uchun tasodifiy identifikator (ismingiz yoki qurilmangiz bilan bog'liq emas), til va sozlamalar, urinishlar hisoblagichi. Serverlarimiz xavfsizlik va xatolarni tuzatish uchun qisqa muddatli texnik jurnallar yuritadi: IP manzil, vaqt, so'rov turi va xato xabarlari."
      ] },
      { id: 'nega', h: "Ma'lumotdan nima uchun foydalanamiz", body: [
        { list: [
          "imo-ishorani tanish, nutqni subtitrga aylantirish va suhbatni yetkazish uchun;",
          "akkauntingizni yaratish, kirishni tasdiqlash va Pro rejani saqlash uchun;",
          "bepul reja limitlarini hisoblash va suiiste'molning oldini olish uchun;",
          "xizmat xavfsizligini ta'minlash, xato va nosozliklarni topish uchun;",
          "siz rozilik bergan hollarda, masalan video hissa orqali, tanish sifatini oshirish uchun;",
          "qonun talab qilgan hollarda majburiyatlarimizni bajarish uchun."
        ] }
      ] },
      { id: 'hech', h: 'Nimani hech qachon qilmaymiz', body: [
        { list: [
          "Ma'lumotingizni **sotmaymiz** va ijaraga bermaymiz.",
          "Reklama ko'rsatmaymiz va reklama tarmoqlariga ma'lumot bermaymiz.",
          "Kuzatuvchi yoki analitik cookie'lardan foydalanmaymiz.",
          "Kamera kadrlari, ovoz yozuvlari va suhbat xabarlarini saqlamaymiz.",
          "Roziligingizsiz videongizni modelni o'qitishga ishlatmaymiz.",
          "Shaxsingizni yuz yoki ovoz orqali aniqlamaymiz."
        ] }
      ] },
      { id: 'kimga', h: "Kim bilan bo'lishamiz", body: [
        "Ma'lumot faqat xizmatni ishlatish uchun zarur bo'lganda va faqat quyidagilarga beriladi:",
        { list: [
          "**Bulutli nutq va til provayderi (Google LLC):** ovoz parchalari va tanilgan so'zlar, matnga aylantirish va gap tuzish uchun.",
          "**Kirish provayderlari:** Google yoki GitHub bilan kirishni o'zingiz tanlasangiz, ular bilan kirish ma'lumotlari almashiladi ([Google](" + GOOGLE_PP + "), [GitHub](" + GITHUB_PP + ")).",
          "**Xosting va infratuzilma:** serverlarimiz joylashgan provayderlar. Ular ma'lumotni faqat bizning ko'rsatmamiz bo'yicha qayta ishlaydi.",
          "**Davlat organlari:** faqat qonunda belgilangan tartibda va rasmiy so'rov bo'lganda."
        ] },
        "Phoenix boshqa kompaniyaga o'tsa yoki birlashsa, ma'lumotlar shu siyosatdagi himoya bilan birga o'tadi va biz sizni oldindan xabardor qilamiz."
      ] },
      { id: 'muddat', h: 'Qancha vaqt saqlaymiz', body: [
        { rows: [
          ['Kamera kadrlari', "Saqlanmaydi. Tanib bo'lingach soniyalar ichida xotiradan o'chadi"],
          ['Ovoz yozuvlari', "Saqlanmaydi. Matnga aylantirilgach o'chiriladi"],
          ['Suhbat xabarlari', "Saqlanmaydi. Faqat yetkazib beriladi"],
          ["Video qo'ng'iroq", "Serverlarimizda ochiq holda bo'lmaydi va saqlanmaydi"],
          ['Tarjima tarixi', "O'zingiz o'chirguningizcha yoki akkaunt o'chirilguncha"],
          ["Akkaunt ma'lumotlari", "Akkaunt bor ekan. O'chirish so'rovidan keyin 30 kun ichida o'chiriladi"],
          ['Video hissalar', 'Roziligingizni qaytarib olguningizcha'],
          ['Texnik jurnallar', '30 kungacha']
        ] }
      ] },
      { id: 'xavfsizlik', h: 'Xavfsizlik', body: [
        "Sayt, server va ilova o'rtasidagi barcha ulanishlar HTTPS va WSS orqali shifrlanadi. Parollar faqat xesh ko'rinishida saqlanadi, video qo'ng'iroqlar uchdan-uchgacha shifrlangan. Serverlarga kirish faqat kerakli odamlar bilan cheklangan.",
        "Internetda hech qanday tizim mutlaqo xavfsiz emas. Ma'lumotlaringizga ta'sir qiladigan xavfsizlik hodisasi yuz bersa, qonunda belgilangan muddatda sizga va vakolatli organga xabar beramiz."
      ] },
      { id: 'xotira', h: 'Brauzer xotirasi va cookie', body: [
        "Phoenix reklama yoki kuzatuv uchun cookie ishlatmaydi. Brauzeringizning mahalliy xotirasida (localStorage) faqat xizmat ishlashi uchun kerakli narsalar turadi: til, mavzu va sozlamalar, tasodifiy brauzer identifikatori, tarjima tarixi, kirish holati va urinishlar hisoblagichi.",
        "Brauzer sozlamalarida sayt ma'lumotlarini tozalasangiz, bularning hammasi o'chadi."
      ] },
      { id: 'huquq', h: 'Sizning huquqlaringiz', body: [
        "O'zbekiston Respublikasining «Shaxsga doir ma'lumotlar to'g'risida»gi Qonuniga va yashash joyingiz qonunlariga muvofiq siz quyidagilarga haqlisiz:",
        { list: [
          "qanday ma'lumotingiz borligini bilish va uning nusxasini olish;",
          "noto'g'ri ma'lumotni tuzatish;",
          "ma'lumotlaringizni va akkauntingizni o'chirish;",
          "bergan roziligingizni istalgan payt qaytarib olish;",
          "ma'lumotlarni qayta ishlashga e'tiroz bildirish yoki uni cheklash;",
          "vakolatli davlat organiga shikoyat qilish."
        ] },
        "Tarixni **Sozlamalar** sahifasida, akkauntni **Akkaunt** sahifasidagi «Akkauntni o'chirish» tugmasi bilan o'zingiz o'chirasiz. Boshqa so'rovlar uchun {email} manziliga yozing, 30 kun ichida javob beramiz."
      ] },
      { id: 'bolalar', h: 'Bolalar', body: [
        "Phoenix'da akkaunt ochish uchun kamida 13 yoshda bo'lish kerak. 13 yoshdan kichik bola xizmatdan faqat ota-onasi yoki vasiysi roziligi va nazorati ostida foydalanishi mumkin. Bola roziligisiz ma'lumot berganini bilsangiz, bizga yozing, biz uni o'chiramiz."
      ] },
      { id: 'joy', h: "Ma'lumotlar qayerda qayta ishlanadi", body: [
        "Serverlarimiz va provayderlarimiz O'zbekistondan tashqarida ham joylashgan bo'lishi mumkin. Ma'lumot boshqa mamlakatga o'tganda ham shu siyosatdagi himoya darajasi saqlanadi va faqat yuqorida yozilgan maqsadlarda ishlatiladi."
      ] },
      { id: 'ozgarish', h: "Siyosatdagi o'zgarishlar", body: [
        "Xizmat o'zgarsa, bu siyosatni yangilashimiz mumkin. Yangi versiya shu sahifada sanasi bilan chiqadi. Muhim o'zgarishlar bo'lsa, saytda yoki email orqali oldindan xabar beramiz va kerak bo'lsa qayta rozilik so'raymiz."
      ] },
      { id: 'aloqa', h: "Biz bilan bog'lanish", body: [
        "Maxfiylik, ma'lumotlaringiz yoki shu siyosat bo'yicha savol, so'rov va shikoyatlar uchun: {email}"
      ] }
    ]
  },

  ru: {
    title: 'Политика конфиденциальности',
    lead: 'Phoenix превращает жесты в текст, а речь в субтитры. Для этого мы работаем с вашей камерой, микрофоном и словами. На этой странице простым языком описано, что мы получаем, что с этим делаем и чего не делаем никогда.',
    updated: 'Действует с',
    version: 'Версия',
    toc: 'Содержание',
    back: 'Вернуться к регистрации',
    glanceT: 'Коротко',
    glance: [
      ['Ваше видео не сохраняется.', 'Кадры с камеры удаляются сразу после распознавания.'],
      ['Разговоры не записываются.', 'Видеозвонок идёт напрямую между двумя устройствами.'],
      ['Ваши данные не продаются.', 'Ни рекламы, ни следящих cookie.'],
      ['Всё под вашим контролем.', 'Историю и аккаунт можно удалить в любой момент.']
    ],
    sections: [
      { id: 'kim', h: 'Кто мы', body: [
        'Эта политика относится к сайту Phoenix, Android-приложению и серверам, с которыми они работают (вместе «Phoenix», «сервис», «мы»). Пользуясь Phoenix, вы соглашаетесь на обработку данных так, как описано в этой политике.',
        'За ваши персональные данные отвечает Phoenix. По любым вопросам пишите на {email}.'
      ] },
      { id: 'nima', h: 'Какие данные мы получаем', body: [
        'Мы берём только то, что нужно для работы сервиса. Ниже каждая функция описана отдельно.',
        { h3: 'Аккаунт' },
        'При регистрации по email и паролю: имя, адрес email и пароль. Пароль никогда не хранится в открытом виде, только его хеш PBKDF2-SHA-256 с солью. Мы также записываем, когда и с какой версией Политики конфиденциальности вы согласились.',
        'При входе через Google или GitHub: имя, email, фото профиля и идентификатор аккаунта, которые передал этот сервис. Ваш пароль мы не видим, он остаётся у Google или GitHub.',
        { h3: 'Камера (распознавание жестов)' },
        'Если вы включаете камеру в режиме жестов, кадры по зашифрованному соединению отправляются на наш сервер. Сервер анализирует их в оперативной памяти, определяет показанное слово и сразу удаляет кадры. Они не записываются на диск, не хранятся и не используются для обучения модели без вашего согласия.',
        'Phoenix распознаёт жесты, а не людей. Мы не распознаём лица, не устанавливаем личность и не создаём биометрических профилей.',
        { h3: 'Микрофон (речь в текст)' },
        'Когда в голосовом режиме вы нажимаете кнопку микрофона, короткий фрагмент записи отправляется на наш сервер и превращается в текст. Это делается либо на нашем сервере, либо у надёжного облачного провайдера распознавания речи (Google LLC), который работает от нашего имени. После расшифровки запись удаляется, мы её не храним.',
        'Google обрабатывает звук по своим условиям использования API и [политике конфиденциальности](' + GOOGLE_PP + ').',
        { h3: 'Текст и построение фраз' },
        'Чтобы собрать из распознанных слов грамматически правильную фразу и перевести её на узбекский, русский или английский, список слов может отправляться тому же провайдеру. В нём только слова, без видео и звука.',
        { h3: 'Разговор вдвоём и видеозвонок' },
        'Текстовые сообщения в разговоре проходят через наш сервер только для того, чтобы дойти до собеседника. Они не сохраняются, а комната закрывается, когда разговор заканчивается.',
        'Видео и звук звонка передаются по WebRTC напрямую между двумя устройствами в зашифрованном виде (DTLS-SRTP). Если прямое соединение невозможно, поток идёт через relay-сервер, но остаётся зашифрованным и не сохраняется. Для установки соединения STUN-серверы (в том числе публичный STUN-сервер Google) видят ваш IP-адрес.',
        { h3: 'История переводов' },
        'Если в настройках включено «Сохранять историю», переведённые тексты (не видео и не звук) сохраняются: на вашем устройстве, а при подключении к серверу и на сервере, привязанными к случайному идентификатору браузера. Вы можете удалить историю или отключить её сохранение в любой момент.',
        { h3: 'Видео для словаря' },
        'Если вы хотите отправить видео своего жеста на странице словаря, вы отдельно ставите отметку согласия. Только после этого видео загружается на сервер и хранится для улучшения распознавания. Вы можете в любой момент отозвать согласие и попросить удалить видео.',
        { h3: 'Оплата' },
        'Когда вы открываете Pro по ваучеру, к аккаунту записываются тариф, дата и название ваучера. Номер карты, срок действия и CVV мы не храним. Когда оплата картой будет подключена, она пойдёт через лицензированного платёжного провайдера, и данные карты будут только у него.',
        { h3: 'Технические данные' },
        'Случайный идентификатор браузера (не связан с вашим именем или устройством), язык и настройки, счётчик попыток. Наши серверы ведут краткосрочные технические журналы для безопасности и исправления ошибок: IP-адрес, время, тип запроса и сообщения об ошибках.'
      ] },
      { id: 'nega', h: 'Зачем мы используем данные', body: [
        { list: [
          'чтобы распознавать жесты, превращать речь в субтитры и доставлять сообщения;',
          'чтобы создать аккаунт, подтверждать вход и хранить тариф Pro;',
          'чтобы считать лимиты бесплатного тарифа и предотвращать злоупотребления;',
          'чтобы обеспечивать безопасность сервиса и находить ошибки и сбои;',
          'с вашего согласия, например через видео для словаря, чтобы улучшать распознавание;',
          'чтобы выполнять обязанности, предусмотренные законом.'
        ] }
      ] },
      { id: 'hech', h: 'Чего мы не делаем никогда', body: [
        { list: [
          'Мы **не продаём** и не сдаём ваши данные в аренду.',
          'Не показываем рекламу и не передаём данные рекламным сетям.',
          'Не используем следящие и аналитические cookie.',
          'Не храним кадры с камеры, записи голоса и сообщения разговоров.',
          'Не используем ваше видео для обучения модели без вашего согласия.',
          'Не устанавливаем личность по лицу или голосу.'
        ] }
      ] },
      { id: 'kimga', h: 'С кем мы делимся данными', body: [
        'Данные передаются только когда это нужно для работы сервиса и только этим получателям:',
        { list: [
          '**Облачный провайдер речи и языка (Google LLC):** фрагменты звука и распознанные слова, для расшифровки и построения фраз.',
          '**Провайдеры входа:** если вы сами выбираете вход через Google или GitHub, с ними происходит обмен данными входа ([Google](' + GOOGLE_PP + '), [GitHub](' + GITHUB_PP + ')).',
          '**Хостинг и инфраструктура:** провайдеры, где работают наши серверы. Они обрабатывают данные только по нашим указаниям.',
          '**Государственные органы:** только в порядке, установленном законом, и по официальному запросу.'
        ] },
        'Если Phoenix перейдёт к другой компании или объединится с ней, данные перейдут вместе с защитой из этой политики, и мы заранее вас предупредим.'
      ] },
      { id: 'muddat', h: 'Как долго мы храним данные', body: [
        { rows: [
          ['Кадры с камеры', 'Не хранятся. Удаляются из памяти через секунды после распознавания'],
          ['Записи голоса', 'Не хранятся. Удаляются после расшифровки'],
          ['Сообщения разговора', 'Не хранятся. Только доставляются'],
          ['Видеозвонок', 'Не бывает на наших серверах в открытом виде и не хранится'],
          ['История переводов', 'Пока вы её не удалите или пока не удалён аккаунт'],
          ['Данные аккаунта', 'Пока существует аккаунт. Удаляются в течение 30 дней после запроса'],
          ['Видео для словаря', 'Пока вы не отзовёте согласие'],
          ['Технические журналы', 'До 30 дней']
        ] }
      ] },
      { id: 'xavfsizlik', h: 'Безопасность', body: [
        'Все соединения между сайтом, сервером и приложением шифруются по HTTPS и WSS. Пароли хранятся только в виде хеша, видеозвонки зашифрованы от устройства до устройства. Доступ к серверам есть только у тех, кому он необходим.',
        'Ни одна система в интернете не защищена абсолютно. Если произойдёт инцидент, затрагивающий ваши данные, мы сообщим вам и уполномоченному органу в сроки, установленные законом.'
      ] },
      { id: 'xotira', h: 'Память браузера и cookie', body: [
        'Phoenix не использует cookie для рекламы или слежки. В локальной памяти браузера (localStorage) хранится только то, что нужно для работы: язык, тема и настройки, случайный идентификатор браузера, история переводов, состояние входа и счётчик попыток.',
        'Если очистить данные сайта в настройках браузера, всё это удалится.'
      ] },
      { id: 'huquq', h: 'Ваши права', body: [
        'В соответствии с Законом Республики Узбекистан «О персональных данных» и законами страны вашего проживания вы имеете право:',
        { list: [
          'знать, какие ваши данные у нас есть, и получить их копию;',
          'исправить неверные данные;',
          'удалить свои данные и аккаунт;',
          'в любой момент отозвать данное согласие;',
          'возразить против обработки данных или ограничить её;',
          'подать жалобу в уполномоченный государственный орган.'
        ] },
        'Историю вы удаляете сами на странице **Настройки**, аккаунт кнопкой «Удалить аккаунт» на странице **Аккаунт**. По остальным запросам пишите на {email}, мы ответим в течение 30 дней.'
      ] },
      { id: 'bolalar', h: 'Дети', body: [
        'Чтобы создать аккаунт в Phoenix, нужно быть не младше 13 лет. Ребёнок младше 13 лет может пользоваться сервисом только с согласия и под присмотром родителя или опекуна. Если вы узнали, что ребёнок передал данные без согласия, напишите нам, и мы их удалим.'
      ] },
      { id: 'joy', h: 'Где обрабатываются данные', body: [
        'Наши серверы и провайдеры могут находиться и за пределами Узбекистана. При передаче данных в другую страну уровень защиты из этой политики сохраняется, и данные используются только в описанных выше целях.'
      ] },
      { id: 'ozgarish', h: 'Изменения политики', body: [
        'Если сервис изменится, мы можем обновить эту политику. Новая версия появится на этой странице с датой. О существенных изменениях мы заранее сообщим на сайте или по email и при необходимости снова попросим согласия.'
      ] },
      { id: 'aloqa', h: 'Связаться с нами', body: [
        'Вопросы, запросы и жалобы о конфиденциальности, ваших данных или этой политике: {email}'
      ] }
    ]
  },

  en: {
    title: 'Privacy Policy',
    lead: 'Phoenix turns sign language into text and speech into subtitles. To do that we work with your camera, your microphone and your words. This page explains in plain language what we receive, what we do with it, and what we never do.',
    updated: 'Effective',
    version: 'Version',
    toc: 'Contents',
    back: 'Back to sign-up',
    glanceT: 'In short',
    glance: [
      ['Your video is not stored.', 'Camera frames are deleted the moment they are recognized.'],
      ['Conversations are not recorded.', 'Video calls go straight between the two devices.'],
      ['Your data is never sold.', 'No ads, no tracking cookies.'],
      ['You stay in control.', 'Delete your history and your account at any time.']
    ],
    sections: [
      { id: 'kim', h: 'Who we are', body: [
        'This policy covers the Phoenix website, the Android app and the servers they work with (together “Phoenix”, “the service”, “we”). By using Phoenix you agree to your data being handled as this policy describes.',
        'Phoenix is responsible for your personal data. For any question, write to {email}.'
      ] },
      { id: 'nima', h: 'What we collect', body: [
        'We only take what the service needs to work. Each feature is described separately below.',
        { h3: 'Account' },
        'If you sign up with email and password: your name, email address and password. The password is never stored as is, only as a salted PBKDF2-SHA-256 hash. We also record when you agreed to the Privacy Policy and to which version.',
        'If you sign in with Google or GitHub: the name, email, profile picture and account ID that service shares with us. We never see your password; it stays with Google or GitHub.',
        { h3: 'Camera (sign recognition)' },
        'When you turn on the camera in sign mode, video frames are sent to our server over an encrypted connection. The server analyses them in memory, works out which sign was shown and deletes the frames straight away. They are never written to disk, never kept and never used to train a model without your consent.',
        'Phoenix recognizes signs, not people. We do not recognize faces, identify individuals or build biometric profiles.',
        { h3: 'Microphone (speech to text)' },
        'When you press the microphone button in voice mode, a short audio clip is sent to our server and turned into text. This happens either on our own server or at a trusted cloud speech-recognition provider (Google LLC) acting on our behalf. The recording is deleted once it has been transcribed; we do not keep it.',
        'Google processes the audio under its API terms of service and its [privacy policy](' + GOOGLE_PP + ').',
        { h3: 'Text and sentence building' },
        'To turn recognized signs into a grammatical sentence and translate it into Uzbek, Russian or English, the list of words may be sent to the same provider. It contains only words, never video or audio.',
        { h3: 'Two-person conversations and video calls' },
        'Text messages you type or sign in a conversation pass through our server only to reach the other person. They are not stored, and the room closes when the conversation ends.',
        'Video and audio in a call travel directly between the two devices over WebRTC, encrypted (DTLS-SRTP). If a direct connection is not possible, the stream goes through a relay server, but it stays encrypted and is not stored. To set up the connection, STUN servers (including Google’s public STUN server) see your IP address.',
        { h3: 'Translation history' },
        'If “Save history” is on in Settings, translated text (never video or audio) is saved: on your device and, when a server is connected, on the server, linked to a random browser ID. You can delete it or turn saving off at any time.',
        { h3: 'Video contributions to the dictionary' },
        'If you want to send a video of your own sign on the dictionary page, you tick a separate consent box. Only then is the video uploaded and kept to improve recognition. You can withdraw consent and ask us to delete the video at any time.',
        { h3: 'Payments' },
        'When you unlock Pro with a voucher, the plan, date and voucher name are recorded on your account. We do not store card numbers, expiry dates or CVV codes. When card payments are connected, they will run through a licensed payment provider and card details will stay with that provider only.',
        { h3: 'Technical data' },
        'A random browser ID (not tied to your name or device), language and settings, and an attempt counter. Our servers keep short-lived technical logs for security and fixing errors: IP address, time, request type and error messages.'
      ] },
      { id: 'nega', h: 'Why we use it', body: [
        { list: [
          'to recognize signs, turn speech into subtitles and deliver messages;',
          'to create your account, confirm sign-ins and keep your Pro plan;',
          'to count free-plan limits and prevent abuse;',
          'to keep the service secure and find errors and outages;',
          'with your consent, for example through video contributions, to improve recognition;',
          'to meet our obligations under the law.'
        ] }
      ] },
      { id: 'hech', h: 'What we never do', body: [
        { list: [
          'We **never sell** or rent out your data.',
          'We show no ads and give no data to ad networks.',
          'We use no tracking or analytics cookies.',
          'We do not store camera frames, voice recordings or conversation messages.',
          'We do not use your video to train models without your consent.',
          'We do not identify you by your face or voice.'
        ] }
      ] },
      { id: 'kimga', h: 'Who we share it with', body: [
        'Data is shared only when the service needs it, and only with:',
        { list: [
          '**Cloud speech and language provider (Google LLC):** audio clips and recognized words, for transcription and sentence building.',
          '**Sign-in providers:** if you choose to sign in with Google or GitHub, sign-in data is exchanged with them ([Google](' + GOOGLE_PP + '), [GitHub](' + GITHUB_PP + ')).',
          '**Hosting and infrastructure:** the providers our servers run on. They process data only on our instructions.',
          '**Public authorities:** only as the law requires and on an official request.'
        ] },
        'If Phoenix is acquired or merges with another company, your data moves with the protections in this policy, and we will tell you in advance.'
      ] },
      { id: 'muddat', h: 'How long we keep it', body: [
        { rows: [
          ['Camera frames', 'Not stored. Cleared from memory seconds after recognition'],
          ['Voice recordings', 'Not stored. Deleted after transcription'],
          ['Conversation messages', 'Not stored. Only delivered'],
          ['Video calls', 'Never readable on our servers and never stored'],
          ['Translation history', 'Until you delete it or your account'],
          ['Account data', 'While your account exists. Deleted within 30 days of a deletion request'],
          ['Video contributions', 'Until you withdraw consent'],
          ['Technical logs', 'Up to 30 days']
        ] }
      ] },
      { id: 'xavfsizlik', h: 'Security', body: [
        'Every connection between the site, the server and the app is encrypted with HTTPS and WSS. Passwords are stored only as hashes, and video calls are encrypted end to end. Access to our servers is limited to the people who need it.',
        'No system on the internet is perfectly secure. If an incident affects your data, we will notify you and the competent authority within the time the law requires.'
      ] },
      { id: 'xotira', h: 'Browser storage and cookies', body: [
        'Phoenix uses no cookies for advertising or tracking. Your browser’s local storage (localStorage) holds only what the service needs: language, theme and settings, a random browser ID, translation history, sign-in state and the attempt counter.',
        'Clearing site data in your browser settings removes all of it.'
      ] },
      { id: 'huquq', h: 'Your rights', body: [
        'Under the Law of the Republic of Uzbekistan “On Personal Data” and the laws where you live, you have the right to:',
        { list: [
          'know what data we hold about you and get a copy;',
          'correct inaccurate data;',
          'delete your data and your account;',
          'withdraw consent at any time;',
          'object to or restrict processing;',
          'complain to the competent authority.'
        ] },
        'Delete your history yourself on the **Settings** page and your account with the “Delete account” button on the **Account** page. For anything else write to {email}; we reply within 30 days.'
      ] },
      { id: 'bolalar', h: 'Children', body: [
        'You must be at least 13 to create a Phoenix account. A child under 13 may use the service only with the consent and supervision of a parent or guardian. If you learn that a child shared data without consent, write to us and we will delete it.'
      ] },
      { id: 'joy', h: 'Where data is processed', body: [
        'Our servers and providers may be located outside Uzbekistan. When data moves to another country, it keeps the level of protection in this policy and is used only for the purposes above.'
      ] },
      { id: 'ozgarish', h: 'Changes to this policy', body: [
        'If the service changes, we may update this policy. The new version appears on this page with its date. For important changes we will let you know in advance on the site or by email and, where needed, ask for your consent again.'
      ] },
      { id: 'aloqa', h: 'Contact us', body: [
        'Questions, requests and complaints about privacy, your data or this policy: {email}'
      ] }
    ]
  }
};
