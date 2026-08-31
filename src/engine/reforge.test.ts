import { describe, expect, it, beforeEach } from "vitest";
import { HULL_CLASSES, siblingHullOptions } from "../data/hullClasses";
import { reforgeShip, computeMaxHull } from "./ships";
import { reforgeShipAction, replaceState, state, flagship } from "../state/store";
import { createInitialState } from "./save";
import type { ShipInstance } from "../data/types";

/** 改铸:横向换到同一层的另一艘舰级。
 *
 * 2026-08-31(/loop 第 34 轮)量出来的两件事,其实是同一个洞:
 *
 * 1. 1–6 层每层正好两艘船,而进阶只沿 order+1 走。玩家在每层做一次二选一,
 *    **永久放弃另一半**——十二艘船一辈子只开得到六艘,而且是在完全不知道另一条路
 *    手感如何的情况下选的。
 * 2. 本源精华一整趟战役产出 **4445**,而它唯一的用途——走完一条完整进阶路线
 *    (40+90+160+260+420+620)——只要 **1590**。六次进阶做完之后,精华就永远没有
 *    任何用处了,而这是个通关之后还继续玩的开放世界。
 *
 * 搜到的说法:「多出来的资源对玩家来说就等于没有价值,他们会连产出它的活动一起
 * 不再参与」;而好的沉降口应该"改变策略,而不只是加数字"。
 *
 * 最要紧的一条不变量:改铸**绝不能**增加 ascendedFrom —— 那个数组的长度是剧情
 * 推进的门槛(StoryScene.requiresAscensions),否则玩家可以花精华跳过剧情。 */

function shipAt(hullClass: string, level = 40): ShipInstance {
  const base = createInitialState().ships[0];
  return { ...base, hullClass: hullClass as ShipInstance["hullClass"], level, ascendedFrom: ["corvette"] as ShipInstance["ascendedFrom"] };
}

describe("改铸", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("每一层(除了起始层)都真的有一艘姊妹舰,否则这套东西是空转", () => {
    const tiers = [...new Set(HULL_CLASSES.map((h) => h.order))].filter((o) => o > 0);
    for (const o of tiers) {
      const one = HULL_CLASSES.find((h) => h.order === o)!;
      expect(siblingHullOptions(one.id).length, `阶梯 ${o} 没有姊妹舰`).toBeGreaterThan(0);
    }
  });

  it("起始舰没有姊妹舰", () => {
    expect(siblingHullOptions("corvette")).toEqual([]);
  });

  it("**绝不**增加进阶次数——否则花精华就能跳过剧情", () => {
    const before = shipAt("destroyer");
    const after = reforgeShip(before, "interceptor");
    expect(after.hullClass).toBe("interceptor");
    expect(
      after.ascendedFrom,
      "改铸把自己记成了一次进阶,玩家可以靠它跳过剧情门槛",
    ).toEqual(before.ascendedFrom);
  });

  it("换过去之后属性按新舰级重算,槽位按新布局迁移", () => {
    const before = { ...shipAt("destroyer"), equipped: ["w1", "w2", "a1", "a2", "e1", "u1", "u2"] };
    const after = reforgeShip(before, "interceptor");
    // 驱逐舰 240 底血 / 拦截舰 190:换过去必须真的变薄,不能还按旧舰级算。
    expect(computeMaxHull(after)).toBeLessThan(computeMaxHull(before));
    // 槽位数按新舰级的布局:拦截舰 2 武器 1 装甲 2 引擎 2 辅助 = 7。
    const slots = HULL_CLASSES.find((h) => h.id === "interceptor")!.slots;
    expect(after.equipped.length).toBe(slots.weapon + slots.armor + slots.engine + slots.utility);
    // 装甲槽从 2 减到 1,第二件装甲被挤掉——这是横向取舍的一部分,不是 bug。
    expect(after.equipped).toContain("a1");
    expect(after.equipped).not.toContain("a2");
    // 满血重置,不会带着旧舰级的血量残值。
    expect(after.currentHp).toBe(computeMaxHull(after));
  });

  it("花掉精华,而且不够就不给换", () => {
    const base = createInitialState();
    const rich = {
      ...base,
      resources: { ...base.resources, originEssence: 100 },
      flags: { ...base.flags, "act1.tigersReach.cleared": true },
      ships: [shipAt("destroyer", 10)],
    };
    replaceState(rich);
    reforgeShipAction("interceptor");
    expect(flagship.value?.hullClass, "精华够、条件满,却没换成").toBe("interceptor");
    expect(state.value.resources.originEssence, "没有扣精华").toBe(60);

    // 再换回去:这次精华不够(需要 40,只剩 60 → 够;所以先压到 10 再试)
    replaceState({ ...state.value, resources: { ...state.value.resources, originEssence: 10 } });
    reforgeShipAction("destroyer");
    expect(flagship.value?.hullClass, "精华不够也换成了").toBe("interceptor");
  });

  it("只能横向换,不能拿改铸当进阶用", () => {
    const base = createInitialState();
    replaceState({
      ...base,
      resources: { ...base.resources, originEssence: 9999 },
      flags: { ...base.flags, "act1.emberRising.cleared": true, "act1.tigersReach.cleared": true },
      ships: [shipAt("destroyer", 40)],
    });
    reforgeShipAction("cruiser"); // 高一层,应当被拒绝
    expect(flagship.value?.hullClass, "改铸把玩家送上了更高一层").toBe("destroyer");
  });
});
