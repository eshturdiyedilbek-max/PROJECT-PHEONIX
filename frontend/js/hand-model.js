// Procedural 21-point hand (same layout as MediaPipe Hands), used by the landing page's 3D hand.
// Pose: c = curl of thumb..pinky (0 open, 1 closed), sp = finger spread, yaw/rot = wrist turn.
const OPEN = [0, 0, 0, 0, 0], POINT = [.85, 0, 1, 1, 1], TWO = [.85, 0, 0, 1, 1];
const H = (rot, c, yaw = 0, sp = 1) => ({ rot, yaw, c, sp });
export const POSES = {
  hello: { r: H(-.2, OPEN, 0, 1.1) },
  thanks: { r: H(.1, OPEN, .3) },
  where: { r: H(-.05, POINT) },
  water: { r: H(.15, [.8, 0, 0, 0, 1], .2) },
  hospital: { r: H(.4, TWO, .3) },
  me: { r: H(.5, POINT, .2) }
};
const FING = [
  { b: [-.20, -.10], a: -1.0, L: [.21, .17, .14] },
  { b: [-.13, -.48], a: -.13, L: [.25, .15, .12] },
  { b: [-.02, -.52], a: 0, L: [.28, .17, .12] },
  { b: [.09, -.48], a: .12, L: [.26, .16, .11] },
  { b: [.19, -.40], a: .26, L: [.20, .12, .10] }
];
export const CONN = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
export function handPoints(p, side, sz, ox, oy) {
  // side: -1 for signer's right (image left), +1 for left
  const pts = [[0, 0, 0]];
  FING.forEach((f, i) => {
    const c = p.c[i];
    let x = f.b[0] * -side, y = f.b[1], z = 0;
    let th = (f.a * p.sp) * -side;
    if (i === 0) th = (f.a + c * .85) * -side;
    pts.push([x, y, z]);
    let phi = i === 0 ? c * .5 : c * .35;
    f.L.forEach((L, j) => {
      x += L * Math.sin(th) * Math.cos(phi);
      y += -L * Math.cos(th) * Math.cos(phi);
      z += L * Math.sin(phi);
      pts.push([x, y, z]);
      phi += i === 0 ? c * .7 : c * 1.35;
    });
  });
  const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw), cr = Math.cos(p.rot), sr = Math.sin(p.rot);
  return pts.map(([x, y, z]) => {
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const x2 = x1 * cr - y * sr, y2 = x1 * sr + y * cr;
    return [ox + x2 * sz, oy + y2 * sz, z1];
  });
}

export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
