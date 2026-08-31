import { describe, expect, it, beforeEach } from "vitest";
import { GALAXIES, STORY_SCENES, getNextObjective, replaceState, sceneProgressMet } from "./store";
import { createInitialState } from "../engine/save";
import type { GameState } from "../engine/save";

/** 剧情推不下去时,要说**为什么**推不下去。
 *
 * 2026-08-31(/loop 第 26 轮)。第三幕起有三幕卡在"进阶次数"上,而 getNextObjective
 * 原来是 `if (!sceneProgressMet(scene)) continue;` —— 注释写的是"绝不把玩家指向
 * 一个他还没准备好的节点"。但跳过并不会让指针停下,它继续往后扫,于是指向一个
 * **更靠后**的节点。实测:
 *
 *     20 级 / 0 次进阶 / 前两幕已完成
 *     → 目标条:「迎战「虚无」的聚集之地 @ 暗影线」
 *
 * 暗影线是威胁 6 的星区,倒数第二危险的地方。守卫本来是防这个的,结果它亲手把
 * 玩家送了过去——而且从不提"进阶"两个字,玩家不知道自己缺的是什么。 */

const THREAT_OF = new Map(GALAXIES.flatMap((g) => g.systems.map((s) => [s.id, g.threat] as const)));

/** 前两幕全部打完、指定进阶次数的存档。 */
function afterActTwo(ascensions: number, level = 20): GameState {
  const base = createInitialState();
  const flags: Record<string, boolean> = { ...base.flags };
  for (const s of STORY_SCENES) {
    if (/^act[12]\./.test(s.hiddenAfterFlag ?? "")) flags[s.hiddenAfterFlag!] = true;
    for (const f of s.onCompleteFlags ?? []) if (/^act[12]\./.test(f)) flags[f] = true;
  }
  return {
    ...base,
    flags,
    // 开场那片残骸已经拆过了,否则它会一直占着目标条(见 pointsAt.test.ts)。
    poiState: { ...base.poiState, amaranthBeltDerelict: { cleared: true, clearedAt: Date.now() } },
    ships: base.ships.map((s, i) =>
      i === 0 ? { ...s, level, ascendedFrom: Array.from({ length: ascensions }, (_, k) => `h${k}`) } : s,
    ),
  } as GameState;
}

describe("卡住的时候要说卡在哪", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("确实有幕是卡在进阶次数上的,否则下面几条是空转", () => {
    const gated = STORY_SCENES.filter((s) => s.requiresAscensions !== undefined);
    expect(gated.length).toBeGreaterThan(0);
  });

  it("差一次进阶时,目标条直说要进阶,而不是指向别的地方", () => {
    replaceState(afterActTwo(0));
    const obj = getNextObjective();
    expect(obj, "卡住了却什么都不说").toBeTruthy();
    expect(obj!.panel, "目标条没有指向进阶面板").toBe("ascension");
    expect(obj!.label).toMatch(/进阶|ascension/i);
  });

  it("绝不越过下一幕:下一幕卡住了就说卡住,不能滑到更后面的幕", () => {
    // 原来的毛病:0 次进阶时跳过第三幕(帷幕边缘,威胁 4),一路滑到第五幕的
    // 暗影线(威胁 6)。判据不是"威胁不能高"——1 次进阶指向威胁 4 的帷幕边缘
    // 正是第三幕该去的地方——而是"不能越过下一幕"。
    for (const asc of [0, 1, 2]) {
      const st = afterActTwo(asc);
      replaceState(st);
      // 玩家眼里的"下一幕":还没演、剧情前置也满足了的第一幕。
      const next = STORY_SCENES.find(
        (s) => !st.flags[s.hiddenAfterFlag ?? ""] && (s.requiredFlag === null || st.flags[s.requiredFlag]),
      );
      if (!next) continue;
      const obj = getNextObjective();
      if (sceneProgressMet(next)) {
        expect(obj?.panel, `进阶 ${asc} 次:下一幕(${next.id})明明能演,却在催进阶`).toBeUndefined();
      } else {
        const threat = THREAT_OF.get(obj?.systemId ?? "") ?? 1;
        expect(
          obj?.panel ?? obj?.label,
          `进阶 ${asc} 次:下一幕(${next.id})被卡住了,路标却指向威胁 ${threat} 的 ${obj?.systemName}——越过去了`,
        ).toBeTruthy();
        expect(obj!.panel ?? "", `进阶 ${asc} 次:卡住了却没指向进阶面板`).toBe("ascension");
      }
    }
  });

  it("进阶够了就恢复正常:目标条指回剧情", () => {
    replaceState(afterActTwo(1));
    const obj = getNextObjective();
    expect(obj?.panel, "已经进阶过了,还在催进阶").toBeUndefined();
    expect(obj, "进阶之后反而没有目标了").toBeTruthy();
  });

  it("卡住的那一幕本身必须是「下一幕」,不能跳过去挑一个更远的", () => {
    replaceState(afterActTwo(0));
    const blocked = STORY_SCENES.find((s) => !sceneProgressMet(s) && s.requiresAscensions !== undefined);
    expect(blocked, "找不到被卡住的幕").toBeTruthy();
    expect(blocked!.requiresAscensions).toBe(1);
  });
});
