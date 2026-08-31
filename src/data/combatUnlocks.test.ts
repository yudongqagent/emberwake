import { describe, expect, it } from "vitest";
import { COMBAT_UNLOCKS, isUnlocked, unlockById } from "./combatUnlocks";
import { ACT1_SCENES } from "./story/act1";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

const ACT1_FLAGS = new Set(ACT1_SCENES.flatMap((s) => s.onCompleteFlags));

describe("战斗控件的渐进式解锁", () => {
  it("全新玩家的第一场仗只有武器,别的一个都不给", () => {
    // 整件事的起点:第一场仗刻意是"零输入也能赢"的(它教的是枪会自己开),
    // 而界面上却摆着七个他一个都不需要按的按钮。
    for (const u of COMBAT_UNLOCKS) {
      expect(isUnlocked(u.id, {}, 1), `全新玩家不该看到「${u.id}」`).toBe(false);
    }
  });

  it("抗冲必须在那门会蓄力的炮台之前到位", () => {
    // 第二场戏是自动炮塔(见 encounters.ts),它存在的全部意义就是教抗冲。
    // 如果抗冲比它晚解锁,那一课就上不成。
    const brace = unlockById("brace");
    expect(brace.flag).toBe("act1.firstBlood.cleared");
    expect(isUnlocked("brace", { "act1.firstBlood.cleared": true }, 1)).toBe(true);
  });

  it("一件一件来,不会在同一个时刻同时解锁两个", () => {
    // 「复杂机制要一件一件引入,中间留出熟悉的时间」。
    const flags = COMBAT_UNLOCKS.map((u) => u.flag);
    expect(new Set(flags).size, "有两个控件挂在同一个 flag 上").toBe(flags.length);
    const levels = COMBAT_UNLOCKS.map((u) => u.level);
    expect(new Set(levels).size, "有两个控件挂在同一个等级上").toBe(levels.length);
  });

  it("解锁用的 flag 都真的会被某场戏设上", () => {
    // 打错一个字,那个控件就永远不出现,而且不会报错。
    for (const u of COMBAT_UNLOCKS) {
      expect(ACT1_FLAGS, `解锁 "${u.id}" 等的 flag "${u.flag}" 没有任何场景会设上`).toContain(u.flag);
    }
  });

  it("跳过主线的玩家也拿得到——这是开放世界", () => {
    // 玩家可以第一分钟就飞去别的星区。不能因为没走主线就永远看不到某个控件。
    for (const u of COMBAT_UNLOCKS) {
      expect(isUnlocked(u.id, {}, u.level), `等级兜底对「${u.id}」不起作用`).toBe(true);
    }
  });

  it("老存档不会突然少掉控件", () => {
    // 已经打完第一幕的玩家必须四个都有,否则这次改动等于偷走他们的界面。
    const done = Object.fromEntries(ACT1_SCENES.flatMap((s) => s.onCompleteFlags).map((f) => [f, true]));
    for (const u of COMBAT_UNLOCKS) {
      expect(isUnlocked(u.id, done, 1), `打完第一幕却还看不到「${u.id}」`).toBe(true);
    }
  });

  it("每个控件在战斗界面里都真的被这个开关挡住了", () => {
    // 只写数据不接到界面上,等于什么都没做。
    for (const u of COMBAT_UNLOCKS) {
      expect(
        COMBAT_SRC.includes(`unlocked("${u.id}")`),
        `控件「${u.id}」的解锁开关在 Combat.tsx 里没有被用到`,
      ).toBe(true);
    }
  });

  it("每个控件都有中英文的解锁提示", () => {
    // 一个新按钮冒出来而没人说一句,玩家不会注意到。
    for (const u of COMBAT_UNLOCKS) {
      expect(STRINGS_SRC.includes(`"unlock.${u.id}"`), `「${u.id}」缺解锁提示的名字`).toBe(true);
      expect(STRINGS_SRC.includes(`"unlock.${u.id}.desc"`), `「${u.id}」缺解锁提示的说明`).toBe(true);
    }
  });
});
