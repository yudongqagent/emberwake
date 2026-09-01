import type { EncounterDef, EnemyShipDef, EnemyRole } from "./types";

/** 余烬负荷 — Ember Load.
 *
 * Core-loop redesign #3 (docs/core-loop-redesign.md). From Hades' Heat, and the
 * broader finding that stat-based meta-progression without a counterweight is
 * what makes roguelite progression collapse: Hades "rides the line between
 * permanent progression and heat/fear mechanics, with permanent progression
 * eventually drying up while heat difficulty continues to scale."
 *
 * Emberwake's problem was that ascension — the novel's core fantasy and the thing
 * the whole game is built around — only ever subtracted difficulty. The rift had
 * depth scaling; the campaign had nothing, so the power curve ran away.
 *
 * Load is deliberately built out of systems that already exist and are already
 * tested: enemy roles (mender/anchor/artillery) and stat scaling. It adds no new
 * combat plumbing, which is also why it can be applied to every authored
 * encounter without re-authoring any of them.
 *
 * Ascension raises Load by 1. The player may also raise it voluntarily for
 * better draft tiers and richer drops — that opt-in is the part that turns a
 * difficulty knob into a decision.
 */

/** Load contributed automatically by how far the ship has ascended. */
export function loadFromAscension(ascendedCount: number): number {
  return ascendedCount;
}

export function totalEmberLoad(ascendedCount: number, voluntary: number): number {
  return Math.max(0, loadFromAscension(ascendedCount) + voluntary);
}

/** Enemy stat scaling per point of Load. Gentle on purpose: the interesting part
 * is the roles arriving, not the numbers inflating. A pure stat ramp is the
 * failure mode this mechanic exists to avoid, not reproduce. */
export const LOAD_HULL_PCT = 0.11;
const HULL_PER_LOAD = LOAD_HULL_PCT;
export const LOAD_DAMAGE_PCT = 0.08;
const DAMAGE_PER_LOAD = LOAD_DAMAGE_PCT;

/** How the formation's single support ship escalates with Load, plus artillery
 * on top.
 *
 * The one-support-per-formation rule (see enemyRoles.test.ts) is deliberate —
 * two menders healing each other is a stalemate, not a fight — so Load cannot
 * simply stack support roles. It upgrades the one instead: an anchor first,
 * because its counterplay is legible from a single fight, then a mender, which
 * is strictly harder because it undoes damage rather than merely absorbing it.
 * Artillery is not support, so it can arrive alongside either.
 *
 * This shape was forced by a failing test: the first ladder tried to add a mender
 * on top of an anchor and silently never produced one. */
const ARTILLERY_LOAD = 4;

/** 每一级负荷跨过去会**新出现**什么。给进阶界面用:玩家在按下"进阶"之前
 *  该知道这一按会让往后每一仗多出什么东西,而不是只看见自己涨了多少血。
 *  2026-09-01(/loop 第 113 轮)。 */
export function loadThresholdCrossed(from: number, to: number): EnemyRole | "extra" | null {
  if (to <= from) return null;
  if (from < 6 && to >= 6) return "extra";
  if (from < ARTILLERY_LOAD && to >= ARTILLERY_LOAD) return "artillery";
  for (const r of [...SUPPORT_AT].sort((a, b) => a.load - b.load)) {
    if (from < r.load && to >= r.load) return r.role;
  }
  return null;
}

const SUPPORT_AT: { load: number; role: EnemyRole }[] = [
  { load: 3, role: "mender" },
  { load: 1, role: "anchor" },
];



/** Applies Load to an authored encounter. Never touches an enemy that already
 * has a role — an encounter that was designed around its own mender keeps it. */
export function applyEmberLoad(enc: EncounterDef, load: number): EncounterDef {
  if (load <= 0) return enc;

  const hullMult = 1 + load * HULL_PER_LOAD;
  const dmgMult = 1 + load * DAMAGE_PER_LOAD;

  const enemies: EnemyShipDef[] = enc.enemies.map((e) => ({
    ...e,
    hull: Math.max(1, Math.round(e.hull * hullMult)),
    damage: Math.max(1, Math.round(e.damage * dmgMult)),
  }));

  // One support ship, escalating with Load, and only where the formation has
  // room: never a lone enemy (an anchor would armour nobody) and never a
  // formation that becomes entirely support.
  const support = SUPPORT_AT.find((r) => load >= r.load);
  const hasSupport = enemies.some((e) => e.role === "anchor" || e.role === "mender");
  if (support && !hasSupport && enemies.length >= 2) {
    const candidates = enemies.filter((e) => !e.role);
    if (candidates.length > 0 && candidates.length > 1) {
      // The toughest ship without a role — a support ship that dies instantly is
      // not a decision.
      const target = [...candidates].sort((a, b) => b.hull - a.hull)[0];
      enemies[enemies.indexOf(target)] = { ...target, role: support.role };
    }
  }

  // Artillery sits outside the support slot: a telegraphed heavy strike is
  // pressure, not support, so it can arrive alongside one.
  if (load >= ARTILLERY_LOAD && !enemies.some((e) => e.role === "artillery")) {
    const candidates = enemies.filter((e) => !e.role);
    if (candidates.length > 0) {
      const target = [...candidates].sort((a, b) => b.hull - a.hull)[0];
      enemies[enemies.indexOf(target)] = { ...target, role: "artillery" };
    }
  }

  // At high Load, add an extra combatant so pressure comes from the formation and
  // not only from bigger numbers.
  if (load >= 6 && enemies.length < 6) {
    const base = enemies.reduce((weakest, e) => (e.hull < weakest.hull ? e : weakest), enemies[0]);
    enemies.push({ ...base, role: undefined });
  }

  return { ...enc, enemies };
}

/** Reward multiplier for fighting at Load — the reason to opt in. Scales more
 * slowly than the difficulty so raising Load stays a real bet rather than free
 * value, but fast enough to be worth taking. */
export function emberLoadRewardMultiplier(load: number): number {
  return 1 + load * 0.14;
}
