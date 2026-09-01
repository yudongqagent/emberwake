import { describe, expect, it } from "vitest";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";
import SETTINGS_SRC from "./settings.ts?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 「减少动态效果」这个开关必须真的关掉那些东西。
 *
 * 2026-08-31(/loop 第 72 轮)。搜到的无障碍标准很硬:WCAG 规定每秒闪烁不得超过
 * 三次,规范推荐用 prefers-reduced-motion 打底,并明确建议提供"减少动态效果 /
 * 关闭画面震动"这样的开关(而不是叫"癫痫安全模式"——那种命名有害且有法律风险)。
 *
 * Emberwake **已经有这个开关**:类型里有 reduceMotion、有默认值、有持久化、
 * 设置页有 Toggle、中英文案都写着"关闭画面震动、顿帧与闪光"。
 *
 * 而它**一处都没有被消费**。开关是死的。
 *
 * 这是最糟的一种无障碍缺陷:它*声称*帮得上忙。需要它的玩家把它打开,以为游戏
 * 现在对自己安全了,而画面照抖、照顿、照闪。
 *
 * 连字段自己的注释都写着别的功能("跳过已看过场景的打字效果"),说明它从没做完。 */

describe("减少动态效果", () => {
  it("设置页仍然承诺关掉这三样——文案在,行为就必须在", () => {
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      const hint = seg.match(/"settings\.reduceMotionHint": "([^"]*)"/)?.[1] ?? "";
      expect(hint, `${lang} 缺少 reduceMotionHint`).toBeTruthy();
    }
  });

  it("战斗里读了这个设置", () => {
    expect(COMBAT_SRC, "战斗完全没有读 reduceMotion——开关是死的").toMatch(
      /const motionOff = getSettings\(\)\.reduceMotion/,
    );
  });

  it("顿帧被它关掉", () => {
    expect(COMBAT_SRC).toMatch(/function triggerHitStop\(ms: number\) \{\s*\n\s*if \(motionOff\) return;/);
  });

  it("画面震动全部走同一个闸,没有绕过去的写法", () => {
    expect(COMBAT_SRC, "没有统一的震动入口").toMatch(/function shake\(amount: number\) \{\s*\n\s*if \(motionOff\) return;/);
    // 允许的直接赋值只有两处:shake() 自己内部,以及每帧的衰减(那不是"制造震动",
    // 是让它停下来)。守卫第一版按 1 写,当场抓出四处漏网的赋值——包括余烬新星
    // 那一下 22 的大震和受击抖动的 10。
    const direct = COMBAT_SRC.match(/shakeRef\.current\s*=[^=]/g) ?? [];
    expect(direct.length, `还有 ${direct.length} 处直接写 shakeRef,绕过了开关`).toBe(2);
  });

  it("胜利闪光被它关掉", () => {
    expect(COMBAT_SRC).toMatch(/if \(!motionOff\) \{\s*\n\s*setVictoryFlash\(true\);/);
  });

  it("受击抖动也被它关掉", () => {
    const tokens = COMBAT_SRC.match(/setPlayerShakeToken\(/g) ?? [];
    const gated = COMBAT_SRC.match(/if \(!motionOff\) setPlayerShakeToken\(/g) ?? [];
    expect(tokens.length, "受击抖动一处都没有了?").toBeGreaterThan(0);
    expect(gated.length, `${tokens.length} 处受击抖动里只有 ${gated.length} 处走了开关`).toBe(tokens.length);
  });

  /** 系统层面已经表达过意愿的,不该让人再翻一次设置。 */
  it("默认值跟随系统的 prefers-reduced-motion", () => {
    expect(SETTINGS_SRC, "没有读系统偏好").toMatch(/matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
    expect(SETTINGS_SRC, "首次进入时没有采用系统偏好").toMatch(/\{ \.\.\.DEFAULTS, reduceMotion: prefersReducedMotion\(\) \}/);
  });

  it("玩家自己改过之后,存下来的值优先", () => {
    expect(SETTINGS_SRC).toMatch(/typeof parsed\.reduceMotion === "boolean" \? parsed\.reduceMotion : prefersReducedMotion\(\)/);
  });
});
