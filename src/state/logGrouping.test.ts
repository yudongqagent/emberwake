import { describe, expect, it, beforeEach } from "vitest";
import { replaceState, storyLog, groupLogByChapter, STORY_SCENES } from "./store";
import { createInitialState } from "../engine/save";
import LOG_SRC from "../ui/screens/Log.tsx?raw";

/** 日志分组的 key 必须唯一。
 *
 * 2026-09-01(/loop 第 105 轮)。这一轮是从**运行中的控制台**里翻出来的:游戏每次
 * 渲染日志都在报
 *
 *     Following component has two or more children with the same key attribute:
 *     "Bauhinia Prime". This may cause glitches and misbehavior in rendering.
 *
 * 原因:`chapter` 存的是地名不是序号(「红棘主星」在六幕戏里出现十次),而剧情会
 * 离开再回来。分组只合并**相邻**条目,所以同一个地名会分出好几组——这是对的,
 * 时间顺序不能打乱——但每组都拿 `ch.chapter` 当 key,于是三组同一个 key。
 *
 * 实测(我自己的存档,英文,打开日志,数界面上真渲染出来的组):
 *
 *     Bauhinia Prime · The Ledger
 *     Bauhinia Prime · House Rules          ← 三组,同一个 key
 *     Bauhinia Prime · Calling the Reach
 *
 * 诚实地说:我没能造出可见的错乱。里层条目用 scene.id 当 key(唯一),挡住了大部分
 * 后果,展开/收起实测也是对的。所以这是一个**被框架点名、但目前还没显形**的缺陷,
 * 不是一个已经在坑玩家的 bug。修它是因为按 key 复用 DOM 是不能踩的地雷,
 * 而不是因为它今天就在出错。 */

function seeAll() {
  const flags: Record<string, boolean> = {};
  for (const s of STORY_SCENES) flags[s.hiddenAfterFlag] = true;
  replaceState({ ...createInitialState(), flags });
}

describe("日志分组", () => {
  beforeEach(() => replaceState(createInitialState()));

  /** 这条钉住"问题确实存在":地名真的会不相邻地重复出现。 */
  it("同一个章节名确实会分成不相邻的多组", () => {
    seeAll();
    const groups = groupLogByChapter(storyLog());
    const names = groups.map((g) => g.chapter);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes.length, "章节名不再重复了?那这条守卫该重写").toBeGreaterThan(0);
  });

  it("全部看完之后,每一组的 key 都不一样", () => {
    seeAll();
    const keys = groupLogByChapter(storyLog()).map((g) => g.key);
    expect(new Set(keys).size, `有重复的 key:${keys.filter((k, i) => keys.indexOf(k) !== i).join(", ")}`)
      .toBe(keys.length);
  });

  /** 任意一个子集也要唯一——玩家的进度是任意的。 */
  it("看了任意一部分,key 也还是唯一的", () => {
    for (const step of [2, 3, 5, 7]) {
      const flags: Record<string, boolean> = {};
      STORY_SCENES.forEach((s, i) => { if (i % step === 0) flags[s.hiddenAfterFlag] = true; });
      replaceState({ ...createInitialState(), flags });
      const keys = groupLogByChapter(storyLog()).map((g) => g.key);
      expect(new Set(keys).size, `每 ${step} 幕取一幕时出现重复 key`).toBe(keys.length);
    }
  });

  /** 分组本身不能变:同一章的**相邻**条目合并,不相邻的不合并。 */
  it("只合并相邻的同章条目,不打乱时间顺序", () => {
    seeAll();
    const groups = groupLogByChapter(storyLog());
    // 组内每一条都是同一章。
    for (const g of groups) {
      for (const item of g.items) expect(item.chapter).toBe(g.chapter);
    }
    // 相邻两组的章节名一定不同,否则就是该合并没合并。
    for (let i = 1; i < groups.length; i++) {
      expect(groups[i].chapter, "相邻两组同章却没合并").not.toBe(groups[i - 1].chapter);
    }
    // 摊平之后顺序和 storyLog 完全一致——分组不是排序。
    expect(groups.flatMap((g) => g.items.map((e) => e.scene.id)))
      .toEqual(storyLog().map((e) => e.scene.id));
  });

  it("界面用的是分组给出的 key,不是章节名", () => {
    expect(LOG_SRC, "又拿章节名当 key 了——同名的组会撞").not.toMatch(/key=\{ch\.chapter\}/);
    expect(LOG_SRC).toMatch(/key=\{ch\.key\}/);
    // 分组逻辑只留一份,别在界面里再写一遍。
    expect(LOG_SRC, "界面又自己分了一次组").toMatch(/groupLogByChapter\(entries\)/);
  });

  it("空日志不炸", () => {
    expect(groupLogByChapter([])).toEqual([]);
  });
});
