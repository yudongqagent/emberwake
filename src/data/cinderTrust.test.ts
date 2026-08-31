import { describe, expect, it, beforeEach } from "vitest";
import { CHOICE_CINDER_TRUST } from "./reputation";
import { completeScene, replaceState, state, storyContext, STORY_SCENES } from "../state/store";
import { createInitialState } from "../engine/save";
import { REACTIVE_LINES, applyReactiveLines } from "./story/reactive";
import REACTIVE_SRC from "./story/reactive.ts?raw";

/** 余烬信任:表在、门在、台词在,唯独没有人往里灌。
 *
 * 2026-08-31(/loop 第 44 轮)。reputation.ts 里那句注释把三个选择留给了 cinderTrust:
 *
 *     面对余烬的身世——这三个不改变外部势力,它们改变的是余烬本身,
 *     由 cinderTrust 单独承载(见 store.ts)。声望表留空是刻意的。
 *
 * 而承接它的那条路从来没接上:
 *
 *   - adjustCinderTrust 存在,但全代码库**零调用点**
 *   - cinderTrust 初始 0,于是永远是 0
 *   - reactive.ts 有三段台词门控在 `>= 2` 或 `<= -1`,**全部永久不可达**
 *     其中一段在战役终局:「这份答卷里属于我的那部分,是我自愿给的」
 *
 * 这和第 28 轮的薇拉、第 31 轮的裂隙囊是同一个形状:消费端做完了,生产端没接。 */

/** 把某个选项的 setFlags 并进 onCompleteFlags,和 StoryOverlay 的做法一致。 */
function sceneWithFlag(flag: string) {
  for (const s of STORY_SCENES) {
    for (const c of s.choices ?? []) {
      if ((c.setFlags ?? []).includes(flag)) {
        return { ...s, onCompleteFlags: [...s.onCompleteFlags, ...(c.setFlags ?? [])] };
      }
    }
  }
  return null;
}

describe("余烬信任要能真的动起来", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("三个选项在剧情里真的存在", () => {
    for (const flag of Object.keys(CHOICE_CINDER_TRUST)) {
      expect(sceneWithFlag(flag), `剧情里找不到会设置 ${flag} 的选项`).toBeTruthy();
    }
  });

  it("选了之后信任真的变了——原来它永远是 0", () => {
    const scene = sceneWithFlag("cinderReveal.acceptance")!;
    expect(state.value.cinderTrust).toBe(0);
    completeScene(scene);
    expect(state.value.cinderTrust, "选了「接纳」,信任还是 0").toBeGreaterThan(0);
  });

  it("三条路各自到得了自己该到的地方", () => {
    // 门槛:>= 2 是暖的那一档,<= -1 是冷的那一档。
    const run = (flag: string) => {
      replaceState(createInitialState());
      completeScene(sceneWithFlag(flag)!);
      return storyContext().cinderTrust;
    };
    expect(run("cinderReveal.acceptance"), "「接纳」够不到暖的那一档").toBeGreaterThanOrEqual(2);
    expect(run("cinderReveal.anger"), "「愤怒」够不到冷的那一档").toBeLessThanOrEqual(-1);
    const focus = run("cinderReveal.focus");
    expect(focus, "「务实」不该跨到暖的那一档").toBeLessThan(2);
    expect(focus, "「务实」不该跨到冷的那一档").toBeGreaterThan(-1);
  });

  it("被门控的台词确实存在,否则接了也没意义", () => {
    expect(REACTIVE_SRC.match(/cinderTrust >= 2/g)?.length ?? 0).toBeGreaterThan(1);
    expect(REACTIVE_SRC).toMatch(/cinderTrust <= -1/);
  });

  /** 第二个洞,接上线之后才看得见:被门控的台词得**排在信任来源后面**。
   *
   * 原来那条挂在 originTide(第三幕)上,而信任唯一的来源是第四幕的身世揭露——
   * 第三幕时它必然是 0,两个变体一个都够不到,整条插入永远不触发。接线只解决了
   * "值永远不动",没解决"值动得太晚"。 */
  it("被门控的台词排在信任来源后面,否则接了也白接", () => {
    const sceneIndex = (id: string) => STORY_SCENES.findIndex((s) => s.id === id);
    const sources = Object.keys(CHOICE_CINDER_TRUST).map((f) => sceneIndex(sceneWithFlag(f)!.id));
    const earliestSource = Math.min(...sources);
    for (const [sceneId, inserts] of Object.entries(REACTIVE_LINES)) {
      const gated = inserts.some((i) => i.variants.some((v) => String(v.when).includes("cinderTrust")));
      if (!gated) continue;
      expect(
        sceneIndex(sceneId),
        `${sceneId} 门控在 cinderTrust 上,却排在信任来源之前——那时它必然是 0`,
      ).toBeGreaterThan(earliestSource);
    }
  });

  it("走完一整条路,被门控的台词真的插进去了", () => {
    replaceState(createInitialState());
    completeScene(sceneWithFlag("cinderReveal.acceptance")!);
    const ctx = storyContext();
    let inserted = 0;
    for (const [sceneId, inserts] of Object.entries(REACTIVE_LINES)) {
      if (!inserts.some((i) => i.variants.some((v) => String(v.when).includes("cinderTrust")))) continue;
      const scene = STORY_SCENES.find((s) => s.id === sceneId)!;
      const out = applyReactiveLines(scene, ctx, "zh");
      if (out.lines.length > scene.lines.length) inserted++;
    }
    expect(inserted, "选了「接纳」,却没有任何一段被门控的台词插进来").toBeGreaterThan(0);
  });

  it("信任被夹在 −3..3 之间,不会被反复叠爆", () => {
    replaceState(createInitialState());
    const scene = sceneWithFlag("cinderReveal.acceptance")!;
    for (let i = 0; i < 10; i++) completeScene(scene);
    expect(state.value.cinderTrust).toBeLessThanOrEqual(3);
  });
});
