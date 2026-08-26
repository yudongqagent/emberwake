import type { FactionId, ModuleInstance, ModuleRarity } from "./types";
import { drawModule, moduleMaxLevel } from "../engine/modules";
import { MODULE_DEFS } from "./modules";
import { moduleDefById } from "./modules";
import { pickOne } from "../engine/rng";

/** 整备抉择 — the Refit Draft.
 *
 * Core-loop redesign #1 (docs/core-loop-redesign.md). The measured problem: the
 * whole 40-scene campaign offered 7 choices, and loot was
 * `Math.random() < dropChance ? drawModule(...) : null` — the game rolled and told
 * you what you got. Zero draft moments in the entire game.
 *
 * Every reference loop is built on this one moment instead: Slay the Spire's card
 * pick, Vampire Survivors' level-up triple. So combat now ends in a pick, not a
 * roll, roughly once every ninety seconds.
 *
 * Two rules make the randomness legible, which is the property those games
 * actually share (RNG paired with clear draft rules, not RNG alone):
 *
 * 1. The module option is biased toward the faction whose space you're in, so
 *    WHERE you fight shapes what you can build.
 * 2. Every hand contains one safe option and one greedy one. Into the Breach's
 *    rule: no option should be free.
 */

export type DraftOptionKind = "module" | "upgrade" | "boon";

export interface DraftOption {
  id: string;
  kind: DraftOptionKind;
  /** kind="module" — the rolled instance the player would receive. */
  module?: ModuleInstance;
  /** kind="upgrade" — an owned module that would gain a level for free. */
  targetModuleId?: string;
  /** kind="boon" — an effect id from data/moduleEffects.ts, active until docking. */
  boonId?: string;
  /** Greedy options are stronger and cost hull. Never more than a bruise. */
  hullCost?: number;
}

/** Boons are drawn from effects that are unambiguously good on their own and
 * don't need a specific build to function — a boon should read as a gift, not as
 * a puzzle piece you may not be able to use. */
const BOON_POOL = [
  "crit", "pierce", "coolant", "regen", "evasion", "hullBonus",
  "haste", "yieldBonus", "novaCharge", "deflect", "momentum", "recycler",
];

/** Faction → module family, for the region bias. Ids differ in a few places
 * (reavers/reaver, constructs/construct, riftEchoes/rift). */
const FAMILY_FOR_FACTION: Record<string, string> = {
  bauhinia: "bauhinia",
  lionsheart: "lionsheart",
  swanreach: "swanreach",
  reavers: "reaver",
  swarm: "swarm",
  constructs: "construct",
  hollow: "hollow",
  riftEchoes: "rift",
  choir: "choir",
};

const TIER_ORDER: ModuleRarity[] = ["mk1", "mk2", "mk3", "mk4", "mk5"];

/** The tier the draft offers, from how far the player has actually got. Kept
 * deliberately simple and legible — a player should be able to predict roughly
 * what a draft can contain. */
export function draftTierFor(shipLevel: number, greedy: boolean): ModuleRarity {
  const base = shipLevel >= 30 ? 3 : shipLevel >= 20 ? 2 : shipLevel >= 10 ? 1 : 0;
  const idx = Math.min(TIER_ORDER.length - 1, base + (greedy ? 1 : 0));
  return TIER_ORDER[idx];
}

function moduleOfFamily(family: string, tier: ModuleRarity): ModuleInstance {
  const candidates = MODULE_DEFS.filter((m) => m.family === family && m.baseRarity === tier);
  const def = candidates.length ? pickOne(candidates) : pickOne(MODULE_DEFS.filter((m) => m.baseRarity === tier));
  return drawModule(def.id, { minRarity: tier, maxRarity: tier });
}

/** Builds one hand of three. `owned` is the player's module list, used for the
 * upgrade option — offering a free level on something you already fly is what
 * turns "I found a thing" into "I invested in my thing". */
export function generateDraft(opts: {
  faction: FactionId;
  shipLevel: number;
  owned: ModuleInstance[];
  activeBoons: string[];
}): DraftOption[] {
  const { faction, shipLevel, owned, activeBoons } = opts;
  const family = FAMILY_FOR_FACTION[faction] ?? "bauhinia";
  const out: DraftOption[] = [];

  // 1. Safe: a module from the region's own tech line, at the plain tier.
  out.push({
    id: "opt-safe",
    kind: "module",
    module: moduleOfFamily(family, draftTierFor(shipLevel, false)),
  });

  // 2. Greedy: a tier above, paid for in hull.
  out.push({
    id: "opt-greedy",
    kind: "module",
    module: moduleOfFamily(family, draftTierFor(shipLevel, true)),
    hullCost: 12 + shipLevel * 2,
  });

  // 3. Either a free upgrade on something owned, or a boon when there's nothing
  // worth upgrading. Upgrades are preferred because they deepen a build rather
  // than widening it.
  const upgradable = owned.filter((m) => m.level < moduleMaxLevel(m.rarity));
  const boonCandidates = BOON_POOL.filter((b) => !activeBoons.includes(b));
  if (upgradable.length > 0 && (boonCandidates.length === 0 || Math.random() < 0.5)) {
    // Favour a module the player has actually invested in already.
    const best = [...upgradable].sort((a, b) => b.level - a.level)[0];
    out.push({ id: "opt-third", kind: "upgrade", targetModuleId: best.id });
  } else if (boonCandidates.length > 0) {
    out.push({ id: "opt-third", kind: "boon", boonId: pickOne(boonCandidates) });
  } else {
    out.push({
      id: "opt-third",
      kind: "module",
      module: moduleOfFamily(family, draftTierFor(shipLevel, false)),
    });
  }

  return out;
}

/** Human-readable summary of what an option would give, for the card. Returns
 * the module def id / effect id; the screen localizes it. */
export function draftOptionSubject(opt: DraftOption, owned: ModuleInstance[]): string {
  if (opt.kind === "module" && opt.module) return moduleDefById(opt.module.defId).id;
  if (opt.kind === "upgrade") {
    const m = owned.find((x) => x.id === opt.targetModuleId);
    return m ? moduleDefById(m.defId).id : "";
  }
  return opt.boonId ?? "";
}
