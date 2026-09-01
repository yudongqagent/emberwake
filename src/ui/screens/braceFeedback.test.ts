import { describe, expect, it } from "vitest";
import { NO_PACTS } from "../../data/pacts";
import COMBAT_SRC from "./Combat.tsx?raw";
import STRINGS_SRC from "../../i18n/strings.ts?raw";

/** 反应型操作的回报,必须是一个玩家看得见的数。
 *
 * 2026-08-31(/loop 第 62 轮)。搜到的说法:技能原子里"反馈"那一环的要求是**玩家
 * 得能看出自己那一下起作用了**。
 *
 * 抗冲原来的反馈是:一个「已抗冲」的标签、一圈光环、一个专门的音效。代码注释
 * 自己把问题说对了一半——
 *
 *     "Brace only reads as a good decision if landing it is visible — without
 *      this the reward for a correct read is an absence, which feels like
 *      nothing at all."
 *
 * ——然后用一个**形容词**回答了它。标签说的是"这件事发生了",没说"值不值"。
 * 玩家看到 `-62` 和「已抗冲」,而"这一下本来会是 124"这件事他无从得知,
 * 也就无从判断自己按得对不对。
 *
 * 这个仓库自己的规矩是给数字不给形容词(第 30 轮的 37 条无数字词条说明、
 * 第 53 轮的四条无数字教学文案)。反应型操作尤其需要:它的全部价值就在那个差额上。 */

describe("抗冲要告诉玩家挡下了多少", () => {
  it("减伤确实是个可算出来的量", () => {
    expect(NO_PACTS.braceReduction).toBeGreaterThan(0);
    expect(NO_PACTS.braceReduction).toBeLessThan(1);
  });

  it("中英文案都带占位符,不是一个光秃秃的词", () => {
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      const line = seg.match(/"combat\.braced": "([^"]*)"/)?.[1] ?? "";
      expect(line, `${lang} 找不到 combat.braced`).toBeTruthy();
      expect(line, `${lang} 的抗冲反馈还是个形容词:「${line}」`).toMatch(/\{saved\}/);
    }
  });

  it("战斗里真的把差额算出来传进去了", () => {
    expect(COMBAT_SRC, "没有算挡下的量").toMatch(/const saved = Math\.max\(1,/);
    expect(COMBAT_SRC, "算了却没传给文案").toMatch(/t\("combat\.braced", \{ saved \}\)/);
  });

  /** 差额要按**减伤比例**反推,不能写死一个数——契约会改这个比例。 */
  it("差额跟着实际减伤比例走,而不是写死", () => {
    expect(COMBAT_SRC, "差额没有引用当前的减伤比例").toMatch(/pactsRef\.current\.braceReduction/);
    expect(
      /const saved = .*\bresult\.damageDealt\b.*\/ \(1 - r\)/.test(COMBAT_SRC),
      "差额不是从减伤比例反推的",
    ).toBe(true);
  });

  it("挡下量至少是 1,不会出现「挡下 0」", () => {
    // 公式:round(dealt / (1-r)) - dealt,再和 1 取大。r=0.5、dealt=1 时是 1。
    const r = NO_PACTS.braceReduction;
    for (const dealt of [1, 2, 7, 63, 400]) {
      const saved = Math.max(1, Math.round(dealt / (1 - r)) - dealt);
      expect(saved, `挡下 ${dealt} 伤害时算出 ${saved}`).toBeGreaterThanOrEqual(1);
    }
  });

  it("默认减伤下,挡下的量和挨到的量同量级——这条反馈才有说服力", () => {
    const r = NO_PACTS.braceReduction;
    const dealt = 62;
    const saved = Math.round(dealt / (1 - r)) - dealt;
    expect(saved).toBe(62);
  });
});
