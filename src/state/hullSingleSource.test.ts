import { describe, expect, it, beforeEach } from "vitest";
import { effectiveMaxHull, replaceState, state, flagship, repairFlagship } from "./store";
import { computeMaxHull } from "../engine/ships";
import { createInitialState } from "../engine/save";
import { MODULE_DEFS } from "../data/moduleDefs";
import type { ModuleInstance } from "../data/types";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";

/** 船体上限只能有一个真相来源。
 *
 * 2026-08-31(/loop 第 58 轮)。搜到的原话:"有两个真相来源,其中一个多半是错的
 * ——就算现在不错,也只是还没错。"前两轮各撞到一次(装甲格挡、余烬负荷),这次
 * 不逐个撞,直接扫界面层里自己算的派生值,扫出了这一条:
 *
 *     界面    computeMaxHull × (1 + 0.15 × 七号安魂**支持度缩放**)
 *     战斗    computeMaxHull × (1 + min(0.6, 0.15×船体模组) + (招募了 ? 0.15 : 0)) × 契约倍率
 *
 * 两条互不包含对方那一项:
 *
 *   - **模组「船体」加成(最高 +60%)在界面上完全不存在**。装满船体模组的玩家,
 *     地图上的血条比战斗里短一大截。
 *   - 七号安魂那份在界面上跟着支持度缩放,在战斗里是固定 0.15。
 *
 * 最难看的后果:repairFlagship() 把血修到 effectiveMaxHull,修船报价也按它算缺多少
 * ——**花钱修满,进战斗还是不满**,而且没有任何办法把差的那截补上。 */

const hullDef = MODULE_DEFS.find((d) => d.signature === "hullBonus" || d.traitPool.includes("hullBonus"))!;

function fitHullModules(n: number) {
  const ship = flagship.value!;
  const equipped = [...ship.equipped];
  const mods: ModuleInstance[] = [];
  let placed = 0;
  for (let i = 0; i < equipped.length && placed < n; i++) {
    if (equipped[i]) continue;
    const m: ModuleInstance = {
      id: `hullmod${placed}`,
      defId: hullDef.id,
      rarity: "mk1",
      level: 1,
      traits: hullDef.signature === "hullBonus" ? [] : ["hullBonus"],
      lockedTraitSlot: null,
      quality: 0.5,
    };
    mods.push(m);
    equipped[i] = m.id;
    placed++;
  }
  state.value = {
    ...state.value,
    modules: [...state.value.modules, ...mods],
    ships: state.value.ships.map((s) => (s.id === ship.id ? { ...s, equipped } : s)),
  };
  return placed;
}

describe("船体上限只有一个来源", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("装上船体模组,界面上的上限就跟着涨——原来它完全看不见", () => {
    const ship = flagship.value!;
    const before = effectiveMaxHull(ship);
    const placed = fitHullModules(2);
    expect(placed, "旗舰没有空槽,这条测试的前提不成立").toBeGreaterThan(0);
    const after = effectiveMaxHull(flagship.value!);
    expect(after, `装了 ${placed} 件船体模组,上限还是 ${before}`).toBeGreaterThan(before);
  });

  it("加成有封顶,不会被堆穿", () => {
    fitHullModules(8);
    const ship = flagship.value!;
    const ratio = effectiveMaxHull(ship) / computeMaxHull(ship);
    expect(ratio, `船体加成到了 ${ratio.toFixed(2)} 倍`).toBeLessThanOrEqual(1.6 + 0.15 * 1.5 + 0.001);
  });

  /** 这一轮的正题:战斗不许再自己算一遍。 */
  it("战斗直接用 effectiveMaxHull", () => {
    expect(COMBAT_SRC, "战斗没有走共用的上限").toMatch(/const maxHull = Math\.round\(effectiveMaxHull\(ship\)/);
    expect(
      /computeMaxHull\(ship\) \* \(1 \+ hullBonusFraction\)/.test(COMBAT_SRC),
      "战斗又回去自己算船体上限了",
    ).toBe(false);
    expect(
      /hasCrewRecruited\("unit7Requiem"\) \? 0\.15 : 0/.test(COMBAT_SRC),
      "战斗还在用固定 0.15 的船员加成,而界面那边是按支持度缩放的",
    ).toBe(false);
  });

  /** 修满就该是真的满。 */
  it("修船之后,血量正好等于上限", () => {
    fitHullModules(2);
    const ship = flagship.value!;
    state.value = {
      ...state.value,
      ships: state.value.ships.map((s) => (s.id === ship.id ? { ...s, currentHp: 1 } : s)),
    };
    repairFlagship();
    const after = flagship.value!;
    expect(after.currentHp, "修完之后血量和上限对不上").toBe(effectiveMaxHull(after));
  });

  /** 舰队面板也拿这个函数显示友舰,那些船身上没有你的装备。 */
  it("非旗舰不吃你的装备和船员加成", () => {
    fitHullModules(3);
    const other = { ...flagship.value!, id: "someOtherShip" };
    expect(effectiveMaxHull(other)).toBe(computeMaxHull(other));
  });
});
