import { describe, expect, it, beforeEach } from "vitest";
import { CREW_DEFS } from "../data/crew";
import { approvalEffects } from "../data/crewApproval";
import { crewPassiveScale, effectiveMaxHull, resolveCombatVictory, replaceState, flagship } from "./store";
import { createInitialState } from "../engine/save";
import STORE_SRC from "./store.ts?raw";
import STATION_SRC from "../ui/screens/StationPanel.tsx?raw";

/** 船员面板对**每一名**船员都写着「被动 X% · 冷却 Y%」——那个数就得对每一名都算数。
 *
 * 2026-08-31(/loop 第 36 轮)。支持度的摆幅是 0.5x(离心) 到 1.5x(死忠),而它原来
 * 只接了两条走 crewPassive() 的战斗被动。其余六条全是写死的:
 *
 *     hasCrewRecruited("oriVashti") ? 0.08 : 0
 *
 * 于是面板告诉玩家「薇拉 · 忠诚 · 被动 125%」,而她的加成一动不动还是 12%。
 * crewApproval.ts 自己的注释写的是「决定被动强度和主动冷却」,没有限定只算战斗那两条。
 *
 * 搜到的原则:船员系统要"让玩家的安排真的影响战斗结果",而不是摆设。 */

function withCrew(defId: string, approval: number) {
  const base = createInitialState();
  replaceState({ ...base, crew: [{ id: "c1", defId, approval }] as typeof base.crew });
}

describe("每一条船员被动都要吃支持度", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("没招募时倍率为 0", () => {
    expect(crewPassiveScale("oriVashti")).toBe(0);
  });

  it("倍率跟着支持度走,而且真的分档", () => {
    withCrew("oriVashti", 10);   // resentful
    const low = crewPassiveScale("oriVashti");
    withCrew("oriVashti", 50);   // steady
    const mid = crewPassiveScale("oriVashti");
    withCrew("oriVashti", 95);   // devoted
    const high = crewPassiveScale("oriVashti");
    expect(low).toBeCloseTo(approvalEffects(10).passiveMultiplier, 6);
    expect(mid).toBeCloseTo(1, 6);
    expect(high).toBeCloseTo(approvalEffects(95).passiveMultiplier, 6);
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
  });

  it("通用招募按份叠加——两名死忠参谋顶三份", () => {
    const base = createInitialState();
    replaceState({
      ...base,
      crew: [
        { id: "a", defId: "recruitTactician", approval: 95 },
        { id: "b", defId: "recruitTactician", approval: 95 },
      ] as typeof base.crew,
    });
    expect(crewPassiveScale("recruitTactician")).toBeCloseTo(3.0, 6);
  });

  it("最大船体真的随支持度变——离心和死忠之间要看得出差", () => {
    const ship = createInitialState().ships[0];
    withCrew("unit7Requiem", 10);
    const low = effectiveMaxHull(ship);
    withCrew("unit7Requiem", 95);
    const high = effectiveMaxHull(ship);
    expect(high, "七号安魂的 +15% 最大船体没有吃支持度").toBeGreaterThan(low);
  });

  it("BOSS 的精华奖励随薇拉的支持度变", () => {
    const base = createInitialState();
    const run = (approval: number) => {
      replaceState({ ...base, ships: base.ships.map((s, i) => (i === 0 ? { ...s, level: 40 } : s)), crew: [{ id: "v", defId: "velaCantor", approval }] as typeof base.crew });
      return resolveCombatVictory("choirDefenseGrid", null, undefined, 0, flagship.value!.currentHp).rewards.originEssence!;
    };
    expect(run(95), "死忠的薇拉给的精华并不比离心的多").toBeGreaterThan(run(10));
  });

  it("源码里不再有绕过支持度的写死被动", () => {
    // `hasCrewRecruited(id) ? x : 0` 这种写法就是绕过去的那一类。
    const offenders = CREW_DEFS.filter(
      (c) => c.passive && new RegExp(`hasCrewRecruited\\("${c.id}"\\)\\s*\\?`).test(STORE_SRC + STATION_SRC),
    );
    expect(
      offenders.map((c) => c.id),
      `这些船员的被动是写死的,不吃支持度,而面板上照样显示倍率:\n${offenders.map((c) => c.id).join("\n")}`,
    ).toEqual([]);
  });
});
