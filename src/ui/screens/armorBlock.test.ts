import { describe, expect, it, beforeEach } from "vitest";
import { computeModuleBlock } from "../../engine/modules";
import { MODULE_DEFS } from "../../data/moduleDefs";
import { encounterThreatRead, replaceState, state, flagship } from "../../state/store";
import { createInitialState } from "../../engine/save";
import type { ModuleInstance } from "../../data/types";
import COMBAT_SRC from "./Combat.tsx?raw";

/** 界面上写的格挡,必须就是挨打时用的那个格挡。
 *
 * 2026-08-31(/loop 第 49 轮)。战斗里的 armorBlock 加的是 `def.baseBlock` **原始值**,
 * 而所有显示路径(模组页、抉择卡、掉落展示、ModuleStats)用的都是 computeModuleBlock
 * ——它乘了稀有度 × 等级 × 品质。拿实际存档核对:
 *
 *     纹章护盾 MK2 5 级   界面写「格挡 22」   战斗实际用 11
 *     格挡装甲 MK2 5 级   界面写「格挡 26」   战斗实际用 13
 *
 * 玩家看到的格挡是实际的两倍,而且**给装甲升级,显示的数字在涨、战斗里的值纹丝
 * 不动**——1 级和 7 级的同一块装甲,挨打时一模一样。
 *
 * 这和 engine/modules.ts 里 effectPotency 那条注释说的是同一件事(一块 mk1 的偏转板
 * 和一块 mk5 满级的偏转板完全一样),当时修了**效果**,漏了格挡这个数值本身。全代码库
 * 十一处引用,只有战斗这一处没接上。 */

const armorDef = MODULE_DEFS.find((d) => d.baseBlock !== undefined)!;

function armor(rarity: ModuleInstance["rarity"], level: number): ModuleInstance {
  return { id: "a", defId: armorDef.id, rarity, level, traits: [], lockedTraitSlot: null, quality: 0.6 };
}

describe("装甲的格挡在战斗里要算数", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("升级真的会提高格挡——否则升级是骗钱", () => {
    const lo = computeModuleBlock(armor("mk2", 1));
    const hi = computeModuleBlock(armor("mk2", 7));
    expect(hi, `1 级 ${lo} / 7 级 ${hi},升级什么都没给`).toBeGreaterThan(lo);
  });

  it("稀有度也算数", () => {
    expect(computeModuleBlock(armor("mk5", 1))).toBeGreaterThan(computeModuleBlock(armor("mk1", 1)));
  });

  /** 这条是这一轮的正题:战斗必须走 computeModuleBlock,不能读原始值。 */
  it("战斗用的是算过的格挡,不是定义里的原始值", () => {
    expect(
      COMBAT_SRC,
      "armorBlock 又回去读 def.baseBlock 了——界面写的和挨打时用的会再次对不上",
    ).toMatch(/armorBlock[\s\S]{0,400}?computeModuleBlock\(m\)/);
    expect(
      /reduce\(\(sum, m\) => sum \+ \(moduleDefById\(m\.defId\)\.baseBlock \?\? 0\)/.test(COMBAT_SRC),
      "战斗还在把原始 baseBlock 直接相加",
    ).toBe(false);
  });

  /** 交战前的读数也得走真实结算,否则它给的是一个吓唬人的数字。 */
  it("交战前的读数会把自己的格挡算进去", () => {
    const s = createInitialState();
    replaceState(s);
    const bare = encounterThreatRead("kestrelsRestRaid");
    expect(bare, "读不出这场遭遇战").toBeTruthy();

    // 给旗舰装上一块装甲,同一场仗读出来必须更轻。
    const ship = flagship.value!;
    const mod = { ...armor("mk5", 7), id: "armorTest" };
    const idx = ship.equipped.findIndex((x) => !x);
    expect(idx, "旗舰没有空槽,这条测试的前提不成立").toBeGreaterThanOrEqual(0);
    const equipped = [...ship.equipped];
    equipped[idx] = mod.id;
    state.value = {
      ...state.value,
      modules: [...state.value.modules, mod],
      ships: state.value.ships.map((x) => (x.id === ship.id ? { ...x, equipped } : x)),
    };
    const armored = encounterThreatRead("kestrelsRestRaid")!;
    expect(
      armored.worstHitFraction,
      "装了一块 mk5 满级装甲,交战前的读数没有变轻——它没在走真实结算",
    ).toBeLessThan(bare!.worstHitFraction);
  });

  it("读数报的是敌人数量,不是遭遇战条目数", () => {
    const read = encounterThreatRead("kestrelsRestRaid")!;
    expect(read.enemies).toBeGreaterThan(0);
  });

  it("不存在的遭遇战不会炸,返回空", () => {
    expect(encounterThreatRead("nopeNotAnEncounter")).toBeNull();
  });
});
