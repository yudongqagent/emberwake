import type { ModuleInstance, ModuleRarity } from "../data/types";
import { MODULE_DEFS, MODULE_RARITY_ORDER, MODULE_RARITY_MULTIPLIER, moduleDefById } from "../data/modules";
import { pickOne, randomId } from "./rng";

function rollModuleRarity(baseRarity: ModuleRarity): ModuleRarity {
  const baseIdx = MODULE_RARITY_ORDER.indexOf(baseRarity);
  const roll = Math.random();
  const bump = roll > 0.92 ? 2 : roll > 0.7 ? 1 : 0;
  const idx = Math.min(MODULE_RARITY_ORDER.length - 1, baseIdx + bump);
  return MODULE_RARITY_ORDER[idx];
}

export function drawModule(defId?: string): ModuleInstance {
  const def = defId ? moduleDefById(defId) : pickOne(MODULE_DEFS);
  const rarity = rollModuleRarity(def.baseRarity);
  const traitCount = 1 + Math.floor(Math.random() * Math.min(3, def.traitPool.length));
  const traits = shuffle(def.traitPool.map((t) => t.id)).slice(0, traitCount);
  return {
    id: randomId("module"),
    defId: def.id,
    rarity,
    level: 1,
    traits,
    lockedTraitSlot: null,
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
  const levelMult = 1 + (mod.level - 1) * 0.12;
  return Math.round(base * rarityMult * levelMult);
}

/** Trait-driven crit chance for a fired weapon: a base proc rate, boosted if the
 * module rolled the "crit" trait, boosted further by the player's current combo. */
export function computeCritChance(mod: ModuleInstance, comboCount: number): number {
  const base = 0.08;
  const traitBonus = mod.traits.includes("crit") ? 0.12 : 0;
  const comboBonus = Math.min(0.2, comboCount * 0.02);
  return Math.min(0.75, base + traitBonus + comboBonus);
}

export function computeModuleBlock(mod: ModuleInstance): number {
  const def = moduleDefById(mod.defId);
  const base = def.baseBlock ?? 0;
  const rarityMult = MODULE_RARITY_MULTIPLIER[mod.rarity];
  const levelMult = 1 + (mod.level - 1) * 0.12;
  return Math.round(base * rarityMult * levelMult);
}

export function levelUpModule(mod: ModuleInstance): ModuleInstance {
  return { ...mod, level: mod.level + 1 };
}

export function lockTrait(mod: ModuleInstance, traitId: string, slotIndex: number): ModuleInstance {
  const traits = [...mod.traits];
  traits[slotIndex] = traitId;
  return { ...mod, traits, lockedTraitSlot: slotIndex };
}
