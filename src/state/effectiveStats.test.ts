import { describe, expect, it, beforeEach } from "vitest";
import {
  effectiveShipEvasion, effectiveShipSpeed, replaceState, state, flagship,
} from "./store";
import { computeBaseEvasion, computeSpeed } from "../engine/ships";
import { EVASION_HARD_CAP } from "../engine/combat";
import { createInitialState } from "../engine/save";
import { MODULE_DEFS } from "../data/moduleDefs";
import type { ModuleInstance } from "../data/types";
import BRIDGE_SRC from "../ui/screens/Bridge.tsx?raw";
import FLEET_SRC from "../ui/screens/Fleet.tsx?raw";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";

/** 属性栏上的闪避和机动,必须是装上装备之后的那个数。
 *
 * 2026-08-31(/loop 第 59 轮)。搜到的一条:"基础属性很少直接用于战斗结算",而装备
 * 可以占到角色总属性的一半。上一轮把船体上限收成一个来源之后,顺着同一条线扫,
 * 闪避和速度是一样的病:
 *
 *     舰桥/舰队   computeBaseEvasion / computeSpeed —— **只有船自己的随机 roll**
 *     战斗        船体 roll + 装备闪避 + 「闪避」词条 + 装甲位「破盾」+ 舵手船员
 *                 速度 × 装备推力(−35% ~ +60%)
 *
 * 实测:我那条船舰桥上写「闪避 0%」,而它装着一台 2.9% 闪避的信使引擎——**整个
 * 引擎槽的属性线在船的属性栏里不存在**。而"升级引擎到底给了什么"本来就是这个
 * 游戏被抱怨过的老问题。
 *
 * 只收船本身带着的那些项:反应堆分配、出击契约、卡恩的主动技能都是战斗期间的
 * 临时状态,地图上并不存在。 */

const evasionDef = MODULE_DEFS.find((d) => (d.baseEvasion ?? 0) > 0)!;

function fit(defId: string, n: number): number {
  const ship = flagship.value!;
  const equipped = [...ship.equipped];
  const mods: ModuleInstance[] = [];
  let placed = 0;
  for (let i = 0; i < equipped.length && placed < n; i++) {
    if (equipped[i]) continue;
    const m: ModuleInstance = {
      id: `fit${placed}`, defId, rarity: "mk3", level: 5, traits: [], lockedTraitSlot: null, quality: 0.6,
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

describe("属性栏要显示装备之后的数", () => {
  beforeEach(() => replaceState(createInitialState()));

  /** 注意:**新船开局就带着装备**,所以有效值和裸基础值从第一分钟起就不一样。
   * 这条测试第一版断言"开局两者相等",立刻红了(闪避 0.0323 对 0.0263,
   * 速度 193 对 199)——夹具错了,而这个错正好说明了要修的是什么:舰桥从游戏
   * 第一分钟起显示的就不是玩家实际的闪避。 */
  it("开局就已经和裸基础值不同——这正是问题本身", () => {
    const ship = flagship.value!;
    expect(
      effectiveShipEvasion(ship),
      "新船开局装备一件都不给闪避,那这条守卫的前提要重写",
    ).not.toBeCloseTo(computeBaseEvasion(ship), 6);
    expect(effectiveShipSpeed(ship)).not.toBe(computeSpeed(ship));
  });

  it("装上带闪避的模组,属性栏的闪避就跟着涨", () => {
    const ship = flagship.value!;
    const before = effectiveShipEvasion(ship);
    const placed = fit(evasionDef.id, 2);
    expect(placed, "旗舰没有空槽,前提不成立").toBeGreaterThan(0);
    expect(
      effectiveShipEvasion(flagship.value!),
      `装了 ${placed} 件带闪避的模组,属性栏还是 ${before}`,
    ).toBeGreaterThan(before);
  });

  it("闪避过了软硬上限再显示,不会写一个打不出来的数", () => {
    fit(evasionDef.id, 12);
    expect(effectiveShipEvasion(flagship.value!)).toBeLessThanOrEqual(EVASION_HARD_CAP);
  });

  it("推力会改机动——装重甲会慢下来", () => {
    const before = effectiveShipSpeed(flagship.value!);
    const heavy = MODULE_DEFS.find((d) => (d.baseThrust ?? 0) < 0);
    expect(heavy, "没有负推力的装备,这条守卫是空转").toBeTruthy();
    fit(heavy!.id, 2);
    expect(
      effectiveShipSpeed(flagship.value!),
      "装了负推力的装备,机动没变慢",
    ).toBeLessThan(before);
  });

  it("非旗舰不吃你的装备", () => {
    fit(evasionDef.id, 2);
    const other = { ...flagship.value!, id: "other" };
    expect(effectiveShipEvasion(other)).toBeCloseTo(computeBaseEvasion(other), 6);
    expect(effectiveShipSpeed(other)).toBe(computeSpeed(other));
    expect(effectiveShipEvasion(other)).not.toBeCloseTo(effectiveShipEvasion(flagship.value!), 6);
  });

  /** 这一轮的正题:两块面板都不许再显示裸的基础值。 */
  it("舰桥和舰队都走了共用的有效值", () => {
    for (const [name, src] of [["Bridge", BRIDGE_SRC], ["Fleet", FLEET_SRC]] as const) {
      expect(src, `${name} 没用 effectiveShipEvasion`).toMatch(/effectiveShipEvasion\(ship\)/);
      expect(src, `${name} 没用 effectiveShipSpeed`).toMatch(/effectiveShipSpeed\(ship\)/);
      expect(
        /computeBaseEvasion\(ship\)/.test(src),
        `${name} 又回去显示裸的基础闪避了`,
      ).toBe(false);
    }
  });

  /** 战斗那边的项要么在这个函数里,要么是明确的战斗期临时状态。 */
  it("战斗仍然在自己的临时状态上叠加,而不是重新算一遍基础项", () => {
    expect(COMBAT_SRC, "战斗不再有装备闪避项了,说明改动挪错了地方").toMatch(/gearEvasion/);
    expect(COMBAT_SRC, "反应堆的闪避加成应当留在战斗里").toMatch(/enginesEvasionBonus/);
  });
});
