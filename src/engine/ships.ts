import type { HullClassId, ShipInstance, ShipRolls } from "../data/types";
import { RARITY_WEIGHTS, RARITY_ORDER, APTITUDE_WEIGHTS, APTITUDE_GROWTH, RARITY_MULTIPLIER, hullClassById } from "../data/hullClasses";
import { weightedPick, randomId, rollQuality } from "./rng";

/** A roll of 0 gives 80% of the class baseline, 0.5 (neutral) gives exactly 100%, and a
 * roll of 1 gives 120% — the same ±quality band used for every stat, so a ship's rarity
 * sets the tier but its rolls decide whether it's a great one. */
export function qualityMultiplier(roll: number): number {
  return 0.8 + roll * 0.4;
}

function rollShipAttributes(rarity: ShipInstance["rarity"]): ShipRolls {
  const tierIndex = RARITY_ORDER.indexOf(rarity);
  const total = RARITY_ORDER.length;
  return {
    hull: rollQuality(tierIndex, total),
    power: rollQuality(tierIndex, total),
    speed: rollQuality(tierIndex, total),
    evasion: rollQuality(tierIndex, total),
    crit: rollQuality(tierIndex, total),
  };
}

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

/** Ships built before the itemization overhaul (or ad-hoc proxy objects built for a
 * stat-delta comparison) have no rolls — treat them as dead-center average. */
const NEUTRAL_ROLLS: ShipRolls = { hull: 0.5, power: 0.5, speed: 0.5, evasion: 0.5, crit: 0.5 };

export function drawShip(hullClass: HullClassId): ShipInstance {
  const rarity = weightedPick(RARITY_WEIGHTS);
  const def = hullClassById(hullClass);
  const rolls = rollShipAttributes(rarity);
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
    currentHp: computeMaxHull({ hullClass, rarity, level: 1, rolls }),
    rolls,
  };
}

export function scanShip(ship: ShipInstance): ShipInstance {
  if (ship.scanned) return ship;
  return { ...ship, scanned: true, aptitude: weightedPick(APTITUDE_WEIGHTS) };
}

export function computeMaxHull(ship: Pick<ShipInstance, "hullClass" | "rarity" | "level"> & Partial<Pick<ShipInstance, "rolls">>): number {
  const def = hullClassById(ship.hullClass);
  const growth = 1 + (ship.level - 1) * 0.08;
  const roll = qualityMultiplier((ship.rolls ?? NEUTRAL_ROLLS).hull);
  return Math.round(def.baseHull * RARITY_MULTIPLIER[ship.rarity] * growth * roll);
}

export function computePowerCapacity(ship: Pick<ShipInstance, "hullClass" | "rarity"> & Partial<Pick<ShipInstance, "rolls">>): number {
  const def = hullClassById(ship.hullClass);
  const roll = qualityMultiplier((ship.rolls ?? NEUTRAL_ROLLS).power);
  return Math.round(def.basePower * RARITY_MULTIPLIER[ship.rarity] * roll);
}

/** World-units/sec the flagship moves at, both on the system map and in the combat
 * arena — bigger hull classes are deliberately slower (see baseSpeed in hullClasses.ts),
 * and a ship's individual speed roll can push it faster or slower still within that. */
export function computeSpeed(ship: Pick<ShipInstance, "hullClass"> & Partial<Pick<ShipInstance, "rolls">>): number {
  const def = hullClassById(ship.hullClass);
  const roll = qualityMultiplier((ship.rolls ?? NEUTRAL_ROLLS).speed);
  return Math.round(def.baseSpeed * 44 * roll);
}

/** Base evasion contributed by the hull itself, before engine traits or crew bonuses. */
export function computeBaseEvasion(ship: Partial<Pick<ShipInstance, "rolls">>): number {
  return (ship.rolls ?? NEUTRAL_ROLLS).evasion * 0.1;
}

/** Base crit chance contributed by the hull's own gunnery quality, before weapon traits
 * or combo bonuses. */
export function computeBaseCritChance(ship: Partial<Pick<ShipInstance, "rolls">>): number {
  return (ship.rolls ?? NEUTRAL_ROLLS).crit * 0.08;
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
