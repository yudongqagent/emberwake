import { describe, expect, it, beforeEach } from "vitest";
import { effectiveShipCrit, replaceState, flagship } from "./store";
import { computeBaseCritChance } from "../engine/ships";
import { computeCritChance } from "../engine/modules";
import { createInitialState } from "../engine/save";
import type { ModuleInstance } from "../data/types";
import { MODULE_DEFS } from "../data/moduleDefs";
import BRIDGE_SRC from "../ui/screens/Bridge.tsx?raw";
import FLEET_SRC from "../ui/screens/Fleet.tsx?raw";

/** 属性栏上的暴击,得是玩家的枪真正会暴的那个数。
 *
 * 2026-08-31(/loop 第 67 轮)。搜到的说法:没有上限的叠加会长出支配性打法。顺着
 * 这条把所有叠加型被动扫了一遍,结论是干净的(收益 0.8、偏转 0.4、回收 1.2、
 * 新星 28、冷却 0.55、再生 0.14 都封了顶,而唯一可重复购买的船员被动上一轮已经
 * 用价格门控住)。
 *
 * 但扫的过程中回到了第 59 轮**刻意没动**的那一项:暴击。
 *
 *     舰桥显示   computeBaseCritChance —— 只有船自己的随机 roll
 *     实际结算   min(0.75, **0.08** + 船体 roll + (带词条 ? 0.12 : 0) + min(0.2, 连击×0.02))
 *
 * 那个 0.08 是**每一把武器都有的底**,属性栏把它整个漏掉了。实测:我那条船舰桥
 * 上写「暴击 1%」,而它任何一把枪的实际暴击率至少 **9%**,带词条 21%,满连击 41%。
 *
 * 差九倍的后果不只是数字难看:玩家读到"暴击 1%"会合理地断定这条属性没用,从而
 * 永远不选「暴击」词条——而那条词条是 +12 个百分点,在 9% 的底上翻倍还多。 */

const weaponDef = MODULE_DEFS.find((d) => d.baseDamage !== undefined)!;
const weapon = (traits: string[]): ModuleInstance => ({
  id: "w", defId: weaponDef.id, rarity: "mk1", level: 1, traits, lockedTraitSlot: null, quality: 0.5,
});

describe("暴击的显示要和结算对得上", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("每把武器都有一个 8% 的底,而裸 roll 完全没有它", () => {
    const ship = flagship.value!;
    const bare = computeBaseCritChance(ship);
    const real = computeCritChance(weapon([]), 0, bare);
    expect(real - bare, "武器暴击不再有固定的底,那这条守卫的前提要重写").toBeCloseTo(0.08, 6);
  });

  it("属性栏给的就是那个下限,不是裸 roll", () => {
    const ship = flagship.value!;
    expect(effectiveShipCrit(ship)).toBeCloseTo(computeCritChance(weapon([]), 0, computeBaseCritChance(ship)), 6);
    expect(
      effectiveShipCrit(ship),
      "属性栏还是在显示裸 roll",
    ).toBeGreaterThan(computeBaseCritChance(ship));
  });

  it("给的是下限——带词条和连击只会更高,不会更低", () => {
    const ship = flagship.value!;
    const floor = effectiveShipCrit(ship);
    const bare = computeBaseCritChance(ship);
    expect(computeCritChance(weapon([]), 0, bare)).toBeCloseTo(floor, 6);
    expect(computeCritChance(weapon(["crit"]), 0, bare)).toBeGreaterThan(floor);
    expect(computeCritChance(weapon([]), 10, bare)).toBeGreaterThan(floor);
  });

  it("不会超过结算本身的 75% 封顶", () => {
    const ship = { ...flagship.value!, rolls: { ...flagship.value!.rolls, crit: 1 } };
    expect(effectiveShipCrit(ship)).toBeLessThanOrEqual(0.75);
  });

  it("舰桥和舰队都换成了有效值,并且给了说明", () => {
    for (const [name, src] of [["Bridge", BRIDGE_SRC], ["Fleet", FLEET_SRC]] as const) {
      expect(src, `${name} 还在显示裸的基础暴击`).not.toMatch(/computeBaseCritChance\(ship\)/);
      expect(src, `${name} 没用 effectiveShipCrit`).toMatch(/effectiveShipCrit\(ship\)/);
      expect(src, `${name} 没有解释这个数是什么`).toMatch(/bridge\.stat\.critTitle/);
    }
  });
});
