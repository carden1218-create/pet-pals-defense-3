/* Pet Pals Defense 3 — game data.
   Gen-1 numbers are copied from carden1218-create/pet-pals-defense v2.9.12 (03-data.js, 05-game.js, 06-v22/v24, 16-v294).
   Gen-2 hero numbers are copied from pet-pals-25d-test v20 (game.js). Do not tune here without Carden's OK. */
export const W = 540, H = 960;
export const LANES = 5;
export const LANE_X = [106, 188, 270, 352, 434];
export const FRONT_Y = 592, BACK_Y = 672;
export const FIELD_TOP = 112, FENCE_Y = 700, LEAK_Y = 716;
export const SLOTS = 10;
export const TAU = Math.PI * 2;
export const SAVE_KEY = "ppd3-save-v1";           // gen-3 only; never touches gen-1 "mengchong-td-*" keys

export const ADV = { 火: "草", 草: "水", 水: "火", 雷: "水", 土: "雷", 光: "土" };
export function elemMul(a, d) { if (!a) return 1; if (ADV[a] === d) return 1.5; if (ADV[d] === a) return 0.75; return 1; }
export const ELEM_COL = { 火: "#ff6a3a", 水: "#4aa8ff", 草: "#5ccf5a", 雷: "#ffd23a", 土: "#c08a5a", 光: "#fff59a" };
export const ELEM_EN = { 火: "Fire", 水: "Water", 草: "Grass", 雷: "Thunder", 土: "Earth", 光: "Light" };

/* gen-1 pets (stats from PETS, attack from SKILL — SKILL fields override PETS, same as gen-1's Object.assign) */
const PETS0 = [
  { id: "chili", el: "火", role: "dps", rar: 1, hp: 120, dmg: 16, rate: 0.6, range: 340, burn: 6,
    zh: "椒椒鼠", en: "Chili Mouse", sk: ["辣椒火籽", "Chili Seeds"], typ: "fireseed", fx: ["#ff6a2e", "#ff5ab0"],
    pal: { main: "#f2483c", sub: "#ffc2a6", stem: "#4cba52", flame: "#ffb02e" } },
  { id: "chestnut", el: "土", role: "tank", rar: 1, hp: 460, dmg: 16, rate: 0.8, range: 240, thorns: 0.15, knock: 12,
    zh: "栗栗猬", en: "Chestnut Hog", sk: ["栗刺滚滚", "Spiky Roll"], typ: "spikeroll", fx: ["#9a5e36", "#7ea6d8"],
    pal: { main: "#9a5e36", face: "#f6dcae", dark: "#5e3a24", tip: "#f2c879" } },
  { id: "berry", el: "草", role: "sup", rar: 1, hp: 130, dmg: 0, rate: 2.0, range: 240, heal: 0.12, haste: 0, buff: 0.15, aura: 240,
    zh: "莓宝兔", en: "Berry Bunny", sk: ["莓果爆爆", "Berry Pop"], typ: "berrypop", fx: ["#ff4f6d", "#fff0c0"],
    pal: { main: "#ff4f6d", seed: "#ffe066", leaf: "#4fbf5a", ear: "#fff0f2" } },
  { id: "lychee", el: "水", role: "sup", rar: 1, hp: 120, dmg: 14, rate: 0.9, range: 340, splash: 62, slow: 0.45, slowT: 2,
    zh: "荔荔母", en: "Lychee Jelly", sk: ["荔枝泡泡", "Lychee Bubble"], typ: "bubble", fx: ["#bfe6ff", "#d6ffb0"],
    pal: { shell: "#ec4a5e", flesh: "#fff6ea", tent: "#ffd0d8", dot: "#b02840" } },
  { id: "melon", el: "草", role: "tank", rar: 2, hp: 640, dmg: 13, rate: 0.9, range: 230, regen: 0.03, shield: 0.2,
    zh: "瓜瓜龟", en: "Melon Turtle", sk: ["瓜壳护盾", "Melon Shield"], typ: "shell", fx: ["#3fa84d", "#f3d34a"],
    pal: { shell: "#3fa84d", stripe: "#1f6b2c", rim: "#ff5a6a", skin: "#a6e07a" } },
  { id: "lemon", el: "雷", role: "aoe", rar: 2, hp: 120, dmg: 20, rate: 0.95, range: 340, chain: 3, fall: 0.72,
    zh: "柠檬啾", en: "Lemon Chick", sk: ["柠檬连环电", "Lemon Zap Chain"], typ: "chain", fx: ["#ffe14a", "#ff9a2e"],
    pal: { main: "#ffe14a", dark: "#e8b41e", beak: "#ff8a3a", bolt: "#4ab0ff" } },
  { id: "coco", el: "水", role: "dps", rar: 2, hp: 130, dmg: 7, rate: 0.22, range: 310,
    zh: "椰椰獭", en: "Coco Otter", sk: ["椰汁连射", "Coconut Squirt"], typ: "squirt", fx: ["#8fdcff", "#ffd23a"],
    pal: { fur: "#b07448", belly: "#f8e2c4", shell: "#6b4428", wave: "#5ac4ff", leaf: "#3fae5a" } },
  { id: "taro", el: "土", role: "aoe", rar: 3, hp: 240, dmg: 34, rate: 1.2, range: 310, splash: 78,
    zh: "芋圆熊", en: "Taro Bear", sk: ["芋泥震地", "Taro Stomp"], typ: "slam", fx: ["#b88ae0", "#96d886"],
    pal: { fur: "#b88ae0", dot: "#8456b8", belly: "#f2e6ff", leaf: "#5cbf5a", rock: "#8c7a72" } },
  { id: "peach", el: "光", role: "sup", rar: 3, hp: 150, dmg: 12, rate: 1.0, range: 300, buff: 0, haste: 0.25, aura: 220,
    zh: "桃桃猴", en: "Peach Monkey", sk: ["仙桃弹弹", "Bouncy Peach"], typ: "peachlob", fx: ["#ffaa9a", "#ffd25a"],
    pal: { fur: "#ffaa9a", face: "#ffe6d8", leaf: "#5cbf5a", halo: "#ffe27a", petal: "#ff8ac0" } },
  { id: "blueberry", el: "雷", role: "dps", rar: 4, hp: 130, dmg: 58, rate: 1.4, range: 640, crit: 0.28, critM: 2.2,
    zh: "莓莓鸮", en: "Berry Owl", sk: ["穿云羽箭", "Sky Feather"], typ: "snipe", fx: ["#7a9aff", "#c89aff"],
    pal: { main: "#4f68dc", dark: "#2f3f9a", face: "#c4d6ff", calyx: "#253470", beak: "#ffb43a" } },
  { id: "pitaya", el: "火", role: "aoe", rar: 4, hp: 260, dmg: 42, rate: 1.0, range: 390, splash: 88, burn: 10,
    zh: "龙果宝", en: "Dragonfruit Pup", sk: ["火龙流星", "Dragonfruit Meteor"], typ: "meteor", fx: ["#ff4f9a", "#ffd23a"],
    pal: { main: "#ff4f9a", scale: "#7fd05a", belly: "#ffffff", flame: "#ffb02e" } },
  { id: "mango", el: "光", role: "dps", rar: 4, hp: 280, dmg: 80, rate: 1.05, range: 390, stun: 0.6,
    zh: "芒仔狮", en: "Mango Cub", sk: ["芒光狮吼", "Mango Roar"], typ: "roar", fx: ["#ffd23a", "#ffc0e0"],
    pal: { fur: "#ffb42e", mane: "#ff7a1a", face: "#ffe7a0", leaf: "#4fbf5a", sun: "#ffe14a" } }
];
export const ROLE5 = { chili: "carry", coco: "carry", blueberry: "carry", lemon: "aoe", pitaya: "aoe", taro: "aoe",
  lychee: "control", mango: "control", chestnut: "control", berry: "support", peach: "support", melon: "support" };
for (const p of PETS0) p.r5 = ROLE5[p.id];
export const PETS = PETS0;
export const PET = Object.fromEntries(PETS.map(p => [p.id, p]));

export const ENEMY = {
  sprout: { zh: "嫩芽史莱姆", en: "Sprout Slime", col: "#7cc35a", el: "草", hp: 55, spd: 30, atk: 10, reward: 5, size: 78 },
  jelly: { zh: "果冻史莱姆", en: "Jelly Slime", col: "#7cc6f2", el: "水", hp: 46, spd: 34, atk: 8, reward: 5, size: 74 },
  ember: { zh: "火焰史莱姆", en: "Flame Slime", col: "#f0502e", el: "火", hp: 34, spd: 52, atk: 8, reward: 6, size: 80 },
  zap: { zh: "电池史莱姆", en: "Battery Slime", col: "#ffd83a", el: "雷", hp: 52, spd: 44, atk: 10, reward: 6, size: 80 },
  pebble: { zh: "岩石史莱姆", en: "Rock Slime", col: "#9a9a9a", el: "土", hp: 150, spd: 20, atk: 18, reward: 10, size: 92 },
  puff: { zh: "气球史莱姆", en: "Balloon Slime", col: "#ff8ab8", el: "光", hp: 48, spd: 38, atk: 0, reward: 7, size: 88, fly: true },
  boss1: { zh: "果冻史莱姆王", en: "Jelly Slime King", col: "#ff7ab8", el: "水", hp: 950, spd: 16, atk: 40, reward: 60, size: 150, boss: true },
  boss2: { zh: "岩甲史莱姆王", en: "Stone Slime King", col: "#8faa8f", el: "土", hp: 1800, spd: 15, atk: 60, reward: 90, size: 156, boss: true },
  boss3: { zh: "熔岩史莱姆王", en: "Lava Slime King", col: "#e03a2a", el: "火", hp: 3000, spd: 16, atk: 70, reward: 130, size: 156, boss: true },
  split: { zh: "分裂史莱姆", en: "Split Slime", col: "#4ac8a0", el: "草", hp: 95, spd: 27, atk: 12, reward: 4, size: 92, split: "splitling" },
  splitling: { zh: "分裂小史莱姆", en: "Mini Split Slime", col: "#6ad8c0", el: "草", hp: 32, spd: 40, atk: 6, reward: 2, size: 58 },
  thief: { zh: "偷蛋史莱姆", en: "Egg Thief Slime", col: "#5a3a8a", el: "雷", hp: 42, spd: 74, atk: 6, reward: 12, size: 86, thief: true },
  shield: { zh: "大盾史莱姆", en: "Tower-Shield Slime", col: "#8a94a6", el: "土", hp: 170, spd: 22, atk: 16, reward: 9, size: 96 },
  spitter: { zh: "远程史莱姆", en: "Ranged Spitter Slime", col: "#7acf3a", el: "草", hp: 70, spd: 30, atk: 6, reward: 9, size: 86, skill: "spit" },
  mage: { zh: "法师史莱姆", en: "Mage Summoner Slime", col: "#6a3ab8", el: "光", hp: 95, spd: 24, atk: 8, reward: 12, size: 90, skill: "summon" },
  mini: { zh: "小史莱姆", en: "Mini Slime", col: "#6a6aff", el: "水", hp: 26, spd: 44, atk: 5, reward: 1, size: 54 },
  bossX: { zh: "混沌史莱姆王", en: "Chaos Slime King", col: "#8a4ad0", el: "光", hp: 1400, spd: 17, atk: 50, reward: 80, size: 150, boss: true }
};
export const ARMOR = { pebble: 0.3, shield: 0.45, boss2: 0.25, bossX: 0.15, boss3: 0.1 };
export function eliteChance(wave) { return wave < 12 ? 0 : Math.min(0.35, 0.05 + 0.006 * (wave - 12)); }

/* story maps (first three gen-1 maps) + endless */
export const MAPS = [
  { id: "orchard", theme: "orchard", waves: 10, off: 0, pool: ["sprout", "jelly", "ember"], boss: ["boss1"], path: "straight", terrain: { 7: "high", 1: "bend", 8: "rune" }, zh: "果园", en: "Orchard" },
  { id: "beach", theme: "beach", waves: 10, off: 3, pool: ["jelly", "sprout", "zap", "puff"], boss: ["boss1", "boss2"], path: "straight", terrain: { 5: "high", 2: "bend", 9: "rune" }, zh: "海滩", en: "Beach" },
  { id: "volcano", theme: "volcano", waves: 10, off: 6, pool: ["ember", "zap", "pebble", "split"], boss: ["boss2", "boss3"], path: "straight", terrain: { 9: "high", 3: "bend", 6: "rune" }, zh: "火山", en: "Volcano" }
];
export const MAP = Object.fromEntries(MAPS.map(m => [m.id, m]));
export const ENDLESS = { id: "endless", endless: true, zh: "无尽冒险", en: "Endless Adventure" };
export const ZONES = ["orchard", "beach", "volcano"];   // gen-1 cycles 8 themes; the prototype has 3 of them built
export function zoneOf(wave) { return ZONES[Math.floor(Math.max(0, wave - 1) / 10) % ZONES.length]; }
export const TERRAIN = { high: { icon: "🎯", range: 0.25, crit: 0.15, col: "#ffcf4a" }, rune: { icon: "⚡", spd: 0.22, col: "#7ae0ff" }, bend: { icon: "🔥", splash: 0.15, slow: 0.15, col: "#ff8a4a" } };
export const ENDLESS_TERRAIN = { 7: "high", 2: "bend", 5: "rune", 9: "rune" };
export const AURA = { atk: 0.18, spd: 0.12 };
export function slotsAdjacent(a, b) { const la = a % 5, lb = b % 5, ra = a < 5 ? 0 : 1, rb = b < 5 ? 0 : 1; return a !== b && ((ra === rb && Math.abs(la - lb) === 1) || (la === lb && ra !== rb)); }

export function smoothHp(n) { const k = Math.max(0, n - 1); return (1 + 0.1 * k + 0.006 * k * k) * Math.pow(1.03, Math.max(0, n - 25)); }
export function storySpec(map, n) {
  const N = n + map.off;
  let hpMul = smoothHp(N) * (map.off === 0 ? (n <= 2 ? 0.85 : 1) : 1.3);
  let spdMul = 1 + 0.25 * Math.log(1 + (N - 1) / 4);
  const count = 6 + Math.floor((n - 1) * 1.1) + Math.floor(map.off / 5);
  const unlocked = Math.min(map.pool.length, 2 + Math.floor(n / 2));
  let seed = (N * 7919 + map.off * 131 + 17) % 233280;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const list = [];
  for (let i = 0; i < count; i++) list.push({ id: map.pool[Math.floor(rnd() * unlocked)], n: 1 });
  const last = n >= map.waves;
  if (n % 5 === 0 || last) {
    const bosses = last && map.finale ? map.boss.slice() : [map.boss[Math.min(map.boss.length - 1, Math.floor(n / 5) - 1 + (last ? 1 : 0)) % map.boss.length]];
    if (last && !map.finale && map.boss.length > 1) bosses.push(map.boss[0]);
    bosses.forEach((b, i) => list.splice(Math.floor(list.length * (i + 1) / (bosses.length + 1)), 0, { id: b, n: 1, bossMul: (N <= 5 ? 0.45 : 0.6) * (last && map.finale ? 0.8 : 1) }));
  }
  const gap = Math.max(0.3, 1.0 - N * 0.02);
  return { list, hpMul, spdMul, gap };
}
const ENDLESS_MIX = { 3: ["ember", "zap", "ember", "jelly"], 6: ["pebble", "shield", "split", "sprout"], 8: ["thief", "spitter", "zap", "puff"], 5: ["split", "mage", "puff", "sprout"] };
export function endlessSpec(n) {
  const hpMul = smoothHp(n);
  const spdMul = 1 + 0.22 * Math.log(1 + (n - 1) / 5);
  const count = 6 + Math.floor((n - 1) * 0.95);
  const pool = ["sprout", "jelly", "ember", "zap", "pebble", "puff", "split", "thief", "shield", "spitter", "mage"];
  const unlocked = Math.min(pool.length, 2 + Math.floor(n / 2));
  const mix = n > 10 ? ENDLESS_MIX[n % 10] : null;
  const list = [];
  let seed = n * 9301 + 49297;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < count; i++) list.push({ id: mix && rnd() < 0.6 ? mix[Math.floor(rnd() * mix.length)] : pool[Math.floor(rnd() * unlocked)], n: 1 });
  if (n % 10 === 0 || n === 5) {
    const bosses = ["boss1", "boss2", "boss3", "bossX"];
    const bn = n === 5 ? 1 : 1 + (n >= 30 ? 1 : 0) + (n >= 60 ? 1 : 0);
    for (let i = 0; i < bn; i++) list.splice(Math.floor(list.length * (i + 1) / (bn + 1)), 0, { id: bosses[(Math.floor(n / 10) + i) % 4], n: 1, bossMul: n <= 5 ? 0.45 : 0.75 });
  }
  return { list, hpMul, spdMul, gap: Math.max(0.3, 1.0 - n * 0.018), mix: mix ? n % 10 : 0 };
}

/* field upgrades (v2.9.2 Lv.5) + v2.4 kill gate */
export const MAX_TIER = 5;
export const TIER_ATK = [1, 1.35, 1.8, 2.25, 2.75];
export const TIER_SPD = [1, 1.06, 1.12, 1.18, 1.24];
export const TIER_RANGE = [1, 1, 1.08, 1.14, 1.2];
export const TIER_HEAL = [1, 1.15, 1.3, 1.45, 1.6];
export const TIER_STUN = [1, 1, 1.25, 1.4, 1.55];
export const UP_KILLS = [0, 6, 16, 28, 42];
export function upgradeCost(t) { const r = PET[t.id].rar, n = t.tier | 0; return n === 1 ? 40 + 12 * r : n === 2 ? 90 + 25 * r : n === 3 ? 140 + 40 * r : n === 4 ? 200 + 55 * r : 0; }
const STAR_MUL = [0, 1, 1.4, 1.95, 2.7, 3.7, 5.0];
const STAR_SCALE_R = [0, 0.72, 0.84, 0.94, 1.0, 1.05, 1.1, 1.15];
export function starMul(rar, star) { return 1 + (STAR_MUL[Math.max(1, Math.min(6, star | 0))] - 1) * STAR_SCALE_R[Math.min(7, rar)]; }
export function stageOf(star) { return Math.min(4, Math.max(1, star | 0)); }
export const GOLD_INCOME_MUL = 0.495;
export function goldIncome(n) { n = +n || 0; if (n <= 0) return 0; return Math.max(1, Math.round(n * GOLD_INCOME_MUL)); }

/* v2.4 battle layer: items, per-wave perks, revive, ultimate; v2.9.4 item charge meter */
export const ITEMS24 = { fly: { ic: "🕊️", dur: 18, col: "#bfe6ff" }, fire: { ic: "🔥", dur: 18, col: "#ff8a3a" }, swap: { ic: "🌀", dur: 20, col: "#c89aff" } };
export const PERKS24 = [{ id: "atk", v: 0.06, max: 4 }, { id: "spd", v: 0.05, max: 4 }, { id: "hp", v: 0.08, max: 3 }, { id: "crit", v: 0.03, max: 3 }, { id: "coin", v: 0.10, max: 3 }, { id: "range", v: 0.05, max: 3 }, { id: "rev", v: 0.10, max: 3 }];
export const CHG_MAX = 10;
export function ultCost24(t) { return 30 + 10 * ((PET[t.id] && PET[t.id].rar) || 1); }
export function ultTypOf(d) {
  const r = d.r5;
  if (r === "support") return "heal";
  if (r === "control") return "freeze";
  if (r === "econ") return "gold";
  if (r === "summon") return "shield";
  if (r === "aoe") return "blast";
  return "burst";
}
export const GREEN24 = 0.15;

/* ===== gen-2 protagonist (pet-pals-25d-test v20). Distances are in gen-2 tiles; 1 tile = 1 gen-1 lane (82px). ===== */
export const TILE = 82;
export const HERO_DEFS = {
  chili: { name: ["椒椒鼠", "Chili Mouse"], fxKind: "fire", moveSpd: 4.4, range: 3.35, atkRate: 0.56, dmg: 26, maxHp: 115, projCol: "#ff4b1f", coreCol: "#ffe24a", burstCol: "#ff6d28", words: ["WHOOSH!", "BURN!", "燃!", "炙!"], burnDur: 3.2 },
  lemon: { name: ["闪电鸡", "Lightning Chick"], fxKind: "lightning", moveSpd: 4.9, range: 3.75, atkRate: 0.92, dmg: 38, maxHp: 105, projCol: "#269ef5", coreCol: "#fff454", burstCol: "#ffe944", words: ["CRACK!", "ZAP!", "轰雷!", "劈!"], chainRange: 2.95 },
  blueberry: { name: ["蓝莓枭", "Blueberry Owl"], fxKind: "frost", moveSpd: 4.2, range: 3.45, atkRate: 0.62, dmg: 25, maxHp: 110, projCol: "#3c7cf5", coreCol: "#e4f7ff", burstCol: "#72d8ff", words: ["FREEZE!", "冰封!", "碎!"], slowDur: 2.4, splash: 1.25 },
  coco: { name: ["椰椰獭", "Coco Otter"], fxKind: "water", moveSpd: 4.7, range: 3.35, atkRate: 0.68, dmg: 24, maxHp: 115, projCol: "#2d9cff", coreCol: "#e4f8ff", burstCol: "#5cd0ff", words: ["CRASH!", "浪涌!", "湿!"], slowDur: 2.6, splash: 1.15, knock: 0.25 },
  taro: { name: ["芋岩熊", "Taro Rock Bear"], fxKind: "rock", moveSpd: 4.1, range: 3.40, atkRate: 0.56, dmg: 46, maxHp: 140, projCol: "#8c7464", coreCol: "#e8d6c0", burstCol: "#c9925a", words: ["SMASH!", "石化!", "砸!"], splash: 1.05, knock: 0.28 },
  chestnut: { name: ["刺栗剑圣", "Chestnut Sword Saint"], fxKind: "slash", moveSpd: 5.0, range: 2.55, atkRate: 0.50, dmg: 34, maxHp: 130, projCol: "#5cf2ff", coreCol: "#ffffff", burstCol: "#ffe24a", words: ["SLASH!", "斩!", "剑气!"], splash: 1.05, knock: 0.20, melee: true }
};
export const HERO_KEYS = Object.keys(HERO_DEFS);
export const HERO_SKILLS = {
  chili: [
    { id: "chili_fan", ico: "🌶️", lbl: ["扇形喷火", "Fire Fan"], cd: 5.0, desc: ["吃掉辣椒在地面喷出扇形烈焰，持续灼烧敌人！", "Eats a chili and sprays a fan of flame that keeps burning slimes!"] },
    { id: "chili_wall", ico: "🔥", lbl: ["辣椒火墙", "Chili Fire Wall"], cd: 9.0, desc: ["喷出一长条高温火墙留红地板；满级召唤双火龙与火龙卷！", "A long white-hot fire wall that leaves a red floor; high levels summon twin fire dragons!"] },
    { id: "chili_storm", ico: "🌪️", lbl: ["龙卷风暴", "Fire Tornado Storm"], cd: 7.5, desc: ["吐出多道螺旋火龙卷在敌群间回旋灼烧！", "Spits several spiralling fire tornadoes into the crowd!"] }
  ],
  lemon: [
    { id: "lemon_zeus", ico: "🕊️", lbl: ["闪电之力", "Lightning Force"], cd: 7.0, desc: ["召唤头戴头盔脚踏白云的宙斯鸟虚影，连射神圣白金雷；满级双宙斯分裂！", "Summons a helmeted Zeus-bird phantom on a holy white cloud firing white-gold bolts; max level: two Zeus birds that split!"] },
    { id: "lemon_storm", ico: "🌩️", lbl: ["雷暴旋击", "Thunderstorm Strike"], cd: 12.0, desc: ["全屏乌云麻痹互电！怒脸大乌云狂劈；满级3朵乌云+全屏小雷！", "Dark clouds paralyse every slime so they shock each other! An angry cloud smites; max level: 3 clouds + mini bolts!"] },
    { id: "lemon_arc", ico: "⚡", lbl: ["雷云轰炸", "Charged Clouds"], cd: 6.0, desc: ["头顶闪电连续充能多朵雷云飞向敌群齐劈！", "Charges several thunderclouds that fly out and strike together!"] }
  ],
  blueberry: [
    { id: "blue_breath", ico: "🌬️", lbl: ["极寒吐息", "Frost Breath"], cd: 5.5, desc: ["喷出超帅寒气冻结敌人；满级大冰块滑行并留冰道！", "Breathes freezing frost; high levels launch a sliding ice block!"] },
    { id: "blue_blizz", ico: "❄️", lbl: ["暴风雪域", "Blizzard"], cd: 10.0, desc: ["飞空降下暴风雪把全场冻成冰雕+冰锥雨+滑行冰面！", "Flies up: a blizzard turns the field into ice statues, icicles rain, the floor turns slick!"] },
    { id: "blue_mammoth", ico: "🦣", lbl: ["猛犸冲锋", "Mammoth Charge"], cd: 8.0, desc: ["召唤威武猛犸战将踏碎冰霜与史莱姆！", "Summons mighty mammoth warriors to stomp slimes!"] }
  ],
  coco: [
    { id: "coco_torn", ico: "🌀", lbl: ["水龙卷", "Water Tornado"], cd: 5.5, desc: ["推出高速水龙卷；满级水龙虚影伴飞推浪咬击！", "Pushes out a fast water tornado; high levels add a phantom water dragon!"] },
    { id: "coco_tsunami", ico: "🌊", lbl: ["海啸来袭", "Tsunami"], cd: 10.0, desc: ["头顶巨大漩涡蓄水溅浪，随后爆发海啸+海洋生物+巨船残骸与吸附漩涡！", "A giant whirlpool charges overhead, then a tsunami with sea creatures, a ship and a lingering whirlpool!"] },
    { id: "coco_bubble", ico: "🫧", lbl: ["泡沫监牢", "Bubble Prison"], cd: 7.0, desc: ["吐出大片水泡将史莱姆困住浮空并爆裂！", "Traps nearby slimes in floating bubbles that pop!"] }
  ],
  taro: [
    { id: "taro_spire", ico: "🪨", lbl: ["天降石锥", "Sky Stone Spire"], cd: 5.2, desc: ["召唤巨大石锥从天砸落；满级连降多根石锥！", "Huge stone spires crash down from the sky!"] },
    { id: "taro_volcano", ico: "🌋", lbl: ["火山爆发", "Volcano"], cd: 10.5, desc: ["召唤巨山裂开化作火山喷发，飞石灼烧并堵路掩埋！", "A mountain rises, cracks open and erupts — burning rocks bury the road!"] },
    { id: "taro_quake", ico: "⛰️", lbl: ["石化震荡", "Petrify Quake"], cd: 7.5, desc: ["重踏引爆碎石圈，直接给一片史莱姆套上石壳！", "A heavy stomp wraps nearby slimes in stone shells!"] }
  ],
  chestnut: [
    { id: "sword_spin", ico: "⚙️", lbl: ["狂旋剑轮", "Saw Sword"], cd: 5.5, desc: ["召唤疯狂旋转的飞剑持续切割约6秒；满级四面八方锯片飞剑齐袭！", "A wildly spinning sword cuts for 6s; high levels: saw swords fly in from all sides!"] },
    { id: "sword_ride", ico: "⚔️", lbl: ["御剑飞仙", "Sword Flight"], cd: 11.0, desc: ["御剑腾空冲撞扎穿史莱姆，周身聚剑狂攻回旋；满级降下天穹剑阵！", "Rides a flying sword, ramming slimes while orbiting swords strike; max level: sky sword formation!"] },
    { id: "sword_rain", ico: "🗡️", lbl: ["万剑齐发", "Sword Rain"], cd: 7.5, desc: ["召唤一圈飞剑凌空扎入地面，随后逐一爆出交叉剑光斩！", "A ring of swords stabs into the ground, then bursts into crossing slashes!"] }
  ]
};
export const PERK_POOL = [
  { id: "perk_companion", ico: "🐾", t: ["迷你跟班 · 召唤小弟", "Mini Buddy"], d: ["召唤一只缩小版主角随行作战！", "Summons a mini version of your hero to fight alongside!"] },
  { id: "perk_split", ico: "❄️", t: ["裂变追击 · 碎屑追踪", "Split Chase"], d: ["每次命中会分裂出 2 枚迷你追踪弹追打附近史莱姆！", "Every hit splits into 2 mini homing shots!"] },
  { id: "perk_storm", ico: "🌨️", t: ["元素余波 · 风暴随行", "Elemental Wake"], d: ["每次攻击命中后在原地留下小型元素漩涡持续伤害！", "Hits leave a small elemental swirl that keeps hurting!"] },
  { id: "perk_ember", ico: "🔥", t: ["炽热余烬 · 持续灼烧", "Lingering Embers"], d: ["攻击附带飘散火星余烬，让史莱姆持续掉血！", "Attacks scatter embers that keep slimes burning!"] },
  { id: "perk_chain", ico: "⚡", t: ["电弧分叉 · 连锁跳弹", "Forking Arcs"], d: ["攻击命中后分叉出电弧弹射 2 个附近敌人！", "Hits fork arcs to 2 nearby slimes!"] },
  { id: "perk_multi", ico: "🎯", t: ["多重齐发 · 残影连击", "Multi Shot"], d: ["每次普攻额外多发 1 道攻击；刺栗剑圣还可远程发射飞剑！", "+1 attack per shot; the Sword Saint also throws flying swords!"] },
  { id: "perk_pierce", ico: "🗡️", t: ["贯穿飞刃 · 穿透增程", "Piercing Blade"], d: ["攻击穿透 +1 个目标、射程 +15%！", "Attacks pierce +1 slime, range +15%!"] },
  { id: "perk_crit", ico: "💥", t: ["雷霆暴击 · 闪光震环", "Thunder Crit"], d: ["暴击率 +14%，暴击触发双层冲击环！", "Crit chance +14%, crits fire a double shock ring!"] },
  { id: "perk_haste", ico: "💨", t: ["疾风步法 · 残影加速", "Gale Steps"], d: ["移速 +16%、攻速 +22%！", "Move speed +16%, attack speed +22%!"] },
  { id: "perk_power", ico: "💪", t: ["火力全开 · 爆裂强化", "Full Power"], d: ["攻击和技能伤害 +25%，爆炸特效范围更大！", "Attack and skill damage +25%, bigger blasts!"] },
  { id: "perk_vital", ico: "💖", t: ["坚韧体魄 · 生命强化", "Tough Body"], d: ["最大生命 +35 并立即回满，复活更快！", "Max HP +35 and full heal, faster revive!"] },
  { id: "perk_econ", ico: "🪙", t: ["丰收活力 · 掉币回血", "Harvest Vigor"], d: ["打怪金币 +35%、经验 +30%，立即回复主角 35 点生命！", "Coins +35%, XP +30%, heal 35 HP now!"] }
];
export function getSkillCooldown(sk) { return Math.max(2.2, sk.cd * (1 - 0.09 * Math.max(0, (sk.lv || 1) - 1))); }
