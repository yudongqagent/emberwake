import type { ModuleFamily, ModuleInstance } from "./types";
import { moduleDefById } from "./modules";
import { moduleMaxLevel } from "../engine/modules";

/** 武器进化 — Weapon Evolution.
 *
 * Core-loop redesign #4 (docs/core-loop-redesign.md). From Vampire Survivors:
 * "taking a weapon to max level while also holding a specific passive transforms
 * it into something dramatically stronger, and that promise of a payoff is what
 * makes the draft choices feel meaningful."
 *
 * The gap it fills: after the weapon rebuild the roster is finally varied, but a
 * module's ceiling was still just "level it up". There was nothing to aim at.
 *
 * The important half is not the reward, it's the *visibility*. An evolution you
 * can see three fights away changes what you take from a Refit Draft — you start
 * picking the partner module deliberately instead of taking whatever reads best
 * right now. That anticipation is the mechanic; the stat bump is the payoff.
 *
 * One evolution per family, each requiring a partner that matches that family's
 * doctrine, so the requirement is guessable rather than a lookup table.
 */

export interface Evolution {
  family: ModuleFamily;
  /** Effect the partner module must provide (signature or rolled trait). */
  partnerEffect: string;
  /** Display name of the evolved weapon. */
  name: string;
  nameCn: string;
  /** The signature the evolved weapon carries instead of its original. */
  signature: string;
  /** Multiplier on the weapon's damage once evolved. */
  damageMult: number;
}

export const EVOLUTIONS: Evolution[] = [
  // Precision doctrine: a marked target and a disciplined gun become a killshot.
  { family: "bauhinia", partnerEffect: "mark", name: "Sovereign's Verdict", nameCn: "君权裁决", signature: "execute", damageMult: 1.55 },
  // Duelling: an opener plus a finisher is the whole Lionsheart philosophy.
  { family: "lionsheart", partnerEffect: "opener", name: "Last Word", nameCn: "终末之言", signature: "finisher", damageMult: 1.6 },
  // Efficiency: coolant on an already-fast gun becomes a continuous stream.
  { family: "swanreach", partnerEffect: "coolant", name: "Perpetual Ledger", nameCn: "永续账册", signature: "barrage", damageMult: 1.35 },
  // Frenzy: rampage feeding a close-range chatter gun.
  { family: "reaver", partnerEffect: "rampage", name: "Red Tide", nameCn: "赤潮", signature: "overkill", damageMult: 1.5 },
  // Attrition: many small hits become a cloud that arcs between targets.
  { family: "swarm", partnerEffect: "chainArc", name: "Hive Mind", nameCn: "蜂群意识", signature: "aoe", damageMult: 1.4 },
  // Denial: a shield-breaker that also shuts the target down.
  { family: "construct", partnerEffect: "shieldBreak", name: "Null Protocol", nameCn: "归零协议", signature: "disable", damageMult: 1.45 },
  // Decay: corrosion plus burning is the Hollow's endgame.
  { family: "hollow", partnerEffect: "corrode", name: "Long Silence", nameCn: "长寂", signature: "burn", damageMult: 1.5 },
  // Instability: a phase-stepping gun that splits reality further.
  { family: "rift", partnerEffect: "displace", name: "Schism", nameCn: "裂解", signature: "chainArc", damageMult: 1.45 },
  // Resonance: volleys building to a chord.
  { family: "choir", partnerEffect: "novaCharge", name: "Final Chord", nameCn: "终章和弦", signature: "volley", damageMult: 1.45 },
  // Relic: the exotic weapons bend the rules further still.
  { family: "mayeth", partnerEffect: "exploit", name: "First Light", nameCn: "初光", signature: "overkill", damageMult: 1.65 },
];

export function evolutionForFamily(family: string): Evolution | undefined {
  return EVOLUTIONS.find((e) => e.family === family);
}

function providesEffect(m: ModuleInstance, effect: string): boolean {
  const def = moduleDefById(m.defId);
  return def.signature === effect || m.traits.includes(effect);
}

/** Whether this weapon can evolve right now, given what else is equipped.
 *
 * Two requirements, both legible from the module cards the player already reads:
 * the weapon is at its level cap, and something else in the fit provides the
 * partner effect. The partner is never the weapon itself — an evolution has to
 * cost a socket, or it would just be a free upgrade with extra steps. */
export function canEvolve(weapon: ModuleInstance, equipped: ModuleInstance[]): boolean {
  const def = moduleDefById(weapon.defId);
  if (def.type !== "weapon") return false;
  if (weapon.evolved) return false;
  if (weapon.level < moduleMaxLevel(weapon.rarity)) return false;
  const evo = evolutionForFamily(def.family);
  if (!evo) return false;
  return equipped.some((m) => m.id !== weapon.id && providesEffect(m, evo.partnerEffect));
}

/** What's still missing, for the UI to state plainly rather than making the
 * player guess. Returns null when the weapon can evolve. */
export function evolutionBlocker(
  weapon: ModuleInstance,
  equipped: ModuleInstance[],
): "notWeapon" | "alreadyEvolved" | "needsLevel" | "needsPartner" | null {
  const def = moduleDefById(weapon.defId);
  if (def.type !== "weapon") return "notWeapon";
  if (weapon.evolved) return "alreadyEvolved";
  const evo = evolutionForFamily(def.family);
  if (!evo) return "notWeapon";
  if (weapon.level < moduleMaxLevel(weapon.rarity)) return "needsLevel";
  if (!equipped.some((m) => m.id !== weapon.id && providesEffect(m, evo.partnerEffect))) return "needsPartner";
  return null;
}

/** 这件候选模组,是不是某把武器进化所缺的那个搭档?
 *
 * 2026-08-31(/loop 第 38 轮)。这套系统自己的设计注释写着:
 *
 *     The important half is not the reward, it's the *visibility*. An evolution
 *     you can see three fights away changes what you take from a Refit Draft —
 *     you start picking the partner module deliberately.
 *
 * 而实测下来:**整备抉择卡和商店都完全不知道进化这回事**。玩家手里有一把练满的
 * 洋紫荆武器等着 mark 搭档,抉择递上来一件正好带 mark 的模组,卡面一个字都不提——
 * 他没有任何理由不去选伤害更高的那张。这套东西声明的用途,恰恰是唯一没接上的。
 *
 * 返回 "ready" 表示那把武器已经练满、只差这个搭档;"pending" 表示搭档对得上,
 * 但武器还没到等级上限——后者是"提前三场仗看见"的那一半,不能说成马上能进化。 */
export function evolutionPartnerMatch(
  candidate: ModuleInstance,
  owned: ModuleInstance[],
): { evo: Evolution; state: "ready" | "pending" } | null {
  let pending: Evolution | null = null;
  for (const weapon of owned) {
    const def = moduleDefById(weapon.defId);
    if (def.type !== "weapon" || weapon.evolved) continue;
    const evo = evolutionForFamily(def.family);
    if (!evo || !providesEffect(candidate, evo.partnerEffect)) continue;
    // 已经有别的搭档在位了,这件就不是"所缺的那个"。
    if (owned.some((m) => m.id !== weapon.id && m.id !== candidate.id && providesEffect(m, evo.partnerEffect))) continue;
    if (weapon.level >= moduleMaxLevel(weapon.rarity)) return { evo, state: "ready" };
    pending = evo;
  }
  return pending ? { evo: pending, state: "pending" } : null;
}

export function evolveModule(weapon: ModuleInstance): ModuleInstance {
  const def = moduleDefById(weapon.defId);
  const evo = evolutionForFamily(def.family);
  if (!evo) return weapon;
  return { ...weapon, evolved: true };
}
