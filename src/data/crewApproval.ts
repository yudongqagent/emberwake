import type { FactionId } from "./types";

/** 船员支持度。
 *
 * 2026-08-30。`approval` 这个字段从一开始就在存档里、在船员面板上画着进度条,
 * 而**没有任何一行代码读它或改它**——所有人永远是 50%。这是我一路在批评的
 * 「显示了却没人消费」的又一例,而且是玩家一眼就看得见的那种。
 *
 * 现在它是真的:
 *
 * - **升**:带着他打赢仗。他在船上的时候你赢得越多,他越信你。
 * - **降**:带着他打输;或者做出他所属那一派会记恨的选择。
 * - **用**:支持度决定他的被动强度和主动技能的冷却。低到一定程度他还在船上,
 *   但不再为你多做一分。
 *
 * 这条线把船员和已有的三样东西接上了:战斗结果、派系声望、剧情选择。铁衡是协约
 * 的人——你为了商会把协约卖了,他会知道,而且他就在你船上。
 */

export type ApprovalTier = "resentful" | "wary" | "steady" | "loyal" | "devoted";

export const APPROVAL_MIN = 0;
export const APPROVAL_MAX = 100;

export function approvalTier(v: number): ApprovalTier {
  if (v < 20) return "resentful";
  if (v < 40) return "wary";
  if (v < 65) return "steady";
  if (v < 88) return "loyal";
  return "devoted";
}

export interface ApprovalEffects {
  /** 被动强度的倍率。 */
  passiveMultiplier: number;
  /** 主动技能冷却的倍率(小于 1 = 更快)。 */
  cooldownMultiplier: number;
}

/** 刻意不做成「低支持度会背叛/离船」。
 *
 * 惩罚型的极端设计会让玩家不敢用任何有立场的角色,而这套系统的意义恰恰是让立场
 * 有代价、也有回报。所以最差的结果是他还在,只是不再多给你什么。 */
export function approvalEffects(v: number): ApprovalEffects {
  switch (approvalTier(v)) {
    case "resentful": return { passiveMultiplier: 0.5, cooldownMultiplier: 1.35 };
    case "wary":      return { passiveMultiplier: 0.75, cooldownMultiplier: 1.15 };
    case "steady":    return { passiveMultiplier: 1.0, cooldownMultiplier: 1.0 };
    case "loyal":     return { passiveMultiplier: 1.25, cooldownMultiplier: 0.85 };
    case "devoted":   return { passiveMultiplier: 1.5, cooldownMultiplier: 0.7 };
  }
}

/** 每个船员站在哪一边。
 *
 * 只写有立场的人。虎鲨是掠夺者,铁衡是协约的,柳芸是商会的——他们会因为你怎么
 * 对待自己那一派而改变态度。没有立场的人(通用招募、构装体单元)不在表里,
 * 也就不会被剧情选择影响。 */
export const CREW_ALLEGIANCE: Record<string, FactionId> = {
  kaanFerrous: "lionsheart",
  oriVashti: "swanreach",
  priyaOsei: "swanreach",
  kessaVray: "reavers",
  ratchetKoi: "reavers",
};

/** 打赢一场,船上的人涨多少。小,但一路打下去会累积。 */
export const APPROVAL_PER_WIN = 2;
/** 打输一场扣多少。比赢的多——信任掉得比涨得快,人就是这样。 */
export const APPROVAL_PER_LOSS = -5;

/** 剧情选择怎么影响船员。
 *
 * 换算方式:选择改动某派系的声望时,属于那一派的船员按 `声望变化 / 3` 调整支持度。
 * 这样就不需要再维护第二张平行的表——两张表一定会在某次改动之后对不上,而那种
 * 不一致不会报错,只会让玩家觉得"这游戏的反应莫名其妙"。 */
export const APPROVAL_FROM_REPUTATION = 1 / 3;

export function clampApproval(v: number): number {
  return Math.max(APPROVAL_MIN, Math.min(APPROVAL_MAX, Math.round(v)));
}
