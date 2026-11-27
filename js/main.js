/* Pet Pals Defense 3 — boot + loop */
import * as S from "./sim.js";
import * as R from "./render.js";
import * as UI from "./ui.js";
const { B } = S;
const $ = (id) => document.getElementById(id);
R.init($("gl"), $("ov"));
UI.initUI();
R.showTitle(true);
let orient = "";
function layout() {
  const app = $("app"), w = app.clientWidth, hgt = app.clientHeight, st = $("stage"), side = $("side");
  const battle = app.dataset.screen === "battle";
  const port = w / hgt < 1.05;
  app.dataset.orient = port ? "port" : "land";
  let sw = w, sh = hgt;
  if (battle) {
    if (port) { const bottom = Math.max(236, Math.min(300, hgt * 0.3)); sh = Math.min(hgt - bottom, Math.round(w * 1.34)); sw = w; side.style.cssText = `left:0;top:${sh}px;width:${w}px;height:${hgt - sh}px`; }
    else { sw = Math.min(Math.round(hgt * 0.92), w - 330); sh = hgt; const sideW = Math.min(470, w - sw); const x0 = Math.max(0, (w - sw - sideW) / 2); st.style.left = x0 + "px"; side.style.cssText = `left:${x0 + sw}px;top:0;width:${sideW}px;height:${hgt}px`; }
  }
  st.style.width = sw + "px"; st.style.height = sh + "px"; if (!battle || port) st.style.left = "0px";
  const inset = battle ? ($("hud").offsetHeight || 0) : 0;
  const key = sw + "x" + sh + battle + inset;
  if (key !== orient) { orient = key; R.resize(sw, sh, inset); }
}
new ResizeObserver(layout).observe($("app"));
window.addEventListener("resize", layout);
let last = performance.now(), acc = 0, fpsA = 60, frames = 0, refreshT = 0;
const STEP = 1 / 60;
let cpuA = 0;
function loop(now) {
  const c0 = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  layout();
  const live = R.R.mode === "battle" && B.running && !B.over;
  if (live) {
    UI.pumpModals();
    if (!B.paused && !B.modalOpen) { acc += dt * B.speed; let n = 0; while (acc >= STEP && n < 10) { S.step(STEP); acc -= STEP; n++; } if (n >= 10) acc = 0; }
  }
  UI.tickTiming(dt); UI.tickToast(dt);
  const paused = live && (B.paused || B.modalOpen);
  R.frame(paused ? 0 : dt * (live ? Math.min(B.speed, 2) : 1));
  // screen shake: CSS translate, hard-capped at 1.6px
  B.shake = Math.max(0, (B.shake || 0) - dt * 7);
  const s = Math.min(1.6, B.shake), cv = $("gl");
  const tr = s > 0.05 && !paused ? `translate(${((Math.random() - 0.5) * 2 * s).toFixed(2)}px,${((Math.random() - 0.5) * 2 * s).toFixed(2)}px)` : "";
  cv.style.transform = tr; $("ov").style.transform = tr;
  refreshT -= dt; if (refreshT <= 0 && live) { refreshT = 0.1; UI.refresh(); }
  frames++; fpsA = fpsA * 0.95 + (1 / Math.max(0.001, dt)) * 0.05;
  cpuA = cpuA * 0.95 + (performance.now() - c0) * 0.05;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__ppd3 = { B, S, R, UI, get fps() { return fpsA; }, get frames() { return frames; }, get cpuMs() { return cpuA; } };
