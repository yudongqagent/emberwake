import { describe, expect, it } from "vitest";
import { MARKET_MAX_RARITY, MODULE_RARITY_ORDER } from "./modules";
import type { ResourceType } from "./types";
import STATION_SRC from "../ui/screens/StationPanel.tsx?raw";
import MODULES_SRC from "../ui/screens/Modules.tsx?raw";
import STORE_SRC from "../state/store.ts?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 每一种资源都得有花得掉的地方。
 *
 * 2026-09-01(/loop 第 114 轮)。搜到的说法很直白:"没有花掉的理由,玩家就会囤,
 * 然后失去兴趣"。而这个仓库自己踩过同一类——招募页那条注释还记着
 * 「合金除了倒卖之外没有任何消耗口」(2026-08 playtest 的 Issue #2)。
 *
 * 这一轮头一次真的进了空间站,顺着查每种资源的出口,查出**源点**:
 *
 *     源点全代码库只有两个消耗口,而且都在制造工坊里(刷新 + 购买)
 *     而工坊被 MARKET_MAX_RARITY 钉死在 mk3
 *     mk4/mk5 只在裂隙里出——那是裂隙存在的理由,也是它按钮上写的卖点
 *
 * 于是任何一个下过裂隙的玩家,工坊从此只卖比他手里更差的东西。实测我自己的存档:
 * 手上 23 件 mk5,货架上四件全是负增益(Dmg 19−69、4.9/s−13.4……),
 * 而源点存着 **2340**,只进不出。
 *
 * 源点还偏偏是裂隙掉落里最大的一项(90 × 1.35^(depth-1)),所以越玩越囤。
 *
 * 修法是在交易页加一条单向出口,汇率按裂隙掉落比例定(深度 1 是 90 源点 : 45
 * 合金,正好 2:1 → 20 换 10)。不动 MARKET_MAX_RARITY:工坊卖不到 mk4/mk5 是
 * 刻意的,那是裂隙的身份。也不开反向:囤的是源点,给它出口就够了。
 *
 * 实测:交易页出现第三行 220 ⇄ 110,点下去 -220 源点 / +110 合金,和显示一致。 */

/** 一种资源的"出口"——能把它花掉的地方。 */
const SINKS: Record<Exclude<ResourceType, never>, { where: string; src: string; pattern: RegExp }[]> = {
  salvage: [
    { where: "空间站修船", src: STATION_SRC, pattern: /spend\(\{ salvage: now \}\)/ },
    { where: "交易页兑换", src: STATION_SRC, pattern: /\["salvage", "alloy",/ },
  ],
  alloy: [
    { where: "模块升级", src: STORE_SRC, pattern: /resources\.alloy < cost/ },
    { where: "空间站招募", src: STATION_SRC, pattern: /spend\(\{ alloy: now \}\)/ },
  ],
  sourcePoints: [
    { where: "制造工坊", src: STATION_SRC, pattern: /spend\(\{ sourcePoints: now \}\)/ },
    { where: "交易页兑换", src: STATION_SRC, pattern: /\["sourcePoints", "alloy",/ },
  ],
  insight: [
    { where: "词条重掷", src: MODULES_SRC, pattern: /spend\(\{ insight: cost \}\)/ },
  ],
  originEssence: [
    { where: "舰级进阶", src: STORE_SRC, pattern: /originEssence/ },
  ],
};

describe("资源不能只进不出", () => {
  it("每一种资源都至少有一个花得掉的地方", () => {
    const dead: string[] = [];
    for (const [res, sinks] of Object.entries(SINKS)) {
      const live = sinks.filter((s) => s.pattern.test(s.src));
      if (live.length === 0) dead.push(`${res} 一个消耗口都没有了`);
    }
    expect(dead, dead.join("\n")).toEqual([]);
  });

  /** 源点这一条要单独钉:它唯一的老出口被稀有度上限锁死了。 */
  it("源点的出口不只有制造工坊那一个", () => {
    const outside = SINKS.sourcePoints.filter((s) => !/制造工坊/.test(s.where));
    const live = outside.filter((s) => s.pattern.test(s.src));
    expect(
      live.length,
      "源点又只剩制造工坊一个出口了——而工坊卖不到 mk4/mk5,后期就是死钱",
    ).toBeGreaterThan(0);
  });

  /** 这条钉住"为什么工坊救不了源点":上限低于最高稀有度,是刻意的。 */
  it("工坊确实卖不到最高稀有度——所以它不能是唯一的出口", () => {
    const top = MODULE_RARITY_ORDER[MODULE_RARITY_ORDER.length - 1];
    expect(MARKET_MAX_RARITY, "工坊现在卖得到顶级了?那这条守卫的前提要重写").not.toBe(top);
    expect(MODULE_RARITY_ORDER.indexOf(MARKET_MAX_RARITY))
      .toBeLessThan(MODULE_RARITY_ORDER.length - 1);
  });

  /** 兑换是单向的:开反向会让人拿合金去刷工坊,那不是这条修法要解决的事。 */
  it("源点兑换是单向的", () => {
    expect(STATION_SRC).toMatch(/\["sourcePoints", "alloy",/);
    expect(STATION_SRC, "开了合金换源点的反向——不需要,而且会绕开工坊的定价")
      .not.toMatch(/\["alloy", "sourcePoints",/);
  });

  it("交易页的说明跟着改了,没留下过时的文案", () => {
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      const hint = seg.match(/"station\.tradeHint": "([^"]*)"/)?.[1] ?? "";
      expect(hint, `${lang} 的交易页说明没提源点——界面上有三行,文案只讲两行`)
        .toMatch(lang === "EN" ? /Source Points/ : /源点/);
    }
  });
});
