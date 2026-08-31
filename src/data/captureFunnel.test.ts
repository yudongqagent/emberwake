import { describe, expect, it } from "vitest";
import { ENCOUNTER_DEFS, BOUNTY_ENCOUNTER_DEFS } from "./encounters";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";
import FLEET_SRC from "../ui/screens/Fleet.tsx?raw";

/** 接舷俘获这条链,每一段都得有料。
 *
 * 2026-08-31(/loop 第 37 轮)。整套机器是齐的:战斗里有接舷指令、俘获会进
 * capturedShips、舰队页能把它赠送出去变成 alliedShips、盟舰在团战里排成编队参战、
 * 还有专门的战斗日志和「团战 — {count} 艘盟舰入列」的文案。
 *
 * 而数据是这样的:
 *
 *     遭遇总数 37   可俘获 **1**   团战 **2**
 *
 * 也就是说"接舷"这个动作在整个战役里只有**一次**用武之地(第一幕 BOSS),而它的
 * 产物最多只能在两场仗里露面。那句文案的复数形式,count 永远只能是 1。
 *
 * 这和第 31 轮的裂隙囊是同一个形状:机器造好了,料没放。 */

const ALL = [...ENCOUNTER_DEFS, ...BOUNTY_ENCOUNTER_DEFS];

describe("俘获链的每一段都要有料", () => {
  const capturable = ALL.filter((e) => e.capturable);
  const fleetBattles = ALL.filter((e) => e.fleetBattle);

  it("战斗和舰队界面确实实现了这条链,否则下面是空转", () => {
    expect(COMBAT_SRC, "战斗里没有接舷/俘获").toMatch(/captureShip\(/);
    expect(FLEET_SRC, "舰队页没有赠送").toMatch(/giftCapturedShip\(/);
    expect(COMBAT_SRC, "盟舰没有入列").toMatch(/alliedShips\.map/);
  });

  it("可俘获的目标不止一个——一次性的机制不值得做一整套界面", () => {
    expect(
      capturable.length,
      `全战役只有 ${capturable.length} 个可俘获目标,接舷这套东西基本用不上`,
    ).toBeGreaterThan(1);
  });

  it("俘获的产物要有不止一处能用上", () => {
    expect(
      fleetBattles.length,
      `只有 ${fleetBattles.length} 场团战,赠送一艘船在中间几幕里毫无回响`,
    ).toBeGreaterThan(2);
  });

  it("可俘获的必须是有船员的派系——虫群和构装体接不了舷", () => {
    const CREWED = new Set(["reavers", "bauhinia", "lionsheart", "swanreach"]);
    const odd = capturable.filter((e) => !CREWED.has(e.faction));
    expect(
      odd.map((e) => `${e.id} (${e.faction})`),
      `这些目标没有可接舷的船员:\n${odd.map((e) => e.id).join("\n")}`,
    ).toEqual([]);
  });

  it("团战都放在终局上——那才是把盟舰叫齐的时刻", () => {
    const notFinale = fleetBattles.filter((e) => !e.isBoss);
    expect(notFinale.map((e) => e.id), "团战出现在了非 BOSS 的遭遇上").toEqual([]);
  });
});
