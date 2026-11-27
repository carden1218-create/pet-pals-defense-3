/* Pet Pals Defense 3 — chunky toon models built from merged primitives (2 draw calls each: toon body + outline hull) */
import * as THREE from "../vendor/three.module.min.js";

const grad = (() => {           // 3-step toon ramp
  const d = new Uint8Array([90, 90, 90, 255, 185, 185, 185, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
export const toonMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad });
export function outlineMat(w) {
  return new THREE.ShaderMaterial({
    uniforms: { w: { value: w }, col: { value: new THREE.Color("#2b1b22") } },
    vertexShader: "uniform float w; void main(){ vec3 p = position + normal * w; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }",
    fragmentShader: "uniform vec3 col; void main(){ gl_FragColor = vec4(col, 1.0); }",
    side: THREE.BackSide
  });
}
const OUT = outlineMat(0.032), OUT_BIG = outlineMat(0.022);

export class Kit {
  constructor() { this.parts = []; }
  add(geo, color, pos, rot, scl) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0])));
    m.compose(new THREE.Vector3(...(pos || [0, 0, 0])), q, new THREE.Vector3(...(Array.isArray(scl) ? scl : [scl || 1, scl || 1, scl || 1])));
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m);
    const c = new THREE.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "color"].includes(k)) g.deleteAttribute(k);
    this.parts.push(g); return this;
  }
  sph(r, color, pos, scl, rot) { return this.add(new THREE.SphereGeometry(r, 18, 14), color, pos, rot, scl); }
  cone(r, h, color, pos, rot, scl, seg) { return this.add(new THREE.ConeGeometry(r, h, seg || 10), color, pos, rot, scl); }
  cyl(r1, r2, h, color, pos, rot, scl, seg) { return this.add(new THREE.CylinderGeometry(r1, r2, h, seg || 12), color, pos, rot, scl); }
  tor(r, t, color, pos, rot, scl, arc) { return this.add(new THREE.TorusGeometry(r, t, 8, 22, arc || Math.PI * 2), color, pos, rot, scl); }
  coneN(r, h, color, pos, nrm) {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...nrm).normalize());
    const e = new THREE.Euler().setFromQuaternion(q); return this.cone(r, h, color, pos, [e.x, e.y, e.z]);
  }
  box(w, h, d, color, pos, rot, scl) { return this.add(new THREE.BoxGeometry(w, h, d), color, pos, rot, scl); }
  eyes(x, y, z, r, opt) {
    opt = opt || {};
    for (const s of [-1, 1]) {
      if (opt.white) this.sph(r * 1.55, "#ffffff", [s * x, y, z - 0.01], [1, 1, 0.55]);
      this.sph(r, opt.col || "#22161c", [s * x, y, z], [1, 1.12, 0.7]);
      this.sph(r * 0.36, "#ffffff", [s * x + r * 0.3, y + r * 0.38, z + r * 0.55]);
    }
    return this;
  }
  blush(x, y, z, col) { for (const s of [-1, 1]) this.sph(0.055, col || "#ff8aa0", [s * x, y, z], [1.3, 0.7, 0.4]); return this; }
  smile(y, z, col) { this.tor(0.05, 0.014, col || "#22161c", [0, y, z], [0, 0, Math.PI], 1, Math.PI); return this; }
  build(big) {
    let n = 0; for (const g of this.parts) n += g.attributes.position.count;
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3);
    let o = 0;
    for (const g of this.parts) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(P, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(N, 3)); geo.setAttribute("color", new THREE.BufferAttribute(C, 3));
    geo.computeBoundingSphere();
    return { geo, out: big ? OUT_BIG : OUT };
  }
}
const cache = new Map();
function inst(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  const { geo, out } = cache.get(key);
  const g = new THREE.Group();
  const body = new THREE.Mesh(geo, toonMat), hull = new THREE.Mesh(geo, out);
  const inner = new THREE.Group(); inner.add(body); inner.add(hull);
  g.add(inner); g.userData.inner = inner; g.userData.body = body;
  return g;
}
/* ---------- the 12 gen-1 pets (gen-1 palette + features) ---------- */
const BODY = (k, main, belly, opt) => {
  opt = opt || {};
  k.sph(0.42, main, [0, 0.4, 0], [1, opt.tall || 0.9, 0.95]);
  if (belly) k.sph(0.3, belly, [0, 0.33, 0.2], [1, 0.82, 0.6]);
  for (const s of [-1, 1]) k.sph(0.12, opt.foot || main, [s * 0.2, 0.07, 0.12], [1, 0.6, 1.2]);
  return k;
};
const PET_BUILD = {
  chili(k, p) { BODY(k, p.main, p.sub); k.eyes(0.15, 0.5, 0.36, 0.07).blush(0.27, 0.4, 0.3).smile(0.4, 0.4);
    k.cyl(0.04, 0.05, 0.2, p.stem, [0, 0.86, 0], [0.2, 0, 0.15]); k.sph(0.08, p.stem, [0.05, 0.8, 0], [1.6, 0.5, 1]);
    k.cone(0.07, 0.2, p.flame, [0.03, 1.04, 0]); k.cone(0.04, 0.12, "#fff27a", [0.03, 1.01, 0.02]);
    for (const s of [-1, 1]) k.sph(0.09, p.main, [s * 0.3, 0.72, -0.05], [0.7, 1, 0.5]); },
  chestnut(k, p) { k.sph(0.42, p.main, [0, 0.4, -0.04], [1.05, 0.88, 1]); k.sph(0.3, p.face, [0, 0.36, 0.2], [1.05, 0.85, 0.65]);
    for (const s of [-1, 1]) k.sph(0.11, p.dark, [s * 0.2, 0.07, 0.12], [1, 0.6, 1.2]);
    for (let i = 0; i < 26; i++) { const u = i / 26, th = Math.acos(1 - u * 1.25), ph = i * 2.39996;
      const nx = Math.sin(th) * Math.cos(ph), ny = Math.cos(th), nz = Math.sin(th) * Math.sin(ph);
      if (nz > 0.35 && ny < 0.75) continue;
      const nz2 = nz > 0 ? nz * 0.4 - 0.2 : nz;
      k.coneN(0.07, 0.24, i % 3 ? p.main : p.dark, [nx * 0.42, 0.42 + ny * 0.36, nz2 * 0.42 - 0.04], [nx, ny, nz2]); }
    k.eyes(0.14, 0.46, 0.38, 0.065).blush(0.25, 0.37, 0.32).sph(0.05, p.dark, [0, 0.39, 0.45]); },
  berry(k, p) { BODY(k, p.main, null); k.sph(0.26, "#fff0c0", [0, 0.32, 0.24], [1, 0.75, 0.5]);
    for (let i = 0; i < 9; i++) { const a = i * 2.4, yy = 0.2 + (i % 3) * 0.15; k.sph(0.025, p.seed, [Math.cos(a) * 0.4, yy + 0.1, Math.sin(a) * 0.36 - 0.05]); }
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; k.cone(0.08, 0.2, p.leaf, [Math.cos(a) * 0.2, 0.76, Math.sin(a) * 0.2], [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2]); }
    for (const s of [-1, 1]) { k.sph(0.08, p.ear, [s * 0.13, 1.0, -0.02], [0.75, 2.4, 0.6], [0, 0, -s * 0.18]); k.sph(0.05, "#ffb0c4", [s * 0.135, 1.0, 0.025], [0.6, 2.0, 0.3], [0, 0, -s * 0.18]); }
    k.eyes(0.14, 0.5, 0.37, 0.065).blush(0.26, 0.4, 0.31).smile(0.4, 0.41); },
  lychee(k, p) { k.sph(0.42, p.shell, [0, 0.42, 0], [1, 0.86, 0.95]); k.tor(0.36, 0.09, p.flesh, [0, 0.2, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; k.sph(0.07, p.tent, [Math.cos(a) * 0.32, 0.07, Math.sin(a) * 0.32], [1, 1.5, 1]); }
    for (let i = 0; i < 10; i++) { const a = i * 2.1, y = 0.5 + (i % 3) * 0.1; k.sph(0.03, p.dot, [Math.cos(a) * 0.34, y, Math.sin(a) * 0.3 - 0.06]); }
    k.cyl(0.03, 0.04, 0.14, "#4cba52", [0, 0.86, 0]); k.sph(0.27, p.flesh, [0, 0.38, 0.17], [1, 0.7, 0.55]);
    k.eyes(0.13, 0.44, 0.38, 0.065).blush(0.24, 0.35, 0.33).smile(0.35, 0.42); },
  melon(k, p) { k.sph(0.46, p.shell, [0, 0.36, -0.04], [1, 0.64, 1.02]);
    for (let i = -2; i <= 2; i++) k.sph(0.47, p.stripe, [i * 0.16, 0.36, -0.04], [0.06, 0.645, 1.03]);
    k.tor(0.43, 0.06, p.rim, [0, 0.16, -0.04], [Math.PI / 2, 0, 0]);
    k.sph(0.21, p.skin, [0, 0.4, 0.42]); for (const s of [-1, 1]) for (const zz of [-1, 1]) k.sph(0.1, p.skin, [s * 0.32, 0.08, zz * 0.24], [1, 0.7, 1]);
    k.eyes(0.08, 0.46, 0.58, 0.05).blush(0.14, 0.38, 0.56).smile(0.37, 0.61); },
  lemon(k, p) { BODY(k, p.main, "#ffffff", { foot: p.beak }); k.cone(0.07, 0.16, p.beak, [0, 0.43, 0.44], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) k.sph(0.13, p.dark, [s * 0.42, 0.38, 0], [0.4, 0.8, 0.9], [0, 0, s * 0.4]);
    k.box(0.08, 0.22, 0.05, p.bolt, [0.02, 0.92, 0], [0, 0, 0.5]); k.box(0.08, 0.22, 0.05, p.bolt, [-0.03, 1.08, 0], [0, 0, 0.5]); k.box(0.16, 0.05, 0.05, p.bolt, [0, 1.0, 0]);
    k.eyes(0.15, 0.53, 0.35, 0.065).blush(0.27, 0.43, 0.3); },
  coco(k, p) { BODY(k, p.fur, p.belly); k.sph(0.33, p.shell, [0, 0.72, -0.02], [1, 0.55, 1]); k.tor(0.3, 0.035, "#4a2a18", [0, 0.67, -0.02], [Math.PI / 2, 0, 0]);
    k.sph(0.12, p.leaf, [0.08, 0.96, 0], [1.8, 0.3, 0.8], [0, 0, 0.4]);
    for (const s of [-1, 1]) k.sph(0.07, p.fur, [s * 0.34, 0.68, 0.05]);
    k.sph(0.1, p.fur, [0, 0.12, -0.42], [0.9, 0.6, 1.8]); k.sph(0.06, "#3a2418", [0, 0.42, 0.42], [1.3, 0.9, 0.8]);
    k.eyes(0.15, 0.5, 0.37, 0.06).blush(0.26, 0.38, 0.33).sph(0.07, p.wave, [0.3, 0.16, 0.25], [1, 0.5, 1]); },
  taro(k, p) { BODY(k, p.fur, p.belly); for (const s of [-1, 1]) { k.sph(0.1, p.fur, [s * 0.28, 0.74, -0.02]); k.sph(0.055, p.belly, [s * 0.28, 0.75, 0.05]); }
    for (let i = 0; i < 7; i++) { const a = i * 1.9 + 0.6; k.sph(0.035, p.dot, [Math.cos(a) * 0.4, 0.3 + (i % 3) * 0.14, Math.sin(a) * 0.3 - 0.12]); }
    k.cyl(0.025, 0.03, 0.14, p.leaf, [0, 0.82, 0]); k.sph(0.08, p.leaf, [0.07, 0.9, 0], [1.6, 0.35, 1], [0, 0, 0.5]); k.sph(0.08, p.leaf, [-0.07, 0.9, 0], [1.6, 0.35, 1], [0, 0, -0.5]);
    k.sph(0.08, "#f2e6ff", [0, 0.38, 0.4], [1.3, 0.85, 0.7]); k.sph(0.035, "#3a2448", [0, 0.41, 0.46]);
    k.eyes(0.15, 0.5, 0.37, 0.06).blush(0.26, 0.38, 0.33); },
  peach(k, p) { BODY(k, p.fur, null); k.sph(0.3, p.face, [0, 0.4, 0.2], [1.05, 0.85, 0.6]);
    k.tor(0.2, 0.03, p.halo, [0, 1.0, 0], [Math.PI / 2 - 0.3, 0, 0]); k.sph(0.09, p.leaf, [0.12, 0.84, 0], [1.6, 0.4, 0.9], [0, 0, 0.5]);
    for (const s of [-1, 1]) k.sph(0.09, p.fur, [s * 0.4, 0.5, 0], [0.5, 1, 0.8]);
    k.tor(0.13, 0.04, p.fur, [0.3, 0.28, -0.38], [0, 0.8, 0], 1, Math.PI * 1.4); k.sph(0.06, p.petal, [-0.18, 0.8, 0.12], [1, 0.5, 1]);
    k.eyes(0.13, 0.48, 0.42, 0.06).blush(0.24, 0.38, 0.38).smile(0.38, 0.45); },
  blueberry(k, p) { BODY(k, p.main, null, { foot: p.beak, tall: 0.98 }); for (const s of [-1, 1]) k.sph(0.16, p.face, [s * 0.15, 0.5, 0.3], [1, 1, 0.45]);
    k.eyes(0.15, 0.5, 0.37, 0.08, { col: "#141030" }); k.cone(0.05, 0.12, p.beak, [0, 0.38, 0.42], [Math.PI / 2 + 0.3, 0, 0]);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; k.cone(0.06, 0.16, p.calyx, [Math.cos(a) * 0.1, 0.84, Math.sin(a) * 0.1], [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9]); }
    for (const s of [-1, 1]) { k.cone(0.08, 0.2, p.dark, [s * 0.3, 0.78, 0], [0, 0, -s * 0.5]); k.sph(0.14, p.dark, [s * 0.42, 0.35, -0.02], [0.4, 0.85, 0.9], [0, 0, s * 0.3]); }
    for (let i = 0; i < 5; i++) k.sph(0.03, p.face, [(i - 2) * 0.08, 0.2 + (i % 2) * 0.06, 0.4]); },
  pitaya(k, p) { BODY(k, p.main, p.belly); for (let i = 0; i < 5; i++) k.cone(0.07, 0.2, p.scale, [0, 0.82 - i * 0.12, -0.15 - i * 0.07], [-0.5 - i * 0.25, 0, 0]);
    for (const s of [-1, 1]) { k.cone(0.06, 0.16, p.scale, [s * 0.38, 0.55, 0.0], [0, 0, -s * 1.1]); k.sph(0.13, p.scale, [s * 0.36, 0.6, -0.2], [0.3, 0.9, 1], [0.3, 0, s * 0.4]); }
    k.sph(0.05, "#ffffff", [0.12, 0.48, 0.42]); k.cone(0.06, 0.16, p.flame, [0, 0.98, 0.05]);
    k.sph(0.11, p.main, [0, 0.14, -0.42], [0.8, 0.6, 1.6]); k.eyes(0.15, 0.52, 0.36, 0.06).blush(0.26, 0.4, 0.32); },
  mango(k, p) { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; k.sph(0.13, p.mane, [Math.cos(a) * 0.36, 0.48 + Math.sin(a) * 0.32, -0.02], [1, 1, 0.7]); }
    BODY(k, p.fur, null); k.sph(0.3, p.face, [0, 0.42, 0.22], [1, 0.85, 0.55]);
    for (const s of [-1, 1]) k.sph(0.07, p.fur, [s * 0.26, 0.8, 0.02]);
    k.sph(0.045, "#7a3a1a", [0, 0.42, 0.44], [1.3, 0.9, 0.8]); k.sph(0.09, p.leaf, [0.05, 0.92, -0.05], [1.6, 0.35, 0.9], [0, 0, 0.5]);
    k.eyes(0.14, 0.52, 0.39, 0.06).blush(0.25, 0.4, 0.35).smile(0.37, 0.45); }
};
export function petModel(def) { return inst("pet:" + def.id, () => { const k = new Kit(); PET_BUILD[def.id](k, def.pal); return k.build(); }); }

/* ---------- gen-2 protagonists: the same species, bigger, with a hero scarf + crown so they never read as a pet ---------- */
const HERO_PAL = {
  chili: ["chili", null], lemon: ["lemon", null], blueberry: ["blueberry", null], coco: ["coco", null], taro: ["taro", null], chestnut: ["chestnut", null]
};
export function heroModel(key, PET) {
  return inst("hero:" + key, () => {
    const k = new Kit(); const def = PET[HERO_PAL[key][0]];
    PET_BUILD[def.id](k, def.pal);
    k.tor(0.3, 0.055, "#e8323a", [0, 0.27, 0.04], [Math.PI / 2 + 0.15, 0, 0]);
    k.sph(0.08, "#e8323a", [0.2, 0.18, -0.3], [0.7, 1.4, 0.5], [0.4, 0, 0.3]);
    k.cyl(0.08, 0.09, 0.06, "#ffd23a", [-0.22, 0.8, 0.08], [0.2, 0, 0.45]);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; k.cone(0.022, 0.06, "#ffd23a", [-0.22 - 0.02 + Math.cos(a) * 0.065, 0.85, 0.08 + Math.sin(a) * 0.065], [0.2, 0, 0.45]); }
    if (key === "chestnut") { k.box(0.05, 0.62, 0.02, "#dff6ff", [0.46, 0.6, 0.1], [0, 0, -0.5]); k.box(0.18, 0.04, 0.05, "#ffd23a", [0.36, 0.38, 0.1], [0, 0, -0.5]); k.cyl(0.025, 0.025, 0.14, "#5e3a24", [0.31, 0.3, 0.1], [0, 0, -0.5]); }
    return k.build();
  });
}
export function mammothModel() {
  return inst("mammoth", () => { const k = new Kit();
    k.sph(0.5, "#8fb4d8", [0, 0.55, 0], [1.1, 0.9, 1.2]); k.sph(0.32, "#a6c8e8", [0, 0.68, 0.48]);
    for (const s of [-1, 1]) { k.sph(0.2, "#7a9cc4", [s * 0.36, 0.72, 0.38], [0.4, 1, 0.9]); k.cone(0.06, 0.5, "#fffbea", [s * 0.18, 0.42, 0.78], [1.9, 0, s * 0.3]);
      for (const zz of [-1, 1]) k.cyl(0.13, 0.15, 0.32, "#7a9cc4", [s * 0.3, 0.16, zz * 0.3]); }
    k.cyl(0.09, 0.05, 0.5, "#a6c8e8", [0, 0.42, 0.78], [0.5, 0, 0]); k.eyes(0.13, 0.78, 0.74, 0.055);
    k.sph(0.35, "#dff4ff", [0, 0.98, -0.1], [1, 0.3, 1.1]); return k.build(); });
}
/* ---------- slimes (gen-1 enemy colours) ---------- */
function shade(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return "#" + c.getHexString(); }
const SLIME_EXTRA = {
  sprout(k) { k.cyl(0.03, 0.035, 0.18, "#3f9a3a", [0, 0.82, 0]); k.sph(0.09, "#5ccf5a", [0.08, 0.9, 0], [1.7, 0.4, 1], [0, 0, 0.5]); k.sph(0.08, "#5ccf5a", [-0.08, 0.88, 0], [1.6, 0.4, 1], [0, 0, -0.5]); },
  ember(k) { k.cone(0.15, 0.36, "#ff8a2a", [0, 0.86, -0.02]); k.cone(0.08, 0.22, "#ffe14a", [0, 0.82, 0.04]); },
  zap(k) { k.box(0.09, 0.24, 0.05, "#3a8aff", [0.03, 0.88, 0], [0, 0, 0.5]); k.box(0.09, 0.24, 0.05, "#3a8aff", [-0.03, 1.04, 0], [0, 0, 0.5]); k.box(0.17, 0.06, 0.05, "#3a8aff", [0, 0.96, 0]); },
  pebble(k, c) { for (let i = 0; i < 7; i++) { const a = i * 2.2; k.add(new THREE.DodecahedronGeometry(0.13), shade(c, 0.8), [Math.cos(a) * 0.32, 0.3 + (i % 3) * 0.16, Math.sin(a) * 0.3 - 0.08]); } },
  puff(k) { k.cyl(0.008, 0.008, 0.5, "#ffffff", [0, -0.12, 0]); k.cone(0.05, 0.07, "#ff8ab8", [0, 0.1, 0], [Math.PI, 0, 0]); },
  split(k) { k.box(0.02, 0.5, 0.5, "#2a8870", [0, 0.48, 0.08]); },
  thief(k) { k.tor(0.37, 0.06, "#1a1022", [0, 0.5, 0.02], [Math.PI / 2, 0, 0]); k.sph(0.2, "#c8a26a", [0, 0.45, -0.42], [1, 1.1, 0.8]); k.sph(0.04, "#8a6a3a", [0, 0.64, -0.42]); },
  shield(k) { k.box(0.72, 0.62, 0.08, "#c8ccd8", [0, 0.4, 0.5], [-0.1, 0, 0]); k.box(0.5, 0.42, 0.1, "#8a94a6", [0, 0.4, 0.52], [-0.1, 0, 0]); k.sph(0.06, "#ffd23a", [0, 0.42, 0.58]); },
  spitter(k) { k.cyl(0.08, 0.11, 0.18, "#5aa82a", [0, 0.32, 0.4], [Math.PI / 2, 0, 0]); },
  mage(k) { k.cone(0.3, 0.6, "#3a1a7a", [0, 1.05, -0.02], [-0.15, 0, 0]); k.tor(0.3, 0.05, "#ffd23a", [0, 0.78, 0], [Math.PI / 2, 0, 0]); k.sph(0.05, "#ffe14a", [0, 1.36, -0.06]); },
  crown(k) { k.cyl(0.15, 0.17, 0.09, "#ffd23a", [0, 0.6, -0.2]); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; k.cone(0.04, 0.1, "#ffd23a", [Math.cos(a) * 0.14, 0.69, Math.sin(a) * 0.14 - 0.2]); k.sph(0.022, "#ff3a6a", [Math.cos(a) * 0.16, 0.605, Math.sin(a) * 0.16 - 0.2]); } },
  boss2(k) { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; k.add(new THREE.DodecahedronGeometry(0.15), "#6a7a6a", [Math.cos(a) * 0.38, 0.32 + (i % 2) * 0.12, Math.sin(a) * 0.35]); } },
  boss3(k) { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; k.cone(0.1, 0.3, "#ffb02e", [Math.cos(a) * 0.3, 0.64, Math.sin(a) * 0.3 - 0.05], [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6]); } },
  bossX(k) { for (const s of [-1, 1]) k.cone(0.07, 0.34, "#2a1040", [s * 0.3, 0.86, 0], [0, 0, -s * 0.5]); }
};
export function slimeModel(typ, def) {
  return inst("slime:" + typ, () => {
    const k = new Kit(), c = def.col;
    const fly = !!def.fly;
    k.sph(0.42, c, [0, fly ? 0.48 : 0.3, 0], fly ? [1, 1.05, 1] : [1.05, 0.78, 1.05]);
    if (!fly) k.cyl(0.43, 0.46, 0.08, shade(c, 0.82), [0, 0.04, 0]);
    k.sph(0.12, "#ffffff", [-0.17, fly ? 0.74 : 0.52, 0.22], [1.2, 0.6, 0.6], [0, 0, 0.5]);
    k.eyes(0.13, fly ? 0.5 : 0.36, 0.36, 0.06, { white: true });
    k.tor(0.06, 0.016, "#22161c", [0, fly ? 0.38 : 0.24, 0.42], [0.3, 0, Math.PI], 1, Math.PI);
    if (SLIME_EXTRA[typ]) SLIME_EXTRA[typ](k, c);
    if (def.boss) SLIME_EXTRA.crown(k);
    return k.build(def.boss);
  });
}
export function disposeCache() { for (const { geo } of cache.values()) geo.dispose(); cache.clear(); }
