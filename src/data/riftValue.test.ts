import { describe, expect, it } from "vitest";
import { riftWaveHaul } from "./rift";
import { ENCOUNTER_DEFS, BOUNTY_ENCOUNTER_DEFS } from "./encounters";
import { riftDropRarityFloor } from "../engine/modules";
import { MARKET_MAX_RARITY, MODULE_RARITY_ORDER } from "./modules";
import INTERLUDE_SRC from "../ui/screens/RiftInterlude.tsx?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 裂隙真正的奖品是**打捞的档次**,那就得在抉择点上说出来。
 *
 * 2026-08-31(/loop 第 55 轮)。搜同类游戏搜到的是:"支线如果没有有竞争力的回报,
 * 玩家就会跳过它,不管设计意图如何"。
 *
 * 量了一下裂隙每一波的资源,对比常规空间最肥的一场(圣咏散兵,合计 2,667):
 *
 *     深度 1   205   8%       深度 6    920   34%
 *     深度 3   374  14%       深度 10  3,053  114%
 *
 * 而设计注释自己写着"深度 6 对中期船是一堵真墙"。也就是说在玩家够得到的那一段,
 * 一波只值常规一场的十分之一到三分之一——**而且任何一场失手,累计的全部收获
 * 一起没收**。
 *
 * 可舰桥上的原话是"收获远超常规空间的任何战斗"。玩家读到这句,潜下来,拿到
 * 十分之一,然后再也不来了。
 *
 * 但这个模式并不是没有价值——它是 mk4/mk5 的**唯一**来源(商店封顶 mk3,普通
 * 战斗掉落也封顶 mk3),而且并不远:
 *
 *     深度 1 → mk2    深度 2-3 → mk3    深度 4-6 → **mk4**    深度 7+ → mk5
 *
 * 也就是说买不到的 mk4 在深度 4 就有,就在那堵"深度 6 的墙"之前。问题不是门槛
 * 太高,是 riftDropRarityFloor 在这一轮之前**没有任何界面引用过**——玩家从来
 * 没被告知这里真正的东西是什么。
 *
 * (第一版分析我把 riftDropRarityFloor 的返回索引当成了档位号,说成"mk4 要深度
 * 7+"。是浏览器实拍那张"现在撤出:MK2 / 深度 2:MK3"把它纠正过来的。)
 *
 * 所以修的不是数值(那会把第 48 轮刚校准的合金曲线冲垮),是把真相摆到"再下一层
 * 吗"那个决定跟前。 */

const bestNormal = [...ENCOUNTER_DEFS, ...BOUNTY_ENCOUNTER_DEFS].reduce((a, b) => {
  const v = (x: typeof a) => (x.rewards.salvage ?? 0) + (x.rewards.sourcePoints ?? 0) + (x.rewards.alloy ?? 0);
  return v(b) > v(a) ? b : a;
});
const bestNormalValue =
  (bestNormal.rewards.salvage ?? 0) + (bestNormal.rewards.sourcePoints ?? 0) + (bestNormal.rewards.alloy ?? 0);

const waveValue = (d: number) => {
  const h = riftWaveHaul(d);
  return (h.salvage ?? 0) + (h.sourcePoints ?? 0) + (h.alloy ?? 0);
};

describe("裂隙的价值必须说得清", () => {
  /** 前提:资源上它在够得到的那一段确实是亏的。这条不是要"修好",是要钉住
   * 舰桥文案不许再吹资源。 */
  it("在够得到的深度上,资源确实少于常规一场——所以文案不能吹资源", () => {
    expect(waveValue(6) / bestNormalValue).toBeLessThan(1);
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      const blurb = seg.match(/"rift\.bridgeBlurb": "((?:[^"\\]|\\.)*)"/)?.[1] ?? "";
      expect(blurb, `${lang} 找不到 rift.bridgeBlurb`).toBeTruthy();
      expect(
        blurb,
        `${lang} 的舰桥文案还在吹"收获远超常规空间",而实测深度 6 只有 ${(waveValue(6) / bestNormalValue * 100).toFixed(0)}%`,
      ).not.toMatch(/远超常规|far beyond anything in normal space/);
    }
  });

  it("mk4/mk5 确实只有裂隙出——这才是它的卖点", () => {
    const marketIdx = MODULE_RARITY_ORDER.indexOf(MARKET_MAX_RARITY);
    expect(marketIdx, "商店封顶变了").toBeLessThan(MODULE_RARITY_ORDER.length - 1);
    const deepest = riftDropRarityFloor(9);
    expect(
      MODULE_RARITY_ORDER.indexOf(deepest),
      "深潜也拿不到超过商店封顶的东西,那这个模式就没有独占价值了",
    ).toBeGreaterThan(marketIdx);
  });

  it("档次随深度提高,而且提高得看得见", () => {
    const tiers = [1, 2, 4, 7].map((d) => MODULE_RARITY_ORDER.indexOf(riftDropRarityFloor(d)));
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i], "更深一层的打捞档次没有提高").toBeGreaterThan(tiers[i - 1]);
    }
  });

  /** 这一轮的正题:那个数字要出现在"再下一层吗"跟前。 */
  it("抉择界面把现在撤和再撑一层的档次都摆出来了", () => {
    expect(INTERLUDE_SRC, "抉择界面完全没提打捞档次").toMatch(/riftDropRarityFloor\(/);
    expect(INTERLUDE_SRC, "只说了现在撤能拿什么,没说再撑一层能拿什么").toMatch(/riftDropRarityFloor\(nextDepth\)/);
    expect(INTERLUDE_SRC, "没告诉玩家商店封顶在哪,那独占就没有参照").toMatch(/MARKET_MAX_RARITY/);
  });

  it("三条新文案中英都在", () => {
    for (const key of ["rift.dropNow", "rift.dropNext", "rift.dropCeiling"]) {
      const count = STRINGS_SRC.split(`"${key}":`).length - 1;
      expect(count, `${key} 不是中英各一条(找到 ${count} 条)`).toBe(2);
    }
  });
});
