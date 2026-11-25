// Phoenix motion engine: deterministic canvas drawing, frame = f(t).
// Every draw call is a pure function of time so frames can be rendered in any order.
'use strict';

const W = 1920, H = 1080;

const PAL = {
  dark: { bg: '#0f1513', raised: '#18201d', sunken: '#0a0f0d', border: '#7f8c86', ink: '#eaf0ed', muted: '#b4c0ba', accent: '#5fd3a1', onAccent: '#05201a', ok: '#6cc4ee', warn: '#f2b84b', danger: '#ff8f86' },
  light: { bg: '#f3f5f4', raised: '#ffffff', sunken: '#e4e9e6', border: '#6f7c76', ink: '#121c18', muted: '#4a5752', accent: '#0e6b4d', onAccent: '#ffffff', ok: '#0b64a0', warn: '#8a5300', danger: '#b3261e' },
};
const DISPLAY = 'Geologica', SANS = '"Golos Text"', MONO = 'ui-monospace, Menlo, monospace';

// ---------- math / easing ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  lin: k => k,
  outCubic: k => 1 - Math.pow(1 - k, 3),
  outQuart: k => 1 - Math.pow(1 - k, 4),
  outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  inCubic: k => k * k * k,
  inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  inOutQuint: k => (k < 0.5 ? 16 * k ** 5 : 1 - Math.pow(-2 * k + 2, 5) / 2),
  outBack: k => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  spring: k => (k >= 1 ? 1 : 1 - Math.exp(-6.5 * k) * Math.cos(10 * k)),
};
// in/out envelope: 0 before a, rises over dIn, holds, falls over dOut ending at b
function env(t, a, b, dIn = 0.4, dOut = 0.4, ease = E.outCubic) {
  if (t < a || t > b) return 0;
  const i = ease(prog(t, a, a + dIn));
  const o = 1 - E.inCubic(prog(t, b - dOut, b));
  return Math.min(i, o);
}
// deterministic pseudo-random
function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// ---------- drawing helpers ----------
function font(size, weight = 600, fam = DISPLAY) { return `${weight} ${size}px ${fam}`; }

function txt(ctx, s, x, y, o = {}) {
  ctx.save();
  ctx.font = font(o.size || 48, o.weight || 600, o.fam || DISPLAY);
  ctx.fillStyle = o.color || '#fff';
  ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  if (o.ls != null) ctx.letterSpacing = o.ls + 'px';
  ctx.fillText(s, x, y);
  ctx.restore();
}
function measure(ctx, s, size, weight = 600, fam = DISPLAY, ls = 0) {
  ctx.save(); ctx.font = font(size, weight, fam); ctx.letterSpacing = ls + 'px';
  const w = ctx.measureText(s).width; ctx.restore(); return w;
}

// Word-by-word masked rise. Returns total width. Each word slides up from under its own clip line.
function rise(ctx, s, x, y, t, t0, o = {}) {
  const size = o.size || 96, weight = o.weight || 700, fam = o.fam || DISPLAY;
  const words = s.split(' ');
  const gap = measure(ctx, ' ', size, weight, fam);
  const widths = words.map(w => measure(ctx, w, size, weight, fam, o.ls || 0));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  const stagger = o.stagger == null ? 0.07 : o.stagger, dur = o.dur || 0.55;
  const tOut = o.out;  // time when exit starts
  words.forEach((w, i) => {
    let k = E.outQuart(prog(t, t0 + i * stagger, t0 + i * stagger + dur));
    let dy = (1 - k) * size * 1.3;
    if (tOut != null) {
      const ko = E.inCubic(prog(t, tOut + i * stagger * 0.6, tOut + i * stagger * 0.6 + dur * 0.7));
      dy -= ko * size * 1.7;
    }
    if (k > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - 10, y - size * 1.05, widths[i] + 20, size * 1.4);
      ctx.clip();
      const col = (o.colors && o.colors[i]) || o.color;
      txt(ctx, w, cx, y + dy, { size, weight, fam, color: col, ls: o.ls });
      ctx.restore();
    }
    cx += widths[i] + gap;
  });
  return total;
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// Phoenix logo mark: four arcs from the brand SVG (viewBox 0 14 96 82). k = draw progress per arc (staggered).
function logoMark(ctx, cx, cy, size, k, color, lw = 12) {
  const s = size / 96;
  ctx.save();
  ctx.translate(cx - 48 * s, cy - 55 * s);
  ctx.scale(s, s);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'butt';
  // arcs: (center, radius, start, end, anticlockwise) matching the SVG paths
  const arcs = [
    [0, 96, 46, Math.PI * 0 - 0, -Math.PI / 2, true],   // M46 96 A46 46 0 0 0 0 50 : center (0,96), from 0 to -90deg
    [96, 96, 46, Math.PI, Math.PI * 1.5, false],          // M50 96 A46 46 0 0 1 96 50 : center (96,96)
    [0, 96, 76, 0, -Math.PI / 2, true],                  // M76 96 A76 76 0 0 0 0 20
    [96, 96, 76, Math.PI, Math.PI * 1.5, false],          // M20 96 A76 76 0 0 1 96 20
  ];
  const order = [2, 3, 0, 1];
  order.forEach((ai, j) => {
    const kk = E.inOutCubic(clamp(k * 1.6 - j * 0.2));
    if (kk <= 0) return;
    const [cxa, cya, r, a0, a1, acw] = arcs[ai];
    const end = a0 + (a1 - a0) * kk;
    ctx.beginPath();
    ctx.arc(cxa, cya, r, a0, end, acw);
    ctx.stroke();
  });
  ctx.restore();
}

// ---------- 3D hand skeleton (21 MediaPipe-style landmarks) ----------
// pose: { curl:[thumb,index,middle,ring,pinky] 0..1, spread, yaw, pitch, roll, x, y, s }
const FINGERS = [
  { base: [-0.42, -0.30], ang: -2.05, len: [0.3, 0.25, 0.21], bend: [0.5, 0.7, 0.6] },   // thumb
  { base: [-0.26, -0.98], ang: -1.68, len: [0.47, 0.28, 0.22], bend: [1.3, 1.6, 1.0] }, // index
  { base: [-0.04, -1.04], ang: -1.57, len: [0.52, 0.31, 0.24], bend: [1.3, 1.6, 1.0] }, // middle
  { base: [0.17, -0.98], ang: -1.47, len: [0.47, 0.29, 0.22], bend: [1.3, 1.6, 1.0] },  // ring
  { base: [0.35, -0.84], ang: -1.35, len: [0.37, 0.23, 0.20], bend: [1.3, 1.6, 1.0] },  // pinky
];
function handPoints(p) {
  const pts = [[0, 0, 0]];
  FINGERS.forEach((f, fi) => {
    const spread = (p.spread == null ? 0.2 : p.spread) * (fi - 2) * (fi === 0 ? 0.6 : 1);
    const a = f.ang + spread;
    const dx = Math.cos(a), dy = Math.sin(a);
    let x = f.base[0], y = f.base[1], z = 0, th = 0;
    if (fi === 0) { x = -0.18; y = -0.12; }
    pts.push([x, y, z]);
    const c = p.curl[fi];
    for (let j = 0; j < 3; j++) {
      th += c * f.bend[j];
      const L = f.len[j] * (fi === 0 && j === 0 ? 1.0 : 1);
      if (fi === 0) {
        // thumb folds across the palm
        const ax = Math.cos(a + c * 1.4), ay = Math.sin(a + c * 1.4);
        x += ax * L * Math.cos(th * 0.6); y += ay * L * Math.cos(th * 0.6); z -= L * Math.sin(th * 0.6);
      } else {
        x += dx * L * Math.cos(th); y += dy * L * Math.cos(th); z -= L * Math.sin(th);
      }
      pts.push([x, y, z]);
    }
  });
  // rotate
  const cy = Math.cos(p.yaw || 0), sy = Math.sin(p.yaw || 0);
  const cp = Math.cos(p.pitch || 0), sp = Math.sin(p.pitch || 0);
  const cr = Math.cos(p.roll || 0), sr = Math.sin(p.roll || 0);
  return pts.map(([x, y, z]) => {
    y += 0.55; // pivot around palm centre
    let x1 = x * cr - y * sr, y1 = x * sr + y * cr;           // roll
    let x2 = x1 * cy + z * sy, z2 = -x1 * sy + z * cy;          // yaw
    let y3 = y1 * cp - z2 * sp, z3 = y1 * sp + z2 * cp;         // pitch
    const persp = 3.2 / (3.2 + z3);
    return [p.x + x2 * p.s * persp, p.y + (y3 - 0.55) * p.s * persp, z3, persp];
  });
}
const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];

// draw hand; k = build progress (bones draw in order), o.color bones, o.joint joint fill, o.tip tip colour
function drawHand(ctx, pose, k, o) {
  if (k <= 0.001 || (o.alpha != null && o.alpha <= 0.001)) return null;
  const P = handPoints(pose);
  const lw = o.lw || pose.s * 0.035;
  ctx.save();
  ctx.lineCap = 'round';
  const nb = BONES.length;
  // sort bones back-to-front for depth
  const idx = BONES.map((b, i) => i).sort((a, b) => (P[BONES[b][0]][2] + P[BONES[b][1]][2]) - (P[BONES[a][0]][2] + P[BONES[a][1]][2]));
  idx.forEach(i => {
    const kb = clamp(k * nb * 0.5 - i * 0.5 + 0.5);
    if (kb <= 0) return;
    const [a, b] = BONES[i];
    const A = P[a], B = P[b];
    ctx.strokeStyle = o.color; ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.lineWidth = lw * (A[3] + B[3]) / 2;
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(lerp(A[0], B[0], kb), lerp(A[1], B[1], kb)); ctx.stroke();
  });
  P.forEach((q, i) => {
    const kj = E.outBack(clamp(k * 21 * 0.5 - i * 0.45 + 0.5));
    if (kj <= 0) return;
    const tip = [4, 8, 12, 16, 20].includes(i);
    const r = (tip ? lw * 1.25 : lw * 0.95) * q[3] * kj;
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.fillStyle = o.bg; ctx.beginPath(); ctx.arc(q[0], q[1], r + lw * 0.35, 0, 7); ctx.fill();
    ctx.fillStyle = tip ? (o.tip || o.color) : (o.joint || o.color);
    ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, 7); ctx.fill();
  });
  ctx.restore();
  return P;
}

// pose library + interpolation
const POSES = {
  open: { curl: [0, 0, 0, 0, 0], spread: 0.22 },
  flat: { curl: [0.1, 0, 0, 0, 0], spread: 0.04 },
  fist: { curl: [0.9, 1, 1, 1, 1], spread: 0.05 },
  point: { curl: [0.8, 0, 1, 1, 1], spread: 0.08 },
  vee: { curl: [0.9, 0, 0, 1, 1], spread: 0.3 },
  claw: { curl: [0.4, 0.55, 0.55, 0.55, 0.55], spread: 0.2 },
  dee: { curl: [0.6, 0, 0.85, 0.85, 0.85], spread: 0.05 },
  ok: { curl: [0.5, 0.65, 0, 0, 0], spread: 0.25 },
};
function mix(a, b, k) {
  return { curl: a.curl.map((v, i) => lerp(v, b.curl[i], k)), spread: lerp(a.spread, b.spread, k) };
}
// keyframes: [[time, poseName, {yaw,pitch,roll,dx,dy}], ...]
function poseAt(keys, t) {
  let i = 0; while (i < keys.length - 1 && t > keys[i + 1][0]) i++;
  const A = keys[i], B = keys[Math.min(i + 1, keys.length - 1)];
  const k = A === B ? 0 : E.inOutCubic(prog(t, A[0], B[0]));
  const m = mix(POSES[A[1]], POSES[B[1]], k);
  const ra = A[2] || {}, rb = B[2] || {};
  ['yaw', 'pitch', 'roll', 'dx', 'dy'].forEach(q => { m[q] = lerp(ra[q] || 0, rb[q] || 0, k); });
  return m;
}

// waveform bars
function wave(ctx, cx, cy, w, h, t, amp, o) {
  if (amp < 0.02 || w < 2) return;
  const n = o.n || 48, gap = w / n, bw = o.bw || gap * 0.45;
  ctx.save(); ctx.fillStyle = o.color; ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha) * Math.min(1, amp * 5);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const shape = Math.sin(Math.PI * u);
    const v = 0.15 + 0.85 * Math.abs(Math.sin(t * 7.3 + i * 0.55) * 0.6 + Math.sin(t * 11.1 - i * 0.9) * 0.4);
    const bh = Math.max(bw, h * shape * v * amp);
    rrect(ctx, cx - w / 2 + i * gap, cy - bh / 2, bw, bh, bw / 2); ctx.fill();
  }
  ctx.restore();
}

// corner brackets (camera frame)
function brackets(ctx, x, y, w, h, len, k, color, lw = 4) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'square';
  const L = len * E.outCubic(k);
  const c = [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]];
  c.forEach(([px, py, sx, sy]) => {
    ctx.beginPath(); ctx.moveTo(px + sx * L, py); ctx.lineTo(px, py); ctx.lineTo(px, py + sy * L); ctx.stroke();
  });
  ctx.restore();
}

function speaker(ctx, x, y, s, color, t, k) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-40, -14); ctx.lineTo(-22, -14); ctx.lineTo(0, -34); ctx.lineTo(0, 34); ctx.lineTo(-22, 14); ctx.lineTo(-40, 14); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 3; i++) {
    const ph = (t * 1.6 - i * 0.25) % 1;
    ctx.globalAlpha = k * (0.35 + 0.65 * Math.max(0, Math.sin(ph * Math.PI)));
    ctx.beginPath(); ctx.arc(4, 0, 18 + i * 16, -0.8, 0.8); ctx.stroke();
  }
  ctx.restore();
}
function mic(ctx, x, y, s, color) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 6; ctx.lineCap = 'round';
  rrect(ctx, -14, -40, 28, 52, 14); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -6, 26, 0.15, Math.PI - 0.15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, 36); ctx.moveTo(-14, 36); ctx.lineTo(14, 36); ctx.stroke();
  ctx.restore();
}

// recognition chip: word, confidence 0..1, alternatives, colours
function chip(ctx, x, y, word, conf, alts, k, pal, o = {}) {
  if (k <= 0) return;
  const size = o.size || 44;
  const w = Math.max(measure(ctx, word, size, 700) + 64, o.minW || 260), h = o.h || 150;
  ctx.save();
  ctx.globalAlpha *= clamp(k * 2);
  const sc = lerp(0.85, 1, E.outBack(k));
  ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-w / 2, -h / 2);
  rrect(ctx, 0, 0, w, h, 16); ctx.fillStyle = pal.raised; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = pal.border; ctx.stroke();
  txt(ctx, word, 32, 62, { size, weight: 700, color: pal.ink });
  // confidence bar
  const bw = w - 64;
  rrect(ctx, 32, 84, bw, 8, 4); ctx.fillStyle = pal.sunken; ctx.fill();
  rrect(ctx, 32, 84, Math.max(8, bw * conf * E.outCubic(clamp(k * 1.4 - 0.2))), 8, 4); ctx.fillStyle = pal.accent; ctx.fill();
  if (alts) txt(ctx, alts, 32, 126, { size: 22, weight: 400, fam: SANS, color: pal.muted });
  ctx.restore();
  return w;
}

// typewriter text
function typed(ctx, s, x, y, t, t0, cps, o) {
  const n = Math.floor(clamp((t - t0) * cps, 0, s.length));
  const shown = s.slice(0, n);
  txt(ctx, shown, x, y, o);
  const w = measure(ctx, shown, o.size, o.weight || 600, o.fam || DISPLAY);
  const ax = o.align === 'center' ? x - measure(ctx, s, o.size, o.weight || 600, o.fam || DISPLAY) / 2 : x;
  if (t >= t0 && (n < s.length || Math.floor(t * 2.5) % 2 === 0) && !o.noCaret) {
    ctx.save(); ctx.fillStyle = o.caret || o.color; ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    ctx.fillRect(ax + (o.align === 'center' ? measure(ctx, shown, o.size, o.weight || 600, o.fam || DISPLAY) : w) + 6, y - o.size * 0.8, 4, o.size * 0.95);
    ctx.restore();
  }
  return n;
}

window.PX = { W, H, PAL, DISPLAY, SANS, MONO, clamp, lerp, prog, E, env, rnd, font, txt, measure, rise, rrect, logoMark, handPoints, drawHand, POSES, mix, poseAt, wave, brackets, speaker, mic, chip, typed };

// chapter runner: list of [t0, t1, fn(ctx, localT, dur, globalT)]
function runChapters(ctx, t, chapters) {
  for (const [a, b, fn] of chapters) if (t >= a && t < b) fn(ctx, t - a, b - a, t);
}
// generic counter text
function counter(ctx, value, x, y, k, o) { txt(ctx, Math.round(value * k) + (o.suffix || ''), x, y, o); }
// little frame rectangle (JPEG frame) icon
function frameIcon(ctx, x, y, w, h, color, fill, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; rrect(ctx, x - w / 2, y - h / 2, w, h, 4); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.stroke(); ctx.restore();
}
Object.assign(PX, { runChapters, counter, frameIcon });
