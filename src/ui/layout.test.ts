import { describe, expect, it } from "vitest";
import COMBAT_SRC from "./screens/Combat.tsx?raw";
import STATION_SRC from "./screens/StationPanel.tsx?raw";
import MODULES_SRC from "./screens/Modules.tsx?raw";
import BRIDGE_SRC from "./screens/Bridge.tsx?raw";

/** 定宽 + 不换行 + 藏溢出 = 一段在另一种语言里会被切掉的文字。
 *
 * 2026-08-31(/loop 第 15 轮)。我前十四轮全程只看中文,这轮切到英文一看:
 *
 *   「Power 256」 容器 64px 内容 89px —— **被切掉四分之一**
 *   「Combo ×0」  容器 62px 内容 75px
 *
 * 那两个宽度是按中文「功率」「连击」量的,各两个字。而功率在这个游戏里是真实
 * 预算(超载会拉长武器冷却),那个数字不能缺。中文下两处都不缺,所以只测中文
 * 永远撞不到。
 *
 * 这条测试查的是**写法**,不是像素:一个元素同时满足"定死宽度"和"不换行"时,
 * 它就是在赌所有语言的文字都塞得下。用 minWidth 代替 width 就没有这个赌局
 * ——布局照样对齐,文字长了就撑开。 */
const SCREENS: [string, string][] = [
  ["Combat", COMBAT_SRC],
  ["StationPanel", STATION_SRC],
  ["Modules", MODULES_SRC],
  ["Bridge", BRIDGE_SRC],
];

describe("界面不能赌某种语言的文字长度", () => {
  it("没有元素同时写死宽度又禁止换行", () => {
    for (const [name, src] of SCREENS) {
      // 匹配同一个 style 对象里同时出现固定 width 和 nowrap 的写法。
      const offenders: string[] = [];
      const styleBlocks = src.match(/style=\{\{[^}]*\}\}/g) ?? [];
      for (const block of styleBlocks) {
        const fixedWidth = /\bwidth:\s*\d+\s*[,}]/.test(block);
        const noWrap = /whiteSpace:\s*"nowrap"/.test(block);
        if (fixedWidth && noWrap) offenders.push(block.slice(0, 90));
      }
      expect(
        offenders,
        `${name} 里有 ${offenders.length} 处定宽且不换行的文字——换一种语言就会被切:\n${offenders.join("\n")}`,
      ).toEqual([]);
    }
  });

  it("Combat 的读数用 minWidth 而不是 width", () => {
    // 这一条单独钉,因为功率/连击那两处正是这次被切的。
    expect(COMBAT_SRC).toMatch(/minWidth: 62/);
    expect(COMBAT_SRC).toMatch(/minWidth: 64/);
  });
});
