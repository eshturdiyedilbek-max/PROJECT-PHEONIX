// Landing hero: two people's hands signing "welcome", rendered in 3D.
// Skinned hand meshes from the WebXR Input Profiles "generic-hand" asset (MIT, © Amazon, assets/hands/LICENSE.md),
// lit and posed here with three.js. It is a render, and the page labels it as one.
// The gesture: open hands, palms up, start toward the guest and sweep back toward the signer's own body,
// the shared shape of "welcome" in Russian and American Sign Language. Person A signs, then person B answers.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from '../vendor/three/addons/utils/SkeletonUtils.js';
import { RoomEnvironment } from '../vendor/three/addons/environments/RoomEnvironment.js';
import { RM } from './motion.js';

const FINGERS = ['index', 'middle', 'ring', 'pinky'];
const CYCLE = 6.4;                      // seconds: A signs, B signs, both rest
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

/** A sleeve from the wrist back toward the elbow, so the hands belong to people. */
function sleeve(color) {
  const len = 1.7;
  const g = new THREE.CylinderGeometry(.056, .034, len, 40, 1, false);
  g.rotateZ(Math.PI / 2);
  g.translate(-len / 2 - .012, 0, 0);
  const cuff = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color, roughness: .82, sheen: .35, sheenRoughness: .7, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), .25) }));
  cuff.castShadow = true;
  return cuff;
}

function skinMaterial(hex) {
  return new THREE.MeshPhysicalMaterial({
    color: hex, roughness: .5, metalness: 0,
    sheen: .6, sheenRoughness: .45, sheenColor: new THREE.Color(hex).offsetHSL(-.02, .2, .12),
    clearcoat: .08, clearcoatRoughness: .6
  });
}

/**
 * A person = two hands plus sleeves. dir = +1 faces right (person stands on the left), -1 faces left.
 * pose(p): p=0 hands offered toward the other person, p=1 drawn back to the signer's own body.
 */
function person(hands, dir, skinHex, sleeveHex) {
  const skin = skinMaterial(skinHex);
  const group = new THREE.Group();
  const parts = ['right', 'left'].map(side => {
    const isLeft = side === 'left';
    const h = rigHand(hands[side], isLeft, skin);
    h.pivot.add(sleeve(sleeveHex));
    group.add(h.pivot);
    // facing +x, the right hand is on +z (near the camera); facing -x it is on -z
    const zSide = (isLeft ? -1 : 1) * dir;
    return { h, zSide, isLeft };
  });
  return {
    group,
    pose(p, breathe) {
      parts.forEach(({ h, zSide }, i) => {
        const e = p;
        const lag = i * .06;
        const q = clamp01((e - lag) / (1 - lag));
        // wrist path: forward and low -> close to the body and a little higher
        const x = dir * THREE.MathUtils.lerp(-.13, -.33, q);
        const y = THREE.MathUtils.lerp(-.02, .035, Math.sin(q * Math.PI / 2)) + breathe * .004;
        const z = zSide * THREE.MathUtils.lerp(.11, .085, q);
        h.pivot.position.set(x, y, z);
        // fingers point toward the guest at the start, then turn inward and up as the hand comes home
        const yaw = dir > 0 ? 0 : Math.PI;
        const inward = THREE.MathUtils.lerp(.18, .62, q) * zSide * -1 * dir;
        const lift = THREE.MathUtils.lerp(.22, .48, q);
        const roll = zSide * dir * THREE.MathUtils.lerp(.12, .04, q);
        h.pivot.rotation.set(0, 0, 0);
        h.pivot.rotateY(yaw + inward);
        h.pivot.rotateZ(lift);
        h.pivot.rotateX(roll * (dir > 0 ? 1 : -1));
        h.shape(THREE.MathUtils.lerp(.15, .55, q));
      });
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
  key.position.set(.6, 1.6, 1.1);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -.7, right: .7, top: .5, bottom: -.5, near: .1, far: 4 });
  key.shadow.radius = 6;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#ff6a55', 1.4);
  rim.position.set(-1, .6, -1.2);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight('#ffffff', '#f2d6d2', .6));

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.ShadowMaterial({ opacity: .14 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.12;
  floor.receiveShadow = true;
  scene.add(floor);

  const camera = new THREE.PerspectiveCamera(30, 16 / 9, .05, 10);
  camera.position.set(0, .62, 1.12);
  camera.lookAt(0, .05, -.02);

  const gltf = new GLTFLoader();
  const [L, R] = await Promise.all(['left', 'right'].map(s => gltf.loadAsync(`assets/hands/${s}.glb`)));
  const hands = { left: L.scene, right: R.scene };
  const A = person(hands, 1, '#c98462', '#a8100b');     // stands on the left, red sleeves
  const B = person(hands, -1, '#7a4a30', '#2a1d1e');    // stands on the right, dark sleeves
  A.group.position.x = -.06;
  B.group.position.x = .06;
  scene.add(A.group, B.group);

  stage.prepend(renderer.domElement);
  stage.classList.add('has-hands');

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // frame a fixed width of the scene, so both people fit on wide and on tall (phone) frames
    const halfW = Math.tan(THREE.MathUtils.degToRad(w / h < 1.5 ? 17 : 27));
    camera.fov = Math.max(20, THREE.MathUtils.radToDeg(2 * Math.atan(halfW / camera.aspect)));
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // A signs (0.0-1.6 s), holds, B signs (1.9-3.5 s), both hold, then both lower back to the offered pose.
  function poseAt(t) {
    const c = t % CYCLE;
    const a = c < 4.6 ? ease(clamp01(c / 1.6)) : 1 - ease(clamp01((c - 4.6) / 1.4));
    const b = c < 4.6 ? ease(clamp01((c - 1.9) / 1.6)) : 1 - ease(clamp01((c - 4.6) / 1.4));
    const br = Math.sin(t * 1.6);
    A.pose(a, br); B.pose(b, -br);
  }

  let visible = true, raf = 0, t0 = performance.now();
  const frame = now => {
    poseAt((now - t0) / 1000);
    renderer.render(scene, camera);
    raf = visible ? requestAnimationFrame(frame) : 0;
  };
  if (RM) { A.pose(1, 0); B.pose(1, 0); renderer.render(scene, camera); return; }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }).observe(stage);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  });
  raf = requestAnimationFrame(frame);
  // test hook: freeze at a time (used by screenshots)
  window.__phxHands = t => { visible = false; cancelAnimationFrame(raf); raf = 0; poseAt(t); renderer.render(scene, camera); };
}
