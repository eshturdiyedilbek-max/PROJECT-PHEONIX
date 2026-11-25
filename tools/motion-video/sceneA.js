// Variant A, "Tez": dark, kinetic typography, fast beats (~35 s)
(() => {
  const { W, H, PAL, SANS, clamp, lerp, prog, E, env, txt, measure, rise, rrect, logoMark, drawHand, poseAt, wave, brackets, speaker, mic, chip, typed } = PX;
  const P = PAL.dark;

  // one continuous signing performance for the whole film
  const KEYS = [
    [0, 'open', { roll: -0.15 }], [0.6, 'open', { roll: 0.2 }], [1.2, 'open', { roll: -0.15 }], [1.8, 'open', { roll: 0.2 }], [2.4, 'open', { roll: -0.1 }],
    [3.2, 'point', { yaw: 0.3, roll: 0.1 }], [4.0, 'point', { yaw: -0.3, roll: -0.1 }], [4.8, 'dee', { pitch: 0.3 }], [5.6, 'claw', { yaw: 0.4 }], [6.6, 'flat', {}],
    // recognition beats at 9.6 / 11.8 / 14.0
    [9.0, 'open', { roll: -0.2, dx: -0.05 }], [9.4, 'open', { roll: 0.2 }], [9.8, 'open', { roll: -0.2 }], [10.4, 'flat', {}],
    [11.2, 'point', { yaw: 0.35, roll: 0.15 }], [11.6, 'point', { yaw: -0.35, roll: -0.15 }], [12.0, 'point', { yaw: 0.35, roll: 0.15 }], [12.6, 'flat', {}],
    [13.4, 'dee', { pitch: 0.4, roll: 0.3 }], [13.8, 'dee', { pitch: 0.1, roll: 0.4, dy: 0.08 }], [14.2, 'dee', { pitch: 0.4, roll: 0.3 }], [15.0, 'open', {}],
    [40, 'open', {}],
  ];

  function bg(ctx, t) {
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    // faint dot grid drifting slowly
    ctx.fillStyle = P.border; ctx.globalAlpha = 0.16;
    const off = (t * 12) % 48;
    for (let y = -48; y < H + 48; y += 48) for (let x = -48; x < W + 48; x += 48) { ctx.fillRect(x + off, y, 2, 2); }
    ctx.globalAlpha = 1;
  }

  function hand(ctx, t, x, y, s, k, alpha = 1) {
    const m = poseAt(KEYS, t);
    const pose = { ...m, x: x + (m.dx || 0) * s, y: y + (m.dy || 0) * s, s };
    return drawHand(ctx, pose, k, { color: P.ink, joint: P.ink, tip: P.accent, bg: P.bg, alpha, lw: s * 0.03 });
  }

  function draw(ctx, t) {
    bg(ctx, t);

    // ---- S1 + S2: the problem (0 – 6.8)
    if (t < 7.2) {
      const k = E.outCubic(prog(t, 0.1, 1.6));
      const out = E.inCubic(prog(t, 6.4, 7.0));
      hand(ctx, t, lerp(1480, 1600, out), 900, 380, k, 1 - out);
      rise(ctx, 'U sizga', 160, 430, t, 0.5, { size: 120, color: P.ink, out: 3.2 });
      rise(ctx, 'nimadir demoqchi.', 160, 570, t, 0.7, { size: 120, color: P.ink, out: 3.25 });
      rise(ctx, 'Siz esa', 160, 430, t, 3.7, { size: 120, color: P.muted, out: 6.2 });
      rise(ctx, 'imo-ishora tilini', 160, 570, t, 3.85, { size: 120, color: P.ink, out: 6.25 });
      rise(ctx, 'bilmaysiz.', 160, 710, t, 4.0, { size: 120, color: P.ink, out: 6.3 });
    }

    // ---- S3: accent wipe "Phoenix tushunadi." (6.8 – 9.0)
    if (t > 6.8 && t < 9.2) {
      const kin = E.inOutQuint(prog(t, 6.8, 7.35));
      const kout = E.inOutQuint(prog(t, 8.55, 9.1));
      const x0 = W * kout, x1 = W * kin;
      ctx.fillStyle = P.accent; ctx.fillRect(x0, 0, x1 - x0, H);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, H); ctx.clip();
      logoMark(ctx, 300, 545, 170, prog(t, 7.0, 7.9), P.onAccent, 12);
      rise(ctx, 'Phoenix tushunadi.', 460, 600, t, 7.2, { size: 150, weight: 800, color: P.onAccent, stagger: 0.09 });
      ctx.restore();
    }

    // ---- S4: recognition (9.0 – 16.6)
    if (t > 8.9 && t < 17.0) {
      const kin = prog(t, 8.9, 9.6), kout = E.inCubic(prog(t, 16.0, 16.8));
      const fx = 180, fy = 170, fw = 820, fh = 740;
      // frame
      ctx.save(); ctx.globalAlpha = 1 - kout;
      rrect(ctx, fx, fy, fw, fh, 16); ctx.fillStyle = P.sunken; ctx.globalAlpha *= E.outCubic(kin); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.globalAlpha = 1 - kout;
      brackets(ctx, fx + 24, fy + 24, fw - 48, fh - 48, 60, kin, P.accent, 5);
      txt(ctx, 'KAMERA', fx + 48, fy + 80, { size: 22, weight: 600, fam: SANS, color: P.muted, ls: 3, alpha: E.outCubic(kin) });
      // live dot
      ctx.fillStyle = P.danger; ctx.globalAlpha *= (Math.floor(t * 2) % 2 ? 1 : 0.35) * E.outCubic(kin);
      ctx.beginPath(); ctx.arc(fx + fw - 60, fy + 72, 8, 0, 7); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.beginPath(); rrect(ctx, fx, fy, fw, fh, 16); ctx.clip();
      hand(ctx, t, fx + fw / 2, fy + fh - 70, 255, E.outCubic(prog(t, 9.0, 9.8)), 1 - kout);
      ctx.restore();

      // chips stack on the right
      const words = [['HELLO', 0.93, 'yoki: HI'], ['WHERE', 0.86, 'yoki: WHAT'], ['DOCTOR', 0.8, 'yoki: NURSE']];
      const beats = [10.2, 12.4, 14.6];
      words.forEach((w, i) => {
        const k = prog(t, beats[i], beats[i] + 0.55);
        const ko = E.inCubic(prog(t, 16.0 + i * 0.06, 16.6 + i * 0.06));
        chip(ctx, 1420 + ko * 300, 330 + i * 190, w[0], w[1], w[2], k * (1 - ko), P, { minW: 520, size: 52 });
      });
      ctx.save(); ctx.globalAlpha = 1 - kout;
      rise(ctx, 'Har bir imo-ishora soʻzga aylanadi', 1160, 150, t, 9.6, { size: 40, weight: 600, color: P.muted, stagger: 0.04 });
      ctx.restore();
    }

    // ---- S5: words -> sentence (16.6 – 20.6)
    if (t > 16.4 && t < 23.6) {
      const up = E.inOutCubic(prog(t, 20.3, 21.0));
      const y = lerp(560, 420, up);
      const outAll = E.inCubic(prog(t, 23.0, 23.5));
      ctx.save(); ctx.globalAlpha = 1 - outAll;
      // the three words fly in and compress
      const kc = E.inOutCubic(prog(t, 16.6, 17.6));
      const fade = 1 - prog(t, 17.4, 17.8);
      if (fade > 0) {
        const ws = ['HELLO', 'WHERE', 'DOCTOR'];
        ws.forEach((w, i) => {
          const x = lerp(W / 2 + (i - 1) * 420, W / 2 + (i - 1) * 60, kc);
          txt(ctx, w, x, 570, { size: 72, weight: 700, color: P.muted, align: 'center', alpha: fade * prog(t, 16.4, 16.7) });
        });
      }
      rise(ctx, 'Salom, shifokor qayerda?', W / 2, y, t, 17.6, { size: 128, weight: 800, align: 'center', color: P.ink, stagger: 0.08 });
      ctx.save(); ctx.globalAlpha *= env(t, 18.2, 20.4, 0.4, 0.3);
      txt(ctx, 'Gemini soʻzlardan toʻliq gap tuzadi', W / 2, y + 110, { size: 36, weight: 500, fam: SANS, color: P.accent, align: 'center' });
      ctx.restore();
      // S6: speech out
      const ks = E.outCubic(prog(t, 20.6, 21.2));
      if (ks > 0) {
        wave(ctx, W / 2 + 60, 640, 760 * ks, 150, t, ks, { color: P.accent, n: 44 });
        speaker(ctx, W / 2 - 400, 640, 1.3, P.ink, t, ks);
        ctx.save(); ctx.globalAlpha *= ks;
        txt(ctx, 'va ovoz chiqarib aytadi', W / 2, 820, { size: 40, weight: 500, fam: SANS, color: P.muted, align: 'center' });
        ctx.restore();
      }
      ctx.restore();
    }

    // ---- S7: reply as subtitles (23.5 – 27.8)
    if (t > 23.4 && t < 28.2) {
      const kin = E.outCubic(prog(t, 23.5, 24.1)), kout = E.inCubic(prog(t, 27.4, 28.0));
      ctx.save(); ctx.globalAlpha = 1 - kout;
      txt(ctx, 'JAVOB', 180, 300, { size: 24, weight: 600, fam: SANS, color: P.muted, ls: 3, alpha: kin });
      mic(ctx, 240, 470, 1.6 * kin, P.ink);
      wave(ctx, 760, 470, 720, 170, t, kin * (1 - prog(t, 26.0, 26.6)), { color: P.ink, n: 40 });
      // subtitle line
      const sy = 760;
      ctx.save(); ctx.globalAlpha *= kin;
      rrect(ctx, 160, sy - 92, 1600, 140, 16); ctx.fillStyle = P.raised; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.border; ctx.stroke();
      ctx.restore();
      typed(ctx, 'Ikkinchi qavatda, chap tomonda.', 210, sy, t, 24.3, 18, { size: 64, weight: 600, color: P.ink, caret: P.accent });
      ctx.save(); ctx.globalAlpha *= env(t, 24.8, 27.6, 0.4, 0.3);
      txt(ctx, 'Eshituvchining nutqi subtitrga aylanadi', 160, 920, { size: 36, weight: 500, fam: SANS, color: P.accent });
      ctx.restore();
      ctx.restore();
    }

    // ---- S8: three facts (27.8 – 31.4)
    if (t > 27.7 && t < 31.6) {
      const f = [['Imo-ishora tili', 'rus (RSL) va amerika (ASL)'], ['Matn va ovoz', 'oʻzbek, rus, ingliz tilida'], ['Roʻyxatdan oʻtish', 'shart emas, brauzer kifoya']];
      f.forEach((r, i) => {
        const t0 = 27.9 + i * 0.45;
        rise(ctx, r[0], 160, 330 + i * 230, t, t0, { size: 96, weight: 800, color: P.ink, out: 30.9 });
        rise(ctx, r[1], 164, 395 + i * 230, t, t0 + 0.15, { size: 44, weight: 500, color: P.accent, out: 30.95, stagger: 0.03 });
        // index number
        txt(ctx, '0' + (i + 1), 1760, 330 + i * 230, { size: 40, weight: 600, fam: SANS, color: P.muted, align: 'right', alpha: env(t, t0, 31.3, 0.4, 0.4) });
      });
      // separators
      ctx.save(); ctx.strokeStyle = P.border; ctx.lineWidth = 2;
      for (let i = 0; i < 2; i++) {
        const k = E.outCubic(prog(t, 28.1 + i * 0.45, 28.9 + i * 0.45)) * (1 - E.inCubic(prog(t, 30.9, 31.4)));
        ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(160, 450 + i * 230); ctx.lineTo(160 + 1600 * k, 450 + i * 230); ctx.stroke();
      }
      ctx.restore();
    }

    // ---- S9: logo end card (31.4 – 35)
    if (t > 31.3) {
      const k = prog(t, 31.4, 32.6);
      logoMark(ctx, W / 2, 400, 200, k, P.accent, 12);
      rise(ctx, 'Phoenix', W / 2, 660, t, 32.0, { size: 150, weight: 800, align: 'center', color: P.ink });
      rise(ctx, 'Imo-ishoradan matn va ovozga', W / 2, 760, t, 32.4, { size: 48, weight: 500, align: 'center', color: P.muted, stagger: 0.05 });
      const fadeOut = prog(t, 34.4, 35);
      if (fadeOut > 0) { ctx.fillStyle = P.bg; ctx.globalAlpha = fadeOut; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    }
  }

  window.SCENE = { duration: 35, draw };
})();
