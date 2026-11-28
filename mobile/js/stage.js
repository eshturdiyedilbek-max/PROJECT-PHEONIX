// Sign-in screen: a miniature of the talk screen. A signed sentence appears on the near side,
// the spoken reply appears upside down on the far side, word by word, in the app language.
import { getLang } from './i18n.js';

const SCRIPT = {
  uz: [['Salom, men shifokorman.', 'Xush kelibsiz! Qanday yordam beray?'], ['Kasalxona qayerda?', "Shu ko'chaning oxirida."], ['Menga suv kerak.', 'Hozir olib kelaman.']],
  ru: [['Привет, я врач.', 'Добро пожаловать! Чем помочь?'], ['Где больница?', 'В конце этой улицы.'], ['Мне нужна вода.', 'Сейчас принесу.']],
  en: [['Hello, I am a doctor.', 'Welcome! How can I help?'], ['Where is the hospital?', 'At the end of this street.'], ['I need water.', "I'll bring it right away."]]
};
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const words = text => text.split(' ').map((w, i) => `<span class="w" style="--i:${i}">${w.replace(/[&<>]/g, '')}</span>`).join(' ');

export function startStage(isVisible) {
  const near = document.getElementById('stage-near'), far = document.getElementById('stage-far');
  if (!near || !far) return;
  let n = 0, timer = 0;
  const say = (el, text) => {
    const old = el.querySelectorAll('.w');
    if (!old.length || RM) { el.innerHTML = words(text); return; }
    old.forEach(w => w.classList.add('out'));
    setTimeout(() => { el.innerHTML = words(text); }, 360);
  };
  function step() {
    if (!isVisible()) { timer = setTimeout(step, 1000); return; }
    const lines = SCRIPT[getLang()] || SCRIPT.uz, [signed, reply] = lines[n % lines.length];
    say(near, signed);
    timer = setTimeout(() => { say(far, reply); timer = setTimeout(() => { n++; step(); }, 2600); }, 1700);
  }
  step();
  return () => clearTimeout(timer);
}
