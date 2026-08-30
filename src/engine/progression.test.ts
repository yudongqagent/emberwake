import { describe, expect, it } from "vitest";
import { xpToNextLevel } from "./ships";
import { HULL_CLASSES } from "../data/hullClasses";
import { ENCOUNTER_DEFS, BOUNTY_ENCOUNTER_DEFS } from "../data/encounters";
import { generateHunterEncounter } from "../data/hunters";
import { emberLoadRewardMultiplier } from "../data/emberLoad";

/** 到达某等级需要的总经验。 */
function xpToReach(level: number): number {
  let sum = 0;
  for (let l = 1; l < level; l++) sum += xpToNextLevel(l);
  return sum;
}

const CAMPAIGN_XP = ENCOUNTER_DEFS.reduce((n, e) => n + e.xp, 0);
const TOP_LEVEL = Math.max(...HULL_CLASSES.map((h) => h.minLevel));

// docs/content-depth-analysis.md 量出来的那堵墙:最高舰级要 55 级,而整个战役的
// 全部经验之和是 6,782 —— 55 级需要 39,285,是战役的 5.8 倍。打完剧情之后唯一的
// 出路是刷 164 场悬赏。
//
// 根因是经验是唯一**没有**吃余烬负荷加成的收益:资源涨,等级不涨。于是"去更危险
// 的地方赚得更多"这条循环给的是材料,而不是最高舰级唯一缺的那样东西。
describe("等级门槛得够得着", () => {
  it("战役结束时,剧情自己后半段的仗你打得动", () => {
    // 刻意**不**要求战役能走到最高档。七档舰级里,战役结束在第五档、留两档给终局
    // 是有意的形状。要保证的是另一件事:战役最后那些仗,不能比战役自己给得起的
    // 等级更难 —— 那才是"设计上的墙"。
    const tiers = [...new Set(HULL_CLASSES.map((h) => h.minLevel))].sort((a, b) => a - b);
    const midTier = tiers[tiers.length - 3];
    const withLoad = CAMPAIGN_XP * emberLoadRewardMultiplier(8);
    expect(
      withLoad,
      `高负荷跑完战役只有 ${Math.round(withLoad)} 经验,连 ${midTier} 级(${xpToReach(midTier)})都到不了`,
    ).toBeGreaterThan(xpToReach(midTier));
  });

  it("战役之上的每一档,都得有一条打得完的路", () => {
    // 一档要刷上百场就等于没有这一档。分别用两种可重复内容量:高威胁星区的悬赏,
    // 和敌对招来的猎杀队。
    const tiers = [...new Set(HULL_CLASSES.map((h) => h.minLevel))].sort((a, b) => a - b);
    const withLoad = CAMPAIGN_XP * emberLoadRewardMultiplier(8);
    const topBounty = Math.max(...BOUNTY_ENCOUNTER_DEFS.map((b) => b.xp)) * emberLoadRewardMultiplier(8);
    const hunter = generateHunterEncounter("reavers", 7).xp * emberLoadRewardMultiplier(8);
    for (const tier of tiers) {
      const gap = xpToReach(tier) - withLoad;
      if (gap <= 0) continue;
      const best = Math.min(gap / topBounty, gap / hunter);
      expect(best, `${tier} 级还差 ${Math.round(gap)} 经验,最快也要打 ${Math.round(best)} 场`).toBeLessThan(40);
    }
  });

  it("最高舰级要靠终局内容,而不是刷上百场悬赏", () => {
    const remaining = xpToReach(TOP_LEVEL) - CAMPAIGN_XP * emberLoadRewardMultiplier(8);
    // 高威胁星区的猎杀队是终局最快的经验来源之一。
    const hunterXp = generateHunterEncounter("reavers", 7).xp * emberLoadRewardMultiplier(8);
    const fights = remaining / hunterXp;
    expect(fights, `补齐最高舰级还要打 ${Math.round(fights)} 场猎杀队`).toBeLessThan(30);
  });

  it("经验必须吃负荷加成,否则那堵墙会原样长回来", () => {
    // 这条钉的是意图:余烬负荷的承诺是"更难的仗付得更多",而等级也是一种报酬。
    expect(emberLoadRewardMultiplier(8)).toBeGreaterThan(2);
  });

  it("悬赏可以是补充,但不能是唯一出路", () => {
    const avgBounty = BOUNTY_ENCOUNTER_DEFS.reduce((n, b) => n + b.xp, 0) / BOUNTY_ENCOUNTER_DEFS.length;
    const grind = (xpToReach(TOP_LEVEL) - CAMPAIGN_XP) / (avgBounty * emberLoadRewardMultiplier(8));
    // 记下这个数,不是要它变小,是要它一旦变得荒谬时有人看见。
    expect(grind, `只刷悬赏要打 ${Math.round(grind)} 场`).toBeLessThan(120);
  });
});
