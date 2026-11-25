// Homepage demo v2: four real-life scenes in split screen, then how it works, the public resources, results (~86 s)
// Split screen: left = signing side (dark theme), right = speaking side (light theme). Content is drawn once per half
// with that half's palette, so anything crossing the divider changes colour.
(() => {
  const { W, H, PAL, SANS, clamp, lerp, prog, E, env, txt, measure, rise, rrect, logoMark, drawHand, poseAt, wave, brackets, speaker, mic, chip, typed } = PX;
  const L = W / 2;

  const DIV = [[0, W], [9.4, W], [10.2, L], [38.4, L], [39.2, W], [60.6, W], [61.6, 0], [75.6, 0], [76.6, L], [200, L]];
  function divX(t) { let i = 0; while (i < DIV.length - 1 && t > DIV[i + 1][0]) i++; const A = DIV[i], B = DIV[i + 1] || A; return lerp(A[1], B[1], E.inOutQuint(prog(t, A[0], B[0]))); }

  const KEYS = []; const seq = ['open', 'point', 'dee', 'flat', 'claw', 'vee', 'fist', 'open', 'ok', 'point', 'flat'];
  for (let i = 0; i < 90; i++) KEYS.push([i * 0.75, seq[(i * 7) % seq.length], { yaw: Math.sin(i * 1.7) * 0.4, pitch: Math.sin(i * 2.3) * 0.25, roll: Math.sin(i * 1.1) * 0.25 }]);
  const hand = (ctx, P, t, x, y, s, k, alpha = 1) => drawHand(ctx, { ...poseAt(KEYS, t), x, y, s }, k, { color: P.ink, tip: P.accent, bg: P.bg, alpha, lw: s * 0.032 });
  const cap = (ctx, P, s, x, y, t, t0, t1, o = {}) => { const a = env(t, t0, t1, 0.4, 0.3); if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; txt(ctx, s, x, y + (1 - E.outCubic(prog(t, t0, t0 + 0.4))) * 14, { size: o.size || 34, weight: o.weight || 500, fam: SANS, color: o.color ? P[o.color] : P.muted, align: o.align || 'left' }); ctx.restore(); };
  const tag = (ctx, P, s, x, y, a, align = 'center') => { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; txt(ctx, s.toUpperCase(), x, y, { size: 24, weight: 600, fam: SANS, color: P.muted, ls: 3, align }); ctx.restore(); };
  const box = (ctx, P, x, y, w, h, stroke, fill) => { rrect(ctx, x, y, w, h, 14); ctx.fillStyle = fill || P.raised; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = stroke || P.border; ctx.stroke(); };

  // ---------------- scenes (real class names from the models' label lists)
  const SCENES = [
    { place: 'Shifoxona', lang: 'RSL', words: ['Я', 'ГОЛОВА', 'БОЛИТ'], say: ['Boshim', 'ogʻriyapti.'], reply: 'Shifokor hozir keladi.' },
    { place: 'Doʻkon', lang: 'ASL', words: ['WATER', 'WANT'], say: ['Menga suv', 'kerak.'], reply: 'Mana, marhamat.' },
    { place: 'Koʻcha', lang: 'ASL', words: ['SCHOOL', 'WHERE'], say: ['Maktab', 'qayerda?'], reply: 'Toʻgʻriga yuring, keyin chapga.' },
    { place: 'Idora', lang: 'RSL', words: ['ТЫ', 'ПОМОЧЬ', 'Я'], say: ['Menga yordam', 'bera olasizmi?'], reply: 'Albatta, nima kerak?' },
  ];
  const S0 = 10.2, SD = 7.05;

  function scene(ctx, P, t, i) {
    const c = SCENES[i], ta = S0 + i * SD, lt = t - ta;
    if (lt < -0.2 || lt > SD + 0.1) return;
    const o = E.inCubic(prog(lt, SD - 0.45, SD));   // exit
    ctx.save(); ctx.globalAlpha *= 1 - o; ctx.translate(0, -o * 60);
    // place name straddles the divider
    rise(ctx, c.place, L, 120, lt, 0.0, { size: 72, weight: 800, align: 'center', color: P.ink });
    txt(ctx, '0' + (i + 1) + ' / 04', 120, 110, { size: 26, weight: 700, fam: SANS, color: P.accent, alpha: E.outCubic(prog(lt, 0.1, 0.5)) });
    tag(ctx, P, 'Imo-ishora · ' + c.lang, L / 2, 196, E.outCubic(prog(lt, 0.2, 0.6)));
    tag(ctx, P, 'Nutq · oʻzbekcha', L + L / 2, 196, E.outCubic(prog(lt, 0.3, 0.7)));
    // camera frame + hand
    const fx = 150, fy = 230, fw = 660, fh = 400, kin = prog(lt, 0.1, 0.7);
    ctx.save(); ctx.globalAlpha *= E.outCubic(kin); rrect(ctx, fx, fy, fw, fh, 16); ctx.fillStyle = P.sunken; ctx.fill(); ctx.restore();
    brackets(ctx, fx + 18, fy + 18, fw - 36, fh - 36, 40, kin, P.accent, 4);
    ctx.save(); ctx.beginPath(); rrect(ctx, fx, fy, fw, fh, 16); ctx.clip();
    hand(ctx, P, t, fx + fw / 2, fy + fh - 24, 165, E.outCubic(prog(lt, 0.2, 1.0)));
    ctx.restore();
    // live dot
    ctx.save(); ctx.fillStyle = P.danger; ctx.globalAlpha *= (Math.floor(t * 2) % 2 ? 1 : 0.35) * E.outCubic(kin); ctx.beginPath(); ctx.arc(fx + fw - 40, fy + 44, 8, 0, 7); ctx.fill(); ctx.restore();
    // chips pop then fly to the divider
    const n = c.words.length, fly = E.inOutCubic(prog(lt, 3.0, 3.7));
    c.words.forEach((w, j) => {
      const k = prog(lt, 1.0 + j * 0.55, 1.45 + j * 0.55);
      const x0 = L / 2 + (j - (n - 1) / 2) * 250, y0 = 730;
      chip(ctx, lerp(x0, L, fly), lerp(y0, 440, fly), w, 0.68 + ((j * 37) % 25) / 100, null, k * (1 - prog(lt, 3.45, 3.75)), P, { minW: 230, size: 38, h: 104 });
    });
    // sentence-building pill on the divider
    const kg = env(lt, 3.4, 4.45, 0.25, 0.3);
    if (kg > 0) {
      ctx.save(); ctx.globalAlpha *= kg; ctx.translate(L, 440); const sc = lerp(0.7, 1, E.outBack(kg)); ctx.scale(sc, sc);
      rrect(ctx, -140, -44, 280, 88, 44); ctx.fillStyle = P.raised; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = P.accent; ctx.stroke();
      txt(ctx, 'Phoenix', 0, 14, { size: 40, weight: 700, color: P.accent, align: 'center' });
      ctx.restore();
    }
    // spoken sentence on the right
    rise(ctx, c.say[0], L + 150, 380, lt, 4.25, { size: 88, weight: 800, color: P.ink });
    rise(ctx, c.say[1], L + 150, 480, lt, 4.37, { size: 88, weight: 800, color: P.ink });
    const ks = E.outCubic(prog(lt, 4.2, 4.6)) * (1 - prog(lt, 5.6, 6.0));
    speaker(ctx, L + 170, 610, 1.05, P.ink, t, ks);
    wave(ctx, L + 470, 610, 420 * ks, 110, t, ks, { color: P.accent, n: 28 });
    // reply: mic on the right, subtitle on the left
    const kr = E.outCubic(prog(lt, 5.2, 5.6));
    mic(ctx, L + 170, 800, 1.1 * kr, P.ink);
    wave(ctx, L + 470, 800, 420 * kr, 90, t + 3, kr * (1 - prog(lt, 6.4, 6.8)), { color: P.ink, n: 28 });
    if (kr > 0) {
      ctx.save(); ctx.globalAlpha *= kr; box(ctx, P, 110, 870, 740, 110); ctx.restore();
      txt(ctx, 'SUBTITR', 140, 860, { size: 20, weight: 600, fam: SANS, color: P.accent, ls: 3, alpha: kr });
      typed(ctx, c.reply, 140, 940, lt, 5.5, 26, { size: c.reply.length > 24 ? 38 : 46, weight: 700, color: P.ink, caret: P.accent });
    }
    ctx.restore();
  }

  function content(ctx, t, P) {
    // ---------- 0 – 9.4 intro (dark)
    if (t < 7.2) {
      const out = E.inCubic(prog(t, 6.4, 7.0));
      hand(ctx, P, t, lerp(1480, 1600, out), 900, 360, E.outCubic(prog(t, 0.1, 1.4)), 1 - out);
      rise(ctx, 'U sizga', 140, 420, t, 0.4, { size: 120, color: P.ink, weight: 800, out: 3.1 });
      rise(ctx, 'nimadir demoqchi.', 140, 560, t, 0.55, { size: 120, color: P.ink, weight: 800, out: 3.15 });
      rise(ctx, 'Siz esa', 140, 420, t, 3.6, { size: 120, color: P.muted, weight: 800, out: 6.2 });
      rise(ctx, 'imo-ishora tilini', 140, 560, t, 3.75, { size: 120, color: P.ink, weight: 800, out: 6.25 });
      rise(ctx, 'bilmaysiz.', 140, 700, t, 3.9, { size: 120, color: P.ink, weight: 800, out: 6.3 });
    }
    if (t > 6.8 && t < 10.4) {
      const kin = E.inOutQuint(prog(t, 6.8, 7.35)), kout = E.inOutQuint(prog(t, 9.4, 10.2));
      const x0 = W * kout, x1 = W * kin;
      ctx.fillStyle = P.accent; ctx.fillRect(x0, 0, Math.max(0, x1 - x0), H);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, Math.max(0, x1 - x0), H); ctx.clip();
      logoMark(ctx, 300, 500, 170, prog(t, 7.0, 7.9), P.onAccent);
      rise(ctx, 'Phoenix tushunadi.', 460, 560, t, 7.2, { size: 150, weight: 800, color: P.onAccent, stagger: 0.09 });
      rise(ctx, 'Imo-ishora matn va ovozga, nutq subtitrga aylanadi', 466, 660, t, 7.7, { size: 46, weight: 600, color: P.onAccent, stagger: 0.04 });
      ctx.restore();
    }

    // ---------- 10.2 – 38.4 four scenes
    for (let i = 0; i < 4; i++) scene(ctx, P, t, i);

    // ---------- 39 – 49 how it works (dark)
    if (t > 38.6 && t < 49.6) {
      const o = E.inCubic(prog(t, 48.9, 49.5)); ctx.save(); ctx.globalAlpha = 1 - o;
      tag(ctx, P, 'Qanday ishlaydi', 120, 110, E.outCubic(prog(t, 39.0, 39.5)), 'left');
      rise(ctx, 'Kameradan ovozgacha', 120, 220, t, 39.1, { size: 84, weight: 800, color: P.ink });
      const nodes = [['Kamera', 'brauzerda, 15 kadr/s'], ['WebSocket', '384×288 JPEG'], ['Video-transformer', '32 kadr ≈ 2 soniya'], ['Soʻz', 'ishonch + 3 muqobil'], ['Gap tuzish', 'gap va tarjima'], ['Matn + ovoz', 'brauzer ovozi']];
      const y = 520, gap = 300, x0 = 210;
      nodes.forEach((nd, i) => {
        const x = x0 + i * gap, t0 = 39.8 + i * 0.4, k = E.outBack(prog(t, t0, t0 + 0.5));
        if (i > 0) { const kl = E.inOutCubic(prog(t, t0 - 0.3, t0 + 0.05)); ctx.strokeStyle = P.border; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - gap + 128, y); ctx.lineTo(x - gap + 128 + (gap - 256) * kl, y); ctx.stroke(); }
        if (k <= 0) return;
        ctx.save(); ctx.translate(x, y + (1 - k) * 40); ctx.scale(k, k);
        box(ctx, P, -128, -84, 256, 168, i === 2 || i === 4 ? P.accent : P.border);
        txt(ctx, '0' + (i + 1), -104, -46, { size: 22, weight: 700, fam: SANS, color: P.accent });
        txt(ctx, nd[0], 0, 10, { size: nd[0].length > 12 ? 25 : 36, weight: 700, color: P.ink, align: 'center' });
        txt(ctx, nd[1], 0, 52, { size: 22, weight: 500, fam: SANS, color: P.muted, align: 'center' });
        ctx.restore();
      });
      for (let p = 0; p < 3; p++) {   // pulses travelling the pipeline
        const st = 42.4 + p * 0.9; if (t < st) continue;
        const u = ((t - st) / 2.4) % 1, px = lerp(x0, x0 + 5 * gap, E.inOutCubic(u));
        ctx.fillStyle = P.accent; ctx.beginPath(); ctx.arc(px, y - 120, 9, 0, 7); ctx.fill();
      }
      // reply path
      const kr = E.outCubic(prog(t, 43.6, 44.2));
      if (kr > 0) {
        ctx.save(); ctx.globalAlpha *= kr;
        ctx.strokeStyle = P.border; ctx.lineWidth = 3; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -t * 40;
        ctx.beginPath(); ctx.moveTo(x0 + 5 * gap, y + 90); ctx.lineTo(x0 + 5 * gap, 780); ctx.lineTo(x0, 780); ctx.lineTo(x0, y + 90); ctx.stroke(); ctx.setLineDash([]);
        box(ctx, P, W / 2 - 330, 730, 660, 100, P.accent);
        txt(ctx, 'Mikrofon → nutqni tanish → subtitr', W / 2, 792, { size: 32, weight: 700, color: P.ink, align: 'center' });
        ctx.restore();
      }
      cap(ctx, P, 'Ishonch 50% dan past boʻlsa, soʻz tashlanadi. Gap tuzib boʻlmasa, soʻzlar oʻzicha koʻrsatiladi.', W / 2, 920, t, 44.4, 49.4, { align: 'center', size: 32 });
      cap(ctx, P, 'Nutq 4 soniyalik boʻlaklarda yuboriladi, jim boʻlaklar yuborilmaydi', W / 2, 970, t, 45.0, 49.4, { align: 'center', size: 32, color: 'accent' });
      ctx.restore();
    }

    // ---------- 49.6 – 60.6 resources wall (dark)
    if (t > 49.4 && t < 61.0) {
      const o = E.inCubic(prog(t, 60.0, 60.6)); ctx.save(); ctx.globalAlpha = 1 - o;
      tag(ctx, P, 'Ochiq resurslar va texnologiyalar', 120, 110, E.outCubic(prog(t, 49.7, 50.2)), 'left');
      rise(ctx, 'Nimalar asosida qurilgan', 120, 220, t, 49.8, { size: 84, weight: 800, color: P.ink, stagger: 0.05 });
      const cards = [
        ['Slovo', 'RSL maʼlumotlari, 1000 soʻz', 'CC BY-SA 4.0'], ['WLASL', 'ASL maʼlumotlari, 2000 soʻz', 'notijorat, namoyish'], ['MViTv2 (mvit32-2)', 'RSL video-transformer', 'Slovo modeli'], ['SignFlow-A', 'ASL modeli, WLASL-2000', ''],
        ['ONNX Runtime', 'modellarni ishga tushirish', 'CPU yoki GPU'], ['FastAPI + WebSocket', 'server va kadrlar oqimi', 'Python'], ['HTML · CSS · JS', 'sayt, build bosqichisiz', 'ES modullar'], ['faster-whisper', 'nutqni tanish', 'internetsiz ishlaydi'],
        ['speechSynthesis', 'brauzerning oʻz ovozi', 'serverga yuk yoʻq'], ['Google Colab T4', 'bepul GPU, bitta havola', 'Cloudflare tunnel'], ['Docker', 'server va baza bitta buyruqda', 'SQLite / PostgreSQL'], ['pytest', '108 ta avtomatik test', 'modelsiz ham ishlaydi'],
      ];
      const cw = 400, ch = 150, gx = 26, gy = 26, ox = (W - (cw * 4 + gx * 3)) / 2, oy = 300;
      cards.forEach((c, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const t0 = 50.4 + (row * 4 + col) * 0.16;
        const k = E.outBack(prog(t, t0, t0 + 0.55));
        if (k <= 0) return;
        const x = ox + col * (cw + gx), y = oy + row * (ch + gy);
        ctx.save(); ctx.translate(x + cw / 2, y + ch / 2 + (1 - k) * 80); ctx.rotate((1 - k) * (col % 2 ? 0.08 : -0.08)); ctx.scale(lerp(0.8, 1, k), lerp(0.8, 1, k));
        ctx.globalAlpha *= clamp(k * 2);
        // a brief accent highlight sweeps across the wall
        const hl = env(t, 56.2 + (col + row) * 0.18, 57.0 + (col + row) * 0.18, 0.2, 0.4);
        box(ctx, P, -cw / 2, -ch / 2, cw, ch, hl > 0.05 ? P.accent : P.border);
        txt(ctx, c[0], -cw / 2 + 26, -ch / 2 + 52, { size: c[0].length > 16 ? 28 : 34, weight: 700, color: P.ink });
        txt(ctx, c[1], -cw / 2 + 26, -ch / 2 + 94, { size: 24, weight: 500, fam: SANS, color: P.muted });
        if (c[2]) txt(ctx, c[2], -cw / 2 + 26, -ch / 2 + 128, { size: 21, weight: 600, fam: SANS, color: P.accent });
        ctx.restore();
      });
      cap(ctx, P, 'Shriftlar: Golos Text va Geologica (SIL OFL). Dizayn tizimi: oʻz ranglar va komponentlar.', W / 2, 880, t, 53.2, 60.4, { align: 'center', size: 30 });
      ctx.restore();
    }

    // ---------- 61.6 – 75.6 languages + results (light)
    if (t > 61.0 && t < 68.8) {
      const o = E.inCubic(prog(t, 68.1, 68.7)); ctx.save(); ctx.globalAlpha = 1 - o;
      tag(ctx, P, 'Tillar', 120, 110, E.outCubic(prog(t, 61.6, 62.0)), 'left');
      rise(ctx, 'Taniydi', 120, 230, t, 61.8, { size: 72, weight: 800, color: P.ink });
      [[1000, 'rus imo-ishora soʻzi', 'RSL'], [2000, 'amerika imo-ishora soʻzi', 'ASL']].forEach((c, i) => {
        const x = 120 + i * 560, t0 = 62.2 + i * 0.35, k = E.outExpo(prog(t, t0, t0 + 1.8));
        ctx.save(); ctx.globalAlpha *= E.outCubic(prog(t, t0, t0 + 0.4));
        txt(ctx, String(Math.round(c[0] * k)), x, 440, { size: 170, weight: 800, color: P.ink });
        ctx.restore();
        cap(ctx, P, c[1], x, 510, t, t0 + 0.3, 68.6, { size: 38, weight: 700, color: 'ink' });
        cap(ctx, P, c[2], x, 556, t, t0 + 0.5, 68.6, { color: 'accent' });
      });
      rise(ctx, 'Natija tili', 1300, 230, t, 62.4, { size: 72, weight: 800, color: P.ink });
      const langs = [['Oʻzbek', 'Boshim ogʻriyapti.'], ['Русский', 'У меня болит голова.'], ['English', 'I have a headache.']];
      langs.forEach((l, i) => {
        const y = 360 + i * 110, t0 = 62.8 + i * 0.3, k = E.outCubic(prog(t, t0, t0 + 0.5));
        const active = Math.floor((t - 63.6) / 1.1) % 3 === i && t > 63.6;
        ctx.save(); ctx.globalAlpha *= k; ctx.translate((1 - k) * 60, 0);
        rrect(ctx, 1300, y - 40, 170, 60, 30);
        if (active) { ctx.fillStyle = P.accent; ctx.fill(); } else { ctx.lineWidth = 2; ctx.strokeStyle = P.border; ctx.stroke(); }
        txt(ctx, l[0], 1385, y + 0, { size: 24, weight: 600, fam: SANS, color: active ? P.onAccent : P.muted, align: 'center' });
        txt(ctx, l[1], 1500, y + 2, { size: 32, weight: 700, color: active ? P.ink : P.muted });
        ctx.restore();
      });
      cap(ctx, P, 'Oʻzbek imo-ishora tili uchun ochiq maʼlumotlar toʻplami yoʻq, shuning uchun oʻzbek tili hozircha natija tili.', 120, 760, t, 64.0, 68.6, { size: 32 });
      cap(ctx, P, 'Saytda rozilik bilan imo-ishora videosini yuborib, shunday toʻplam yigʻishga yordam berish mumkin.', 120, 810, t, 64.6, 68.6, { size: 32, color: 'accent' });
      ctx.restore();
    }
    if (t > 68.6 && t < 76.4) {
      const o = E.inCubic(prog(t, 75.4, 76.0)); ctx.save(); ctx.globalAlpha = 1 - o;
      tag(ctx, P, 'Sinov natijalari', 120, 110, E.outCubic(prog(t, 68.8, 69.2)), 'left');
      rise(ctx, 'Birinchi taxmin qanchalik toʻgʻri', 120, 230, t, 68.9, { size: 72, weight: 800, color: P.ink, stagger: 0.04 });
      const rows = [['ASL', 'top-1', 74, '34 ta videodan 25 tasi'], ['ASL', 'top-5', 100, 'toʻgʻri javob dastlabki 5 taxmin ichida'], ['RSL', 'top-1', 65, ''], ['RSL', 'top-4', 88, 'toʻgʻri javob dastlabki 4 taxmin ichida']];
      rows.forEach((r, i) => {
        const y = 370 + i * 125, t0 = 69.4 + i * 0.35, k = E.outQuart(prog(t, t0, t0 + 1.2));
        ctx.save(); ctx.globalAlpha *= E.outCubic(prog(t, t0, t0 + 0.3));
        txt(ctx, r[0], 120, y + 16, { size: 40, weight: 700, color: P.ink });
        txt(ctx, r[1], 240, y + 16, { size: 30, weight: 500, fam: SANS, color: P.muted });
        rrect(ctx, 400, y - 18, 1100, 40, 8); ctx.fillStyle = P.sunken; ctx.fill();
        rrect(ctx, 400, y - 18, Math.max(16, 1100 * r[2] / 100 * k), 40, 8); ctx.fillStyle = r[1] === 'top-1' ? P.accent : P.ok; ctx.fill();
        txt(ctx, Math.round(r[2] * k) + '%', 1540, y + 16, { size: 44, weight: 800, color: P.ink });
        if (r[3]) txt(ctx, r[3], 400, y + 60, { size: 22, weight: 400, fam: SANS, color: P.muted });
        ctx.restore();
      });
      cap(ctx, P, 'Kichik sinov toʻplamida oʻlchangan, natijalar taxminiy. Model alohida soʻzlarni taniydi.', 120, 960, t, 71.0, 75.8, { size: 30, color: 'warn' });
      ctx.restore();
    }

    // ---------- 76.6 – 82 access (split)
    if (t > 76.2 && t < 82.6) {
      const o = E.inCubic(prog(t, 81.8, 82.4)); ctx.save(); ctx.globalAlpha = 1 - o;
      [['Login yoʻq', 'tarix brauzerga bogʻlanadi'], ['Brauzerda ishlaydi', 'oʻrnatish shart emas'], ['Bepul GPU', 'Google Colab T4'], ['Ikki tomonlama', 'imo-ishora ↔ nutq']].forEach((it, i) => {
        const x = (i % 2 === 0 ? 0 : L) + 120, y = 400 + Math.floor(i / 2) * 300, t0 = 76.8 + i * 0.25;
        rise(ctx, it[0], x, y, t, t0, { size: 80, weight: 800, color: P.ink });
        cap(ctx, P, it[1], x, y + 66, t, t0 + 0.3, 82.4, { color: 'accent', size: 38 });
      });
      ctx.restore();
    }
    // ---------- 82.4 – 87 end card straddling the divider
    if (t > 82.4) {
      logoMark(ctx, L, 400, 200, prog(t, 82.5, 83.6), P.accent);
      rise(ctx, 'Phoenix', L, 660, t, 83.0, { size: 160, weight: 800, align: 'center', color: P.ink });
      rise(ctx, 'Imo-ishoradan matn va ovozga', L, 760, t, 83.4, { size: 48, weight: 500, align: 'center', color: P.muted, stagger: 0.05 });
    }
  }

  function draw(ctx, t) {
    const d = divX(t);
    [[PAL.dark, 0, d], [PAL.light, d, W]].forEach(([P, x0, x1]) => {
      if (x1 - x0 < 0.5) return;
      ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, H); ctx.clip();
      ctx.fillStyle = P.bg; ctx.fillRect(x0, 0, x1 - x0, H);
      ctx.fillStyle = P.border; ctx.globalAlpha = 0.13; const off = (t * 12) % 48;
      for (let y = 0; y < H + 48; y += 48) for (let x = Math.floor(x0 / 48) * 48 - 48; x < x1 + 48; x += 48) ctx.fillRect(x + off, y, 2, 2);
      ctx.globalAlpha = 1;
      content(ctx, t, P);
      ctx.restore();
    });
    const f = prog(t, 86.3, 87); if (f > 0) { ctx.fillStyle = '#0f1513'; ctx.globalAlpha = f; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }
  window.SCENE = { duration: 87, draw };
})();
