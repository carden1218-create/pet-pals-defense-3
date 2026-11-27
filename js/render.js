/* three.js renderer: themed 3D field, toon pets/slimes/hero, big per-skill FX, 2D overlay (bars, numbers, words) */
import * as THREE from "../vendor/three.module.min.js";
import * as D from "./data.js";
import * as S from "./sim.js";
import * as M from "./models.js";
import { FX } from "./fx3d.js";
const { B } = S;
const { TILE, PET, ENEMY, LANE_X, FRONT_Y, BACK_Y, FENCE_Y } = D;
const rnd = Math.random, TAU = Math.PI * 2;
export const wx = (x) => (x - 270) / TILE, wz = (y) => (y - 400) / TILE;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const P3 = (x, y, h) => V(wx(x), h || 0, wz(y));

export const R = { ready: false, w: 1, h: 1, dpr: 1, theme: "", time: 0, mode: "title", low: false };
let renderer, scene, camera, fx, ground, decor, overlay, octx, fieldMat;
const views = { pets: new Map(), enemies: new Map(), shots: new Map(), hshots: new Map(), hz: new Map(), puddles: new Map(), comps: new Map(), drops: new Map() };
let heroView = null, titleGroup = null;

/* ---------- ground textures (crayon look, drawn in gen-1 field pixels) ---------- */
const THEMES = {
  orchard: { sky: "#bfe6ff", base: "#7cc35a", a: "#9ad66a", b: "#86ca5c", lane: "rgba(255,255,220,0.18)", edge: "#5aa840", fog: "#d8f0c8" },
  beach: { sky: "#aee4ff", base: "#f2d896", a: "#f7e2a8", b: "#eed08a", lane: "rgba(255,255,255,0.22)", edge: "#e0bd72", fog: "#e8f6ff" },
  volcano: { sky: "#5a3a4a", base: "#5a4a48", a: "#6e5a54", b: "#62504c", lane: "rgba(255,140,60,0.12)", edge: "#3e302e", fog: "#4a3438" }
};
function groundTexture(theme) {
  const th = THEMES[theme], S2 = 2, c = document.createElement("canvas"); c.width = 540 * S2; c.height = 760 * S2;
  const g = c.getContext("2d"); g.scale(S2, S2);
  g.fillStyle = th.base; g.fillRect(0, 0, 540, 760);
  const cs = 54;
  for (let y = 0; y < 760; y += cs) for (let x = 0; x < 540; x += cs) { g.fillStyle = ((x / cs + y / cs) | 0) % 2 ? th.a : th.b; g.fillRect(x, y, cs, cs); }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${theme === "volcano" ? "255,180,120" : "255,255,255"},${0.03 + rnd() * 0.05})`; g.fillRect(rnd() * 540, rnd() * 760, 1 + rnd() * 3, 1 + rnd() * 2); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + rnd() * 0.04})`; g.fillRect(rnd() * 540, rnd() * 760, 1 + rnd() * 2, 1 + rnd() * 3); }
  for (const lx of LANE_X) { g.fillStyle = th.lane; g.fillRect(lx - 34, 40, 68, 660); }
  if (theme === "beach") { for (let i = 0; i < 40; i++) { g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 2; g.beginPath(); const x = rnd() * 540, y = rnd() * 700; g.arc(x, y, 3 + rnd() * 4, 0, TAU); g.stroke(); } }
  if (theme === "volcano") { g.strokeStyle = "rgba(255,110,40,0.55)"; g.lineWidth = 3; for (let i = 0; i < 18; i++) { g.beginPath(); let x = rnd() * 540, y = rnd() * 700; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 40; y += rnd() * 26; g.lineTo(x, y); } g.stroke(); } }
  if (theme === "orchard") for (let i = 0; i < 60; i++) { g.fillStyle = ["#ffffff", "#ffe14a", "#ff8ab8"][i % 3]; const x = rnd() * 540, y = 60 + rnd() * 600; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.26) * 2.6, y + Math.sin(k * 1.26) * 2.6, 2, 0, TAU); g.fill(); } }
  // slot pads
  for (let i = 0; i < 10; i++) { const p = S.slotPos(i); g.fillStyle = "rgba(255,255,255,0.28)"; g.strokeStyle = "rgba(60,40,30,0.35)"; g.lineWidth = 3; g.beginPath(); g.ellipse(p.x, p.y + 4, 36, 30, 0, 0, TAU); g.fill(); g.setLineDash([6, 6]); g.stroke(); g.setLineDash([]); }
  // spawn gate
  g.fillStyle = "rgba(120,60,160,0.25)"; g.fillRect(70, 40, 400, 30);
  // hazard fence (gen-1 yellow/black)
  for (let x = 0; x < 540; x += 20) { g.fillStyle = (x / 20) % 2 ? "#2b1b22" : "#ffd23a"; g.beginPath(); g.moveTo(x, 704); g.lineTo(x + 20, 704); g.lineTo(x + 10, 720); g.lineTo(x - 10, 720); g.fill(); }
  g.fillStyle = "#2b1b22"; g.fillRect(0, 702, 540, 3); g.fillRect(0, 719, 540, 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function decorFor(theme) {
  const g = new THREE.Group();
  const k = () => new (M.Kit)();
  const sides = [];
  for (let i = 0; i < 9; i++) { sides.push([-3.75 - rnd() * 0.8, -3.7 + i * 0.95 + rnd() * 0.3]); sides.push([3.75 + rnd() * 0.8, -3.7 + i * 0.95 + rnd() * 0.3]); }
  for (let i = 0; i < 6; i++) sides.push([-3 + i * 1.2 + rnd() * 0.4, -4.75 - rnd() * 0.5]);
  for (const [x, z] of sides) {
    const kit = k(), s = 0.75 + rnd() * 0.4;
    if (theme === "orchard") { kit.cyl(0.1, 0.14, 0.7, "#8a5a32", [0, 0.35, 0]); kit.sph(0.5, "#4fae46", [0, 1.0, 0]); kit.sph(0.36, "#5cc052", [0.28, 0.85, 0.15]); kit.sph(0.34, "#46a03e", [-0.28, 0.9, -0.1]);
      for (let a = 0; a < 5; a++) kit.sph(0.08, "#ef3a3a", [Math.cos(a * 1.3) * 0.42, 0.85 + Math.sin(a * 2) * 0.2, Math.sin(a * 1.3) * 0.42 + 0.1]); }
    else if (theme === "beach") { if (rnd() < 0.6) { kit.cyl(0.07, 0.11, 1.3, "#b88a5a", [0, 0.65, 0], [0, 0, 0.12]); for (let a = 0; a < 6; a++) kit.sph(0.36, "#3fae5a", [Math.cos(a) * 0.32 + 0.08, 1.3, Math.sin(a) * 0.32], [1.4, 0.18, 0.5], [0, -a, -0.35]); kit.sph(0.08, "#7a5030", [0.08, 1.24, 0.08]); }
      else { kit.cyl(0.03, 0.03, 1, "#ffffff", [0, 0.5, 0]); kit.cone(0.6, 0.3, rnd() < 0.5 ? "#ff5a6a" : "#4ab0ff", [0, 1.05, 0], 0, 1, 12); kit.sph(0.2, "#f2c879", [0.3, 0.06, 0.2], [1.2, 0.3, 1]); } }
    else { kit.add(new THREE.DodecahedronGeometry(0.45), "#4a3a38", [0, 0.3, 0], [0, rnd() * 3, 0], [1, 0.8 + rnd() * 0.6, 1]); if (rnd() < 0.5) kit.sph(0.18, "#ff7a2a", [0.35, 0.08, 0.2], [1.4, 0.3, 1.2]); }
    const { geo, out } = kit.build(); const m = new THREE.Group(); m.add(new THREE.Mesh(geo, M.toonMat)); m.add(new THREE.Mesh(geo, out));
    m.position.set(x, 0, z); m.scale.setScalar(s); m.rotation.y = rnd() * TAU; g.add(m);
  }
  if (theme === "beach") { const sea = new THREE.Mesh(new THREE.PlaneGeometry(30, 6), new THREE.MeshBasicMaterial({ color: "#5ac4ff" })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.02, -8.2); g.add(sea); g.userData.sea = sea; }
  if (theme === "volcano") for (const x of [-4.5, 0.5, 5]) { const kit = k(); kit.cone(1.6, 2.4, "#5a3a34", [0, 1.2, 0], 0, 1, 9); kit.cyl(0.4, 0.55, 0.2, "#ff6a2a", [0, 2.3, 0]); const { geo, out } = kit.build(); const m = new THREE.Group(); m.add(new THREE.Mesh(geo, M.toonMat)); m.add(new THREE.Mesh(geo, out)); m.position.set(x, 0, -7); g.add(m); }
  // fence posts
  for (let i = 0; i <= 10; i++) { const kit = k(); kit.cyl(0.05, 0.06, 0.32, "#ffd23a", [0, 0.16, 0]); kit.sph(0.07, "#2b1b22", [0, 0.34, 0]); const { geo, out } = kit.build(); const m = new THREE.Group(); m.add(new THREE.Mesh(geo, M.toonMat)); m.add(new THREE.Mesh(geo, out)); m.position.set(wx(i * 54), 0, wz(712)); g.add(m); }
  return g;
}
export function setTheme(theme) {
  if (R.theme === theme) return; R.theme = theme;
  const th = THEMES[theme] || THEMES.orchard;
  scene.background = new THREE.Color(th.sky); scene.fog = new THREE.Fog(th.fog, 14, 30);
  if (fieldMat.map) fieldMat.map.dispose(); fieldMat.map = groundTexture(theme); fieldMat.needsUpdate = true;
  ground.material.color.set(th.edge);
  if (decor) { scene.remove(decor); decor.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  decor = decorFor(theme); scene.add(decor);
  R.hemi.intensity = theme === "volcano" ? 1.2 : 1.55; R.sun.color.set(theme === "volcano" ? "#ffc8a0" : "#ffffff");
}
/* ---------- camera: tilted top-down, fitted so the whole gen-1 field fills the view ---------- */
let EL = 56 * Math.PI / 180;
function fitCamera() {
  camera.aspect = R.w / R.h; camera.fov = 30; camera.updateProjectionMatrix();
  const port = R.w / R.h < 0.9; EL = (port ? 61 : 56) * Math.PI / 180;
  const xa = port ? 30 : 0, xb = port ? 510 : 540;
  const pts = []; for (const x of [xa, xb]) for (const y of [70, 735]) for (const h of [0, 0.95]) pts.push(P3(x, y, h));
  let cz = 0.25, dist = 14;
  for (let it = 0; it < 3; it++) {
    let lo = 4, hi = 60;
    for (let k = 0; k < 30; k++) { const d = (lo + hi) / 2; place(d, cz); if (fits(pts)) hi = d; else lo = d; }
    dist = hi; place(dist, cz);
    let y0 = 1, y1 = -1; for (const p of pts) { const q = p.clone().project(camera); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
    cz += ((y0 + y1) / 2) * dist * 0.18;
  }
  R.dist = dist; R.cz = cz;
  fx.setScale(R.h * R.dpr / (2 * Math.tan(camera.fov * Math.PI / 360)));
}
function place(d, cz) { camera.position.set(0, Math.sin(EL) * d, cz + Math.cos(EL) * d); camera.lookAt(0, 0, cz); camera.updateMatrixWorld(); }
function fits(pts) { for (const p of pts) { const q = p.clone().project(camera); if (Math.abs(q.x) > 0.985 || Math.abs(q.y) > 0.975) return false; } return true; }

export function init(canvas, ov) {
  overlay = ov; octx = ov.getContext("2d");
  R.low = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || Math.min(screen.width, screen.height) < 500;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !R.low || devicePixelRatio < 2, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  R.hemi = new THREE.HemisphereLight("#ffffff", "#7a8a5a", 1.55); scene.add(R.hemi);
  R.sun = new THREE.DirectionalLight("#ffffff", 2.3); R.sun.position.set(3, 9, 5); scene.add(R.sun);
  ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshLambertMaterial({ color: "#5aa840" })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; scene.add(ground);
  fieldMat = new THREE.MeshLambertMaterial({ color: "#ffffff" });
  const field = new THREE.Mesh(new THREE.PlaneGeometry(540 / TILE, 760 / TILE), fieldMat); field.rotation.x = -Math.PI / 2; field.position.set(0, 0, wz(380)); scene.add(field);
  fx = new FX(scene, camera); if (R.low) fx.q = 0.7;
  R.fx = fx; R.scene = scene; R.camera = camera; R.renderer = renderer;
  buildShared();
  setTheme("orchard");
  R.ready = true;
}
export function resize(w, h) {
  R.w = Math.max(1, w); R.h = Math.max(1, h);
  R.dpr = Math.min(devicePixelRatio || 1, R.low ? 1.75 : 2);
  renderer.setPixelRatio(R.dpr); renderer.setSize(R.w, R.h, false);
  overlay.width = Math.round(R.w * R.dpr); overlay.height = Math.round(R.h * R.dpr);
  fitCamera();
}

/* ---------- shared projectile / zone meshes ---------- */
const SH = {};
function kitMesh(fn, big) { const k = new M.Kit(); fn(k); const { geo, out } = k.build(big); return () => { const g = new THREE.Group(); g.add(new THREE.Mesh(geo, M.toonMat)); g.add(new THREE.Mesh(geo, out)); return g; }; }
function addMat(col, op) { return new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op == null ? 0.8 : op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); }
function glowSprite(col, s) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: SH.glowTex, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(s); sp.renderOrder = 24; return sp; }
function buildShared() {
  SH.glowTex = fx.flashes[0].s.material.map;
  SH.shadowGeo = new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2);
  SH.shadowMat = new THREE.MeshBasicMaterial({ color: "#1a1020", transparent: true, opacity: 0.22, depthWrite: false });
  SH.seed = kitMesh(k => { k.sph(0.09, "#ff5a2a", [0, 0, 0]); k.cone(0.06, 0.16, "#ffd23a", [0, 0.1, 0]); });
  SH.roll = kitMesh(k => { k.sph(0.18, "#9a5e36", [0, 0, 0]); for (let i = 0; i < 14; i++) { const t = Math.acos(1 - 2 * (i + 0.5) / 14), p = i * 2.4; const n = [Math.sin(t) * Math.cos(p), Math.cos(t), Math.sin(t) * Math.sin(p)]; k.coneN(0.05, 0.16, "#5e3a24", n.map(v => v * 0.18), n); } });
  SH.drop = kitMesh(k => { k.sph(0.07, "#6ad0ff", [0, 0, 0]); k.cone(0.05, 0.1, "#6ad0ff", [0, 0.07, 0]); });
  SH.peach = kitMesh(k => { k.sph(0.13, "#ffaa9a", [0, 0, 0]); k.sph(0.06, "#5cbf5a", [0.05, 0.12, 0], [1.6, 0.4, 0.8]); k.sph(0.05, "#ff7a8a", [0.06, 0.02, 0.1]); });
  SH.feather = kitMesh(k => { k.sph(0.07, "#c4d6ff", [0, 0, 0], [0.7, 0.4, 3.2]); k.sph(0.04, "#7a9aff", [0, 0.02, -0.06], [0.5, 0.3, 2.4]); });
  SH.meteor = kitMesh(k => { k.add(new THREE.DodecahedronGeometry(0.26), "#ff4f9a", [0, 0, 0]); k.sph(0.16, "#ffd23a", [0.08, 0.1, 0.1]); });
  SH.pip = kitMesh(k => { k.sph(0.06, "#3fa84d", [0, 0, 0], [1, 1, 1.4]); });
  SH.rock = kitMesh(k => { k.add(new THREE.DodecahedronGeometry(0.3), "#8c7464", [0, 0, 0]); k.add(new THREE.DodecahedronGeometry(0.16), "#a88a74", [0.18, 0.12, 0.05]); });
  SH.snow = kitMesh(k => { for (let i = 0; i < 3; i++) k.box(0.5, 0.06, 0.06, "#e4f7ff", [0, 0, 0], [0, i * Math.PI / 3, 0]); k.sph(0.1, "#72d8ff", [0, 0, 0]); });
  SH.sword = kitMesh(k => { k.box(0.07, 0.03, 0.62, "#e8fbff", [0, 0, 0.12]); k.cone(0.05, 0.12, "#e8fbff", [0, 0, 0.48], [Math.PI / 2, 0, 0]); k.box(0.24, 0.05, 0.05, "#ffd23a", [0, 0, -0.2]); k.cyl(0.03, 0.03, 0.18, "#5e3a24", [0, 0, -0.3], [Math.PI / 2, 0, 0]); });
  SH.bigSword = kitMesh(k => { k.box(0.16, 0.05, 1.3, "#e8fbff", [0, 0, 0.3]); k.cone(0.11, 0.26, "#e8fbff", [0, 0, 1.06], [Math.PI / 2, 0, 0]); k.box(0.5, 0.08, 0.09, "#ffd23a", [0, 0, -0.38]); k.cyl(0.05, 0.05, 0.34, "#5e3a24", [0, 0, -0.58], [Math.PI / 2, 0, 0]); k.sph(0.06, "#ff3a6a", [0, 0, -0.38]); });
  SH.cloud = kitMesh(k => { k.sph(0.36, "#f4f6ff", [0, 0, 0]); k.sph(0.28, "#e6eaff", [0.34, -0.05, 0.05]); k.sph(0.27, "#e6eaff", [-0.34, -0.06, 0.02]); k.sph(0.22, "#ffffff", [0.1, 0.2, 0.1]); });
  SH.darkCloud = kitMesh(k => { k.sph(0.6, "#4a4a6a", [0, 0, 0]); k.sph(0.48, "#3e3e5a", [0.6, -0.1, 0.05]); k.sph(0.48, "#3e3e5a", [-0.6, -0.1, 0.02]); k.sph(0.38, "#56567a", [0.2, 0.34, 0.1]);
    for (const s of [-1, 1]) { k.sph(0.11, "#ffffff", [s * 0.2, 0.02, 0.52], [1, 0.75, 0.4]); k.sph(0.05, "#1a1022", [s * 0.18, 0.0, 0.58]); k.box(0.22, 0.05, 0.05, "#1a1022", [s * 0.2, 0.15, 0.56], [0, 0, s * 0.45]); }
    k.tor(0.12, 0.03, "#1a1022", [0, -0.2, 0.55], [0, 0, 0], 1, Math.PI); }, true);
  SH.ice = kitMesh(k => { k.box(0.8, 0.6, 0.8, "#bfeaff", [0, 0.3, 0]); k.box(0.3, 0.2, 0.05, "#ffffff", [-0.18, 0.42, 0.41]); });
  SH.ship = kitMesh(k => { k.box(1.6, 0.4, 0.6, "#8a5a32", [0, 0.2, 0]); k.cone(0.3, 0.6, "#8a5a32", [0.95, 0.2, 0], [0, 0, -Math.PI / 2], [1, 1, 1]); k.cyl(0.04, 0.04, 1.4, "#5e3a24", [0, 1, 0]); k.box(0.05, 0.8, 0.9, "#f4f0e0", [0.1, 1.1, 0], [0, 0, 0.1]); });
  SH.mountain = kitMesh(k => { k.cone(1.3, 1.9, "#7a5a44", [0, 0.95, 0], 0, 1, 9); k.cyl(0.32, 0.42, 0.18, "#ff6a2a", [0, 1.85, 0]); k.cone(0.5, 0.5, "#5a4234", [0.8, 0.25, 0.3], 0, 1, 7); k.cone(0.45, 0.45, "#5a4234", [-0.7, 0.22, 0.5], 0, 1, 7); }, true);
  SH.spire = kitMesh(k => { k.cone(0.32, 1.5, "#8c7464", [0, 0.75, 0], 0, 1, 7); k.cone(0.18, 0.6, "#a88a74", [0.25, 0.3, 0.1], [0, 0, -0.3], 1, 6); });
  SH.icicle = kitMesh(k => { k.cone(0.12, 0.7, "#cfefff", [0, 0, 0], [Math.PI, 0, 0], 1, 6); });
  SH.dragonSeg = kitMesh(k => { k.sph(0.2, "#ff5a2a", [0, 0, 0]); k.cone(0.07, 0.18, "#ffd23a", [0, 0.18, 0]); });
  SH.dragonHead = kitMesh(k => { k.sph(0.3, "#ff4a1f", [0, 0, 0], [1, 0.9, 1.2]); k.sph(0.16, "#ffb02e", [0, -0.05, 0.28], [1.2, 0.7, 1]); k.eyes(0.13, 0.12, 0.24, 0.05, { white: true }); for (const s of [-1, 1]) k.cone(0.05, 0.25, "#ffd23a", [s * 0.15, 0.3, -0.1], [-0.6, 0, -s * 0.3]); });
  SH.rubble = kitMesh(k => { for (let i = 0; i < 5; i++) k.add(new THREE.DodecahedronGeometry(0.14 + (i % 2) * 0.06), i % 2 ? "#8c7464" : "#a88a74", [Math.cos(i * 1.3) * 0.3, 0.08, Math.sin(i * 1.3) * 0.3]); });
  SH.bubbleMat = new THREE.MeshToonMaterial({ color: "#bfe6ff", transparent: true, opacity: 0.42, depthWrite: false, gradientMap: M.toonMat.gradientMap });
  SH.bubbleGeo = new THREE.SphereGeometry(0.5, 20, 16);
  SH.shieldMat = new THREE.MeshBasicMaterial({ color: "#7fe07a", transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false });
  SH.iceMat = new THREE.MeshToonMaterial({ color: "#bfeaff", transparent: true, opacity: 0.55, depthWrite: false, gradientMap: M.toonMat.gradientMap });
  SH.box = new THREE.BoxGeometry(1, 1, 1);
  SH.disc = new THREE.CircleGeometry(1, 36).rotateX(-Math.PI / 2);
  SH.ringG = new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2);
  SH.sector = (ang) => new THREE.CircleGeometry(1, 24, -ang / 2, ang).rotateX(-Math.PI / 2);
  SH.wing = kitMesh(k => { for (const s of [-1, 1]) k.sph(0.2, "#ffffff", [s * 0.36, 0.55, -0.15], [1.4, 0.4, 0.8], [0, 0, -s * 0.4]); });
  SH.iceFloor = new THREE.Mesh(new THREE.PlaneGeometry(540 / TILE, 640 / TILE), new THREE.MeshBasicMaterial({ color: "#bfeaff", transparent: true, opacity: 0, depthWrite: false }));
  SH.iceFloor.rotation.x = -Math.PI / 2; SH.iceFloor.position.set(0, 0.012, wz(400)); scene.add(SH.iceFloor);
  SH.heroRing = new THREE.Mesh(SH.ringG, addMat("#ffd23a", 0.9)); SH.heroRing.renderOrder = 5;
}
const shadow = (s) => { const m = new THREE.Mesh(SH.shadowGeo, SH.shadowMat); m.scale.setScalar(s); m.position.y = 0.015; m.renderOrder = 1; return m; };
function ownMat(g) { const body = g.userData.body; body.material = M.toonMat.clone(); body.material.emissive = new THREE.Color(0); return body.material; }

/* ---------- entity sync ---------- */
function syncPets(dt) {
  const seen = new Set();
  for (const t of B.towers) {
    seen.add(t);
    let v = views.pets.get(t);
    if (!v || v.id !== t.id) {
      if (v) scene.remove(v.root);
      const root = new THREE.Group(), g = M.petModel(PET[t.id]); const mat = ownMat(g);
      g.userData.inner.rotation.x = -0.22;
      const sh = new THREE.Mesh(SH.bubbleGeo, SH.shieldMat); sh.scale.setScalar(1.25); sh.position.y = 0.45; sh.visible = false;
      const wing = SH.wing(); wing.visible = false;
      root.add(g, shadow(0.95), sh, wing); scene.add(root);
      v = { root, g, mat, sh, wing, id: t.id, hop: 0 }; views.pets.set(t, v);
    }
    const fly = t.flyT > 0 ? 0.65 + Math.sin(R.time * 3 + t.ph) * 0.08 : 0;
    v.root.position.set(wx(t.x), 0, wz(t.y));
    const b = t.bounce || 0, pop = t.pop || 0, tierS = 0.86 * (1 + (t.tier - 1) * 0.05);
    const idle = Math.sin(R.time * 3 + t.ph) * 0.03;
    v.g.position.y = fly + Math.max(0, Math.sin(b * Math.PI)) * (PET[t.id].typ === "slam" ? 0.35 : 0.12);
    v.g.scale.set(tierS * (1 + b * 0.12 + pop * 0.3 - idle), tierS * (1 - b * 0.1 + pop * 0.3 + idle), tierS * (1 + b * 0.12 + pop * 0.3 - idle));
    v.g.rotation.z = t.fainted ? 1.35 : 0; v.g.position.x = t.fainted ? 0.2 : 0;
    v.mat.color.setScalar(t.fainted ? 0.55 : 1);
    v.mat.emissive.setRGB(t.hurtT > 0 ? 0.5 : (t.fireT > 0 ? 0.18 : 0), t.hurtT > 0 ? 0.1 : (t.jamT > 0 ? 0.2 : 0.05 * (t.fireT > 0)), t.hurtT > 0 ? 0.1 : 0);
    if (t.aimX != null && !t.fainted) { const a = Math.atan2(wx(t.aimX) - wx(t.x), wz(t.aimY) - wz(t.y)); v.g.rotation.y += ((a * 0.45) - v.g.rotation.y) * Math.min(1, dt * 8); }
    v.sh.visible = t.shield > 0 && !t.fainted; if (v.sh.visible) { v.sh.material.opacity = 0.18 + 0.1 * Math.sin(R.time * 6); }
    v.wing.visible = t.flyT > 0; if (v.wing.visible) { v.wing.position.y = fly; v.wing.scale.y = 1 + Math.sin(R.time * 18) * 0.35; }
    if (t.fireT > 0 && rnd() < 0.5) fx.trail(wx(t.x) + (rnd() - 0.5) * 0.5, 0.3 + fly, wz(t.y), rnd() < 0.5 ? "#ff8a3a" : "#ffd23a", 0.22, 0.5, { up: 2 });
    if (t.swapT > 0 && rnd() < 0.3) fx.trail(wx(t.x) + Math.cos(R.time * 5) * 0.45, 0.2 + fly, wz(t.y) + Math.sin(R.time * 5) * 0.3, D.ELEM_COL[t.swapEl] || "#c89aff", 0.2, 0.5);
    if (t.berryT > 0) { t.berryT -= dt; if (rnd() < 0.2) fx.trail(wx(t.x), 0.9, wz(t.y), "#ff6e8c", 0.18, 0.6, { up: 1.5 }); }
  }
  for (const [t, v] of views.pets) if (!seen.has(t)) { scene.remove(v.root); views.pets.delete(t); }
}
function syncEnemies(dt) {
  const seen = new Set();
  for (const e of B.enemies) {
    if (e.hp <= 0) continue; seen.add(e);
    let v = views.enemies.get(e);
    if (!v) {
      const root = new THREE.Group(), def = ENEMY[e.typ], g = M.slimeModel(e.typ, def), mat = ownMat(g);
      g.userData.inner.rotation.x = -0.25;
      const s = def.size / 80 * (e.elite ? 1.12 : 1);
      const ice = new THREE.Mesh(SH.box, SH.iceMat); ice.visible = false; ice.scale.set(0.95, 0.85, 0.95); ice.position.y = 0.4;
      const bub = new THREE.Mesh(SH.bubbleGeo, SH.bubbleMat); bub.visible = false; bub.scale.setScalar(1.3); bub.position.y = 0.45;
      const inner = new THREE.Group(); inner.add(g, ice, bub); inner.scale.setScalar(s);
      root.add(inner, shadow(s * 0.95));
      if (e.elite) { const r = new THREE.Mesh(SH.ringG, addMat("#ffd23a", 0.7)); r.scale.setScalar(s * 0.6); r.position.y = 0.03; root.add(r); }
      scene.add(root);
      v = { root, inner, g, mat, ice, bub, s, born: R.time }; views.enemies.set(e, v);
    }
    const def = ENEMY[e.typ];
    v.root.position.set(wx(e.x), 0, wz(e.y));
    const moving = !e.biting && !(e.frozenT > 0) && !(e.stunT > 0) && !e.petrified && !(e.bubbleT > 0);
    const hop = moving ? Math.abs(Math.sin(R.time * (def.boss ? 4 : 7) + e.ph)) : 0;
    const bite = e.biting ? Math.max(0, Math.sin(R.time * 6.3 + e.ph)) : 0;
    const sq = e.squash || 0;
    const fly = def.fly ? 0.75 + Math.sin(R.time * 2 + e.ph) * 0.1 : 0;
    const appear = Math.min(1, (R.time - v.born) * 4);
    v.g.position.y = fly + hop * 0.14 + (e.bubbleT > 0 ? 0.5 + Math.sin(R.time * 4) * 0.08 : 0);
    v.g.position.z = bite * 0.18;
    v.g.scale.set((1 + sq * 0.22 + (1 - hop) * 0.06) * appear, (1 - sq * 0.2 + hop * 0.1) * appear, (1 + sq * 0.22) * appear);
    const stone = e.petrified;
    if (stone) v.mat.color.setRGB(0.55, 0.52, 0.5); else if (e.slow2T > 0 || e.slowT > 0) v.mat.color.setRGB(0.75, 0.88, 1.1); else v.mat.color.setScalar(1);
    const flash = e.hitT > 0 ? e.hitT / 0.12 : 0, rage = e.enraged ? 0.18 + 0.12 * Math.sin(R.time * 10) : 0;
    v.mat.emissive.setRGB(flash * 0.9 + rage, flash * 0.9 + (e.paralyzeT > 0 ? 0.25 * (Math.sin(R.time * 30) > 0) : 0), flash * 0.9);
    v.ice.visible = e.frozenT > 0; v.bub.visible = e.bubbleT > 0;
    if (v.bub.visible) v.bub.position.y = v.g.position.y + 0.42;
    if (e.burnT > 0 && rnd() < 0.45) fx.trail(wx(e.x) + (rnd() - 0.5) * 0.4, 0.4 * v.s, wz(e.y), rnd() < 0.5 ? "#ff6a2a" : "#ffd23a", 0.2, 0.45, { up: 2.2 });
    if (e.hburnT > 0 && rnd() < 0.5) fx.trail(wx(e.x) + (rnd() - 0.5) * 0.4, 0.45 * v.s, wz(e.y), "#ff4b1f", 0.24, 0.45, { up: 2.4 });
    if (e.paralyzeT > 0 && rnd() < 0.25) { const a = V(wx(e.x) + (rnd() - 0.5) * 0.6, 0.7 * v.s, wz(e.y)); fx.bolt(a, a.clone().add(V((rnd() - 0.5) * 0.5, 0.4, (rnd() - 0.5) * 0.3)), "#ffe944", 0.1, { w: 0.06, jit: 0.15, fork: false }); }
    if (e.soakedT > 0 && rnd() < 0.15) fx.solidTrail(wx(e.x), 0.6 * v.s, wz(e.y), "#5cd0ff", 0.12, 0.5, { grav: 6 });
    if (e.rockShell > 0 && !stone && rnd() < 0.08) fx.solidTrail(wx(e.x), 0.5, wz(e.y), "#a88a74", 0.12, 0.5, { grav: 6, floor: true });
  }
  for (const [e, v] of views.enemies) if (!seen.has(e)) { scene.remove(v.root); views.enemies.delete(e); }
}
function syncHero(dt) {
  const h = B.hero;
  if (!h) { if (heroView) { scene.remove(heroView.root); heroView = null; } return; }
  if (!heroView || heroView.key !== h.key) {
    if (heroView) scene.remove(heroView.root);
    const root = new THREE.Group(), g = M.heroModel(h.key, PET), mat = ownMat(g);
    g.userData.inner.rotation.x = -0.18; g.scale.setScalar(1.28);
    const ring = SH.heroRing.clone(); ring.material = addMat(h.def.burstCol, 0.85); ring.scale.setScalar(0.62);
    const board = SH.bigSword(); board.rotation.y = Math.PI / 2; board.visible = false; board.scale.setScalar(0.9);
    root.add(g, shadow(1.15), ring, board); scene.add(root);
    heroView = { root, g, mat, ring, board, key: h.key, rotY: 0 };
  }
  const v = heroView;
  v.root.visible = !(h.deadT > 0);
  v.root.position.set(wx(h.x), 0, wz(h.y));
  const moving = Math.hypot(h.vx || 0, h.vy || 0) > 5;
  const want = moving || h.dash ? Math.atan2(Math.cos(h.facing), Math.sin(h.facing)) : 0;
  let d = want - v.rotY; d = Math.atan2(Math.sin(d), Math.cos(d)); v.rotY += d * Math.min(1, dt * 12);
  v.g.rotation.y = v.rotY;
  const ride = h.ridingSwordT > 0;
  const hop = moving ? Math.abs(Math.sin(h.walk * 0.9)) * 0.16 : Math.sin(R.time * 3) * 0.02;
  v.g.position.y = hop + (ride ? 0.55 + Math.sin(R.time * 4) * 0.06 : 0) + (h.lungeZ || 0) * 1.4;
  const rc = h.recoil || 0;
  v.g.scale.set(1.28 * (1 + rc * 0.08), 1.28 * (1 - rc * 0.08), 1.28 * (1 + rc * 0.08));
  v.board.visible = ride; v.board.position.y = v.g.position.y - 0.05; v.board.rotation.y = v.rotY + Math.PI / 2;
  v.ring.rotation.y += dt * 2; v.ring.material.opacity = 0.55 + 0.3 * Math.sin(R.time * 5);
  v.mat.emissive.setScalar(h.hurtT > 0 ? 0.6 : 0);
  v.g.visible = !(h.invulnT > 0.36 && Math.sin(R.time * 40) > 0);
  if (moving && rnd() < 0.35) fx.solidTrail(wx(h.x), 0.05, wz(h.y), R.theme === "beach" ? "#f7e2a8" : R.theme === "volcano" ? "#6e5a54" : "#b8e08a", 0.14, 0.4, { up: 0.6 });
  if (h.dash && rnd() < 0.9) fx.trail(wx(h.x), 0.5, wz(h.y), "#5cf2ff", 0.4, 0.3);
  if (ride && rnd() < 0.8) fx.trail(wx(h.x) - Math.cos(h.facing) * 0.4, 0.5, wz(h.y) - Math.sin(h.facing) * 0.4, rnd() < 0.5 ? "#5cf2ff" : "#ffffff", 0.3, 0.4);
}
function syncComps(dt) {
  const seen = new Set();
  for (const c of B.comps) {
    seen.add(c); let v = views.comps.get(c);
    if (!v) { const root = new THREE.Group(), mam = c.key === "mammoth", g = mam ? M.mammothModel() : M.heroModel(c.key, PET);
      g.userData.inner.rotation.x = -0.2; g.scale.setScalar(mam ? 1.0 : 0.72); root.add(g, shadow(mam ? 1.1 : 0.7)); scene.add(root);
      v = { root, g, mam }; views.comps.set(c, v); fx.burst(wx(c.x), 0.5, wz(c.y), "#ffffff", 20, { spd: 2 }); fx.ring(wx(c.x), wz(c.y), 0.2, 1.1, "#ffffff", 0.4); }
    v.root.position.set(wx(c.x), Math.abs(Math.sin((c.walk || 0) * 0.9)) * 0.12, wz(c.y));
    v.g.rotation.y = Math.atan2(Math.cos(c.facing || 0), Math.sin(c.facing || 0)) * 0.6;
    if (c.temp && c.ttl < 2) v.root.visible = Math.sin(R.time * 30) > -0.3;
  }
  for (const [c, v] of views.comps) if (!seen.has(c)) { scene.remove(v.root); views.comps.delete(c); fx.burst(wx(c.x), 0.5, wz(c.y), "#ffffff", 14); }
}

/* ---------- projectiles & zones ---------- */
function syncList(map, list, make, upd, gone) {
  const seen = new Set();
  for (const o of list) { seen.add(o); let v = map.get(o); if (!v) { v = make(o); if (!v) continue; map.set(o, v); if (v.root) scene.add(v.root); } upd(o, v); }
  for (const [o, v] of map) if (!seen.has(o)) { if (gone) gone(o, v); if (v.root) { scene.remove(v.root); v.root.traverse(q => { if (q.userData.dispose) q.geometry.dispose(); }); } map.delete(o); }
}
function withGlow(mesh, col, s) { const r = new THREE.Group(); r.add(mesh); if (col) { const gl = glowSprite(col, s); r.add(gl); r.userData.glow = gl; } return r; }
function syncShots() {
  syncList(views.shots, B.shots, (s) => {
    const k = s.kind; let m;
    if (k === "seed") m = withGlow(SH.seed(), "#ff6a2e", 0.7);
    else if (k === "roll") m = withGlow(SH.roll(), null);
    else if (k === "bubble") { const b = new THREE.Mesh(SH.bubbleGeo, SH.bubbleMat); b.scale.setScalar(0.45); m = withGlow(b, "#bfe6ff", 0.6); }
    else if (k === "drop") m = withGlow(SH.drop(), "#8fdcff", 0.4);
    else if (k === "peach") m = withGlow(SH.peach(), "#ffd25a", 0.6);
    else if (k === "feather") m = withGlow(SH.feather(), "#7a9aff", 0.8);
    else if (k === "meteor") m = withGlow(SH.meteor(), "#ff4f9a", 1.8);
    else m = withGlow(SH.pip(), "#7fe07a", 0.35);
    if (k === "roll" && s.big) m.scale.setScalar(1.4);
    return { root: m, k };
  }, (s, v) => {
    const k = v.k; let h = 0.45;
    if (k === "meteor") { const L = Math.hypot(s.tx - s.sx, s.ty - s.sy) || 1, p = 1 - Math.hypot(s.tx - s.x, s.ty - s.y) / L; h = 3.2 * (1 - p) + 0.2; v.root.rotation.x += 0.3;
      for (let i = 0; i < 3; i++) fx.trail(wx(s.x), h, wz(s.y), i ? "#ffd23a" : "#ff4f9a", 0.55, 0.45, { up: 0.5, jit: 0.2 }); fx.solidTrail(wx(s.x), h, wz(s.y), "#5a3a34", 0.14, 0.5); }
    else if (k === "peach" || k === "bubble") { const L = Math.hypot(s.tx - (s.sx ?? s.x), s.ty - (s.sy ?? s.y)) || 1, p = 1 - Math.hypot(s.tx - s.x, s.ty - s.y) / Math.max(L, 1); h = 0.45 + Math.sin(Math.min(1, Math.max(0, p)) * Math.PI) * (k === "peach" ? 1.1 : 0.4); }
    if (k === "roll") { h = 0.2; v.root.rotation.x -= 0.4; if (rnd() < 0.6) fx.solidTrail(wx(s.x), 0.05, wz(s.y), "#c8b29c", 0.12, 0.4, { up: 1 }); }
    if (k === "seed") { fx.trail(wx(s.x), h, wz(s.y), rnd() < 0.5 ? "#ff6a2e" : "#ffd23a", 0.3, 0.3); }
    if (k === "feather") { v.root.rotation.y = Math.atan2(s.vx, s.vy); fx.trail(wx(s.x), h, wz(s.y), "#c89aff", 0.35, 0.35, { jit: 0.02 }); fx.trail(wx(s.x), h, wz(s.y), "#ffffff", 0.18, 0.2, { jit: 0.02 }); }
    if (k === "drop") fx.trail(wx(s.x), h, wz(s.y), "#8fdcff", 0.16, 0.25);
    if (k === "peach") { v.root.rotation.z += 0.2; if (rnd() < 0.4) fx.trail(wx(s.x), h, wz(s.y), "#ff8ac0", 0.2, 0.4); }
    if (s.ty != null && k !== "feather" && k !== "roll") v.root.rotation.y = Math.atan2(wx(s.tx) - wx(s.x), wz(s.ty) - wz(s.y));
    v.root.position.set(wx(s.x), h, wz(s.y));
  });
}
const HCOL = { fire: ["#ff4b1f", "#ffe24a"], frost: ["#72d8ff", "#e4f7ff"], water: ["#2d9cff", "#e4f8ff"], rock: ["#c9925a", "#e8d6c0"], lightning: ["#ffe944", "#269ef5"], slash: ["#5cf2ff", "#ffffff"] };
function syncHeroShots() {
  syncList(views.hshots, B.hshots, (s) => {
    const k = s.kind, c = HCOL[s.fk] || HCOL.fire, big = s.big || 1; let m;
    if (k === "fireTornado") { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.12 + i * 0.07, 0.035, 6, 18), addMat(i % 2 ? "#ffe24a" : "#ff4b1f", 0.9)); t.geometry.rotateX(Math.PI / 2); t.position.y = i * 0.16; t.userData.dispose = true; g.add(t); } m = withGlow(g, "#ff6d28", 1.1); }
    else if (k === "snowflake") m = withGlow(SH.snow(), "#72d8ff", 0.9);
    else if (k === "whirlWave") { const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.08, 8, 24), addMat("#5cd0ff", 0.85)); t.geometry.rotateX(Math.PI / 2); t.userData.dispose = true; g.add(t); m = withGlow(g, "#2d9cff", 1); }
    else if (k === "skyRock") m = withGlow(SH.rock(), null);
    else if (k === "cloudBolt") m = withGlow(SH.cloud(), "#fff454", 0.7);
    else if (k === "sword") m = withGlow(SH.sword(), "#5cf2ff", 0.6);
    else m = withGlow(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), addMat(c[1], 1)), c[0], 0.5);
    m.scale.multiplyScalar(big * (s.comp ? 0.7 : 1));
    return { root: m, k, c };
  }, (s, v) => {
    const k = v.k, p = s.p || 0, c = v.c; let h = 0.5;
    if (k === "skyRock") { h = 4.2 * (1 - p) + 0.2; v.root.rotation.x += 0.2; v.root.rotation.z += 0.13; fx.trail(wx(s.x), h + 0.2, wz(s.y), "#e8d6c0", 0.35, 0.35); }
    else if (k === "cloudBolt") { h = 2.2; v.root.position.set(wx(s.tx ?? s.x), h, wz(s.ty ?? s.y)); if (rnd() < 0.5) fx.trail(wx(s.tx ?? s.x) + (rnd() - 0.5) * 0.6, h, wz(s.ty ?? s.y), "#fff454", 0.18, 0.2); return; }
    else if (k === "fireTornado") { v.root.rotation.y += 0.5; h = 0.1; for (let i = 0; i < 2; i++) fx.trail(wx(s.x) + Math.cos(R.time * 20 + i * 3) * 0.25, 0.15 + rnd() * 0.6, wz(s.y) + Math.sin(R.time * 20 + i * 3) * 0.25, i ? "#ffe24a" : "#ff4b1f", 0.32, 0.35, { up: 1.5 }); }
    else if (k === "snowflake") { v.root.rotation.y += 0.35; fx.trail(wx(s.x), h, wz(s.y), "#e4f7ff", 0.25, 0.3); }
    else if (k === "whirlWave") { v.root.rotation.y -= 0.4; h = 0.2; fx.solidTrail(wx(s.x), 0.2, wz(s.y), "#5cd0ff", 0.12, 0.4, { grav: 5, up: 1 }); }
    else if (k === "sword") { v.root.rotation.y = Math.atan2(wx(s.tx) - wx(s.sx), wz(s.ty) - wz(s.sy)); fx.trail(wx(s.x), h, wz(s.y), "#5cf2ff", 0.3, 0.25); }
    else fx.trail(wx(s.x), h, wz(s.y), c[0], 0.2, 0.25);
    v.root.position.set(wx(s.x), h, wz(s.y));
  });
}
function flameRow(x0, z0, x1, z1, n, h) { for (let i = 0; i < n; i++) { const t = rnd(); if (i % 3 === 0) fx.solidTrail(x0 + (x1 - x0) * t, 0.15, z0 + (z1 - z0) * t, rnd() < 0.5 ? "#ff4b1f" : "#ff8a2a", 0.3, 0.6, { up: 2.4 }); fx.trail(x0 + (x1 - x0) * t + (rnd() - 0.5) * 0.15, 0.1 + rnd() * 0.2, z0 + (z1 - z0) * t + (rnd() - 0.5) * 0.15, rnd() < 0.35 ? "#ffe24a" : rnd() < 0.5 ? "#ff4b1f" : "#ff8a2a", 0.42, 0.55, { up: h || 2.6, spd: 0.3 }); } }
function syncHeroZones(dt) {
  const h = B.hero;
  syncList(views.hz, B.hzones, (z) => {
    const k = z.kind, root = new THREE.Group();
    const v = { root, k };
    if (k === "fireFan" || k === "frostBreath") { const m = new THREE.Mesh(SH.sector(k === "fireFan" ? 1.5 : 1.6), addMat(k === "fireFan" ? "#ff6d28" : "#72d8ff", 0.45)); m.position.y = 0.05; root.add(m); v.m = m; }
    else if (k === "fireWall") { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0), addMat("#ff3a1a", 0.55)); m.userData.dispose = true; m.position.y = 0.04; root.add(m); v.m = m; }
    else if (k === "fireDragon") { v.segs = []; for (let i = 0; i < 9; i++) { const sg = i === 0 ? SH.dragonHead() : SH.dragonSeg(); sg.scale.setScalar(i === 0 ? 1 : 1 - i * 0.07); root.add(sg); v.segs.push(sg); } v.hist = []; }
    else if (k === "zeus") { const bird = M.heroModel("lemon", PET); bird.scale.setScalar(1.05); const cl = SH.cloud(); cl.scale.set(1.5, 0.7, 1.3); cl.position.y = -0.05; const gl = glowSprite("#fff6c0", 2.6); gl.position.y = 0.5; root.add(cl, bird, gl); v.bird = bird; fx.burst(wx(z.x), 1.4, wz(z.y), "#fff6c0", 40, { spd: 3 }); }
    else if (k === "angryCloud") { const cl = SH.darkCloud(); cl.scale.setScalar(z.lv >= 5 ? 1.4 : 1.15); const gl = glowSprite("#8a7aff", 2.8); root.add(cl, gl); v.cl = cl; }
    else if (k === "slidingIce") { const m = SH.ice(); root.add(m); v.m = m; }
    else if (k === "blizzard") { v.owl = M.heroModel("blueberry", PET); v.owl.scale.setScalar(1.4); root.add(v.owl); }
    else if (k === "waterTornado") { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.18, 1.9, 18, 6, true), addMat("#5cd0ff", 0.5)); m.geometry.translate(0, 0.95, 0); m.userData.dispose = true; const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.1, 1.7, 14, 4, true), addMat("#e4f8ff", 0.45)); m2.geometry.translate(0, 0.85, 0); m2.userData.dispose = true; root.add(m, m2); v.m = m; v.m2 = m2;
      if (z.dragon) { v.segs = []; for (let i = 0; i < 8; i++) { const sg = new THREE.Mesh(new THREE.SphereGeometry(0.2 - i * 0.015, 10, 8), addMat("#5cd0ff", 0.6)); sg.userData.dispose = true; root.add(sg); v.segs.push(sg); } } }
    else if (k === "tsunami") { const wh = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.22, 10, 32), addMat("#2d9cff", 0.7)); wh.geometry.rotateX(Math.PI / 2); wh.userData.dispose = true; const wh2 = new THREE.Mesh(new THREE.CircleGeometry(0.85, 32).rotateX(-Math.PI / 2), addMat("#5cd0ff", 0.5)); wh2.userData.dispose = true; root.add(wh, wh2); v.wh = wh; v.wh2 = wh2;
      const wave = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 7.2, 20, 1, false, 0, Math.PI), new THREE.MeshToonMaterial({ color: "#3aa0ff", transparent: true, opacity: 0.85, gradientMap: M.toonMat.gradientMap }));
      body.geometry.rotateZ(Math.PI / 2); body.userData.dispose = true; const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 7.2, 10), new THREE.MeshToonMaterial({ color: "#ffffff", gradientMap: M.toonMat.gradientMap })); crest.geometry.rotateZ(Math.PI / 2); crest.position.set(0, 0.9, 0.2); crest.userData.dispose = true;
      wave.add(body, crest); wave.visible = false; root.add(wave); v.wave = wave;
      if (z.ship) { v.ship = SH.ship(); v.ship.scale.setScalar(0.8); v.ship.visible = false; root.add(v.ship); } }
    else if (k === "volcano") { v.mt = SH.mountain(); v.mt.scale.set(1, 0.01, 1); root.add(v.mt); fx.ring(wx(z.x), wz(z.y), 0.3, 1.8, "#c9925a", 0.6); }
    else if (k === "sawSword") { const sw = SH.bigSword(); sw.scale.setScalar(0.75); root.add(sw); v.sw = sw; }
    else if (k === "swordOrbit") { v.sws = []; for (let i = 0; i < Math.min(9, z.count); i++) { const sw = SH.sword(); sw.scale.setScalar(1.3); root.add(sw); v.sws.push(sw); } }
    else if (k === "plantedSword") { const sw = SH.bigSword(); sw.rotation.x = Math.PI / 2; sw.scale.setScalar(0.6); root.add(sw); v.sw = sw; }
    else if (k === "miniWake") { const m = new THREE.Mesh(SH.ringG, addMat((HCOL[z.fk] || HCOL.fire)[0], 0.7)); root.add(m); v.m = m; }
    return v;
  }, (z, v) => {
    const k = z.kind, x = wx(z.x || 0), zz = wz(z.y || 0);
    v.root.position.set(x, 0, zz);
    if (k === "fireFan" || k === "frostBreath") {
      const r = z.r / TILE, a = k === "fireFan" ? z.dir : z.ang;
      v.m.scale.setScalar(r * (0.4 + Math.min(1, z.t * 5) * 0.6)); v.m.rotation.y = -a; v.m.material.opacity = 0.35 + 0.2 * Math.sin(R.time * 30);
      for (let i = 0; i < (k === "fireFan" ? 7 : 6); i++) { const aa = a + (rnd() - 0.5) * 1.4, rr = rnd() * r, sp = 3 + rnd() * 3;
        const cc = new THREE.Color(k === "fireFan" ? (rnd() < 0.4 ? "#ffe24a" : "#ff4b1f") : (rnd() < 0.5 ? "#e4f7ff" : "#72d8ff"));
        fx.add.emit(x + Math.cos(aa) * 0.3, 0.35, zz + Math.sin(aa) * 0.3, Math.cos(aa) * sp * (rr / r + 0.3), 0.8, Math.sin(aa) * sp * (rr / r + 0.3), cc, 0.5, 0.45, { drag: 3, s1: 0.9 });
        if (i % 2 === 0) fx.solid.emit(x + Math.cos(aa) * 0.3, 0.3, zz + Math.sin(aa) * 0.3, Math.cos(aa) * sp * 0.8, 0.6, Math.sin(aa) * sp * 0.8, k === "fireFan" ? cc.set(rnd() < 0.5 ? "#ff6d28" : "#ff3a1a") : cc.set(rnd() < 0.5 ? "#bfeaff" : "#72d8ff"), 0.3, 0.5, { drag: 2.6, grav: -0.8, s1: 0.55 }); }
    } else if (k === "fireWall") {
      const L = z.len / TILE; v.root.rotation.y = -z.ang; v.m.scale.set(L * Math.min(1, z.t * 4), 1, 1.2); v.m.material.opacity = 0.4 + 0.15 * Math.sin(R.time * 20);
      const ex = x + Math.cos(z.ang) * L, ez = zz + Math.sin(z.ang) * L; flameRow(x, zz, ex, ez, 9, 3.2);
    } else if (k === "fireDragon") {
      const hx = wx(z.x), hzv = wz(z.y), hy = 0.9 + Math.sin(R.time * 3 + z.seed) * 0.25; v.root.position.set(0, 0, 0);
      v.hist.unshift([hx, hy, hzv]); if (v.hist.length > 60) v.hist.length = 60;
      v.segs.forEach((sg, i) => { const q = v.hist[Math.min(v.hist.length - 1, i * 4)]; sg.position.set(q[0], q[1] + Math.sin(R.time * 6 - i) * 0.08, q[2]); });
      if (v.hist[1]) v.segs[0].rotation.y = Math.atan2(v.hist[0][0] - v.hist[1][0], v.hist[0][2] - v.hist[1][2]);
      fx.trail(hx, hy, hzv, "#ff6d28", 0.5, 0.4);
    } else if (k === "zeus") {
      v.root.position.set(x, 1.5 + Math.sin(R.time * 3) * 0.1, zz); v.bird.rotation.y = Math.sin(R.time * 2) * 0.3;
      if (rnd() < 0.4) fx.trail(x + (rnd() - 0.5) * 1, 1.3, zz, "#fff6c0", 0.25, 0.5, { up: -0.5 });
    } else if (k === "angryCloud") {
      v.root.position.set(x, 2.5 + Math.sin(R.time * 4) * 0.08, zz); v.cl.rotation.z = Math.sin(R.time * 9) * 0.05;
      if (rnd() < 0.3) fx.trail(x + (rnd() - 0.5) * 1.6, 2.2, zz, "#8a8aff", 0.3, 0.5, { up: -1 });
    } else if (k === "slidingIce") { v.m.rotation.y += 0.05; fx.trail(x, 0.1, zz, "#e4f7ff", 0.35, 0.6); fx.decal(x, zz, 0.35, "#e4f7ff", 1.5, 0.35); }
    else if (k === "blizzard") {
      v.root.position.set(wx(B.hero.x), 2.2 + Math.min(1, z.t) * 0.6, wz(B.hero.y)); v.owl.rotation.y += 0.05;
      for (let i = 0; i < 14; i++) fx.add.emit((rnd() - 0.5) * 7.5, 3.5 + rnd(), (rnd() - 0.5) * 8.5, -0.8 + rnd() * 0.4, -3 - rnd() * 2, 0.8, new THREE.Color(rnd() < 0.5 ? "#ffffff" : "#bfeaff"), 0.22 + rnd() * 0.15, 1.2, { drag: 0.2 });
    } else if (k === "waterTornado") {
      v.m.rotation.y += 0.35; v.m2.rotation.y -= 0.5; const pul = 1 + Math.sin(R.time * 12) * 0.06; v.m.scale.set(pul, 1, pul);
      for (let i = 0; i < 3; i++) { const a = rnd() * TAU, r = 0.2 + rnd() * 0.6; fx.solidTrail(x + Math.cos(a) * r, rnd() * 1.8, zz + Math.sin(a) * r, rnd() < 0.5 ? "#5cd0ff" : "#ffffff", 0.13, 0.5, { grav: 4 }); }
      if (v.segs) v.segs.forEach((sg, i) => { const a = R.time * 4 - i * 0.45; sg.position.set(Math.cos(a) * 1.1, 1.2 + Math.sin(a * 2) * 0.2, Math.sin(a) * 1.1); });
    } else if (k === "tsunami") {
      const ch = z.t < z.charge, wv = !ch && z.t < z.charge + z.waveDur;
      if (ch) { v.root.position.set(wx(h.x), 1.9, wz(h.y)); v.wh.rotation.y += 0.3; v.wh2.rotation.y -= 0.2; const s = 0.4 + z.t / z.charge * 0.8; v.wh.scale.setScalar(s); v.wh2.scale.setScalar(s);
        if (rnd() < 0.6) fx.solidTrail(wx(h.x) + (rnd() - 0.5), 1.9, wz(h.y), "#5cd0ff", 0.14, 0.5, { grav: 8 }); }
      else if (wv) { v.wh.visible = v.wh2.visible = false; v.wave.visible = true; v.root.position.set(0, 0, wz(z.waveY || 400)); const s = Math.min(1, (z.t - z.charge) * 4); v.wave.scale.set(1, s, 1);
        for (let i = 0; i < 10; i++) fx.solidTrail((rnd() - 0.5) * 7, 1.6 + rnd() * 0.4, 0.2, rnd() < 0.6 ? "#ffffff" : "#8fdcff", 0.18, 0.7, { grav: 7, up: 2 });
        if (v.ship) { v.ship.visible = true; v.ship.position.set(1.2, 1.0, -0.3); v.ship.rotation.z = Math.sin(R.time * 4) * 0.15; } }
      else { v.wave.visible = false; if (v.ship) v.ship.visible = false; v.wh.visible = v.wh2.visible = true; v.root.position.set(wx(270), 0.08, wz(380)); v.wh.scale.setScalar(2.4); v.wh2.scale.setScalar(2.4); v.wh.rotation.y += 0.12; v.wh2.rotation.y += 0.25;
        if (rnd() < 0.6) { const a = rnd() * TAU; fx.trail(wx(270) + Math.cos(a) * 2, 0.2, wz(380) + Math.sin(a) * 2, "#8fdcff", 0.3, 0.6); } }
    } else if (k === "volcano") {
      const rise = Math.min(1, z.t / z.erupt); v.mt.scale.set(1, 0.05 + rise * 0.95, 1);
      if (!z.erupted && rnd() < 0.6) fx.solidTrail(x + (rnd() - 0.5) * 2, 0.1, zz + (rnd() - 0.5) * 2, "#8c7464", 0.18, 0.6, { up: 2.5, grav: 6, floor: true });
      if (z.erupted) { for (let i = 0; i < 2; i++) fx.trail(x, 1.9, zz, rnd() < 0.5 ? "#ff6a2a" : "#ffd23a", 0.45, 0.8, { up: 4, spd: 1.5, grav: 3 }); if (rnd() < 0.3) fx.trail(x, 2.0, zz, "#6a5a5a", 0.6, 1.2, { up: 1.5 });
        const fade = Math.max(0, (z.dur - z.t) / 1); if (fade < 1) v.mt.scale.y = Math.max(0.01, fade); }
    } else if (k === "sawSword") { v.root.position.set(x, 0.6, zz); v.sw.rotation.y += 0.9; fx.trail(x, 0.6, zz, "#5cf2ff", 0.4, 0.25); if (rnd() < 0.3) fx.add.emit(x, 0.6, zz, (rnd() - 0.5) * 6, 1, (rnd() - 0.5) * 6, new THREE.Color("#ffe24a"), 0.15, 0.3, {}); }
    else if (k === "swordOrbit") { v.root.position.set(wx(h.x), 0.85, wz(h.y)); v.sws.forEach((sw, i) => { const a = R.time * 3.2 + i / v.sws.length * TAU; sw.position.set(Math.cos(a) * 0.95, Math.sin(R.time * 5 + i) * 0.1, Math.sin(a) * 0.95); sw.rotation.y = a; if (rnd() < 0.2) fx.trail(wx(h.x) + Math.cos(a) * 0.95, 0.85, wz(h.y) + Math.sin(a) * 0.95, "#5cf2ff", 0.2, 0.25); }); }
    else if (k === "plantedSword") { const dp = Math.min(1, z.t / z.drop); v.sw.position.y = 0.45 + (1 - dp) * 3.5; v.sw.scale.setScalar(0.6 * (1 + (z.exploded ? 0.3 : 0)));
      if (dp >= 1 && !v.landed) { v.landed = true; fx.chunks(x, 0.1, zz, "#c8b29c", 8, { spd: 1.5 }); fx.ring(x, zz, 0.1, 0.6, "#5cf2ff", 0.3); } }
    else if (k === "miniWake") { v.m.scale.setScalar((z.r / TILE) * (0.6 + Math.sin(R.time * 10) * 0.08)); v.m.rotation.y += 0.2; v.m.material.opacity = 0.6 * (1 - z.t / z.dur); }
  });
  // puddles, rubbles, gen-1 burn zones
  syncList(views.puddles, [...B.puddles, ...B.rubbles, ...B.zones], (o) => {
    const root = new THREE.Group(); let m;
    if (B.rubbles.includes(o)) { m = SH.rubble(); m.scale.setScalar((o.r / TILE) * (o.big ? 1.6 : 1.2)); root.add(m); return { root, k: "rub" }; }
    if (B.puddles.includes(o)) { m = new THREE.Mesh(SH.disc, new THREE.MeshBasicMaterial({ color: "#5cc4ff", transparent: true, opacity: 0.5, depthWrite: false })); m.position.y = 0.02; root.add(m); return { root, m, k: "pud" }; }
    m = new THREE.Mesh(SH.disc, addMat(o.color || "#ff6a2a", 0.4)); m.position.y = 0.03; root.add(m); return { root, m, k: "burn" };
  }, (o, v) => {
    v.root.position.set(wx(o.x), 0, wz(o.y));
    const life = o.life / (o.max || 1);
    if (v.k === "pud") { v.m.scale.setScalar(o.r / TILE * (0.7 + 0.3 * Math.min(1, (1 - life) * 6))); v.m.material.opacity = 0.5 * Math.min(1, life * 3); if (rnd() < 0.05) fx.ring(wx(o.x) + (rnd() - 0.5) * 0.5, wz(o.y) + (rnd() - 0.5) * 0.5, 0.05, 0.3, "#e4f8ff", 0.4, { op: 0.6 }); }
    else if (v.k === "burn") { v.m.scale.setScalar(o.r / TILE); v.m.material.opacity = 0.35 * Math.min(1, life * 2) + 0.1 * Math.sin(R.time * 12); if (rnd() < 0.5) fx.trail(wx(o.x) + (rnd() - 0.5) * o.r / TILE * 1.4, 0.1, wz(o.y) + (rnd() - 0.5) * o.r / TILE * 1.4, rnd() < 0.5 ? "#ff6a2a" : "#ffd23a", 0.3, 0.5, { up: 2 }); }
    else { v.root.scale.y = Math.min(1, life * 4); }
  });
}

/* ---------- sim events -> big FX ---------- */
const anims = [];   // short scripted pieces (arcs, falling spires, icicles)
const words = [];   // comic words on the overlay
let banner = null;
export function word(x, y, text, col, size, life) { words.push({ x, y, text, col: col || "#ffe14a", size: size || 30, life: life || 0.8, max: life || 0.8, h: 1.2 }); }
function anim(dur, fn, done) { anims.push({ t: 0, dur, fn, done }); }
function meshAnim(mesh, dur, fn, done) { scene.add(mesh); anim(dur, (k) => fn(k, mesh), () => { scene.remove(mesh); if (done) done(); }); }
function impactFk(x, y, fk, crit, scale) {
  const X = wx(x), Z = wz(y), s = scale || 1, c = HCOL[fk] || HCOL.fire;
  fx.flash(X, 0.5, Z, c[0], (crit ? 2.2 : 1.4) * s, 0.22);
  fx.burst(X, 0.45, Z, c[0], (crit ? 26 : 16) * s, { spd: 3.2 * s, size: 0.3 * s });
  fx.ring(X, Z, 0.15, (crit ? 1.2 : 0.8) * s, c[1], 0.3);
  if (fk === "fire") fx.burst(X, 0.5, Z, "#ffe24a", 10 * s, { spd: 2, up: 3 });
  else if (fk === "frost") fx.chunks(X, 0.5, Z, "#cfefff", 10 * s, { spd: 2.6, size: 0.14 });
  else if (fk === "water") fx.chunks(X, 0.4, Z, "#5cd0ff", 14 * s, { spd: 2.2, size: 0.12, up: 4 });
  else if (fk === "rock") { fx.chunks(X, 0.3, Z, "#8c7464", 12 * s, { spd: 2.8, size: 0.2 }); fx.burst(X, 0.2, Z, "#e8d6c0", 10, { spd: 2, up: 0.6, white: false }); }
  else if (fk === "lightning") fx.bolt(V(X + (rnd() - 0.5) * 0.4, 2.6, Z), V(X, 0.3, Z), "#ffe944", 0.18, { w: 0.18 });
  else if (fk === "slash") { const a = rnd() * TAU; fx.arc(X, 0.5, Z, 0.5 * s, a, a + 2.4, "#5cf2ff", 0.12, 0.22); }
  if (crit) word(x, y, "CRIT!", "#ffd23a", 26, 0.6);
}
function handleEvents() {
  for (const e of B.ev) {
    const X = e.x != null ? wx(e.x) : 0, Z = e.y != null ? wz(e.y) : 0;
    switch (e.t) {
      case "burst": fx.burst(X, 0.45, Z, e.color, e.n * 1.6, { spd: 2.8 }); break;
      case "ring": fx.ring(X, Z, e.r0 / TILE, e.r1 / TILE * 1.15, e.color, e.life * 1.3); break;
      case "bolt": { const a = V(wx(e.x1), (e.z1 || 0.5) * 1.6, wz(e.y1)), b = V(wx(e.x2), 0.5, wz(e.y2)); fx.bolt(a, b, e.color, e.life * 1.2, { w: 0.2 }); fx.flash(b.x, 0.5, b.z, e.color, 1.3, 0.18); fx.burst(b.x, 0.5, b.z, e.color, 10, { spd: 2.5 }); break; }
      case "goo": { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshToonMaterial({ color: "#8adf4a", gradientMap: M.toonMat.gradientMap }));
        const a = P3(e.x1, e.y1, 0.5), b = P3(e.x2, e.y2, 0.5);
        meshAnim(m, e.life, (k, mm) => { mm.position.lerpVectors(a, b, k); mm.position.y += Math.sin(k * Math.PI) * 1.2; fx.solidTrail(mm.position.x, mm.position.y, mm.position.z, "#8adf4a", 0.1, 0.3); },
          () => { fx.chunks(b.x, 0.5, b.z, "#8adf4a", 14, { spd: 1.6 }); fx.decal(b.x, b.z, 0.35, "#8adf4a", 2.5, 0.6); m.geometry.dispose(); }); break; }
      case "spawn": { const p = P3(e.e.x, e.e.y); fx.ring(p.x, p.z, 0.1, ENEMY[e.e.typ].boss ? 2.2 : 0.9, ENEMY[e.e.typ].boss ? "#ff3a6a" : "#b07aff", 0.45); fx.burst(p.x, 0.3, p.z, "#d8b8ff", ENEMY[e.e.typ].boss ? 40 : 10, { spd: 2 }); break; }
      case "death": { const s = (e.size || 80) / 80, n = e.boss ? 90 : 30;
        fx.flash(X, 0.5, Z, "#ffffff", 1.6 * s, 0.2); fx.burst(X, 0.45, Z, e.color, n, { spd: 4 * s, size: 0.34 * s, life: 0.7 });
        fx.chunks(X, 0.45, Z, e.color, e.boss ? 40 : 16, { spd: 3 * s, size: 0.18 * s, up: 5 });
        fx.ring(X, Z, 0.2, 1.3 * s, e.color, 0.4); fx.decal(X, Z, 0.42 * s, e.color, 3, 0.55);
        if (e.boss) { fx.ring(X, Z, 0.4, 4.5, "#ffd23a", 0.8); fx.ring(X, Z, 0.2, 3.2, "#ffffff", 0.6); fx.flash(X, 1, Z, "#ffe14a", 7, 0.5); word(e.x, e.y - 40, "K.O.!", "#ff4a5a", 64, 1.4);
          for (let i = 0; i < 6; i++) setTimeout(() => fx.burst(X + (rnd() - 0.5) * 2, 0.6, Z + (rnd() - 0.5) * 2, ["#ffd23a", "#ff6a9a", "#7fe07a"][i % 3], 40, { spd: 5 }), i * 90); }
        else if (rnd() < 0.35) word(e.x, e.y, ["POP!", "BOP!", "啵!", "砰!"][Math.floor(rnd() * 4)], "#ffffff", 24, 0.5);
        break; }
      case "lvup": case "heroLv": { for (let i = 0; i < 40; i++) fx.add.emit(X + (rnd() - 0.5) * 0.7, 0.1, Z + (rnd() - 0.5) * 0.5, 0, 3 + rnd() * 3, 0, new THREE.Color(rnd() < 0.5 ? "#ffd23a" : "#7fe07a"), 0.3, 0.9, { drag: 1 });
        fx.ring(X, Z, 0.2, 1.4, "#ffd23a", 0.5); fx.ring(X, Z, 0.1, 1.0, "#7fe07a", 0.5, { y: 0.4 }); fx.flash(X, 0.8, Z, "#ffe14a", 2.2, 0.35);
        if (e.t === "heroLv") word(e.x, e.y - 50, "LEVEL UP!", "#ffe14a", 42, 1.3); break; }
      case "heroPick": fx.burst(X, 0.6, Z, "#ffd23a", 30, { spd: 3 }); break;
      case "item": fx.ring(X, Z, 0.2, 1.2, e.color, 0.45); fx.burst(X, 0.6, Z, e.color, 30, { spd: 3 }); fx.flash(X, 0.6, Z, e.color, 2, 0.3); break;
      case "leak": fx.flash(wx(e.x), 0.4, wz(712), "#ff3a3a", 3, 0.4); fx.burst(wx(e.x), 0.3, wz(712), "#ff3a3a", 40, { spd: 4 }); banner = { text: B.lang === "en" ? "LEAK!" : "漏怪了！", col: "#ff4a5a", life: 1.2, max: 1.2 }; break;
      case "ult": ultFx(e); break;
      case "lob": { const a = P3(e.x1, e.y1, 0.7), b = P3(e.x2, e.y2, 0.6), m = glowSprite(e.color, 0.5);
        meshAnim(m, e.life, (k, mm) => { mm.position.lerpVectors(a, b, k); mm.position.y += Math.sin(k * Math.PI) * 1.1; fx.trail(mm.position.x, mm.position.y, mm.position.z, "#ff6e8c", 0.2, 0.3); }, () => { fx.burst(b.x, b.y, b.z, "#7fe07a", 14, { spd: 1.8 }); if (rnd() < 0.2) word(e.x2, e.y2, "♥", "#ff6e8c", 22, 0.5); }); break; }
      case "shieldOn": fx.ring(X, Z, 0.2, 0.9, "#7fe07a", 0.4, { y: 0.4 }); fx.burst(X, 0.5, Z, "#f3d34a", 10, { spd: 1.5 }); break;
      case "slam": { const r = e.r / TILE; fx.flash(X, 0.3, Z, e.color, 2.4 * r, 0.25); fx.ring(X, Z, 0.1, r * 1.3, e.color, 0.4); fx.ring(X, Z, 0.1, r * 0.9, "#ffffff", 0.3); fx.chunks(X, 0.2, Z, "#8c7a72", 18, { spd: 3, size: 0.18 }); fx.burst(X, 0.2, Z, "#96d886", 18, { spd: 3.5, up: 0.8 }); word(e.x, e.y, "STOMP!", "#b88ae0", 28, 0.6); break; }
      case "claw": { for (let i = 0; i < 3; i++) { const a = -2.4 + i * 0.25; fx.arc(X - 0.2 + i * 0.2, 0.55, Z, 0.45, a, a + 1.6, e.color, 0.1, 0.25); }
        const o = P3(e.ox, e.oy); for (let i = 1; i <= 3; i++) setTimeout(() => fx.ring(o.x, o.z - 0.3, 0.2, 0.6 + i * 0.5, "#ffd23a", 0.35, { y: 0.6 }), i * 60);
        fx.flash(X, 0.5, Z, "#ffd23a", 1.6, 0.2); word(e.ox, e.oy - 70, "ROAR!", "#ffb42e", 26, 0.5); break; }
      case "pop": { const r = (e.r || 40) / TILE; fx.ring(X, Z, 0.1, r * 1.3, "#bfe6ff", 0.35); fx.chunks(X, 0.4, Z, "#8fdcff", 16, { spd: 2.5, size: 0.12 }); fx.flash(X, 0.4, Z, "#e4f8ff", 1.4 * r + 0.5, 0.2); break; }
      case "boom": { const r = e.r / TILE; fx.flash(X, 0.5, Z, "#ffd23a", 3.5 * r, 0.3); fx.burst(X, 0.4, Z, e.color, 50, { spd: 5 * r, size: 0.45, life: 0.8 }); fx.burst(X, 0.4, Z, "#ffd23a", 30, { spd: 3.5 * r, up: 4 });
        fx.chunks(X, 0.3, Z, "#5a3a34", 18, { spd: 3.5, size: 0.2 }); fx.ring(X, Z, 0.1, r * 1.6, "#ffb02e", 0.45); fx.decal(X, Z, r * 0.9, "#3a2a2a", 2.6, 0.5); word(e.x, e.y, "BOOM!", "#ff4f9a", 38, 0.7); break; }
      case "impact": { const sm = e.small ? 0.6 : 1; fx.burst(X, 0.45, Z, e.color, 12 * sm, { spd: 2.4 * sm, size: 0.26 }); fx.flash(X, 0.45, Z, e.color, 0.9 * sm + 0.3, 0.15);
        if (e.kind === "fire") fx.burst(X, 0.45, Z, "#ffd23a", 10, { spd: 2, up: 3 }); if (e.kind === "splash") fx.chunks(X, 0.4, Z, "#8fdcff", 5, { spd: 1.6, size: 0.1 }); if (e.kind === "peach") fx.chunks(X, 0.4, Z, "#ff8ac0", 6, { spd: 1.8, size: 0.1 }); break; }
      case "bossWarn": banner = { text: B.lang === "en" ? "BOSS INCOMING!" : "首领来袭！", col: "#ff3a5a", life: 2.4, max: 2.4, big: true }; break;
      case "heroDown": fx.burst(X, 0.5, Z, "#ffffff", 50, { spd: 4 }); fx.ring(X, Z, 0.2, 1.6, "#ff4a5a", 0.5); break;
      case "heroUp": fx.ring(X, Z, 2, 0.2, "#ffd23a", 0.5); for (let i = 0; i < 30; i++) fx.add.emit(X, 4, Z, (rnd() - 0.5), -6, (rnd() - 0.5), new THREE.Color("#fff6c0"), 0.35, 0.6, { drag: 0.5 }); fx.flash(X, 0.6, Z, "#fff6c0", 3, 0.4); break;
      case "slash": { const r = (e.r || 80) / TILE; fx.arc(X, 0.55, Z, r * 0.6, e.ang - 1.3, e.ang + 1.3, "#5cf2ff", 0.18, 0.25); fx.arc(X, 0.6, Z, r * 0.45, e.ang + 1.2, e.ang - 1.0, "#ffe24a", 0.1, 0.22); fx.flash(X, 0.5, Z, "#5cf2ff", 1.6, 0.18); fx.burst(X, 0.5, Z, "#ffffff", 10, { spd: 3 }); if (rnd() < 0.3) word(e.x, e.y, "SLASH!", "#5cf2ff", 24, 0.5); break; }
      case "cast": { const c = HCOL[e.fk] || HCOL.fire, a = e.ang || 0; fx.flash(X + Math.cos(a) * 0.35, 0.6, Z + Math.sin(a) * 0.35, c[0], e.hero ? 1.2 : 0.7, 0.14); break; }
      case "hhit": { impactFk(e.x, e.y, e.fk, e.crit, (e.scale || 1) * (e.comp ? 0.6 : 1));
        if (e.kind === "skyRock") { fx.ring(X, Z, 0.1, 1.2, "#c9925a", 0.35); fx.decal(X, Z, 0.4, "#5a4234", 2, 0.4); }
        if (e.kind === "cloudBolt") { fx.bolt(V(X, 2.2, Z), V(X, 0.2, Z), "#ffe944", 0.22, { w: 0.3 }); fx.flash(X, 0.3, Z, "#fff454", 2.4, 0.2); }
        if (!e.comp && B.hero && rnd() < 0.18) { const w = B.hero.def.words; word(e.x, e.y - 20, w[Math.floor(rnd() * w.length)], (HCOL[e.fk] || HCOL.fire)[0], 26, 0.55); } break; }
      case "stomp": fx.ring(X, Z, 0.1, 1.3, "#bfeaff", 0.35); fx.chunks(X, 0.2, Z, "#e4f7ff", 14, { spd: 2.5 }); fx.flash(X, 0.3, Z, "#bfeaff", 1.6, 0.2); break;
      case "skill": skillFx(e); break;
      case "bubbleTrap": { const q = e.e; fx.ring(wx(q.x), wz(q.y), 0.1, 0.8, "#bfe6ff", 0.35); fx.burst(wx(q.x), 0.6, wz(q.y), "#e4f8ff", 12, { spd: 1.5 }); break; }
      case "spire": { const m = SH.spire(); const tx = X, tz = Z; m.scale.setScalar(1.1);
        anim(e.delay || 0.01, () => {}, () => meshAnim(m, 0.6, (k, mm) => { const f = Math.min(1, k / 0.35); mm.position.set(tx, (1 - f) * 5, tz); if (f >= 1 && !mm.userData.hit) { mm.userData.hit = 1; fx.flash(tx, 0.4, tz, "#e8d6c0", 2.6, 0.25); fx.chunks(tx, 0.3, tz, "#8c7464", 22, { spd: 3.5, size: 0.22 }); fx.ring(tx, tz, 0.1, 1.5, "#c9925a", 0.4); word(e.x, e.y, "SMASH!", "#c9925a", 34, 0.6); }
          if (k > 0.7) mm.scale.y = 1.1 * (1 - (k - 0.7) / 0.3); })); break; }
      case "quake": { const r = e.r / TILE; for (let i = 0; i < 3; i++) setTimeout(() => fx.ring(X, Z, 0.2, r * (0.6 + i * 0.25), i % 2 ? "#e8d6c0" : "#c9925a", 0.45), i * 90);
        for (let i = 0; i < 24; i++) { const a = rnd() * TAU, rr = rnd() * r; fx.chunks(X + Math.cos(a) * rr, 0.1, Z + Math.sin(a) * rr, "#8c7464", 1, { spd: 0.5, up: 5, size: 0.2 }); }
        fx.flash(X, 0.3, Z, "#e8d6c0", r * 2, 0.3); word(e.x, e.y - 40, "QUAKE!", "#8c6a4a", 40, 0.8); break; }
      case "holyBolt": { const a = V(wx(e.fx), 1.6, wz(e.fy)), b = P3(e.x, e.y, 0.4); fx.bolt(a, b, "#fff2a0", 0.22, { w: 0.26 }); fx.flash(b.x, 0.4, b.z, "#fff6c0", 1.8, 0.2); fx.burst(b.x, 0.4, b.z, "#ffe944", 16, { spd: 3 }); break; }
      case "skyBolt": { if (e.mini) { fx.bolt(V(X, 3, Z), V(X, 0.05, Z), "#ffe944", 0.15, { w: 0.1 }); fx.ring(X, Z, 0.05, 0.4, "#ffe944", 0.2); break; }
        const a = V(wx(e.fx), 2.3, wz(e.fy)), b = P3(e.x, e.y, 0.2); fx.bolt(a, b, "#ffe944", 0.3, { w: 0.42, jit: 0.6 }); fx.bolt(a, b, "#269ef5", 0.25, { w: 0.24, jit: 0.8 });
        fx.flash(b.x, 0.3, b.z, "#fff454", 3.4, 0.28); fx.ring(b.x, b.z, 0.1, 1.6, "#ffe944", 0.4); fx.burst(b.x, 0.3, b.z, "#ffe944", 30, { spd: 4 }); word(e.x, e.y - 30, "KA-BOOM!", "#ffe944", 34, 0.6); break; }
      case "gust": for (let i = 0; i < 160; i++) fx.add.emit((rnd() - 0.5) * 7, 0.3 + rnd() * 2, (rnd() - 0.5) * 8, 6 + rnd() * 3, 0, (rnd() - 0.5), new THREE.Color(rnd() < 0.5 ? "#ffffff" : "#bfeaff"), 0.4, 0.9, { drag: 1 }); word(270, 400, "FREEZE!", "#72d8ff", 56, 1.2); break;
      case "icicle": { const m = SH.icicle(); const tx = X, tz = Z; meshAnim(m, 0.32, (k, mm) => { mm.position.set(tx, 3.2 * (1 - k) + 0.3, tz); }, () => { fx.chunks(tx, 0.3, tz, "#cfefff", 12, { spd: 2.4, size: 0.13 }); fx.flash(tx, 0.3, tz, "#bfeaff", 1.3, 0.18); }); break; }
      case "splashShot": { const a = P3(e.x1, e.y1, 1.9), b = P3(e.x2, e.y2, 0.4), m = glowSprite("#5cd0ff", 0.6);
        meshAnim(m, 0.35, (k, mm) => { mm.position.lerpVectors(a, b, k); mm.position.y += Math.sin(k * Math.PI) * 0.6; fx.solidTrail(mm.position.x, mm.position.y, mm.position.z, "#5cd0ff", 0.12, 0.3, { grav: 5 }); }, () => fx.chunks(b.x, 0.3, b.z, "#5cd0ff", 10, { spd: 2 })); break; }
      case "erupt": fx.flash(X, 2, Z, "#ff6a2a", 7, 0.5); for (let i = 0; i < 3; i++) fx.burst(X, 1.9, Z, ["#ff6a2a", "#ffd23a", "#ff3a1a"][i], 50, { spd: 4.5, up: 8, size: 0.5, life: 1.1, grav: 7 });
        fx.chunks(X, 1.9, Z, "#5a3a34", 40, { spd: 4, up: 9, size: 0.26, life: 1.6 }); fx.ring(X, Z, 0.3, 3.2, "#ff6a2a", 0.6); fx.ring(X, Z, 0.2, 2.4, "#ffd23a", 0.5); word(e.x, e.y - 60, "ERUPTION!", "#ff6a2a", 52, 1.1); break;
      case "swordDart": { const a = P3(e.x1, e.y1, 0.9), b = P3(e.x2, e.y2, 0.45); fx.ribbon([a, a.clone().lerp(b, 0.5).add(V(0, 0.35, 0)), b], "#5cf2ff", 0.08, 0.16, { taper: 0.5 }); fx.burst(b.x, 0.45, b.z, "#ffffff", 6, { spd: 2 }); break; }
      case "crossSlash": fx.arc(X, 0.5, Z, 0.9, -0.8, 0.8 + Math.PI * 0.5, "#ffe24a", 0.2, 0.3); fx.arc(X, 0.55, Z, 0.9, Math.PI - 0.8, Math.PI + 1.2, "#5cf2ff", 0.2, 0.3); fx.flash(X, 0.5, Z, "#ffffff", 2.3, 0.22); fx.burst(X, 0.5, Z, "#5cf2ff", 22, { spd: 4 }); break;
    }
  }
  B.ev.length = 0;
}
function ultFx(e) {
  const X = wx(e.x), Z = wz(e.y), col = e.color;
  for (let i = 0; i < 60; i++) fx.add.emit(X + (rnd() - 0.5) * 0.5, 0.2, Z + (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.6, 6 + rnd() * 6, (rnd() - 0.5) * 0.6, new THREE.Color(rnd() < 0.5 ? col : "#ffffff"), 0.6, 0.9, { drag: 0.8 });
  fx.flash(X, 1.5, Z, col, 6, 0.5);
  for (let i = 0; i < 4; i++) setTimeout(() => { fx.ring(0, 0, 0.5, 6 + i, i % 2 ? "#ffffff" : col, 0.7); }, i * 110);
  const typ = e.typ;
  for (const en of B.enemies) { const ex = wx(en.x), ez = wz(en.y);
    if (typ === "freeze") { fx.chunks(ex, 0.6, ez, "#cfefff", 10, { spd: 2.5 }); fx.flash(ex, 0.5, ez, "#bfeaff", 2, 0.4); }
    else if (typ === "blast") { fx.burst(ex, 0.5, ez, "#ff6a2a", 30, { spd: 4, size: 0.45 }); fx.flash(ex, 0.5, ez, "#ffd23a", 2.5, 0.35); }
    else fx.bolt(V(X, 2.5, Z), V(ex, 0.4, ez), col, 0.35, { w: 0.25 }); }
  if (typ === "heal") for (const t of B.towers) for (let i = 0; i < 14; i++) fx.add.emit(wx(t.x) + (rnd() - 0.5) * 0.6, 0.2, wz(t.y), 0, 2 + rnd() * 3, 0, new THREE.Color(rnd() < 0.6 ? "#7fe07a" : "#ffffff"), 0.3, 1, { drag: 1 });
  if (typ === "shield") for (const t of B.towers) fx.ring(wx(t.x), wz(t.y), 0.1, 0.9, "#7fe07a", 0.6, { y: 0.4 });
  word(270, 330, B.lang === "en" ? "ULTIMATE!" : "大招！", col, 70, 1.4);
}
const SKILL_COL = { fire: "#ff6d28", lightning: "#ffe944", frost: "#72d8ff", water: "#2d9cff", rock: "#c9925a", slash: "#5cf2ff" };
function skillFx(e) {
  const X = wx(e.x), Z = wz(e.y), c = SKILL_COL[e.fk] || "#ffffff";
  fx.flash(X, 0.8, Z, c, 3.4, 0.35); fx.ring(X, Z, 0.2, 2.2, c, 0.45); fx.ring(X, Z, 0.1, 1.4, "#ffffff", 0.35, { y: 0.3 });
  for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; fx.add.emit(X, 0.4, Z, Math.cos(a) * 5, 1.2, Math.sin(a) * 5, new THREE.Color(c), 0.36, 0.5, { drag: 3 }); }
  word(e.x, e.y - 95, e.ico + " " + e.name, c, 34, 1.3);
  if (e.id === "blue_blizz") fx.flash(X, 2, Z, "#e4f7ff", 6, 0.6);
  if (e.id === "lemon_storm") for (let i = 0; i < 8; i++) setTimeout(() => fx.bolt(V((rnd() - 0.5) * 6, 3.4, (rnd() - 0.5) * 7), V((rnd() - 0.5) * 6, 0, (rnd() - 0.5) * 7), "#ffe944", 0.2, { w: 0.2 }), i * 70);
}

/* ---------- overlay (crisp 2D: HP bars, numbers, comic words, drops, badges) ---------- */
export const FONT = "'Baloo 2','Arial Rounded MT Bold','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',sans-serif";
const _v = new THREE.Vector3();
export function project(x, y, h) { _v.set(wx(x), h || 0, wz(y)).project(camera); return { x: (_v.x + 1) / 2 * R.w, y: (1 - _v.y) / 2 * R.h }; }
function txt(g, s, x, y, size, col, o) {
  o = o || {}; g.font = `900 ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineJoin = "round"; g.lineWidth = Math.max(3, size * 0.2); g.strokeStyle = o.stroke || "#2b1b22"; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y);
}
function bar(g, x, y, w, h, k, col, o) {
  o = o || {}; g.fillStyle = "#2b1b22"; g.beginPath(); g.roundRect(x - w / 2 - 1.5, y - 1.5, w + 3, h + 3, (h + 3) / 2); g.fill();
  g.fillStyle = "#fff8ec"; g.beginPath(); g.roundRect(x - w / 2, y, w, h, h / 2); g.fill();
  if (k > 0) { g.fillStyle = col; g.beginPath(); g.roundRect(x - w / 2, y, Math.max(h, w * Math.min(1, k)), h, h / 2); g.fill(); }
  if (o.shield) { g.fillStyle = "rgba(127,224,122,0.9)"; g.fillRect(x - w / 2, y, w * Math.min(1, o.shield), h * 0.45); }
}
function drawOverlay(dt) {
  const g = octx, s = R.dpr; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, overlay.width, overlay.height); g.setTransform(s, 0, 0, s, 0, 0);
  if (R.mode !== "battle") return drawWords(g, dt);
  const ui = Math.max(0.75, Math.min(1.25, R.h / 760));
  // slot terrain icons + upgrade arrows + revive marks
  if (!B.locked) for (let i = 0; i < 10; i++) { const p = S.slotPos(i), q = project(p.x, p.y + 30, 0); const tr = B.terrain && B.terrain[i]; if (tr) txt(g, D.TERRAIN[tr].icon, q.x + 26 * ui, q.y, 15 * ui, "#fff"); }
  for (const t of B.towers) {
    const q = project(t.x, t.y, 1.12 + (t.flyT > 0 ? 0.65 : 0)), st = S.petStats(t), w = 36 * ui;
    bar(g, q.x + 9 * ui, q.y, w, 6 * ui, t.hp / st.maxHp, t.hp / st.maxHp > 0.4 ? "#4ccf52" : "#ff5a4a", { shield: t.shield > 0 ? t.shield / st.maxHp : 0 });
    g.fillStyle = "#2b1b22"; g.beginPath(); g.roundRect(q.x - w / 2 - 14 * ui, q.y - 4 * ui, 22 * ui, 13 * ui, 6 * ui); g.fill();
    txt(g, "Lv" + t.tier, q.x - w / 2 - 3 * ui, q.y + 2.5 * ui, 9 * ui, "#ffe14a", { stroke: "#2b1b22" });
    if (t.fainted) txt(g, "💤", q.x, q.y - 16 * ui, 20 * ui, "#fff");
    else if (S.upgradeReady(t) && B.gold >= D.upgradeCost(t)) { const bob = Math.sin(R.time * 6) * 4; txt(g, "⬆", q.x + 24 * ui, q.y - 10 * ui + bob, 22 * ui, "#4ccf52", { stroke: "#ffffff" }); }
    if (t.jamT > 0) txt(g, "🤢", q.x - 24 * ui, q.y - 12 * ui, 16 * ui, "#fff");
    if (t.sleepT > 0) txt(g, "Zz", q.x + 18 * ui, q.y - 16 * ui, 16 * ui, "#8aa6ff");
    if (R.ultPick && !t.fainted) { g.strokeStyle = "#ffffff"; g.lineWidth = 3; g.setLineDash([6, 5]); const c = project(t.x, t.y, 0.4); g.beginPath(); g.arc(c.x, c.y, 36 * ui, 0, TAU); g.stroke(); g.setLineDash([]); }
  }
  for (const e of B.enemies) {
    if (e.hp <= 0) continue; const def = ENEMY[e.typ], hh = def.size / 80 * (def.fly ? 1.45 : 0.95) + 0.2;
    if (e.hp < e.max || e.boss || e.elite) { const q = project(e.x, e.y, hh), w = (e.boss ? 90 : 40) * ui; bar(g, q.x, q.y, w, (e.boss ? 9 : 5) * ui, e.hp / e.max, e.boss ? "#ff3a6a" : "#ff8a3a"); if (e.boss) txt(g, def[B.lang === "en" ? "en" : "zh"], q.x, q.y - 12 * ui, 13 * ui, "#fff"); }
    if (e.petrified) { const q = project(e.x, e.y, hh); txt(g, "🗿" + e.statueHp, q.x, q.y - 14 * ui, 14 * ui, "#fff"); }
    else if (e.rockShell > 0) { const q = project(e.x, e.y, hh); txt(g, "🪨".repeat(e.rockShell), q.x, q.y - 12 * ui, 11 * ui, "#fff"); }
  }
  const h = B.hero;
  if (h) {
    if (h.deadT > 0) { const q = project(270, 480, 0.5); txt(g, (B.lang === "en" ? "Hero back in " : "主角复活 ") + Math.ceil(h.deadT) + "s", q.x, q.y, 20 * ui, "#ff8a8a"); }
    else { const q = project(h.x, h.y, 1.75 + (h.ridingSwordT > 0 ? 0.55 : 0)), w = 56 * ui;
      bar(g, q.x, q.y, w, 7 * ui, h.hp / h.maxHp, "#ffd23a");
      g.fillStyle = "#e8323a"; g.beginPath(); g.roundRect(q.x - w / 2 - 26 * ui, q.y - 3 * ui, 24 * ui, 14 * ui, 7 * ui); g.fill();
      txt(g, "Lv" + h.level, q.x - w / 2 - 14 * ui, q.y + 4 * ui, 10 * ui, "#fff");
      txt(g, "▼", q.x, q.y - 12 * ui + Math.sin(R.time * 5) * 3, 14 * ui, h.def.burstCol); }
  }
  for (const d of B.drops) { const q = project(d.x, d.y, 0.5 + Math.sin(R.time * 4 + d.ph) * 0.12), r = 22 * ui;
    g.fillStyle = d.life < 3 && Math.sin(R.time * 18) > 0 ? "rgba(255,255,255,0.5)" : "#fff8ec"; g.strokeStyle = "#2b1b22"; g.lineWidth = 3; g.beginPath(); g.arc(q.x, q.y, r, 0, TAU); g.fill(); g.stroke();
    g.font = `${22 * ui}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(D.ITEMS24[d.k].ic, q.x, q.y + 1); }
  for (const f of B.floaters) { const q = project(f.x, f.y, 0.95), k = f.life / f.max, sz = (f.huge ? 40 : f.big ? 22 : f.coin ? 14 : 16) * ui * (f.crit ? 1.25 : 1) * (1 + (1 - Math.min(1, (1 - k) * 8)) * 0.4);
    g.globalAlpha = Math.min(1, k * 2.5); txt(g, f.text, q.x, q.y, sz, f.color); g.globalAlpha = 1; }
  drawWords(g, dt);
  if (banner) { banner.life -= dt; const k = banner.life / banner.max, sc = 1 + Math.max(0, (k - 0.85)) * 4;
    g.globalAlpha = Math.min(1, k * 3); g.fillStyle = "rgba(255,248,236,0.92)"; const bw = Math.min(R.w * 0.8, 420), bh = (banner.big ? 64 : 48) * ui, by = R.h * 0.36;
    g.beginPath(); g.roundRect(R.w / 2 - bw / 2, by - bh / 2, bw, bh, bh / 2); g.fill(); g.strokeStyle = banner.col; g.lineWidth = 4; g.stroke();
    txt(g, banner.text, R.w / 2, by, (banner.big ? 36 : 28) * ui * sc, banner.col, { stroke: "#2b1b22" }); g.globalAlpha = 1; if (banner.life <= 0) banner = null; }
  if (B.darkSkyT > 0) { g.fillStyle = `rgba(30,20,60,${Math.min(0.28, B.darkSkyT * 0.1)})`; g.fillRect(0, 0, R.w, R.h); }
}
function drawWords(g, dt) {
  const ui = Math.max(0.75, Math.min(1.25, R.h / 760));
  for (const w of words) { w.life -= dt; const k = w.life / w.max, q = project(w.x, w.y, w.h + (1 - k) * 0.6), pop = 1 + Math.max(0, k - 0.8) * 3;
    g.save(); g.globalAlpha = Math.min(1, k * 3); g.translate(q.x, q.y); g.rotate(-0.08); txt(g, w.text, 0, 0, w.size * ui * pop, w.col); g.restore(); }
  for (let i = words.length - 1; i >= 0; i--) if (words[i].life <= 0) words.splice(i, 1);
  if (words.length > 24) words.splice(0, words.length - 24);
}
/* ---------- frame ---------- */
export function frame(dt) {
  if (!R.ready) return;
  R.time += dt;
  if (R.mode === "battle") {
    setTheme(S.curTheme());
    handleEvents(); syncPets(dt); syncEnemies(dt); syncHero(dt); syncComps(dt); syncShots(); syncHeroShots(); syncHeroZones(dt);
    SH.iceFloor.material.opacity = B.iceFloorT > 0 ? Math.min(0.42, B.iceFloorT * 0.2) : 0;
    R.hemi.intensity = (R.theme === "volcano" ? 1.2 : 1.55) * (B.darkSkyT > 0 ? 0.6 : 1);
    if (decor && decor.userData.sea) decor.userData.sea.position.z = -8.2 + Math.sin(R.time) * 0.1;
  }
  for (let i = anims.length - 1; i >= 0; i--) { const a = anims[i]; a.t += dt; const k = Math.min(1, a.t / a.dur); a.fn(k); if (k >= 1) { anims.splice(i, 1); if (a.done) a.done(); } }
  if (titleGroup && titleGroup.visible) titleAnim(dt);
  fx.update(dt);
  renderer.render(scene, camera);
  drawOverlay(dt);
}
export function clearBattle() {
  for (const k of Object.keys(views)) { for (const v of views[k].values()) if (v.root) scene.remove(v.root); views[k].clear(); }
  if (heroView) { scene.remove(heroView.root); heroView = null; }
  words.length = 0; banner = null; B.ev.length = 0;
}
/* tap -> gen-1 field pixel coords */
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
export function pick(cx, cy, h) {
  const nd = new THREE.Vector2(cx / R.w * 2 - 1, -(cy / R.h) * 2 + 1); ray.setFromCamera(nd, camera);
  plane.constant = -(h || 0); const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(plane, p)) return null;
  return { x: p.x * TILE + 270, y: p.z * TILE + 400 };
}
/* ---------- crisp portraits for DOM cards (rendered once with a tiny renderer) ---------- */
let pr = null;
export function portrait(kind, id, size) {
  size = size || 160;
  if (!pr) { pr = { r: new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }), s: new THREE.Scene(), c: new THREE.PerspectiveCamera(26, 1, 0.1, 20) };
    pr.r.setPixelRatio(1); pr.r.outputColorSpace = THREE.SRGBColorSpace; pr.s.add(new THREE.HemisphereLight("#ffffff", "#8a7a6a", 1.7)); const d = new THREE.DirectionalLight("#ffffff", 2.2); d.position.set(2, 5, 6); pr.s.add(d); }
  pr.r.setSize(size, size, false);
  const g = kind === "hero" ? M.heroModel(id, PET) : kind === "slime" ? M.slimeModel(id, ENEMY[id]) : M.petModel(PET[id]);
  pr.s.add(g); const tall = kind === "hero" ? 1.0 : 0.95; pr.c.position.set(0, tall * 0.62 + 0.9, 3.3); pr.c.lookAt(0, tall * 0.47, 0);
  pr.r.render(pr.s, pr.c); const url = pr.r.domElement.toDataURL("image/png"); pr.s.remove(g); return url;
}
/* ---------- title scene: the pets, a hero and a few slimes bouncing on the orchard ---------- */
export function showTitle(on, heroKey) {
  R.mode = on ? "title" : "battle";
  if (!titleGroup) {
    titleGroup = new THREE.Group(); const list = ["chili", "chestnut", "berry", "lychee", "melon", "lemon", "coco", "taro", "peach", "blueberry", "pitaya", "mango"];
    list.forEach((id, i) => { const g = M.petModel(PET[id]); g.userData.inner.rotation.x = -0.2; const row = i < 6 ? 0 : 1; g.position.set((i % 6 - 2.5) * 1.05, 0, 1.6 + row * 1.0); g.userData.ph = i * 0.7; g.add(shadow(0.9)); titleGroup.add(g); });
    ["sprout", "jelly", "ember", "zap", "boss1"].forEach((id, i) => { const g = M.slimeModel(id, ENEMY[id]); g.userData.inner.rotation.x = -0.25; const s = ENEMY[id].size / 80; g.scale.setScalar(s); g.position.set(id === "boss1" ? 0 : (i - 1.5) * 1.6 - (i > 1 ? -0.4 : 0.4), 0, id === "boss1" ? -3.0 : -1.4); g.userData.ph = i; g.userData.slime = true; g.add(shadow(0.9)); titleGroup.add(g); });
    scene.add(titleGroup);
  }
  titleGroup.visible = on;
  if (on) { setTheme("orchard"); clearBattle(); }
}
function titleAnim(dt) {
  for (const g of titleGroup.children) { const ph = g.userData.ph || 0, b = Math.abs(Math.sin(R.time * (g.userData.slime ? 4 : 3) + ph));
    g.userData.inner.position.y = b * 0.22; const sq = 1 + (1 - b) * 0.08; g.userData.inner.scale.set(sq, 1 / sq, sq); g.userData.inner.rotation.y = Math.sin(R.time + ph) * 0.25; }
  if (rnd() < 0.25) fx.trail((rnd() - 0.5) * 7, 0.2 + rnd() * 2, (rnd() - 0.5) * 6, ["#ffd23a", "#ff8ab8", "#7fe07a", "#8fdcff"][Math.floor(rnd() * 4)], 0.25, 1.2, { up: 0.6 });
}
export const _debug = { views, anims, words };
