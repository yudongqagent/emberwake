import { describe, expect, it, beforeEach } from "vitest";
import { pendingFits, replaceState } from "./store";
import { createInitialState } from "../engine/save";
import { moduleDefById } from "../data/modules";
import { hullClassById } from "../data/hullClasses";
import type { ModuleInstance, ShipInstance } from "../data/types";
import MODULES_SRC from "../ui/screens/Modules.tsx?raw";

/** 2026-08-31(/loop 第 18 轮)。55 级存档的模组页实拍:
 *
 *     功率负载 3/256    武器 ×10 全空    装甲 ×8 全空
 *     库存——8 件未装备(3 把 MK5 武器 / 2 件 MK5 装甲 / …)
 *     一键出售 4 件重复模组 — +1700     ← 面板最显眼的按钮
 *
 * 玩家一门炮都没装,而游戏唯一主动建议的动作是把 MK5 卖掉。库存里每件模组旁边
 * 只有「出售」,没有「装配」。 */

function mod(id: string, defId: string, rarity: ModuleInstance["rarity"], quality = 0.5): ModuleInstance {
  return { id, defId, rarity, level: 1, traits: [], lockedTraitSlot: null, quality };
}

function shipWithHull(hullClass: string): ShipInstance {
  const s = hullClassById(hullClass).slots;
  const total = s.weapon + s.armor + s.engine + s.utility;
  return {
    ...createInitialState().ships[0],
    hullClass: hullClass as ShipInstance["hullClass"],
    equipped: Array(total).fill(null),
  };
}

/** 找一个存在的模组 def id,类型指定。 */
function defOfType(type: string, mk: string): string {
  const ids = ["bauhiniaWeapon1", "bauhiniaWeapon5", "bauhiniaArmor1", "bauhiniaArmor5", "bauhiniaEngine5", "bauhiniaUtility5"];
  return ids.find((id) => {
    try { return moduleDefById(id).type === type && id.endsWith(mk); } catch { return false; }
  })!;
}

describe("库存里装得进空槽的模组", () => {
  beforeEach(() => {
    replaceState(createInitialState());
  });

  it("空槽 + 合适的模组 = 有待装配项", () => {
    const ship = shipWithHull("destroyer");
    const w = mod("w1", defOfType("weapon", "5"), "mk5");
    replaceState({ ...createInitialState(), ships: [ship], modules: [w] });
    const fits = pendingFits(ship, [w]);
    expect(fits.length, "空的武器槽旁边躺着一把 MK5,却算不出待装配项").toBe(1);
    expect(fits[0].moduleId).toBe("w1");
    // 武器槽在数组最前面(见 slotLayout 的类型顺序),所以它必须落在 [0, weapon)。
    expect(fits[0].slotIndex).toBeLessThan(hullClassById("destroyer").slots.weapon);
  });

  it("好的先装:MK5 抢在 MK1 前面", () => {
    const layout = hullClassById("destroyer").slots;
    const ship = shipWithHull("destroyer");
    // 同类型只留一个空槽,看谁抢到。
    const s = { ...ship, equipped: [...ship.equipped] };
    const lo = mod("lo", defOfType("weapon", "1"), "mk1");
    const hi = mod("hi", defOfType("weapon", "5"), "mk5");
    // 把除第一个之外的武器槽全占掉
    for (let i = 1; i < layout.weapon; i++) s.equipped[i] = `filler${i}`;
    replaceState({ ...createInitialState(), ships: [s], modules: [lo, hi] });
    const fits = pendingFits(s, [lo, hi]);
    expect(fits[0]?.moduleId, "剩一个武器槽时应该装 MK5 而不是 MK1").toBe("hi");
  });

  it("槽位占满就不动它——绝不顶掉已装备的", () => {
    const ship = shipWithHull("destroyer");
    const full = { ...ship, equipped: ship.equipped.map((_, i) => `occupied${i}`) };
    const w = mod("w1", defOfType("weapon", "5"), "mk5");
    replaceState({ ...createInitialState(), ships: [full], modules: [w] });
    expect(pendingFits(full, [w])).toEqual([]);
  });

  it("同一个设计不会装两次", () => {
    const ship = shipWithHull("destroyer");
    const defId = defOfType("weapon", "5");
    const a = mod("a", defId, "mk5");
    const b = mod("b", defId, "mk5");
    replaceState({ ...createInitialState(), ships: [ship], modules: [a, b] });
    const fits = pendingFits(ship, [a, b]);
    expect(fits.length, "两件同设计的模组不能同时装上(equipModule 本来就按设计去重)").toBe(1);
  });
});

describe("库存面板必须给得出「装配」这个动作", () => {
  /** 这条钉的是那个真正的毛病:面板里模组只有出售一个动词。 */
  it("库存里每件模组都有装配入口,而不是只有出售", () => {
    expect(MODULES_SRC, "库存面板没有引用 pendingFits").toMatch(/pendingFits/);
    expect(MODULES_SRC, "库存面板没有一键装配").toMatch(/modules\.fitAll/);
    expect(MODULES_SRC, "单件模组没有装配按钮").toMatch(/t\("modules\.fit"\)/);
  });

  it("能装进空槽的模组不进出售名单", () => {
    // 18 个空槽位旁边建议玩家把 MK5 卖掉,是这个面板原来干的事。
    expect(MODULES_SRC).toMatch(/findDuplicatesToSell\(inventory\)\.filter\(\(id\) => !fittable\.has\(id\)\)/);
  });
});
