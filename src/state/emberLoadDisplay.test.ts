import { describe, expect, it, beforeEach } from "vitest";
import { emberLoad, regionThreatLoad, replaceState, state, flagship, travelToSystem, GALAXIES } from "./store";
import { createInitialState } from "../engine/save";
import { totalEmberLoad } from "../data/emberLoad";
import BRIDGE_SRC from "../ui/screens/Bridge.tsx?raw";

/** 舰桥上写的余烬负荷,必须就是战斗用的那个负荷。
 *
 * 2026-08-31(/loop 第 57 轮)。EmberLoadPanel 原来是自己算的:
 *
 *     const total = fromAscension + voluntary;
 *
 * 而战斗用的是 store.ts 的 emberLoad(),它还加了 regionThreatLoad()——所在星区
 * 自己的危险度,最深处有一条 ceil((威胁-1) × 0.4) 的地板。
 *
 * 差多少:第七星区、6 次进阶、25 级时,**面板写 6,战斗用 9**。而奖励倍率
 * ("所有战斗收益 +X%")也是按错的总数算的,于是这块面板存在的唯一理由——
 * 把这场赌注在下注之前讲清楚——正好落空。
 *
 * 更难看的是:第 50 轮我实测撞到过这个差异却没认出来。那次船是 0 次进阶、
 * 0 主动负荷(面板会写 +0%),而实测经验被乘了 **1.421**;那 42% 就是被漏掉的
 * 星区威胁负荷。当时我把它记成"余烬负荷"一笔带过,没去查面板说的对不对。
 *
 * 这和第 49 轮的装甲格挡是同一种病:显示的和实际用的不是一个数。 */

describe("余烬负荷的显示要和结算一致", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("星区威胁确实会贡献负荷——这是面板漏掉的那一份", () => {
    const deepest = [...GALAXIES].sort((a, b) => b.threat - a.threat)[0];
    travelToSystem(deepest.systems[0].id);
    expect(
      regionThreatLoad(),
      "最深的星区一点负荷都不加,那面板漏不漏它就无所谓了",
    ).toBeGreaterThan(0);
  });

  it("emberLoad() 比「进阶 + 主动」严格更大", () => {
    const deepest = [...GALAXIES].sort((a, b) => b.threat - a.threat)[0];
    travelToSystem(deepest.systems[0].id);
    const ship = flagship.value!;
    const naive = totalEmberLoad(ship.ascendedFrom.length, state.value.voluntaryLoad);
    expect(emberLoad(), `面板那种算法得 ${naive},实际是 ${emberLoad()}`).toBeGreaterThan(naive);
  });

  /** 这一轮的正题:面板不许再自己算一遍。 */
  it("舰桥面板直接用 emberLoad(),不自己求和", () => {
    expect(BRIDGE_SRC, "面板没有用 emberLoad()").toMatch(/const total = emberLoad\(\)/);
    expect(
      /const total = fromAscension \+ voluntary/.test(BRIDGE_SRC),
      "面板又回去自己加了一遍,星区那一份会再次被漏掉",
    ).toBe(false);
  });

  it("奖励倍率是按真实负荷算的", () => {
    expect(BRIDGE_SRC, "奖励倍率没有跟着真实负荷走").toMatch(/emberLoadRewardMultiplier\(total\)/);
  });

  /** 光把数字改对不够——玩家得知道这份压力是从哪来的,否则一个跟着自己飞到哪
   * 就变的数字只会更糊涂。 */
  it("面板把星区那一份单独列出来", () => {
    expect(BRIDGE_SRC, "没有列出星区带来的那一份").toMatch(/load\.fromRegion/);
    expect(BRIDGE_SRC).toMatch(/const fromRegion = /);
  });

  it("在新手村时星区那一份不占位置,不添噪音", () => {
    const shallow = [...GALAXIES].sort((a, b) => a.threat - b.threat)[0];
    travelToSystem(shallow.systems[0].id);
    expect(BRIDGE_SRC, "没有做条件渲染").toMatch(/fromRegion > 0 && \(/);
  });
});
