import { describe, expect, it, beforeEach } from "vitest";
import { CHOICE_REPUTATION, repTier } from "../data/reputation";
import { completeScene, pendingStandingChange, replaceState, STORY_SCENES } from "./store";
import { createInitialState } from "../engine/save";
import APP_SRC from "../App.tsx?raw";

/** 剧情选择改了立场,就得让玩家看见。
 *
 * 2026-08-31(/loop 第 42 轮)。applyChoiceReputation 算出 repDelta,拿它改了声望
 * **和船员支持度**,然后把它丢掉——**一个字都不说**。
 *
 * 而这些选择很重:
 *
 *     arthaineResolution.formal   洋紫荆 −40, 狮心 +20, 天鹅域 +20
 *     tigerSharkAlliance          掠夺者 +40, 洋紫荆 −20
 *     ridgeReachOutcome.*         一方 +35, 另一方 −25
 *
 * 而分档阈值是:敌对 ≤ −50、冷淡 ≤ −15、中立 < 25、友好 < 60、结盟 ≥ 60。
 * 一次 −40 就能把中立推到离"敌对"只差一步的位置——而敌对意味着**巡逻队来找你、
 * 市场对你关闭**(见 repEffects)。玩家事后完全不知道发生过什么。
 *
 * 搜到的原话:「玩家做出一个得罪某派系的对话选择时,是在毫不知情的情况下给自己
 * 树敌」。 */

/** 找一幕会改声望的戏,并按 StoryOverlay 的做法把选项的 setFlags 合进去。
 *
 * 写测试时先漏了这一步:带声望后果的 flag 多数挂在**选项**上,而 completeScene
 * 只吃 onCompleteFlags。StoryOverlay 的真实做法是先把选中那个选项的 setFlags
 * 并进去再调 completeScene——测试也得走同一条路,否则测的是另一件事。 */
function sceneWithRepChange() {
  for (const s of STORY_SCENES) {
    for (const f of s.onCompleteFlags ?? []) {
      if (CHOICE_REPUTATION[f]) return { scene: s, flag: f };
    }
    for (const c of s.choices ?? []) {
      for (const f of c.setFlags ?? []) {
        if (CHOICE_REPUTATION[f]) {
          return { scene: { ...s, onCompleteFlags: [...s.onCompleteFlags, ...(c.setFlags ?? [])] }, flag: f };
        }
      }
    }
  }
  return null;
}

describe("立场变化必须看得见", () => {
  beforeEach(() => {
    replaceState(createInitialState());
    pendingStandingChange.value = { standings: [], crew: [] };
  });

  it("确实有选择会改声望,而且分量不轻", () => {
    const magnitudes = Object.values(CHOICE_REPUTATION).flatMap((d) => Object.values(d).map((v) => Math.abs(v ?? 0)));
    expect(magnitudes.length).toBeGreaterThan(10);
    expect(Math.max(...magnitudes), "最重的选择还不到 20 点,那这条测试的前提不成立").toBeGreaterThanOrEqual(20);
  });

  it("一次最重的选择足以跨过一个分档", () => {
    // 这是"必须告诉玩家"的理由:跨档意味着价格、盟友、猎杀队全都变了。
    const worst = Object.values(CHOICE_REPUTATION)
      .flatMap((d) => Object.values(d).map((v) => v ?? 0))
      .reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);
    expect(repTier(0), "起点应当是中立").toBe("neutral");
    expect(repTier(worst), `最重的一次选择(${worst})没有跨档`).not.toBe("neutral");
  });

  it("改了声望就会挂起一条提示", () => {
    const hit = sceneWithRepChange();
    expect(hit, "找不到会改声望的幕").toBeTruthy();
    completeScene(hit!.scene);
    const { standings } = pendingStandingChange.value;
    expect(standings.length, "声望变了却一个字都没说").toBeGreaterThan(0);
    expect(standings.every((s) => s.delta !== 0)).toBe(true);
  });

  it("跨档的那一条会被单独标出来", () => {
    const hit = sceneWithRepChange();
    completeScene(hit!.scene);
    const { standings } = pendingStandingChange.value;
    for (const s of standings) {
      expect(s.tierChanged, `${s.faction} 的 tierChanged 算错了`).toBe(repTier(s.before) !== repTier(s.after));
    }
  });

  it("没有声望后果的幕不会弹出空卡片", () => {
    const plain = STORY_SCENES.find(
      (s) =>
        !(s.onCompleteFlags ?? []).some((f) => CHOICE_REPUTATION[f]) &&
        !(s.choices ?? []).some((c) => (c.setFlags ?? []).some((f) => CHOICE_REPUTATION[f])),
    );
    expect(plain).toBeTruthy();
    completeScene(plain!);
    expect(pendingStandingChange.value.standings, "没有声望变化却弹了卡").toEqual([]);
  });

  it("App 里接上了这张卡,而且会点出跨档", () => {
    expect(APP_SRC, "App 里没有立场变化的卡片").toMatch(/StandingChangeCard/);
    expect(APP_SRC, "卡片没有点出跨档").toMatch(/standing\.tierMoved/);
  });
});
