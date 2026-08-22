import type { HullClassDef, ShipRarity, Aptitude } from "./types";

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
];

export const RARITY_ORDER: ShipRarity[] = [
  "salvage",
  "standard",
  "reinforced",
  "advanced",
  "prototype",
  "ascendant",
];

export const RARITY_MULTIPLIER: Record<ShipRarity, number> = {
  salvage: 1.0,
  standard: 1.15,
  reinforced: 1.35,
  advanced: 1.6,
  prototype: 1.9,
  ascendant: 2.3,
};

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
