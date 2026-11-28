// The ten sign languages with the most signers (Ethnologue estimates, as listed on Wikipedia's
// "List of sign languages by number of native signers", read 2026-11-28; the figures are rough).
// All ten can be picked in a conversation, in the dictionary and in Settings.
// `ready`: the server has a recognition model and a word list for it today. For the rest the video call
// and typed messages work, and the camera-to-text part and the dictionary say "coming soon".
// name/region: [uz, ru, en]
export const SIGN_LANGS = [
  { code: 'ipsl', abbr: 'IPSL', signers: 6300000, ready: false,
    name: ["Hind-pokiston imo-ishora tili", 'Индо-пакистанский жестовый язык', 'Indo-Pakistani Sign Language'],
    region: ['Hindiston, Pokiston, Bangladesh', 'Индия, Пакистан, Бангладеш', 'India, Pakistan, Bangladesh'] },
  { code: 'csl', abbr: 'CSL', signers: 4000000, ready: false,
    name: ['Xitoy imo-ishora tili', 'Китайский жестовый язык', 'Chinese Sign Language'],
    region: ['Xitoy', 'Китай', 'China'] },
  { code: 'bisindo', abbr: 'BISINDO', signers: 810000, ready: false,
    name: ['Indoneziya imo-ishora tili', 'Индонезийский жестовый язык', 'Indonesian Sign Language'],
    region: ['Indoneziya', 'Индонезия', 'Indonesia'] },
  { code: 'rsl', abbr: 'RSL', signers: 715000, ready: true,
    name: ['Rus imo-ishora tili', 'Русский жестовый язык', 'Russian Sign Language'],
    region: ["Rossiya va qo'shni davlatlar", 'Россия и соседние страны', 'Russia and neighbouring countries'] },
  { code: 'libras', abbr: 'Libras', signers: 600000, ready: false,
    name: ['Braziliya imo-ishora tili', 'Бразильский жестовый язык', 'Brazilian Sign Language'],
    region: ['Braziliya', 'Бразилия', 'Brazil'] },
  { code: 'ethsl', abbr: 'EthSL', signers: 560000, ready: false,
    name: ['Efiopiya imo-ishora tili', 'Эфиопский жестовый язык', 'Ethiopian Sign Language'],
    region: ['Efiopiya', 'Эфиопия', 'Ethiopia'] },
  { code: 'lse', abbr: 'LSE', signers: 523000, ready: false,
    name: ['Ispan imo-ishora tili', 'Испанский жестовый язык', 'Spanish Sign Language'],
    region: ['Ispaniya', 'Испания', 'Spain'] },
  { code: 'esl', abbr: 'ESL', signers: 474000, ready: false,
    name: ['Misr imo-ishora tili', 'Египетский жестовый язык', 'Egyptian Sign Language'],
    region: ['Misr', 'Египет', 'Egypt'] },
  { code: 'asl', abbr: 'ASL', signers: 460000, ready: true,
    name: ['Amerika imo-ishora tili', 'Американский жестовый язык', 'American Sign Language'],
    region: ['AQSH va Kanada', 'США и Канада', 'United States and Canada'] },
  { code: 'psl', abbr: 'PSL', signers: 325000, ready: false,
    name: ['Fors imo-ishora tili', 'Персидский жестовый язык', 'Persian Sign Language'],
    region: ['Eron', 'Иран', 'Iran'] }
];

const IDX = { uz: 0, ru: 1, en: 2 };
export const langName = (l, lang) => l.name[IDX[lang] ?? 0];
export const langRegion = (l, lang) => l.region[IDX[lang] ?? 0];
export const isReady = code => !!SIGN_LANGS.find(l => l.code === code)?.ready;
export const findLang = code => SIGN_LANGS.find(l => l.code === code);
export const isKnown = code => !!findLang(code);
// Ready ones first (they are what works today), then the rest in the order above.
export const BY_READY = [...SIGN_LANGS.filter(l => l.ready), ...SIGN_LANGS.filter(l => !l.ready)];
