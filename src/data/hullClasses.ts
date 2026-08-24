import type { HullClassDef, HullClassId, ShipRarity, Aptitude } from "./types";

export const HULL_CLASSES: HullClassDef[] = [
  {
    id: "corvette",
    order: 0,
    name: "Corvette-class",
    nameCn: "护卫舰",
    slots: { weapon: 1, armor: 1, engine: 1, utility: 1 },
    baseHull: 120,
    basePower: 6,
    baseSpeed: 5,
    unlockFlag: null,
    essenceCost: 0,
  },
  {
    id: "destroyer",
    order: 1,
    name: "Destroyer-class",
    nameCn: "驱逐舰",
    slots: { weapon: 2, armor: 1, engine: 1, utility: 2 },
    baseHull: 220,
    basePower: 10,
    baseSpeed: 5,
    unlockFlag: "act1.tigersReach.cleared",
    essenceCost: 40,
  },
  {
    id: "interceptor",
    order: 1,
    name: "Interceptor-class",
    nameCn: "拦截舰",
    // Same tier and unlock as Destroyer, same 6-slot total, but traded a utility
    // slot for a second engine slot — faster and more evasive, noticeably less
    // hull. Neither hull dominates the other; see docs/content-depth-standards.md §1.
    slots: { weapon: 2, armor: 1, engine: 2, utility: 1 },
    baseHull: 170,
    basePower: 9,
    baseSpeed: 8,
    unlockFlag: "act1.tigersReach.cleared",
    essenceCost: 40,
  },
  {
    id: "cruiser",
    order: 2,
    name: "Cruiser-class",
    nameCn: "巡洋舰",
    slots: { weapon: 2, armor: 2, engine: 2, utility: 2 },
    baseHull: 380,
    basePower: 16,
    baseSpeed: 4,
    unlockFlag: "act1.emberRising.cleared",
    essenceCost: 90,
  },
  {
    id: "vanguard",
    order: 2,
    name: "Vanguard-class",
    nameCn: "先锋舰",
    // Same tier/unlock/8-slot total as Cruiser, but a weapon slot in place of an
    // armor slot — a glass-cannon lateral option, not a strictly better Cruiser.
    slots: { weapon: 3, armor: 1, engine: 2, utility: 2 },
    baseHull: 300,
    basePower: 18,
    baseSpeed: 5,
    unlockFlag: "act1.emberRising.cleared",
    essenceCost: 90,
  },
  {
    id: "battleship",
    order: 3,
    name: "Battleship-class",
    nameCn: "战列舰",
    slots: { weapon: 3, armor: 2, engine: 2, utility: 3 },
    baseHull: 620,
    basePower: 24,
    baseSpeed: 3,
    unlockFlag: "act2.reachOpens.cleared",
    essenceCost: 160,
  },
  {
    id: "bulwark",
    order: 3,
    name: "Bulwark-class",
    nameCn: "壁垒舰",
    // Same tier/unlock/10-slot total as Battleship, but two armor slots in place
    // of one weapon and one engine slot — a dedicated tank, much slower.
    slots: { weapon: 2, armor: 4, engine: 1, utility: 3 },
    baseHull: 800,
    basePower: 20,
    baseSpeed: 2,
    unlockFlag: "act2.reachOpens.cleared",
    essenceCost: 160,
  },
  {
    id: "dreadnought",
    order: 4,
    name: "Dreadnought-class",
    nameCn: "歼星舰",
    slots: { weapon: 3, armor: 3, engine: 3, utility: 3 },
    baseHull: 950,
    basePower: 34,
    baseSpeed: 3,
    unlockFlag: "act3.originTide.cleared",
    essenceCost: 260,
  },
  {
    id: "corsair",
    order: 4,
    name: "Corsair-class",
    nameCn: "掠夺舰",
    // Same tier/unlock/12-slot total as Dreadnought, but weighted hard toward
    // weapons and engines instead of armor — an alpha-strike glass cannon.
    slots: { weapon: 5, armor: 2, engine: 3, utility: 2 },
    baseHull: 750,
    basePower: 38,
    baseSpeed: 5,
    unlockFlag: "act3.originTide.cleared",
    essenceCost: 260,
  },
  {
    id: "sovereign",
    order: 5,
    name: "Sovereign-class",
    nameCn: "主宰舰",
    slots: { weapon: 4, armor: 4, engine: 4, utility: 4 },
    baseHull: 1500,
    basePower: 48,
    baseSpeed: 3,
    unlockFlag: "act4.deepOrigin.cleared",
    essenceCost: 420,
  },
  {
    id: "aegis",
    order: 5,
    name: "Aegis-class",
    nameCn: "神盾舰",
    // Same tier/unlock/16-slot total as Sovereign, but a weapon slot traded for
    // two more armor slots — the ultimate-tank endgame lateral option.
    slots: { weapon: 3, armor: 6, engine: 3, utility: 4 },
    baseHull: 2000,
    basePower: 44,
    baseSpeed: 2,
    unlockFlag: "act4.deepOrigin.cleared",
    essenceCost: 420,
  },
  {
    id: "anthem",
    order: 6,
    name: "Anthem-class",
    nameCn: "颂歌舰",
    // Reverse-engineered Choir hull tech (Act VI) — see docs/story/act-6-chorus-deep.md.
    // Same tier/unlock/18-slot total as Sanctum, weighted hard toward weapons and
    // engines — the glass-cannon lateral option at the campaign's new ceiling.
    slots: { weapon: 6, armor: 3, engine: 4, utility: 5 },
    baseHull: 2300,
    basePower: 62,
    baseSpeed: 4,
    unlockFlag: "act6.civilizationDisqualified.cleared",
    essenceCost: 620,
  },
  {
    id: "sanctum",
    order: 6,
    name: "Sanctum-class",
    nameCn: "圣所舰",
    // Same tier/unlock/18-slot total as Anthem, but weapon and engine slots traded
    // for armor — the ultimate-tank option, continuing Aegis's lineage.
    slots: { weapon: 3, armor: 8, engine: 3, utility: 4 },
    baseHull: 3000,
    basePower: 50,
    baseSpeed: 2,
    unlockFlag: "act6.civilizationDisqualified.cleared",
    essenceCost: 620,
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

/** Shipwright showcase price for a rolled hull instance — scales with both hull tier
 * and rarity, so a visibly better ship costs visibly more instead of every rarity at
 * a given tier costing the same flat fee. */
export function shipwrightCost(hullClassId: HullClassId, rarity: ShipRarity): number {
  const def = hullClassById(hullClassId);
  return Math.round((30 + def.order * 25) * RARITY_MULTIPLIER[rarity]);
}

export const RARITY_WEIGHTS: Record<ShipRarity, number> = {
  salvage: 42,
  standard: 28,
  reinforced: 16,
  advanced: 9,
  prototype: 4,
  ascendant: 1,
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

export function nextHullClass(current: string): HullClassDef | null {
  const cur = hullClassById(current);
  return HULL_CLASSES.find((h) => h.order === cur.order + 1) ?? null;
}
