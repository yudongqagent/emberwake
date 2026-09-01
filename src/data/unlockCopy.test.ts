import { describe, expect, it } from "vitest";
import { COMBAT_UNLOCKS } from "./combatUnlocks";
import { RANGE_MODIFIERS, rangeProfileMultiplier, weaponsCadenceMultiplier, shieldsDamageMultiplier, enginesRateMultiplier, enginesEvasionBonus } from "../engine/combat";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 教这四个控件的,总共就四句话——那四句话得说人话,还得带数字。
 *
 * 2026-08-31(/loop 第 53 轮)。搜同类游戏搜到的是:"玩家一开始就能用的机制,必须在
 * 早期就教"。Emberwake 的渐进解锁(combatUnlocks.ts)本身做得很扎实,一场仗放一件。
 * 但**放出来时说的那句话**是这样的:
 *
 *     舵手指令   "接近、保持或撤离。距离会改变你的炮值多少钱。"
 *     反应堆     "在火力、护盾、引擎之间分配功率。"
 *     超载       "现在打得更狠,之后用冷却来还。"
 *
 * 四条里 **3 条一个数字都没有**,而"距离会改变你的炮值多少钱"是把英文的
 * "what your guns are worth"(值不值)直译成了"值多少钱"——教这套系统的**唯一
 * 一句话**是句病句。
 *
 * 这正是第 30 轮给模组词条修过的毛病(37 条没有数字的效果说明),教学这边没修。
 * 而第 51、52 两轮刚把阵位和技能冷却改成真正会生效的东西——说明文案没跟上,
 * 等于改了个玩家读不懂的系统。
 *
 * 这条守卫盯两件事:每条说明都要有数字,而且数字要和代码对得上。 */

const table = (name: "EN" | "ZH") => STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${name}: StringTable = {`));

function desc(lang: "EN" | "ZH", id: string): string {
  const m = table(lang).match(new RegExp(`"unlock\\.${id}\\.desc": "((?:[^"\\\\]|\\\\.)*)"`));
  expect(m, `${lang} 里找不到 unlock.${id}.desc`).toBeTruthy();
  return m![1];
}

describe("战斗控件的教学文案", () => {
  it("每个解锁都有中英两条说明", () => {
    for (const u of COMBAT_UNLOCKS) {
      expect(desc("EN", u.id).length).toBeGreaterThan(20);
      expect(desc("ZH", u.id).length).toBeGreaterThan(10);
    }
  });

  /** 第 30 轮的规矩:说明里没有数字,玩家就没法推理。 */
  it("每条说明都带数字", () => {
    for (const u of COMBAT_UNLOCKS) {
      for (const lang of ["EN", "ZH"] as const) {
        expect(
          /\d/.test(desc(lang, u.id)),
          `${lang} 的「${u.id}」说明一个数字都没有:「${desc(lang, u.id)}」`,
        ).toBe(true);
      }
    }
  });

  it("中英两边说的是同一组数字", () => {
    const nums = (s: string) => (s.match(/\d+(?:\.\d+)?/g) ?? []).sort();
    for (const u of COMBAT_UNLOCKS) {
      expect(nums(desc("ZH", u.id)), `「${u.id}」中英数字对不上`).toEqual(nums(desc("EN", u.id)));
    }
  });

  /** 数字得和代码里的真值一致,否则它比没有数字更糟。 */
  it("阵位说明里的数字就是 RANGE_MODIFIERS 和偏好射程的真值", () => {
    const zh = desc("ZH", "stance");
    expect(Math.round((RANGE_MODIFIERS.close.outgoing - 1) * 100)).toBe(20);
    expect(Math.round((1 - RANGE_MODIFIERS.long.outgoing) * 100)).toBe(20);
    expect(zh).toMatch(/20/);
    expect(rangeProfileMultiplier("long", "long")).toBeCloseTo(1.25);
    expect(rangeProfileMultiplier("long", "close")).toBeCloseTo(0.75);
    expect(zh, "没写偏好射程的倍率").toMatch(/1\.25/);
    expect(zh, "没写差两档的倍率").toMatch(/0\.75/);
  });

  it("反应堆说明里的每格增益就是那四个函数的真值", () => {
    expect(Math.round((1 - weaponsCadenceMultiplier(3)) * 100)).toBe(10);
    // 第 77 轮从 9 提到 13:护盾原来在防御这条轴上输给火力(火力打得快也等于少挨打),
    // 于是这一格没有理由去点。数字变了,文案必须跟着变——这条守卫就是干这个的。
    expect(Math.round((1 - shieldsDamageMultiplier(3)) * 100)).toBe(13);
    expect(Math.round((enginesRateMultiplier(3) - 1) * 100)).toBe(22);
    expect(Math.round(enginesEvasionBonus(3) * 100)).toBe(4);
    const zh = desc("ZH", "reactor");
    for (const n of ["10", "13", "22", "4"]) {
      expect(zh, `反应堆说明里没有 ${n}`).toMatch(new RegExp(n));
    }
  });

  /** 那句病句本身也钉住。 */
  it("不再把 what your guns are worth 译成「值多少钱」", () => {
    expect(desc("ZH", "stance"), "误译回来了").not.toMatch(/值多少钱/);
  });
});
