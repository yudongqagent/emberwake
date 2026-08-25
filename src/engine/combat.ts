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

export const CRIT_MULTIPLIER = 1.75;

/** Deterministic given supplied rolls, so combat math is unit-testable without RNG.
 * critChance defaults to 0 (never crits) so existing callers are unaffected. */
export function resolveAttack(
  baseDamage: number,
  targetBlock: number,
  targetEvasion: number,
  rangeMultiplier: number,
  roll: number = Math.random(),
  critChance: number = 0,
  critRoll: number = Math.random(),
): AttackResult {
  if (roll < targetEvasion) {
    return { hit: false, damageDealt: 0, crit: false };
  }
  const crit = critRoll < critChance;
  const raw = Math.max(1, Math.round(baseDamage * rangeMultiplier * (crit ? CRIT_MULTIPLIER : 1)) - targetBlock);
  return { hit: true, damageDealt: raw, crit };
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

/** Bridge-command redesign (section G/H of the 2026-08-24 player brief, see
 * docs/story/research-notes-bridge-command.md): the player no longer flies the
 * ship in continuous space, so range is no longer a literal pixel distance — it's
 * a discrete tug-of-war between the player's stance order and the enemy faction's
 * own preferred range, advanced once per combat tick. This replaces
 * rangeBandFromDistance/RANGE_BAND_DISTANCE entirely. */
export type StanceOrder = "close" | "hold" | "retreat";

export const RANGE_ORDER: RangeBand[] = ["close", "mid", "long"];

export interface RangeState {
  band: RangeBand;
  /** Signed progress toward the next transition: positive = toward closing
   * (lower index), negative = toward opening (higher index). Resets toward 0 the
   * instant a transition actually happens — reversing direction mid-transition
   * genuinely costs back the ground already gained, it isn't free to flip-flop. */
  progress: number;
}

/** Advances range by one tick. `playerRate`/`enemyRate` are progress-per-second at
 * full pull (0 disables that side entirely) — the caller derives these from ship
 * speed and a faction baseline respectively, keeping this function pure/testable.
 * The enemy pulls toward its own `enemyPreferred` band whenever it differs from
 * the current one; contributes nothing once already there. */
export function advanceRangeBand(
  current: RangeState,
  playerOrder: StanceOrder,
  enemyPreferred: RangeBand,
  playerRate: number,
  enemyRate: number,
  dt: number,
): RangeState {
  const idx = RANGE_ORDER.indexOf(current.band);
  const enemyIdx = RANGE_ORDER.indexOf(enemyPreferred);
  const playerDelta = playerOrder === "close" ? playerRate * dt : playerOrder === "retreat" ? -playerRate * dt : 0;
  const enemyDelta = enemyIdx < idx ? enemyRate * dt : enemyIdx > idx ? -enemyRate * dt : 0;
  let progress = current.progress + playerDelta + enemyDelta;

  if (progress >= 1 && idx > 0) {
    return { band: RANGE_ORDER[idx - 1], progress: progress - 1 };
  }
  if (progress <= -1 && idx < RANGE_ORDER.length - 1) {
    return { band: RANGE_ORDER[idx + 1], progress: progress + 1 };
  }
  // At an extreme, there's nowhere further to go in that direction — clamp
  // instead of letting progress build up invisibly past the wall.
  if (idx === 0) progress = Math.min(progress, 0);
  if (idx === RANGE_ORDER.length - 1) progress = Math.max(progress, 0);
  return { band: current.band, progress };
}

/** Bonus armour an `anchor` enemy projects onto the ship at `index`.
 *
 * Part of the answer to "战斗还是很无聊" (player report 2026-08-25): with auto-fire,
 * the only decision a fight leaves is which target to focus, and identical stat
 * blocks made that decision meaningless. An anchor makes the formation itself the
 * puzzle — everything it protects is markedly tougher until it dies.
 *
 * Pure and exported so the rule is testable on its own; Combat.tsx applies it at
 * the player's hit-resolution site. Two properties matter and are covered by
 * tests: an anchor never armours itself (so it's always the softest way in), and
 * a dead anchor protects nothing.
 */
export const ANCHOR_BLOCK_FRACTION = 0.75;
export const ANCHOR_BLOCK_FLAT = 4;

export function anchorBonusBlock(
  enemies: readonly { hull: number; block: number; role?: string }[],
  index: number,
): number {
  const self = enemies[index];
  if (!self) return 0;
  // An anchor doesn't armour itself: it would remove the whole point of killing
  // it first, since the counterplay is that the anchor is the soft target.
  if (self.role === "anchor") return 0;
  const anchored = enemies.some((e, i) => i !== index && e.hull > 0 && e.role === "anchor");
  if (!anchored) return 0;
  return Math.round(self.block * ANCHOR_BLOCK_FRACTION) + ANCHOR_BLOCK_FLAT;
}
