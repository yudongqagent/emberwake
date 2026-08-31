import { describe, expect, it } from "vitest";
import { HULL_CLASSES } from "./hullClasses";
import { sceneTitleForFlag } from "../state/store";
import ASCENSION_SRC from "../ui/screens/Ascension.tsx?raw";

/** 挡住玩家的条件,必须说清楚是什么。
 *
 * 2026-08-31 实测(/loop 第 33 轮)。12 级、200 本源精华、条件已经满了两条,进阶
 * 熔炉里第三行写的是:
 *
 *     ✓ 等级 4      ✓ 40 本源精华      ○ 剧情进度
 *
 * 「剧情进度」——哪一段?第 26 轮我刚把目标条修成会说"去进阶",玩家照着走到这个
 * 面板,撞上第二道墙,依然不知道自己缺什么。而 unlockFlag(act1.tigersReach.cleared)
 * 和它对应那一幕的章节名都在数据里躺着,只是没人把它们接起来。
 *
 * 现在写的是「○ 剧情:虎鲨之手」。 */

describe("进阶的剧情门槛要说得出名字", () => {
  const gated = HULL_CLASSES.filter((h) => h.unlockFlag !== null);

  it("确实有舰级卡在剧情上,否则下面是空转", () => {
    expect(gated.length).toBeGreaterThan(3);
  });

  it("每个 unlockFlag 都能找回它所属那一幕的章节名", () => {
    const orphans = gated.filter((h) => !sceneTitleForFlag(h.unlockFlag!));
    expect(
      orphans.map((h) => `${h.id} ← ${h.unlockFlag}`),
      `这些舰级的解锁 flag 没有任何一幕会给出,面板只能退回裸标签「剧情进度」:\n${orphans.map((h) => h.id).join("\n")}`,
    ).toEqual([]);
  });

  it("面板用的是带章节名的那条文案", () => {
    expect(
      ASCENSION_SRC,
      "进阶面板还在用裸标签,没有把章节名接上",
    ).toMatch(/station\.reqStoryNamed/);
    expect(ASCENSION_SRC).toMatch(/sceneTitleForFlag\(/);
  });
});
