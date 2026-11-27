/* 2.5D crayon cardboard diorama renderer (gen-2 paper-craft style).
   Draws the gen-1 field (540x724 px, 5 lanes) as a raised crayon island; pets / slimes / hero are
   gen-1 crayon sprites glued onto cardboard standees. Same API as before: init, resize, frame,
   project, pick, portrait, showTitle, clearBattle, word, R. */
import * as D from "./data.js";
import * as S from "./sim.js";
const { B } = S;
const { TILE, PET, ENEMY, FENCE_Y } = D;
const PC = window.PaperCraft;
const { hash, jit, sampleSmoothLoop, makeEllipsePts, tracePoly, fillWaxCrayon, drawCrumpledPaperOverlay, getStandeeFlashCv } = PC;
const rnd = Math.random, TAU = Math.PI * 2, OL = "#2b1b22";
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const FONT = "'Baloo 2','Fredoka','Arial Rounded MT Bold','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',sans-serif";
export const R = { ready: false, w: 1, h: 1, dpr: 1, theme: "orchard", time: 0, mode: "title", low: false, topInset: 0, loaded: false };
let cv, ctx, overlay, octx;

/* ---------- sprites -> cardboard standees (gen-2 pipeline) ---------- */
export const ENEMY_IMG = { sprout: "z-1", jelly: "z-2", ember: "z-3", zap: "z-4", pebble: "z-5", puff: "z-6", boss1: "b-1", boss2: "b-2", boss3: "b-3",
  split: "mob-split-big", splitling: "mob-split-small", thief: "mob-thief", shield: "mob-shield", spitter: "mob-ranged", mage: "mob-mage", mini: "mob-mini" };
const PET_IDS = Object.keys(PET);
let LAYERS = {};
function buildSprites() {
  const specs = PET_IDS.map(id => [id, `assets/pets/${id}-1.webp`, { maxW: 174, maxH: 188 }]);
  for (const k of Object.keys(ENEMY_IMG)) specs.push(["e:" + k, `assets/enemies/${ENEMY_IMG[k]}.webp`, { maxW: ENEMY[k].boss ? 186 : 164, maxH: ENEMY[k].boss ? 206 : 192, noCardboard: true }]);
  specs.push(["egg", "assets/fx/hen-egg.webp", { maxW: 164, maxH: 178 }]);
  LAYERS = PC.buildCardboardStandees(specs);
  Object.assign(LAYERS, extraProps());
  PC.whenReady(() => { R.loaded = true; bgKey = ""; });
}
/* extra crayon prop standees for beach / volcano (same gen-1 crayon outline look as gen-2's tree/bush) */
function extraProps() {
  const S2 = 260, cx = 130, by = 236, out = {};
  const mk = (fn) => { const c = document.createElement("canvas"); c.width = S2; c.height = S2; const g = c.getContext("2d"); fn(g); return [{ zOff: 0, cv: c }]; };
  const g1 = (g, pts, fill, lw = 4.2) => { g.save(); tracePoly(g, pts); g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = OL; g.lineJoin = "round"; g.stroke(); g.restore(); };
  out.palm = mk((g) => {
    g1(g, sampleSmoothLoop([[cx - 12, by], [cx - 4, by - 70], [cx + 8, by - 140], [cx + 20, by - 138], [cx + 10, by - 70], [cx + 12, by]], 3), "#b88a5a");
    g.strokeStyle = "#7a5030"; g.lineWidth = 2.5; for (let i = 1; i < 7; i++) { const y = by - i * 20; g.beginPath(); g.moveTo(cx - 6 + i, y); g.lineTo(cx + 10 + i * 1.2, y - 4); g.stroke(); }
    for (const [a, l] of [[-2.7, 78], [-2.1, 70], [-1.5, 60], [-0.9, 70], [-0.35, 78]]) {
      const x0 = cx + 14, y0 = by - 142, x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l * 0.7 + 26;
      g1(g, sampleSmoothLoop([[x0, y0], [lerp(x0, x1, 0.5) - Math.sin(a) * 14, lerp(y0, y1, 0.5) - 18], [x1, y1], [lerp(x0, x1, 0.5) + Math.sin(a) * 4, lerp(y0, y1, 0.5) - 2]], 3), "#3fae5a", 3.6);
    }
    for (const dx of [-8, 8]) g1(g, makeEllipsePts(cx + 14 + dx, by - 132, 9, 9, 10, 3), "#7a5030", 2.6);
  });
  out.umbrella = mk((g) => {
    g.strokeStyle = OL; g.lineWidth = 7; g.beginPath(); g.moveTo(cx, by); g.lineTo(cx + 6, by - 120); g.stroke(); g.strokeStyle = "#fff"; g.lineWidth = 3.5; g.stroke();
    const top = [[cx - 84, by - 104], [cx - 52, by - 150], [cx + 6, by - 168], [cx + 64, by - 150], [cx + 94, by - 104]];
    g1(g, sampleSmoothLoop([...top, [cx + 50, by - 112], [cx + 6, by - 116], [cx - 40, by - 112]], 3), "#ff5a6a", 4.4);
    g.save(); g.fillStyle = "#fff4f0"; g.beginPath(); g.moveTo(cx + 6, by - 166); g.lineTo(cx - 20, by - 112); g.lineTo(cx + 28, by - 114); g.closePath(); g.fill(); g.restore();
    g1(g, makeEllipsePts(cx - 36, by - 8, 40, 12, 14, 5), "#f2c879", 3);
  });
  out.shellrock = mk((g) => {
    g1(g, sampleSmoothLoop([[cx - 56, by], [cx - 44, by - 46], [cx + 6, by - 58], [cx + 52, by - 26], [cx + 48, by + 2]], 4), "#c8b8a8");
    g1(g, sampleSmoothLoop([[cx - 10, by - 50], [cx + 12, by - 74], [cx + 32, by - 52], [cx + 12, by - 42]], 3), "#ffb0b8", 3);
    g1(g, makeEllipsePts(cx + 40, by - 10, 16, 10, 10, 6), "#ff8a5a", 3);
  });
  out.lavarock = mk((g) => {
    g1(g, sampleSmoothLoop([[cx - 60, by], [cx - 46, by - 58], [cx - 4, by - 76], [cx + 44, by - 50], [cx + 58, by + 2]], 4), "#4a3a38");
    g.strokeStyle = "#ff7a2a"; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.moveTo(cx - 30, by - 44); g.lineTo(cx - 8, by - 30); g.lineTo(cx + 4, by - 52); g.lineTo(cx + 26, by - 30); g.stroke();
    g.strokeStyle = "#ffd23a"; g.lineWidth = 2; g.stroke();
  });
  out.deadtree = mk((g) => {
    g1(g, sampleSmoothLoop([[cx - 14, by], [cx - 10, by - 90], [cx - 40, by - 140], [cx - 30, by - 146], [cx - 2, by - 110], [cx + 4, by - 150], [cx + 16, by - 150], [cx + 12, by - 100], [cx + 44, by - 128], [cx + 50, by - 120], [cx + 14, by - 76], [cx + 16, by]], 3), "#5a4038");
    g.strokeStyle = "#ff7a2a"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 4, by - 20); g.lineTo(cx + 2, by - 60); g.stroke();
  });
  out.mammoth = mk((g) => {
    g1(g, sampleSmoothLoop([[cx - 70, by - 20], [cx - 78, by - 90], [cx - 30, by - 150], [cx + 40, by - 150], [cx + 80, by - 100], [cx + 76, by - 40], [cx + 40, by - 20]], 4), "#8a7262");
    for (const lx of [-50, -18, 22, 52]) g1(g, [[cx + lx - 13, by - 40], [cx + lx + 13, by - 40], [cx + lx + 12, by], [cx + lx - 12, by]], "#6e5a4e", 3.4);
    g1(g, sampleSmoothLoop([[cx + 66, by - 96], [cx + 100, by - 60], [cx + 96, by - 8], [cx + 82, by - 10], [cx + 82, by - 56], [cx + 56, by - 80]], 3), "#8a7262", 3.8);
    g1(g, sampleSmoothLoop([[cx + 58, by - 70], [cx + 96, by - 48], [cx + 112, by - 74], [cx + 100, by - 54], [cx + 64, by - 58]], 2), "#fffdf4", 3);
    g.fillStyle = OL; g.beginPath(); g.arc(cx + 54, by - 108, 6, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(cx + 56, by - 110, 2, 0, TAU); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 3; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(cx - 50 + i * 20, by - 140 + (i % 2) * 6); g.lineTo(cx - 44 + i * 20, by - 120); g.stroke(); }
  });
  return out;
}

/* ---------- camera: gen-2 style tilted projection with light perspective (field px -> screen) ---------- */
const cam = { ox: 0, oy: 0, tw: 60, th: 40, zs: 55, port: false };
const PK = 0.03;
const BX0 = -26, BX1 = 566, BY0 = 30, BY1 = 750, SLAB = 0.55;
export function P(x, y, h) {
  const cx = (x - 270) / TILE, cy = (y - 400) / TILE, p = 1 / (1 - cy * PK);
  return [cam.ox + cx * cam.tw * p, cam.oy + (cy * cam.th - (h || 0) * cam.zs) * p, p];
}
const kpx = (p) => cam.tw / TILE * p;   // field px -> screen px at depth factor p
export function project(x, y, h) { const q = P(x, y, h); return { x: q[0], y: q[1] }; }
export function pick(sx, sy, h) {
  const dx = sx - cam.ox, dy = sy - cam.oy, hz = (h || 0) * cam.zs;
  const cy = (dy + hz) / (cam.th + dy * PK), p = 1 / (1 - cy * PK);
  return { x: dx / (cam.tw * p) * TILE + 270, y: cy * TILE + 400 };
}
function fitCamera() {
  const W = R.w, H = R.h; cam.port = H / W > 1.2;
  /* portrait title: fill the height (sides may crop) so no empty meadow is left under the board */
  const cover = R.mode === "title" && cam.port;
  const tilt = clamp(0.44 * H / W + 0.24, 0.68, 0.84);
  cam.tw = 60; cam.th = cam.tw * tilt; cam.zs = cam.tw * 0.9; cam.ox = W / 2; cam.oy = H / 2;
  const top = R.topInset + (cam.port ? 4 : 8), bot = H - (cam.port ? 2 : 6);
  /* x extents: board corners; y extents also include the back-row tree tops (props at y~14-28, ~1.7 tiles tall) */
  const pts = () => [P(BX0, BY0, 0), P(BX1, BY0, 0), P(BX0, BY1, -SLAB), P(BX1, BY1, -SLAB), P(270, 86, 1.15)];
  const tops = () => [P(270, 16, 1.72), P(BX0, 26, 1.8)];
  const ext = () => { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const q of pts()) { a = Math.min(a, q[0]); b = Math.max(b, q[0]); c = Math.min(c, q[1]); d = Math.max(d, q[1]); } for (const q of tops()) c = Math.min(c, q[1]); return [a, b, c, d]; };
  for (let it = 0; it < 5; it++) {
    let [x0, x1, y0, y1] = ext();
    const sw = (W - 4) / (x1 - x0), sh = (bot - top) / (y1 - y0);
    const sc = cover ? Math.min(sh, sw * 1.7) : Math.min(sw, sh);
    cam.tw *= sc; cam.th *= sc; cam.zs *= sc;
    const [a, b, c, d] = ext();
    cam.ox += W / 2 - (a + b) / 2; cam.oy += (top + bot) / 2 - (c + d) / 2;
  }
  bgKey = "";
}
export function init(canvas, ov) {
  cv = canvas; ctx = cv.getContext("2d"); overlay = ov; octx = ov.getContext("2d");
  R.low = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || Math.min(screen.width, screen.height) < 500;
  buildSprites();
  R.ready = true;
}
export function resize(w, h, topInset) {
  R.topInset = topInset || 0; R.w = Math.max(1, w); R.h = Math.max(1, h);
  R.dpr = Math.min(devicePixelRatio || 1, R.low ? 2 : 2);
  for (const c of [cv, overlay]) { c.width = Math.round(R.w * R.dpr); c.height = Math.round(R.h * R.dpr); }
  fitCamera();
}

/* ---------- themed crayon diorama board (cached) ---------- */
const THEMES = {
  orchard: { sky: ["#fdf6de", "#f8eed2", "#e8efd0"], hill: ["rgba(176,218,120,0.5)", "rgba(146,200,92,0.45)"], a: "#96cf4e", b: "#80bc38", side: "#6fb23c", hiA: "#c4f082", hiB: "#ace26a",
    tileOl: "rgba(43,86,28,0.42)", rim: "#74c246", rimHi: "#b8ef7c", cliff: "#9f6f46", cliffD: "#7d5230", hatch: "#6b4324", lip: "#6bc442", pebble: "#c89b6e", sun: true },
  beach: { sky: ["#d8f1ff", "#eaf7fb", "#fbf0d6"], hill: ["rgba(92,190,255,0.55)", "rgba(60,160,240,0.5)"], a: "#f6e2aa", b: "#ecd290", side: "#e2c37e", hiA: "#fff6d4", hiB: "#fbe9b6",
    tileOl: "rgba(150,110,50,0.36)", rim: "#f2d896", rimHi: "#fff4cc", cliff: "#c89b6e", cliffD: "#a8784c", hatch: "#7d5230", lip: "#fbe7b0", pebble: "#f7f0e0", sun: true, sea: true },
  volcano: { sky: ["#fbe2cc", "#f2bf9c", "#e0967a"], hill: ["rgba(120,70,64,0.5)", "rgba(92,52,48,0.5)"], a: "#9a7c6e", b: "#8a6c60", side: "#765a50", hiA: "#b89a8a", hiB: "#a88a7a",
    tileOl: "rgba(40,20,14,0.45)", rim: "#6a524a", rimHi: "#a08070", cliff: "#5a423a", cliffD: "#43302a", hatch: "#24160f", lip: "#ff7a2a", pebble: "#ff9a4a", sun: false, lava: true }
};
const XS = [0, 65, 147, 229, 311, 393, 475, 540], YS = [59, 141, 223, 305, 387, 469, 551, 631, 713];
const PROPS = {
  orchard: [["tree", -6, 26, 1.25], ["tree", 150, 14, 1.12], ["tree", 392, 16, 1.15], ["tree", 548, 28, 1.25], ["bush", 72, 22, 0.8], ["bush", 270, 16, 0.85], ["bush", 470, 20, 0.8],
    ["bush", 24, 300, 0.62], ["rock", 518, 230, 0.6], ["sign", 22, 520, 0.62], ["bush", 516, 470, 0.62], ["rock", 24, 150, 0.5], ["bush", 520, 620, 0.55]],
  beach: [["palm", -4, 26, 1.35], ["umbrella", 170, 18, 1.05], ["palm", 380, 14, 1.3], ["palm", 548, 30, 1.35], ["shellrock", 84, 22, 0.75], ["shellrock", 470, 20, 0.7],
    ["shellrock", 22, 300, 0.55], ["umbrella", 518, 250, 0.7], ["sign", 22, 520, 0.6], ["shellrock", 518, 480, 0.55]],
  volcano: [["deadtree", -6, 26, 1.2], ["lavarock", 140, 18, 0.95], ["deadtree", 402, 14, 1.15], ["lavarock", 548, 28, 1.0], ["rock", 270, 16, 0.75], ["lavarock", 70, 20, 0.7],
    ["lavarock", 22, 300, 0.55], ["rock", 518, 230, 0.6], ["sign", 22, 520, 0.6], ["lavarock", 518, 480, 0.55]]
};
function cpoly(c, pts, fill, seed, o = {}) {
  const lw = o.lw ?? 2.4, amp = o.amp ?? 1.3;
  const j = pts.map(([x, y], i) => [x + jit(i, seed) * amp, y + jit(i + 37, seed + 7) * amp]);
  c.save(); tracePoly(c, j);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (o.hatch) { c.save(); c.clip(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of j) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    c.strokeStyle = o.hatch; c.globalAlpha = o.hatchAlpha ?? 0.25; c.lineWidth = 2; const st = o.hatchStep ?? 11;
    for (let x = x0 - (y1 - y0); x < x1 + (y1 - y0); x += st) { c.beginPath(); c.moveTo(x, y0); c.lineTo(x + (y1 - y0) * 0.45, y1); c.stroke(); } c.restore(); }
  if (o.hi) { c.save(); c.strokeStyle = o.hi; c.lineWidth = o.hiW ?? 3.5; c.globalAlpha = o.hiAlpha ?? 0.42; c.lineCap = "round"; c.beginPath(); c.moveTo(j[0][0], j[0][1]); c.lineTo(j[1][0], j[1][1]); c.stroke(); c.restore(); }
  if (lw > 0) { tracePoly(c, j); c.strokeStyle = o.ol || OL; c.lineWidth = lw; c.lineJoin = "round"; c.stroke(); }
  c.restore();
}
const quad = (x0, y0, x1, y1, h = 0) => [P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)];
let bg = null, bgKey = "";
function drawBoard(c, theme) {
  const T = THEMES[theme] || THEMES.orchard, W = R.w, H = R.h;
  const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, T.sky[0]); gr.addColorStop(0.45, T.sky[1]); gr.addColorStop(1, T.sky[2]);
  c.fillStyle = gr; c.fillRect(0, 0, W, H);
  c.save(); c.fillStyle = "rgba(255,253,240,0.4)";
  for (let i = 0; i < 3; i++) { const bx = W * (0.04 + i * 0.24); c.beginPath(); c.moveTo(bx, 0); c.lineTo(bx + W * 0.12, 0); c.lineTo(bx + W * 0.36, H); c.lineTo(bx + W * 0.16, H); c.closePath(); c.fill(); }
  c.restore();
  const far = P(270, BY0, 0)[1];
  // back scenery: hills / sea / volcano cones
  if (T.lava) for (const [fx, s] of [[0.16, 1], [0.55, 1.35], [0.9, 0.9]]) {
    const bx = W * fx, by = far + 6, w = W * 0.2 * s, h = Math.min(H * 0.2, w * 0.8);
    cpoly(c, [[bx - w, by], [bx - w * 0.18, by - h], [bx + w * 0.18, by - h], [bx + w, by]], "#7a5048", 40 + s * 9, { lw: 2.6, hatch: "#4a2a24", hatchAlpha: 0.3 });
    cpoly(c, [[bx - w * 0.18, by - h], [bx - w * 0.06, by - h * 0.7], [bx + w * 0.05, by - h * 0.86], [bx + w * 0.18, by - h]], "#ff7a2a", 50 + s, { lw: 2 });
    for (let k = 0; k < 3; k++) cpoly(c, makeEllipsePts(bx + k * w * 0.12, by - h - 16 - k * 20, 16 + k * 8, 11 + k * 5, 12, 60 + k), "rgba(120,100,100,0.55)", 61 + k, { lw: 1.6, ol: "rgba(43,27,34,0.4)" });
  }
  for (let li = 0; li < 2; li++) {
    const pts = [[0, H], [0, far - 30 + li * 22]];
    for (let x = 0; x <= W + 50; x += 50) pts.push([x, far - 34 + li * 26 + (T.sea ? Math.sin(x * 0.03 + li) * 4 : Math.sin(x * 0.006 + 0.7 + li) * 20)]);
    pts.push([W, H]); tracePoly(c, pts); c.fillStyle = T.hill[li]; c.fill();
  }
  if (T.sea) { c.save(); c.strokeStyle = "rgba(255,255,255,0.85)"; c.lineWidth = 2.4; c.lineCap = "round";
    for (let i = 0; i < 14; i++) { const x = (hash(i, 3) * W), y = far - 22 + hash(i, 9) * 34; c.beginPath(); c.arc(x, y, 7, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); } c.restore(); }
  if (T.sun) { const sx = W * 0.12, sy = Math.max(R.topInset + 30, far * 0.42), sr = Math.min(W, H) * 0.045;
    c.save(); c.strokeStyle = OL; c.lineWidth = 2.6; c.lineCap = "round";
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; c.beginPath(); c.moveTo(sx + Math.cos(a) * sr * 1.24, sy + Math.sin(a) * sr * 1.24); c.lineTo(sx + Math.cos(a) * sr * 1.62, sy + Math.sin(a) * sr * 1.62); c.stroke(); }
    c.restore(); cpoly(c, makeEllipsePts(sx, sy, sr, sr, 18, 20), "#ffe564", 20, { lw: 2.8, amp: 1.1 });
    for (let ci = 0; ci < 3; ci++) { const clx = W * (0.36 + ci * 0.26), cly = Math.max(R.topInset + 20, far * (0.3 + (ci % 2) * 0.22)), u = Math.min(W, H) * 0.034;
      cpoly(c, sampleSmoothLoop([[clx - u * 1.5, cly + u * 0.3], [clx - u * 1.3, cly - u * 0.3], [clx - u * 0.4, cly - u * 0.65], [clx + u * 0.45, cly - u * 0.72], [clx + u * 1.25, cly - u * 0.32], [clx + u * 1.55, cly + u * 0.3], [clx, cly + u * 0.4]], 3), "#ffffff", 30 + ci, { lw: 2, ol: "rgba(43,27,34,0.35)" }); } }
  // raised cardboard island: shadow, side + front cliffs, rim
  const tl = P(BX0, BY0, 0), tr = P(BX1, BY0, 0), br = P(BX1, BY1, 0), bl = P(BX0, BY1, 0);
  const tlD = P(BX0, BY0, -SLAB), trD = P(BX1, BY0, -SLAB), brD = P(BX1, BY1, -SLAB), blD = P(BX0, BY1, -SLAB);
  c.save(); c.fillStyle = "rgba(43,27,34,0.2)"; tracePoly(c, [[tlD[0] - 6, tlD[1] + 10], [trD[0] + 6, trD[1] + 10], [brD[0] + 16, brD[1] + 16], [blD[0] - 16, blD[1] + 16]]); c.fill(); c.restore();
  cpoly(c, [tl, bl, blD, tlD], T.cliffD, 110, { lw: 3, hatch: T.hatch, hatchAlpha: 0.28 });
  cpoly(c, [tr, br, brD, trD], T.cliffD, 111, { lw: 3, hatch: T.hatch, hatchAlpha: 0.28 });
  cpoly(c, [bl, br, brD, blD], T.cliff, 112, { lw: 3.2, amp: 1.5, hatch: T.hatch, hatchStep: 12, hatchAlpha: 0.25 });
  const nP = 9; for (let i = 0; i < nP; i++) { const t = (i + 0.5) / nP, x = lerp(bl[0], br[0], t), y = lerp(bl[1], br[1], t) + (blD[1] - bl[1]) * 0.6;
    cpoly(c, makeEllipsePts(x, y, cam.tw * 0.1, cam.tw * 0.055, 10, 210 + i), T.pebble, 210 + i, { lw: 1.8 }); }
  if (T.lava) for (let i = 0; i < 6; i++) { const t = (i + 0.3) / 6, x = lerp(bl[0], br[0], t), y0 = lerp(bl[1], br[1], t);
    c.save(); c.strokeStyle = "#ff7a2a"; c.lineWidth = Math.max(3, cam.tw * 0.07); c.lineCap = "round"; c.beginPath(); c.moveTo(x, y0); c.lineTo(x + 3, y0 + (blD[1] - bl[1]) * (0.4 + hash(i, 4) * 0.4)); c.stroke(); c.restore(); }
  cpoly(c, [bl, br, [br[0], br[1] + (brD[1] - br[1]) * 0.3], [bl[0], bl[1] + (blD[1] - bl[1]) * 0.3]], T.lip, 113, { lw: 2.6 });
  cpoly(c, [tl, tr, br, bl], T.rim, 115, { lw: 3.4, hi: T.rimHi, hiW: 5, hiAlpha: 0.45 });
  // crayon checkerboard tiles (lanes = columns 1..5; side strips = darker hedge)
  for (let r = 0; r < YS.length - 1; r++) for (let ci = 0; ci < XS.length - 1; ci++) {
    const side = ci === 0 || ci === XS.length - 2, even = (r + ci) % 2 === 0;
    const pts = quad(XS[ci], YS[r], XS[ci + 1], YS[r + 1]);
    cpoly(c, pts, side ? T.side : even ? T.a : T.b, 500 + r * 13 + ci, { lw: 1.6, ol: T.tileOl, amp: 0.9, hi: even ? T.hiA : T.hiB, hiW: 2.2, hiAlpha: 0.36 });
    const rr = hash(ci + 5, r + 11), [gx, gy, pp] = P(XS[ci] + 18 + rr * 30, YS[r] + 60, 0);
    if (theme === "orchard" && rr > 0.5) { c.save(); c.strokeStyle = "#3c8422"; c.lineWidth = 2; c.lineCap = "round"; c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx - 3 * pp, gy - 7 * pp); c.moveTo(gx + 2 * pp, gy); c.lineTo(gx + 4 * pp, gy - 8 * pp); c.stroke();
      if (rr > 0.78) { c.fillStyle = (ci + r) % 2 ? "#ff78a8" : "#ffe258"; c.strokeStyle = OL; c.lineWidth = 1.3; c.beginPath(); c.arc(gx + 7 * pp, gy - 4 * pp, 3.4 * pp, 0, TAU); c.fill(); c.stroke(); } c.restore(); }
    if (theme === "beach" && rr > 0.72) cpoly(c, makeEllipsePts(gx, gy, 5 * pp, 3 * pp, 8, ci + r), rr > 0.86 ? "#ffb0b8" : "#fffaf0", ci * 3 + r, { lw: 1.3 });
    if (theme === "volcano" && rr > 0.55) { c.save(); c.strokeStyle = "#ff7a2a"; c.lineWidth = 2.6; c.lineCap = "round"; c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + 10 * pp, gy - 5 * pp); c.lineTo(gx + 18 * pp, gy + 2 * pp); c.stroke(); c.strokeStyle = "#ffd23a"; c.lineWidth = 1; c.stroke(); c.restore(); }
  }
  // spawn burrows at the top of each lane
  for (const lx of D.LANE_X) { const [x, y, pp] = P(lx, 84, 0), rx = cam.tw * 0.36 * pp, ry = cam.th * 0.2 * pp;
    cpoly(c, makeEllipsePts(x, y, rx, ry, 16, lx), theme === "volcano" ? "#4a2a24" : "#925230", lx, { lw: 2.2 });
    cpoly(c, makeEllipsePts(x, y + 1, rx * 0.64, ry * 0.58, 14, lx + 1), "#2a2430", lx + 1, { lw: 1.4 }); }
  // slot pads: crisp dashed chalk squares on the two pet rows
  for (let i = 0; i < 10; i++) { const p = S.slotPos(i), pts = quad(p.x - 34, p.y - 34, p.x + 34, p.y + 34);
    c.save(); tracePoly(c, pts); c.fillStyle = "rgba(255,255,240,0.16)"; c.fill(); c.setLineDash([5, 5]); c.strokeStyle = "rgba(255,255,240,0.7)"; c.lineWidth = 1.8; c.stroke(); c.restore(); }
  // gen-1 hazard fence strip
  const n = 18; for (let i = 0; i < n; i++) { const x0 = i * 540 / n, x1 = (i + 1) * 540 / n;
    cpoly(c, [P(x0, 716, 0), P(x1, 716, 0), P(x1 - 9, 734, 0), P(x0 - 9, 734, 0)], i % 2 ? OL : "#ffd23a", 900 + i, { lw: 1.2, amp: 0.5 }); }
  drawCrumpledPaperOverlay(c, W, H, 955, { cell: 104, strength: 0.42, coloredSurface: true });
}
function ensureBg(theme) {
  const key = theme + R.w + "x" + R.h + R.dpr + R.loaded + cam.tw.toFixed(2) + cam.oy.toFixed(1);
  if (bg && bgKey === key) return bg;
  if (!bg) bg = document.createElement("canvas");
  bg.width = cv.width; bg.height = cv.height; const c = bg.getContext("2d"); c.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
  drawBoard(c, theme); bgKey = key; return bg;
}

/* ---------- gen-2 cardboard standee helpers ---------- */
function baseShadow(c, sx, sy, wPx, gz, seed, tab, ring) {
  const rx = wPx * 0.44, ry = wPx * 0.16, lift = clamp(1 - gz * 0.55, 0.25, 1);
  c.save(); c.fillStyle = `rgba(34,40,16,${0.3 * lift})`; c.beginPath(); c.ellipse(sx + rx * 0.2, sy + 2, rx * (1.0 + gz * 0.2), ry * (1.0 + gz * 0.14), 0, 0, TAU); c.fill(); c.restore();
  if (ring) { c.save(); c.setLineDash([7, 5]); c.strokeStyle = ring; c.lineWidth = 2.6; c.beginPath(); c.ellipse(sx, sy, wPx * 0.56, wPx * 0.22, 0, 0, TAU); c.stroke(); c.restore(); }
  if (tab) {
    const tw = wPx * 0.36, th = Math.max(5, wPx * 0.075), lip = Math.max(5, wPx * 0.08);
    c.save(); c.beginPath(); c.moveTo(sx - tw, sy - th * 0.4); c.lineTo(sx + tw, sy - th * 0.4); c.lineTo(sx + tw * 1.12, sy + th * 0.6); c.lineTo(sx - tw * 1.12, sy + th * 0.6); c.closePath();
    c.fillStyle = "#c58e57"; c.fill(); c.strokeStyle = "#482a12"; c.lineWidth = 1.6; c.stroke();
    const y0 = sy + th * 0.6; c.beginPath(); c.rect(sx - tw * 1.12, y0, tw * 2.24, lip); c.fillStyle = "#2b1305"; c.fill();
    c.save(); c.clip(); c.strokeStyle = "#dda86c"; c.lineWidth = 1.4; c.beginPath();
    for (let fx = sx - tw * 1.12 - 2; fx <= sx + tw * 1.12 + 2; fx += 2) { const wy = y0 + lip * 0.5 + Math.sin((fx - sx) * 0.74 + seed) * lip * 0.27; if (fx === sx - tw * 1.12 - 2) c.moveTo(fx, wy); else c.lineTo(fx, wy); }
    c.stroke(); c.restore(); c.strokeStyle = "#3d220e"; c.lineWidth = 1.4; c.strokeRect(sx - tw * 1.12, y0, tw * 2.24, lip); c.restore();
  }
}
function standee(c, key, sx, sy, hPx, facing = 1, squash = 0, flash = 0, tilt = 0, flashCol = "#ffffff", sway = 0) {
  const arr = LAYERS[key]; if (!arr) return false;
  const sz = hPx * (260 / 210), rock = sway ? Math.sin(R.time * 1.8 + sway) * 0.025 : 0;
  for (const L of arr) {
    c.save(); c.translate(sx, sy); if (tilt + rock) c.rotate(tilt + rock);
    c.scale(facing * (1 + squash * 0.24), 1 / (1 + squash * 0.2));
    const dX = -sz * 0.5, dY = -sz + (24 / 260) * sz;
    c.drawImage(L.cv, dX, dY, sz, sz);
    if (flash > 0.08) { c.globalAlpha = Math.min(0.88, flash * 0.88); c.drawImage(getStandeeFlashCv(L.cv, flashCol), dX, dY, sz, sz); }
    c.restore();
  }
  return true;
}
function chip(c, pts, col, seed, o = {}) {
  const tx = o.tx ?? 4, ty = o.ty ?? 3;
  c.save(); c.translate(tx, ty); tracePoly(c, pts); c.fillStyle = "#6e4420"; c.fill(); c.strokeStyle = "#3d220e"; c.lineWidth = 1.4; c.stroke(); c.restore();
  c.save(); tracePoly(c, pts); c.fillStyle = col; c.fill(); c.strokeStyle = o.ol || OL; c.lineWidth = o.lw ?? 2; c.lineJoin = "round"; c.stroke(); c.restore();
}
function flame(c, sx, sy, s, seed, col = "#ff5524", inner = "#ffe658") {
  const sw = Math.sin(R.time * 13 + seed) * s * 0.14;
  chip(c, sampleSmoothLoop([[sx, sy + s * 0.22], [sx - s * 0.48, sy + s * 0.04], [sx - s * 0.42, sy - s * 0.62], [sx + sw, sy - s * 1.12], [sx + s * 0.44, sy - s * 0.6], [sx + s * 0.48, sy + s * 0.06]], 3), col, seed, { tx: 3, ty: 2, lw: 1.8 });
  c.save(); tracePoly(c, sampleSmoothLoop([[sx, sy + s * 0.12], [sx - s * 0.24, sy - s * 0.12], [sx + sw * 0.65, sy - s * 0.7], [sx + s * 0.24, sy - s * 0.1]], 2)); c.fillStyle = inner; c.fill(); c.restore();
}
function sword(c, sx, sy, len, ang, glow = "#72f5ff") {
  c.save(); c.translate(sx, sy); c.rotate(ang);
  c.fillStyle = glow; c.globalAlpha *= 0.9; c.beginPath(); c.moveTo(len * 0.88, 0); c.lineTo(len * 0.12, -len * 0.16); c.lineTo(-len * 0.12, -len * 0.13); c.lineTo(-len * 0.12, len * 0.13); c.lineTo(len * 0.12, len * 0.16); c.closePath(); c.fill();
  const blade = [[-len * 0.06, -len * 0.09], [len * 0.6, -len * 0.08], [len * 0.8, 0], [len * 0.6, len * 0.08], [-len * 0.06, len * 0.09]];
  tracePoly(c, blade); c.fillStyle = "#eef8ff"; c.fill(); c.strokeStyle = "#1a2858"; c.lineWidth = 1.8; c.stroke();
  c.fillStyle = "#f0b842"; c.fillRect(-len * 0.14, -len * 0.22, len * 0.1, len * 0.44); c.strokeStyle = "#3e2614"; c.lineWidth = 1.5; c.strokeRect(-len * 0.14, -len * 0.22, len * 0.1, len * 0.44);
  c.fillStyle = "#8a5228"; c.fillRect(-len * 0.34, -len * 0.06, len * 0.2, len * 0.12); c.strokeRect(-len * 0.34, -len * 0.06, len * 0.2, len * 0.12);
  c.restore();
}
function snowflake(c, sx, sy, r, rot) {
  c.save(); c.translate(sx, sy); c.rotate(rot); c.lineCap = "round";
  for (let pass = 0; pass < 2; pass++) { c.strokeStyle = pass ? "#eefaff" : "#153d88"; c.lineWidth = pass ? r * 0.13 : r * 0.26;
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, ca = Math.cos(a), sa = Math.sin(a); c.beginPath(); c.moveTo(0, 0); c.lineTo(ca * r, sa * r); c.stroke();
      const bx = ca * r * 0.56, by = sa * r * 0.56; c.beginPath(); c.moveTo(bx + Math.cos(a + 0.7) * r * 0.28, by + Math.sin(a + 0.7) * r * 0.28); c.lineTo(bx, by); c.lineTo(bx + Math.cos(a - 0.7) * r * 0.28, by + Math.sin(a - 0.7) * r * 0.28); c.stroke(); } }
  c.fillStyle = "#fff"; c.beginPath(); c.arc(0, 0, r * 0.18, 0, TAU); c.fill(); c.restore();
}
function bolt(c, x0, y0, x1, y1, w, seed, holy) {
  const pts = [], dx = x1 - x0, dy = y1 - y0, len = Math.max(1, Math.hypot(dx, dy)), nx = -dy / len, ny = dx / len;
  for (let i = 0; i <= 6; i++) { const f = i / 6, off = (i === 0 || i === 6) ? 0 : (hash(i * 11, seed) - 0.5) * w * 2.4; pts.push([lerp(x0, x1, f) + nx * off, lerp(y0, y1, f) + ny * off]); }
  c.save(); c.lineCap = "round"; c.lineJoin = "round";
  const path = () => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); };
  path(); c.strokeStyle = holy ? "#3d6ab8" : "#13428c"; c.lineWidth = w * 1.45; c.stroke();
  c.strokeStyle = holy ? "#fffef0" : "#ffe64a"; c.lineWidth = w * 0.78; c.stroke(); c.strokeStyle = "#fff"; c.lineWidth = w * 0.34; c.stroke();
  for (const b of [1, 3]) { const p = pts[b]; c.strokeStyle = holy ? "#fffef0" : "#ffe64a"; c.lineWidth = Math.max(1.5, w * 0.32); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0] + (b === 1 ? -1 : 1) * w * 2.4, p[1] + w * 2.6); c.stroke(); }
  c.restore();
}
function cloud(c, x, y, w, h, col, seed, ol = OL) {
  const pts = sampleSmoothLoop([[x - w, y + h * 0.25], [x - w * 0.85, y - h * 0.55], [x - w * 0.28, y - h * 0.95], [x + w * 0.28, y - h * 0.92], [x + w * 0.88, y - h * 0.48], [x + w, y + h * 0.25], [x + w * 0.4, y + h * 0.52], [x - w * 0.4, y + h * 0.52]], 3);
  c.save(); tracePoly(c, pts); c.fillStyle = col; c.fill(); c.strokeStyle = ol; c.lineWidth = 2.6; c.lineJoin = "round"; c.stroke(); c.restore();
}

/* ---------- 2D crayon FX (field px positions, h in tiles, sizes in tiles) ---------- */
const parts = [], gfx = [];   // gfx: ground decals / rings / bolts / stars / arcs
let CAP = 700;
const C = (h) => h;
function add(o) { if (parts.length >= CAP) parts.splice(0, parts.length - CAP + 1); o.max = o.life; parts.push(o); return o; }
function addG(o) { if (gfx.length > 160) gfx.shift(); o.t = 0; gfx.push(o); return o; }
const ELC = { fire: ["#ff6d28", "#ff3b14", "#fff799", "#6b1808"], lightning: ["#ffe944", "#1e96ff", "#fff799", "#13428c"], frost: ["#72d8ff", "#2672e8", "#eefaff", "#153d88"],
  water: ["#5cd0ff", "#2498ff", "#eefaff", "#0e437a"], rock: ["#e0a868", "#8c5a34", "#fff2d8", "#3e2614"], slash: ["#ffe24a", "#4eeeff", "#ffffff", "#1a2858"] };
const fx = {
  burst(x, y, h, col, n, o = {}) { n = Math.round(n * (R.low ? 0.6 : 1)); const spd = (o.spd ?? 3) * TILE, sz = o.size ?? 0.16;
    for (let i = 0; i < n; i++) { const a = rnd() * TAU, s = spd * (0.35 + rnd() * 0.75);
      add({ k: o.chip ? "chip" : "dab", x, y, h: h + (rnd() - 0.4) * 0.2, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.8, vh: (o.up ?? 1.6) * (0.4 + rnd()), g: o.grav ?? 5, col: Array.isArray(col) ? col[i % col.length] : col, s: sz * (0.6 + rnd() * 0.7), life: (o.life ?? 0.55) * (0.6 + rnd() * 0.6), rot: rnd() * TAU, vr: (rnd() - 0.5) * 12, drag: o.drag ?? 2.2 }); } },
  chunks(x, y, h, col, n, o = {}) { fx.burst(x, y, h, col, n, Object.assign({ chip: true, grav: 9, up: 3.5, size: 0.14, life: 0.9, drag: 1.2 }, o)); },
  flames(x, y, h, n, s = 0.3, o = {}) { n = Math.round(n * (R.low ? 0.6 : 1)); for (let i = 0; i < n; i++) add({ k: "flame", x: x + (rnd() - 0.5) * (o.spread ?? 30), y: y + (rnd() - 0.5) * (o.spread ?? 30) * 0.6, h: h, vx: (rnd() - 0.5) * 30, vy: (rnd() - 0.5) * 20, vh: (o.up ?? 1.6) * (0.5 + rnd()), g: -0.5, col: o.col || "#ff5524", in: o.inner || "#ffe658", s: s * (0.6 + rnd() * 0.6), life: 0.45 + rnd() * 0.35, drag: 1.5, seed: rnd() * 99 }); },
  snow(x, y, h, n, s = 0.22, o = {}) { for (let i = 0; i < n; i++) { const a = rnd() * TAU, sp = (o.spd ?? 1.6) * TILE * (0.3 + rnd()); add({ k: "snow", x, y, h, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8, vh: o.up ?? 0.8, g: o.grav ?? 1.5, s: s * (0.6 + rnd() * 0.6), life: 0.7 + rnd() * 0.4, rot: rnd() * TAU, vr: (rnd() - 0.5) * 8, drag: 2 }); } },
  drops(x, y, h, n, col = "#4ec6ff", o = {}) { fx.burst(x, y, h, [col, "#e4f8ff", "#2498ff"], n, Object.assign({ grav: 10, up: 3.6, size: 0.12, life: 0.8, drag: 1 }, o)); },
  ring(x, y, r0, r1, col, life, o = {}) { addG({ k: "ring", x, y, h: o.h || 0, r0, r1, col, life: life || 0.4, w: o.w || 5 }); },
  flash(x, y, h, col, r, life) { addG({ k: "flash", x, y, h, col, r: r * TILE * 0.5, life: life || 0.2 }); },
  decal(x, y, r, col, life) { addG({ k: "decal", x, y, r: r * TILE, col, life: life || 2, seed: rnd() * 99 }); },
  bolt(x1, y1, h1, x2, y2, h2, life, w, holy) { addG({ k: "bolt", x1, y1, h1, x2, y2, h2, life: life || 0.2, w: w || 4, holy, seed: rnd() * 99 }); },
  arc(x, y, h, r, a0, a1, col, life, w) { addG({ k: "arc", x, y, h, r, a0, a1, col, life: life || 0.22, w: w || 0.14 }); },
  star(x, y, h, fk, size, word, life) { addG({ k: "star", x, y, h, fk: fk || "fire", size: size || 1, word: word || "", life: life || 0.42, seed: rnd() * 99 }); },
  spark(x, y, h, col, size, life) { addG({ k: "spark", x, y, h, col, size: size || 1, life: life || 0.26, seed: rnd() * 9 }); },
  anim(life, draw, done) { addG({ k: "anim", life, draw, done }); },
  screen(col, a, life) { addG({ k: "screen", col, a: Math.min(0.22, a), life }); },
  clear() { parts.length = 0; gfx.length = 0; }
};
R.fx = fx;
function stepParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= dt; if (q.life <= 0) { parts.splice(i, 1); continue; }
    const d = Math.exp(-(q.drag || 0) * dt); q.vx *= d; q.vy *= d; q.x += q.vx * dt; q.y += q.vy * dt; q.vh -= (q.g || 0) * dt; q.h += q.vh * dt;
    if (q.h < 0) { q.h = 0; q.vh = -q.vh * 0.35; q.vx *= 0.6; q.vy *= 0.6; } if (q.rot != null) q.rot += (q.vr || 0) * dt; }
  for (let i = gfx.length - 1; i >= 0; i--) { const g = gfx[i]; g.t += dt; if (g.t >= g.life) { gfx.splice(i, 1); if (g.done) g.done(); } }
}
function drawParts(c) {
  for (const q of parts) {
    const [sx, sy, pp] = P(q.x, q.y, q.h), k = kpx(pp) * TILE, a = clamp(q.life / q.max * 1.6, 0, 1), s = q.s * k;
    c.globalAlpha = a;
    if (q.k === "dab") { c.fillStyle = q.col; c.beginPath(); c.arc(sx, sy, Math.max(1.5, s * 0.5), 0, TAU); c.fill(); if (s > 7) { c.strokeStyle = OL; c.lineWidth = 1.4; c.stroke(); } }
    else if (q.k === "chip") { c.save(); c.translate(sx, sy); c.rotate(q.rot); c.fillStyle = q.col; c.strokeStyle = OL; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-s * 0.5, s * 0.35); c.lineTo(0, -s * 0.5); c.lineTo(s * 0.55, s * 0.3); c.closePath(); c.fill(); c.stroke(); c.restore(); }
    else if (q.k === "flame") flame(c, sx, sy, s, q.seed, q.col, q.in);
    else if (q.k === "snow") snowflake(c, sx, sy, s * 0.5, q.rot);
  }
  c.globalAlpha = 1;
}
function drawGround(c) {   // decals + rings live on the ground plane
  for (const g of gfx) { const k = g.t / g.life;
    if (g.k === "decal") { const [sx, sy, pp] = P(g.x, g.y, 0), r = g.r * kpx(pp); c.save(); c.globalAlpha = 0.5 * (1 - k); c.fillStyle = g.col;
      tracePoly(c, makeEllipsePts(sx, sy, r, r * cam.th / cam.tw, 12, g.seed, 0.18)); c.fill(); c.restore(); }
    else if (g.k === "ring") { const r = lerp(g.r0, g.r1, 1 - Math.pow(1 - k, 2.2)), [sx, sy, pp] = P(g.x, g.y, g.h), rr = r * kpx(pp);
      c.save(); c.globalAlpha = 1 - k; c.strokeStyle = OL; c.lineWidth = (g.w + 2.4) * (1 - k * 0.6); c.beginPath(); c.ellipse(sx, sy, rr, rr * cam.th / cam.tw, 0, 0, TAU); c.stroke();
      c.strokeStyle = g.col; c.lineWidth = g.w * (1 - k * 0.6); c.stroke(); c.restore(); }
  }
}
function drawAir(c) {
  for (const g of gfx) { const k = g.t / g.life;
    if (g.k === "flash") { const [sx, sy, pp] = P(g.x, g.y, g.h), r = g.r * kpx(pp) * (0.6 + k * 0.6);
      c.save(); c.globalAlpha = (1 - k) * 0.85; const gr = c.createRadialGradient(sx, sy, 0, sx, sy, r); gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.35, g.col); gr.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = gr; c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill(); c.restore(); }
    else if (g.k === "bolt") { const a = P(g.x1, g.y1, g.h1), b = P(g.x2, g.y2, g.h2); c.save(); c.globalAlpha = 1 - k * 0.5; bolt(c, a[0], a[1], b[0], b[1], g.w * kpx(b[2]) * 1.4 + 1, g.seed + Math.floor(R.time * 30), g.holy); c.restore(); }
    else if (g.k === "arc") { const N = 14, pts = []; for (let i = 0; i <= N; i++) { const a = lerp(g.a0, g.a1, i / N); pts.push(P(g.x + Math.cos(a) * g.r * TILE, g.y + Math.sin(a) * g.r * TILE, g.h)); }
      const w = g.w * TILE * kpx(pts[0][2]) * (1 - k * 0.5); c.save(); c.globalAlpha = 1 - k; c.lineCap = "round"; c.lineJoin = "round";
      for (const [col, lw] of [[OL, w + 4], [g.col, w], ["#ffffff", w * 0.35]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke(); } c.restore(); }
    else if (g.k === "spark") { const [sx, sy, pp] = P(g.x, g.y, g.h), r = cam.tw * 0.7 * g.size * (0.45 + k * 0.85) * pp; c.save(); c.translate(sx, sy); c.globalAlpha = 1 - k;
      c.strokeStyle = g.col; c.lineWidth = Math.max(2.4, 4.6 * pp * (1 - k * 0.5)); c.lineCap = "round";
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + g.seed, r0 = r * 0.3, r1 = r * (i % 2 ? 0.85 : 1.22); c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); c.stroke(); }
      c.fillStyle = "#fffef6"; c.beginPath(); c.arc(0, 0, r * 0.3 * (1 - k * 0.4), 0, TAU); c.fill(); c.restore(); }
    else if (g.k === "star") {   // gen-2 BIG explosive 3-layer starburst + comic word
      const [sx0, sy0, pp] = P(g.x, g.y, g.h), pop = easeOutBack(Math.min(1, k * 2.8)), fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      const rO = cam.tw * (cam.port ? 1.0 : 0.86) * g.size * pop * pp, rI = rO * 0.42, cc = ELC[g.fk] || ELC.fire;
      const hx = clamp(sx0, rO * 0.8, R.w - rO * 0.8), hy = clamp(sy0, R.topInset + rO * 0.6, R.h - rO * 0.5);
      const sp = g.fk === "frost" ? 6 : g.fk === "lightning" ? 9 : 8, o = [], m = [], cr = [];
      for (let i = 0; i < sp * 2; i++) { const a = i / (sp * 2) * TAU + g.seed, rr = (i % 2 ? rI : rO) * (0.88 + hash(i, g.seed) * 0.2);
        o.push([hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * 0.82]); m.push([hx + Math.cos(a + 0.16) * rr * 0.64, hy + Math.sin(a + 0.16) * rr * 0.54]); cr.push([hx + Math.cos(a + 0.32) * rr * 0.34, hy + Math.sin(a + 0.32) * rr * 0.28]); }
      c.save(); c.globalAlpha = fade * 0.85; chip(c, o, cc[0], g.seed, { tx: 5, ty: 4, lw: 2.4 }); chip(c, m, cc[1], g.seed + 3, { tx: 3, ty: 2.5, lw: 2 });
      c.globalAlpha = fade * 0.7; tracePoly(c, cr); c.fillStyle = cc[2]; c.fill(); c.restore();
      if (g.word) { c.save(); c.globalAlpha = fade; c.translate(hx, hy - rO * 0.1); c.rotate((hash(g.seed, 2) - 0.5) * 0.22); const fs = Math.round(Math.max(16, rO * 0.42));
        c.font = `900 ${fs}px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round"; c.strokeStyle = cc[3]; c.lineWidth = Math.max(4, fs * 0.2); c.strokeText(g.word, 0, 0); c.fillStyle = "#fffef8"; c.fillText(g.word, 0, 0); c.restore(); } }
    else if (g.k === "anim") g.draw(c, k);
    else if (g.k === "screen") { c.save(); c.globalAlpha = g.a * (1 - k); c.fillStyle = g.col; c.fillRect(0, 0, R.w, R.h); c.restore(); }
  }
}

/* ---------- sim events -> big crayon FX ---------- */
const words = []; let banner = null;
export function word(x, y, text, col, size, life) { words.push({ x, y, text, col: col || "#ffe14a", size: size || 30, life: life || 0.8, max: life || 0.8, h: 1.2 }); }
const HW = { fire: ["WHOOSH!", "BURN!", "燃!"], lightning: ["ZAP!", "CRACK!", "劈!"], frost: ["FREEZE!", "冰封!", "碎!"], water: ["SPLASH!", "浪涌!", "湿!"], rock: ["SMASH!", "砸!", "石化!"], slash: ["SLASH!", "斩!", "剑气!"] };
function impactFk(x, y, fk, crit, scale) {
  const s = scale || 1, cc = ELC[fk] || ELC.fire;
  if (s >= 0.8 || crit) fx.star(x, y, 0.5, fk, (crit ? 0.95 : 0.62) * s, crit ? "CRIT!" : (rnd() < 0.3 ? HW[fk][Math.floor(rnd() * 3)] : ""), crit ? 0.5 : 0.36);
  else fx.spark(x, y, 0.5, cc[0], 0.6 * s, 0.22);
  fx.ring(x, y, 6, (crit ? 70 : 46) * s, cc[0], 0.3, { w: 4 });
  if (fk === "fire") { fx.flames(x, y, 0.15, 5 * s, 0.32 * s); fx.burst(x, y, 0.5, ["#ff6d28", "#ffe24a", "#ff3b14"], 12 * s, { spd: 3 * s, up: 2.4 }); }
  else if (fk === "frost") { fx.snow(x, y, 0.5, 4 * s, 0.26 * s); fx.chunks(x, y, 0.5, ["#cfefff", "#9ce8ff", "#ffffff"], 8 * s, { spd: 2.6 }); }
  else if (fk === "water") fx.drops(x, y, 0.4, 14 * s);
  else if (fk === "rock") { fx.chunks(x, y, 0.3, ["#8c7464", "#a8907c", "#6e5a4e"], 12 * s, { spd: 2.8, size: 0.18 }); fx.burst(x, y, 0.15, "#e8d6c0", 8, { spd: 1.6, up: 0.6 }); }
  else if (fk === "lightning") { fx.bolt(x + (rnd() - 0.5) * 30, y - 10, 2.6, x, y, 0.3, 0.16, 3); fx.burst(x, y, 0.5, ["#ffe944", "#ffffff"], 10 * s, { spd: 3.2 }); }
  else if (fk === "slash") { const a = rnd() * TAU; fx.arc(x, y, 0.55, 0.55 * s, a, a + 2.4, "#5cf2ff", 0.18, 0.12); fx.burst(x, y, 0.5, ["#5cf2ff", "#ffe24a"], 8 * s, { spd: 3, chip: true }); }
}
function handleEvents() {
  for (const e of B.ev) {
    switch (e.t) {
      case "burst": fx.burst(e.x, e.y, 0.45, e.color, e.n * 1.4, { spd: 2.6 }); break;
      case "ring": fx.ring(e.x, e.y, e.r0, e.r1 * 1.1, e.color, e.life * 1.3); break;
      case "bolt": fx.bolt(e.x1, e.y1, (e.z1 || 0.5) * 1.6, e.x2, e.y2, 0.5, e.life * 1.3, 3.4); fx.flash(e.x2, e.y2, 0.5, e.color, 1.3, 0.18); fx.burst(e.x2, e.y2, 0.5, [e.color, "#fff"], 10, { spd: 2.5 }); break;
      case "goo": { const a = { x: e.x1, y: e.y1 }, b = { x: e.x2, y: e.y2 };
        fx.anim(e.life, (c, k) => { const [sx, sy, pp] = P(lerp(a.x, b.x, k), lerp(a.y, b.y, k), 0.5 + Math.sin(k * Math.PI) * 1.2); c.fillStyle = "#8adf4a"; c.strokeStyle = OL; c.lineWidth = 2; c.beginPath(); c.arc(sx, sy, 9 * pp * cam.tw / 60, 0, TAU); c.fill(); c.stroke(); },
          () => { fx.chunks(b.x, b.y, 0.5, "#8adf4a", 12, { spd: 1.6 }); fx.decal(b.x, b.y, 0.35, "#8adf4a", 2.5); }); break; }
      case "spawn": { const bo = ENEMY[e.e.typ].boss; fx.ring(e.e.x, e.e.y, 6, bo ? 180 : 70, bo ? "#ff3a6a" : "#b07aff", 0.45); fx.chunks(e.e.x, e.e.y, 0.1, ["#925230", "#6b4324", "#7cc35a"], bo ? 30 : 8, { spd: 1.8 }); break; }
      case "death": { const s = (e.size || 80) / 80;
        fx.star(e.x, e.y, 0.5, e.boss ? "rock" : "fire", (e.boss ? 1.6 : 0.8) * s, e.boss ? "K.O.!" : ["POP!", "BOP!", "啵!", "砰!"][Math.floor(rnd() * 4)], e.boss ? 0.9 : 0.42);
        fx.burst(e.x, e.y, 0.45, [e.color, "#ffffff", e.color], e.boss ? 70 : 22, { spd: 3.6 * s, size: 0.2 * s, life: 0.7 });
        fx.chunks(e.x, e.y, 0.45, [e.color, "#c58e57"], e.boss ? 34 : 10, { spd: 3 * s, size: 0.16 * s });
        fx.ring(e.x, e.y, 10, 100 * s, e.color, 0.4); fx.decal(e.x, e.y, 0.42 * s, e.color, 3);
        if (e.boss) { fx.ring(e.x, e.y, 30, 360, "#ffd23a", 0.8, { w: 8 }); fx.ring(e.x, e.y, 20, 260, "#ffffff", 0.6); fx.flash(e.x, e.y, 1, "#ffe14a", 7, 0.5); fx.screen("#fff6c0", 0.22, 0.4); word(e.x, e.y - 40, "K.O.!", "#ff4a5a", 64, 1.4);
          for (let i = 0; i < 6; i++) setTimeout(() => fx.star(e.x + (rnd() - 0.5) * 160, e.y + (rnd() - 0.5) * 120, 0.6, ["fire", "lightning", "slash"][i % 3], 0.8, ""), i * 90); }
        break; }
      case "lvup": case "heroLv": { fx.burst(e.x, e.y, 0.1, ["#ffd23a", "#7fe07a", "#ffffff"], 34, { spd: 1.2, up: 4.5, grav: 2, life: 0.9 });
        fx.ring(e.x, e.y, 10, 110, "#ffd23a", 0.5); fx.ring(e.x, e.y, 6, 80, "#7fe07a", 0.5, { h: 0.4 }); fx.flash(e.x, e.y, 0.8, "#ffe14a", 2.2, 0.35);
        if (e.t === "heroLv") { fx.star(e.x, e.y - 20, 1.2, "lightning", 1.05, "LEVEL UP!", 0.8); } break; }
      case "heroPick": fx.burst(e.x, e.y, 0.6, ["#ffd23a", "#fff"], 26, { spd: 3 }); break;
      case "item": fx.ring(e.x, e.y, 10, 100, e.color, 0.45); fx.burst(e.x, e.y, 0.6, [e.color, "#fff"], 28, { spd: 3 }); fx.flash(e.x, e.y, 0.6, e.color, 2, 0.3); break;
      case "leak": fx.flash(e.x, 712, 0.4, "#ff3a3a", 3, 0.4); fx.burst(e.x, 712, 0.3, ["#ff3a3a", "#ffd23a"], 36, { spd: 4 }); fx.screen("#ff4a4a", 0.16, 0.35); banner = { text: B.lang === "en" ? "LEAK!" : "漏怪了！", col: "#ff4a5a", life: 1.2, max: 1.2 }; break;
      case "ult": ultFx(e); break;
      case "lob": { const a = { x: e.x1, y: e.y1 }, b = { x: e.x2, y: e.y2 };
        fx.anim(e.life, (c, k) => { const [sx, sy, pp] = P(lerp(a.x, b.x, k), lerp(a.y, b.y, k), 0.7 + Math.sin(k * Math.PI) * 1.1); const r = 8 * pp * cam.tw / 60; c.fillStyle = "#ff6e8c"; c.strokeStyle = OL; c.lineWidth = 2; c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill(); c.stroke(); c.fillStyle = "#fff"; c.beginPath(); c.arc(sx - r * 0.3, sy - r * 0.3, r * 0.3, 0, TAU); c.fill(); },
          () => { fx.burst(b.x, b.y, 0.6, ["#7fe07a", "#ff6e8c"], 12, { spd: 1.8 }); if (rnd() < 0.2) word(e.x2, e.y2, "♥", "#ff6e8c", 22, 0.5); }); break; }
      case "shieldOn": fx.ring(e.x, e.y, 10, 74, "#7fe07a", 0.4, { h: 0.4 }); fx.burst(e.x, e.y, 0.5, "#f3d34a", 10, { spd: 1.5 }); break;
      case "slam": fx.star(e.x, e.y, 0.3, "rock", 0.9 * e.r / 80, "STOMP!", 0.45); fx.ring(e.x, e.y, 6, e.r * 1.3, e.color, 0.4, { w: 7 }); fx.chunks(e.x, e.y, 0.2, ["#8c7a72", "#96d886"], 18, { spd: 3 }); break;
      case "claw": { for (let i = 0; i < 3; i++) { const a = -2.4 + i * 0.25; fx.arc(e.x - 16 + i * 16, e.y, 0.55, 0.45, a, a + 1.6, e.color, 0.25, 0.1); }
        for (let i = 1; i <= 3; i++) setTimeout(() => fx.ring(e.ox, e.oy - 24, 16, 50 + i * 40, "#ffd23a", 0.35, { h: 0.6 }), i * 60);
        fx.spark(e.x, e.y, 0.5, "#ffd23a", 0.9, 0.24); word(e.ox, e.oy - 70, "ROAR!", "#ffb42e", 26, 0.5); break; }
      case "pop": { const r = e.r || 40; fx.ring(e.x, e.y, 6, r * 1.3, "#bfe6ff", 0.35); fx.drops(e.x, e.y, 0.4, 14); fx.flash(e.x, e.y, 0.4, "#e4f8ff", r / 50 + 0.5, 0.2); break; }
      case "boom": { const r = e.r; fx.star(e.x, e.y, 0.5, "fire", 1.2 * r / 90, "BOOM!", 0.6); fx.flash(e.x, e.y, 0.5, "#ffd23a", 3.5 * r / TILE, 0.3); fx.burst(e.x, e.y, 0.4, [e.color, "#ffd23a", "#ff3b14"], 46, { spd: 5 * r / TILE, size: 0.24, life: 0.8 });
        fx.flames(e.x, e.y, 0.1, 10, 0.4, { spread: r }); fx.chunks(e.x, e.y, 0.3, "#5a3a34", 16, { spd: 3.5 }); fx.ring(e.x, e.y, 8, r * 1.6, "#ffb02e", 0.45, { w: 8 }); fx.decal(e.x, e.y, r / TILE * 0.9, "#3a2a2a", 2.6); break; }
      case "impact": { const sm = e.small ? 0.6 : 1; fx.spark(e.x, e.y, 0.45, e.color, 0.55 * sm, 0.2); fx.burst(e.x, e.y, 0.45, e.color, 9 * sm, { spd: 2.4 * sm });
        if (e.kind === "fire") fx.flames(e.x, e.y, 0.2, 2, 0.24); if (e.kind === "splash") fx.drops(e.x, e.y, 0.4, 6); if (e.kind === "peach") fx.chunks(e.x, e.y, 0.4, "#ff8ac0", 6, { spd: 1.8 }); break; }
      case "bossWarn": banner = { text: B.lang === "en" ? "BOSS INCOMING!" : "首领来袭！", col: "#ff3a5a", life: 2.4, max: 2.4, big: true }; break;
      case "heroDown": fx.star(e.x, e.y, 0.6, "fire", 1.1, B.lang === "en" ? "OUCH!" : "倒下!", 0.6); fx.burst(e.x, e.y, 0.5, "#ffffff", 40, { spd: 4 }); fx.ring(e.x, e.y, 10, 130, "#ff4a5a", 0.5); break;
      case "heroUp": fx.ring(e.x, e.y, 160, 10, "#ffd23a", 0.5); fx.burst(e.x, e.y, 3, ["#fff6c0", "#ffd23a"], 30, { spd: 0.4, up: -3, grav: 4, life: 0.7 }); fx.flash(e.x, e.y, 0.6, "#fff6c0", 3, 0.4); break;
      case "slash": { const r = (e.r || 80) / TILE; fx.arc(e.x, e.y, 0.55, r * 0.62, e.ang - 1.3, e.ang + 1.3, "#5cf2ff", 0.24, 0.16); fx.arc(e.x, e.y, 0.6, r * 0.46, e.ang + 1.2, e.ang - 1.0, "#ffe24a", 0.2, 0.1); fx.spark(e.x, e.y, 0.5, "#5cf2ff", 0.9, 0.2);
        fx.burst(e.x, e.y, 0.5, ["#ffffff", "#5cf2ff"], 10, { spd: 3, chip: true }); if (rnd() < 0.3) fx.star(e.x, e.y, 0.7, "slash", 0.7, "SLASH!", 0.4); break; }
      case "cast": { const c = ELC[e.fk] || ELC.fire, a = e.ang || 0; fx.spark(e.x + Math.cos(a) * 28, e.y + Math.sin(a) * 28, 0.7, c[0], e.hero ? 0.7 : 0.45, 0.16); break; }
      case "hhit": { impactFk(e.x, e.y, e.fk, e.crit, (e.scale || 1) * (e.comp ? 0.6 : 1));
        if (e.kind === "skyRock") { fx.ring(e.x, e.y, 8, 100, "#c9925a", 0.35, { w: 7 }); fx.decal(e.x, e.y, 0.4, "#5a4234", 2); }
        if (e.kind === "cloudBolt") { fx.bolt(e.x, e.y, 2.2, e.x, e.y, 0.1, 0.22, 5); fx.flash(e.x, e.y, 0.3, "#fff454", 2.4, 0.2); }
        if (!e.comp && B.hero && rnd() < 0.16) { const w = B.hero.def.words; word(e.x, e.y - 20, w[Math.floor(rnd() * w.length)], (ELC[e.fk] || ELC.fire)[0], 26, 0.55); } break; }
      case "stomp": fx.ring(e.x, e.y, 6, 100, "#bfeaff", 0.35); fx.chunks(e.x, e.y, 0.2, ["#e4f7ff", "#9ce8ff"], 14, { spd: 2.5 }); fx.snow(e.x, e.y, 0.3, 3); break;
      case "skill": skillFx(e); break;
      case "bubbleTrap": { const q = e.e; fx.ring(q.x, q.y, 6, 66, "#bfe6ff", 0.35); fx.drops(q.x, q.y, 0.6, 10); break; }
      case "spire": { const x = e.x, y = e.y;
        const go = () => fx.anim(0.6, (c, k) => { const f = Math.min(1, k / 0.35), [sx, sy, pp] = P(x, y, (1 - f) * 5), w = cam.tw * 0.42 * pp, hh = cam.tw * 1.3 * pp * (k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1);
          chip(c, [[sx - w, sy], [sx - w * 0.3, sy - hh * 0.8], [sx, sy - hh], [sx + w * 0.35, sy - hh * 0.7], [sx + w, sy]], "#9e8874", 77, { tx: 4, ty: 3, lw: 2.2 });
          c.strokeStyle = "#6e5a4e"; c.lineWidth = 2; c.beginPath(); c.moveTo(sx - w * 0.2, sy - hh * 0.3); c.lineTo(sx + w * 0.1, sy - hh * 0.55); c.stroke();
          if (f >= 1 && !go.hit) { go.hit = 1; fx.star(x, y, 0.4, "rock", 1.05, "SMASH!", 0.5); fx.chunks(x, y, 0.3, ["#8c7464", "#a8907c"], 22, { spd: 3.5, size: 0.2 }); fx.ring(x, y, 8, 120, "#c9925a", 0.4, { w: 8 }); } });
        if (e.delay) setTimeout(go, e.delay * 1000); else go(); break; }
      case "quake": { const r = e.r; for (let i = 0; i < 3; i++) setTimeout(() => fx.ring(e.x, e.y, 16, r * (0.6 + i * 0.25), i % 2 ? "#e8d6c0" : "#c9925a", 0.45, { w: 8 }), i * 90);
        for (let i = 0; i < 22; i++) { const a = rnd() * TAU, rr = rnd() * r; fx.chunks(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr, 0.1, ["#8c7464", "#6e5a4e"], 1, { spd: 0.5, up: 5, size: 0.2 }); }
        fx.star(e.x, e.y - 20, 0.5, "rock", 1.4, "QUAKE!", 0.7); break; }
      case "holyBolt": fx.bolt(e.fx, e.fy, 1.6, e.x, e.y, 0.4, 0.22, 5, true); fx.flash(e.x, e.y, 0.4, "#fff6c0", 1.8, 0.2); fx.spark(e.x, e.y, 0.4, "#ffe944", 0.8, 0.2); fx.burst(e.x, e.y, 0.4, ["#ffe944", "#fff"], 12, { spd: 3 }); break;
      case "skyBolt": { if (e.mini) { fx.bolt(e.x, e.y, 3, e.x, e.y, 0.05, 0.15, 2.4); fx.ring(e.x, e.y, 4, 34, "#ffe944", 0.2); break; }
        fx.bolt(e.fx, e.fy, 2.3, e.x, e.y, 0.2, 0.3, 8); fx.flash(e.x, e.y, 0.3, "#fff454", 3.4, 0.28); fx.ring(e.x, e.y, 8, 130, "#ffe944", 0.4, { w: 7 });
        fx.burst(e.x, e.y, 0.3, ["#ffe944", "#ffffff", "#269ef5"], 28, { spd: 4 }); fx.star(e.x, e.y - 10, 0.5, "lightning", 1.1, "KA-BOOM!", 0.5); fx.screen("#fff6a0", 0.12, 0.18); break; }
      case "gust": { for (let i = 0; i < (R.low ? 40 : 80); i++) add({ k: "snow", x: rnd() * 540, y: 60 + rnd() * 640, h: 0.3 + rnd() * 2, vx: 360 + rnd() * 240, vy: (rnd() - 0.5) * 40, vh: 0, g: 0, s: 0.12 + rnd() * 0.16, life: 0.9, rot: rnd() * TAU, vr: 6, drag: 0.5 });
        fx.screen("#e4f7ff", 0.2, 0.6); word(270, 400, "FREEZE!", "#72d8ff", 56, 1.2); break; }
      case "icicle": { const x = e.x, y = e.y; fx.anim(0.32, (c, k) => { const [sx, sy, pp] = P(x, y, 3.2 * (1 - k) + 0.3), w = cam.tw * 0.18 * pp, hh = cam.tw * 0.7 * pp;
          chip(c, [[sx - w, sy - hh], [sx + w, sy - hh], [sx, sy]], "#bff0ff", 5, { tx: 2, ty: 2, lw: 1.8, ol: "#153d88" }); },
        () => { fx.chunks(x, y, 0.3, ["#cfefff", "#ffffff"], 12, { spd: 2.4 }); fx.snow(x, y, 0.4, 2); fx.spark(x, y, 0.3, "#bfeaff", 0.6, 0.18); }); break; }
      case "splashShot": { const a = { x: e.x1, y: e.y1 }, b = { x: e.x2, y: e.y2 };
        fx.anim(0.35, (c, k) => { const [sx, sy, pp] = P(lerp(a.x, b.x, k), lerp(a.y, b.y, k), 1.9 * (1 - k) + 0.4 + Math.sin(k * Math.PI) * 0.6), r = 9 * pp * cam.tw / 60;
          c.fillStyle = "#4ec6ff"; c.strokeStyle = "#0e437a"; c.lineWidth = 2; c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill(); c.stroke(); }, () => fx.drops(b.x, b.y, 0.3, 10)); break; }
      case "erupt": fx.star(e.x, e.y - 30, 1.6, "fire", 1.7, "ERUPTION!", 0.9); fx.flash(e.x, e.y, 2, "#ff6a2a", 7, 0.5); fx.screen("#ff8a3a", 0.18, 0.4);
        fx.burst(e.x, e.y, 1.9, ["#ff6a2a", "#ffd23a", "#ff3a1a"], 60, { spd: 4.5, up: 7, size: 0.26, life: 1.1, grav: 7 }); fx.flames(e.x, e.y, 1.6, 14, 0.5, { spread: 70, up: 3 });
        fx.chunks(e.x, e.y, 1.9, ["#5a3a34", "#3e2a26"], 34, { spd: 4, up: 8, size: 0.24, life: 1.6 }); fx.ring(e.x, e.y, 20, 270, "#ff6a2a", 0.6, { w: 9 }); fx.ring(e.x, e.y, 14, 200, "#ffd23a", 0.5); break;
      case "swordDart": { const a = { x: e.x1, y: e.y1 }, b = { x: e.x2, y: e.y2 };
        fx.anim(0.16, (c, k) => { const [x0, y0] = P(a.x, a.y, 0.9), [x1, y1, pp] = P(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(0.9, 0.45, k)); sword(c, x1, y1, cam.tw * 0.62 * pp, Math.atan2(y1 - y0, x1 - x0), "#72f5ff"); },
          () => { fx.spark(b.x, b.y, 0.45, "#5cf2ff", 0.6, 0.18); fx.burst(b.x, b.y, 0.45, "#ffffff", 6, { spd: 2 }); }); break; }
      case "crossSlash": fx.arc(e.x, e.y, 0.5, 0.95, -0.8, 0.8 + Math.PI * 0.5, "#ffe24a", 0.3, 0.16); fx.arc(e.x, e.y, 0.55, 0.95, Math.PI - 0.8, Math.PI + 1.2, "#5cf2ff", 0.3, 0.16);
        fx.star(e.x, e.y, 0.5, "slash", 1.0, "斩!", 0.45); fx.burst(e.x, e.y, 0.5, ["#5cf2ff", "#ffffff"], 20, { spd: 4, chip: true }); break;
    }
  }
  B.ev.length = 0;
}
function ultFx(e) {
  const col = e.color; fx.burst(e.x, e.y, 0.2, [col, "#ffffff"], 60, { spd: 0.6, up: 7, grav: 3, life: 0.9 }); fx.flash(e.x, e.y, 1.5, col, 6, 0.5); fx.screen(col, 0.16, 0.5);
  for (let i = 0; i < 4; i++) setTimeout(() => fx.ring(270, 400, 40, 480 + i * 80, i % 2 ? "#ffffff" : col, 0.7, { w: 9 }), i * 110);
  for (const en of B.enemies) { if (e.typ === "freeze") { fx.chunks(en.x, en.y, 0.6, ["#cfefff", "#ffffff"], 10, { spd: 2.5 }); fx.snow(en.x, en.y, 0.5, 2); }
    else if (e.typ === "blast") fx.star(en.x, en.y, 0.5, "fire", 0.8, "", 0.4);
    else fx.bolt(270, 400, 2.5, en.x, en.y, 0.4, 0.35, 5); }
  if (e.typ === "heal") for (const t of B.towers) fx.burst(t.x, t.y, 0.2, ["#7fe07a", "#ffffff"], 14, { spd: 0.4, up: 3, grav: 1, life: 1 });
  if (e.typ === "shield") for (const t of B.towers) fx.ring(t.x, t.y, 10, 76, "#7fe07a", 0.6, { h: 0.4 });
  fx.star(270, 360, 1, e.typ === "freeze" ? "frost" : e.typ === "blast" ? "fire" : "lightning", 1.8, B.lang === "en" ? "ULTIMATE!" : "大招！", 1.1);
}
function skillFx(e) {
  const c = (ELC[e.fk] || ELC.fire)[0];
  fx.star(e.x, e.y - 30, 1, e.fk, 1.35, e.ico + " " + e.name, 0.95); fx.flash(e.x, e.y, 0.8, c, 3.4, 0.35);
  fx.ring(e.x, e.y, 16, 180, c, 0.45, { w: 8 }); fx.ring(e.x, e.y, 8, 115, "#ffffff", 0.35, { h: 0.3 });
  fx.burst(e.x, e.y, 0.4, [c, "#ffffff"], 32, { spd: 5, up: 1.2 });
  if (e.fk === "fire") fx.flames(e.x, e.y, 0.2, 10, 0.45, { spread: 90 }); else if (e.fk === "frost") fx.snow(e.x, e.y, 0.6, 10, 0.3); else if (e.fk === "water") fx.drops(e.x, e.y, 0.5, 26);
  else if (e.fk === "rock") fx.chunks(e.x, e.y, 0.3, ["#8c7464", "#a8907c"], 20); else if (e.fk === "slash") for (let i = 0; i < 3; i++) fx.arc(e.x, e.y, 0.6, 0.9 + i * 0.2, i * 2, i * 2 + 2.2, "#5cf2ff", 0.3, 0.12);
  if (e.id === "blue_blizz") fx.screen("#e4f7ff", 0.22, 0.6);
  if (e.id === "lemon_storm") { fx.screen("#2a2a5a", 0.2, 0.4); for (let i = 0; i < 8; i++) setTimeout(() => { const x = 40 + rnd() * 460, y = 140 + rnd() * 480; fx.bolt(x, y, 3.4, x + (rnd() - 0.5) * 40, y, 0, 0.2, 5); }, i * 70); }
}

/* ---------- scene: ground layer -> depth-sorted standees / zones / shots -> air FX ---------- */
const face = new WeakMap();
function facingOf(o, tx) { let f = face.get(o) || 1; if (tx != null) { if (tx < o.x - 10) f = -1; else if (tx > o.x + 10) f = 1; } face.set(o, f); return f; }
const unit = (pp) => cam.tw * pp;   // 1 tile on screen
function drawPet(c, t) {
  const fly = t.flyT > 0 ? 0.65 + Math.sin(R.time * 3 + t.ph) * 0.08 : 0, b = t.bounce || 0, pop = t.pop || 0;
  const hop = fly + Math.max(0, Math.sin(b * Math.PI)) * (PET[t.id].typ === "slam" ? 0.35 : 0.12);
  const [gx, gy, gp] = P(t.x, t.y, 0), [sx, sy, pp] = P(t.x, t.y, hop), hPx = unit(pp) * 1.02 * (1 + (t.tier - 1) * 0.05) * (1 + pop * 0.3);
  baseShadow(c, gx, gy, unit(gp) * 0.8, hop, t.slot || 1, !fly, null);
  if (t.fireT > 0) flame(c, sx - hPx * 0.3, sy - hPx * 0.1, hPx * 0.28, t.ph * 9);
  if (fly) { c.save(); c.fillStyle = "#ffffff"; c.strokeStyle = OL; c.lineWidth = 2; const fl = Math.sin(R.time * 18) * 0.35;
    for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sx + sd * hPx * 0.36, sy - hPx * 0.5, hPx * 0.22, hPx * 0.1 * (1 + fl), sd * -0.5, 0, TAU); c.fill(); c.stroke(); } c.restore(); }
  const idle = Math.sin(R.time * 3 + t.ph) * 0.04;
  c.save(); if (t.fainted) c.filter = "grayscale(0.85) brightness(0.9)";
  standee(c, t.id, sx, sy, hPx, facingOf(t, t.aimX), b * 0.4 + idle, t.hurtT > 0 ? 0.7 : t.jamT > 0 ? 0.35 : 0, t.fainted ? 1.25 : 0, t.hurtT > 0 ? "#ff5a4a" : "#9cff7a");
  c.restore();
  if (t.shield > 0 && !t.fainted) { c.save(); c.globalAlpha = 0.28 + 0.1 * Math.sin(R.time * 6); c.fillStyle = "#bff5a8"; c.strokeStyle = "#3a9a3a"; c.lineWidth = 2.4; c.beginPath(); c.ellipse(sx, sy - hPx * 0.45, hPx * 0.55, hPx * 0.58, 0, 0, TAU); c.fill(); c.globalAlpha = 0.8; c.stroke(); c.restore(); }
  if (t.swapT > 0 && rnd() < 0.2) fx.burst(t.x, t.y, 0.6, D.ELEM_COL ? D.ELEM_COL[t.swapEl] || "#c89aff" : "#c89aff", 1, { spd: 0.5, up: 1 });
  if (t.berryT > 0) { t.berryT -= 1 / 60; }
}
function drawEnemy(c, e) {
  const def = ENEMY[e.typ], moving = !e.biting && !(e.frozenT > 0) && !(e.stunT > 0) && !e.petrified && !(e.bubbleT > 0);
  const hop = moving ? Math.abs(Math.sin(R.time * (def.boss ? 4 : 7) + e.ph)) : 0, fly = def.fly ? 0.75 + Math.sin(R.time * 2 + e.ph) * 0.1 : 0;
  const bite = e.biting ? Math.max(0, Math.sin(R.time * 6.3 + e.ph)) : 0, hz = fly + hop * 0.14 + (e.bubbleT > 0 ? 0.5 + Math.sin(R.time * 4) * 0.08 : 0);
  const [gx, gy, gp] = P(e.x, e.y, 0), [sx, sy0, pp] = P(e.x, e.y + bite * 14, hz), sy = sy0;
  const hPx = unit(pp) * def.size / 80 * 0.98 * (e.elite ? 1.12 : 1);
  baseShadow(c, gx, gy, hPx * 0.86 * gp / pp, hz, 7, false, e.elite ? "#ffd23a" : def.boss ? "#ff3a6a" : null);
  if (e.typ === "zap") { c.save(); c.fillStyle = "#4a6298"; c.beginPath(); c.ellipse(sx, sy + 3, hPx * 0.36, hPx * 0.13, 0, 0, TAU); c.fill(); c.restore(); if (Math.floor(R.time * 12) % 2 === 0) bolt(c, sx - 8 * pp, sy - 3, sx + 7 * pp, sy + 5, 2.2, e.ph * 9 + Math.floor(R.time * 12)); }
  else if (e.typ === "ember" || e.typ === "boss3") { if (Math.floor(R.time * 10 + e.ph) % 2 === 0) flame(c, sx - hPx * 0.25, sy - 2, hPx * 0.22, e.ph * 7); }
  const sq = (e.squash || 0) + (moving ? (hop > 0.6 ? -0.1 : 0.08) : 0) + bite * 0.12, tilt = Math.sin(R.time * 3.5 + e.ph) * 0.05;
  c.save();
  if (e.petrified) c.filter = "grayscale(0.92) contrast(1.12) brightness(0.9)";
  else if (e.frozenT > 0) c.filter = "saturate(0.35) hue-rotate(155deg) brightness(1.22)";
  else if (e.soakedT > 0) c.filter = "sepia(0.35) hue-rotate(172deg) saturate(2.2) brightness(0.95)";
  else if (e.burnT > 0 || e.hburnT > 0) c.filter = "sepia(0.45) hue-rotate(-22deg) saturate(2.4) brightness(1.06)";
  const flash = e.hitT > 0 ? Math.min(1, e.hitT / 0.12) : (e.enraged ? 0.25 + 0.2 * Math.sin(R.time * 10) : 0);
  if (!standee(c, "e:" + e.typ, sx, sy, hPx, 1, sq, flash, tilt, e.enraged && !(e.hitT > 0) ? "#ff3a3a" : "#ffffff")) { c.fillStyle = def.col; c.beginPath(); c.ellipse(sx, sy - hPx * 0.35, hPx * 0.4, hPx * 0.35, 0, 0, TAU); c.fill(); }
  c.restore();
  if (e.soakedT > 0) { c.fillStyle = "#4ec6ff"; for (const dr of [-1, 1]) { const dy = ((R.time * 36 + dr * 9) % 16) * pp; c.beginPath(); c.arc(sx + dr * hPx * 0.22, sy - hPx * 0.35 + dy, 3 * pp, 0, TAU); c.fill(); } }
  if (e.burnT > 0 || e.hburnT > 0) flame(c, sx + hPx * 0.26, sy - hPx * 0.2, hPx * 0.32, e.ph * 5);
  if (e.frozenT > 0) { const iw = hPx * 0.46, ih = hPx * 0.98; c.save(); c.globalAlpha = 0.6; chip(c, [[sx - iw, sy + 2], [sx - iw * 0.9, sy - ih * 0.65], [sx, sy - ih * 1.05], [sx + iw * 0.9, sy - ih * 0.62], [sx + iw, sy + 2]], "#9ce8ff", 3, { tx: 3, ty: 2, lw: 2 }); c.restore(); }
  if (e.rockShell >= 1 && !e.petrified) { const rt = sy - hPx * 0.88; chip(c, [[sx - hPx * 0.24, rt + 10 * pp], [sx - hPx * 0.14, rt - 8 * pp], [sx + hPx * 0.16, rt - 5 * pp], [sx + hPx * 0.25, rt + 10 * pp]], "#8f8274", 4, { tx: 3, ty: 2, lw: 1.8 }); }
  if (e.rockShell >= 2 && !e.petrified) { chip(c, [[sx - hPx * 0.36, sy - hPx * 0.18], [sx - hPx * 0.32, sy - hPx * 0.56], [sx - hPx * 0.08, sy - hPx * 0.45], [sx - hPx * 0.12, sy - hPx * 0.12]], "#7e7266", 5, { tx: 3, ty: 2, lw: 1.8 }); }
  if (e.paralyzeT > 0) bolt(c, sx - hPx * 0.24, sy - hPx * 0.65, sx + hPx * 0.22, sy - hPx * 0.25, 2.2, Math.floor(R.time * 20));
  if (e.bubbleT > 0) { const br = hPx * 0.58; c.save(); c.fillStyle = "rgba(104,206,255,0.36)"; c.strokeStyle = "#2676c8"; c.lineWidth = 2.6; c.beginPath(); c.ellipse(sx, sy - hPx * 0.42, br, br * 0.92, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = "rgba(255,255,255,0.8)"; c.beginPath(); c.ellipse(sx - br * 0.4, sy - hPx * 0.42 - br * 0.45, br * 0.16, br * 0.1, -0.6, 0, TAU); c.fill(); c.restore(); }
  if (def.boss) { const cy = sy - hPx - 6 * pp, cw = hPx * 0.2; chip(c, [[sx - cw, cy], [sx - cw * 1.05, cy - cw * 0.85], [sx - cw * 0.4, cy - cw * 0.35], [sx, cy - cw * 1.1], [sx + cw * 0.4, cy - cw * 0.35], [sx + cw * 1.05, cy - cw * 0.85], [sx + cw, cy]], "#ffe047", 605, { tx: 3, ty: 2, lw: 2 }); }
}
function drawHero(c, h) {
  if (h.deadT > 0) return;
  const moving = Math.hypot(h.vx || 0, h.vy || 0) > 5, ride = h.ridingSwordT > 0;
  const hz = (moving ? Math.abs(Math.sin(h.walk * 0.9)) * 0.14 : 0) + (ride ? 0.55 + Math.sin(R.time * 4) * 0.06 : 0) + (h.lungeZ || 0) * 1.4;
  const [gx, gy, gp] = P(h.x, h.y, 0), [sx, sy, pp] = P(h.x, h.y, hz), hPx = unit(pp) * 1.3, f = Math.cos(h.facing) < -0.15 ? -1 : Math.cos(h.facing) > 0.15 ? 1 : (face.get(h) || 1); face.set(h, f);
  baseShadow(c, gx, gy, unit(gp) * 1.05, hz, 735, !ride && hz < 0.2, h.def.burstCol);
  if (ride) sword(c, sx - f * hPx * 0.1, sy + 6 * pp, hPx * 1.0, f > 0 ? 0.08 : Math.PI - 0.08, "#ffe866");
  if (h.dash || ride || moving) { c.save(); c.globalAlpha = 0.25; standee(c, h.key, sx - Math.cos(h.facing) * 16 * pp, sy - Math.sin(h.facing) * 10 * pp, hPx, f, 0, 0.6, 0, "#7cf4ff"); c.restore(); }
  if (h.invulnT > 0.36 && Math.sin(R.time * 40) > 0) return;
  const sq = (h.recoil || 0) * 0.4 + (moving ? 0 : Math.sin(R.time * 5) * 0.04), waddle = moving ? Math.sin(h.walk * 0.9) * 0.08 : 0;
  standee(c, h.key, sx, sy, hPx, f, sq, h.hurtT > 0 ? 0.7 : (h.recoil || 0) * 0.14, waddle, h.hurtT > 0 ? "#ff5a4a" : "#ffffff");
  if (h.key === "chestnut") sword(c, sx + f * hPx * 0.36, sy - hPx * 0.38, hPx * 0.56, h.dash ? -0.95 * f : (f > 0 ? -0.45 : Math.PI + 0.45), "#72f5ff");
}
function drawComp(c, o) {
  const mam = o.key === "mammoth", hz = Math.abs(Math.sin((o.walk || 0) * 0.9)) * 0.12;
  const [gx, gy, gp] = P(o.x, o.y, 0), [sx, sy, pp] = P(o.x, o.y, hz), hPx = unit(pp) * (mam ? 1.35 : 0.82);
  if (o.temp && o.ttl < 2 && Math.sin(R.time * 30) < -0.3) return;
  baseShadow(c, gx, gy, unit(gp) * (mam ? 1.1 : 0.7), hz, 9, !mam, null);
  standee(c, mam ? "mammoth" : o.key, sx, sy, hPx, Math.cos(o.facing || 0) < 0 ? -1 : 1, 0, 0, 0);
}
function drawShot(c, s) {
  const k = s.kind; let h = 0.45;
  if (k === "meteor") { const L = Math.hypot(s.tx - s.sx, s.ty - s.sy) || 1, p = 1 - Math.hypot(s.tx - s.x, s.ty - s.y) / L; h = 3.2 * (1 - p) + 0.2; }
  else if (k === "peach" || k === "bubble") { const L = Math.hypot(s.tx - (s.sx ?? s.x), s.ty - (s.sy ?? s.y)) || 1, p = clamp(1 - Math.hypot(s.tx - s.x, s.ty - s.y) / L, 0, 1); h = 0.45 + Math.sin(p * Math.PI) * (k === "peach" ? 1.1 : 0.4); }
  else if (k === "roll") h = 0.18;
  const [sx, sy, pp] = P(s.x, s.y, h), u = unit(pp);
  const [gx, gy] = P(s.x, s.y, 0); c.fillStyle = "rgba(34,40,16,0.22)"; c.beginPath(); c.ellipse(gx, gy, u * 0.12, u * 0.05, 0, 0, TAU); c.fill();
  c.save(); c.strokeStyle = OL; c.lineWidth = 1.8;
  if (k === "seed") { flame(c, sx, sy + u * 0.08, u * 0.26, s.id * 99, "#ff6a2e", "#ffe24a"); if (rnd() < 0.5) fx.burst(s.x, s.y, h, ["#ff6a2e", "#ffd23a"], 1, { spd: 0.3, up: 0.6, life: 0.3 }); }
  else if (k === "roll") { const r = u * (s.big ? 0.3 : 0.22); c.translate(sx, sy - r); c.rotate(R.time * 12); c.fillStyle = "#a88a74"; tracePoly(c, makeEllipsePts(0, 0, r, r, 9, 3, 0.12)); c.fill(); c.stroke(); c.strokeStyle = "#6e5a4e"; c.beginPath(); c.moveTo(-r * 0.4, 0); c.lineTo(r * 0.4, -r * 0.2); c.stroke(); if (rnd() < 0.4) fx.chunks(s.x, s.y, 0.05, "#c8b29c", 1, { spd: 0.6, up: 1 }); }
  else if (k === "bubble") { const r = u * 0.2; c.fillStyle = "rgba(160,220,255,0.55)"; c.strokeStyle = "#2676c8"; c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill(); c.stroke(); c.fillStyle = "#fff"; c.beginPath(); c.arc(sx - r * 0.35, sy - r * 0.35, r * 0.22, 0, TAU); c.fill(); }
  else if (k === "drop") { const r = u * 0.12; c.fillStyle = "#4ec6ff"; c.beginPath(); c.moveTo(sx, sy - r * 1.8); c.quadraticCurveTo(sx + r * 1.2, sy, sx, sy + r); c.quadraticCurveTo(sx - r * 1.2, sy, sx, sy - r * 1.8); c.fill(); c.stroke(); }
  else if (k === "peach") { const r = u * 0.2; c.translate(sx, sy); c.rotate(R.time * 6); c.fillStyle = "#ffb08a"; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.stroke(); c.fillStyle = "#ff7aa0"; c.beginPath(); c.arc(r * 0.3, -r * 0.1, r * 0.5, 0, TAU); c.fill(); c.fillStyle = "#5cc644"; c.beginPath(); c.ellipse(-r * 0.2, -r, r * 0.4, r * 0.2, -0.5, 0, TAU); c.fill(); c.stroke(); }
  else if (k === "feather") { const a = Math.atan2(s.vy || 1, s.vx || 0), r = u * 0.28; c.translate(sx, sy); c.rotate(a); c.fillStyle = "#9a8aff"; c.beginPath(); c.ellipse(0, 0, r, r * 0.32, 0, 0, TAU); c.fill(); c.stroke(); c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-r, 0); c.lineTo(r * 0.9, 0); c.stroke(); }
  else if (k === "meteor") { const r = u * 0.4; flame(c, sx, sy - r * 0.2, r * 1.7, 31, "#ff4f9a", "#ffd23a"); c.fillStyle = "#5a3a34"; tracePoly(c, makeEllipsePts(sx, sy, r * 0.62, r * 0.55, 9, 5, 0.15)); c.fill(); c.stroke(); fx.flames(s.x, s.y, h, 1, 0.3, { up: 0.5, col: "#ff4f9a" }); }
  else { const r = u * 0.11; c.fillStyle = "#7fe07a"; c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill(); c.stroke(); }
  c.restore();
}
function drawHShot(c, s) {
  const k = s.kind, p = s.p || 0, big = (s.big || 1) * (s.comp ? 0.7 : 1);
  if (k === "cloudBolt") { const [cx, cy, pp] = P(s.tx ?? s.x, s.ty ?? s.y, 2.2), w = unit(pp) * 0.5 * big; const ch = s.t < (s.charge || 0);
    cloud(c, cx, cy, w, w * 0.5, ch ? "#5a6a98" : "#fff6a8", 7); if (ch) { const [hx, hy] = P(s.sx, s.sy, 1.2); bolt(c, hx, hy, cx, cy, 2.2, Math.floor(R.time * 30)); } return; }
  let h = 0.5; if (k === "skyRock") h = 4.2 * (1 - p) + 0.2; else if (k === "fireTornado" || k === "whirlWave") h = 0.05;
  const [sx, sy, pp] = P(s.x, s.y, h), u = unit(pp) * big;
  if (k === "fireTornado") { const sc = 0.9 + Math.min(1, s.t * 3) * 0.5, hh = u * 0.8 * sc, w = u * 0.36 * sc;
    for (let r = 0; r < 4; r++) { const f = r / 3; c.strokeStyle = r % 2 ? "#ff4e1c" : "#80180a"; c.lineWidth = Math.max(2.2, 3.6 * sc * pp); c.beginPath(); c.ellipse(sx, sy - f * hh, w * (0.45 + f * 0.65), w * (0.45 + f * 0.65) * 0.38, R.time * 14 + r, 0, Math.PI * 1.55); c.stroke(); }
    flame(c, sx, sy - hh * 0.3, w * 0.6, s.id * 50, "#ff8828", "#ffffff"); if (rnd() < 0.5) fx.flames(s.x, s.y, 0.2, 1, 0.22, { spread: 16 }); }
  else if (k === "snowflake") { snowflake(c, sx, sy, u * 0.34, R.time * 9 + s.id * 9); if (rnd() < 0.4) fx.snow(s.x, s.y, h, 1, 0.12, { spd: 0.3 }); }
  else if (k === "mini") snowflake(c, sx, sy, u * 0.18, R.time * 9);
  else if (k === "whirlWave") { const rr = u * 0.5; for (let r = 0; r < 3; r++) { c.strokeStyle = r % 2 ? "#e6f9ff" : "#125096"; c.lineWidth = 3.2; c.beginPath(); c.ellipse(sx, sy - r * 9 * pp, rr * (1 - r * 0.2), rr * 0.42 * (1 - r * 0.2), R.time * 10 + r, 0, Math.PI * 1.45); c.stroke(); }
    chip(c, sampleSmoothLoop([[sx - rr * 0.8, sy], [sx - rr * 0.3, sy - rr * 1.1], [sx + rr * 0.6, sy - rr * 0.8], [sx + rr * 0.3, sy - rr * 0.3], [sx + rr * 0.8, sy]], 3), "#2ea2ff", 4, { tx: 3, ty: 2, lw: 2 }); if (rnd() < 0.5) fx.drops(s.x, s.y, 0.3, 1); }
  else if (k === "skyRock") { const br = u * 0.4; c.save(); c.translate(sx, sy); c.rotate(R.time * 5); chip(c, [[-br, br * 0.2], [-br * 0.6, -br * 0.8], [br * 0.4, -br * 0.9], [br, -br * 0.1], [br * 0.6, br * 0.5]], "#8c7464", 6, { tx: 4, ty: 3, lw: 2 }); c.restore();
    const [gx, gy] = P(s.tx ?? s.x, s.ty ?? s.y, 0); c.save(); c.strokeStyle = "rgba(255,76,48,0.7)"; c.setLineDash([5, 4]); c.lineWidth = 2.4; c.beginPath(); c.ellipse(gx, gy, u * 0.45, u * 0.45 * cam.th / cam.tw, 0, 0, TAU); c.stroke(); c.restore(); }
  else if (k === "sword") { const [ax, ay] = P(s.sx, s.sy, 0.5), [bx, by] = P(s.tx ?? s.x, s.ty ?? s.y, 0.5); sword(c, sx, sy, u * 0.6, Math.atan2(by - ay, bx - ax), "#72f5ff"); }
  else { c.fillStyle = (ELC[s.fk] || ELC.fire)[0]; c.strokeStyle = OL; c.lineWidth = 1.6; c.beginPath(); c.arc(sx, sy, u * 0.1, 0, TAU); c.fill(); c.stroke(); }
}

/* hero skill zones: ground part (sectors, walls, whirlpools) + standing part (depth sorted) */
function sector(c, x, y, r, a, half, col, alpha) {
  const pts = [P(x, y, 0.02)]; for (let i = 0; i <= 12; i++) { const aa = a - half + (i / 12) * half * 2; pts.push(P(x + Math.cos(aa) * r, y + Math.sin(aa) * r, 0.02)); }
  c.save(); c.globalAlpha = alpha; tracePoly(c, pts); c.fillStyle = col; c.fill(); c.globalAlpha = Math.min(1, alpha * 2); c.strokeStyle = OL; c.lineWidth = 2.2; c.setLineDash([8, 6]); c.stroke(); c.restore();
}
function zoneGround(c, z) {
  const k = z.kind, h = B.hero;
  if (k === "fireFan") { const r = z.r * (0.4 + Math.min(1, z.t * 5) * 0.6); sector(c, z.x, z.y, r, z.dir, 0.75, z.t / z.dur > 0.6 ? "#ffd06a" : "#ff5a28", 0.34);
    if (rnd() < 0.9) { const a = z.dir + (rnd() - 0.5) * 1.4, rr = rnd() * r; fx.flames(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr, 0.05, 1, 0.36 + z.lv * 0.03, { spread: 10 }); } }
  else if (k === "frostBreath") { sector(c, z.x, z.y, z.r * (0.5 + Math.min(1, z.t * 5) * 0.5), z.ang, 0.8, "#84e0ff", 0.36);
    if (rnd() < 0.9) { const a = z.ang + (rnd() - 0.5) * 1.5, rr = rnd() * z.r; fx.snow(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr, 0.4, 1, 0.24, { spd: 0.4 }); } }
  else if (k === "fireWall") { const L = z.len * Math.min(1, z.t * 4), ux = Math.cos(z.ang), uy = Math.sin(z.ang), nx = -uy * 0.8 * TILE, ny = ux * 0.8 * TILE;
    c.save(); c.globalAlpha = 0.42; tracePoly(c, [P(z.x + nx, z.y + ny, 0.02), P(z.x + ux * L + nx, z.y + uy * L + ny, 0.02), P(z.x + ux * L - nx, z.y + uy * L - ny, 0.02), P(z.x - nx, z.y - ny, 0.02)]); c.fillStyle = "#ff3a1a"; c.fill(); c.restore(); }
  else if (k === "miniWake") { const [sx, sy, pp] = P(z.x, z.y, 0.02), rr = z.r * kpx(pp) * (0.6 + Math.sin(R.time * 10) * 0.08); c.save(); c.globalAlpha = 0.6 * (1 - z.t / z.dur); c.strokeStyle = (ELC[z.fk] || ELC.fire)[0]; c.lineWidth = 4;
    c.beginPath(); c.ellipse(sx, sy, rr, rr * cam.th / cam.tw, R.time * 4, 0, Math.PI * 1.5); c.stroke(); c.restore(); }
  else if (k === "tsunami" && z.t >= z.charge + z.waveDur) { const [sx, sy, pp] = P(270, 380, 0.02), R0 = 2.4 * TILE * kpx(pp);
    c.save(); for (let r = 0; r < 4; r++) { c.strokeStyle = r % 2 ? "#e6f9ff" : "#1876d2"; c.lineWidth = 5 - r; c.globalAlpha = 0.85; c.beginPath(); c.ellipse(sx, sy, R0 * (1 - r * 0.22), R0 * (1 - r * 0.22) * cam.th / cam.tw, R.time * (3 + r), 0, Math.PI * 1.6); c.stroke(); }
    c.globalAlpha = 0.3; c.fillStyle = "#2d9cff"; c.beginPath(); c.ellipse(sx, sy, R0, R0 * cam.th / cam.tw, 0, 0, TAU); c.fill(); c.restore(); }
  else if (k === "volcano") { const [sx, sy, pp] = P(z.x, z.y, 0.02), rr = 2.6 * TILE * kpx(pp) * Math.min(1, z.t / z.erupt);
    if (!z.erupted) { c.save(); c.strokeStyle = "#ff4a24"; c.lineWidth = 3; c.setLineDash([7, 5]); c.beginPath(); c.ellipse(sx, sy, rr, rr * cam.th / cam.tw, 0, 0, TAU); c.stroke(); c.restore(); } }
  else if (k === "swordOrbit" && z.formation && h) { const [sx, sy, pp] = P(h.x, h.y, 0.02), rr = 1.8 * TILE * kpx(pp); c.save(); c.globalAlpha = 0.5; c.strokeStyle = "#ffe866"; c.lineWidth = 3; c.setLineDash([10, 6]); c.beginPath(); c.ellipse(sx, sy, rr, rr * 0.7 * cam.th / cam.tw, R.time, 0, TAU); c.stroke(); c.restore(); }
}
function zoneStand(c, z) {
  const k = z.kind, h = B.hero;
  if (k === "fireWall") { const L = z.len * Math.min(1, z.t * 4), n = 8;
    for (let i = 0; i < n; i++) { const f = (i + 0.5) / n, [fx0, fy0, fp] = P(z.x + Math.cos(z.ang) * L * f, z.y + Math.sin(z.ang) * L * f, 0.02); flame(c, fx0, fy0, unit(fp) * (0.5 + z.lv * 0.06) * (0.85 + Math.sin(R.time * 9 + i) * 0.15), i * 7 + 1, z.t / z.dur > 0.6 ? "#ff9432" : "#ff441c", z.t / z.dur > 0.6 ? "#ffffff" : "#ffe658"); } }
  else if (k === "fireDragon") { const tr = z._tr || (z._tr = []); tr.unshift([z.x, z.y]); if (tr.length > 40) tr.length = 40;
    for (let i = Math.min(tr.length - 1, 32); i >= 0; i -= 4) { const [x, y] = tr[i], [sx, sy, pp] = P(x, y, 0.9 + Math.sin(R.time * 6 - i * 0.2) * 0.12), r = unit(pp) * (0.3 - i * 0.006);
      if (i === 0) { flame(c, sx, sy + r, r * 2.6, z.seed, "#ff3b14", "#fff499"); c.fillStyle = "#fff"; c.strokeStyle = OL; c.lineWidth = 2; for (const sd of [-1, 1]) { c.beginPath(); c.arc(sx + sd * r * 0.35, sy - r * 0.5, r * 0.18, 0, TAU); c.fill(); c.stroke(); } }
      else { c.fillStyle = i % 8 ? "#ff6d28" : "#ffe24a"; c.strokeStyle = OL; c.lineWidth = 2; c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill(); c.stroke(); } } }
  else if (k === "zeus") { const [sx, sy, pp] = P(z.x, z.y, 1.4 + Math.sin(R.time * 3) * 0.1), u = unit(pp);
    cloud(c, sx, sy + u * 0.1, u * 0.62, u * 0.3, "#ffffff", z.seed, "rgba(43,27,34,0.6)");
    c.save(); c.globalAlpha = 0.92; standee(c, "lemon", sx, sy, u * 1.15, 1, 0, 0.35, Math.sin(R.time * 2) * 0.1, "#fff8d0"); c.restore();
    c.fillStyle = "#ffd23a"; c.strokeStyle = OL; c.lineWidth = 2; c.beginPath(); c.moveTo(sx - u * 0.22, sy - u * 0.95); c.lineTo(sx, sy - u * 1.22); c.lineTo(sx + u * 0.22, sy - u * 0.95); c.closePath(); c.fill(); c.stroke();
    bolt(c, sx - u * 0.36, sy - u * 0.8, sx - u * 0.5, sy - u * 0.45, 2.2, z.seed + Math.floor(R.time * 12), true); bolt(c, sx + u * 0.36, sy - u * 0.8, sx + u * 0.5, sy - u * 0.45, 2.2, z.seed + 2 + Math.floor(R.time * 12), true); }
  else if (k === "angryCloud") { const [cx0, cy0, pp] = P(z.x, z.y, 2.4), u = unit(pp) * (z.lv >= 5 ? 1.3 : 1.1), cw = u * 1.0, ch = u * 0.5;
    cloud(c, cx0, cy0, cw, ch, "#323c58", z.lv || 1); c.fillStyle = "#ffe64a"; c.strokeStyle = OL; c.lineWidth = 2 * pp;
    for (const sd of [-1, 1]) { c.beginPath(); c.arc(cx0 + sd * cw * 0.22, cy0 - ch * 0.05, ch * 0.16, 0, TAU); c.fill(); c.stroke(); }
    c.lineWidth = 3.6 * pp; c.lineCap = "round"; c.beginPath(); c.moveTo(cx0 - cw * 0.36, cy0 - ch * 0.4); c.lineTo(cx0 - cw * 0.1, cy0 - ch * 0.2); c.moveTo(cx0 + cw * 0.36, cy0 - ch * 0.4); c.lineTo(cx0 + cw * 0.1, cy0 - ch * 0.2);
    c.moveTo(cx0 - cw * 0.22, cy0 + ch * 0.36); c.lineTo(cx0 - cw * 0.08, cy0 + ch * 0.26); c.lineTo(cx0 + cw * 0.08, cy0 + ch * 0.4); c.lineTo(cx0 + cw * 0.22, cy0 + ch * 0.26); c.stroke();
    if (Math.floor(R.time * 8) % 3 === 0) { const [gx, gy] = P(z.x + (rnd() - 0.5) * 40, z.y, 0); bolt(c, cx0, cy0 + ch * 0.4, gx, gy, 2.6, Math.floor(R.time * 30)); } }
  else if (k === "slidingIce") { const [sx, sy, pp] = P(z.x, z.y, 0.02), ir = z.r * kpx(pp) * 0.95;
    chip(c, [[sx - ir, sy], [sx - ir * 0.7, sy - ir * 1.2], [sx + ir * 0.7, sy - ir * 1.2], [sx + ir, sy]], "#9ce8ff", 8, { tx: 4, ty: 3, lw: 2.2, ol: "#153d88" });
    c.strokeStyle = "#ffffff"; c.lineWidth = 3; c.beginPath(); c.moveTo(sx - ir * 0.5, sy - ir * 0.9); c.lineTo(sx - ir * 0.1, sy - ir * 0.3); c.stroke(); if (rnd() < 0.6) fx.snow(z.x, z.y, 0.3, 1, 0.16, { spd: 0.4 }); }
  else if (k === "blizzard") { const [sx, sy, pp] = P(z.x, z.y, 2.6 + Math.sin(R.time * 2) * 0.2), u = unit(pp);
    c.save(); c.globalAlpha = 0.95; standee(c, "blueberry", sx, sy, u * 1.9, Math.sin(R.time) > 0 ? 1 : -1, 0, 0.3, 0, "#dff6ff"); c.restore(); }
  else if (k === "waterTornado") { const [sx, sy, pp] = P(z.x, z.y, 0.02), rr = unit(pp) * 0.7;
    for (let r = 0; r < 5; r++) { c.strokeStyle = r % 2 ? "#e6f9ff" : "#2490f0"; c.lineWidth = 3.4; c.beginPath(); c.ellipse(sx, sy - r * rr * 0.32, rr * (0.4 + r * 0.17), rr * 0.2 * (1 + r * 0.2), z.t * 9 + r, 0, Math.PI * 1.5); c.stroke(); }
    if (z.dragon) { for (let i = 7; i >= 0; i--) { const a = R.time * 4 - i * 0.45, [dx, dy, dp] = P(z.x + Math.cos(a) * 1.1 * TILE, z.y + Math.sin(a) * 0.8 * TILE, 1.1 + Math.sin(a * 2) * 0.2), r = unit(dp) * (0.2 - i * 0.015);
      c.fillStyle = i ? "#52c8ff" : "#2ea2ff"; c.strokeStyle = "#0e437a"; c.lineWidth = 2; c.beginPath(); c.arc(dx, dy, r, 0, TAU); c.fill(); c.stroke(); if (!i) { c.fillStyle = "#fff"; c.beginPath(); c.arc(dx + r * 0.3, dy - r * 0.3, r * 0.25, 0, TAU); c.fill(); } } }
    if (rnd() < 0.6) fx.drops(z.x, z.y, rnd() * 1.6, 1); }
  else if (k === "tsunami") { const ch = z.t < z.charge, wv = !ch && z.t < z.charge + z.waveDur;
    if (ch && h) { const [cx0, cy0, pp] = P(h.x, h.y, 1.9), s = 0.4 + z.t / z.charge * 0.8, u = unit(pp) * s;
      for (let r = 0; r < 3; r++) { c.strokeStyle = r % 2 ? "#e6f9ff" : "#1876d2"; c.lineWidth = 4; c.beginPath(); c.ellipse(cx0, cy0, u * (0.9 - r * 0.22), u * 0.36 * (1 - r * 0.2), z.t * 8 + r, 0, Math.PI * 1.6); c.stroke(); }
      if (rnd() < 0.5) fx.drops(h.x + (rnd() - 0.5) * 40, h.y, 1.9, 1); }
    else if (wv && z.waveY != null) { const y = z.waveY, segs = 12, pts = [];
      for (let i = 0; i <= segs; i++) { const x = -20 + i * 580 / segs; pts.push(P(x, y, 0)); }
      for (let i = segs; i >= 0; i--) { const x = -20 + i * 580 / segs; pts.push(P(x - 20, y + 10, 1.9 + Math.sin(i * 1.3 + R.time * 8) * 0.25)); }
      c.save(); tracePoly(c, pts); c.fillStyle = "#2ea2ff"; c.fill(); c.strokeStyle = "#0e437a"; c.lineWidth = 3; c.stroke();
      c.strokeStyle = "#ffffff"; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); for (let i = 0; i <= segs; i++) { const q = P(-40 + i * 580 / segs, y + 10, 1.95 + Math.sin(i * 1.3 + R.time * 8) * 0.25); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } c.stroke(); c.restore();
      for (let i = 0; i < 4; i++) fx.drops(rnd() * 540, y, 1.8, 1);
      if (z.ship) { const [bx, by, pp] = P(380, y + 6, 2.0), s = unit(pp) / 60; c.save(); c.translate(bx, by); c.rotate(Math.sin(R.time * 4) * 0.15);
        chip(c, [[-44 * s, -10 * s], [48 * s, -12 * s], [34 * s, 18 * s], [-30 * s, 18 * s]], "#8c5024", 9, { tx: 4, ty: 3, lw: 2.2 });
        c.strokeStyle = "#4b2810"; c.lineWidth = 4 * s; c.beginPath(); c.moveTo(4 * s, -10 * s); c.lineTo(4 * s, -72 * s); c.stroke();
        chip(c, [[6 * s, -64 * s], [36 * s, -48 * s], [32 * s, -22 * s], [6 * s, -24 * s]], "#fff7e2", 11, { tx: 3, ty: 2, lw: 2 }); chip(c, [[4 * s, -72 * s], [24 * s, -67 * s], [4 * s, -61 * s]], "#ff4848", 12, { tx: 2, ty: 1.5, lw: 1.6 }); c.restore(); } } }
  else if (k === "volcano") { const [sx, sy, pp] = P(z.x, z.y, 0.02), rise = Math.min(1, z.t / z.erupt), fade = z.erupted ? clamp((z.dur - z.t) / 1, 0, 1) : 1, mw = unit(pp) * 1.3, mh = unit(pp) * 1.6 * (0.1 + rise * 0.9) * fade;
    chip(c, [[sx - mw, sy + 6], [sx - mw * 0.32, sy - mh], [sx + mw * 0.32, sy - mh], [sx + mw, sy + 6]], z.erupted ? "#8c3b20" : "#786250", 15, { tx: 5, ty: 4, lw: 2.4 });
    if (z.erupted && fade > 0.2) { flame(c, sx, sy - mh, unit(pp) * 0.8, 15); if (rnd() < 0.8) fx.burst(z.x, z.y, 1.7 * fade, ["#ff6a2a", "#ffd23a"], 2, { spd: 1.2, up: 4, grav: 4, life: 0.9 }); }
    else if (!z.erupted && rnd() < 0.5) fx.chunks(z.x + (rnd() - 0.5) * 120, z.y + (rnd() - 0.5) * 80, 0.05, "#8c7464", 1, { spd: 0.5, up: 2.5 });
    if (z.mole && z.erupted) { c.fillStyle = "#7c5236"; c.strokeStyle = OL; c.lineWidth = 2; const mx = sx + Math.sin(z.t * 4) * 34 * pp; c.beginPath(); c.ellipse(mx, sy, 15 * pp, 11 * pp, 0, Math.PI, TAU); c.fill(); c.stroke(); c.fillStyle = "#ff9ab0"; c.beginPath(); c.arc(mx, sy - 6 * pp, 3 * pp, 0, TAU); c.fill(); } }
  else if (k === "sawSword") { const [sx, sy, pp] = P(z.x, z.y, 0.6); sword(c, sx, sy, unit(pp) * 0.9, R.time * 18 + z.ang, "#72f5ff"); if (rnd() < 0.3) fx.burst(z.x, z.y, 0.6, "#ffe24a", 1, { spd: 2, chip: true }); }
  else if (k === "swordOrbit" && h) { const n = Math.min(9, z.count); for (let i = 0; i < n; i++) { const a = R.time * 3.2 + i / n * TAU, [ox, oy, op] = P(h.x + Math.cos(a) * 1.1 * TILE, h.y + Math.sin(a) * 0.8 * TILE, 0.8 + Math.sin(R.time * 5 + i) * 0.1); sword(c, ox, oy, unit(op) * 0.66, a + 1.2, "#ffe866"); } }
  else if (k === "plantedSword") { const f = clamp(z.t / z.drop, 0, 1), [px, py, pp] = P(z.x, z.y, f < 1 ? lerp(3.2, 0.1, f * f) : 0.1); sword(c, px, py - unit(pp) * 0.1, unit(pp) * 0.85, Math.PI * 0.5 + Math.PI, "#72f5ff");
    if (f >= 1 && !z._landed) { z._landed = 1; fx.chunks(z.x, z.y, 0.1, "#c8b29c", 8, { spd: 1.5 }); fx.ring(z.x, z.y, 6, 50, "#5cf2ff", 0.3); } }
}
function drawHazards(c) {
  for (const o of B.puddles) { const [sx, sy, pp] = P(o.x, o.y, 0.01), life = o.life / (o.max || 1), r = o.r * kpx(pp) * (0.7 + 0.3 * Math.min(1, (1 - life) * 6));
    c.save(); c.globalAlpha = 0.6 * Math.min(1, life * 3); c.fillStyle = "#42b4ff"; tracePoly(c, makeEllipsePts(sx, sy, r, r * cam.th / cam.tw, 12, (o.id * 99) | 0, 0.1)); c.fill(); c.strokeStyle = "#1e7ed8"; c.lineWidth = 2; c.stroke();
    c.fillStyle = "rgba(255,255,255,0.6)"; c.beginPath(); c.ellipse(sx - r * 0.3, sy - r * 0.15, r * 0.22, r * 0.07, 0, 0, TAU); c.fill(); c.restore(); }
  for (const o of B.zones) { const [sx, sy, pp] = P(o.x, o.y, 0.01), life = o.life / (o.max || 1), r = o.r * kpx(pp);
    c.save(); c.globalAlpha = 0.3 * Math.min(1, life * 2) + 0.08 * Math.sin(R.time * 12); c.fillStyle = o.color || "#ff6a2a"; c.beginPath(); c.ellipse(sx, sy, r, r * cam.th / cam.tw, 0, 0, TAU); c.fill(); c.restore();
    if (rnd() < 0.3) fx.flames(o.x + (rnd() - 0.5) * o.r, o.y + (rnd() - 0.5) * o.r * 0.6, 0.02, 1, 0.24, { spread: 4, col: o.color || "#ff5524" }); }
}
function drawRubble(c, o) { const [sx, sy, pp] = P(o.x, o.y, 0), u = unit(pp) * (o.big ? 1.3 : 1), a = clamp(o.life / o.max * 4, 0, 1);
  c.save(); c.globalAlpha = a; for (let si = -1; si <= 1; si++) { const ox = sx + si * u * 0.2, oy = sy + Math.abs(si) * u * 0.05, sh = u * (0.28 - Math.abs(si) * 0.06);
    chip(c, [[ox - u * 0.09, oy], [ox, oy - sh], [ox + u * 0.09, oy]], "#9e8874", si + 3, { tx: 2.5, ty: 2, lw: 1.5 }); } c.restore(); }

/* ---------- overlay (crisp 2D: HP bars, numbers, comic words, drops, badges) ---------- */
function txt(g, s, x, y, size, col, o) { o = o || {}; g.font = `900 ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.lineWidth = Math.max(3, size * 0.2); g.strokeStyle = o.stroke || OL; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y); }
function bar(g, x, y, w, h, k, col, o) { o = o || {}; g.fillStyle = OL; g.beginPath(); g.roundRect(x - w / 2 - 1.5, y - 1.5, w + 3, h + 3, (h + 3) / 2); g.fill(); g.fillStyle = "#fff8ec"; g.beginPath(); g.roundRect(x - w / 2, y, w, h, h / 2); g.fill();
  if (k > 0) { g.fillStyle = col; g.beginPath(); g.roundRect(x - w / 2, y, Math.max(h, w * Math.min(1, k)), h, h / 2); g.fill(); } if (o.shield) { g.fillStyle = "rgba(127,224,122,0.9)"; g.fillRect(x - w / 2, y, w * Math.min(1, o.shield), h * 0.45); } }
const uiS = () => clamp(cam.tw / 62, 0.72, 1.25);
function drawOverlay(dt) {
  const g = octx, s = R.dpr; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, overlay.width, overlay.height); g.setTransform(s, 0, 0, s, 0, 0);
  if (R.mode !== "battle") return drawWords(g, dt);
  const ui = uiS();
  if (!B.locked) for (let i = 0; i < 10; i++) { const p = S.slotPos(i), q = project(p.x + 26, p.y + 26, 0); const tr = B.terrain && B.terrain[i]; if (tr) txt(g, D.TERRAIN[tr].icon, q.x, q.y, 15 * ui, "#fff"); }
  for (const t of B.towers) {
    const q = project(t.x, t.y, 1.18 + (t.flyT > 0 ? 0.65 : 0)), st = S.petStats(t), w = 36 * ui;
    bar(g, q.x + 9 * ui, q.y, w, 6 * ui, t.hp / st.maxHp, t.hp / st.maxHp > 0.4 ? "#4ccf52" : "#ff5a4a", { shield: t.shield > 0 ? t.shield / st.maxHp : 0 });
    g.fillStyle = OL; g.beginPath(); g.roundRect(q.x - w / 2 - 14 * ui, q.y - 4 * ui, 22 * ui, 13 * ui, 6 * ui); g.fill(); txt(g, "Lv" + t.tier, q.x - w / 2 - 3 * ui, q.y + 2.5 * ui, 9 * ui, "#ffe14a");
    if (t.fainted) txt(g, "💤", q.x, q.y - 16 * ui, 20 * ui, "#fff");
    else if (S.upgradeReady(t) && B.gold >= D.upgradeCost(t)) txt(g, "⬆", q.x + 24 * ui, q.y - 10 * ui + Math.sin(R.time * 6) * 4, 22 * ui, "#4ccf52", { stroke: "#ffffff" });
    if (t.jamT > 0) txt(g, "🤢", q.x - 24 * ui, q.y - 12 * ui, 16 * ui, "#fff");
    if (t.sleepT > 0) txt(g, "Zz", q.x + 18 * ui, q.y - 16 * ui, 16 * ui, "#8aa6ff");
    if (R.ultPick && !t.fainted) { g.strokeStyle = "#ffffff"; g.lineWidth = 3; g.setLineDash([6, 5]); const c = project(t.x, t.y, 0.4); g.beginPath(); g.arc(c.x, c.y, 36 * ui, 0, TAU); g.stroke(); g.setLineDash([]); }
  }
  for (const e of B.enemies) {
    if (e.hp <= 0) continue; const def = ENEMY[e.typ], hh = def.size / 80 * 1.02 + (def.fly ? 0.85 : 0.12);
    if (e.hp < e.max || e.boss || e.elite) { const q = project(e.x, e.y, hh), w = (e.boss ? 90 : 40) * ui; bar(g, q.x, q.y, w, (e.boss ? 9 : 5) * ui, e.hp / e.max, e.boss ? "#ff3a6a" : "#ff8a3a"); if (e.boss) txt(g, def[B.lang === "en" ? "en" : "zh"], q.x, q.y - 12 * ui, 13 * ui, "#fff"); }
    if (e.petrified) { const q = project(e.x, e.y, hh); txt(g, "🗿" + e.statueHp, q.x, q.y - 14 * ui, 14 * ui, "#fff"); }
    else if (e.rockShell > 0) { const q = project(e.x, e.y, hh); txt(g, "🪨".repeat(e.rockShell), q.x, q.y - 12 * ui, 11 * ui, "#fff"); }
  }
  const h = B.hero;
  if (h) {
    if (h.deadT > 0) { const q = project(270, 480, 0.5); txt(g, (B.lang === "en" ? "Hero back in " : "主角复活 ") + Math.ceil(h.deadT) + "s", q.x, q.y, 20 * ui, "#ff8a8a"); }
    else { const q = project(h.x, h.y, 1.5 + (h.ridingSwordT > 0 ? 0.55 : 0)), w = 56 * ui; bar(g, q.x, q.y, w, 7 * ui, h.hp / h.maxHp, "#ffd23a");
      g.fillStyle = "#e8323a"; g.beginPath(); g.roundRect(q.x - w / 2 - 26 * ui, q.y - 3 * ui, 24 * ui, 14 * ui, 7 * ui); g.fill(); txt(g, "Lv" + h.level, q.x - w / 2 - 14 * ui, q.y + 4 * ui, 10 * ui, "#fff");
      txt(g, "▼", q.x, q.y - 12 * ui + Math.sin(R.time * 5) * 3, 14 * ui, h.def.burstCol); }
  }
  for (const d of B.drops) { const q = project(d.x, d.y, 0.5 + Math.sin(R.time * 4 + d.ph) * 0.12), r = 22 * ui;
    g.fillStyle = d.life < 3 && Math.sin(R.time * 18) > 0 ? "rgba(255,255,255,0.5)" : "#fff8ec"; g.strokeStyle = OL; g.lineWidth = 3; g.beginPath(); g.arc(q.x, q.y, r, 0, TAU); g.fill(); g.stroke();
    g.font = `${22 * ui}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(D.ITEMS24[d.k].ic, q.x, q.y + 1); }
  for (const f of B.floaters) { const q = project(f.x, f.y, 1.0), k = f.life / f.max, sz = (f.huge ? 40 : f.big ? 22 : f.coin ? 14 : 16) * ui * (f.crit ? 1.25 : 1) * (1 + (1 - Math.min(1, (1 - k) * 8)) * 0.4);
    g.globalAlpha = Math.min(1, k * 2.5); txt(g, f.text, q.x, q.y, sz, f.color); g.globalAlpha = 1; }
  drawWords(g, dt);
  if (banner) { banner.life -= dt; const k = banner.life / banner.max, sc = 1 + Math.max(0, (k - 0.85)) * 4;
    g.globalAlpha = Math.min(1, k * 3); g.fillStyle = "rgba(255,248,236,0.94)"; const bw = Math.min(R.w * 0.8, 420), bh = (banner.big ? 64 : 48) * ui, by = R.h * 0.36;
    g.beginPath(); g.roundRect(R.w / 2 - bw / 2, by - bh / 2, bw, bh, bh / 2); g.fill(); g.strokeStyle = OL; g.lineWidth = 3; g.stroke(); g.strokeStyle = banner.col; g.lineWidth = 2; g.beginPath(); g.roundRect(R.w / 2 - bw / 2 + 5, by - bh / 2 + 5, bw - 10, bh - 10, (bh - 10) / 2); g.stroke();
    txt(g, banner.text, R.w / 2, by, (banner.big ? 36 : 28) * ui * sc, banner.col); g.globalAlpha = 1; if (banner.life <= 0) banner = null; }
}
function drawWords(g, dt) {
  const ui = uiS();
  for (const w of words) { w.life -= dt; const k = w.life / w.max, q = project(w.x, w.y, w.h + (1 - k) * 0.6), pop = 1 + Math.max(0, k - 0.8) * 3;
    g.save(); g.globalAlpha = Math.min(1, k * 3); g.translate(clamp(q.x, 60, R.w - 60), Math.max(R.topInset + 24, q.y)); g.rotate(-0.08); txt(g, w.text, 0, 0, w.size * ui * pop, w.col); g.restore(); }
  for (let i = words.length - 1; i >= 0; i--) if (words[i].life <= 0) words.splice(i, 1);
  if (words.length > 24) words.splice(0, words.length - 24);
}

/* ---------- frame ---------- */
const TITLE = { pets: [], slimes: [] };
function scene(c) {
  const theme = R.mode === "battle" ? S.curTheme() : "orchard"; R.theme = theme;
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(ensureBg(theme), 0, 0); c.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
  const list = [];
  for (const [kind, x, y, sc] of PROPS[theme] || PROPS.orchard) list.push([y - 400, () => { const [sx, sy, pp] = P(x, y, 0), hPx = unit(pp) * sc * 1.15; baseShadow(c, sx, sy, hPx * 0.7, 0, x, true, null); standee(c, kind, sx, sy, hPx, 1, 0, 0, 0, "#fff", kind === "tree" || kind === "palm" ? x + 1 : 0); }]);
  if (R.mode === "battle") {
    if (B.iceFloorT > 0) { c.save(); c.globalAlpha = Math.min(0.35, B.iceFloorT * 0.04); c.fillStyle = "#bfeeff"; tracePoly(c, quad(0, 59, 540, 713, 0.01)); c.fill(); c.restore(); }
    drawHazards(c); drawGround(c);
    for (const z of B.hzones) zoneGround(c, z);
    for (const o of B.rubbles) list.push([o.y - 30, () => drawRubble(c, o)]);
    for (const t of B.towers) list.push([t.y, () => drawPet(c, t)]);
    for (const e of B.enemies) if (e.hp > 0) list.push([e.y + (ENEMY[e.typ].fly ? 4 : 0), () => drawEnemy(c, e)]);
    if (B.hero) list.push([B.hero.y + 1, () => drawHero(c, B.hero)]);
    for (const o of B.comps) list.push([o.y, () => drawComp(c, o)]);
    for (const z of B.hzones) list.push([(z.kind === "blizzard" || z.kind === "angryCloud" || z.kind === "zeus" ? 2000 : z.kind === "tsunami" ? (z.waveY != null && z.t < z.charge + z.waveDur ? z.waveY + 12 : 2000) : (z.y || (B.hero ? B.hero.y : 400)) + 2), () => zoneStand(c, z)]);
    for (const s of B.shots) list.push([s.y + 3, () => drawShot(c, s)]);
    for (const s of B.hshots) list.push([s.kind === "cloudBolt" || s.kind === "skyRock" ? 1900 : s.y + 3, () => drawHShot(c, s)]);
  } else {
    drawGround(c);
    TITLE.pets.forEach((id, i) => { const p = S.slotPos(i % 10), x = i < 10 ? p.x : (i === 10 ? 32 : 508), y = i < 10 ? p.y : 640;
      list.push([y, () => { const b = Math.abs(Math.sin(R.time * 3 + i * 0.7)), [gx, gy, gp] = P(x, y, 0), [sx, sy, pp] = P(x, y, b * 0.22); baseShadow(c, gx, gy, unit(gp) * 0.8, b * 0.2, i, true, null); standee(c, id, sx, sy, unit(pp) * 1.02, i % 2 ? -1 : 1, (1 - b) * 0.12); }]); });
    TITLE.slimes.forEach(([id, x, y], i) => list.push([y, () => { const b = Math.abs(Math.sin(R.time * 4 + i)), [gx, gy, gp] = P(x, y, 0), [sx, sy, pp] = P(x, y, b * 0.25), hPx = unit(pp) * ENEMY[id].size / 80;
      baseShadow(c, gx, gy, hPx * 0.8 * gp / pp, b * 0.25, i, false, ENEMY[id].boss ? "#ff3a6a" : null); standee(c, "e:" + id, sx, sy, hPx, 1, (1 - b) * 0.14, 0, Math.sin(R.time * 3 + i) * 0.05); }]));
    if (rnd() < 0.2) fx.burst(40 + rnd() * 460, 120 + rnd() * 540, 0.3 + rnd() * 1.5, ["#ffd23a", "#ff8ab8", "#7fe07a", "#8fdcff"], 1, { spd: 0.3, up: 0.6, grav: 0.3, life: 1.2 });
  }
  list.sort((a, b) => a[0] - b[0]);
  for (const it of list) it[1]();
  drawParts(c); drawAir(c);
  if (R.mode === "battle" && B.darkSkyT > 0) { c.fillStyle = `rgba(18,28,56,${Math.min(0.34, B.darkSkyT * 0.2)})`; c.fillRect(0, 0, R.w, R.h); }
  if (R.mode === "battle") for (const z of B.hzones) if (z.kind === "blizzard") { c.save(); c.fillStyle = "rgba(220,244,255,0.16)"; c.fillRect(0, 0, R.w, R.h);
    for (let f = 0; f < (R.low ? 14 : 24); f++) snowflake(c, ((hash(f * 7, 3) + z.t * 0.35) % 1) * R.w, ((hash(f * 13, 5) + z.t * 0.65) % 1) * R.h, 10 + (f % 3) * 4, z.t * 3 + f); c.restore(); }
}
let lastBattle = false;
export function frame(dt) {
  if (!R.ready) return;
  R.time += dt; CAP = R.low ? 360 : 700;
  if (R.mode === "battle") handleEvents();
  stepParts(dt);
  scene(ctx);
  drawOverlay(dt);
}
export function setTheme() {}
export function clearBattle() { fx.clear(); words.length = 0; banner = null; B.ev.length = 0; }
export function showTitle(on) {
  R.mode = on ? "title" : "battle";
  if (!TITLE.pets.length) { TITLE.pets = PET_IDS.slice(0, 12); TITLE.slimes = [["sprout", 106, 150], ["jelly", 188, 200], ["ember", 352, 190], ["zap", 434, 140], ["boss1", 270, 120], ["puff", 140, 330], ["pebble", 400, 300]]; }
  if (on) clearBattle();
  fitCamera();
}
/* DOM card art: the real gen-1 crayon sprite files */
export function portrait(kind, id) { return kind === "slime" ? `assets/enemies/${ENEMY_IMG[id] || "z-1"}.webp` : `assets/pets/${id}-1.webp`; }
export const _debug = { parts, gfx, words, cam };
