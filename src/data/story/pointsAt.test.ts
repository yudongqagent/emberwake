import { describe, expect, it, beforeEach } from "vitest";
import { GALAXIES, STORY_SCENES, getNextObjective, replaceState, setPoiRuntime } from "../../state/store";
import { createInitialState } from "../../engine/save";
import type { ShipInstance } from "../types";

/** 台词说的和路标指的必须是同一件事。
 *
 * 2026-08-31 实测(/loop 第 25 轮),全新存档,一句不跳地读完开场:
 *
 *     先干活。前面星带里有一片残骸,能拆的都拆回来。
 *     ▸ 下一步:迎战求救信号——跳转至茶隼歇息地
 *
 * 刚说完话的那个声音让你就地拆残骸,而同一屏最显眼的目标条让你去**另一个星系**。
 * 游戏的第一分钟给出两条互相矛盾的指令——而搜到的说法是,新手期正是玩家流失
 * 最集中的窗口,「玩家不会去查怎么玩,他们直接走」。 */

const ALL_POIS = new Set(GALAXIES.flatMap((g) => g.systems).flatMap((s) => s.pois).map((p) => p.id));

describe("台词指向哪,目标条就指向哪", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("每个 pointsAtPoi 都是真实存在的 POI", () => {
    for (const scene of STORY_SCENES) {
      if (!scene.pointsAtPoi) continue;
      expect(ALL_POIS.has(scene.pointsAtPoi), `${scene.id} 指向了不存在的 POI「${scene.pointsAtPoi}」`).toBe(true);
    }
  });

  it("开场幕演完之后,目标条指的是台词里那片残骸", () => {
    const opening = STORY_SCENES.find((s) => s.id === "coldWake")!;
    expect(opening.pointsAtPoi, "开场幕最后一句是「前面星带里有一片残骸」,却没声明它指向谁").toBeTruthy();

    const base = createInitialState();
    replaceState({ ...base, flags: { ...base.flags, "act1.coldWake.cleared": true } });

    const obj = getNextObjective();
    expect(obj?.poiId, "开场刚说完就地拆残骸,目标条却指向别处").toBe(opening.pointsAtPoi);
    expect(obj?.systemId, "目标条把新玩家指去了另一个星系").toBe(opening.systemId);
  });

  it("那件事做完之后,目标条才回到下一幕", () => {
    const base = createInitialState();
    replaceState({ ...base, flags: { ...base.flags, "act1.coldWake.cleared": true } });
    const opening = STORY_SCENES.find((s) => s.id === "coldWake")!;
    setPoiRuntime(opening.pointsAtPoi!, { cleared: true, clearedAt: Date.now() });

    const obj = getNextObjective();
    expect(obj?.poiId, "残骸已经拆完了,目标条还钉在那里").not.toBe(opening.pointsAtPoi);
    expect(obj, "拆完之后没有下一个目标了").toBeTruthy();
  });

  it("这一幕还没演,就不该抢先指过去", () => {
    // 目标条只在幕**演完之后**跟着它的台词走;没演的幕不该抢在主线前面。
    const obj = getNextObjective();
    expect(obj?.poiId).not.toBe("amaranthBeltDerelict");
  });

  it("剧情往前走了之后,老指向必须闭嘴", () => {
    // 第 25 轮加这段时我忘了给它时效:开场那片残骸是**可以不去的**,而只要它没被
    // 清掉,「拆解漂流信号」就会一直霸占目标条,把真正的下一步盖住。
    // 模拟当时的状态:全部剧情打完,但那片残骸从没去过。
    const base = createInitialState();
    const flags: Record<string, boolean> = { ...base.flags };
    for (const s of STORY_SCENES) {
      if (s.hiddenAfterFlag) flags[s.hiddenAfterFlag] = true;
      for (const f of s.onCompleteFlags ?? []) flags[f] = true;
      if (s.requiredFlag) flags[s.requiredFlag] = true;
    }
    replaceState({
      ...base,
      flags,
      ships: base.ships.map((s, i) => (i === 0 ? { ...s, level: 60, ascendedFrom: ["corvette", "destroyer", "cruiser", "battleship", "dreadnought", "sovereign"] as ShipInstance["ascendedFrom"] } : s)),
    });
    const obj = getNextObjective();
    expect(
      obj?.poiId,
      "整局剧情都打完了,目标条还钉在开场教学的那片残骸上",
    ).not.toBe("amaranthBeltDerelict");
  });
});
