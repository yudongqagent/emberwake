import { describe, expect, it } from "vitest";
import { genericRecruitCost, GENERIC_RECRUIT_BASE_COST } from "./crew";
import { effectiveEvasion, EVASION_HARD_CAP } from "../engine/combat";
import STATION_SRC from "../ui/screens/StationPanel.tsx?raw";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";

/** 可重复购买的增援,价格得随手里已有的人数涨。
 *
 * 2026-08-31(/loop 第 66 轮)。搜到的说法:商店该"补运气不好的缺口",不该变成一台
 * 成长机器。而通用增援原来是**固定 20 合金**,被动**没有上限**,且不论上不上岗
 * 都生效:
 *
 *     recruitHelmEvasionBonus = crewCount("recruitHelm") * 0.05
 *
 * 算一下:effectiveEvasion 的硬上限 60% 在原始值 1.50 时达到,只靠舵手就是
 * 1.50 / 0.05 = **30 名 = 600 合金**。而全战役合金收入 5,886(第 48 轮的账)——
 * **一成预算买下游戏允许的最高闪避,而且永久**。
 *
 * 战术官那条更歹毒:洞悉是全游戏最稀缺的资源(一周目 123 点),它按比例叠。
 *
 * 这是第 46 轮搜到的"无脑必选"在商店里的样子:一旦某个买法严格更优,别的开销就
 * 不再是选择。 */

describe("通用增援的价格要随人数涨", () => {
  it("第一个仍然便宜——补缺口这件事保住了", () => {
    expect(genericRecruitCost(0)).toBe(GENERIC_RECRUIT_BASE_COST);
  });

  it("每多一个就更贵", () => {
    for (let n = 0; n < 12; n++) {
      expect(genericRecruitCost(n + 1), `第 ${n + 2} 个不比第 ${n + 1} 个贵`).toBeGreaterThan(genericRecruitCost(n));
    }
  });

  /** 这条是整件事的量纲:把闪避堆到硬上限该是一笔买不起的账。 */
  it("把闪避堆到硬上限的总价,远超一周目的合金收入", () => {
    // 硬上限 60% 对应的原始值。
    let raw = 0;
    let helms = 0;
    while (effectiveEvasion(raw) < EVASION_HARD_CAP - 1e-9 && helms < 200) {
      helms++;
      raw = helms * 0.05;
    }
    let total = 0;
    for (let i = 0; i < helms; i++) total += genericRecruitCost(i);
    const CAMPAIGN_ALLOY = 5886; // 第 48 轮量到的一周目合金收入
    expect(helms, "堆到硬上限不需要几个人,那这条守卫的前提要重写").toBeGreaterThan(10);
    expect(
      total,
      `堆到闪避硬上限只要 ${total} 合金,而一周目总共才 ${CAMPAIGN_ALLOY}`,
    ).toBeGreaterThan(CAMPAIGN_ALLOY * 3);
  });

  it("十来个的时候已经肉疼,但还不是天文数字", () => {
    let ten = 0;
    for (let i = 0; i < 10; i++) ten += genericRecruitCost(i);
    expect(ten, `十个只要 ${ten} 合金,还是太便宜`).toBeGreaterThan(1500);
    expect(ten, `十个要 ${ten} 合金,那这条路直接被封死了`).toBeLessThan(5886);
  });

  it("界面按已有人数报价,不是写死的 20", () => {
    expect(STATION_SRC, "招募价还是写死的").not.toMatch(/const cost = stationPrice\(20\);/);
    expect(STATION_SRC).toMatch(/genericRecruitCost\(crewCount\(c\.id\)\)/);
  });

  /** 实测撞出来的:同一个 tick 里连点三次,三次都读渲染闭包里那个旧价格,
   * 三个人只花了 20×3 而不是 20+32+51。价格必须在点击那一刻重算。 */
  it("扣费按点击那一刻的价格算,连点也占不到便宜", () => {
    expect(
      STATION_SRC,
      "扣费还在用渲染时算好的 cost,快速连点会按旧价成交",
    ).toMatch(/const now = stationPrice\(genericRecruitCost\(crewCount\(c\.id\)\)\);/);
    expect(STATION_SRC).toMatch(/spend\(\{ alloy: now \}\)/);
    expect(STATION_SRC, "重算之后没有再校验一次买得起").toMatch(/if \(!canAfford\(\{ alloy: now \}\)\) return;/);
  });

  /** 前提本身也钉住:那个被动确实没有自己的上限,所以价格必须担起这个责任。
   *
   * 2026-09-01(/loop 第 116 轮):式子从 crewCount 换成了 crewPassiveScale
   * (按支持度缩放,和其余六条船员被动一致)。**线性叠加没有变,也仍然没有上限**
   * ——这条守卫的原意(价格是唯一的刹车)照旧成立,钉的形状跟着更新。 */
  it("舵手的闪避加成本身没有上限——所以价格是唯一的刹车", () => {
    expect(COMBAT_SRC).toMatch(/crewPassiveScale\("recruitHelm"\) \* 0\.05/);
    expect(
      /Math\.min\([^)]*crewPassiveScale\("recruitHelm"\)/.test(COMBAT_SRC),
      "被动那边加了上限,那这条注释要重写",
    ).toBe(false);
  });
});
