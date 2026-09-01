import { describe, expect, it, beforeEach } from "vitest";
import { storyLog, replaceState, STORY_SCENES } from "./store";
import { createInitialState } from "../engine/save";
import LOG_SRC from "../ui/screens/Log.tsx?raw";
import APP_SRC from "../App.tsx?raw";
import CONSOLE_SRC from "../ui/components/ShipConsole.tsx?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 演过的戏得能回头看。
 *
 * 2026-09-01(/loop 第 83 轮)。这个游戏自称 story-driven:46 幕戏、六幕结构、
 * 一个会把选择写进声望的抉择系统——而且**每一幕上都摆着一个「跳过本节」按钮**。
 *
 * 演完就没了。没有日志、没有回看、没有任何地方能查"我当时选了什么"。玩家跳过
 * 一幕(或者隔两天回来)之后,那段剧情对他永久消失,而后面几幕还在引用它。
 * 搜到的说法正对着这一条:玩家跳掉剧情然后抱怨看不懂剧情——能不能补回来,
 * 完全取决于设计者有没有留那扇门。
 *
 * 关键的设计选择:整份日志**从已有的 flag 推出来**,不加任何存档字段。
 *   看过没有 —— scene.hiddenAfterFlag 是否已置位
 *   选了什么 —— 哪个选项的 setFlags 已置位
 * 所以老存档一进来就是满的,不需要迁移(第 79 轮那条"补在根上"的同一种思路:
 * 能从既有事实推出来的,就别再存一份可能对不上的副本)。 */

function withFlags(flags: Record<string, boolean>) {
  replaceState({ ...createInitialState(), flags });
}

describe("航行日志", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("全新开局是空的", () => {
    expect(storyLog()).toEqual([]);
  });

  it("看过的那一幕会进日志,没看过的不会", () => {
    const scene = STORY_SCENES[0];
    withFlags({ [scene.hiddenAfterFlag]: true });
    const log = storyLog();
    expect(log.length, "看过的那一幕没进日志").toBe(1);
    expect(log[0].scene.id).toBe(scene.id);
    // 其余 45 幕没看过,一幕都不该出现。
    expect(log.length).toBeLessThan(STORY_SCENES.length);
  });

  it("日志按剧情顺序,不是按 flag 写入顺序", () => {
    const first = STORY_SCENES[0];
    const later = STORY_SCENES[3];
    withFlags({ [later.hiddenAfterFlag]: true, [first.hiddenAfterFlag]: true });
    const ids = storyLog().map((e) => e.scene.id);
    expect(ids).toEqual([first.id, later.id]);
  });

  /** 抉择的后果写进了声望,而玩家此前没有任何地方能回头确认自己做过什么。 */
  it("记得住玩家当时选的是哪一个", () => {
    const withChoice = STORY_SCENES.find((s) => (s.choices?.length ?? 0) > 1);
    expect(withChoice, "剧情里一个带选择的场景都没有?").toBeTruthy();
    const opt = withChoice!.choices![1];
    expect(opt.setFlags?.length, "这个选项不写 flag,那就没法回推").toBeTruthy();
    withFlags({ [withChoice!.hiddenAfterFlag]: true, [opt.setFlags![0]]: true });
    const entry = storyLog().find((e) => e.scene.id === withChoice!.id)!;
    expect(entry.choice, "日志里没记下玩家选了什么").toBeTruthy();
  });

  it("没有选择的那些幕,不会硬编一个选择出来", () => {
    const noChoice = STORY_SCENES.find((s) => !s.choices || s.choices.length === 0);
    if (!noChoice) return;
    withFlags({ [noChoice.hiddenAfterFlag]: true });
    expect(storyLog().find((e) => e.scene.id === noChoice.id)!.choice).toBeNull();
  });

  /** 不加存档字段是这次的关键——加了就要迁移,而且迟早和 flag 对不上。 */
  it("日志不依赖任何新的存档字段", () => {
    const fresh = createInitialState() as unknown as Record<string, unknown>;
    expect(Object.keys(fresh)).not.toContain("storyLog");
    expect(Object.keys(fresh)).not.toContain("seenScenes");
  });

  it("日志能重看全文,不是只列个标题", () => {
    expect(LOG_SRC, "日志里没有渲染台词").toMatch(/e\.scene\.lines\.map/);
    expect(LOG_SRC, "没有显示当时的选择").toMatch(/t\("log\.yourChoice"\)/);
    expect(LOG_SRC, "条目不能展开").toMatch(/aria-expanded=\{isOpen\}/);
  });

  it("有一个进得去的入口", () => {
    expect(CONSOLE_SRC, "导航栏里没有日志").toMatch(/id: "log", labelKey: "nav\.log"/);
    expect(APP_SRC, "日志面板没有接到路由上").toMatch(/panel === "log" && <Log \/>/);
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      for (const k of ["nav.log", "log.title", "log.count", "log.empty", "log.yourChoice"]) {
        expect(
          seg.match(new RegExp(`"${k.replace(/\./g, "\\.")}": "([^"]*)"`))?.[1],
          `${lang} 缺少 ${k}`,
        ).toBeTruthy();
      }
    }
  });

  /** 「跳过本节」还在——日志的意义正是让跳过变成一个没有代价的决定。 */
  it("跳过按钮还在:有了日志,跳过才不再是永久丢失", () => {
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      expect(seg.match(/"story\.skip": "([^"]*)"/)?.[1], `${lang} 缺少 story.skip`).toBeTruthy();
    }
  });
});
