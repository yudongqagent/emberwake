import type { HullClassId, ShipInstance, ShipRolls } from "../data/types";
import { RARITY_ORDER, APTITUDE_WEIGHTS, APTITUDE_GROWTH, RARITY_MULTIPLIER, hullClassById, nextHullClassOptions, ascensionRequirementsMet } from "../data/hullClasses";
import { weightedPick, rollQuality } from "./rng";
import { permanentBonus } from "./permanent";

/** A roll of 0 gives 88% of the class baseline, 0.5 (neutral) gives exactly 100%, and a
 * roll of 1 gives 112% — the same ±quality band used for every stat, so a ship's rarity
 * sets the tier but its rolls decide whether it's a great one within that tier.
 * Deliberately narrow (±12%, was ±20%): with RARITY_MULTIPLIER's ~1.32x-per-tier gap,
 * this guarantees a worst-roll ship of tier N+1 still beats a best-roll ship of tier N
 * — verified in ships.test.ts. A wider band here would let a lucky common roll beat an
 * unlucky rare one, which is exactly the "tiers don't feel different" failure flagged
 * in docs/design-principles.md's Player-Tested Anti-Patterns #6. */
export function qualityMultiplier(roll: number): number {
  return 0.88 + roll * 0.24;
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

/** Ships built before the itemization overhaul (or ad-hoc proxy objects built for a
 * stat-delta comparison) have no rolls — treat them as dead-center average. */
const NEUTRAL_ROLLS: ShipRolls = { hull: 0.5, power: 0.5, speed: 0.5, evasion: 0.5, crit: 0.5 };

/** Ship-ascension redesign (docs/story/research-notes-ship-ascension.md): Whisper is
 * the only ship there ever is — created once at game start, always Corvette-class,
 * always Salvage rarity (a fixed starting point, not a draw), with a lightly rolled
 * stat spread for texture. All further growth is level (XP, unchanged) and ascension
 * (hull class, see ascendShip below). */
export function createWhisper(): ShipInstance {
  const hullClass: HullClassId = "corvette";
  const rarity: ShipInstance["rarity"] = "salvage";
  const def = hullClassById(hullClass);
  const rolls = rollShipAttributes(rarity);
  return {
    id: "whisper",
    hullClass,
    rarity,
    aptitude: null,
    scanned: false,
    name: "Whisper",
    level: 1,
    xp: 0,
    equipped: new Array(def.slots.weapon + def.slots.armor + def.slots.engine + def.slots.utility).fill(null),
    currentHp: computeMaxHull({ hullClass, rarity, level: 1, rolls }),
    rolls,
    ascendedFrom: [],
  };
}

/** Whether every ascension gate (story flag, Origin Essence, level) is met for at
 * least one of the current hull class's next-tier options. Used to show/hide the
 * "Ascension available" prompt without needing to know which branch yet. */
export function canAscend(ship: ShipInstance, originEssence: number, flags: Record<string, boolean>): boolean {
  return nextHullClassOptions(ship.hullClass).some((target) => {
    const req = ascensionRequirementsMet(target, ship.level, originEssence, flags);
    return req.flag && req.essence && req.level;
  });
}

/** Ascends `ship` into `targetHullClass` — a genuine tier change on the same ship
 * instance, not a new draw (see docs/story/research-notes-ship-ascension.md). Full
 * heal (an ascension is a bigger, rarer moment than a level-up, which doesn't fully
 * heal) and slots are remapped per type: hull classes don't always add slots of
 * every type (a tank branch can trade weapon/engine slots for armor ones, see
 * data/hullClasses.ts), so this both grows AND shrinks per-type slot counts as
 * needed — any module that no longer fits is simply unequipped (still owned, not
 * lost), never silently reassigned to the wrong slot type. */
export function ascendShip(ship: ShipInstance, targetHullClass: HullClassId): ShipInstance {
  const oldDef = hullClassById(ship.hullClass);
  const newDef = hullClassById(targetHullClass);
  const types: (keyof typeof oldDef.slots)[] = ["weapon", "armor", "engine", "utility"];
  let cursor = 0;
  const newEquipped: (string | null)[] = [];
  for (const type of types) {
    const oldCount = oldDef.slots[type];
    const newCount = newDef.slots[type];
    const currentGroup = ship.equipped.slice(cursor, cursor + oldCount);
    cursor += oldCount;
    const keep = currentGroup.slice(0, newCount);
    while (keep.length < newCount) keep.push(null);
    newEquipped.push(...keep);
  }
  const grown = {
    ...ship,
    hullClass: targetHullClass,
    equipped: newEquipped,
    ascendedFrom: [...ship.ascendedFrom, ship.hullClass],
  };
  return { ...grown, currentHp: computeMaxHull(grown) };
}

export function scanShip(ship: ShipInstance): ShipInstance {
  if (ship.scanned) return ship;
  return { ...ship, scanned: true, aptitude: weightedPick(APTITUDE_WEIGHTS) };
}

export function computeMaxHull(ship: Pick<ShipInstance, "hullClass" | "rarity" | "level"> & Partial<Pick<ShipInstance, "rolls">>): number {
  const def = hullClassById(ship.hullClass);
  const growth = 1 + (ship.level - 1) * 0.08;
  const roll = qualityMultiplier((ship.rolls ?? NEUTRAL_ROLLS).hull);
  // 刻印「船体」:永久抬高船体上限(data/sigils.ts)。
  return Math.round(def.baseHull * RARITY_MULTIPLIER[ship.rarity] * growth * roll * (1 + permanentBonus("hull")));
}

/** Power capacity comes from the HULL, plus a gentle level term.
 *
 * Weapon-system audit #3 follow-through. Capacity used to multiply basePower by
 * the ship's rarity, an 8%/level growth AND its power roll — the same battleship
 * ranged from 36 to 407 capacity while module draw stayed flat. Power therefore
 * stopped constraining anything a few levels in, which is the deeper reason the
 * overdraw warning never fired for anyone: not just that nothing read it, but
 * that nothing could ever trip it.
 *
 * Capacity is now a property of the hull class you're flying. That makes
 * ASCENSION the thing that unlocks heavier fits, which is exactly what the
 * game's ascension premise wants it to be — a bigger ship carries more gun —
 * rather than power quietly inflating with grind. The 4%/level term keeps some
 * of the original intent (Issue #1, 2026-08: leveling should visibly change more
 * than the health bar) without letting capacity outrun the fit by 10x.
 *
 * `level` defaults to 1 (no bonus) so partial-ship call sites still work. */
export function computePowerCapacity(ship: Pick<ShipInstance, "hullClass" | "rarity"> & Partial<Pick<ShipInstance, "rolls" | "level">>): number {
  const def = hullClassById(ship.hullClass);
  const growth = 1 + ((ship.level ?? 1) - 1) * 0.04;
  // 刻印「反应堆」:永久多出的功率容量,让更重的配装成为可能。
  return Math.round(def.basePower * growth) + permanentBonus("reactor");
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
