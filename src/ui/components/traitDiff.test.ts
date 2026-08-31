import { describe, expect, it } from "vitest";
import { MODULE_DEFS, MODULE_RARITY_MULTIPLIER } from "../../data/modules";
import { primaryStat } from "../../engine/modules";
import type { ModuleInstance } from "../../data/types";
import STATS_SRC from "./ModuleStats.tsx?raw";

/** 换装的卡面必须把词条一起摆出来,光有数值差是在误导。
 *
 * 2026-08-31(/loop 第 46 轮)。搜同类游戏搜到的是"无脑必选"——一旦某个选项严格
 * 更强,构筑系统就不再是构筑。回头量 Emberwake,问题比那还早一步:**玩家根本
 * 看不见自己在选什么**。
 *
 * 每件抽出来的模组都带 1-3 条随机词条,而词条之间差着一个数量级:
 *
 *     barrage  三连射,每发 42%   ≈ ×2.26
 *     volley   再打一发满伤       ≈ ×2.00
 *     crit     +12% 暴击率        ≈ ×1.06
 *
 * 词条能值 2.1 倍,而整条稀有度曲线(mk1→mk5)才 3.04 倍。可第 19 轮加的那个
 * 「对比同类最强」只比**基础数值**,benchmarkFor 挑参照物用的也只是基础数值。
 * 于是每场仗都要做一次的决定,玩家看到的是真相里较小的那一半,而且会被带反:
 *
 *     拒止栅格 MK3   伤害 61 +9   ← 看起来是微弱升级
 *     实际上它拿 1 条词条换了 4 条,其中「标记」是全来源 +50% 伤害
 */

function inst(defId: string, traits: string[]): ModuleInstance {
  return { id: "x", defId, rarity: "mk3", level: 1, traits, lockedTraitSlot: null, quality: 1 };
}

describe("换装卡面要把词条一起摆出来", () => {
  /** 前提:词条确实是随机的,不是每件都一样。 */
  it("词条池够大,同一款模组能滚出不同的词条", () => {
    const varied = MODULE_DEFS.filter((d) => d.traitPool.length >= 2);
    expect(varied.length, "几乎没有模组有可变词条,那这条守卫是空转").toBeGreaterThan(100);
  });

  /** 这是整件事的根:数值行**看不出**两件模组的区别,而它们强度差一倍。 */
  it("数值行区分不了词条不同的两件模组", () => {
    const def = MODULE_DEFS.find((d) => d.baseDamage !== undefined && d.traitPool.length >= 2)!;
    const a = inst(def.id, [def.traitPool[0]]);
    const b = inst(def.id, [def.traitPool[1]]);
    expect(
      primaryStat(a)?.value,
      "词条不同的两件模组基础数值居然不同,那这条守卫的前提要重写",
    ).toBe(primaryStat(b)?.value);
  });

  /** 词条的量级不能比稀有度小太多,否则"只看数值"其实是够用的。 */
  it("词条的强度跨度和整条稀有度曲线是一个量级", () => {
    // 多发类词条是纯加法叠在基础伤害上(见 Combat.tsx 的 barrage/volley/scatter)。
    const barrage = 1 + 3 * 0.42; // 三连射,每发 42%
    const rarity = MODULE_RARITY_MULTIPLIER.mk5 / MODULE_RARITY_MULTIPLIER.mk1;
    expect(
      barrage,
      `单条词条只值 ×${barrage},而稀有度整条曲线是 ×${rarity}——那词条确实可以不显示`,
    ).toBeGreaterThan(rarity * 0.5);
  });

  /** 四个界面共用这一个组件,所以补在这里就是四处一起补——但也意味着删掉它
   * 就是四处一起瞎。 */
  it("共用的数值组件里有词条差", () => {
    expect(STATS_SRC, "ModuleStats 里没有词条差").toMatch(/function TraitDiff/);
    expect(STATS_SRC, "词条差没有被渲染出来").toMatch(/<TraitDiff\b/);
  });

  it("词条差同时给出得到的和失去的,而不是只报喜", () => {
    expect(STATS_SRC, "只算了会得到的词条,没算会失去的").toMatch(/const lost = /);
    expect(STATS_SRC).toMatch(/const gained = /);
  });

  /** 沿用第 19 轮的立场:不替玩家下结论。 */
  it("不给「这是升级」的结论徽章", () => {
    expect(
      /isUpgrade|betterThan|升级徽章|upgradeBadge/.test(STATS_SRC),
      "卡面替玩家把判断做掉了——带词条的那件常常数值更低却更该留着",
    ).toBe(false);
  });
});
