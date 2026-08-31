import type { HullClassId, ShipInstance, ShipRolls } from "../data/types";
import { RARITY_ORDER, APTITUDE_WEIGHTS, APTITUDE_GROWTH, RARITY_MULTIPLIER, hullClassById, nextHullClassOptions, ascensionRequirementsMet } from "../data/hullClasses";
import { weightedPick, rollQuality } from "./rng";
import { permanentBonus } from "./permanent";

/** A roll of 0 gives 88% of the class baseline, 0.5 (neutral) gives exactly 100%, and a
 * roll of 1 gives 112% — the same ±quality band used for every stat, so a ship's rarity
 * sets the tier but its rolls decide whether it's a great one within that tier.
 * Deliberately narrow (±12%, was ±20%): with RARITY_MULTIPLIER's ~1.32x-per-tier gap,
 * this guarantees a worst-roll ship of tier N+1 still beats a best-roll ship of tier N
 * — verified in ships.test.ts. A wider band here would let a lucky common roll beat an
 * unlucky rare one, which is exactly the "tiers don't feel different" failure flagged
 * in docs/design-principles.md's Player-Tested Anti-Patterns #6. */
export function qualityMultiplier(roll: number): number {
  return 0.88 + roll * 0.24;
}

function rollShipAttributes(rarity: ShipInstance["rarity"]): ShipRolls {
  const tierIndex = RARITY_ORDER.indexOf(rarity);
  const total = RARITY_ORDER.length;
  return {
    hull: rollQuality(tierIndex, total),
    power: rollQuality(tierIndex, total),
    speed: rollQuality(tierIndex, total),
    evasion: rollQuality(tierIndex, total),
    crit: rollQuality(tierIndex, total),
  };
}

/** Ships built before the itemization overhaul (or ad-hoc proxy objects built for a
 * stat-delta comparison) have no rolls — treat them as dead-center average. */
const NEUTRAL_ROLLS: ShipRolls = { hull: 0.5, power: 0.5, speed: 0.5, evasion: 0.5, crit: 0.5 };

/** Ship-ascension redesign (docs/story/research-notes-ship-ascension.md): Whisper is
 * the only ship there ever is — created once at game start, always Corvette-class,
 * always Salvage rarity (a fixed starting point, not a draw), with a lightly rolled
 * stat spread for texture. All further growth is level (XP, unchanged) and ascension
 * (hull class, see ascendShip below). */
export function createWhisper(): ShipInstance {
  const hullClass: HullClassId = "corvette";
  const rarity: ShipInstance["rarity"] = "salvage";
  const def = hullClassById(hullClass);
  const rolls = rollShipAttributes(rarity);
  return {
    id: "whisper",
    hullClass,
    rarity,
    // 资质在**建船时**就定下来(见 createWhisper),扫描只是把它读出来。原来是"扫描时才掷"——
    // 而界面在扫描前显示的是「??」,那本来就是"已经存在、只是没看见"的写法。
    // 更要紧的是:资质一旦真的有作用(见 applyXp),"扫描时才掷"就变成一个陷阱
    // ——不扫是 B(1.0),扫了有 45% 概率掷出 C 或 D,把自己的船变差。
    aptitude: weightedPick(APTITUDE_WEIGHTS),
    scanned: false,
    name: "Whisper",
    level: 1,
    xp: 0,
    equipped: new Array(def.slots.weapon + def.slots.armor + def.slots.engine + def.slots.utility).fill(null),
    currentHp: computeMaxHull({ hullClass, rarity, level: 1, rolls }),
    rolls,
    ascendedFrom: [],
  };
}

/** Whether every ascension gate (story flag, Origin Essence, level) is met for at
 * least one of the current hull class's next-tier options. Used to show/hide the
 * "Ascension available" prompt without needing to know which branch yet. */
export function canAscend(ship: ShipInstance, originEssence: number, flags: Record<string, boolean>): boolean {
  return nextHullClassOptions(ship.hullClass).some((target) => {
    const req = ascensionRequirementsMet(target, ship.level, originEssence, flags);
    return req.flag && req.essence && req.level;
  });
}

/** Ascends `ship` into `targetHullClass` — a genuine tier change on the same ship
 * instance, not a new draw (see docs/story/research-notes-ship-ascension.md). Full
 * heal (an ascension is a bigger, rarer moment than a level-up, which doesn't fully
 * heal) and slots are remapped per type: hull classes don't always add slots of
 * every type (a tank branch can trade weapon/engine slots for armor ones, see
 * data/hullClasses.ts), so this both grows AND shrinks per-type slot counts as
 * needed — any module that no longer fits is simply unequipped (still owned, not
 * lost), never silently reassigned to the wrong slot type. */
export function ascendShip(ship: ShipInstance, targetHullClass: HullClassId): ShipInstance {
  const oldDef = hullClassById(ship.hullClass);
  const newDef = hullClassById(targetHullClass);
  const types: (keyof typeof oldDef.slots)[] = ["weapon", "armor", "engine", "utility"];
  let cursor = 0;
  const newEquipped: (string | null)[] = [];
  for (const type of types) {
    const oldCount = oldDef.slots[type];
    const newCount = newDef.slots[type];
    const currentGroup = ship.equipped.slice(cursor, cursor + oldCount);
    cursor += oldCount;
    const keep = currentGroup.slice(0, newCount);
    while (keep.length < newCount) keep.push(null);
    newEquipped.push(...keep);
  }
  const grown = {
    ...ship,
    hullClass: targetHullClass,
    equipped: newEquipped,
    ascendedFrom: [...ship.ascendedFrom, ship.hullClass],
  };
  return { ...grown, currentHp: computeMaxHull(grown) };
}

/** 横向改铸:换成同一层的另一艘舰级。
 *
 * 和 ascendShip 共用槽位迁移的逻辑,但**绝不动 ascendedFrom** —— 那个数组的长度
 * 是剧情推进的门槛(StoryScene.requiresAscensions),往里塞一条横向记录等于让玩家
 * 花精华跳过剧情。改铸是换形态,不是又长了一级。 */
export function reforgeShip(ship: ShipInstance, targetHullClass: HullClassId): ShipInstance {
  const ascended = ascendShip(ship, targetHullClass);
  return { ...ascended, ascendedFrom: ship.ascendedFrom };
}

/** 扫描只**揭示**资质,不掷它——见 createStarterShip 里的说明。
 * `?? weightedPick` 只是老存档的兜底:第 50 轮之前建的船 aptitude 是 null。 */
export function scanShip(ship: ShipInstance): ShipInstance {
  if (ship.scanned) return ship;
  return { ...ship, scanned: true, aptitude: ship.aptitude ?? weightedPick(APTITUDE_WEIGHTS) };
}

export function computeMaxHull(ship: Pick<ShipInstance, "hullClass" | "rarity" | "level"> & Partial<Pick<ShipInstance, "rolls">>): number {
  const def = hullClassById(ship.hullClass);
  const growth = 1 + (ship.level - 1) * 0.08;
  const roll = qualityMultiplier((ship.rolls ?? NEUTRAL_ROLLS).hull);
  // 刻印「船体」:永久抬高船体上限(data/sigils.ts)。
  return Math.round(def.baseHull * RARITY_MULTIPLIER[ship.rarity] * growth * roll * (1 + permanentBonus("hull")));
}

/** Power capacity comes from the HULL, plus a gentle level term.
 *
 * Weapon-system audit #3 follow-through. Capacity used to multiply basePower by
 * the ship's rarity, an 8%/level growth AND its power roll — the same battleship
 * ranged from 36 to 407 capacity while module draw stayed flat. Power therefore
 * stopped constraining anything a few levels in, which is the deeper reason the
 * overdraw warning never fired for anyone: not just that nothing read it, but
 * that nothing could ever trip it.
 *
 * Capacity is now a property of the hull class you're flying. That makes
 * ASCENSION the thing that unlocks heavier fits, which is exactly what the
 * game's ascension premise wants it to be — a bigger ship carries more gun —
 * rather than power quietly inflating with grind. The 4%/level term keeps some
 * of the original intent (Issue #1, 2026-08: leveling should visibly change more
 * than the health bar) without letting capacity outrun the fit by 10x.
 *
 * `level` defaults to 1 (no bonus) so partial-ship call sites still work. */
export function computePowerCapacity(ship: Pick<ShipInstance, "hullClass" | "rarity"> & Partial<Pick<ShipInstance, "rolls" | "level">>): number {
  const def = hullClassById(ship.hullClass);
  const growth = 1 + ((ship.level ?? 1) - 1) * 0.04;
  // 刻印「反应堆」:永久多出的功率容量,让更重的配装成为可能。
  return Math.round(def.basePower * growth) + permanentBonus("reactor");
}

/** World-units/sec the flagship moves at, both on the system map and in the combat
 * arena — bigger hull classes are deliberately slower (see baseSpeed in hullClasses.ts),
 * and a ship's individual speed roll can push it faster or slower still within that. */
export function computeSpeed(ship: Pick<ShipInstance, "hullClass"> & Partial<Pick<ShipInstance, "rolls">>): number {
  const def = hullClassById(ship.hullClass);
  const roll = qualityMultiplier((ship.rolls ?? NEUTRAL_ROLLS).speed);
  return Math.round(def.baseSpeed * 44 * roll);
}

/** Base evasion contributed by the hull itself, before engine traits or crew bonuses. */
export function computeBaseEvasion(ship: Partial<Pick<ShipInstance, "rolls">>): number {
  return (ship.rolls ?? NEUTRAL_ROLLS).evasion * 0.1;
}

/** Base crit chance contributed by the hull's own gunnery quality, before weapon traits
 * or combo bonuses. */
export function computeBaseCritChance(ship: Partial<Pick<ShipInstance, "rolls">>): number {
  return (ship.rolls ?? NEUTRAL_ROLLS).crit * 0.08;
}

export function xpToNextLevel(level: number): number {
  return 40 + level * 25;
}

/** 资质决定这条船**学得多快**。
 *
 * 2026-08-31(/loop 第 50 轮)。在这之前,APTITUDE_GROWTH 唯一的作用是升级时把
 * 最大船体的增量按倍率补进当前血量——而 computeMaxHull **根本不看资质**。也就是说
 * S 资质和 D 资质的船,每一级的数值完全相同;唯一的差别是升级那一瞬间多回十几点血,
 * 而且满血时连这点差别都没有(那行有 Math.min 封顶)。
 *
 * 可界面上,资质是舰桥五个头号数值之一,还专门有个"扫描"动作把它揭出来,S 的
 * 权重只有 3%。玩家扫出一个 S,以为拿到了什么;实际拿到的是每级多回约 15 点血。
 *
 * 按名字直译成"成长加成"(乘进 computeMaxHull 的等级项)是**错的**,试过就知道:
 * 稀有度一档是 ×1.32,而品质带已经吃掉 ×1.27,再叠一层 1.5/0.6 的资质,低阶好船
 * 就会超过高阶差船——那正是 design-principles.md 的 Player-Tested Anti-Patterns #6
 * 明令禁止、并且由 ships.test.ts 守着的那条阶梯。
 *
 * 改成**经验倍率**:等级相同则数值分毫不变(阶梯完好),但一条 S 的船在同样的战斗
 * 里升得更快、整场战役都走在前面。这也正是"资质"这个词本来的意思——学得快,
 * 不是天生更壮。 */
export function applyXp(ship: ShipInstance, xp: number): ShipInstance {
  let { level, xp: curXp } = ship;
  const aptitudeMult = ship.aptitude ? APTITUDE_GROWTH[ship.aptitude] : APTITUDE_GROWTH.B;
  curXp += Math.round(xp * aptitudeMult);
  while (curXp >= xpToNextLevel(level)) {
    curXp -= xpToNextLevel(level);
    level += 1;
  }
  const leveled = { ...ship, level, xp: curXp };
  const newMax = computeMaxHull(leveled);
  // 升级把长出来的那截船体补满——所有资质一视同仁。资质的含义现在只有一个
  // (学得快),一个数值只表达一件事。
  const grown = Math.max(0, newMax - computeMaxHull(ship));
  return { ...leveled, currentHp: Math.min(newMax, ship.currentHp + grown) };
}
