import type { EncounterDef, EnemyShipDef, ResourceType } from "./types";

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

/** The three Rift Echo archetypes, as templates scaled per-depth. Same names the
 * old fixed rift encounters used, so their existing Chinese translations and the
 * riftEchoes faction art/doctrine (Phase Flicker, Rift Anchor) all still apply. */
const ARCHETYPES: { name: string; hull: number; damage: number; block: number; evasion: number; weight: number }[] = [
  { name: "Rift Flicker", hull: 75, damage: 11, block: 2, evasion: 0.18, weight: 5 },
  { name: "Rift Warden", hull: 210, damage: 17, block: 8, evasion: 0.12, weight: 3 },
  { name: "Rift Sovereign", hull: 460, damage: 25, block: 14, evasion: 0.1, weight: 1 },
];

/** Per-depth stat growth. Tuned so depth ~6 is a genuine wall for a mid-game ship
 * and the curve keeps biting after that, rather than flattening into a safe farm. */
const DEPTH_SCALE = 1.22;

function pickArchetype(depth: number) {
  // Deeper runs weight toward the heavier archetypes — a depth-9 wave shouldn't
  // just be more Flickers, it should be a different KIND of fight.
  const weights = ARCHETYPES.map((a, i) => a.weight * (i === 0 ? Math.max(0.4, 1 - depth * 0.07) : 1 + depth * 0.12 * i));
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < ARCHETYPES.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return ARCHETYPES[i];
  }
  return ARCHETYPES[0];
}

export function riftEnemyCount(depth: number): number {
  return Math.min(5, 2 + Math.floor(depth / 3));
}

/** Builds one wave. Every call produces a different composition — that randomness
 * is the point, per the player brief ("里面的对手随机出现"). */
export function generateRiftWave(depth: number): EncounterDef {
  const scale = Math.pow(DEPTH_SCALE, depth - 1);
  const count = riftEnemyCount(depth);
  const enemies: EnemyShipDef[] = Array.from({ length: count }, () => {
    const a = pickArchetype(depth);
    // ±12% per-instance jitter so two same-archetype enemies in one wave still
    // aren't identical.
    const j = () => 0.88 + Math.random() * 0.24;
    return {
      name: a.name,
      hull: Math.max(1, Math.round(a.hull * scale * j())),
      damage: Math.max(1, Math.round(a.damage * scale * j())),
      block: Math.round(a.block * scale * j()),
      evasion: a.evasion,
    };
  });

  return {
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
}

/** What one cleared wave adds to the provisional haul. Steep on purpose — this is
 * the "高额奖励" half of the brief, and it's what makes pushing one wave deeper a
 * real temptation against a hull that doesn't heal between waves. */
export function riftWaveHaul(depth: number): Partial<Record<ResourceType, number>> {
  const scale = Math.pow(1.35, depth - 1);
  return {
    sourcePoints: Math.round(90 * scale),
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
