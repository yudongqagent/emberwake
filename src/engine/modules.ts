import type { ModuleInstance, ModuleRarity } from "../data/types";
import { MODULE_DEFS, MODULE_RARITY_ORDER, MODULE_RARITY_MULTIPLIER, moduleDefById } from "../data/modules";
import { pickOne, randomId, rollQuality } from "./rng";

/** Section B (2026-08-24): a draw is now bounded by where it came from. `maxRarity`
 * caps the market (see MARKET_MAX_RARITY) so mk4/mk5 are unpurchasable at any
 * price; `minRarity` is the rift's depth-scaled floor, which is what makes the
 * Extradimensional Battlefield the actual source of top-tier gear rather than
 * just a faster one. */
function rollModuleRarity(
  baseRarity: ModuleRarity,
  opts: { minRarity?: ModuleRarity; maxRarity?: ModuleRarity } = {},
): ModuleRarity {
  const baseIdx = MODULE_RARITY_ORDER.indexOf(baseRarity);
  const roll = Math.random();
  const bump = roll > 0.92 ? 2 : roll > 0.7 ? 1 : 0;
  const ceiling = opts.maxRarity ? MODULE_RARITY_ORDER.indexOf(opts.maxRarity) : MODULE_RARITY_ORDER.length - 1;
  const floor = opts.minRarity ? MODULE_RARITY_ORDER.indexOf(opts.minRarity) : 0;
  // Floor wins over ceiling if they conflict — a guaranteed rift reward should
  // never be silently downgraded by a caller's cap.
  const idx = Math.max(floor, Math.min(ceiling, baseIdx + bump));
  return MODULE_RARITY_ORDER[Math.min(MODULE_RARITY_ORDER.length - 1, idx)];
}

/** How good a module the rift hands out, by the deepest wave cleared in the run.
 * mk4 and mk5 exist ONLY here — no shop stocks them at any price. */
export function riftDropRarityFloor(depth: number): ModuleRarity {
  if (depth >= 7) return "mk5";
  if (depth >= 4) return "mk4";
  if (depth >= 2) return "mk3";
  return "mk2";
}

/** A roll of 0 gives 88% of the rarity's baseline stat, 0.5 (neutral) gives exactly
 * 100%, and 1 gives 112% — mirrors ships' qualityMultiplier so a mk3 weapon is a range,
 * not a fixed number, while staying narrow enough (±12%) that it can't invert tier
 * ordering given MODULE_RARITY_MULTIPLIER's ~1.32x-per-tier gap — verified in
 * ships.test.ts's tier-overlap check (see docs/design-principles.md's Player-Tested
 * Anti-Patterns #6). */
export function qualityMultiplier(roll: number): number {
  return 0.88 + roll * 0.24;
}

export function drawModule(
  defId?: string,
  opts: { minRarity?: ModuleRarity; maxRarity?: ModuleRarity } = {},
): ModuleInstance {
  const def = defId ? moduleDefById(defId) : pickOne(MODULE_DEFS);
  const rarity = rollModuleRarity(def.baseRarity, opts);
  const traitCount = 1 + Math.floor(Math.random() * Math.min(3, def.traitPool.length));
  // traitPool is effect ids (see data/moduleEffects.ts). The signature effect is
  // always present and is not part of the rolled variance.
  const traits = shuffle([...def.traitPool]).slice(0, traitCount);
  const quality = rollQuality(MODULE_RARITY_ORDER.indexOf(rarity), MODULE_RARITY_ORDER.length);
  return {
    id: randomId("module"),
    defId: def.id,
    rarity,
    level: 1,
    traits,
    lockedTraitSlot: null,
    quality,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function computeModuleDamage(mod: ModuleInstance): number {
  const def = moduleDefById(mod.defId);
  const base = def.baseDamage ?? 0;
  const rarityMult = MODULE_RARITY_MULTIPLIER[mod.rarity];
  const levelMult = moduleLevelMultiplier(mod.level);
  const rollMult = qualityMultiplier(mod.quality ?? 0.5);
  return Math.round(base * rarityMult * levelMult * rollMult);
}

/** Trait-driven crit chance for a fired weapon: a base proc rate, the ship's own
 * gunnery-quality roll, a boost if the module rolled the "crit" trait, and a further
 * boost from the player's current combo. */
export function computeCritChance(mod: ModuleInstance, comboCount: number, shipBaseCrit: number = 0): number {
  const base = 0.08;
  const traitBonus = mod.traits.includes("crit") ? 0.12 : 0;
  const comboBonus = Math.min(0.2, comboCount * 0.02);
  return Math.min(0.75, base + shipBaseCrit + traitBonus + comboBonus);
}

export function computeModuleBlock(mod: ModuleInstance): number {
  const def = moduleDefById(mod.defId);
  const base = def.baseBlock ?? 0;
  const rarityMult = MODULE_RARITY_MULTIPLIER[mod.rarity];
  const levelMult = 1 + (mod.level - 1) * 0.12;
  const rollMult = qualityMultiplier(mod.quality ?? 0.5);
  return Math.round(base * rarityMult * levelMult * rollMult);
}

/** Module leveling, per docs/systems-design.md: "Level: upgraded with Alloy,
 * independent of Rarity" — and the resource split it exists to serve, "Source
 * Points always answers 'get something new,' Alloy always answers 'make something
 * you already have better'."
 *
 * This was dead code until 2026-08-24: levelUpModule existed with no caller, so
 * every module sat at level 1 forever and the +12%/level term below never fired.
 * Alloy correspondingly had almost nothing to spend on. Both are now live.
 *
 * The cap rises with rarity so rarity buys long-term investment headroom, not just
 * a bigger starting number — a mk5 stays worth upgrading long after a mk1 has
 * topped out. */
/** Exponential stat growth (player direction 2026-08-24), replacing the old linear
 * +12%/level. A maxed mk5 (L13) now reaches ~5.5x its base instead of ~2.4x, so
 * late levels are the ones worth chasing — paired with an exponential cost curve
 * below, upgrading becomes a decision about where to concentrate Alloy rather than
 * a checklist to complete on everything you own. */
export function moduleLevelMultiplier(level: number): number {
  return Math.pow(1.14, level - 1);
}

export function moduleMaxLevel(rarity: ModuleRarity): number {
  return 5 + MODULE_RARITY_ORDER.indexOf(rarity) * 2;
}

export function isModuleMaxed(mod: ModuleInstance): boolean {
  return mod.level >= moduleMaxLevel(mod.rarity);
}

/** Alloy for the next level — exponential, matching the exponential stat growth
 * above (player direction 2026-08-24).
 *
 * Still calibrated against measured income: all six acts of story combat pay 4,535
 * Alloy combined, a depth-7 rift run ~920. At 18 x rarityMult x 1.55^(level-1) the
 * full-max ladder is roughly mk1 250 / mk2 1,300 / mk3 8,700 / mk4 63,000 /
 * mk5 480,000 — deliberately steep at the top: a fully maxed mk5 is a long-term
 * ambition, not a box to tick, and the early levels stay cheap enough that every
 * module is worth putting a few levels into. */
export function moduleUpgradeCost(mod: ModuleInstance): number {
  const rarityMult = MODULE_RARITY_MULTIPLIER[mod.rarity];
  return Math.round(18 * rarityMult * Math.pow(1.55, mod.level - 1));
}


export function levelUpModule(mod: ModuleInstance): ModuleInstance {
  if (isModuleMaxed(mod)) return mod;
  return { ...mod, level: mod.level + 1 };
}

export function lockTrait(mod: ModuleInstance, traitId: string, slotIndex: number): ModuleInstance {
  const traits = [...mod.traits];
  traits[slotIndex] = traitId;
  return { ...mod, traits, lockedTraitSlot: slotIndex };
}
