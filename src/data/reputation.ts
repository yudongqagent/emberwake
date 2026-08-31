import type { FactionId } from "./types";

/** 派系声望。
 *
 * 2026-08-30。见 docs/story-engagement-analysis.md。
 *
 * 起因是两个反馈碰到了一起：「剧情还是很不吸引人」和「增加更多自由度和玩法」。
 * 量过之后发现它们是同一个病：**世界不会回应玩家**。
 *
 * - 剧情里 7 个选择点设了 20 个 flag，其中 16 个没有任何代码读——玩家做了道德
 *   选择，游戏立刻忘掉。选了跟没选一样，人就不会再认真读。
 * - 开放世界那次改动让地图随便去了，但去哪儿并不改变什么。「自由」只体现为地图更大。
 *
 * 声望一个系统同时修两边：选择改变谁待见你（剧情有后果），而谁待见你决定你能拿到
 * 什么船坞、什么价格、什么盟友、什么任务（自由度有实体）。
 *
 * 刻意只做四个"讲道理"的派系。虫群、构装体、空壳、裂隙回响是不能谈判的东西——
 * 给它们做声望等于承诺一套根本不存在的外交玩法。
 */

/** 会记仇也会领情的派系。其余派系不参与声望。 */
export const DIPLOMATIC_FACTIONS: FactionId[] = ["bauhinia", "lionsheart", "swanreach", "reavers"];

export function isDiplomatic(f: string): f is FactionId {
  return (DIPLOMATIC_FACTIONS as string[]).includes(f);
}

export const REP_MIN = -100;
export const REP_MAX = 100;

export type RepTier = "hostile" | "cold" | "neutral" | "friendly" | "allied";

/** 分档。刻意粗——玩家要能一眼看懂自己站在哪，而不是盯着一个数字。 */
export function repTier(value: number): RepTier {
  if (value <= -50) return "hostile";
  if (value <= -15) return "cold";
  if (value < 25) return "neutral";
  if (value < 60) return "friendly";
  return "allied";
}

/** 声望带来的实际好处/惩罚。这些必须是玩家在别处摸得到的东西，
 * 否则声望就成了第二个死 flag。 */
export interface RepEffects {
  /** 市场价格系数。敌对方不做你生意，盟友给折扣。 */
  priceMultiplier: number;
  /** 该派系的船会不会在团战里帮你打。 */
  fightsAlongside: boolean;
  /** 敌对到一定程度，他们的巡逻队会主动找你麻烦。 */
  huntsYou: boolean;
  /** 战后额外收益系数（盟友会分你战利品）。 */
  rewardBonus: number;
}

export function repEffects(value: number): RepEffects {
  const tier = repTier(value);
  switch (tier) {
    case "hostile":  return { priceMultiplier: 1.6, fightsAlongside: false, huntsYou: true,  rewardBonus: 0 };
    case "cold":     return { priceMultiplier: 1.25, fightsAlongside: false, huntsYou: false, rewardBonus: 0 };
    case "neutral":  return { priceMultiplier: 1.0, fightsAlongside: false, huntsYou: false, rewardBonus: 0 };
    case "friendly": return { priceMultiplier: 0.88, fightsAlongside: false, huntsYou: false, rewardBonus: 0.1 };
    case "allied":   return { priceMultiplier: 0.75, fightsAlongside: true,  huntsYou: false, rewardBonus: 0.2 };
  }
}

/** 剧情选择 -> 声望变化。
 *
 * 这张表就是那 16 个死 flag 的复活方案：它们本来就已经被写进存档了，只是没人读。
 * 现在每一个都有了具体后果，而且是玩家在市场、团战、巡逻队里能直接撞见的后果。
 *
 * 数值刻意不对称：得罪人比讨好人容易，因为这样"要不要为了眼前好处得罪一方"才是
 * 真的取舍。 */
export const CHOICE_REPUTATION: Record<string, Partial<Record<FactionId, number>>> = {
  // 本家规矩——第一次表态。
  "arthaineConflictStyle.political": { bauhinia: 20 },
  "arthaineConflictStyle.bribed":    { bauhinia: 5 },
  "arthaineConflictStyle.public":    { bauhinia: -25, swanreach: 10 },

  // 血债——手里握着安氏资助劫掠者的证据。
  "act2.bloodDebt.formal":    { bauhinia: -35, lionsheart: 25, swanreach: 15 },
  "act2.bloodDebt.blackmail": { bauhinia: -10, reavers: 10 },

  // 山脊之争——两大势力都想要那条航道。
  "ridgeReachOutcome.peace":      { lionsheart: 15, swanreach: 15 },
  "ridgeReachOutcome.exploited":  { lionsheart: -20, swanreach: -20, reavers: 20 },
  "ridgeReachOutcome.lionsheart": { lionsheart: 35, swanreach: -25 },
  "ridgeReachOutcome.swanreach":  { swanreach: 35, lionsheart: -25 },

  // 虎鲨的赌注。
  "tigerSharkAlliance":            { reavers: 40, bauhinia: -20 },
  "act3.tigerSharkGambit.refused": { reavers: -30, bauhinia: 10 },

  // 安氏终局。
  "arthaineResolution.formal":  { bauhinia: -40, lionsheart: 20, swanreach: 20 },
  "arthaineResolution.private": { bauhinia: 25, lionsheart: -15 },
  "arthaineResolution.exposed": { bauhinia: -30, reavers: 15 },

  // 面对余烬的身世——这三个不改变外部势力，它们改变的是余烬本身，
  // 由 cinderTrust 单独承载（见下面的 CHOICE_CINDER_TRUST）。声望表留空是刻意的。
};

/** 面对余烬身世时的三种反应 -> 余烬对你的信任。
 *
 * 2026-08-31（/loop 第 44 轮）。上面那句注释把这三个选择留给了 cinderTrust，而
 * **承接它的那条路从来没接上**：
 *
 *   - adjustCinderTrust 存在，但全代码库 **零调用点**
 *   - cinderTrust 初始 0，因此永远是 0
 *   - reactive.ts 里有三段台词门控在 `>= 2` 或 `<= -1` 上，**全部永久不可达**
 *     （其中一段在战役终局：「这份答卷里属于我的那部分，是我自愿给的」）
 *
 * 门槛是 >= 2 和 <= -1，所以数值按门槛反推：接纳够到暖的那一档，愤怒够到冷的
 * 那一档，务实（"晚点再说，那个洞里还在出什么？"）两边都够不到——三条路各自
 * 有各自的收尾，这正是三选一该有的样子。 */
export const CHOICE_CINDER_TRUST: Record<string, number> = {
  "cinderReveal.acceptance": 2,
  "cinderReveal.focus": 1,
  "cinderReveal.anger": -2,
};

/** 打掉一艘某派系的船，对方会记住。数值很小——一次遭遇不该毁掉一段关系，
 * 但一路杀过去应该。 */
export const REP_PER_KILL = -3;

export function clampRep(v: number): number {
  return Math.max(REP_MIN, Math.min(REP_MAX, Math.round(v)));
}
