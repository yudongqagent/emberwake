import { describe, expect, it } from "vitest";
import { effectiveEvasion, EVASION_SOFT_CAP, EVASION_HARD_CAP } from "./combat";
import { computeModuleEvasion } from "./modules";
import { HULL_CLASSES } from "../data/hullClasses";
import { MODULE_DEFS } from "../data/moduleDefs";
import type { ModuleRarity } from "../data/types";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";

/** 2026-08-31(/loop 第 24 轮)。闪避原本套的是格挡那条曲线(稀有度 ×3.04,
 * 等级 ×3.04),而它是个**概率**。随手装备(每类填一半槽位,不刻意挑闪避)量出来:
 *
 *     阶梯0  2.6%   阶梯3   9.6–12.1%   阶梯4 30.1%
 *     阶梯5 37.5–43.2%      阶梯6 81.4–94.5%   ← 战斗里硬上限 75%
 *
 * 最后三分之一的游戏里玩家永远处在满闪避:多装一件不涨,少装一件不掉,这条属性
 * 连同它所有的词条一起变成死数。computeModuleThrust 的注释里写过同一个教训
 * ——百分比不能套减法那条曲线——我在闪避上又踩了一次。 */

const TIER_RARITY: ModuleRarity[] = ["mk1", "mk2", "mk2", "mk3", "mk4", "mk4", "mk5"];

/** 一套"随手装"的装备闪避:每类填一半槽位,取该类里排在前面的设计,不刻意挑。 */
function casualEvasion(hullClass: (typeof HULL_CLASSES)[number]): number {
  const rarity = TIER_RARITY[Math.min(hullClass.order, TIER_RARITY.length - 1)];
  const level = Math.max(1, Math.round(hullClass.minLevel / 3));
  let total = 0;
  for (const type of ["armor", "engine"] as const) {
    const n = Math.max(1, Math.round(hullClass.slots[type] / 2));
    for (const def of MODULE_DEFS.filter((d) => d.type === type).slice(0, n)) {
      total += computeModuleEvasion({
        id: "x", defId: def.id, rarity, level, traits: [], lockedTraitSlot: null, quality: 0.55,
      });
    }
  }
  return total / 100;
}

describe("闪避不能被随手堆到饱和", () => {
  it("随手装出来的闪避,全程都在软上限以内", () => {
    for (const h of HULL_CLASSES) {
      const raw = casualEvasion(h);
      expect(
        raw,
        `${h.id}(阶梯${h.order})随手装就有 ${(raw * 100).toFixed(1)}% 裸闪避,越过软上限意味着这条属性开始贬值`,
      ).toBeLessThan(EVASION_SOFT_CAP);
    }
  });

  it("但闪避确实随进度增长——不能因为怕爆就压成一条平线", () => {
    const first = casualEvasion(HULL_CLASSES.find((h) => h.order === 0)!);
    const last = Math.max(...HULL_CLASSES.filter((h) => h.order === 6).map(casualEvasion));
    expect(last, "终局的闪避不比开局高,那这条属性没有成长").toBeGreaterThan(first * 4);
  });

  it("软上限以内原样,不影响早期", () => {
    for (const raw of [0, 0.026, 0.1, 0.2, 0.3]) {
      expect(effectiveEvasion(raw)).toBeCloseTo(raw, 6);
    }
  });

  it("超过软上限只按四分之一计,而且永远够不到 100%", () => {
    expect(effectiveEvasion(0.9)).toBeCloseTo(0.45, 6);
    expect(effectiveEvasion(5)).toBe(EVASION_HARD_CAP);
    expect(EVASION_HARD_CAP).toBeLessThan(1);
  });

  it("堆得越多总还是越好——递减不等于封顶", () => {
    // 硬上限的坏处正是"越过之后再多投入不涨";递减要保证在够到天花板之前一直有回报。
    let prev = -1;
    for (let raw = 0; raw < 1.4; raw += 0.05) {
      const v = effectiveEvasion(raw);
      expect(v, `裸闪避 ${(raw * 100).toFixed(0)}% 时,多堆一点没有任何回报`).toBeGreaterThan(prev);
      prev = v;
    }
  });

  it("战斗里走的是递减函数,不是写死的上限", () => {
    expect(COMBAT_SRC, "Combat.tsx 里还留着硬上限").not.toMatch(/Math\.min\(0\.75,\s*\(baseEvasion/);
    expect(COMBAT_SRC).toMatch(/effectiveEvasion\(/);
  });
});
