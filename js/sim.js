/* Battle simulation in gen-1 field pixels (540 x 724). Rules follow gen-1 v2.9.12; the protagonist follows gen-2 v20. */
import * as D from "./data.js";
const { LANES, LANE_X, FRONT_Y, BACK_Y, FIELD_TOP, FENCE_Y, LEAK_Y, TAU, PET, ENEMY, TILE } = D;

export const B = {
  level: null, lives: 1, gold: 60, wave: 0, running: false, paused: false, speed: 1, over: false, won: false,
  enemies: [], towers: [], shots: [], zones: [], floaters: [], ev: [], drops: [], items: [null, null, null],
  spawnQ: [], spawnT: 0, spawnGap: 1, waveActive: false, countdown: 12, t: 0, kills: 0, perks: {}, ultCd: 0,
  revives: 0, chg: 0, hero: null, hzones: [], hshots: [], puddles: [], rubbles: [], comps: [],
  iceFloorT: 0, darkSkyT: 0, shake: 0, hitStop: 0, modalQ: [], lang: "zh", nextPreview: null
};
export const ui = { toast: () => {}, refresh: () => {}, end: () => {}, sfx: () => {} };
const ev = (o) => { B.ev.push(o); };
let curSrc = null;
const rnd = Math.random;
export function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
const lerp = (a, b, t) => a + (b - a) * t;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const T = (zh, en) => (B.lang === "en" ? en : zh);
export function bumpShake(n) { B.shake = Math.min(1.6, Math.max(B.shake, n)); }   // hard cap 1.6px
function floater(x, y, text, color, o) { B.floaters.push(Object.assign({ x, y, text, color, life: 0.75, max: 0.75 }, o || {})); }
function burst(x, y, color, n, o) { ev(Object.assign({ t: "burst", x, y, color, n: n || 8 }, o || {})); }

/* ---------- level + squad ---------- */
export function slotPos(i) { return { x: LANE_X[i % LANES], y: i < LANES ? FRONT_Y : BACK_Y }; }
function terrainMap(level, wave) {
  if (!level) return {};
  if (level.story) return level.terrain || {};
  const th = D.zoneOf(Math.max(1, wave || 1)), m = D.MAPS.find(x => x.theme === th);
  return m ? m.terrain : D.ENDLESS_TERRAIN;
}
export function curTheme() { return B.level && B.level.story ? B.level.theme : D.zoneOf(Math.max(1, B.wave)); }
export function laneXAt(lane) { return LANE_X[lane]; }
function perkN(id) { return (B.perks[id]) | 0; }
function perkV(id) { const p = D.PERKS24.find(x => x.id === id); return p ? p.v * perkN(id) : 0; }
export { perkN };

export function petStats(t) {
  const d = PET[t.id];
  const tier = clamp(t.tier | 0 || 1, 1, D.MAX_TIER) - 1;
  const sm = D.starMul(d.rar, t.star), base = sm * D.TIER_ATK[tier];
  const tz = (t.terr && D.TERRAIN[t.terr]) || {}, au = t._aura ? 1 : 0, jam = t.jamT > 0 ? 1.6 : 1;
  const out = {
    dmg: d.dmg * base * (1 + (t._dmgB || 0)),
    rate: d.rate / (1 + (t._haste || 0)) / D.TIER_SPD[tier] / (t.star >= 5 ? 1.1 : 1),
    range: d.range * (1 + 0.04 * (t.star - 1)) * D.TIER_RANGE[tier],
    maxHp: d.hp * base,
    splash: (d.splash || 0) * (1 + 0.05 * (t.star - 1)),
    heal: (d.heal || 0) * (1 + 0.15 * (t.star - 1)) * D.TIER_HEAL[tier],
    haste: (d.haste || 0) * (1 + 0.12 * (t.star - 1)),
    buff: (d.buff || 0) * (1 + 0.12 * (t.star - 1)),
    slow: d.slow || 0, slowT: d.slowT || 0, chain: (d.chain || 0) + (t.star >= 4 ? 1 : 0), fall: d.fall || 0.7,
    crit: d.crit || 0, critM: d.critM || 2, stun: (d.stun || 0) * D.TIER_STUN[tier], burn: (d.burn || 0) * base,
    thorns: d.thorns || 0, regen: d.regen || 0
  };
  out.dmg *= (1 + D.AURA.atk * au);
  out.rate = out.rate / (1 + (tz.spd || 0)) / (1 + D.AURA.spd * au) * jam;
  out.range *= 1 + (tz.range || 0);
  out.crit += (tz.crit || 0);
  out.splash *= 1 + (tz.splash || 0);
  out.slow = Math.min(0.85, out.slow * (1 + (tz.slow || 0)));
  out.dmg *= (1 + perkV("atk")) * (t.flyT > 0 ? 1.9 : 1);          // v2.4 perks + Sky Wings
  out.maxHp *= (1 + perkV("hp"));
  out.rate /= (1 + perkV("spd"));
  out.crit += perkV("crit");
  out.range *= (1 + perkV("range")) * (t.flyT > 0 ? 2.0 : 1);
  return out;
}

export function startRun(levelId, squad, heroKey) {
  const map = D.MAP[levelId];
  const level = map ? Object.assign({}, map, { story: true }) : D.ENDLESS;
  Object.assign(B, {
    level, lives: 1, gold: 60, wave: 0, running: true, paused: false, over: false, won: false,
    enemies: [], towers: [], shots: [], zones: [], floaters: [], ev: [], drops: [], items: [null, null, null],
    spawnQ: [], spawnT: 0, spawnGap: 1, waveActive: false, countdown: 12, t: 0, kills: 0, perks: {}, ultCd: 0,
    revives: 0, chg: 0, hzones: [], hshots: [], puddles: [], rubbles: [], comps: [], iceFloorT: 0, darkSkyT: 0,
    shake: 0, hitStop: 0, modalQ: [], locked: false, bestWave: 0, modalOpen: false
  });
  B.terrain = terrainMap(level, 1);
  for (const q of squad) deploy(q.id, q.s);
  B.hero = makeHero(heroKey);
  B.nextPreview = specFor(1);
}
export function deploy(id, slot) {
  if (B.locked || slot < 0 || slot >= D.SLOTS) return false;
  B.towers = B.towers.filter(t => t.slot !== slot && t.id !== id);
  const { x, y } = slotPos(slot);
  const t = { uid: id, id, star: 1, tier: 1, slot, x, y, y0: y, cd: 0.5, bounce: 0, hp: 0, fainted: false, ph: rnd() * 6,
    terr: (B.terrain || {})[slot] || "", jamT: 0, kills: 0, flyT: 0, fireT: 0, swapT: 0, shield: 0 };
  t.hp = petStats(t).maxHp;
  B.towers.push(t);
  return true;
}
export function recall(slot) { if (B.locked) return false; B.towers = B.towers.filter(t => t.slot !== slot); return true; }
function specFor(n) {
  const lv = B.level;
  if (lv.story && n > lv.waves) return null;
  return lv.story ? D.storySpec(lv, n) : D.endlessSpec(n);
}
export function startNextWave() {
  const lv = B.level, n = B.wave + 1;
  const es = specFor(n);
  if (!es) return false;
  B.spawnQ = es.list.map(g => ({ id: g.id, hpMul: es.hpMul * (g.bossMul || 1), spdMul: es.spdMul }));
  B.spawnGap = es.gap;
  B.wave++; B.waveActive = true; B.spawnT = 0.2;
  if (B.wave === 1) B.locked = true;
  if (lv.endless) { const tm = terrainMap(lv, B.wave); if (tm !== B.terrain) { B.terrain = tm; for (const t of B.towers) t.terr = tm[t.slot] || ""; } }
  B.nextPreview = specFor(n + 1);
  const boss = es.list.some(g => ENEMY[g.id] && ENEMY[g.id].boss);
  if (lv.story && B.wave === lv.waves) ui.toast(T("最终波！", "Final wave!"), 2.8);
  else if (B.wave > 1) ui.toast(boss ? T("第 " + B.wave + " 波 · 首领来袭！", "Wave " + B.wave + " · Boss incoming!") : T("第 " + B.wave + " 波来了！", "Wave " + B.wave + " incoming!"));
  if (boss) ev({ t: "bossWarn" });
  ui.sfx("wave"); ui.refresh();
  return true;
}
let laneBag = [];
export function spawnEnemy(g) {
  const def = ENEMY[g.id]; if (!def) return null;
  if (!laneBag.length) laneBag = [0, 1, 2, 3, 4].sort(() => rnd() - 0.5);
  const lane = def.boss ? 2 : laneBag.pop();
  const e = {
    typ: g.id, lane, x: laneXAt(lane), y: 86, hp: def.hp * g.hpMul, max: def.hp * g.hpMul,
    spd: def.spd * g.spdMul, atk: def.atk * Math.sqrt(g.hpMul), el: def.el, fly: !!def.fly, boss: !!def.boss,
    reward: def.reward, slowT: 0, slowV: 1, stunT: 0, burnT: 0, burnD: 0, atkCd: 0.6, ph: rnd() * 6, biting: false, hitT: 0,
    skillT: 2 + rnd() * 2, summons: 0, size: def.size, born: B.t, minion: !!g.minion,
    slow2T: 0, paralyzeT: 0, paraTick: 0, rockShell: 0, petrified: false, statueHp: 0, bubbleT: 0, soakedT: 0, frozenT: 0, heroBiteCd: 0.5, squash: 0
  };
  B.enemies.push(e);
  if (!def.boss && !g.minion && B.level && rnd() < D.eliteChance(B.wave + ((B.level.story && B.level.off) | 0))) { e.elite = true; e.hp *= 1.5; e.max *= 1.5; e.reward = Math.round(e.reward * 1.5); }
  ev({ t: "spawn", e });
  return e;
}

/* ---------- enemy skills (gen-1 v13) ---------- */
function enemySkills(e, dt) {
  const def = ENEMY[e.typ];
  if (e.elite && e.hp < e.max) e.hp = Math.min(e.max, e.hp + e.max * 0.015 * dt);
  if (e.boss && !e.enraged && e.hp < e.max * 0.5) { e.enraged = true; e.spd *= 1.35; floater(e.x, e.y - 70, T("暴怒！", "ENRAGED!"), "#ff5a5a", { life: 1.4, max: 1.4, big: true }); ev({ t: "ring", x: e.x, y: e.y, r0: 20, r1: 150, color: "#ff5a5a", life: 0.5 }); }
  if (!def.skill || e.y < 140 || e.frozenT > 0 || e.stunT > 0) return;
  e.skillT -= dt; if (e.skillT > 0) return;
  if (def.skill === "spit") {
    e.skillT = 3.6;
    const ts = B.towers.filter(t => !t.fainted && dist(t.x, t.y, e.x, e.y) < 420); if (!ts.length) return;
    const t = ts.sort((a, b) => b.y - a.y)[0];
    ev({ t: "goo", x1: e.x, y1: e.y, x2: t.x, y2: t.y, life: 0.45 });
    e._spitAt = { t, at: B.t + 0.42 };
  } else if (def.skill === "summon") {
    e.skillT = 4.5; if (e.summons >= 6) return;
    const n = 2 + (rnd() < 0.5 ? 1 : 0);
    for (let k = 0; k < n; k++) { const m = spawnEnemy({ id: "mini", hpMul: e.max / def.hp * 0.6, spdMul: e.spd / def.spd, minion: true }); m.lane = e.lane; m.y = e.y + 10; m.x = e.x + (k - 1) * 16; m.reward = 1; }
    e.summons += n; ev({ t: "ring", x: e.x, y: e.y, r0: 6, r1: 50, color: "#b07aff", life: 0.35 });
    const backs = B.towers.filter(t => !t.fainted && t.slot >= 5);
    if (backs.length) { const t = pick(backs); t.sleepT = Math.max(t.sleepT || 0, 2.2); burst(t.x, t.y, "#c89aff", 8); }
  }
}
function blockerFor(e) {
  const f = B.towers.find(t => t.slot === e.lane && !t.fainted && !(t.flyT > 0));
  if (f) return f;
  return B.towers.find(t => t.slot === e.lane + LANES && !t.fainted && !(t.flyT > 0)) || null;
}
export function enemiesIn(x, y, r) { return B.enemies.filter(e => e.hp > 0 && dist(x, y, e.x, e.y) <= r); }
function targetFor(t, range) {
  let best = null, by = -1;
  for (const e of B.enemies) { if (e.hp <= 0) continue; if (dist(t.x, t.y - 30, e.x, e.y) <= range && e.y > by) { best = e; by = e.y; } }
  return best;
}
function nearestOther(x, y, r, used) { return enemiesIn(x, y, r).filter(e => !used.has(e)).sort((a, b) => dist(x, y, a.x, a.y) - dist(x, y, b.x, b.y))[0] || null; }

/* ---------- damage ---------- */
export function hitEnemy(e, dmg, elem, o) {
  o = o || {};
  if (!e || e.hp <= 0) return;
  const src = o.src !== undefined ? o.src : curSrc;
  const isTower = src && src.uid != null;
  if (isTower) { e.lastSrc = src; if (src.swapT > 0 && src.swapEl) elem = src.swapEl;
    if (src.fireT > 0) { o = Object.assign({}, o, { burn: Math.max(o.burn || 0, dmg * 0.6), burnT: 4 }); if (rnd() < 0.45) burst(e.x, e.y, "#ff8a3a", 4); } }
  if (src === "hero" || src === "comp") e.lastSrc = src;
  const armor = D.ARMOR[e.typ] || 0;
  if (armor) dmg *= 1 - armor;
  if (e.typ !== "shield" && B.enemies.some(q => q.typ === "shield" && q.hp > 0 && q.lane === e.lane && q.y > e.y && q.y - e.y < 130)) dmg *= 0.65;
  if (isTower && src.star >= 5) dmg *= 1.08;
  if (e.frozenT > 0) dmg *= 1.25;
  if (e.petrified) dmg *= 0.85;                       // gen-2 statue
  const m = D.elemMul(elem, e.el);
  const d = dmg * m;
  e.hp -= d; e.hitT = 0.12; e.squash = o.crit ? 1.24 : 0.95;
  if (o.kb) e.y = Math.max(FIELD_TOP - 20, e.y - o.kb);
  const heroSide = src === "hero" || src === "comp";
  floater(e.x + (rnd() - 0.5) * 14, e.y - 30, Math.round(d) + (o.crit ? "!" : ""), o.crit ? "#ffd23a" : m > 1 ? "#ff8a5a" : heroSide ? "#fff27a" : "#ffffff", { big: o.crit || m > 1, crit: !!o.crit });
  if (o.slow) { e.slowT = Math.max(e.slowT, o.slowT || 1.5); e.slowV = Math.min(e.slowV, 1 - o.slow); }
  if (o.stun) e.stunT = Math.max(e.stunT, e.boss ? o.stun * 0.4 : o.stun);
  if (o.burn) { e.burnT = Math.max(e.burnT, o.burnT || 2); e.burnD = Math.max(e.burnD, o.burn); }
  if (e.hp <= 0) killEnemy(e, o.fk);
}
function killEnemy(e, fk) {
  if (e.dead) return;
  e.hp = 0; e.dead = true;
  const def0 = ENEMY[e.typ];
  const src = (curSrc && curSrc.uid != null ? curSrc : null) || e.lastSrc;
  const bonus = def0.thief ? 10 + Math.floor(B.wave / 2) : 0;
  let gain = D.goldIncome(e.reward + bonus);
  if ((src === "hero" || src === "comp") && B.hero) gain = Math.round(gain * (B.hero.goldMul || 1));
  B.gold += gain; B.kills++;
  const extra = Math.round(gain * perkV("coin")); if (extra > 0) B.gold += extra;
  if (src && src.uid != null && B.towers.includes(src)) src.kills = (src.kills | 0) + 1;
  if (def0.split) for (let k = -1; k <= 1; k += 2) {
    const m = spawnEnemy({ id: def0.split, hpMul: e.max / def0.hp, spdMul: e.spd / def0.spd });
    m.lane = e.lane; m.y = e.y - 6; m.x = e.x + k * 14; m.ph = e.ph + k;
  }
  ev({ t: "death", x: e.x, y: e.y, color: def0.col, size: e.size, boss: e.boss, fk: fk || "", typ: e.typ });
  floater(e.x, e.y - 10, "+" + gain, "#ffd23a", { life: 0.8, max: 0.8, coin: true });
  ui.sfx("pop");
  if (B.drops.length < 3 && rnd() < (e.boss ? 0.50 : 0.045)) dropItem(e.x, e.y);
  if (!e.minion) { B.chg = Math.min(D.CHG_MAX * 2, B.chg + (e.boss ? 4 : 1)); grantChargedItem(); }
  heroXp(e.boss ? 6 : 1);
  if (e.boss) { bumpShake(1.6); B.hitStop = 0.06; }
}
function dropItem(x, y, k) {
  k = k || pick(Object.keys(D.ITEMS24));
  B.drops.push({ k, x: clamp(x, 40, 500), y: clamp(y, FIELD_TOP + 40, FENCE_Y - 60), life: 10, ph: rnd() * 6, id: rnd() });
  ui.sfx("coin");
}
function grantChargedItem() {
  const empty = B.items.indexOf(null);
  if (empty < 0 || B.chg < D.CHG_MAX) { ui.refresh(); return false; }
  B.chg -= D.CHG_MAX;
  const k = pick(Object.keys(D.ITEMS24));
  B.items[empty] = k;
  ui.toast(T("⚡ 免费道具：", "⚡ Free item: ") + itemName(k), 1.9);
  ui.refresh();
  return true;
}
export function itemName(k) { return { fly: T("飞天翅膀", "Sky Wings"), fire: T("火焰之力", "Fire Power"), swap: T("元素转换", "Element Swap") }[k]; }
export function pickDrop(d) {
  const i = B.items.indexOf(null);
  if (i < 0) { ui.toast(T("道具栏满了", "Item bar is full")); return false; }
  B.items[i] = d.k; B.drops = B.drops.filter(q => q !== d); ui.sfx("coin");
  ui.toast(T("捡到 ", "Got ") + itemName(d.k) + T("！拖到宠物身上使用", "! Drag it onto a pet"));
  ui.refresh(); return true;
}
export function useItem(slotIdx, t) {
  const k = B.items[slotIdx];
  if (!k || !t || t.fainted) return false;
  B.items[slotIdx] = null;
  const dur = D.ITEMS24[k].dur;
  if (k === "fly") t.flyT = dur;
  else if (k === "fire") t.fireT = dur;
  else if (k === "swap") {
    const cnt = {}; for (const e of B.enemies) if (e.hp > 0) cnt[e.el] = (cnt[e.el] || 0) + 1;
    const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || "草";
    t.swapEl = Object.keys(D.ADV).find(a => D.ADV[a] === top) || PET[t.id].el; t.swapT = dur;
  }
  ev({ t: "item", x: t.x, y: t.y, k, color: D.ITEMS24[k].col });
  ui.sfx("lvup"); ui.refresh(); return true;
}
function hitPet(t, dmg, e) {
  if (t.fainted || t.flyT > 0) return;
  if (t.shield > 0) { const ab = Math.min(t.shield, dmg); t.shield -= ab; dmg -= ab; }
  t.hp -= dmg; t.hurtT = 0.15;
  const st = petStats(t);
  if (st.thorns && e) hitEnemy(e, dmg * st.thorns * (1 + 0.4 * (t.star - 1)), PET[t.id].el, { src: t });
  if (t.hp <= 0) { t.hp = 0; t.fainted = true; burst(t.x, t.y, "#ffffff", 14); ui.toast(T(PET[t.id].zh + " 累倒了！花新金币复活它", PET[t.id].en + " fainted! Revive it with coins")); ui.refresh(); }
}
function leak(e) {
  e.hp = 0; e.leaked = true; e.dead = true;
  B.lives -= e.boss ? 5 : 1;
  if (ENEMY[e.typ].thief) { const st = Math.min(B.gold, 15 + B.wave); B.gold -= st; }
  ev({ t: "leak", x: e.x }); ui.sfx("leak");
  if (B.lives <= 0) { B.lives = 0; endRun(false); }
  ui.refresh();
}
function waveCleared() {
  B.waveActive = false;
  B.bestWave = Math.max(B.bestWave, B.wave);
  const down = B.towers.filter(t => t.fainted);
  for (const t of B.towers) { t.fainted = false; t.hp = petStats(t).maxHp; }
  for (const t of down) { t.fainted = true; t.hp = 0; }        // v2.4: only New Coins revive
  const h = B.hero; if (h && h.deadT <= 0) h.hp = Math.min(h.maxHp, h.hp + Math.round(h.maxHp * 0.25));   // gen-2 v20 wave heal
  B.countdown = 4;
  if (B.level.story && B.wave >= B.level.waves) { endRun(true); return; }
  ui.toast(T("第 " + B.wave + " 波清除！", "Wave " + B.wave + " cleared!"));
  queueModal({ kind: "perk" });
  ui.refresh();
}
export function endRun(won) {
  if (B.over) return;
  B.over = true; B.won = won; B.running = false;
  ui.end(won);
}
/* one picker at a time: gen-1 wave perk + gen-2 hero level-up share a queue */
export function queueModal(m) { B.modalQ.push(m); }
export function perkChoices() { return D.PERKS24.filter(p => perkN(p.id) < p.max).sort(() => rnd() - 0.5).slice(0, 3); }
export function choosePerk(id) { B.perks[id] = perkN(id) + 1; ui.sfx("click"); }

/* ---------- upgrades / revive / ult (v2.4) ---------- */
export function upgradeReady(t) { return t && !t.fainted && t.tier < D.MAX_TIER && (t.kills | 0) >= (D.UP_KILLS[t.tier] || 99); }
export function upgradeTower(t) {
  if (!t || t.tier >= D.MAX_TIER) return false;
  if (!upgradeReady(t)) { ui.toast(T("再打败 " + (D.UP_KILLS[t.tier] - (t.kills | 0)) + " 只怪才能升级", "Defeat " + (D.UP_KILLS[t.tier] - (t.kills | 0)) + " more slimes to level up")); return false; }
  const cost = D.upgradeCost(t);
  if (B.gold < cost) { ui.toast(T("新金币不够！打怪赚新金币吧", "Not enough coins — beat slimes to earn more!")); return false; }
  B.gold -= cost; const before = petStats(t).maxHp; t.tier++; t.hp += petStats(t).maxHp - before;
  ev({ t: "lvup", x: t.x, y: t.y }); burst(t.x, t.y, "#ffd23a", 26); burst(t.x, t.y, "#7fe07a", 12);
  floater(t.x, t.y - 100, "LEVEL UP!", "#ffe14a", { life: 1.3, max: 1.3, huge: true });
  ui.sfx("lvup"); ui.refresh(); return true;
}
export function reviveCost() {
  const apt = 50;
  const base = Math.max(8, Math.round((15 + apt * 0.6 + (B.wave | 0) * 2) * (1 - perkV("rev"))));
  const n = Math.min(B.revives | 0, 2);
  return Math.max(8, Math.round(base * Math.pow(1.5, n)));
}
export function revive(t) {
  if (!t || !t.fainted) return false;
  const c = reviveCost(t);
  if (B.gold < c) { ui.toast(T("复活要 🪙" + c + " 新金币", "Revive needs 🪙" + c)); return false; }
  B.gold -= c; t.fainted = false; t.hp = petStats(t).maxHp; B.revives++;
  burst(t.x, t.y, "#7fe07a", 18); ev({ t: "ring", x: t.x, y: t.y, r0: 8, r1: 70, color: "#7fe07a", life: 0.4 });
  ui.toast(T(PET[t.id].zh + " 复活啦！", PET[t.id].en + " is back!")); ui.sfx("lvup"); ui.refresh(); return true;
}
export function ultBoom(t, power, hits) {
  const d = PET[t.id], st = petStats(t), col = d.fx[0] || D.ELEM_COL[d.el], typ = D.ultTypOf(d);
  const mul = 2 + power / 45;
  ev({ t: "ult", x: t.x, y: t.y, color: col, typ, id: t.id, power });
  const prev = curSrc; curSrc = t;
  for (const e of B.enemies.slice()) if (e.hp > 0) { hitEnemy(e, st.dmg * mul * (typ === "burst" ? 1.3 : 1) + 8, d.el, { src: t, burn: typ === "blast" ? st.dmg : 0, stun: 0.5, fk: "ult" }); burst(e.x, e.y, col, 6); }
  curSrc = prev;
  if (typ === "heal") for (const a of B.towers) { if (!a.fainted) a.hp = petStats(a).maxHp; }
  else if (typ === "freeze") for (const e of B.enemies) if (e.hp > 0) e.frozenT = Math.max(e.frozenT || 0, 2 + hits * 0.15);
  else if (typ === "gold") B.gold += D.goldIncome(10 + hits * 4);
  else if (typ === "shield") for (const a of B.towers) if (!a.fainted) a.shield = (a.shield || 0) + petStats(a).maxHp * 0.4;
  floater(270, 300, "POWER x" + power, "#ffe14a", { life: 1.6, max: 1.6, huge: true, still: true });
  bumpShake(1.6); B.hitStop = 0.08;
  ui.sfx("ult");
  t.pop = 1; B.ultCd = 15;
  ui.refresh();
}

/* ---------- pet attacks (gen-1 fireTower0, same numbers) ---------- */
function shoot(o) { B.shots.push(Object.assign({ age: 0, hit: new Set(), src: curSrc, id: rnd() }, o)); }
function fxCol(t) { return PET[t.id].fx[0]; }
function originOf(t) { return { x: t.x, y: t.y - 34 - (t.flyT > 0 ? 50 : 0) }; }
function fireTower(t, st) { const prev = curSrc; curSrc = t; try { return fireTower0(t, st); } finally { curSrc = prev; } }
function fireTower0(t, st) {
  const d = PET[t.id], stg = D.stageOf(t.star), col = fxCol(t);
  const o = originOf(t), ox = o.x, oy = o.y;
  if (d.typ === "berrypop") {
    const r = st.range * (stg >= 4 ? 1.25 : 1);
    for (const q of B.towers) {
      if (q.fainted || dist(q.x, q.y, t.x, t.y) > r) continue;
      const mx = petStats(q).maxHp, hl = mx * st.heal * (stg >= 3 ? 1.3 : 1);
      if (q.hp < mx) floater(q.x, q.y - 60, "+" + Math.round(Math.min(hl, mx - q.hp)), "#3fbf4a", { life: 0.6, max: 0.6 });
      q.hp = Math.min(mx, q.hp + hl); q.berryT = 3;
      if (q !== t) ev({ t: "lob", kind: "berry", x1: ox, y1: oy, x2: q.x, y2: q.y - 30, color: col, life: 0.4 });
    }
    ev({ t: "ring", x: t.x, y: t.y, r0: 10, r1: 70, color: "#ff6e8c", life: 0.4 });
    t.bounce = 1; ui.sfx("atk"); return true;
  }
  if (d.typ === "shell") {
    const mates = B.towers.filter(q => !q.fainted && (q === t || (Math.abs(q.x - t.x) < 90 && Math.abs(q.y - t.y) < 10) || (stg >= 4 && Math.abs(q.x - t.x) < 10)));
    for (const q of mates) { const cap = petStats(q).maxHp * d.shield * (stg >= 3 ? 1.5 : 1); if ((q.shield || 0) < cap) { q.shield = cap; q.shieldMax = cap; ev({ t: "shieldOn", x: q.x, y: q.y, color: col }); } }
    const tgt = targetFor(t, st.range);
    if (tgt) for (let k = -1; k <= 1; k++) shoot({ kind: "pip", x: ox + k * 8, y: oy, tgt, tx: tgt.x, ty: tgt.y, spd: 480, dmg: st.dmg * 0.5, el: d.el, color: col, wob: k });
    t.bounce = 1; ui.sfx("atk"); return true;
  }
  const tgt = targetFor(t, st.range);
  if (!tgt) return false;
  t.bounce = 1; t.aimX = tgt.x; t.aimY = tgt.y; ui.sfx("atk");
  switch (d.typ) {
    case "fireseed": {
      const n = stg >= 3 ? 2 : 1, used = new Set();
      for (let k = 0; k < n; k++) { const e = k ? (nearestOther(tgt.x, tgt.y, 160, used) || tgt) : tgt; used.add(e);
        shoot({ kind: "seed", x: ox + k * 10, y: oy, tgt: e, tx: e.x, ty: e.y, spd: 520, dmg: st.dmg, el: d.el, color: col, burn: st.burn, burnT: stg >= 3 ? 3 : 2 }); }
      return true;
    }
    case "spikeroll":
      shoot({ kind: "roll", x: t.x, y: oy, vx: (tgt.x - t.x) / Math.max(60, oy - tgt.y) * 300, vy: -300, life: st.range / 300 + 0.3,
        dmg: st.dmg, el: d.el, color: col, knock: d.knock * (stg >= 3 ? 1.25 : 1), maxHit: 3, big: stg >= 4 });
      return true;
    case "bubble":
      shoot({ kind: "bubble", x: ox, y: oy, tgt, tx: tgt.x, ty: tgt.y, spd: 360, dmg: st.dmg, el: d.el, color: col, splash: st.splash * (stg >= 3 ? 1.3 : 1), slow: st.slow, slowT: st.slowT, trap: stg >= 4 ? 0.45 : 0 });
      return true;
    case "chain": {
      let from = { x: ox, y: oy }, cur = tgt, dmg = st.dmg; const used = new Set();
      const hops = (d.chain || 3) + (stg >= 3 ? 1 : 0) + (stg >= 4 ? 1 : 0);
      for (let k = 0; k < hops && cur; k++) {
        used.add(cur);
        ev({ t: "bolt", x1: from.x, y1: from.y, x2: cur.x, y2: cur.y, life: 0.22, color: col, z1: k ? 0.5 : 0.9 });
        hitEnemy(cur, dmg, d.el); dmg *= st.fall; from = { x: cur.x, y: cur.y };
        cur = nearestOther(cur.x, cur.y, 130, used);
      }
      return true;
    }
    case "squirt": {
      const n = stg >= 3 ? 2 : 1;
      for (let k = 0; k < n; k++) shoot({ kind: "drop", x: ox + (k ? 9 : -3), y: oy, tgt, tx: tgt.x, ty: tgt.y, spd: 640, dmg: st.dmg, el: d.el, color: col, owner: t.uid });
      return true;
    }
    case "slam": {
      const r = st.splash * (stg >= 3 ? 1.3 : 1);
      ev({ t: "slam", x: tgt.x, y: tgt.y, r, color: col, ox: t.x, oy: t.y });
      for (const e of enemiesIn(tgt.x, tgt.y, r)) hitEnemy(e, st.dmg, d.el, stg >= 3 ? { stun: 0.35 } : {});
      return true;
    }
    case "peachlob":
      shoot({ kind: "peach", x: ox, y: oy, tgt, tx: tgt.x, ty: tgt.y, spd: 430, dmg: st.dmg, el: d.el, color: col, bounces: stg >= 3 ? 2 : 1, sx: ox, sy: oy });
      return true;
    case "snipe": {
      const n = stg >= 3 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const ang = Math.atan2(tgt.y - oy, tgt.x - ox) + (n > 1 ? (k - 0.5) * 0.08 : 0);
        shoot({ kind: "feather", x: ox, y: oy, vx: Math.cos(ang) * 950, vy: Math.sin(ang) * 950, life: st.range / 950, dmg: st.dmg, el: d.el, color: col, crit: st.crit, critM: st.critM });
      }
      return true;
    }
    case "meteor": {
      const n = stg >= 4 ? 2 : 1, used = new Set();
      for (let k = 0; k < n; k++) { const e = k ? (nearestOther(tgt.x, tgt.y, 220, used) || tgt) : tgt; used.add(e);
        const tx = e.x + (k && e === tgt ? 40 : 0), ty = e.y + e.spd * 0.5;
        shoot({ kind: "meteor", x: tx + 70, y: ty - 300, tx, ty, spd: 620, dmg: st.dmg, el: d.el, color: col, splash: st.splash, burn: st.burn, sx: tx + 70, sy: ty - 300 }); }
      return true;
    }
    case "roar": {
      ev({ t: "claw", x: tgt.x, y: tgt.y, color: col, ox: t.x, oy: t.y });
      hitEnemy(tgt, st.dmg, d.el, { stun: st.stun });
      if (stg >= 3) { ev({ t: "ring", x: tgt.x, y: tgt.y, r0: 10, r1: 80, color: col, life: 0.35 });
        for (const e of enemiesIn(tgt.x, tgt.y, 80)) if (e !== tgt) hitEnemy(e, st.dmg * 0.4, d.el, { stun: st.stun * 0.6 }); }
      return true;
    }
  }
  return false;
}
function shotLand(s) {
  const prev = curSrc; curSrc = s.src || null;
  try { shotLand0(s); } finally { curSrc = prev; }
}
function shotLand0(s) {
  if (s.kind === "bubble") {
    ev({ t: "pop", x: s.tx, y: s.ty, r: s.splash, color: s.color, kind: "bubble" });
    for (const e of enemiesIn(s.tx, s.ty, s.splash)) hitEnemy(e, s.dmg, s.el, { slow: s.slow, slowT: s.slowT, stun: s.trap });
  } else if (s.kind === "meteor") {
    ev({ t: "boom", x: s.tx, y: s.ty, r: s.splash, color: s.color });
    for (const e of enemiesIn(s.tx, s.ty, s.splash)) hitEnemy(e, s.dmg, s.el, { burn: s.burn });
    B.zones.push({ x: s.tx, y: s.ty, r: s.splash * 0.75, life: 2.5, max: 2.5, burn: s.burn, el: s.el, color: s.color, id: rnd() });
    bumpShake(0.8);
  } else if (s.tgt && s.tgt.hp > 0) {
    const e = s.tgt;
    if (s.kind === "seed") { hitEnemy(e, s.dmg, s.el, { burn: s.burn, burnT: s.burnT }); ev({ t: "impact", x: e.x, y: e.y, color: s.color, kind: "fire" }); }
    else if (s.kind === "drop") {
      if (e.cocoBy === s.owner) e.cocoStk = Math.min(6, (e.cocoStk || 0) + 1); else { e.cocoBy = s.owner; e.cocoStk = 0; }
      hitEnemy(e, s.dmg * (1 + 0.12 * e.cocoStk), s.el); ev({ t: "impact", x: e.x, y: e.y, color: s.color, kind: "splash", small: true });
    } else if (s.kind === "peach") {
      hitEnemy(e, s.dmg, s.el); s.hit.add(e); ev({ t: "impact", x: e.x, y: e.y, color: s.color, kind: "peach" });
      if (s.bounces > 0) { const n = nearestOther(e.x, e.y, 140, s.hit);
        if (n) shoot({ kind: "peach", x: e.x, y: e.y, tgt: n, tx: n.x, ty: n.y, spd: 430, dmg: s.dmg * 0.8, el: s.el, color: s.color, bounces: s.bounces - 1, sx: e.x, sy: e.y, hit: s.hit }); }
    } else { hitEnemy(e, s.dmg, s.el); ev({ t: "impact", x: e.x, y: e.y, color: s.color, kind: "pip", small: true }); }
  }
}

/* ================= main step ================= */
export function step(dt) {
  if (!B.running || B.over) return;
  if (B.hitStop > 0) { B.hitStop -= dt; return; }
  B.t += dt;
  for (const t of B.towers) {
    if (t.sleepT > 0) t.sleepT = Math.max(0, t.sleepT - dt);
    if (t.stunT > 0) t.stunT = Math.max(0, t.stunT - dt);
    for (const k of ["flyT", "fireT", "swapT"]) if (t[k] > 0) t[k] = Math.max(0, t[k] - dt);
    t.pop = Math.max(0, (t.pop || 0) - dt * 1.6);
  }
  if (B.ultCd > 0) B.ultCd -= dt;
  for (const d of B.drops) d.life -= dt;
  B.drops = B.drops.filter(d => d.life > 0);
  if (B.iceFloorT > 0) B.iceFloorT = Math.max(0, B.iceFloorT - dt);
  if (B.darkSkyT > 0) B.darkSkyT = Math.max(0, B.darkSkyT - dt);
  if (!B.waveActive) {
    if (B.wave > 0 || B.countdown < 12) B.countdown -= dt;
    if (B.countdown <= 0 && !B.modalQ.length && !B.modalOpen) startNextWave();
  } else {
    if (B.spawnQ.length) { B.spawnT -= dt; if (B.spawnT <= 0) { spawnEnemy(B.spawnQ.shift()); B.spawnT = B.spawnGap; } }
    else if (!B.enemies.some(e => e.hp > 0)) waveCleared();
  }
  for (const t of B.towers) { t._aura = B.towers.some(s => s !== t && !s.fainted && PET[s.id].r5 === "support" && D.slotsAdjacent(s.slot, t.slot)) ? 1 : 0; if (t.jamT > 0) t.jamT -= dt; }
  for (const t of B.towers) { t._haste = 0; t._dmgB = 0; }
  for (const s of B.towers) {
    if (s.fainted) continue;
    const d = PET[s.id]; if (!d.haste && !d.buff) continue;
    const st = petStats(s);
    for (const t of B.towers) {
      if (t === s || dist(s.x, s.y, t.x, t.y) > (d.aura || st.range)) continue;
      if (d.haste) t._haste = Math.max(t._haste, st.haste);
      if (d.buff) t._dmgB = Math.max(t._dmgB, st.buff);
    }
  }
  stepEnemies(dt);
  if (B.over) return;
  for (const t of B.towers) {
    t.bounce = Math.max(0, t.bounce - dt * 5);
    t.hurtT = Math.max(0, (t.hurtT || 0) - dt);
    if (t.fainted) continue;
    const st = petStats(t);
    if (st.regen) t.hp = Math.min(st.maxHp, t.hp + st.maxHp * st.regen * dt);
    if (t.sleepT > 0 || t.stunT > 0) continue;
    t.cd -= dt;
    if (t.cd <= 0) t.cd = fireTower(t, st) ? st.rate : 0.12;
  }
  stepShots(dt);
  stepHero(dt);
  for (const f of B.floaters) { f.life -= dt * (f.big || f.huge ? 1 : 1.7); if (!f.still) f.y -= 38 * dt; }
  B.floaters = B.floaters.filter(f => f.life > 0);
  if (B.floaters.length > 90) B.floaters.splice(0, B.floaters.length - 90);
}
function stepEnemies(dt) {
  const h = B.hero;
  for (const e of B.enemies) {
    if (e.hp <= 0) continue;
    e.hitT = Math.max(0, e.hitT - dt); e.squash = Math.max(0, e.squash - dt * 4.4);
    if (e._spitAt && B.t >= e._spitAt.at) { const t = e._spitAt.t; e._spitAt = null; if (B.towers.includes(t)) { t.jamT = 2.5; burst(t.x, t.y, "#8adf4a", 8); } }
    if (e.burnT > 0) { e.burnT -= dt; e.hp -= e.burnD * dt; if (e.hp <= 0) { killEnemy(e, "fire"); continue; } }
    if (e.soakedT > 0) e.soakedT -= dt;
    if (e.slow2T > 0) e.slow2T -= dt;
    if (e.paralyzeT > 0) {                 // gen-2: paralysed slimes shock each other
      e.paralyzeT -= dt; e.paraTick -= dt;
      if (e.paraTick <= 0) { e.paraTick = 0.55;
        for (const o of B.enemies) if (o !== e && o.hp > 0 && o.paralyzeT > 0 && dist(o.x, o.y, e.x, e.y) <= 1.9 * TILE) {
          ev({ t: "bolt", x1: e.x, y1: e.y, x2: o.x, y2: o.y, life: 0.2, color: "#ffe944", z1: 0.4, z2: 0.4 });
          hitEnemy(o, 18, null, { src: "hero", fk: "lightning" }); break; }
      }
    }
    if (e.hp <= 0) continue;
    enemySkills(e, dt);
    if (e.frozenT > 0) { e.frozenT -= dt; if (e.frozenT > 0) continue; }
    if (e.bubbleT > 0) { e.bubbleT -= dt; if (e.bubbleT <= 0) ev({ t: "pop", x: e.x, y: e.y, r: 40, color: "#bfe6ff", kind: "bubble" }); continue; }
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowV = 1; }
    if (e.stunT > 0) { e.stunT -= dt; continue; }
    if (e.petrified) continue;
    if (!e.fly) {
      const st = B.enemies.find(o => o !== e && o.petrified && o.hp > 0 && o.lane === e.lane && o.y > e.y && o.y - e.y <= 0.78 * TILE);
      if (st) { e._statCd = (e._statCd || 0) - dt; if (e._statCd <= 0) { e._statCd = 0.55; st.statueHp--; burst(st.x, st.y, "#c8b29c", 4);
          if (st.statueHp <= 0) { st.petrified = false; st.rockShell = 0; floater(st.x, st.y - 40, T("碎裂!", "CRACK!"), "#c08a3a", { big: true }); } } continue; }
    }
    const bl = e.fly ? null : blockerFor(e);
    const stopY = bl ? bl.y - (e.boss ? 66 : 52) : 1e9;
    if (bl && e.y >= stopY) {
      e.y = stopY; e.biting = true;
      e.atkCd -= dt;
      if (e.atkCd <= 0) { e.atkCd = 1; hitPet(bl, e.atk, e); ui.sfx("bite"); burst(bl.x, bl.y, "#ffffff", 3); }
    } else {
      e.biting = false;
      const m2 = (e.slow2T > 0 ? 0.52 : 1) * (e.paralyzeT > 0 ? 0.72 : 1) * (B.iceFloorT > 0 ? 0.75 : 1);
      e.y += e.spd * e.slowV * m2 * dt;
    }
    e.x = laneXAt(e.lane) + Math.sin(B.t * 2 + e.ph) * (e.boss ? 3 : 7);
    if (h && h.deadT <= 0 && !e.fly && ENEMY[e.typ].atk > 0 && dist(e.x, e.y, h.x, h.y) < (e.size * 0.42 + 22)) {   // slimes that touch the hero bite it
      e.heroBiteCd -= dt; if (e.heroBiteCd <= 0) { e.heroBiteCd = 1; damageHero(Math.round(e.atk)); }
    }
    if (e.y >= LEAK_Y) leak(e);
    if (B.over) return;
  }
  B.enemies = B.enemies.filter(e => e.hp > 0);
}
function stepShots(dt) {
  for (const s of B.shots) {
    s.age += dt;
    if (s.kind === "roll" || s.kind === "feather") {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      const prev = curSrc; curSrc = s.src || null;
      for (const e of B.enemies) {
        if (e.hp <= 0 || s.hit.has(e) || (s.kind === "roll" && e.fly)) continue;
        if (dist(s.x, s.y, e.x, e.y) < (s.kind === "roll" ? 30 : 26)) {
          s.hit.add(e);
          if (s.kind === "roll") { const nh = s.hit.size; hitEnemy(e, s.dmg * Math.pow(0.7, nh - 1), s.el); if (e.hp > 0 && nh === 1 && !e.boss && !e.elite && e.typ !== "shield") e.y = Math.max(FIELD_TOP - 20, e.y - s.knock); burst(e.x, e.y, s.color, 5); if (s.maxHit && nh >= s.maxHit) { s.life = 0; break; } }
          else { const c = rnd() < s.crit; hitEnemy(e, c ? s.dmg * s.critM : s.dmg, s.el, { crit: c }); ev({ t: "impact", x: e.x, y: e.y, color: s.color, kind: "feather", small: true }); }
        }
      }
      curSrc = prev;
      if (s.life <= 0 || s.y < FIELD_TOP - 40) s.dead = true;
      continue;
    }
    if (s.tgt && s.tgt.hp > 0) { s.tx = s.tgt.x; s.ty = s.tgt.y; }
    const dx = s.tx - s.x, dy = s.ty - s.y, L = Math.hypot(dx, dy), mv = s.spd * dt;
    if (L <= mv + 4) { s.dead = true; shotLand(s); }
    else { s.x += dx / L * mv; s.y += dy / L * mv; }
  }
  for (const z of B.zones) { z.life -= dt;
    for (const e of enemiesIn(z.x, z.y, z.r)) { e.burnT = Math.max(e.burnT, 0.4); e.burnD = Math.max(e.burnD, z.burn); } }
  B.zones = B.zones.filter(z => z.life > 0);
  B.shots = B.shots.filter(s => !s.dead);
}

/* ================= gen-2 protagonist ================= */
export const input = { x: 0, y: 0 };
export function makeHero(key) {
  const def = D.HERO_DEFS[key] || D.HERO_DEFS.chili;
  const sk = D.HERO_SKILLS[key] || D.HERO_SKILLS.chili;
  return {
    key, def, x: 270, y: 480, hp: def.maxHp, maxHp: def.maxHp, invulnT: 0, deadT: 0, vx: 0, vy: 0, facing: -Math.PI / 2,
    atkCd: 0.25, recoil: 0, dash: null, ridingSwordT: 0, lungeZ: 0,
    level: 1, xp: 0, xpNext: 4, multiShot: 1, atkSpdMul: 1, dmgMul: 1, blastScale: 1, pierce: 0, chainCount: 0,
    splitShots: 0, stormWake: 0, lingeringBurn: 0, rangedSwords: 0, critChance: 0.20, moveMul: 1, rangeMul: 1, goldMul: 1, xpMul: 1,
    skills: [{ ...sk[0], lv: 1, cdLeft: 0 }, { ...sk[1], lv: 0, cdLeft: 0 }, { ...sk[2], lv: 0, cdLeft: 0 }], picked: [], walk: 0
  };
}
function heroXp(amt) {
  const h = B.hero; if (!h || B.over) return;
  h.xp += amt * (h.xpMul || 1);
  while (h.xp >= h.xpNext) {
    h.xp -= h.xpNext; h.level++;
    h.xpNext = Math.round(h.xpNext * 1.24 + 2);
    h.dmgMul += 0.10; h.maxHp += 8; h.hp = Math.min(h.maxHp, h.hp + 20);        // gen-2 v20 growth
    ev({ t: "heroLv", x: h.x, y: h.y });
    queueModal({ kind: "hero" });
  }
  ui.refresh();
}
export function heroChoices() {
  const h = B.hero, cands = [];
  h.skills.forEach((sk, i) => { if (sk.lv < 5) cands.push({ id: sk.id + "_lv" + (sk.lv + 1), skill: i, ico: sk.ico, lv: sk.lv + 1, unlock: sk.lv === 0 }); });
  const choices = [];
  if (cands.length) choices.push(pick(cands));
  for (const p of [...D.PERK_POOL].sort(() => rnd() - 0.5)) { if (choices.length >= 3) break; choices.push({ id: p.id, perk: p }); }
  return choices;
}
export function applyHeroChoice(c) {
  const h = B.hero;
  if (c.skill != null) { h.skills[c.skill].lv = c.lv; h.skills[c.skill].cdLeft = 0; }
  else {
    const id = c.id;
    if (id === "perk_companion") spawnComp(h.key, 0);
    else if (id === "perk_split") h.splitShots += 2;
    else if (id === "perk_storm") h.stormWake += 1;
    else if (id === "perk_ember") h.lingeringBurn += 1;
    else if (id === "perk_chain") h.chainCount += 2;
    else if (id === "perk_multi") { h.multiShot += 1; if (h.key === "chestnut") h.rangedSwords += 2; }
    else if (id === "perk_pierce") { h.pierce += 1; h.rangeMul += 0.15; }
    else if (id === "perk_crit") h.critChance = Math.min(0.75, h.critChance + 0.14);
    else if (id === "perk_haste") { h.moveMul += 0.16; h.atkSpdMul += 0.22; }
    else if (id === "perk_power") { h.dmgMul += 0.25; h.blastScale += 0.08; }
    else if (id === "perk_vital") { h.maxHp += 35; h.hp = h.maxHp; h.fastRevive = true; }
    else if (id === "perk_econ") { h.goldMul += 0.35; h.xpMul += 0.30; h.hp = Math.min(h.maxHp, h.hp + 35); }
  }
  h.picked.push(c.id); ev({ t: "heroPick", x: h.x, y: h.y }); ui.sfx("click"); ui.refresh();
}
export function damageHero(dmg) {
  const h = B.hero; if (!h || h.deadT > 0 || h.invulnT > 0 || B.over) return false;
  h.hp = Math.max(0, h.hp - dmg); h.invulnT = 0.35; h.recoil = 0.9; h.hurtT = 0.2;
  bumpShake(1.4);
  floater(h.x, h.y - 70, "-" + dmg, "#ff4a5a", { big: true });
  if (h.hp <= 0) {
    h.deadT = h.fastRevive ? 3.5 : 5.0; h.dash = null; h.ridingSwordT = 0;
    ev({ t: "heroDown", x: h.x, y: h.y });
    ui.toast(T("主角倒下了！" + h.deadT + " 秒后复活", "Hero down! Back in " + h.deadT + "s"));
  }
  ui.refresh(); return true;
}
function heroTarget(x, y, range, prio) {          // gen-2: furthest along the road (closest to the fence), statues last
  let best = null, bs = -1e9;
  for (const e of B.enemies) {
    if (e.hp <= 0 || B.t - e.born < 0.35) continue;
    const d = dist(e.x, e.y, x, y); if (d > range) continue;
    let sc = prio === "nearest" ? -d : e.y;
    if (e.petrified) sc -= 100000;
    if (sc > bs) { bs = sc; best = e; }
  }
  return best;
}
function hdmg(e, dmg, o) {
  o = Object.assign({ src: "hero" }, o || {});
  const kbRes = (e.typ === "pebble" || e.typ === "shield") ? 0.45 : e.boss ? 0.35 : 1;
  if (!o.isBurn) o.kb = ((o.knock || 0) + (o.crit ? 0.18 : 0.12)) * kbRes * TILE;
  hitEnemy(e, dmg, null, o);
}
function applyRockShell(e, stacks) {
  if (!e || e.hp <= 0) return;
  e.rockShell = Math.min(3, (e.rockShell || 0) + stacks);
  if (e.rockShell >= 3 && !e.petrified) { e.petrified = true; e.statueHp = 4; floater(e.x, e.y - 50, T("🗿 石化!", "🗿 PETRIFIED!"), "#8a6a4a", { big: true }); ev({ t: "ring", x: e.x, y: e.y, r0: 10, r1: 80, color: "#7a583c", life: 0.34 }); }
}
function spawnComp(key, ttl) {
  const h = B.hero; if (!h) return;
  const n = B.comps.length;
  B.comps.push({ key, x: clamp(h.x + Math.cos(n * 1.9) * 60, 24, 516), y: clamp(h.y + Math.sin(n * 1.9) * 50, FIELD_TOP + 20, FENCE_Y - 10), atkCd: 0.25, ttl: ttl || 0, temp: ttl > 0, id: rnd(), walk: 0, facing: -1.57 });
  burst(h.x, h.y, "#ffffff", 10);
  ev({ t: "compIn", key });
}
const hz = (o) => { o.t = 0; o.tick = 0; o.id = rnd(); B.hzones.push(o); return o; };
function burnE(e, d) { e.hburnT = Math.max(e.hburnT || 0, d); }

function stepHero(dt) {
  const h = B.hero; if (!h) return;
  h.hurtT = Math.max(0, (h.hurtT || 0) - dt);
  if (h.deadT > 0) {
    h.deadT -= dt;
    if (h.deadT <= 0) { h.x = 270; h.y = 480; h.hp = h.maxHp; h.invulnT = 1.6; ev({ t: "heroUp", x: h.x, y: h.y }); floater(h.x, h.y - 70, T("✨ 复活出战!", "✨ Back in action!"), "#3fbf4a", { big: true }); ui.refresh(); }
  } else {
    if (h.invulnT > 0) h.invulnT -= dt;
    const spd = h.def.moveSpd * TILE * h.moveMul;
    if (h.dash) {
      const ds = h.dash; ds.t += dt;
      if (ds.phase === "in") { const p = clamp(ds.t / 0.12, 0, 1); h.x = lerp(ds.ox, ds.tx, p); h.y = lerp(ds.oy, ds.ty, p);
        if (p >= 1) { ds.phase = "out"; ds.t = 0; ev({ t: "slash", x: ds.tx, y: ds.ty, ang: Math.atan2(ds.ty - ds.oy, ds.tx - ds.ox), r: 1.05 * TILE });
          if (ds.target && ds.target.hp > 0) hdmg(ds.target, ds.dmg, { knock: 0.22, crit: ds.crit, fk: "slash" });
          for (const e of enemiesIn(ds.tx, ds.ty, 1.15 * TILE)) if (e !== ds.target) hdmg(e, Math.round(ds.dmg * 0.65), { knock: 0.16, fk: "slash" }); } }
      else { const p = clamp(ds.t / 0.14, 0, 1); h.x = lerp(ds.tx, ds.ox, p); h.y = lerp(ds.ty, ds.oy, p); if (p >= 1) h.dash = null; }
    } else {
      let ix = input.x, iy = input.y; const L = Math.hypot(ix, iy); if (L > 1) { ix /= L; iy /= L; }
      h.vx = ix * spd; h.vy = iy * spd;
      h.x = clamp(h.x + h.vx * dt, 24, 516); h.y = clamp(h.y + h.vy * dt, FIELD_TOP + 20, FENCE_Y - 10);
      if (L > 0.05) { h.facing = Math.atan2(iy, ix); h.walk += dt * 10; }
    }
    if (h.ridingSwordT > 0) {
      h.ridingSwordT -= dt;
      for (const e of B.enemies) if (e.hp > 0 && dist(e.x, e.y, h.x, h.y) <= 0.85 * TILE && (e._ramCd || 0) <= 0) {
        e._ramCd = 0.32; hdmg(e, Math.round(h.def.dmg * h.dmgMul * 0.9), { knock: 0.22, crit: true, fk: "slash" }); ev({ t: "slash", x: e.x, y: e.y, ang: h.facing, r: 0.9 * TILE });
      }
    }
    for (const e of B.enemies) if (e._ramCd > 0) e._ramCd -= dt;
    for (const sk of h.skills) if (sk.lv > 0 && sk.cdLeft > 0) sk.cdLeft = Math.max(0, sk.cdLeft - dt);
    h.recoil = Math.max(0, h.recoil - dt * 6);
    h.lungeZ *= Math.exp(-3 * dt);
    h.atkCd -= dt;
    if (h.atkCd <= 0 && !h.dash) {
      const effR = h.def.range * h.rangeMul * (h.rangedSwords > 0 ? 1.35 : 1) * TILE;
      const tgt = heroTarget(h.x, h.y, effR);
      if (tgt) { h.atkCd = h.def.atkRate / h.atkSpdMul; h.recoil = 1; heroShot(h, tgt, { dmg: h.def.dmg, dmgMul: h.dmgMul, multi: h.multiShot, crit: h.critChance, fxKind: h.def.fxKind, hero: true }); }
    }
  }
  stepComps(dt);
  stepHeroShots(dt);
  stepHeroZones(dt);
  for (const p of B.puddles) { p.life -= dt; p.tick -= dt; if (p.tick <= 0) { p.tick = 0.45;
    for (const e of B.enemies) if (e.hp > 0 && !e.fly && dist(e.x, e.y, p.x, p.y) <= p.r) { e.soakedT = Math.max(e.soakedT, 1.4); e.slow2T = Math.max(e.slow2T, 1.4); hdmg(e, p.dmg, { isBurn: true, fk: "water" }); } } }
  B.puddles = B.puddles.filter(p => p.life > 0);
  for (const r of B.rubbles) { r.life -= dt; r.tick -= dt; if (r.tick <= 0) { r.tick = 0.48;
    for (const e of B.enemies) if (e.hp > 0 && !e.fly && dist(e.x, e.y, r.x, r.y) <= r.r) hdmg(e, r.dmg, { isBurn: true, fk: "rock" }); } }
  B.rubbles = B.rubbles.filter(r => r.life > 0);
  for (const e of B.enemies) if (e.hp > 0 && e.hburnT > 0) { e.hburnT -= dt; e.hburnTick = (e.hburnTick || 0) - dt; if (e.hburnTick <= 0) { e.hburnTick = 0.4; hdmg(e, 10, { isBurn: true, fk: "fire" }); } }   // gen-2 burn: 10 / 0.4s
}
function heroShot(a, tgt, o) {
  const h = B.hero;
  const isCrit = rnd() < (o.crit || 0.2);
  const dmgVal = Math.round(o.dmg * (o.dmgMul || 1) * (B.iceFloorT > 0 && o.fxKind === "frost" ? 1.25 : 1) * (isCrit ? 1.55 : 1));
  const fk = o.fxKind;
  const dT = Math.max(0.1, dist(a.x, a.y, tgt.x, tgt.y) / TILE);
  const n = o.multi || 1;
  a.facing = Math.atan2(tgt.y - a.y, tgt.x - a.x);
  ev({ t: "cast", x: a.x, y: a.y, fk, hero: !!o.hero, ang: a.facing });
  ui.sfx("hatk");
  const extra = o.hero ? { pierce: h.pierce, chain: h.chainCount, split: h.splitShots, wake: h.stormWake, burnDur: (h.def.burnDur || 0) + (h.lingeringBurn ? 2.4 : 0) } : { pierce: 0, chain: 0, split: 0, wake: 0, burnDur: h.def.burnDur || 0 };
  const targets = [tgt];
  for (let i = 1; i < n; i++) targets.push(B.enemies.find(e => e.hp > 0 && !targets.includes(e)) || tgt);
  if (fk === "slash" && o.hero && !(h.rangedSwords > 0)) {
    h.dash = { phase: "in", t: 0, ox: h.x, oy: h.y, tx: tgt.x - Math.cos(a.facing) * 30, ty: tgt.y - Math.sin(a.facing) * 30, target: tgt, dmg: dmgVal, crit: isCrit };
    for (let i = 1; i < n; i++) hshot({ kind: "sword", sx: a.x, sy: a.y, tgt: targets[i], dur: 0.24, dmg: dmgVal, crit: isCrit, fk, ...extra });
    return;
  }
  targets.forEach((tg) => {
    const base = { sx: a.x, sy: a.y, tgt: tg, dmg: dmgVal, crit: isCrit, fk, comp: !o.hero, ...extra };
    if (fk === "fire") hshot({ kind: "fireTornado", dur: clamp(dT * 0.13, 0.2, 0.36), ...base });
    else if (fk === "frost") hshot({ kind: "snowflake", dur: clamp(dT * 0.11, 0.16, 0.30), ...base });
    else if (fk === "water") hshot({ kind: "whirlWave", dur: clamp(dT * 0.12, 0.18, 0.34), ...base });
    else if (fk === "rock") hshot({ kind: "skyRock", dur: 0.42, ...base });
    else if (fk === "lightning") hshot({ kind: "cloudBolt", dur: 0.52, charge: 0.30, ...base });
    else hshot({ kind: "sword", dur: 0.24, ...base });
  });
}
function hshot(o) { o.t = 0; o.id = rnd(); o.hit = new Set(); o.x = o.sx; o.y = o.sy; B.hshots.push(o); }
function stepHeroShots(dt) {
  for (const s of B.hshots) {
    if (s.tgt && s.tgt.hp > 0) { s.tx = s.tgt.x; s.ty = s.tgt.y; }
    if (s.tx == null) { s.tx = s.sx; s.ty = s.sy - 100; }
    s.t += dt;
    const p = clamp((s.t - (s.charge || 0)) / (s.dur - (s.charge || 0)), 0, 1);
    s.p = p; s.x = lerp(s.sx, s.tx, p); s.y = lerp(s.sy, s.ty, p);
    if (s.pierce > 0 && p > 0) for (const e of B.enemies) {
      if (e.hp > 0 && e !== s.tgt && !s.hit.has(e) && dist(e.x, e.y, s.x, s.y) <= 0.55 * TILE) { s.hit.add(e); hdmg(e, Math.round(s.dmg * 0.78), { fk: s.fk, src: s.comp ? "comp" : "hero" }); if (s.burnDur > 0) burnE(e, s.burnDur); if (--s.pierce <= 0) break; }
    }
    if (p >= 1) { s.dead = true; heroLand(s); }
  }
  B.hshots = B.hshots.filter(s => !s.dead);
}
function heroLand(s) {
  let tg = s.tgt && s.tgt.hp > 0 ? s.tgt : null;
  if (!tg) { let bd = 0.88 * TILE; for (const e of B.enemies) { if (e.hp > 0) { const d = dist(e.x, e.y, s.x, s.y); if (d <= bd) { bd = d; tg = e; } } } }
  const src = s.comp ? "comp" : "hero";
  const x = tg ? tg.x : s.x, y = tg ? tg.y : s.y;
  const def = B.hero.def;
  ev({ t: "hhit", x, y, fk: s.fk, crit: s.crit, kind: s.kind, scale: (B.hero.blastScale || 1) * (s.big || 1), comp: s.comp });
  if (s.kind === "mini") { if (tg) hdmg(tg, s.dmg, { fk: s.fk, src }); return; }
  if (tg) {
    if (s.kind === "skyRock") { hdmg(tg, s.dmg, { knock: def.knock || 0.28, crit: s.crit, fk: "rock", src }); applyRockShell(tg, 1); }
    else if (s.kind === "whirlWave") { hdmg(tg, s.dmg, { knock: def.knock || 0.25, crit: s.crit, fk: "water", src }); tg.soakedT = 2; }
    else if (s.kind === "snowflake") { hdmg(tg, s.dmg, { crit: s.crit, fk: "frost", src }); tg.frozenT = Math.max(tg.frozenT, 0.48); tg.slow2T = Math.max(tg.slow2T, def.slowDur || 2.4); }
    else hdmg(tg, s.dmg, { crit: s.crit, fk: s.fk, src });
    if (s.burnDur > 0) burnE(tg, s.burnDur);
  }
  const spl = (s.kind === "cloudBolt" ? 1.0 : (s.kind === "fireTornado" ? (s.big ? 1.05 : 0) : (def.splash || 0))) * TILE * (B.hero.blastScale || 1);
  if (spl > 0) for (const e of enemiesIn(x, y, spl)) if (e !== tg) {
    hdmg(e, Math.round(s.dmg * (s.kind === "whirlWave" ? 0.65 : 0.55)), { fk: s.fk, src });
    if (s.kind === "snowflake") e.slow2T = Math.max(e.slow2T, 1.5);
    if (s.kind === "skyRock") applyRockShell(e, 1);
  }
  if (s.kind === "whirlWave") B.puddles.push({ x, y, r: 0.92 * TILE, life: 3.4, max: 3.4, dmg: Math.round(s.dmg * 0.28), tick: 0, id: rnd() });
  if (s.kind === "skyRock") B.rubbles.push({ x, y, r: 0.78 * TILE, life: 4.5, max: 4.5, dmg: Math.round(s.dmg * 0.26), tick: 0, id: rnd() });
  if (s.wake > 0) hz({ kind: "miniWake", fk: s.fk, x, y, r: 0.85 * TILE, dur: 1.1, dmg: Math.round(s.dmg * 0.35) });
  if (s.chain > 0 && tg) { const used = new Set([tg]); let from = tg;
    for (let i = 0; i < s.chain; i++) { const n = nearestOther(from.x, from.y, (def.chainRange || 2.2) * TILE, used); if (!n) break; used.add(n);
      ev({ t: "bolt", x1: from.x, y1: from.y, x2: n.x, y2: n.y, life: 0.2, color: def.burstCol, z1: 0.4, z2: 0.4 }); hdmg(n, Math.round(s.dmg * 0.55), { fk: s.fk, src }); from = n; } }
  if (s.split > 0) for (let i = 0; i < s.split; i++) { const n = B.enemies.filter(e => e.hp > 0 && e !== tg)[i]; if (n) hshot({ kind: "mini", sx: x, sy: y, tgt: n, dur: 0.22, dmg: Math.round(s.dmg * 0.4), fk: s.fk, comp: s.comp }); }
}
function stepComps(dt) {
  const h = B.hero;
  for (const c of B.comps) {
    if (c.temp) { c.ttl -= dt; if (c.ttl <= 0) { c.dead = true; burst(c.x, c.y, "#ffffff", 8); continue; } }
    const mam = c.key === "mammoth";
    const def = mam ? { moveSpd: 3.4, range: 1.9, atkRate: 0.75, dmg: 38, fxKind: "frost" } : (D.HERO_DEFS[c.key] || D.HERO_DEFS.chili);
    const tgt = heroTarget(c.x, c.y, (mam ? 4 : def.range) * TILE, "nearest");
    let gx, gy;
    if (mam && tgt) { gx = tgt.x; gy = tgt.y + 30; } else { gx = h.x + Math.cos(c.id * 20 + B.t * 0.6) * 70; gy = h.y + 40 + Math.sin(c.id * 20) * 20; }
    const dx = gx - c.x, dy = gy - c.y, L = Math.hypot(dx, dy), sp = def.moveSpd * TILE * 0.9;
    if (L > 8) { c.x += dx / L * Math.min(L, sp * dt); c.y += dy / L * Math.min(L, sp * dt); c.walk += dt * 10; c.facing = Math.atan2(dy, dx); }
    c.y = clamp(c.y, FIELD_TOP + 10, FENCE_Y - 10);
    c.atkCd -= dt;
    if (c.atkCd <= 0 && tgt && (!mam || dist(c.x, c.y, tgt.x, tgt.y) <= def.range * TILE)) {
      c.atkCd = Math.max(0.28, def.atkRate);
      if (mam) { hdmg(tgt, 38, { knock: 0.35, fk: "frost", src: "comp" }); ev({ t: "stomp", x: tgt.x, y: tgt.y }); }
      else heroShot(c, tgt, { dmg: Math.round(def.dmg * 0.52), dmgMul: h.dmgMul * 0.75, multi: 1, crit: 0.2, fxKind: def.fxKind });
    }
  }
  B.comps = B.comps.filter(c => !c.dead);
}

/* ---------- hero skills (gen-2 triggerActiveSkill, same numbers; tiles -> 82px) ---------- */
export function castSkill(i) {
  const h = B.hero;
  if (!h || !B.running || B.over || B.paused || h.deadT > 0 || B.modalOpen) return false;
  const sk = h.skills[i];
  if (!sk || sk.lv <= 0 || sk.cdLeft > 0.02) return false;
  sk.cdLeft = D.getSkillCooldown(sk);
  const lv = sk.lv, k = sk.id;
  const dmgBase = Math.round(h.def.dmg * h.dmgMul * (1 + 0.34 * (lv - 1)));
  const ft = heroTarget(h.x, h.y, 9.5 * TILE) || { x: clamp(h.x, 40, 500), y: h.y - 2.2 * TILE };
  const ang = Math.atan2(ft.y - h.y, ft.x - h.x);
  h.recoil = 1.25; B.hitStop = 0.055; bumpShake(1.5);
  ev({ t: "skill", id: k, x: h.x, y: h.y, lv, name: sk.lbl[B.lang === "en" ? 1 : 0], ico: sk.ico, fk: h.def.fxKind, ang });
  ui.sfx("skill");
  const live = () => B.enemies.filter(e => e.hp > 0);
  if (k === "chili_fan") hz({ kind: "fireFan", x: h.x, y: h.y, dir: ang, r: (2.3 + lv * 0.25) * TILE, dur: 2.0 + lv * 0.3, dmg: Math.round(dmgBase * 0.85), lv });
  else if (k === "chili_wall") {
    hz({ kind: "fireWall", x: h.x + Math.cos(ang) * 0.6 * TILE, y: h.y + Math.sin(ang) * 0.5 * TILE, ang, len: (3.4 + lv * 0.35) * TILE, dur: 3.2 + lv * 0.45, dmg: Math.round(dmgBase * 0.95), lv });
    if (lv >= 3) for (let di = 0; di < (lv >= 4 ? 2 : 1); di++) hz({ kind: "fireDragon", x: h.x + (di ? 0.8 : -0.8) * TILE, y: h.y - 0.4 * TILE, dur: 4.5, dmg: Math.round(dmgBase * 0.75), seed: 500 + di * 37, lv });
  } else if (k === "chili_storm") {
    const es = live();
    for (let ti = 0; ti < 2 + lv; ti++) { const tg = es[ti % Math.max(1, es.length)];
      hshot({ kind: "fireTornado", sx: h.x, sy: h.y, tgt: tg || null, tx: tg ? tg.x : h.x + (ti - 1) * 110, ty: tg ? tg.y : h.y - 120, dur: 0.42 + ti * 0.06, crit: true, fk: "fire", dmg: Math.round(dmgBase * 1.1), burnDur: 3.5, pierce: 1, chain: 0, split: 0, wake: 0, big: 1.3 + lv * 0.12 }); }
  } else if (k === "lemon_zeus") {
    for (let zi = 0; zi < (lv >= 5 ? 2 : 1); zi++) hz({ kind: "zeus", x: h.x, y: h.y, side: zi === 0 ? -0.5 : 0.65, dur: 3.5 + lv * 0.45, dmg: Math.round(dmgBase * 0.62), bolts: 2 + Math.floor(lv / 2), canSplit: lv >= 4, seed: 810 + zi * 29, lv });
  } else if (k === "lemon_storm") {
    B.darkSkyT = Math.max(B.darkSkyT, 3.6 + lv * 0.4);
    for (const e of live()) e.paralyzeT = Math.max(e.paralyzeT, 3.4 + lv * 0.3);
    const n = lv >= 5 ? 3 : lv >= 3 ? 2 : 1;
    for (let ci = 0; ci < n; ci++) hz({ kind: "angryCloud", x: n === 1 ? 270 : 120 + ci * (300 / (n - 1)), y: 260 + (ci % 2) * 110, dur: 3.4 + lv * 0.35, strikes: 5 + lv, dmg: Math.round(dmgBase * 1.15), mini: lv >= 5, lv });
  } else if (k === "lemon_arc") {
    const es = live();
    for (let ci = 0; ci < 2 + lv; ci++) { const tg = es[ci % Math.max(1, es.length)];
      hshot({ kind: "cloudBolt", sx: h.x + (ci - (1 + lv) / 2) * 22, sy: h.y, tgt: tg || null, tx: tg ? tg.x : ft.x + (ci - 1) * 60, ty: tg ? tg.y : ft.y, dur: 0.46, charge: 0.24, crit: false, fk: "lightning", dmg: Math.round(dmgBase * 1.15), pierce: 0, chain: 0, split: 0, wake: 0, big: 1.25 }); }
  } else if (k === "blue_breath") {
    hz({ kind: "frostBreath", x: h.x, y: h.y, ang, r: (2.5 + lv * 0.22) * TILE, dur: 1.1, dmg: Math.round(dmgBase * 0.9), freeze: 1.2 + lv * 0.35, lv });
    if (lv >= 3) hz({ kind: "slidingIce", x: h.x + Math.cos(ang) * 0.4 * TILE, y: h.y + Math.sin(ang) * 0.4 * TILE, vx: Math.cos(ang) * 4.4 * TILE, vy: Math.sin(ang) * 4.4 * TILE, r: (0.65 + lv * 0.08) * TILE, dur: 1.6 + lv * 0.2, dmg: Math.round(dmgBase * 0.7), hitSet: new Set(), lv });
  } else if (k === "blue_blizz") {
    h.lungeZ = 0.85; B.iceFloorT = Math.max(B.iceFloorT, 12 + lv * 3);
    hz({ kind: "blizzard", x: 270, y: 420, dur: 3.6 + lv * 0.35, dmg: Math.round(dmgBase * 0.72), done: false, lv });
  } else if (k === "blue_mammoth") {
    for (let mi = 0; mi < 1 + Math.floor(lv / 2); mi++) spawnComp("mammoth", 12 + lv * 2);
  } else if (k === "coco_torn") {
    hz({ kind: "waterTornado", x: h.x + Math.cos(ang) * 0.5 * TILE, y: h.y + Math.sin(ang) * 0.4 * TILE, vx: Math.cos(ang) * 3.8 * TILE, vy: Math.sin(ang) * 3.0 * TILE, dur: 2.2 + lv * 0.25, dmg: Math.round(dmgBase * 0.85), dragon: lv >= 3, lv });
  } else if (k === "coco_tsunami") {
    hz({ kind: "tsunami", x: h.x, y: h.y, charge: 1.8, waveDur: 1.35, whirlDur: 3.5 + lv * 0.4, dmg: Math.round(dmgBase * 1.15), ship: lv >= 4, lv });
  } else if (k === "coco_bubble") {
    let trapped = 0;
    for (const e of live()) if (trapped < 3 + lv && dist(e.x, e.y, h.x, h.y) <= 4.2 * TILE) { trapped++; e.bubbleT = 1.6 + lv * 0.2; hdmg(e, Math.round(dmgBase * 0.9), { fk: "water" }); ev({ t: "bubbleTrap", e }); }
    ev({ t: "ring", x: h.x, y: h.y, r0: 20, r1: 2.2 * TILE, color: "#3caeff", life: 0.42 });
  } else if (k === "taro_spire") {
    const es = live();
    for (let i = 0; i < 1 + lv; i++) { const tg = es[i % Math.max(1, es.length)];
      const sx = tg ? tg.x : ft.x + (i - 1) * 74, sy = tg ? tg.y : ft.y;
      ev({ t: "spire", x: sx, y: sy, delay: i * 0.06 });
      B.rubbles.push({ x: sx, y: sy, r: 0.78 * TILE, life: 4.5, max: 4.5, dmg: Math.round(dmgBase * 0.35), tick: 0, id: rnd() });
      if (tg && tg.hp > 0) hdmg(tg, Math.round(dmgBase * 1.15), { knock: 0.32, fk: "rock" }); }
  } else if (k === "taro_volcano") {
    hz({ kind: "volcano", x: clamp(ft.x, 80, 460), y: clamp(ft.y, FIELD_TOP + 90, FENCE_Y - 120), erupt: 1.1, dur: 4.8 + lv * 0.5, erupted: false, dmg: Math.round(dmgBase * 1.2), mole: lv >= 3, lv });
  } else if (k === "taro_quake") {
    const nr = (2.6 + lv * 0.25) * TILE;
    ev({ t: "quake", x: h.x, y: h.y, r: nr });
    for (const e of live()) if (dist(e.x, e.y, h.x, h.y) <= nr) { applyRockShell(e, 2); hdmg(e, Math.round(dmgBase), { knock: 0.25, fk: "rock" }); }
  } else if (k === "sword_spin") {
    const blades = lv >= 4 ? 3 + (lv - 3) * 2 : 1;
    for (let bi = 0; bi < blades; bi++) hz({ kind: "sawSword", x: h.x, y: h.y, ang: bi / blades * TAU, orbitR: (bi === 0 ? 1.45 : 2.35) * TILE, edge: bi > 0, dur: 6.0, dmg: Math.round(dmgBase * 0.72), lv });
  } else if (k === "sword_ride") {
    const d = 14 + lv * 4; h.ridingSwordT = d;
    hz({ kind: "swordOrbit", dur: d, count: 3 + lv, dmg: Math.round(dmgBase * 0.78), formation: lv >= 5, formTick: 0, lv });
  } else if (k === "sword_rain") {
    const n = 5 + lv * 2;
    for (let si = 0; si < n; si++) { const a = si / n * TAU, rr = (0.75 + (si % 2) * 0.85) * TILE;
      hz({ kind: "plantedSword", x: clamp(ft.x + Math.cos(a) * rr, 20, 520), y: clamp(ft.y + Math.sin(a) * rr * 0.72, FIELD_TOP, FENCE_Y), drop: 0.18 + si * 0.04, stick: 0.55, exploded: false, dmg: Math.round(dmgBase * 0.92) }); }
  }
  ui.refresh();
  return true;
}
function stepHeroZones(dt) {
  const h = B.hero;
  for (const z of B.hzones) {
    z.t += dt; z.tick -= dt;
    const k = z.kind;
    if (k === "fireFan" || k === "fireWall" || k === "miniWake") {
      if (z.tick <= 0) { z.tick = 0.34; const r = z.r || z.len;
        for (const e of B.enemies) if (e.hp > 0 && dist(e.x, e.y, z.x, z.y) <= r) {
          if (k === "fireFan") { let da = Math.atan2(e.y - z.y, e.x - z.x) - z.dir; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) > 0.75) continue; }
          if (k === "fireWall") { const ux = Math.cos(z.ang), uy = Math.sin(z.ang), rx = e.x - z.x, ry = e.y - z.y, along = rx * ux + ry * uy, perp = Math.abs(-rx * uy + ry * ux); if (along < -20 || along > z.len || perp > 0.8 * TILE) continue; }
          hdmg(e, z.dmg, { isBurn: k === "fireWall", fk: z.fk || "fire" }); if (k !== "miniWake") burnE(e, 2.5); } }
      if (z.t >= z.dur) z.dead = true;
    } else if (k === "fireDragon") {
      z.x = clamp(z.x + Math.cos(z.t * 2.2 + z.seed) * 1.4 * TILE * dt, 40, 500); z.y = clamp(z.y + Math.sin(z.t * 1.7 + z.seed) * 1.0 * TILE * dt, FIELD_TOP + 40, FENCE_Y - 40);
      if (z.tick <= 0) { z.tick = 0.65; const tg = heroTarget(z.x, z.y, 5.5 * TILE);
        if (tg) hshot({ kind: "fireTornado", sx: z.x, sy: z.y, tgt: tg, dur: 0.28, fk: "fire", dmg: z.dmg, burnDur: 2.5, pierce: 0, chain: 0, split: 0, wake: 0, crit: false }); }
      if (z.t >= z.dur) z.dead = true;
    } else if (k === "zeus") {
      z.x = h.x + z.side * TILE + Math.cos(z.t * 1.6 + z.seed) * 0.35 * TILE; z.y = h.y - 0.45 * TILE + Math.sin(z.t * 2.1 + z.seed) * 0.25 * TILE;
      if (z.tick <= 0) { z.tick = 0.55;
        B.enemies.filter(e => e.hp > 0).slice(0, z.bolts).forEach(tg => {
          ev({ t: "holyBolt", x: tg.x, y: tg.y, fx: z.x, fy: z.y }); hdmg(tg, z.dmg, { fk: "lightning" });
          if (z.canSplit && rnd() < 0.35 && B.comps.length < 6) spawnComp("lemon", 14);
        }); }
      if (z.t >= z.dur) z.dead = true;
    } else if (k === "angryCloud") {
      if (z.tick <= 0 && z.strikes > 0) { z.tick = 0.48; z.strikes--;
        const es = B.enemies.filter(e => e.hp > 0); const tg = es.length ? pick(es) : null;
        if (tg) { z.x = lerp(z.x, tg.x, 0.6); z.y = lerp(z.y, tg.y, 0.6); ev({ t: "skyBolt", x: tg.x, y: tg.y, fx: z.x, fy: z.y, big: true }); hdmg(tg, z.dmg, { crit: true, fk: "lightning" }); bumpShake(1.2); }
        if (z.mini) for (let i = 0; i < 3; i++) ev({ t: "skyBolt", x: 40 + rnd() * 460, y: FIELD_TOP + rnd() * 560, mini: true }); }
      if (z.t >= z.dur) z.dead = true;
    } else if (k === "frostBreath") {
      if (z.tick <= 0) { z.tick = 0.35;
        for (const e of B.enemies) if (e.hp > 0 && dist(e.x, e.y, z.x, z.y) <= z.r) { let da = Math.atan2(e.y - z.y, e.x - z.x) - z.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) > 0.8) continue;
          e.frozenT = Math.max(e.frozenT, z.freeze); e.slow2T = Math.max(e.slow2T, 3.0); hdmg(e, z.dmg, { fk: "frost" }); } }
      if (z.t >= z.dur) z.dead = true;
    } else if (k === "slidingIce") {
      z.x += z.vx * dt; z.y += z.vy * dt;
      for (const e of B.enemies) if (e.hp > 0 && !z.hitSet.has(e) && dist(e.x, e.y, z.x, z.y) <= z.r) { z.hitSet.add(e); e.frozenT = Math.max(e.frozenT, 1.5); hdmg(e, z.dmg, { knock: 0.25, fk: "frost" }); }
      if (z.t >= z.dur || z.y < FIELD_TOP - 60 || z.x < -60 || z.x > 600) z.dead = true;
    } else if (k === "blizzard") {
      if (!z.done && z.t >= 0.8) { z.done = true; for (const e of B.enemies) if (e.hp > 0) { e.frozenT = Math.max(e.frozenT, 1.8); hdmg(e, z.dmg, { crit: true, fk: "frost" }); } bumpShake(1.6); ev({ t: "gust" }); }
      if (z.tick <= 0) { z.tick = 0.32; const es = B.enemies.filter(e => e.hp > 0); if (es.length) { const tg = pick(es); ev({ t: "icicle", x: tg.x, y: tg.y }); hdmg(tg, Math.round(z.dmg * 0.6), { fk: "frost" }); } }
      if (z.t >= z.dur) z.dead = true;
    } else if (k === "waterTornado") {
      z.x += z.vx * dt; z.y += z.vy * dt;
      if (z.tick <= 0) { z.tick = 0.26; B.puddles.push({ x: z.x, y: z.y, r: 0.72 * TILE, life: 2.2, max: 2.2, dmg: Math.round(z.dmg * 0.22), tick: 0, id: rnd() });
        for (const e of B.enemies) if (e.hp > 0 && dist(e.x, e.y, z.x, z.y) <= 1.2 * TILE) { e.soakedT = 2.6; e.slow2T = 2.2; hdmg(e, z.dmg, { knock: 0.18, fk: "water" }); } }
      if (z.t >= z.dur) z.dead = true;
    } else if (k === "tsunami") {
      if (z.t < z.charge) {
        if (z.tick <= 0) { z.tick = 0.35; const tg = heroTarget(z.x, z.y, 6 * TILE);
          if (tg) { tg.soakedT = 2; B.puddles.push({ x: tg.x, y: tg.y, r: 0.75 * TILE, life: 2.4, max: 2.4, dmg: Math.round(z.dmg * 0.25), tick: 0, id: rnd() }); ev({ t: "splashShot", x1: z.x, y1: z.y, x2: tg.x, y2: tg.y }); hdmg(tg, Math.round(z.dmg * 0.55), { fk: "water" }); } }
      } else if (z.t < z.charge + z.waveDur) {
        const wp = (z.t - z.charge) / z.waveDur; z.waveY = lerp(FENCE_Y - 10, FIELD_TOP - 20, wp);
        if (!z.waved) { z.waved = true; bumpShake(1.6); }
        if (z.tick <= 0) { z.tick = 0.18; for (const e of B.enemies) if (e.hp > 0 && Math.abs(e.y - z.waveY) <= 1.2 * TILE) { e.soakedT = 3.2; e.slow2T = 2.8; hdmg(e, Math.round(z.dmg * 0.8), { knock: 0.45, fk: "water" }); } }
      } else {
        if (z.tick <= 0) { z.tick = 0.35; for (const e of B.enemies) if (e.hp > 0 && dist(e.x, e.y, 270, 380) <= 2.4 * TILE) { if (!e.boss) e.y = Math.max(FIELD_TOP - 10, e.y - 0.16 * TILE); hdmg(e, Math.round(z.dmg * 0.48), { fk: "water" }); } }
      }
      if (z.t >= z.charge + z.waveDur + z.whirlDur) z.dead = true;
    } else if (k === "volcano") {
      if (!z.erupted && z.t >= z.erupt) { z.erupted = true; bumpShake(1.6); B.hitStop = 0.06; ev({ t: "erupt", x: z.x, y: z.y });
        for (const e of B.enemies) if (e.hp > 0 && dist(e.x, e.y, z.x, z.y) <= 2.6 * TILE) { applyRockShell(e, 2); burnE(e, 2.2); hdmg(e, z.dmg, { knock: 0.38, crit: true, fk: "rock" }); }
        B.rubbles.push({ x: z.x, y: z.y, r: 1.05 * TILE, life: 4.5, max: 4.5, dmg: Math.round(z.dmg * 0.3), tick: 0, id: rnd(), big: true }); }
      if (z.t >= z.dur) z.dead = true;
    } else if (k === "sawSword") {
      z.ang += dt * 7.5;
      const rr = z.edge ? lerp(4.8 * TILE, z.orbitR, Math.sin(clamp(z.t, 0, 1) * Math.PI * 0.5)) : z.orbitR;
      z.x = h.x + Math.cos(z.ang) * rr; z.y = h.y + Math.sin(z.ang) * rr * 0.72;
      if (z.tick <= 0) { z.tick = 0.24; for (const e of B.enemies) if (e.hp > 0 && dist(e.x, e.y, z.x, z.y) <= 0.95 * TILE) hdmg(e, z.dmg, { knock: 0.12, fk: "slash" }); }
      if (z.t >= z.dur) z.dead = true;
    } else if (k === "swordOrbit") {
      z.formTick += dt;
      if (z.tick <= 0) { z.tick = 0.34; const es = B.enemies.filter(e => e.hp > 0);
        for (let si = 0; si < Math.min(z.count, es.length); si++) { const tg = es[si]; ev({ t: "swordDart", x1: h.x, y1: h.y, x2: tg.x, y2: tg.y }); hdmg(tg, z.dmg, { fk: "slash" }); } }
      if (z.formation && z.formTick >= 1.1) { z.formTick = 0;
        for (let fi = 0; fi < 6; fi++) { const a = fi / 6 * TAU + z.t; hz({ kind: "plantedSword", x: clamp(h.x + Math.cos(a) * 1.8 * TILE, 20, 520), y: clamp(h.y + Math.sin(a) * 1.25 * TILE, FIELD_TOP, FENCE_Y), drop: 0.14, stick: 0.36, exploded: false, dmg: z.dmg }); } }
      if (z.t >= z.dur || h.deadT > 0) { z.dead = true; h.ridingSwordT = 0; }
    } else if (k === "plantedSword") {
      if (z.t >= z.drop + z.stick && !z.exploded) { z.exploded = true; ev({ t: "crossSlash", x: z.x, y: z.y });
        for (const e of B.enemies) if (e.hp > 0 && dist(e.x, e.y, z.x, z.y) <= 1.25 * TILE) hdmg(e, z.dmg, { knock: 0.18, crit: true, fk: "slash" }); }
      if (z.t >= z.drop + z.stick + 0.12) z.dead = true;
    }
  }
  B.hzones = B.hzones.filter(z => !z.dead);
}
