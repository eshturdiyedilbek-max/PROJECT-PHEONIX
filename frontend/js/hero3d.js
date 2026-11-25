// Phoenix landing: dependency-free 3D hand skeleton. Perspective projection on a 2D canvas, depth-sorted joints and bones, drag to rotate.
import * as P from './hand-model.js';

export function initHero3d() {
  const cv = document.getElementById('hand3d'); if (!cv) return;
  const ctx = cv.getContext('2d');
  const label = document.getElementById('hand3d-word'), labelTr = document.getElementById('hand3d-tr');
  const SEQ = [
    ['hello', 'привет', 'Salom'], ['thanks', 'спасибо', 'Rahmat'], ['where', 'где', 'Qayerda'],
    ['water', 'вода', 'Suv'], ['hospital', 'больница', 'Kasalxona'], ['me', 'я', 'Men']
  ];
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let yaw = -.45, pitch = .18, drag = null, vel = 0, idle = 0, t0 = performance.now();
  let cache = {}, at = 0;
  function tok() {
    const n = performance.now();
    if (!cache['--ink'] || n - at > 400) { const cs = getComputedStyle(document.documentElement); ['--accent', '--ink', '--surface-raised', '--surface-sunken', '--ink-muted', '--line'].forEach(k => cache[k] = cs.getPropertyValue(k).trim()); at = n; }
    return cache;
  }
  function rgba(hex, a) { const h = (hex || '#000').replace('#', ''); const v = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); return `rgba(${v >> 16 & 255},${v >> 8 & 255},${v & 255},${a})`; }
  function poseAt(t) {
    const D = 2600, i = Math.floor(t / D) % SEQ.length, j = (i + 1) % SEQ.length, f = (t % D) / D;
    const k = P.RM ? 0 : ease(Math.max(0, (f - .7) / .3));
    const a = P.POSES[SEQ[i][0]].r, b = P.POSES[SEQ[j][0]].r;
    const p = { rot: 0, yaw: lerp(a.yaw, b.yaw, k) * .6, sp: lerp(a.sp, b.sp, k), c: a.c.map((v, n) => lerp(v, b.c[n], k)) };
    const wob = P.RM ? 0 : Math.sin(t / 380) * .06 * (1 - k);
    p.c = p.c.map((v, n) => Math.max(0, Math.min(1, v + (n ? wob : 0))));
    return { p, idx: k > .5 ? j : i };
  }
  let shown = -1;
  function setLabel(i) {
    if (i === shown || !label) return; shown = i;
    [label, labelTr].forEach((el, n) => { el.textContent = SEQ[i][n + 1]; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); });
  }
  function fit() {
    const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return [w, h];
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!cv.offsetParent) return;
    const [w, h] = fit(), T = tok(), t = Math.max(0, now - t0);
    if (!drag) { yaw += vel; vel *= .94; idle += 16; if (!P.RM && idle > 1200) yaw += .0035; }
    const { p, idx } = poseAt(t); setLabel(idx);
    // hand in local units (wrist at origin, fingers toward -y), plus a forearm
    const pts = P.handPoints(p, -1, 1, 0, 0).map(([x, y, z]) => [x, y + .45, z * .9]);
    pts.push([.02, 1.35, -.05]); // elbow side of forearm
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const S = Math.min(w, h) * .62, cx = w / 2, cyy = h * .5, cam = 3.2;
    const proj = pts.map(([x, y, z]) => {
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      const s = cam / (cam + z2);
      return { x: cx + x1 * S * s, y: cyy + y2 * S * s, z: z2, s };
    });
    ctx.clearRect(0, 0, w, h);
    // floor ring
    ctx.save(); ctx.strokeStyle = rgba(T['--ink'], .12); ctx.lineWidth = Math.max(1, w / 600);
    for (let r = 1; r <= 3; r++) { ctx.beginPath(); ctx.ellipse(cx, h * .9, S * .22 * r, S * .05 * r, 0, 0, 7); ctx.stroke(); }
    ctx.restore();
    // draw list sorted far to near
    const items = [];
    P.CONN.forEach(([a, b]) => items.push({ k: 'b', a, b, z: (proj[a].z + proj[b].z) / 2 }));
    items.push({ k: 'arm', a: 0, b: 21, z: (proj[0].z + proj[21].z) / 2 + .2 });
    proj.slice(0, 21).forEach((q, i) => items.push({ k: 'j', i, z: q.z }));
    items.sort((m, n) => n.z - m.z);
    const fog = z => Math.max(.28, Math.min(1, 1 - z * .55));
    items.forEach(it => {
      if (it.k === 'j') {
        const q = proj[it.i], r = (it.i % 4 === 0 && it.i ? 9 : 7) * q.s * S / 260;
        const g = ctx.createRadialGradient(q.x - r * .35, q.y - r * .35, r * .1, q.x, q.y, r);
        g.addColorStop(0, T['--surface-raised']); g.addColorStop(1, rgba(T['--ink'], .9));
        ctx.globalAlpha = fog(q.z); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.fill();
        ctx.lineWidth = Math.max(1, r * .18); ctx.strokeStyle = T['--ink']; ctx.stroke();
      } else {
        const A = proj[it.a], B = proj[it.b];
        ctx.globalAlpha = fog(it.z); ctx.lineCap = 'round';
        ctx.strokeStyle = it.k === 'arm' ? rgba(T['--ink'], .18) : T['--accent'];
        ctx.lineWidth = (it.k === 'arm' ? 46 : 7) * ((A.s + B.s) / 2) * S / 260;
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); idle = 0; });
  cv.addEventListener('pointermove', e => {
    if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    yaw += dx * .01; vel = dx * .01; pitch = Math.max(-.6, Math.min(.8, pitch + dy * .006)); drag = { x: e.clientX, y: e.clientY };
  });
  const up = () => { drag = null; idle = 0; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') yaw -= .2; if (e.key === 'ArrowRight') yaw += .2; idle = 0; });
  requestAnimationFrame(frame);
}
