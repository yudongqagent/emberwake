import { describe, expect, it, beforeEach } from "vitest";
import { GALAXIES, scavengeDerelict, replaceState, state } from "../state/store";
import { GAME_EVENTS } from "./events";
import { createInitialState } from "../engine/save";
import APP_SRC from "../App.tsx?raw";

/** 残骸点在事件用尽之后还得有反应。
 *
 * 2026-08-31(/loop 第 39 轮)。全图有 **19 个残骸点**,而星图事件只有 **10 个**,
 * 而且完成 flag 是全局的(event.<id>.done)——一个事件在任何星区用掉,全图都没了。
 *
 * 于是玩家探完 10 个之后,剩下 9 个残骸点飞过去、按「查看」:
 *
 *     if (pool.length === 0) return;
 *
 * **什么都不会发生。** 一个点了没反应的 POI,比地图上根本没有它更糟——玩家会以为
 * 是自己操作错了,反复试。
 *
 * 这同时也是洞悉枯竭的一半原因(第 35 轮量到全战役只有 128 点):事件是洞悉仅有的
 * 两个来源之一,而它会用完。 */

const DERELICTS = GALAXIES.flatMap((g) => g.systems).flatMap((s) => s.pois).filter((p) => p.kind === "derelict");

describe("残骸点不能变成哑弹", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("残骸点确实比事件多——这才是问题的前提", () => {
    expect(DERELICTS.length).toBeGreaterThan(GAME_EVENTS.length);
  });

  it("事件用尽时有兜底,不是静默 return", () => {
    expect(
      APP_SRC,
      "事件池空了还是直接 return——玩家点了没反应",
    ).toMatch(/pool\.length === 0[\s\S]{0,200}scavengeDerelict\(/);
  });

  it("拆解真的给东西,而且给洞悉", () => {
    const before = { ...state.value.resources };
    const got = scavengeDerelict(DERELICTS[0].id);
    expect(got.salvage, "拆解没给废料").toBeGreaterThan(0);
    expect(got.insight, "拆解没给洞悉——而洞悉的枯竭正是这条兜底要缓解的").toBeGreaterThan(0);
    expect(state.value.resources.salvage).toBeGreaterThan(before.salvage);
    expect(state.value.resources.insight).toBeGreaterThan(before.insight);
  });

  it("拆完会标记成已清空——靠 POI 自己的重生时间回来,不是无限刷", () => {
    scavengeDerelict(DERELICTS[0].id);
    expect(state.value.poiState[DERELICTS[0].id]?.cleared, "拆完没有标记,可以原地无限刷").toBe(true);
  });

  it("给的量和既有残骸类 POI 一个量级,不能变成刷子", () => {
    const got = scavengeDerelict(DERELICTS[0].id);
    // 地图上现成的 wreck 是 30 废料 / 3 洞悉。兜底不该盖过它。
    expect(got.salvage!).toBeLessThan(150);
    expect(got.insight!).toBeLessThan(10);
  });
});
