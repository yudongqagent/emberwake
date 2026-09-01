/** 一个"回合"折算成多少秒,以及自动开火的最快间隔。
 *
 * 2026-09-01(/loop 第 76 轮)。这两个数原来抄了三份:Combat.tsx 一份、
 * weapons.test.ts 一份,而模组数值行想算每秒伤害时只能再抄第四份。
 * 武器的射速节奏是**规则**,规则该只有一个出处——挪到这里,谁要用谁 import。 */
export const TURN_SECONDS = 2.4;
export const AUTO_FIRE_MIN_INTERVAL = 0.6;

/** 一件武器的实际开火周期(秒)。卡片上的每秒伤害和战斗里的冷却走同一个函数。 */
export function weaponCycleSeconds(cooldown: number): number {
  return Math.max(AUTO_FIRE_MIN_INTERVAL, cooldown * TURN_SECONDS);
}

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

/** 格挡最多能吃掉一次攻击的多少。
 *
 * 2026-08-31 实测(/loop 第 21 轮)。格挡原本是**直接减法**,而两边的量级完全不在
 * 一个数量级上:
 *
 *     全游戏 92 个敌人条目的伤害:  最小 4   中位 15   最大 132
 *     单件 mk5 满级装甲的格挡:                        158
 *     装甲槽上限 11 个,配满:                         1487
 *
 * 也就是说**一件练满的装甲就已经超过全游戏最重的一击**,之后每次挨打都落在
 * `Math.max(1, ...)` 的地板上,吃 1 点伤害。55 级存档在威胁 7 的星区打一整场,
 * 战后报告写的是「承受伤害 0」。
 *
 * 一个打不输的游戏没有张力可言。搜到的说法是玩家需要"可控的失败"——自己做错了
 * 什么导致了失败;而这里连失败本身都不存在。
 *
 * 不去膨胀敌人数值(那正是余烬负荷刻意避免的失败模式),而是给减伤加个上限:
 * 一击至少要落下 25%。早期完全不受影响(格挡 8 对伤害 15,min(8, 11.25)=8,
 * 和原来一样),只砍掉跑飞的那一端。
 *
 * 同一条规则对敌人也生效,顺手修掉镜像的毛病:早期玩家伤害 20 打锚定舰的格挡 56,
 * 原来永远只有 1 点,现在是 5 点。 */
export const MAX_BLOCK_FRACTION = 0.75;

/** 闪避的边际收益递减。
 *
 * 2026-08-31(/loop 第 24 轮)。原来是一刀切的 `Math.min(0.75, raw)`,而随手一套
 * 终局装备的裸闪避是 **94.5%** —— 上限被打满还富余一大截。硬上限的坏处正在这里:
 * 一旦越过,再多的投入不涨,减一件也不掉,这条属性连同它所有的词条一起变成死数。
 *
 * 搜到的共识是宁可用递减也别用硬顶,而且闪避超过 30–50% 之后战斗会变成"大量的
 * 空挥和等待"。所以:30% 以内原样(早期完全不受影响),超出的部分只按四分之一计,
 * 再压一个 60% 的绝对天花板——要摸到它需要 150% 的裸闪避,那是一整套押上去的
 * 专精build 才有的数字,而不是随手装出来的。 */
export const EVASION_SOFT_CAP = 0.30;
export const EVASION_HARD_CAP = 0.60;
export const EVASION_OVERFLOW_RATE = 0.25;

export function effectiveEvasion(raw: number): number {
  if (raw <= EVASION_SOFT_CAP) return Math.max(0, raw);
  return Math.min(EVASION_HARD_CAP, EVASION_SOFT_CAP + (raw - EVASION_SOFT_CAP) * EVASION_OVERFLOW_RATE);
}

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
  const incoming = Math.round(baseDamage * rangeMultiplier * (crit ? CRIT_MULTIPLIER : 1));
  const absorbed = Math.min(targetBlock, incoming * MAX_BLOCK_FRACTION);
  const raw = Math.max(1, Math.round(incoming - absorbed));
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

/** 一个主动技能的"冷却步数"折算成多少秒。
 *
 * 2026-08-31(/loop 第 52 轮)。在这之前是 `activeCooldown * TURN_SECONDS`(×2.4)。
 * 拿实测的战斗长度(中位 11.6 秒,见 rangeTimescale.test.ts)对一遍:
 *
 *     步数 2   4.8 秒   一场仗能用 3 次    1 个技能
 *     步数 3   7.2 秒            2 次    3 个
 *     步数 4   9.6 秒            2 次    5 个
 *     步数 5  12.0 秒            1 次    6 个
 *     步数 6  14.4 秒            1 次    1 个
 *     步数 7  16.8 秒            1 次    3 个
 *     步数 8  19.2 秒            1 次    1 个
 *     步数 9  21.6 秒            1 次    1 个
 *
 * **21 个技能里 12 个一场仗只能用一次**——它们的冷却数字是装饰,按下去之后那个
 * 倒计时到打完都走不完。更糟的是步数 5 和步数 9:数据上是 1.8 倍的设计代价,
 * 实际效果**完全相同**(都是一次)。也就是说冷却这条平衡轴在上半段是空的。
 *
 * 搜到的原话:"冷却比一场遭遇战还长的技能会变成死按钮",以及"冷却超过 6 秒,
 * 玩家就会开始忘记它的存在"。
 *
 * 现在把 2..9 映射到 3.0..9.3 秒,全部落在一场仗之内:每个技能至少能用两次
 * (冷却成为一个活的数字),而步数之间重新有了区别。
 *
 * 这**是一次玩家增强**——技能整体更常在手上。这是有意的:上面那条搜索结果
 * 说的正是"按不动的按钮等于没有",而战斗本来就缺少可做的决定。 */
export function abilityCooldownSeconds(steps: number): number {
  return 3.0 + (steps - 2) * 0.9;
}

/** 这把武器在当前档位是吃亏还是占便宜——界面配色就按这个来。
 *
 * 2026-08-31(/loop 第 47 轮)。rangeProfileMultiplier 在此之前的**唯一消费者是
 * 伤害计算**:1.67 倍的跨度(×1.25 到 ×0.75)、50 把武器里 41 把带着它,而界面上
 * 一处都不显示。于是屏幕正中那排永远摆着的舵手指令,玩家没有依据去按。
 *
 * 抽成函数而不是在两处各写一遍三元表达式:配色规则和伤害规则必须同源,否则
 * 有一天数值改了、颜色没改,界面就会开始骗人。 */
export function rangeFitTone(profile: string | undefined, band: RangeBand): "good" | "neutral" | "poor" {
  const m = rangeProfileMultiplier(profile, band);
  return m > 1 ? "good" : m < 1 ? "poor" : "neutral";
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
