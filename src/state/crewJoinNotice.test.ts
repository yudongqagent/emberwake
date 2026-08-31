import { describe, expect, it, beforeEach } from "vitest";
import { CREW_DEFS } from "../data/crew";
import { completeScene, pendingCrewUnlocks, pendingHullUnlocks, replaceState, state, STORY_SCENES } from "./store";
import { createInitialState } from "../engine/save";
import APP_SRC from "../App.tsx?raw";

/** 具名船员入列必须告诉玩家——新舰级有整屏提示,船员却是静悄悄加进名册的。
 *
 * 2026-08-31(/loop 第 41 轮)。7 名具名船员(含全部 3 名传奇)在剧情 flag 满足时由
 * checkNamedCrewUnlocks 自动加进 state.crew,**没有任何提示**。而同一类事件——
 * 新舰级解锁——是有 pendingHullUnlocks + 整屏提示卡的。
 *
 * 再叠上第 40 轮那条:新入列的人默认不上岗,支持度冻在 50,被动只发挥 100%。
 * 于是一个传奇船员可以从入列到通关全程躺在名册里,玩家既不知道他来了,也不知道
 * 要把他放上岗位。所以这张提示卡必须把"去上岗"一起说出来。 */

/** 找一幕会解锁具名船员的戏。 */
function sceneUnlockingCrew() {
  for (const s of STORY_SCENES) {
    for (const f of s.onCompleteFlags ?? []) {
      const c = CREW_DEFS.find((x) => x.named && x.unlockFlag === f);
      if (c) return { scene: s, crew: c };
    }
  }
  return null;
}

describe("船员入列要有回响", () => {
  beforeEach(() => {
    replaceState(createInitialState());
    pendingCrewUnlocks.value = [];
    pendingHullUnlocks.value = [];
  });

  it("确实有剧情会解锁具名船员,否则下面是空转", () => {
    expect(sceneUnlockingCrew()).toBeTruthy();
  });

  it("船员入列时会挂起一条提示", () => {
    const hit = sceneUnlockingCrew()!;
    completeScene(hit.scene);
    expect(state.value.crew.some((c) => c.defId === hit.crew.id), "船员根本没入列").toBe(true);
    expect(
      pendingCrewUnlocks.value.map((c) => c.id),
      "船员静悄悄进了名册,一个字都没说",
    ).toContain(hit.crew.id);
  });

  it("同一名船员不会重复提示", () => {
    const hit = sceneUnlockingCrew()!;
    completeScene(hit.scene);
    pendingCrewUnlocks.value = [];
    completeScene(hit.scene);
    expect(pendingCrewUnlocks.value, "又提示了一遍").toEqual([]);
  });

  it("提示卡上必须写明「新人是不上岗的」", () => {
    // 第 40 轮:不上岗 = 支持度冻住 + 被动只发挥 100%。只说"来人了"不够。
    expect(APP_SRC, "App 里没有船员入列的提示卡").toMatch(/CrewJoinedToast/);
    expect(APP_SRC, "提示卡没说要去上岗").toMatch(/crewJoin\.station/);
  });

  it("提示卡能直接把玩家送进名册", () => {
    expect(APP_SRC).toMatch(/onOpenCrew=\{\(\) => setPanel\("crew"\)\}/);
  });
});
