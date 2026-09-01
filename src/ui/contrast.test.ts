import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** 小字不能糊在背景里。
 *
 * 2026-09-01(/loop 第 110 轮)。前三轮都在"把数字给玩家"这条线上,这轮换一条:
 * 无障碍。第 82 轮补过触摸目标(2.5.8,AA),第 85 轮补过键盘可达(2.1.1,A)
 * 和焦点可见(2.4.7,AA)。**对比度(1.4.3,AA)从来没查过。**
 *
 * 查出来的是 --text-dim:原色 #5d7285 在四种背景上全都不达标——
 *
 *     bg-panel-raised 3.38    bg-panel 3.76    bg-void 4.02    bg-inset 4.09
 *
 * 而它全仓用了 **99 处**,字号 0.6~0.74rem(约 9.6~11.8px)。WCAG 的"大字"豁免
 * 要 18.66px 加粗或 24px,一个都够不上,所以 99 处**全部**要 4.5:1。用它的地方
 * 恰恰是提示语、章节名、距离、时长这类"看不清就得猜"的信息。
 *
 * 按同一色相整体抬亮到刚好达标:#6e879e(4.51 / 5.02 / 5.36 / 5.46)。
 *
 * --cyan-dim 也不达标(3.54),但它全仓只有一处,而且是渐变条的一端——图形元素
 * 按 1.4.11 只要 3:1,它过得去。下面那条测试钉住"它只能当图形用":哪天有人拿它
 * 当文字色,这条会红。 */

const TOKENS = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

function tokenHex(name: string): string {
  const m = TOKENS.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`tokens.css 里找不到 --${name}`);
  return m[1];
}

function relLuminance(hex: string): number {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = ch.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const la = relLuminance(a), lb = relLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** 页面上会出现的实心背景。 */
const SURFACES = ["bg-void", "bg-panel", "bg-panel-raised", "bg-inset"];

/** 会被当**正文颜色**用的 token。全部要 4.5:1。 */
const TEXT_TOKENS = [
  "text-hi", "text-mid", "text-dim",
  // 强调色也确实被当文字用(战败面板的红、奖励的琥珀、增益的绿……)
  "cyan", "amber", "violet", "magenta", "green", "red",
];

describe("对比度(WCAG 1.4.3 AA)", () => {
  it("每一个正文色在每一种背景上都到 4.5:1", () => {
    const bad: string[] = [];
    for (const fg of TEXT_TOKENS) {
      for (const bg of SURFACES) {
        const r = contrast(tokenHex(fg), tokenHex(bg));
        if (r < 4.5) bad.push(`--${fg} on --${bg}: ${r.toFixed(2)}:1`);
      }
    }
    expect(bad, `这些组合的小字看不清:\n${bad.join("\n")}`).toEqual([]);
  });

  /** 钉住这一轮修的那一个,免得有人"觉得太亮了"又调回去。 */
  it("text-dim 在最亮的那种面板上也达标", () => {
    const r = contrast(tokenHex("text-dim"), tokenHex("bg-panel-raised"));
    expect(r, `--text-dim 在 --bg-panel-raised 上只有 ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  /** 它没达标,但只当图形用——所以只要 3:1,而且不能变成文字色。 */
  it("cyan-dim 只当图形用,而且到 3:1", () => {
    const uses = TOKENS.match(/var\(--cyan-dim\)/g) ?? [];
    expect(uses.length, "cyan-dim 的用法变了,重新确认它是不是还只是渐变").toBe(1);
    expect(TOKENS, "cyan-dim 被当成文字色了——那它要 4.5:1,现在只有 3.54").not.toMatch(
      /color:\s*var\(--cyan-dim\)/,
    );
    for (const bg of SURFACES) {
      expect(contrast(tokenHex("cyan-dim"), tokenHex(bg)), `cyan-dim on ${bg}`).toBeGreaterThanOrEqual(3);
    }
  });

  /** 别为了过线把整套配色洗白——dim 得还是比 mid 暗,层次不能塌。 */
  it("三档文字色的明暗顺序还在", () => {
    const hi = relLuminance(tokenHex("text-hi"));
    const mid = relLuminance(tokenHex("text-mid"));
    const dim = relLuminance(tokenHex("text-dim"));
    expect(hi).toBeGreaterThan(mid);
    expect(mid, "text-dim 被调得和 text-mid 一样亮了,层次没了").toBeGreaterThan(dim);
  });
});
