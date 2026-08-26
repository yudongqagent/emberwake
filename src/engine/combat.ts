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

/** Weapon-system audit #9: how well a weapon likes the current range band.
 *
 * RANGE_MODIFIERS shifts damage per band identically for every weapon, so a
 * sniper and a shotgun behaved the same at every distance — exactly one weapon in
 * fifty had any range identity at all, via the `sniper` effect. A weapon's own
 * preferred band now matters, which turns the helm's stance order into a weapons
 * decision as well as a defensive one, and gives a mixed loadout a real reason to
 * exist: no single stance suits everything you're carrying.
 *
 * Deliberately gentle (+25% / -25%). Range is contested and slow to change, so a
 * harsher curve would punish the player for a band they can't always control.
 */
export function rangeProfileMultiplier(profile: string | undefined, band: RangeBand): number {
  if (!profile || profile === "flat") return 1;
  if (profile === band) return 1.25;
  const order = ["close", "mid", "long"];
  const distance = Math.abs(order.indexOf(profile) - order.indexOf(band));
  return distance >= 2 ? 0.75 : 1;
}

/** Weapon-system audit #3: power draw used to constrain nothing at all. The
 * Modules screen computed an `overdrawn` flag and painted the bar red, but
 * equipModule had no check and combat never read it — the game displayed a limit,
 * warned you for crossing it, and did nothing.
 *
 * Overdrawing now browns the ship out: weapon cooldowns stretch in proportion to
 * how far past capacity the fit is. A soft penalty rather than a hard block, for
 * two reasons — an existing save with an over-capacity loadout keeps working, and
 * "I can run this heavy gun if I accept slower cycling" is a more interesting
 * decision than a disabled button.
 *
 * Returns a cooldown multiplier >= 1. Capped so a wildly overdrawn fit is bad,
 * not bricked.
 */
export const POWER_STRAIN_CAP = 2.5;

export function powerStrainMultiplier(used: number, capacity: number): number {
  if (capacity <= 0 || used <= capacity) return 1;
  const over = (used - capacity) / capacity;
  return Math.min(POWER_STRAIN_CAP, 1 + over * 1.5);
}

/** 功率分配 — Reactor Allocation.
 *
 * Core-loop redesign #2 (docs/core-loop-redesign.md). From FTL and Star Trek:
 * Bridge Crew — "at its heart this is a resource management game, and power is
 * one of those resources to manage."
 *
 * The problem it solves: with the guns firing themselves, whole stretches of a
 * fight had nothing to decide. Enemy roles gave the player a target-priority
 * question; this gives them a continuous one that is about tuning the ship
 * rather than about reflexes — which is the bridge-command fantasy the game
 * already claims.
 *
 * Three channels share a fixed number of pips. Boosting one starves another, so
 * there is no correct setting, only a setting suited to the enemy in front of
 * you and the loadout you drafted.
 */
export type ReactorChannel = "weapons" | "shields" | "engines";

export const REACTOR_PIPS = 6;

export interface ReactorAllocation {
  weapons: number;
  shields: number;
  engines: number;
}

export const DEFAULT_ALLOCATION: ReactorAllocation = { weapons: 2, shields: 2, engines: 2 };

/** Moves one pip into `channel`, taking it from whichever other channel can
 * spare it. Returns the original allocation when no pip can be moved, so the
 * caller can treat this as a no-op rather than special-casing the full state. */
export function shiftReactor(alloc: ReactorAllocation, channel: ReactorChannel): ReactorAllocation {
  const total = alloc.weapons + alloc.shields + alloc.engines;
  if (total < REACTOR_PIPS) return { ...alloc, [channel]: alloc[channel] + 1 };
  // Take from the channel with the most to give, excluding the target. Ties
  // resolve in a fixed order so the control is predictable under repeated taps.
  const others = (["weapons", "shields", "engines"] as ReactorChannel[]).filter((c) => c !== channel);
  const donor = others.reduce((best, c) => (alloc[c] > alloc[best] ? c : best), others[0]);
  if (alloc[donor] <= 0) return alloc;
  return { ...alloc, [channel]: alloc[channel] + 1, [donor]: alloc[donor] - 1 };
}

/** Weapon cadence multiplier. 2 pips is neutral, so the default allocation
 * changes nothing and a player who never touches the control is not penalised
 * for ignoring it — they simply give up the upside. */
export function weaponsCadenceMultiplier(pips: number): number {
  return 1 - (pips - 2) * 0.1;
}

/** Incoming-damage multiplier from the shields channel. */
export function shieldsDamageMultiplier(pips: number): number {
  return 1 - (pips - 2) * 0.09;
}

/** Multiplier on how fast the helm's stance order moves the range band, and on
 * evasion, from the engines channel. */
export function enginesRateMultiplier(pips: number): number {
  return 1 + (pips - 2) * 0.22;
}

export function enginesEvasionBonus(pips: number): number {
  return Math.max(0, (pips - 2) * 0.04);
}
