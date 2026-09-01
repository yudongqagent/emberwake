import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import COMBAT_SRC from "./screens/Combat.tsx?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 换打哪一艘,不能只有"点画布"这一条路。
 *
 * 2026-09-01(/loop 第 85 轮)。搜到的原则是"提交之前要让玩家做得成知情的决定";
 * 顺着去查进阶界面,那边做得很好(前后对比、每一项差值都写出来,而且实测过
 * 每一条合法路径上没有任何一项会下降)。真正的洞在别处。
 *
 * setTargetIdx 全代码库只有三处调用:
 *     画布上的 pointerdown        ← **唯一**由玩家发起的那一处
 *     目标死了自动换
 *     接舷时自动改打护卫
 *
 * 也就是说"集火打哪一艘"——每场多敌遭遇里最核心的战术决定——只能用指针点画布。
 * 键盘用户换不了目标,而画布既没有 tabindex 也没有任何 DOM 控件。
 * WCAG 2.1.1「键盘可操作」是 **A 级**,比第 82 轮那条 2.5.8(AA)还基础。
 *
 * 补两条路,原来的点击一点不动:
 *   - 目标列表做成按钮:Tab 能到、读屏能念、aria-pressed 说明当前锁的是哪个
 *   - 数字键 1–9 直接切:实时战斗里,按键比 Tab 到第 N 个跟得上
 *
 * 另一半是**看得见**。整个样式表里原来一条 :focus 规则都没有,而 .btn 用了
 * clip-path——浏览器默认的焦点环会被 clip-path 沿按钮自身的边裁掉。实测 Tab
 * 过去:outline-style 确实是 auto(默认环在),但它和边框重合、只有 1px、还缺角。
 * 改用 box-shadow:它画在元素自己的绘制盒里,**不会被 clip-path 裁掉**。 */

const TOKENS = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

describe("键盘也要够得着", () => {
  it("换目标不再只有画布点击一条路", () => {
    // 玩家发起的选目标必须走同一个入口,而不是各写各的。
    expect(COMBAT_SRC, "没有统一的选目标入口").toMatch(/function selectTarget\(i: number\)/);
    // 画布点击照旧。
    expect(COMBAT_SRC, "画布点击被删了——鼠标/触屏玩家反而退步了").toMatch(
      /canvas\.addEventListener\("pointerdown", onPointer\)/,
    );
  });

  it("数字键 1–9 能切目标", () => {
    expect(COMBAT_SRC, "没有数字键切目标").toMatch(/window\.addEventListener\("keydown", onKey\)/);
    const i = COMBAT_SRC.indexOf("function onKey(e: KeyboardEvent)");
    expect(i, "找不到键盘处理").toBeGreaterThan(0);
    const body = COMBAT_SRC.slice(i, i + 420);
    expect(body, "没有限制在 1–9").toMatch(/n < 1 \|\| n > 9/);
    expect(body, "按键没有走同一个选目标入口").toMatch(/selectTarget\(n - 1\)/);
    // 别抢走浏览器/系统的组合键。
    expect(body, "组合键没有放行").toMatch(/e\.metaKey \|\| e\.ctrlKey \|\| e\.altKey/);
  });

  it("目标列表是真按钮,读屏能念出当前锁的是哪个", () => {
    expect(COMBAT_SRC).toMatch(/role="group"\s*\n\s*aria-label=\{t\("combat\.targetPick"\)\}/);
    expect(COMBAT_SRC, "没有告诉读屏当前选中的是哪一个").toMatch(/aria-pressed=\{i === targetIdx\}/);
    expect(COMBAT_SRC, "死掉的敌人还列在选择里").toMatch(/e\.hull <= 0 \? null :/);
  });

  it("入口文案中英都在,而且写出了快捷键", () => {
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      const v = seg.match(/"combat\.targetPick": "([^"]*)"/)?.[1];
      expect(v, `${lang} 缺少 combat.targetPick`).toBeTruthy();
      // 仓库自己"给数字"的规矩:快捷键是什么得写出来,不能只说"可以用键盘"。
      expect(/\d/.test(v!), `${lang} 没写出快捷键是哪几个:「${v}」`).toBe(true);
    }
  });

  /** WCAG 2.4.7 焦点可见(AA)。 */
  it("焦点看得见,而且不会被 clip-path 裁掉", () => {
    expect(TOKENS, "全站没有焦点样式").toMatch(/:focus-visible \{/);
    // .btn 有 clip-path,所以它的焦点指示**必须**是 box-shadow 而不是 outline。
    const btnRule = TOKENS.slice(TOKENS.indexOf(".btn:focus-visible"));
    expect(btnRule.slice(0, 220), ".btn 的焦点环会被 clip-path 裁掉").toMatch(/box-shadow:\s*\n?\s*inset/);
    expect(TOKENS, ".btn 仍然带 clip-path——这正是不能用 outline 的原因").toMatch(/\.btn \{[\s\S]*?clip-path: polygon/);
  });

  /** 只在键盘焦点时出现,鼠标点击不该平白多一圈。 */
  it("只给键盘焦点,不给鼠标点击", () => {
    expect(TOKENS, "用了 :focus 而不是 :focus-visible,鼠标点完也会亮").not.toMatch(/[^-]:focus \{/);
  });
});
