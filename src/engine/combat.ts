export type RangeBand = "close" | "mid" | "long";

export interface RangeModifier {
  outgoing: number;
  incoming: number;
}

export const RANGE_MODIFIERS: Record<RangeBand, RangeModifier> = {
  close: { outgoing: 1.2, incoming: 1.2 },
  mid: { outgoing: 1.0, incoming: 1.0 },
  long: { outgoing: 0.8, incoming: 0.8 },
};

export interface AttackResult {
  hit: boolean;
  damageDealt: number;
  crit: boolean;
}

/** Deterministic given a supplied roll, so combat math is unit-testable without RNG. */
export function resolveAttack(
  baseDamage: number,
  targetBlock: number,
  targetEvasion: number,
  rangeMultiplier: number,
  roll: number = Math.random(),
): AttackResult {
  if (roll < targetEvasion) {
    return { hit: false, damageDealt: 0, crit: false };
  }
  const raw = Math.max(1, Math.round(baseDamage * rangeMultiplier) - targetBlock);
  return { hit: true, damageDealt: raw, crit: false };
}

export interface CombatEnemyState {
  name: string;
  maxHull: number;
  hull: number;
  damage: number;
  block: number;
  evasion: number;
}

export function isEncounterCleared(enemies: CombatEnemyState[]): boolean {
  return enemies.every((e) => e.hull <= 0);
}

export function isPlayerDefeated(playerHull: number): boolean {
  return playerHull <= 0;
}

export const RANGE_BAND_DISTANCE = { close: 160, mid: 340 };

/** Combat arenas use free-flight positioning, not discrete range steps — the band is
 * just read off live distance between two ships. */
export function rangeBandFromDistance(distance: number): RangeBand {
  if (distance < RANGE_BAND_DISTANCE.close) return "close";
  if (distance < RANGE_BAND_DISTANCE.mid) return "mid";
  return "long";
}
