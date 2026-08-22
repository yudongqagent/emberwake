import type { HullClassId, ShipInstance } from "../data/types";
import { RARITY_WEIGHTS, APTITUDE_WEIGHTS, APTITUDE_GROWTH, RARITY_MULTIPLIER, hullClassById } from "../data/hullClasses";
import { weightedPick, randomId } from "./rng";

const SHIP_NAME_POOL = [
  "Cindersong",
  "Farwake",
  "Hollow Promise",
  "Last Ledger",
  "Quiet Reach",
  "Emberline",
  "Static Vow",
  "Driftglass",
  "Second Tide",
  "Nightledger",
];

export function drawShip(hullClass: HullClassId): ShipInstance {
  const rarity = weightedPick(RARITY_WEIGHTS);
  const def = hullClassById(hullClass);
  return {
    id: randomId("ship"),
    hullClass,
    rarity,
    aptitude: null,
    scanned: false,
    name: SHIP_NAME_POOL[Math.floor(Math.random() * SHIP_NAME_POOL.length)],
    level: 1,
    xp: 0,
    equipped: new Array(def.slots.weapon + def.slots.armor + def.slots.engine + def.slots.utility).fill(null),
    currentHp: computeMaxHull({ hullClass, rarity, level: 1 }),
  };
}

export function scanShip(ship: ShipInstance): ShipInstance {
  if (ship.scanned) return ship;
  return { ...ship, scanned: true, aptitude: weightedPick(APTITUDE_WEIGHTS) };
}

export function computeMaxHull(ship: Pick<ShipInstance, "hullClass" | "rarity" | "level">): number {
  const def = hullClassById(ship.hullClass);
  const growth = 1 + (ship.level - 1) * 0.08;
  return Math.round(def.baseHull * RARITY_MULTIPLIER[ship.rarity] * growth);
}

export function computePowerCapacity(ship: Pick<ShipInstance, "hullClass" | "rarity">): number {
  const def = hullClassById(ship.hullClass);
  return Math.round(def.basePower * RARITY_MULTIPLIER[ship.rarity]);
}

export function xpToNextLevel(level: number): number {
  return 40 + level * 25;
}

export function applyXp(ship: ShipInstance, xp: number): ShipInstance {
  let { level, xp: curXp } = ship;
  curXp += xp;
  const growthMult = ship.aptitude ? APTITUDE_GROWTH[ship.aptitude] : APTITUDE_GROWTH.B;
  while (curXp >= xpToNextLevel(level)) {
    curXp -= xpToNextLevel(level);
    level += 1;
  }
  const leveled = { ...ship, level, xp: curXp };
  const newMax = computeMaxHull(leveled);
  const grown = Math.round((newMax - computeMaxHull(ship)) * growthMult);
  return { ...leveled, currentHp: Math.min(newMax, ship.currentHp + Math.max(0, grown)) };
}
