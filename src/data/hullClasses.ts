import type { HullClassDef, HullClassId, ShipRarity, Aptitude } from "./types";

export const HULL_CLASSES: HullClassDef[] = [
  {
    id: "corvette",
    order: 0,
    name: "Corvette-class",
    nameCn: "护卫舰",
    slots: { weapon: 1, armor: 1, engine: 1, utility: 1 },
    baseHull: 120,
    basePower: 11,
    baseSpeed: 5,
    unlockFlag: null,
    essenceCost: 0,
    minLevel: 0,
  },
  {
    id: "destroyer",
    order: 1,
    name: "Destroyer-class",
    nameCn: "驱逐舰",
    slots: { weapon: 2, armor: 2, engine: 1, utility: 2 },
    baseHull: 240,
    basePower: 20,
    baseSpeed: 6,
    unlockFlag: "act1.tigersReach.cleared",
    essenceCost: 40,
    minLevel: 4,
  },
  {
    id: "interceptor",
    order: 1,
    name: "Interceptor-class",
    nameCn: "拦截舰",
    // Same tier and unlock as Destroyer, same 6-slot total, but traded a utility
    // slot for a second engine slot — faster and more evasive, noticeably less
    // hull. Neither hull dominates the other; see docs/content-depth-standards.md §1.
    slots: { weapon: 2, armor: 1, engine: 2, utility: 2 },
    baseHull: 190,
    basePower: 20,
    baseSpeed: 8,
    unlockFlag: "act1.tigersReach.cleared",
    essenceCost: 40,
    minLevel: 4,
  },
  {
    id: "cruiser",
    order: 2,
    name: "Cruiser-class",
    nameCn: "巡洋舰",
    slots: { weapon: 3, armor: 2, engine: 2, utility: 3 },
    baseHull: 440,
    basePower: 28,
    baseSpeed: 8,
    unlockFlag: "act1.emberRising.cleared",
    essenceCost: 90,
    minLevel: 10,
  },
  {
    id: "vanguard",
    order: 2,
    name: "Vanguard-class",
    nameCn: "先锋舰",
    // Same tier/unlock/8-slot total as Cruiser, but a weapon slot in place of an
    // armor slot — a glass-cannon lateral option, not a strictly better Cruiser.
    slots: { weapon: 4, armor: 2, engine: 2, utility: 2 },
    baseHull: 360,
    basePower: 28,
    baseSpeed: 9,
    unlockFlag: "act1.emberRising.cleared",
    essenceCost: 90,
    minLevel: 10,
  },
  {
    id: "battleship",
    order: 3,
    name: "Battleship-class",
    nameCn: "战列舰",
    slots: { weapon: 5, armor: 3, engine: 2, utility: 3 },
    baseHull: 760,
    basePower: 36,
    baseSpeed: 9,
    unlockFlag: "act2.reachOpens.cleared",
    essenceCost: 160,
    minLevel: 18,
  },
  {
    id: "bulwark",
    order: 3,
    name: "Bulwark-class",
    nameCn: "壁垒舰",
    // Same tier/unlock/10-slot total as Battleship, but two armor slots in place
    // of one weapon and one engine slot — a dedicated tank, much slower.
    slots: { weapon: 4, armor: 5, engine: 2, utility: 3 },
    baseHull: 920,
    basePower: 39,
    baseSpeed: 9,
    unlockFlag: "act2.reachOpens.cleared",
    essenceCost: 160,
    minLevel: 18,
  },
  {
    id: "dreadnought",
    order: 4,
    name: "Dreadnought-class",
    nameCn: "歼星舰",
    slots: { weapon: 6, armor: 5, engine: 3, utility: 4 },
    baseHull: 1250,
    basePower: 50,
    baseSpeed: 10,
    unlockFlag: "act3.originTide.cleared",
    essenceCost: 260,
    minLevel: 28,
  },
  {
    id: "corsair",
    order: 4,
    name: "Corsair-class",
    nameCn: "掠夺舰",
    // Same tier/unlock/12-slot total as Dreadnought, but weighted hard toward
    // weapons and engines instead of armor — an alpha-strike glass cannon.
    // baseHull bumped from 750 (Player-Tested Anti-Patterns #6, caught by the ship-
    // ascension redesign's order-gap test): 750 was actually *below* order-3
    // Bulwark's 800, so ascending Bulwark→Corsair would have LOST hull — the tier
    // gap must hold across every branch pair, not just within one lateral pairing.
    slots: { weapon: 7, armor: 5, engine: 3, utility: 3 },
    baseHull: 1050,
    basePower: 50,
    baseSpeed: 12,
    unlockFlag: "act3.originTide.cleared",
    essenceCost: 260,
    minLevel: 28,
  },
  {
    id: "sovereign",
    order: 5,
    name: "Sovereign-class",
    nameCn: "主宰舰",
    slots: { weapon: 8, armor: 6, engine: 4, utility: 5 },
    baseHull: 1850,
    basePower: 64,
    baseSpeed: 12,
    unlockFlag: "act4.deepOrigin.cleared",
    essenceCost: 420,
    minLevel: 40,
  },
  {
    id: "aegis",
    order: 5,
    name: "Aegis-class",
    nameCn: "神盾舰",
    // Same tier/unlock/16-slot total as Sovereign, but a weapon slot traded for
    // two more armor slots — the ultimate-tank endgame lateral option.
    slots: { weapon: 7, armor: 8, engine: 3, utility: 5 },
    baseHull: 2200,
    basePower: 64,
    baseSpeed: 12,
    unlockFlag: "act4.deepOrigin.cleared",
    essenceCost: 420,
    minLevel: 40,
  },
  {
    id: "anthem",
    order: 6,
    name: "Anthem-class",
    nameCn: "颂歌舰",
    // Reverse-engineered Choir hull tech (Act VI) — see docs/story/act-6-chorus-deep.md.
    // Same tier/unlock/18-slot total as Sanctum, weighted hard toward weapons and
    // engines — the glass-cannon lateral option at the campaign's new ceiling.
    slots: { weapon: 10, armor: 8, engine: 5, utility: 6 },
    baseHull: 2600,
    basePower: 81,
    baseSpeed: 14,
    unlockFlag: "act6.civilizationDisqualified.cleared",
    essenceCost: 620,
    minLevel: 55,
  },
  {
    id: "sanctum",
    order: 6,
    name: "Sanctum-class",
    nameCn: "圣所舰",
    // Same tier/unlock/18-slot total as Anthem, but weapon and engine slots traded
    // for armor — the ultimate-tank option, continuing Aegis's lineage.
    slots: { weapon: 8, armor: 11, engine: 4, utility: 6 },
    baseHull: 3300,
    basePower: 81,
    baseSpeed: 13,
    unlockFlag: "act6.civilizationDisqualified.cleared",
    essenceCost: 620,
    minLevel: 55,
  },
];

export const RARITY_ORDER: ShipRarity[] = [
  "salvage",
  "standard",
  "reinforced",
  "advanced",
  "prototype",
  "ascendant",
];

/** ~1.32x per tier — wide enough, paired with the ±12% quality-roll band in
 * engine/ships.ts, that a worst-roll ship of tier N+1 always beats a best-roll ship
 * of tier N. See docs/design-principles.md's Player-Tested Anti-Patterns #6 and the
 * verification in ships.test.ts. */
export const RARITY_MULTIPLIER: Record<ShipRarity, number> = {
  salvage: 1.0,
  standard: 1.32,
  reinforced: 1.74,
  advanced: 2.3,
  prototype: 3.04,
  ascendant: 4.01,
};

export const APTITUDE_GROWTH: Record<Aptitude, number> = {
  S: 1.5,
  A: 1.25,
  B: 1.0,
  C: 0.8,
  D: 0.6,
};

export const APTITUDE_WEIGHTS: Record<Aptitude, number> = {
  S: 3,
  A: 12,
  B: 40,
  C: 30,
  D: 15,
};

export function hullClassById(id: string): HullClassDef {
  const def = HULL_CLASSES.find((h) => h.id === id);
  if (!def) throw new Error(`Unknown hull class: ${id}`);
  return def;
}

/** Ship ascension (see docs/story/research-notes-ship-ascension.md): the 1-2 hull
 * classes one order above the given one — a free choice each tier, not a locked
 * branch, since nothing in the source material specifies a branching tree. Empty
 * once past the campaign's current ceiling (order 6). */
export function nextHullClassOptions(current: HullClassId): HullClassDef[] {
  const cur = hullClassById(current);
  return HULL_CLASSES.filter((h) => h.order === cur.order + 1);
}

/** 同一层的另一艘舰级。
 *
 * 2026-08-31(/loop 第 34 轮)。1–6 层每层正好两艘(驱逐/拦截、巡洋/先锋、战列/壁垒、
 * 无畏/私掠、主权/神盾、颂歌/圣所),而 nextHullClassOptions 只给 order+1 —— 玩家
 * 在每一层做一次二选一,**永久放弃另一半**。十二艘船,一辈子只开得到六艘,而且是在
 * 完全不知道另一条路手感如何的情况下选的。
 *
 * 改铸(reforge)把这个选择重新打开:花同样的精华横向换过去。 */
export function siblingHullOptions(current: HullClassId): HullClassDef[] {
  const cur = hullClassById(current);
  return HULL_CLASSES.filter((h) => h.order === cur.order && h.id !== cur.id);
}

/** Whether `ship` currently meets every ascension requirement for `target` — story
 * flag, Origin Essence on hand, and minimum level. All three must hold; ascending
 * itself (see engine/ships.ts's ascendShip) is what actually spends the Essence. */
export function ascensionRequirementsMet(
  target: HullClassDef,
  level: number,
  originEssence: number,
  flags: Record<string, boolean>,
): { flag: boolean; essence: boolean; level: boolean } {
  return {
    flag: target.unlockFlag === null || !!flags[target.unlockFlag],
    essence: originEssence >= target.essenceCost,
    level: level >= target.minLevel,
  };
}
