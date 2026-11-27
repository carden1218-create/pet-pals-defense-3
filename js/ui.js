/* UI: bilingual screens, HUD, lineup tray, hero skills, ult timing bar, modal queue, items, joystick */
import * as D from "./data.js";
import * as S from "./sim.js";
import * as R from "./render.js";
const { B } = S;
const $ = (id) => document.getElementById(id);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
export const T = (zh, en) => (B.lang === "en" ? en : zh);
const L2 = (arr) => (Array.isArray(arr) ? arr[B.lang === "en" ? 1 : 0] : arr);
const nm = (o) => (B.lang === "en" ? o.en : o.zh);

/* ---------- save (gen-3 only key) ---------- */
export const save = { lang: "zh", hero: "chili", map: "orchard", best: {}, squad: null };
function loadSave() { try { const s = JSON.parse(localStorage.getItem(D.SAVE_KEY) || "null"); if (s) Object.assign(save, s); } catch (e) {} B.lang = save.lang === "en" ? "en" : "zh"; }
function writeSave() { try { localStorage.setItem(D.SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

/* ---------- tiny synth sfx (no audio files) ---------- */
let ac = null, muted = false; const lastS = {};
function sfx(n) {
  if (muted) return; const now = performance.now(); if (lastS[n] && now - lastS[n] < (n === "atk" || n === "hatk" ? 90 : 45)) return; lastS[n] = now;
  try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") return;
    const P = { pop: [520, 880, 0.08, "triangle", 0.05], atk: [700, 500, 0.04, "square", 0.012], hatk: [380, 760, 0.06, "sawtooth", 0.02], skill: [220, 880, 0.25, "sawtooth", 0.05], ult: [110, 990, 0.5, "sawtooth", 0.07], lvup: [523, 1046, 0.22, "triangle", 0.06], coin: [988, 1318, 0.09, "square", 0.025], click: [660, 660, 0.04, "triangle", 0.04], wave: [330, 660, 0.3, "triangle", 0.05], leak: [300, 90, 0.35, "sawtooth", 0.07], bite: [200, 140, 0.06, "square", 0.02] }[n];
    if (!P) return; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = P[3]; o.frequency.setValueAtTime(P[0], t); o.frequency.exponentialRampToValueAtTime(P[1], t + P[2]); g.gain.setValueAtTime(P[4], t); g.gain.exponentialRampToValueAtTime(0.0001, t + P[2] + 0.05);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + P[2] + 0.06); } catch (e) {}
}
function unlockAudio() { try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch (e) {} }

/* ---------- text ---------- */
const TX = {
  title: ["萌宠防线 3", "Pet Pals Defense 3"], sub: ["2.5D 纸板蜡笔立体沙盘 · 萌宠守线 + 主角出击", "2.5D crayon diorama · pets hold the line, your hero joins the fight"],
  start: ["开始冒险", "Start Adventure"], lang: ["语言 Language", "Language 语言"], tip: ["史莱姆从上面来，把萌宠摆在下面挡住它们；你的主角可以自由跑动帮忙！", "Slimes come from the top. Pets hold the bottom — your hero runs free to help!"],
  pickHero: ["选择主角", "Choose your hero"], pickMap: ["选择地图", "Choose a map"], go: ["出发！", "Let's go!"], back: ["返回", "Back"],
  best: ["最佳 {0} 波", "Best: wave {0}"], waves: ["{0} 波", "{0} waves"], endlessD: ["一直打下去，看你能撑多少波", "Keep going — how far can you get?"],
  fight: ["开战！", "Fight!"], lineup: ["上阵 {0}/10", "Lineup {0}/10"], trayHint: ["点卡片，再点场上空位上阵；点场上的萌宠撤下。", "Tap a card, then an empty spot. Tap a pet on the field to bench it."],
  wave: ["第 {0} 波", "Wave {0}"], next: ["下一波", "Next"], coins: ["新金币", "Coins"], lives: ["生命", "Lives"], charge: ["⚡ 道具充能 {0}/10", "⚡ Item charge {0}/10"],
  pause: ["暂停", "Pause"], resume: ["继续", "Resume"], quit: ["结束", "Quit"], hero: ["主角", "Hero"], skills: ["主角技能", "Hero skills"],
  locked: ["升级解锁", "Unlock on level-up"], ult: ["大招", "Ultimate"], items: ["道具", "Items"], revive: ["复活", "Revive"],
  keys: ["WASD / 方向键 移动 · Q E R 放技能", "WASD / arrows to move · Q E R for skills"],
  perkTitle: ["选一个词条（本局有效）", "Pick a perk (this run)"], heroUp: ["主角升到 Lv.{0}！选一个", "Hero reached Lv.{0}! Pick one"],
  unlockSk: ["解锁技能", "Unlock skill"], skLv: ["技能 Lv.{0}", "Skill Lv.{0}"],
  win: ["胜利！", "Victory!"], lose: ["防线被突破了…", "The line broke…"], again: ["再来一局", "Play again"], home: ["回到首页", "Home"],
  stats: ["波数 {0} · 击败 {1} · 主角 Lv.{2}", "Wave {0} · {1} defeated · Hero Lv.{2}"],
  upgrade: ["升级 🪙{0}", "Level up 🪙{0}"], upNeed: ["再打败 {0} 只怪", "{0} more kills"], maxTier: ["已满级", "Max level"], close: ["关闭", "Close"],
  bench: ["撤下", "Bench"], kills: ["击败 {0}", "Kills {0}"],
  ultTitle: ["大招预览", "Ultimate Preview"], ultD: ["连续点中绿色越多，威力越大！", "The more greens you hit in a row, the bigger the boom!"], ultCost: ["确认 🪙{0}", "Confirm 🪙{0}"], cancel: ["取消", "Cancel"],
  ultTap: ["点绿色区域！", "Tap in the green!"], ultPick: ["点一只宠物放大招", "Tap a pet to cast its ultimate"], ultCd: ["大招冷却中 {0}秒", "Ultimate cooling down {0}s"],
  ult_heal: ["全队回血 + 加速", "Heal + haste the team"], ult_freeze: ["冻住附近所有怪", "Freeze every slime nearby"], ult_gold: ["炸出一堆新金币", "Blast out a pile of New Coins"], ult_shield: ["全队加护盾", "Shield the whole team"], ult_blast: ["大范围爆炸 + 燃烧", "Huge explosion + burn"], ult_burst: ["超强单体重击 + 溅射", "Mega single hit + splash"],
  itemPick: ["点一只宠物使用 {0}", "Tap a pet to use {0}"], noGold: ["新金币不够！", "Not enough coins!"],
  it_fly_d: ["飞上天空攻击，怪打不到", "Flies up and attacks from the sky — slimes can't reach it"], it_fire_d: ["攻击附带燃烧", "Attacks set slimes on fire"], it_swap_d: ["临时变成克制怪物的属性", "Turns into the element that beats the slimes"],
  perk_atk: ["全队攻击 +6%", "Team ATK +6%"], perk_spd: ["全队攻速 +5%", "Team attack speed +5%"], perk_hp: ["全队血量 +8%", "Team HP +8%"], perk_crit: ["暴击率 +3%", "Crit chance +3%"], perk_coin: ["击杀新金币 +10%", "Kill coins +10%"], perk_range: ["射程 +5%", "Range +5%"], perk_rev: ["复活便宜 10%", "Revives 10% cheaper"],
  countdown: ["{0} 秒后下一波", "Next wave in {0}s"], proto: ["三代原型 v3.0.0", "Gen-3 prototype v3.0.0"], mute: ["音效", "Sound"]
};
export function tx(k, ...a) { let s = L2(TX[k] || [k, k]); a.forEach((v, i) => { s = s.replace("{" + i + "}", v); }); return s; }
const ELN = { 火: ["火", "Fire"], 水: ["水", "Water"], 草: ["草", "Grass"], 雷: ["雷", "Thunder"], 土: ["土", "Earth"], 光: ["光", "Light"] };
const FKN = { fire: ["火焰", "Fire"], lightning: ["雷电", "Lightning"], frost: ["冰霜", "Frost"], water: ["水流", "Water"], rock: ["岩石", "Rock"], slash: ["剑气", "Blade"] };
const PERK_ICO = { atk: "⚔️", spd: "💨", hp: "💖", crit: "💥", coin: "🪙", range: "🎯", rev: "✨" };

/* ---------- portraits (rendered once) ---------- */
const PIC = {};
export function pic(kind, id) { const k = kind + ":" + id; if (!PIC[k]) PIC[k] = R.portrait(kind, id, 256); return PIC[k]; }
const img = (kind, id, cls) => `<img class="${cls || "pic"}" alt="" draggable="false" src="${pic(kind, id)}">`;

/* ---------- toast ---------- */
let toastT = 0;
export function toast(s, dur) { const t = $("toast"); t.textContent = s; t.classList.add("on"); toastT = dur || 2.2; }
export function tickToast(dt) { if (toastT > 0) { toastT -= dt; if (toastT <= 0) $("toast").classList.remove("on"); } }

/* ---------- screens ---------- */
export const U = { screen: "title", sel: null, itemSel: -1, drag: null, modal: null, ult: null };
function show(id) { for (const s of ["title", "prep", "result"]) $(s).classList.toggle("hidden", s !== id); $("app").dataset.screen = id || "battle"; U.screen = id || "battle"; }
function buildTitle() {
  $("title").innerHTML = `<div class="tcard"><h1>${tx("title")}</h1><div class="tsub">${tx("sub")}</div>
    <button id="bStart" class="btn big pink">${tx("start")}</button>
    <button id="bLang" class="btn white">${tx("lang")}</button>
    <div class="tip">${tx("tip")}</div><div class="ver">${tx("proto")}</div></div>`;
  $("bStart").onclick = () => { unlockAudio(); sfx("click"); buildPrep(); show("prep"); };
  $("bLang").onclick = () => { B.lang = B.lang === "en" ? "zh" : "en"; save.lang = B.lang; writeSave(); buildTitle(); sfx("click"); };
}
function buildPrep() {
  const hk = D.HERO_KEYS;
  let hh = `<div class="pcard"><h2>${tx("pickHero")}</h2><div class="heroes">`;
  for (const k of hk) { const d = D.HERO_DEFS[k], sk = D.HERO_SKILLS[k];
    hh += `<button class="hcard ${save.hero === k ? "on" : ""}" data-k="${k}">${img("hero", k)}<b>${L2(d.name)}</b><small>${L2(FKN[d.fxKind])} · ❤${d.maxHp} · ⚔${d.dmg}</small><span class="skic">${sk.map(s => `<i title="${L2(s.lbl)}">${s.ico}</i>`).join("")}</span></button>`; }
  hh += `</div><div class="hdesc" id="hdesc"></div><h2>${tx("pickMap")}</h2><div class="maps">`;
  for (const m of [...D.MAPS, D.ENDLESS]) { const b = save.best[m.id] | 0;
    hh += `<button class="mcard ${save.map === m.id ? "on" : ""} th-${m.theme || "endless"}" data-m="${m.id}"><b>${nm(m)}</b><small>${m.endless ? tx("endlessD") : tx("waves", m.waves)}</small>${b ? `<em>${tx("best", b)}</em>` : ""}</button>`; }
  hh += `</div><div class="row"><button class="btn white" id="bBack">${tx("back")}</button><button class="btn big green" id="bGo">${tx("go")}</button></div></div>`;
  $("prep").innerHTML = hh;
  const desc = () => { const sk = D.HERO_SKILLS[save.hero]; $("hdesc").innerHTML = sk.map((s, i) => `<div><b>${s.ico} ${L2(s.lbl)}</b>${i ? ` <small>(${tx("locked")})</small>` : ""} — ${L2(s.desc)}</div>`).join(""); };
  desc();
  $("prep").querySelectorAll(".hcard").forEach(b => b.onclick = () => { save.hero = b.dataset.k; $("prep").querySelectorAll(".hcard").forEach(q => q.classList.toggle("on", q === b)); desc(); sfx("click"); });
  $("prep").querySelectorAll(".mcard").forEach(b => b.onclick = () => { save.map = b.dataset.m; $("prep").querySelectorAll(".mcard").forEach(q => q.classList.toggle("on", q === b)); sfx("click"); });
  $("bBack").onclick = () => { show("title"); sfx("click"); };
  $("bGo").onclick = () => { writeSave(); sfx("click"); startBattle(); };
}
const DEFAULT_SQUAD = ["chestnut", "chili", "melon", "lemon", "lychee", "berry", "coco", "taro", "peach", "blueberry"];
export function startBattle() {
  const squad = (save.squad && save.squad.length ? save.squad : DEFAULT_SQUAD.map((id, s) => ({ id, s }))).filter(q => D.PET[q.id]);
  R.clearBattle(); S.startRun(save.map, squad, save.hero);
  R.showTitle(false);
  show(null); U.sel = null; U.itemSel = -1; R.R.ultPick = false; closeModal();
  buildSide(); refresh(true);
  toast(tx("trayHint"), 3.5);
}

/* ---------- battle side panel ---------- */
function buildSide() {
  const hd = B.hero.def;
  $("hud").innerHTML = `<div class="status"><div class="pill" id="sWave"></div><div class="pill" id="sCoin"></div><div class="pill" id="sLife"></div>
    <div class="chg"><span id="sChgT"></span><i><b id="sChg"></b></i></div></div>
    <div class="ctl"><button class="btn sm white" id="bSpd">1x</button><button class="btn sm white" id="bPause">${tx("pause")}</button><button class="btn sm white" id="bMute">🔊</button><button class="btn sm white" id="bLang2">中/EN</button><button class="btn sm red" id="bQuit">${tx("quit")}</button></div>`;
  $("side").innerHTML = `
  <div class="panel tray" id="tray"><div class="trayh"><b id="lineupN"></b><small>${tx("trayHint")}</small></div><div class="cards" id="cards"></div>
    <button class="btn big green" id="bFight">${tx("fight")}</button></div>
  <div class="panel herop" id="herop"><div class="hrow">${img("hero", B.hero.key, "hpic")}<div class="hinfo"><b>${L2(hd.name)} <em id="hLv"></em></b>
    <div class="hbar"><i id="hHp"></i><span id="hHpT"></span></div><div class="xbar"><i id="hXp"></i></div><div class="hperks" id="hPerks"></div></div></div>
    <div class="skills" id="skills"></div><div class="keys">${tx("keys")}</div></div>
  <div class="panel act" id="act"><button class="ultb" id="bUlt"><span>⚡</span><small>${tx("ult")}</small><i id="ultCd"></i></button>
    <div class="items" id="items"></div><div class="revs" id="revs"></div></div>
  <div class="panel nextp" id="nextp"></div>`;
  const cards = $("cards");
  for (const p of D.PETS) { const c = h("button", "pcard2", `${img("pet", p.id)}<b>${nm(p)}</b><small><i class="el el-${p.el}">${L2(ELN[p.el])}</i> ${L2([p.sk[0], p.sk[1]])}</small>`); c.dataset.id = p.id; c.onclick = () => { U.sel = U.sel === p.id ? null : p.id; sfx("click"); refresh(true); }; cards.appendChild(c); }
  const sk = $("skills");
  B.hero.skills.forEach((s, i) => { const b = h("button", "skb", `<span class="ic">${s.ico}</span><b>${L2(s.lbl)}</b><small class="lv"></small><i class="cd"></i><kbd>${"QER"[i]}</kbd>`); b.onclick = () => { if (S.castSkill(i)) sfx("skill"); else if (s.lv <= 0) toast(tx("locked")); }; sk.appendChild(b); });
  const it = $("items");
  for (let i = 0; i < 3; i++) { const b = h("button", "itb", ""); b.dataset.i = i; b.addEventListener("pointerdown", (e) => itemDown(e, i)); it.appendChild(b); }
  $("bFight").onclick = () => { if (!B.towers.length) return; S.startNextWave(); toast(T("开战！卡片栏已收起，阵容锁定", "Fight! Tray hidden — lineup locked")); U.sel = null; sfx("wave"); refresh(true); };
  $("bUlt").onclick = () => { if (!B.locked || B.over) return; if (B.ultCd > 0) { toast(tx("ultCd", Math.ceil(B.ultCd))); return; } R.R.ultPick = !R.R.ultPick; if (R.R.ultPick) toast(tx("ultPick"), 2); sfx("click"); refresh(); };
  $("bSpd").onclick = () => { B.speed = B.speed >= 3 ? 1 : B.speed + 1; sfx("click"); refresh(); };
  $("bPause").onclick = () => { B.paused = !B.paused; sfx("click"); refresh(); };
  $("bMute").onclick = () => { muted = !muted; refresh(); };
  $("bLang2").onclick = () => { B.lang = B.lang === "en" ? "zh" : "en"; save.lang = B.lang; writeSave(); buildSide(); refresh(true); };
  $("bQuit").onclick = () => { S.endRun(false); };
}
const fmt = (n) => Math.floor(n).toLocaleString();
let lastSig = "";
export function refresh(force) {
  if (U.screen !== "battle" || !B.hero || !$("sWave")) return;
  const lv = B.level, hh = B.hero;
  $("sWave").textContent = nm(lv) + " · " + tx("wave", Math.max(1, B.wave)) + (lv.story ? "/" + lv.waves : "") + (!B.waveActive && B.wave > 0 && !B.over ? " · ⏱" + Math.max(0, Math.ceil(B.countdown)) : "");
  $("sCoin").textContent = "🪙 " + fmt(B.gold); $("sLife").textContent = "❤ " + B.lives;
  $("sChgT").textContent = tx("charge", Math.min(D.CHG_MAX, B.chg)); $("sChg").style.width = Math.min(100, B.chg / D.CHG_MAX * 100) + "%";
  const pre = !B.locked; $("app").dataset.pre = pre ? "1" : "0";
  $("tray").classList.toggle("hidden", !pre); $("herop").classList.toggle("dim", pre); $("act").classList.toggle("hidden", pre);
  if (pre) { $("lineupN").textContent = tx("lineup", B.towers.length);
    for (const c of $("cards").children) { const on = B.towers.some(t => t.id === c.dataset.id); c.classList.toggle("in", on); c.classList.toggle("sel", U.sel === c.dataset.id); } }
  $("hLv").textContent = "Lv." + hh.level;
  $("hHp").style.width = (hh.hp / hh.maxHp * 100) + "%"; $("hHpT").textContent = Math.ceil(hh.hp) + "/" + hh.maxHp;
  $("hXp").style.width = (hh.xp / hh.xpNext * 100) + "%";
  const pk = hh.picked.filter(id => id.startsWith("perk_")).map(id => D.PERK_POOL.find(p => p.id === id).ico).join("") + Object.keys(B.perks).map(k => (PERK_ICO[k] || "").repeat(B.perks[k])).join("");
  if ($("hPerks").textContent !== pk) $("hPerks").textContent = pk;
  hh.skills.forEach((s, i) => { const b = $("skills").children[i]; if (!b) return; b.classList.toggle("lock", s.lv <= 0); const cdM = D.getSkillCooldown(s);
    b.querySelector(".lv").textContent = s.lv > 0 ? "★".repeat(s.lv) : "🔒 " + tx("locked");
    const k = s.lv > 0 && s.cdLeft > 0 ? s.cdLeft / cdM : 0; b.querySelector(".cd").style.height = (k * 100) + "%"; b.classList.toggle("ready", s.lv > 0 && s.cdLeft <= 0 && hh.deadT <= 0); });
  $("bUlt").classList.toggle("pick", !!R.R.ultPick); $("bUlt").classList.toggle("cool", B.ultCd > 0); $("ultCd").textContent = B.ultCd > 0 ? Math.ceil(B.ultCd) : "";
  $("bSpd").textContent = B.speed + "x"; $("bPause").textContent = B.paused ? tx("resume") : tx("pause"); $("bMute").textContent = muted ? "🔇" : "🔊";
  const sig = B.items.join(",") + "|" + U.itemSel + "|" + B.towers.filter(t => t.fainted).map(t => t.uid).join(",") + "|" + B.gold + "|" + B.wave + "|" + B.lang;
  if (sig !== lastSig || force) { lastSig = sig;
    [...$("items").children].forEach((b, i) => { const k = B.items[i]; b.innerHTML = k ? D.ITEMS24[k].ic : ""; b.classList.toggle("on", U.itemSel === i); b.classList.toggle("empty", !k); b.title = k ? S.itemName(k) : ""; });
    const rv = $("revs"); rv.innerHTML = ""; const c = S.reviveCost();
    for (const t of B.towers.filter(q => q.fainted)) { const b = h("button", "revb" + (B.gold < c ? " poor" : ""), `${img("pet", t.id, "mini")}<span>${tx("revive")} 🪙${c}</span>`); b.onclick = () => { if (S.revive(t)) sfx("lvup"); }; rv.appendChild(b); }
    const np = B.nextPreview; const nx = $("nextp");
    if (np && !B.over) { const cnt = {}; for (const g of np.list) cnt[g.id] = (cnt[g.id] || 0) + 1;
      nx.innerHTML = `<b>${tx("next")} · ${tx("wave", B.wave + 1)}</b><div class="nl">${Object.entries(cnt).map(([id, n]) => `<span>${img("slime", id, "mini")}×${n}</span>`).join("")}</div>`; nx.classList.remove("hidden"); }
    else nx.classList.add("hidden");
  }
}

/* ---------- modal queue: gen-1 wave perk + gen-2 level-up share one picker ---------- */
function openModal(html, cls) { const m = $("modal"); m.className = "modal " + (cls || ""); m.innerHTML = `<div class="mbox">${html}</div>`; m.classList.remove("hidden"); B.modalOpen = true; U.modal = cls || "m"; }
export function closeModal() { const m = $("modal"); m.classList.add("hidden"); m.innerHTML = ""; m.onpointerdown = null; B.modalOpen = false; U.modal = null; }
export function pumpModals() {
  if (U.modal || !B.running || B.over || !B.modalQ.length) return;
  const q = B.modalQ.shift();
  if (q.kind === "perk") {
    const ch = S.perkChoices(); if (!ch.length) return;
    openModal(`<h3>${tx("perkTitle")}</h3><div class="choices">${ch.map(p => `<button class="choice" data-id="${p.id}"><span class="ic">${PERK_ICO[p.id]}</span><b>${tx("perk_" + p.id)}</b><small>${S.perkN(p.id)}/${p.max}</small></button>`).join("")}</div>`, "perk");
    $("modal").querySelectorAll(".choice").forEach(b => b.onclick = () => { S.choosePerk(b.dataset.id); closeModal(); refresh(true); });
  } else {
    const ch = S.heroChoices(), hh = B.hero;
    openModal(`<h3>${tx("heroUp", hh.level)}</h3><div class="choices">${ch.map((c, i) => { if (c.skill != null) { const s = hh.skills[c.skill];
      return `<button class="choice sk" data-i="${i}"><span class="ic">${s.ico}</span><b>${c.unlock ? tx("unlockSk") : tx("skLv", c.lv)}: ${L2(s.lbl)}</b><small>${L2(s.desc)}</small></button>`; }
      return `<button class="choice" data-i="${i}"><span class="ic">${c.perk.ico}</span><b>${L2(c.perk.t)}</b><small>${L2(c.perk.d)}</small></button>`; }).join("")}</div>`, "hero");
    $("modal").querySelectorAll(".choice").forEach(b => b.onclick = () => { S.applyHeroChoice(ch[+b.dataset.i]); closeModal(); buildSkillsIfNeeded(); refresh(true); });
  }
  sfx("lvup");
}
function buildSkillsIfNeeded() {}

/* ---------- gen-1 v2.4 ultimate: pick pet -> preview -> pay -> timing bar ---------- */
function openUltPreview(t) {
  const d = D.PET[t.id], cost = D.ultCost24(t), typ = D.ultTypOf(d);
  R.R.ultPick = false;
  openModal(`<h3>${tx("ultTitle")}</h3>${img("pet", t.id, "bigpic")}<b class="nm">${nm(d)} · Lv.${t.tier}</b><div class="eff">💥 ${tx("ult_" + typ)}</div><small>${tx("ultD")}</small>
    <div class="row"><button class="btn white" id="uNo">${tx("cancel")}</button><button class="btn gold" id="uOk" ${B.gold < cost ? "disabled" : ""}>${tx("ultCost", cost)}</button></div>`, "ult");
  $("uNo").onclick = () => { closeModal(); refresh(); };
  $("uOk").onclick = () => { if (B.gold < cost) { toast(tx("noGold")); return; } B.gold -= cost; startTiming(t); };
}
function startTiming(t) {
  const U24 = { pos: 0.05, dir: 1, spd: 0.85, power: 0, hits: 0, idle: 0, t, live: true };
  U.ult = U24;
  openModal(`<div class="tim"><div class="hint">${tx("ultTap")}</div><div class="tbar"><i class="g"></i><b class="mk" id="mk"></b></div><div class="acc" id="acc"></div><div class="pow" id="pow">POWER x0</div></div>`, "timing");
  $("modal").onpointerdown = (e) => { e.preventDefault(); tapTiming(); };
}
export function tickTiming(dt) {
  const u = U.ult; if (!u || !u.live) return;
  dt = Math.min(0.05, dt); u.idle += dt;
  u.pos += u.dir * u.spd * dt; if (u.pos > 1) { u.pos = 2 - u.pos; u.dir = -1; } if (u.pos < 0) { u.pos = -u.pos; u.dir = 1; }
  const mk = $("mk"); if (mk) mk.style.left = (u.pos * 100) + "%";
  if (u.idle > 4.5) fireTiming(T("失误！发射！", "Miss! FIRE!"));
}
function tapTiming() {
  const u = U.ult; if (!u || !u.live) return;
  const off = Math.abs(u.pos - 0.5); u.idle = 0;
  if (off > D.GREEN24) { fireTiming(T("失误！发射！", "Miss! FIRE!")); return; }
  const acc = Math.round(100 - off / D.GREEN24 * 30); u.hits++; u.power += acc; u.spd *= 1.22;
  const a = $("acc"), p = $("pow"); if (a) { a.textContent = acc + "%"; a.classList.remove("pop"); void a.offsetWidth; a.classList.add("pop"); } if (p) { p.textContent = "POWER x" + u.power; p.classList.remove("pop"); void p.offsetWidth; p.classList.add("pop"); }
  sfx("coin"); if (u.hits >= 12) fireTiming(T("满格！发射！", "MAX! FIRE!"));
}
function fireTiming(msg) { const u = U.ult; if (!u) return; u.live = false; U.ult = null; closeModal(); if (u.t && B.running && !B.over) { S.ultBoom(u.t, u.power, u.hits); toast(msg, 1.4); } refresh(); }

/* ---------- pet popup (upgrade / revive / bench) ---------- */
function openPet(t) {
  const d = D.PET[t.id], st = S.petStats(t), need = (D.UP_KILLS[t.tier] || 0) - (t.kills | 0), cost = D.upgradeCost(t);
  let act = "";
  if (t.fainted) act = `<button class="btn green" id="pRev">${tx("revive")} 🪙${S.reviveCost()}</button>`;
  else if (t.tier >= D.MAX_TIER) act = `<button class="btn white" disabled>${tx("maxTier")}</button>`;
  else if (need > 0) act = `<button class="btn white" disabled>${tx("upNeed", need)}</button>`;
  else act = `<button class="btn green" id="pUp" ${B.gold < cost ? "disabled" : ""}>${tx("upgrade", cost)}</button>`;
  openModal(`${img("pet", t.id, "bigpic")}<b class="nm">${nm(d)} · Lv.${t.tier}</b><small>${L2(ELN[d.el])} · ${L2([d.sk[0], d.sk[1]])}</small>
    <div class="stats">❤ ${Math.ceil(t.hp)}/${Math.round(st.maxHp)} · ⚔ ${Math.round(st.dmg)} · ${tx("kills", t.kills | 0)}</div>
    <div class="row"><button class="btn white" id="pClose">${tx("close")}</button>${act}</div>`, "pet");
  $("pClose").onclick = closeModal;
  if ($("pRev")) $("pRev").onclick = () => { if (S.revive(t)) closeModal(); };
  if ($("pUp")) $("pUp").onclick = () => { if (S.upgradeTower(t)) closeModal(); };
}

/* ---------- field taps, item drag ---------- */
function fieldXY(e) { const r = $("stage").getBoundingClientRect(); return { cx: e.clientX - r.left, cy: e.clientY - r.top }; }
function petAt(cx, cy) {
  let best = null, bd = 1e9;
  for (const t of B.towers) { const q = R.project(t.x, t.y, 0.45 + (t.flyT > 0 ? 0.65 : 0)), d = Math.hypot(q.x - cx, q.y - cy); if (d < bd) { bd = d; best = t; } }
  const lim = 46 * Math.max(0.7, R.R.h / 760);
  return bd < lim ? best : null;
}
function slotAt(cx, cy) {
  let best = -1, bd = 1e9; for (let i = 0; i < 10; i++) { const p = S.slotPos(i), q = R.project(p.x, p.y, 0.2), d = Math.hypot(q.x - cx, q.y - cy); if (d < bd) { bd = d; best = i; } }
  return bd < 52 * Math.max(0.7, R.R.h / 760) ? best : -1;
}
function onFieldTap(e) {
  if (U.screen !== "battle" || B.over || U.modal) return;
  const { cx, cy } = fieldXY(e);
  for (const d of B.drops) { const q = R.project(d.x, d.y, 0.5); if (Math.hypot(q.x - cx, q.y - cy) < 34) { S.pickDrop(d); refresh(true); return; } }
  const t = petAt(cx, cy);
  if (!B.locked) {
    const slot = slotAt(cx, cy);
    if (U.sel && slot >= 0) { S.deploy(U.sel, slot); U.sel = null; sfx("click"); persistSquad(); refresh(true); return; }
    if (t) { S.recall(t.slot); sfx("click"); persistSquad(); refresh(true); }
    return;
  }
  if (R.R.ultPick) { if (t && !t.fainted) openUltPreview(t); else { R.R.ultPick = false; refresh(); } return; }
  if (U.itemSel >= 0) { if (t && S.useItem(U.itemSel, t)) toast(T("道具已使用！", "Item used!"), 1.2); U.itemSel = -1; refresh(true); return; }
  if (t) openPet(t);
}
function persistSquad() { save.squad = B.towers.map(t => ({ id: t.id, s: t.slot })); writeSave(); }
function itemDown(e, i) {
  if (!B.items[i]) return; e.preventDefault();
  U.drag = { i, x0: e.clientX, y0: e.clientY, moved: false };
  const ghost = $("ghost"); ghost.textContent = D.ITEMS24[B.items[i]].ic;
  const mv = (ev) => { const d = U.drag; if (!d) return; if (Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) > 8) d.moved = true; if (d.moved) { ghost.style.display = "block"; ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px"; } };
  const up = (ev) => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); ghost.style.display = "none"; const d = U.drag; U.drag = null; if (!d) return;
    if (d.moved) { const r = $("stage").getBoundingClientRect(), t = petAt(ev.clientX - r.left, ev.clientY - r.top); if (t && S.useItem(d.i, t)) { U.itemSel = -1; } refresh(true); }
    else { U.itemSel = U.itemSel === i ? -1 : i; if (U.itemSel >= 0) toast(tx("itemPick", S.itemName(B.items[i])) + " · " + tx("it_" + B.items[i] + "_d"), 2.2); refresh(true); } };
  window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
}

/* ---------- movement input: keyboard + touch joystick ---------- */
const keys = new Set();
function applyKeys() { let x = 0, y = 0; if (keys.has("a") || keys.has("arrowleft")) x--; if (keys.has("d") || keys.has("arrowright")) x++; if (keys.has("w") || keys.has("arrowup")) y--; if (keys.has("s") || keys.has("arrowdown")) y++; if (!joy.on) { S.input.x = x; S.input.y = y; } }
const joy = { on: false, id: -1, cx: 0, cy: 0 };
function initInput() {
  window.addEventListener("keydown", (e) => { const k = e.key.toLowerCase(); if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) { keys.add(k); applyKeys(); if (U.screen === "battle") e.preventDefault(); }
    if (U.screen === "battle" && !U.modal) { const i = "qer".indexOf(k); if (i >= 0 && k.length === 1) { if (S.castSkill(i)) sfx("skill"); } if (k === "p" || k === "escape") { B.paused = !B.paused; refresh(); } } });
  window.addEventListener("keyup", (e) => { keys.delete(e.key.toLowerCase()); applyKeys(); });
  window.addEventListener("blur", () => { keys.clear(); applyKeys(); });
  const jb = $("joy"), knob = $("knob");
  jb.addEventListener("pointerdown", (e) => { e.preventDefault(); const r = jb.getBoundingClientRect(); joy.on = true; joy.id = e.pointerId; joy.cx = r.left + r.width / 2; joy.cy = r.top + r.height / 2; jb.setPointerCapture(e.pointerId); moveJoy(e); });
  jb.addEventListener("pointermove", (e) => { if (joy.on && e.pointerId === joy.id) moveJoy(e); });
  const end = (e) => { if (e.pointerId !== joy.id) return; joy.on = false; S.input.x = 0; S.input.y = 0; knob.style.transform = ""; applyKeys(); };
  jb.addEventListener("pointerup", end); jb.addEventListener("pointercancel", end);
  function moveJoy(e) { const R0 = jb.getBoundingClientRect().width * 0.38; let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy; const L = Math.hypot(dx, dy); if (L > R0) { dx *= R0 / L; dy *= R0 / L; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; const m = Math.min(1, L / R0); S.input.x = L > 4 ? dx / Math.max(1, Math.hypot(dx, dy)) * m : 0; S.input.y = L > 4 ? dy / Math.max(1, Math.hypot(dx, dy)) * m : 0; }
  $("stage").addEventListener("pointerdown", (e) => { unlockAudio(); onFieldTap(e); });
}

/* ---------- results ---------- */
function onEnd(won) {
  const best = Math.max(save.best[B.level.id] | 0, B.won ? B.level.waves || B.wave : Math.max(0, B.wave - (won ? 0 : 1)), B.bestWave | 0);
  save.best[B.level.id] = best; writeSave(); closeModal(); U.ult = null;
  setTimeout(() => {
    $("result").innerHTML = `<div class="pcard res"><h2 class="${won ? "w" : "l"}">${won ? tx("win") : tx("lose")}</h2>${img("hero", B.hero.key, "bigpic")}
      <p>${tx("stats", B.wave, B.kills, B.hero.level)}</p><div class="row"><button class="btn white" id="rHome">${tx("home")}</button><button class="btn big green" id="rAgain">${tx("again")}</button></div></div>`;
    show("result"); $("rAgain").onclick = () => { sfx("click"); startBattle(); }; $("rHome").onclick = () => { sfx("click"); R.showTitle(true); buildTitle(); show("title"); };
  }, won ? 900 : 600);
}
export function initUI() {
  loadSave();
  S.ui.toast = (s, d) => toast(s, d); S.ui.refresh = () => {};   // the main loop refreshes the HUD 10x per second S.ui.end = onEnd; S.ui.sfx = sfx;
  buildTitle(); show("title"); initInput();
}
