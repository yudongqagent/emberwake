import type { EncounterDef, EnemyShipDef, EnemyRole, ResourceType } from "./types";

/** 异空间战场 — the Extradimensional Battlefield.
 *
 * Corrected 2026-08-24 on player report: this is the protagonist's own POWER, not
 * a place on the map. It was previously modelled as a "Rift Pocket" POI you flew
 * to and which respawned on a timer — wrong on every axis. It's entered at will
 * from the bridge, it exists outside the star map entirely, its opponents are
 * generated fresh each time rather than drawn from a fixed table, and it pays out
 * far above normal combat.
 *
 * This also lines up better with the source novel than the old model did (see
 * docs/story/research-notes-extradimensional.md): the confirmed premise is a
 * 火种战舰 that periodically enters another space to harvest Source Points and
 * grow stronger — a property of the ship, not a location it visits.
 *
 * Structure is push-your-luck, which is what makes "enter anytime" and "high
 * rewards" coexist without becoming an infinite farm: you can dive whenever you
 * like, but every wave's haul is only PROVISIONAL until you extract. Go deeper and
 * the multiplier climbs steeply; lose, and the whole run's haul goes with it. The
 * cap on farming is your own nerve and your hull, not a cooldown timer. */

/** The rift's opponent roster.
 *
 * Player report (2026-08-25): "异空间每次应该不一样的对手和特殊奖励 看原著".
 * The dive previously drew from three archetypes that differed only in hull,
 * damage and block, so every wave was the same fight with the numbers moved —
 * which is exactly the reskin failure docs/content-depth-standards.md exists to
 * prevent.
 *
 * Sourcing, stated plainly: the novel confirms that 火种 warships dive into 异空间
 * to harvest 源点, and confirms the system abilities layered on that loop (see
 * docs/story/research-notes-extradimensional.md, re-checked 2026-08-25). It does
 * NOT describe what lives in there — no named creature, faction or hazard is
 * accessible in any source reachable so far. This roster is therefore original
 * invention built on a sourced premise, not something recovered from the novel.
 *
 * Each entry differs in a way the combat engine actually reads — regeneration,
 * armor-vs-evasion shape, glass-cannon damage, swarm numbers — rather than in
 * name and stat line alone. */
interface RiftArchetype {
  name: string;
  hull: number;
  damage: number;
  block: number;
  evasion: number;
  regen?: number;
  /** See EnemyRole — what this ship does for the rest of the wave. */
  role?: EnemyRole;
  /** Relative frequency, before the depth weighting below. */
  weight: number;
  /** Depth this archetype starts appearing at — the roster itself changes as you
   * dive, so depth 9 isn't depth 2 with bigger numbers. */
  minDepth: number;
  /** Scales this archetype's share of the wave's enemy budget: a Sovereign counts
   * for more than a Mote, so waves stay fair as composition varies. */
  cost: number;
}

const ARCHETYPES: RiftArchetype[] = [
  // --- shallow: fast, fragile, numerous ---
  { name: "Rift Flicker", hull: 75, damage: 11, block: 2, evasion: 0.18, weight: 5, minDepth: 1, cost: 1 },
  { name: "Rift Mote", hull: 46, damage: 8, block: 0, evasion: 0.3, weight: 4, minDepth: 1, cost: 0.7 },
  { name: "Rift Warden", hull: 210, damage: 17, block: 8, evasion: 0.12, weight: 3, minDepth: 1, cost: 1.4 },
  // --- mid: specialists that demand different answers ---
  // Almost unhittable, trivial to kill if you connect — punishes low accuracy.
  { name: "Rift Wisp", hull: 60, damage: 14, block: 0, evasion: 0.45, weight: 3, minDepth: 2, cost: 1 },
  // Heavy plating, low evasion — the armor-piercing check.
  { name: "Rift Bulwark", hull: 300, damage: 13, block: 26, evasion: 0.02, weight: 3, minDepth: 2, cost: 1.5, role: "anchor" },
  // Heals itself every turn: a damage-per-second floor, not a health pool.
  { name: "Rift Knitter", hull: 240, damage: 12, block: 6, evasion: 0.1, regen: 9, weight: 2, minDepth: 3, cost: 1.5, role: "mender" },
  // Glass cannon — kill it first or lose hull you can't get back mid-dive.
  { name: "Rift Lance", hull: 95, damage: 38, block: 1, evasion: 0.14, weight: 2, minDepth: 3, cost: 1.4 },
  // --- deep: the wave-defining threats ---
  { name: "Rift Sovereign", hull: 460, damage: 25, block: 14, evasion: 0.1, weight: 2, minDepth: 4, cost: 2.2 },
  { name: "Rift Choirmass", hull: 380, damage: 20, block: 10, evasion: 0.08, regen: 14, weight: 2, minDepth: 5, cost: 2, role: "mender" },
  { name: "Rift Harrower", hull: 260, damage: 33, block: 9, evasion: 0.22, weight: 2, minDepth: 6, cost: 2 },
  { name: "Rift Colossus", hull: 900, damage: 30, block: 30, evasion: 0.0, weight: 1, minDepth: 7, cost: 3.2, role: "artillery" },
  { name: "Rift Devourer", hull: 620, damage: 44, block: 16, evasion: 0.16, regen: 20, weight: 1, minDepth: 9, cost: 3.4 },
];

/** A per-wave anomaly (异象). The roster alone still produces recognisably similar
 * waves; the anomaly changes the *rules* of one wave, so two depth-5 dives can
 * demand different play. One is rolled per wave from depth 2, and it's named on
 * the combat screen so the player knows what they walked into. */
export type RiftAnomalyId =
  | "none"
  | "swarm"        // many weak enemies
  | "titan"        // one oversized enemy
  | "brittle"      // high damage, low hull all round
  | "entrenched"   // heavy armor all round
  | "unstable"     // wildly varied stats within the wave
  | "regenerative" // everything knits itself back together
  | "rich";        // fewer enemies, far bigger payout

export interface RiftAnomaly {
  id: RiftAnomalyId;
  /** Multiplies the wave's enemy budget. */
  budget: number;
  hull: number;
  damage: number;
  block: number;
  regen: number;
  /** Multiplies this wave's contribution to the haul — the compensation for the
   * anomaly's difficulty, and the reason "rich" is worth surviving. */
  haul: number;
  weight: number;
  minDepth: number;
}

export const RIFT_ANOMALIES: RiftAnomaly[] = [
  { id: "none",        budget: 1,    hull: 1,    damage: 1,    block: 1,   regen: 1, haul: 1,    weight: 5, minDepth: 1 },
  { id: "swarm",       budget: 1.6,  hull: 0.55, damage: 0.7,  block: 0.6, regen: 1, haul: 1.15, weight: 3, minDepth: 2 },
  { id: "titan",       budget: 0.75, hull: 2.2,  damage: 1.35, block: 1.3, regen: 1, haul: 1.2,  weight: 3, minDepth: 3 },
  { id: "brittle",     budget: 1.1,  hull: 0.5,  damage: 1.7,  block: 0.4, regen: 1, haul: 1.2,  weight: 3, minDepth: 2 },
  { id: "entrenched",  budget: 1,    hull: 1.1,  damage: 0.85, block: 2.4, regen: 1, haul: 1.25, weight: 3, minDepth: 3 },
  { id: "unstable",    budget: 1,    hull: 1,    damage: 1,    block: 1,   regen: 1, haul: 1.3,  weight: 2, minDepth: 4 },
  { id: "regenerative",budget: 0.9,  hull: 1.1,  damage: 0.95, block: 1,   regen: 3, haul: 1.35, weight: 2, minDepth: 5 },
  { id: "rich",        budget: 0.7,  hull: 1.5,  damage: 1.25, block: 1.2, regen: 1, haul: 2.2,  weight: 1, minDepth: 4 },
];

/** Per-depth stat growth. Tuned so depth ~6 is a genuine wall for a mid-game ship
 * and the curve keeps biting after that, rather than flattening into a safe farm. */
const DEPTH_SCALE = 1.22;

function pickAnomaly(depth: number): RiftAnomaly {
  const pool = RIFT_ANOMALIES.filter((a) => depth >= a.minDepth);
  // "none" thins out with depth: shallow dives stay legible while you learn the
  // mode, deep ones are nearly always warped by something.
  const weights = pool.map((a) => (a.id === "none" ? Math.max(0.5, a.weight - depth * 0.5) : a.weight));
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[0];
}

function pickArchetype(depth: number): RiftArchetype {
  const pool = ARCHETYPES.filter((a) => depth >= a.minDepth);
  // Deeper runs weight toward the heavier archetypes — a depth-9 wave shouldn't
  // just be more Flickers, it should be a different KIND of fight.
  const weights = pool.map((a) => a.weight * (a.cost <= 1 ? Math.max(0.25, 1 - depth * 0.08) : 1 + depth * 0.1 * (a.cost - 1)));
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[0];
}

/** Enemy budget for a wave, spent on archetypes by their `cost`. Budget rather
 * than a flat count is what lets composition genuinely vary: the same budget buys
 * five Motes or two Sovereigns, so "how many am I facing" stops being a function
 * of depth alone. */
function riftBudget(depth: number): number {
  return 2 + depth * 0.55;
}

/** Kept for the between-waves preview, which wants a rough headcount rather than
 * the exact roll (the wave isn't generated until you commit to diving). */
export function riftEnemyCount(depth: number): number {
  return Math.max(1, Math.min(6, Math.round(riftBudget(depth) / 1.2)));
}

export interface RiftWave {
  encounter: EncounterDef;
  anomaly: RiftAnomalyId;
  /** Multiplier this wave applies to its own haul contribution. */
  haulMultiplier: number;
}

/** Builds one wave. Every call produces a different composition — that randomness
 * is the point, per the player brief ("里面的对手随机出现"). Composition now varies
 * along three axes rather than one: which archetypes exist at this depth, how the
 * budget happens to be spent among them, and which anomaly warps the whole wave. */
export function generateRiftWaveFull(depth: number): RiftWave {
  const scale = Math.pow(DEPTH_SCALE, depth - 1);
  const anomaly = pickAnomaly(depth);
  let budget = riftBudget(depth) * anomaly.budget;

  const enemies: EnemyShipDef[] = [];
  // Spend the budget, always fielding at least one enemy however the rolls land.
  let guard = 0;
  while (budget > 0.4 && enemies.length < 8 && guard++ < 40) {
    const a = pickArchetype(depth);
    if (a.cost > budget && enemies.length > 0) break;
    budget -= a.cost;
    // ±12% per-instance jitter so two same-archetype enemies in one wave still
    // aren't identical. "unstable" widens that spread dramatically, which is the
    // whole character of that anomaly.
    const spread = anomaly.id === "unstable" ? 0.55 : 0.12;
    const j = () => 1 - spread + Math.random() * spread * 2;
    const regen = a.regen ?? 0;
    enemies.push({
      name: a.name,
      hull: Math.max(1, Math.round(a.hull * scale * anomaly.hull * j())),
      damage: Math.max(1, Math.round(a.damage * scale * anomaly.damage * j())),
      block: Math.max(0, Math.round(a.block * scale * anomaly.block * j())),
      evasion: a.evasion,
      ...(a.role ? { role: a.role } : {}),
      ...(regen > 0 || anomaly.regen > 1
        ? { regen: Math.max(1, Math.round((regen || 4) * scale * anomaly.regen)) }
        : {}),
    });
  }
  if (enemies.length === 0) {
    const a = ARCHETYPES[0];
    enemies.push({ name: a.name, hull: Math.round(a.hull * scale), damage: Math.round(a.damage * scale), block: a.block, evasion: a.evasion });
  }

  const encounter: EncounterDef = {
    id: `riftWave_${depth}_${Math.random().toString(36).slice(2, 8)}`,
    name: `Rift Incursion — Depth ${depth}`,
    faction: "riftEchoes",
    // Every third wave is a heavier "anchor" wave — gives the depth curve a
    // rhythm instead of a smooth ramp, and makes the extract/dive choice spikier
    // right before one.
    isBoss: depth % 3 === 0,
    enemies,
    // Deliberately empty: the run's haul is provisional until extraction, so
    // resolveCombatVictory must NOT grant anything per-wave. See riftWaveHaul.
    rewards: {},
    xp: Math.round(40 * scale),
    // Never a fleet battle — allied ships don't follow you into the rift. The
    // riftEchoes faction is also hard-excluded in Combat.tsx as defense in depth.
    fleetBattle: false,
  };
  return { encounter, anomaly: anomaly.id, haulMultiplier: anomaly.haul };
}

/** Back-compat shape for callers that only need the encounter. */
export function generateRiftWave(depth: number): EncounterDef {
  return generateRiftWaveFull(depth).encounter;
}

/** What one cleared wave adds to the provisional haul. Steep on purpose — this is
 * the "高额奖励" half of the brief, and it's what makes pushing one wave deeper a
 * real temptation against a hull that doesn't heal between waves. */
/** 源点获取倍率 — the Source Point multiplier.
 *
 * One of the two system abilities the novel actually names, alongside 词条自选:
 * every source repeats that the protagonist's system lets a warship pull
 * "三倍、五倍甚至百倍" the Source Points others would take from the same dive (see
 * docs/story/research-notes-extradimensional.md). It had never been implemented.
 * As the rift's signature reward it does exactly what the push-your-luck structure
 * wants: the payoff for going deeper isn't only a bigger number, it's the chance
 * of a number that changes your week — and it's provisional like everything else,
 * so a 100x surge you fail to extract with is a story rather than a windfall.
 *
 * Weighted so 3x is a regular thrill, 5x is a good night, and 100x is a rare deep
 * event that cannot happen in the shallows at all.
 *
 * Rates tuned down after measuring the first pass: 100x at 1.2% per wave meant a
 * ~22% chance of hitting it in a single 20-wave session, and at depth 8 a single
 * 100x roll pays ~73,000 Source Points — roughly fifteen times the entire story
 * campaign's income. That isn't a jackpot, it's an off-switch for the economy.
 * At 0.15% and gated to depth 8+ it stays the thing you've heard about rather
 * than the thing you plan around. */
export function rollSourceSurge(depth: number): number {
  const r = Math.random();
  if (depth >= 8 && r < 0.0015) return 100;
  if (depth >= 3 && r < 0.05) return 5;
  if (r < 0.18) return 3;
  return 1;
}

export function riftWaveHaul(depth: number, multiplier: number = 1, sourceSurge: number = 1): Partial<Record<ResourceType, number>> {
  const scale = Math.pow(1.35, depth - 1) * multiplier;
  return {
    // The surge multiplies Source Points only — it's a 源点 ability, not a
    // blanket loot multiplier, which also keeps a 100x roll from trivialising
    // the ascension and alloy economies in one dive.
    sourcePoints: Math.round(90 * scale * sourceSurge),
    salvage: Math.round(70 * scale),
    alloy: Math.round(45 * scale),
    // Origin Essence — the ascension currency — only starts appearing at depth 3,
    // so the rift is a genuine alternative route to hull tiers for a player
    // willing to take the risk, without trivializing the story-gated supply.
    originEssence: depth >= 3 ? Math.round(18 * Math.pow(1.3, depth - 3)) : 0,
    insight: depth >= 5 ? Math.round(3 * Math.pow(1.2, depth - 5)) : 0,
  };
}

export function addHaul(
  a: Partial<Record<ResourceType, number>>,
  b: Partial<Record<ResourceType, number>>,
): Partial<Record<ResourceType, number>> {
  const out: Partial<Record<ResourceType, number>> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (!v) continue;
    out[k as ResourceType] = (out[k as ResourceType] ?? 0) + v;
  }
  return out;
}
