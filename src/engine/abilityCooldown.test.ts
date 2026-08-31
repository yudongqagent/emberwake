import { describe, expect, it } from "vitest";
import { abilityCooldownSeconds } from "./combat";
import { CREW_DEFS } from "../data/crew";
import { HULL_CLASS_ABILITIES } from "../data/namedShips";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";

/** 冷却比一场仗还长的技能,是个死按钮。
 *
 * 2026-08-31(/loop 第 52 轮)。搜同类游戏搜到的两句:"冷却比一场遭遇战还长的技能
 * 会变成死按钮",以及"冷却超过 6 秒,玩家就会开始忘记它的存在"。
 *
 * 拿实测的战斗长度(中位 11.6 秒)对一遍原来的 `activeCooldown × 2.4`:
 *
 *     步数 2   4.8 秒   一场仗能用 3 次    1 个技能
 *     步数 3   7.2 秒            2 次    3 个
 *     步数 4   9.6 秒            2 次    5 个
 *     步数 5  12.0 秒            1 次    6 个
 *     步数 6  14.4 秒            1 次    1 个
 *     步数 7  16.8 秒            1 次    3 个
 *     步数 8  19.2 秒            1 次    1 个
 *     步数 9  21.6 秒            1 次    1 个
 *
 * **21 个技能里 12 个一场仗只能用一次**——那个倒计时到打完都走不完。而步数 5
 * 和步数 9 在数据上是 1.8 倍的设计代价,实际效果完全相同,冷却这条平衡轴在
 * 上半段是空的。
 *
 * 这和第 51 轮的阵位是同一个形状:参数是按"感觉该多久"定的,从来没有对照过
 * 一场仗实际有多长。 */

/** 和 rangeTimescale.test.ts 同源的实测中位。改之前先去量。 */
const TYPICAL_FIGHT_SECONDS = 11.6;

const STEPS = [
  ...CREW_DEFS.map((c) => c.activeCooldown),
  ...HULL_CLASS_ABILITIES.map((h) => h.activeCooldown),
].filter((n): n is number => typeof n === "number");

/** 一场仗里按得下几次(开场那次不用等)。 */
const usesPerFight = (steps: number) => Math.floor(TYPICAL_FIGHT_SECONDS / abilityCooldownSeconds(steps)) + 1;

describe("技能冷却要落在一场仗之内", () => {
  it("确实有一堆技能在用这套冷却,不是空转", () => {
    expect(STEPS.length).toBeGreaterThan(15);
  });

  it("没有哪个技能的冷却长过一场仗——否则那个数字是装饰", () => {
    const dead = [...new Set(STEPS)]
      .filter((s) => abilityCooldownSeconds(s) >= TYPICAL_FIGHT_SECONDS)
      .map((s) => `步数 ${s} = ${abilityCooldownSeconds(s).toFixed(1)} 秒`);
    expect(dead, `这些技能一场仗只按得下一次,冷却数字走不完:\n${dead.join("\n")}`).toEqual([]);
  });

  it("每个技能一场仗至少按得下两次", () => {
    for (const s of new Set(STEPS)) {
      expect(usesPerFight(s), `步数 ${s} 一场仗只能用 ${usesPerFight(s)} 次`).toBeGreaterThanOrEqual(2);
    }
  });

  /** 平衡轴要真的有斜率:步数高的不能和步数低的一样好用。 */
  it("最贵的和最便宜的用起来不一样", () => {
    const lo = Math.min(...STEPS);
    const hi = Math.max(...STEPS);
    expect(hi, "所有技能的冷却步数都一样,这条守卫是空转").toBeGreaterThan(lo);
    expect(
      usesPerFight(lo),
      `步数 ${lo} 和步数 ${hi} 一场仗都能用 ${usesPerFight(lo)} 次——冷却这条平衡轴什么都没做`,
    ).toBeGreaterThan(usesPerFight(hi));
  });

  it("步数越大冷却越长,顺序不能乱", () => {
    for (let s = 2; s <= 12; s++) {
      expect(abilityCooldownSeconds(s)).toBeGreaterThan(abilityCooldownSeconds(s - 1));
    }
  });

  it("也不能短到变成连点——最短的仍然要等", () => {
    expect(abilityCooldownSeconds(Math.min(...STEPS))).toBeGreaterThan(2);
  });

  it("船员技能和舰级技能走同一个函数,不能一边改一边漏", () => {
    expect(COMBAT_SRC, "船员技能没走共用的冷却换算").toMatch(/setCrewCooldowns[\s\S]{0,160}?abilityCooldownSeconds\(/);
    expect(COMBAT_SRC, "舰级技能没走共用的冷却换算").toMatch(/setNamedAbilityCooldown\(abilityCooldownSeconds\(/);
    expect(
      /activeCooldown \* TURN_SECONDS/.test(COMBAT_SRC),
      "还有地方在用旧的 activeCooldown × TURN_SECONDS",
    ).toBe(false);
  });
});
