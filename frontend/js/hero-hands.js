// Landing hero: two people's hands signing "welcome", rendered in 3D.
// Skinned hand meshes from the WebXR Input Profiles "generic-hand" asset (MIT, © Amazon, assets/hands/LICENSE.md),
// lit and posed here with three.js. It is a render, and the page labels it as one.
// The gesture is the ASL sign WELCOME (see KEY below): one flat hand sweeps from out in front, palm across,
// in to the chest, palm up. Person A signs it, then person B answers with the same sign.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from '../vendor/three/addons/utils/SkeletonUtils.js';
import { RoomEnvironment } from '../vendor/three/addons/environments/RoomEnvironment.js';
import { RM } from './motion.js';

const FINGERS = ['index', 'middle', 'ring', 'pinky'];
const CYCLE = 7;                        // seconds: A signs, B answers, both rest
const ease = t => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = t => Math.min(1, Math.max(0, t));
const v3 = (a) => new THREE.Vector3().fromArray(a);

/** Put one hand inside a pivot whose axes are: +X fingers, +Y palm normal, +Z thumb side. */
function rigHand(src, isLeft, skin) {
  const root = cloneSkinned(src);
  root.updateMatrixWorld(true);
  const P = n => root.getObjectByName(n).getWorldPosition(new THREE.Vector3());
  const wrist = P('wrist');
  const F = P('middle-finger-phalanx-proximal').sub(wrist).normalize();
  const side = P('index-finger-phalanx-proximal').sub(P('pinky-finger-phalanx-proximal')).normalize();
  let N = isLeft ? new THREE.Vector3().crossVectors(F, side) : new THREE.Vector3().crossVectors(side, F);
  N.normalize();
  const T = new THREE.Vector3().crossVectors(F, N).normalize();
  // basis (F,N,T) -> (X,Y,Z)
  const m = new THREE.Matrix4().makeBasis(F, N, T).invert();
  const inner = new THREE.Group();
  inner.add(root);
  root.position.copy(wrist).negate();
  inner.quaternion.setFromRotationMatrix(m);

  root.traverse(o => {
    if (o.isMesh) { o.material = skin; o.castShadow = true; o.frustumCulled = false; }
  });

  // curl axis per finger bone, in the bone's own frame: rotating about it bends the finger toward the palm
  const curl = [];
  const palmWorld = N.clone();
  FINGERS.forEach((f, fi) => {
    ['phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal'].forEach((seg, si) => {
      const b = root.getObjectByName(`${f}-finger-${seg}`);
      const wq = b.getWorldQuaternion(new THREE.Quaternion());
      const axisWorld = side.clone();
      const local = axisWorld.applyQuaternion(wq.clone().invert()).normalize();
      // pick the sign that moves the fingertip toward the palm
      const tip = root.getObjectByName(`${f}-finger-tip`);
      const before = tip.getWorldPosition(new THREE.Vector3()).dot(palmWorld);
      const rest = b.quaternion.clone();
      b.quaternion.copy(rest).multiply(new THREE.Quaternion().setFromAxisAngle(local, .3));
      root.updateMatrixWorld(true);
      const after = tip.getWorldPosition(new THREE.Vector3()).dot(palmWorld);
      b.quaternion.copy(rest); root.updateMatrixWorld(true);
      curl.push({ b, rest, local, sign: after > before ? 1 : -1, w: [1, .8, .6][si], f: fi });
    });
  });
  const thumb = root.getObjectByName('thumb-phalanx-proximal');
  const thumbRest = thumb.quaternion.clone();
  const thumbAxis = F.clone().applyQuaternion(thumb.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();

  const pivot = new THREE.Group();
  pivot.add(inner);
  return {
    pivot,
    /** k: 0 open and flat, 1 relaxed (soft curl). spread: small fan of the fingers. */
    shape(k) {
      curl.forEach(c => {
        const a = c.sign * (.08 + .22 * k) * c.w * (1 + c.f * .12);
        c.b.quaternion.copy(c.rest).multiply(new THREE.Quaternion().setFromAxisAngle(c.local, a));
      });
      thumb.quaternion.copy(thumbRest).multiply(new THREE.Quaternion().setFromAxisAngle(thumbAxis, (isLeft ? -1 : 1) * .15 * k));
    }
  };
}

/** A tapered tube between two points (forearm, upper arm), re-aimed every frame. */
function limb(color, r0, r1) {
  const g = new THREE.CylinderGeometry(r1, r0, 1, 32, 1, false);  // top = far end, bottom = near end
  g.translate(0, .5, 0);
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color, roughness: .82, sheen: .35, sheenRoughness: .7, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), .25) }));
  m.castShadow = true; m.receiveShadow = true;
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  m.aim = (a, b) => {
    d.subVectors(b, a); const len = d.length();
    m.position.copy(a); m.scale.set(1, len, 1);
    m.quaternion.setFromUnitVectors(up, d.divideScalar(len));
  };
  return m;
}

function skinMaterial(hex) {
  return new THREE.MeshPhysicalMaterial({
    color: hex, roughness: .5, metalness: 0,
    sheen: .6, sheenRoughness: .45, sheenColor: new THREE.Color(hex).offsetHSL(-.02, .2, .12),
    clearcoat: .08, clearcoatRoughness: .6
  });
}

// Person-local space: +x forward (toward the other person), +y up, +z the signer's right.
const P = (fwd, up, right) => new THREE.Vector3(fwd, up, right);
const D = (fwd, up, right) => new THREE.Vector3(fwd, up, right).normalize();

/*
 * ASL WELCOME (one-handed): the dominant hand in the flat "B" handshape starts about half an arm's
 * length in front of and beside the chest, palm facing across, and sweeps in a large horizontal arc
 * to the centre of the chest, ending palm up. Sources: Lifeprint (ASL University) "WELCOME";
 * Wiktionary ASL entry OpenB@DistalSideChesthigh-PalmAcross ... OpenB@NearCenterTrunkhigh-PalmUp.
 * F = finger direction, N = palm normal, k = finger curl (0 = flat B).
 */
const KEY = {
  rest:  { p: P(.07, -.21, .20),  F: D(.25, -1, -.05),  N: D(-.15, 0, -1),  k: .45 },
  start: { p: P(.38, .06, .28),   F: D(1, .08, -.42),   N: D(.25, .15, -1), k: 0 },
  end:   { p: P(.21, .07, .115),  F: D(.25, .05, -1),   N: D(0, 1, 0),      k: 0 }
};
const SWEEP_CTRL = P(.40, .09, .12);         // pulls the path outward so the hand travels a round arc
const LEFT_REST = { p: P(.07, -.22, -.20), F: D(.25, -1, .05), N: D(-.15, 0, 1), k: .45 };
const SHOULDER_R = P(-.01, .27, .185), SHOULDER_L = P(-.01, .27, -.185);
const UPPER = .29, FORE = .26;

function orient(F, N) {
  const f = F.clone().normalize();
  const n = N.clone().sub(f.clone().multiplyScalar(N.dot(f))).normalize();
  const t = new THREE.Vector3().crossVectors(f, n);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(f, n, t));
}
for (const k of [KEY.rest, KEY.start, KEY.end, LEFT_REST]) k.q = orient(k.F, k.N);

/** Two-bone arm: elbow from shoulder S and wrist W, bending down and out to the side. */
function elbowFor(S, W, out) {
  const sw = new THREE.Vector3().subVectors(W, S);
  const d = Math.min(sw.length(), UPPER + FORE - 1e-3);
  sw.normalize();
  const a = (UPPER * UPPER - FORE * FORE + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, UPPER * UPPER - a * a));
  const pole = P(-.35, -1, .45 * out).normalize();
  pole.sub(sw.clone().multiplyScalar(pole.dot(sw))).normalize();
  return S.clone().addScaledVector(sw, a).addScaledVector(pole, h);
}

/** A person: right hand signs, left hand rests. Placed with its forward axis toward the other person. */
function person(hands, skinHex, sleeveHex) {
  const skin = skinMaterial(skinHex);
  const group = new THREE.Group();
  // Torso, cropped by the frame above the shoulders: the scene is about the hands, not faces.
  const cloth = limb(sleeveHex, .05, .05).material;
  // a lathe profile (radius, height): sloped shoulders, chest, waist; flattened front to back
  const prof = [[0, .425], [.09, .41], [.15, .39], [.185, .355], [.2, .3], [.198, .18], [.182, 0], [.172, -.3], [.176, -1.3], [0, -1.3]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), cloth);
  torso.scale.set(.58, 1, 1);
  torso.position.x = -.07;
  torso.castShadow = torso.receiveShadow = true;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.052, .06, .2, 32), skin);
  neck.position.set(-.075, .5, 0);
  group.add(neck);
  group.add(torso);
  const joint = r => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), cloth); m.castShadow = m.receiveShadow = true; group.add(m); return m; };
  const arm = (side, S, out) => {
    const h = rigHand(hands[side], side === 'left', skin);
    const fore = limb(sleeveHex, .034, .046), upper = limb(sleeveHex, .047, .058);
    const elbow = joint(.047), shoulder = joint(.057);
    shoulder.position.copy(S);
    group.add(h.pivot, fore, upper);
    return {
      set(p, q, k) {
        h.pivot.position.copy(p); h.pivot.quaternion.copy(q); h.shape(k);
        // the cuff starts a little behind the wrist, along the forearm
        const E = elbowFor(S, p, out);
        const W = p.clone().lerp(E, .05);
        fore.aim(W, E); upper.aim(E, S); elbow.position.copy(E);
      }
    };
  };
  const right = arm('right', SHOULDER_R, 1), left = arm('left', SHOULDER_L, -1);
  const tmpQ = new THREE.Quaternion(), tmpP = new THREE.Vector3();
  const bez = (a, c, b, s) => {
    const u = 1 - s;
    return tmpP.set(0, 0, 0).addScaledVector(a, u * u).addScaledVector(c, 2 * u * s).addScaledVector(b, s * s);
  };
  return {
    group,
    /** stage: 0 rest -> 1 start (raise) -> 2 end (the sign) -> 3 rest again. */
    pose(stage, breathe) {
      const b = breathe * .003;
      let p, q, k;
      if (stage <= 1) {
        const s = ease(clamp01(stage));
        p = tmpP.copy(KEY.rest.p).lerp(KEY.start.p, s); q = tmpQ.copy(KEY.rest.q).slerp(KEY.start.q, s);
        k = THREE.MathUtils.lerp(KEY.rest.k, 0, s);
      } else if (stage <= 2) {
        const s = ease(stage - 1);
        p = bez(KEY.start.p, SWEEP_CTRL, KEY.end.p, s); q = tmpQ.copy(KEY.start.q).slerp(KEY.end.q, s); k = 0;
      } else {
        const s = ease(clamp01(stage - 2));
        p = tmpP.copy(KEY.end.p).lerp(KEY.rest.p, s); q = tmpQ.copy(KEY.end.q).slerp(KEY.rest.q, s);
        k = THREE.MathUtils.lerp(0, KEY.rest.k, s);
      }
      right.set(p.clone().setY(p.y + b), q, k);
      left.set(LEFT_REST.p.clone().setY(LEFT_REST.p.y + b), LEFT_REST.q, LEFT_REST.k);
    }
  };
}

export async function initHeroHands(stage) {
  if (!stage) return;
  let renderer;
  try {
    const canvas = document.createElement('canvas');
    canvas.className = 'hands-canvas';
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) { stage.classList.add('no-webgl'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;

  const key = new THREE.DirectionalLight('#fff4ee', 2.2);
  key.position.set(.5, 1.4, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -.9, right: .9, top: .7, bottom: -.7, near: .1, far: 5 });
  key.shadow.radius = 6;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#ff6a55', 1.4);
  rim.position.set(-1.2, .8, -.6);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight('#ffffff', '#f2d6d2', .6));

  const camera = new THREE.PerspectiveCamera(30, 16 / 9, .05, 10);

  const gltf = new GLTFLoader();
  const [L, R] = await Promise.all(['left', 'right'].map(s => gltf.loadAsync(`assets/hands/${s}.glb`)));
  const hands = { left: L.scene, right: R.scene };
  const A = person(hands, '#c98462', '#a8100b');     // stands on the left, faces right, red sleeves
  const B = person(hands, '#7a4a30', '#2a1d1e');     // stands on the right, faces left, dark sleeves
  // Both face the viewer, each turned a little toward the other, like two signers in one frame.
  A.group.position.set(-.3, 0, 0); A.group.rotation.y = -Math.PI / 2 + .42;
  B.group.position.set(.3, 0, 0);  B.group.rotation.y = -Math.PI / 2 - .42;
  scene.add(A.group, B.group);

  stage.prepend(renderer.domElement);
  stage.classList.add('has-hands');

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Frame a fixed width (both people with their reach), and keep the top edge just above the shoulders,
    // so a tall phone frame shows more torso, never empty space where heads would be.
    const dist = 1.6, halfW = camera.aspect < 1.5 ? .76 : .98, halfH = halfW / camera.aspect;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfH / dist));
    const cy = .43 - halfH;
    camera.position.set(0, cy + .12, dist);
    camera.lookAt(0, cy, 0);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // Per person: raise (0.5 s), sign (1.3 s), hold (0.9 s), lower (0.7 s). A starts at 0.2 s, B answers at 2.9 s.
  const stageAt = c => (c < 0 ? 0 : c < .5 ? c / .5 : c < 1.8 ? 1 + (c - .5) / 1.3 : c < 2.7 ? 2 : c < 3.4 ? 2 + (c - 2.7) / .7 : 3);
  function poseAt(t) {
    const c = t % CYCLE, br = Math.sin(t * 1.6);
    A.pose(stageAt(c - .2), br); B.pose(stageAt(c - 2.9), -br);
  }
  let visible = true, raf = 0, t0 = performance.now();
  const frame = now => {
    poseAt((now - t0) / 1000);
    renderer.render(scene, camera);
    raf = visible ? requestAnimationFrame(frame) : 0;
  };
  // test hook: freeze at a time (used by screenshots)
  window.__phxHands = t => { visible = false; cancelAnimationFrame(raf); raf = 0; if (t === 'end') { A.pose(2, 0); B.pose(2, 0); } else poseAt(t); renderer.render(scene, camera); };
  if (RM) { A.pose(2, 0); B.pose(2, 0); renderer.render(scene, camera); return; }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }).observe(stage);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  });
  raf = requestAnimationFrame(frame);
}
