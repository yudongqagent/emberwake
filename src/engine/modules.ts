import type { ModuleInstance, ModuleRarity } from "../data/types";
import { MODULE_DEFS, MODULE_RARITY_ORDER, MODULE_RARITY_MULTIPLIER, moduleDefById } from "../data/modules";
import { pickOne, randomId, rollQuality } from "./rng";
import { permanentBonus } from "./permanent";
import { evolutionForFamily } from "../data/evolutions";

/** Section B (2026-08-24): a draw is now bounded by where it came from. `maxRarity`
 * caps the market (see MARKET_MAX_RARITY) so mk4/mk5 are unpurchasable at any
 * price; `minRarity` is the rift's depth-scaled floor, which is what makes the
 * Extradimensional Battlefield the actual source of top-tier gear rather than
 * just a faster one. */
function rollModuleRarity(
  baseRarity: ModuleRarity,
  opts: { minRarity?: ModuleRarity; maxRarity?: ModuleRarity } = {},
): ModuleRarity {
  const baseIdx = MODULE_RARITY_ORDER.indexOf(baseRarity);
  const roll = Math.random();
  const bump = roll > 0.92 ? 2 : roll > 0.7 ? 1 : 0;
  const ceiling = opts.maxRarity ? MODULE_RARITY_ORDER.indexOf(opts.maxRarity) : MODULE_RARITY_ORDER.length - 1;
  const floor = opts.minRarity ? MODULE_RARITY_ORDER.indexOf(opts.minRarity) : 0;
  // Floor wins over ceiling if they conflict — a guaranteed rift reward should
  // never be silently downgraded by a caller's cap.
  const idx = Math.max(floor, Math.min(ceiling, baseIdx + bump));
  return MODULE_RARITY_ORDER[Math.min(MODULE_RARITY_ORDER.length - 1, idx)];
}

/** How good a module the rift hands out, by the deepest wave cleared in the run.
 * mk4 and mk5 exist ONLY here — no shop stocks them at any price. */
export function riftDropRarityFloor(depth: number): ModuleRarity {
  const base = depth >= 7 ? 4 : depth >= 4 ? 3 : depth >= 2 ? 2 : 1;
  // 刻印「打捞」:浅层也能捞到更好的东西,让"重跑一遍前面"不再纯属浪费时间。
  const idx = Math.min(MODULE_RARITY_ORDER.length - 1, base + permanentBonus("salvager"));
  return MODULE_RARITY_ORDER[idx];
}

/** A roll of 0 gives 88% of the rarity's baseline stat, 0.5 (neutral) gives exactly
 * 100%, and 1 gives 112% — mirrors ships' qualityMultiplier so a mk3 weapon is a range,
 * not a fixed number, while staying narrow enough (±12%) that it can't invert tier
 * ordering given MODULE_RARITY_MULTIPLIER's ~1.32x-per-tier gap — verified in
 * ships.test.ts's tier-overlap check (see docs/design-principles.md's Player-Tested
 * Anti-Patterns #6). */
export function qualityMultiplier(roll: number): number {
  return 0.88 + roll * 0.24;
}

export function drawModule(
  defId?: string,
  opts: { minRarity?: ModuleRarity; maxRarity?: ModuleRarity } = {},
): ModuleInstance {
  const def = defId ? moduleDefById(defId) : pickOne(MODULE_DEFS);
  const rarity = rollModuleRarity(def.baseRarity, opts);
  const traitCount = 1 + Math.floor(Math.random() * Math.min(3, def.traitPool.length));
  // traitPool is effect ids (see data/moduleEffects.ts). The signature effect is
  // always present and is not part of the rolled variance.
  const traits = shuffle([...def.traitPool]).slice(0, traitCount);
  const quality = rollQuality(MODULE_RARITY_ORDER.indexOf(rarity), MODULE_RARITY_ORDER.length);
  return {
    id: randomId("module"),
    defId: def.id,
    rarity,
    level: 1,
    traits,
    lockedTraitSlot: null,
    quality,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function computeModuleDamage(mod: ModuleInstance): number {
  const def = moduleDefById(mod.defId);
  const base = def.baseDamage ?? 0;
  const rarityMult = MODULE_RARITY_MULTIPLIER[mod.rarity];
  const levelMult = moduleLevelMultiplier(mod.level);
  const rollMult = qualityMultiplier(mod.quality ?? 0.5);
  // Core-loop redesign #4: an evolved weapon hits harder on top of everything
  // else. The damage is the payoff; the new signature is the actual change.
  const evoMult = mod.evolved ? (evolutionForFamily(def.family)?.damageMult ?? 1) : 1;
  // 刻印「火力」。
  return Math.round(base * rarityMult * levelMult * rollMult * evoMult * (1 + permanentBonus("firepower")));
}

/** The signature a module currently provides — its evolved one if it has
 * evolved, otherwise the def's own. Every effect lookup goes through here so an
 * evolution genuinely changes how the weapon plays rather than only its numbers. */
export function effectiveSignature(mod: ModuleInstance): string {
  const def = moduleDefById(mod.defId);
  if (!mod.evolved) return def.signature;
  return evolutionForFamily(def.family)?.signature ?? def.signature;
}

/** Trait-driven crit chance for a fired weapon: a base proc rate, the ship's own
 * gunnery-quality roll, a boost if the module rolled the "crit" trait, and a further
 * boost from the player's current combo. */
export function computeCritChance(mod: ModuleInstance, comboCount: number, shipBaseCrit: number = 0): number {
  const base = 0.08;
  const traitBonus = mod.traits.includes("crit") ? 0.12 : 0;
  const comboBonus = Math.min(0.2, comboCount * 0.02);
  return Math.min(0.75, base + shipBaseCrit + traitBonus + comboBonus);
}

export function computeModuleBlock(mod: ModuleInstance): number {
  const def = moduleDefById(mod.defId);
  const base = def.baseBlock ?? 0;
  const rarityMult = MODULE_RARITY_MULTIPLIER[mod.rarity];
  const levelMult = 1 + (mod.level - 1) * 0.12;
  const rollMult = qualityMultiplier(mod.quality ?? 0.5);
  return Math.round(base * rarityMult * levelMult * rollMult);
}

/** 装备提供的闪避点数(1 ≈ 1%)。
 *
 * 曲线比格挡缓得多——和推力同一个道理,而我当初把它写成了和格挡一样。
 *
 * 格挡是**减法**:它对上一发 915 伤害的攻击值多少钱,和它的绝对值成正比,所以它
 * 必须跟着敌人数值一起涨。闪避是**概率**:它的价值不随敌人数值变化,乘上稀有度
 * 和等级只会让它撞到天花板。
 *
 * 2026-08-31 实测(/loop 第 24 轮),随手装备(每类填一半槽位,不刻意挑闪避):
 *
 *     阶梯0  2.6%    阶梯3   9.6–12.1%
 *     阶梯4 30.1%    阶梯5  37.5–43.2%
 *     阶梯6 81.4–94.5%      ← 战斗里的硬上限是 75%
 *
 * 也就是说最后三分之一的游戏里,玩家**永远处在满闪避**:多装一件不涨,少装一件
 * 不掉,每一条闪避词条、每一次引擎取舍全是废的。computeModuleThrust 的注释里
 * 已经写过一模一样的教训(「推力是门派取向,不是数值预算」),我在闪避上又踩了一次。 */
export function computeModuleEvasion(mod: ModuleInstance): number {
  const def = moduleDefById(mod.defId);
  const base = def.baseEvasion ?? 0;
  if (base === 0) return 0;
  const tierMult = 1 + 0.10 * MODULE_RARITY_ORDER.indexOf(mod.rarity);
  const levelMult = 1 + (mod.level - 1) * 0.04;
  return base * tierMult * levelMult * qualityMultiplier(mod.quality ?? 0.5);
}

/** 装备对航速的修正(百分比,可负)。
 *
 * 只随稀有度和等级放大**正的**那一半:重甲的拖累是它的设计代价,升级不该把
 * 代价也放大——否则升级一件重甲等于让自己更慢,那就成了惩罚玩家投资。
 *
 * 曲线比格挡/闪避缓得多(mk5 只有 1.24 倍,不是 3.04 倍)。第一版直接套了稀有度
 * 倍率,结果一件 mk5 掠夺者轻甲单独就给出 +52%,一件就顶满了总上限 +60%——
 * 后面所有关于推力的设计当场作废。推力是门派取向,不是数值预算。 */
export function computeModuleThrust(mod: ModuleInstance): number {
  const def = moduleDefById(mod.defId);
  const base = def.baseThrust ?? 0;
  if (base <= 0) return base;
  const tierMult = 1 + 0.06 * MODULE_RARITY_ORDER.indexOf(mod.rarity);
  const levelMult = 1 + (mod.level - 1) * 0.03;
  return base * tierMult * levelMult * qualityMultiplier(mod.quality ?? 0.5);
}

/** 一件模组的"主数值":拿来和同槽位已装备的那件比较用的那一个。
 *
 * 2026-08-31:购买展示里那段对比只认伤害和格挡,于是买一台引擎时它什么都不显示
 * ——而"这件比我身上那件好多少"正是玩家在商店里唯一想知道的事。
 *
 * 引擎取闪避:推力是门派取向(轻甲快、重甲慢),而闪避是引擎之间可比的那条轴。 */
export function primaryStat(mod: ModuleInstance): { key: "damage" | "block" | "evasion"; value: number } | null {
  const def = moduleDefById(mod.defId);
  if (def.baseDamage !== undefined) return { key: "damage", value: computeModuleDamage(mod) };
  if (def.baseBlock !== undefined) return { key: "block", value: computeModuleBlock(mod) };
  if (def.baseEvasion) return { key: "evasion", value: Math.round(computeModuleEvasion(mod) * 10) / 10 };
  return null;
}

/** 一件候选模组该拿谁当参照?——旗舰上**同类型里最强的那件**。
 *
 * 2026-08-31(/loop 第 19 轮)。整备抉择的卡面实拍:
 *
 *     Reaver Apotheosis   MK5   Dmg 47 · cycles 0.8s   Costs 122 hull
 *
 * 而玩家身上装着的那把是 Dmg 489。卡面只写绝对值,于是"该不该拿"这个每场战斗
 * 都要做一次的决定,玩家没有做的依据——除非他记得住自己身上八件装备的数值。
 * 同一张界面里的**升级卡**却写着 `11 → 12`:容易做对比的那半做了,每场都要做的
 * 那半没做。
 *
 * 第一版写的是"它会顶掉哪一件":同类型有空槽就不比(纯赚),满了才和最弱的比。
 * 实测下来这条规则在真机上等于**从不比较**——那艘船 10 个武器槽只填了 1 个,
 * 永远有空槽。而这恰恰是最需要参照的时刻。
 *
 * 所以改成拿**最强的同类**当基准:它就是玩家心里的那把尺子("我那把打 489,
 * 这个打 47")。空槽不空槽不影响这句话是否有用。 */
export function benchmarkFor(
  ship: { hullClass: string; equipped: (string | null)[] },
  mod: ModuleInstance,
  lookup: (id: string) => ModuleInstance | undefined,
): ModuleInstance | null {
  const def = moduleDefById(mod.defId);
  const sameType = ship.equipped
    .map((id) => (id ? lookup(id) : undefined))
    .filter((m): m is ModuleInstance => !!m && moduleDefById(m.defId).type === def.type && m.id !== mod.id);
  if (sameType.length === 0) return null;
  const rank = (m: ModuleInstance) => primaryStat(m)?.value ?? computeModuleEvasion(m);
  return sameType.reduce((best, m) => (rank(m) > rank(best) ? m : best));
}

/** 一个模组把它的效果打出多重。
 *
 * 2026-08-30,修 docs/module-system-audit-round2.md 的 #13——也是 #11 和 #12 的
 * 根因。在此之前,所有效果都是"数有几个模组带这个效果",然后乘一个常数:
 *
 *     const hullBonusFraction = 0.15 * effectStacks("hullBonus");
 *
 * 于是一块 mk1 的偏转板和一块 mk5 满级的偏转板,完全一样。武器和护甲还有个数值
 * 撑着,看不出来;引擎**根本没有数值**,所以引擎升级花合金、什么都不给——
 * 把一件 mk5 引擎从 1 级升到 13 级要 19,034 合金,而整个战役的合金收入是 4,535。
 *
 * 现在稀有度、等级、品质都进这个系数。曲线刻意比伤害那条缓得多(mk5 满级约
 * 2.4x,而伤害是 5.5x):效果里有一半是几率和减免,乘 5.5 会直接把上限顶穿。 */
export function effectPotency(mod: ModuleInstance): number {
  const tierIdx = MODULE_RARITY_ORDER.indexOf(mod.rarity);
  const rarityMult = 1 + 0.15 * tierIdx;
  const levelMult = 1 + 0.035 * (mod.level - 1);
  const rollMult = 0.92 + 0.16 * (mod.quality ?? 0.5);
  return rarityMult * levelMult * rollMult;
}

/** Module leveling, per docs/systems-design.md: "Level: upgraded with Alloy,
 * independent of Rarity" — and the resource split it exists to serve, "Source
 * Points always answers 'get something new,' Alloy always answers 'make something
 * you already have better'."
 *
 * This was dead code until 2026-08-24: levelUpModule existed with no caller, so
 * every module sat at level 1 forever and the +12%/level term below never fired.
 * Alloy correspondingly had almost nothing to spend on. Both are now live.
 *
 * The cap rises with rarity so rarity buys long-term investment headroom, not just
 * a bigger starting number — a mk5 stays worth upgrading long after a mk1 has
 * topped out. */
/** Exponential stat growth (player direction 2026-08-24), replacing the old linear
 * +12%/level. A maxed mk5 (L13) now reaches ~5.5x its base instead of ~2.4x, so
 * late levels are the ones worth chasing — paired with an exponential cost curve
 * below, upgrading becomes a decision about where to concentrate Alloy rather than
 * a checklist to complete on everything you own. */
export function moduleLevelMultiplier(level: number): number {
  return Math.pow(1.14, level - 1);
}

export function moduleMaxLevel(rarity: ModuleRarity): number {
  // 刻印「工坊」:永久抬高每一件模组的等级上限,让已经满级的装备重新有得投。
  return 5 + MODULE_RARITY_ORDER.indexOf(rarity) * 2 + permanentBonus("workshop");
}

export function isModuleMaxed(mod: ModuleInstance): boolean {
  return mod.level >= moduleMaxLevel(mod.rarity);
}

/** Alloy for the next level — exponential, matching the exponential stat growth
 * above (player direction 2026-08-24).
 *
 * Still calibrated against measured income: all six acts of story combat pay 4,535
 * Alloy combined, a depth-7 rift run ~920. At 18 x rarityMult x 1.55^(level-1) the
 * full-max ladder is roughly mk1 250 / mk2 1,300 / mk3 8,700 / mk4 63,000 /
 * mk5 480,000 — deliberately steep at the top: a fully maxed mk5 is a long-term
 * ambition, not a box to tick, and the early levels stay cheap enough that every
 * module is worth putting a few levels into. */
export function moduleUpgradeCost(mod: ModuleInstance): number {
  const rarityMult = MODULE_RARITY_MULTIPLIER[mod.rarity];
  return Math.round(18 * rarityMult * Math.pow(1.55, mod.level - 1));
}


export function levelUpModule(mod: ModuleInstance): ModuleInstance {
  if (isModuleMaxed(mod)) return mod;
  return { ...mod, level: mod.level + 1 };
}

/** 把某一格的词条换成另一个。
 *
 * 2026-08-30 重写。原来的实现有三个问题,而且都在花玩家的洞悉:
 *
 * 1. 永远只改第 0 格(界面上的按钮字面写着"重掷特性1"),玩家不能选要换哪一个。
 * 2. 新词条从整个词条池里随机取,**包括它现在已经有的那个**——所以有相当概率
 *    花了 8 点洞悉,什么都没变。
 * 3. 也可能掷出这个模组另一格已经有的词条。同一个模组上重复的词条只算一次
 *    (effectStacks 按模组计),所以那一格直接作废。
 *
 * 现在:玩家点哪一格换哪一格,候选里排除掉这个模组已经拥有的全部词条。花出去的
 * 洞悉一定换来一个**不同的**、**不重复的**词条。 */
export function rerollTrait(mod: ModuleInstance, slotIndex: number, pick: (pool: string[]) => string): ModuleInstance {
  const def = moduleDefById(mod.defId);
  const owned = new Set(mod.traits);
  const candidates = def.traitPool.filter((t) => !owned.has(t));
  if (candidates.length === 0) return mod;
  const traits = [...mod.traits];
  traits[slotIndex] = pick(candidates);
  return { ...mod, traits };
}

/** 这一格还有得换吗?没有的话按钮不该亮着,更不该收钱。 */
export function rerollCandidates(mod: ModuleInstance): string[] {
  const def = moduleDefById(mod.defId);
  const owned = new Set(mod.traits);
  return def.traitPool.filter((t) => !owned.has(t));
}
