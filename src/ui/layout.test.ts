import { readFileSync } from "node:fs";
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
    // 第 90 轮功率读数从「容量」变成「用量/容量」,更长了,所以 64 → 96;
    // 钉的是"用 minWidth 且给得下",不是某个具体像素。
    expect(COMBAT_SRC).toMatch(/minWidth: 62/);
    expect(COMBAT_SRC, '功率读数的宽度不够放「用量/容量」').toMatch(/minWidth: 9[0-9]/);
  });
});

/** 触摸目标的下限。
 *
 * 2026-08-31(/loop 第 16 轮)。这是个免费网页游戏,手机是主要平台,而我十五轮全在
 * 桌面比例上验。切到 375x812 一量:**20 个可点元素低于 WCAG 2.5.8 的 24x24 下限**,
 * 而且都在要害位置——
 *
 *   反应堆通道(火力/护盾/引擎)  98x20   战斗中按得最频繁的实时决策
 *   刻印购买按钮                24x21   按错就永久花掉一笔货币
 *   模组出售按钮                72x23
 *
 * 保底放在 .btn 的 min-height 上,而不是逐个界面调:这样以后新加的按钮自动达标。
 * 取 24 而不是推荐的 44,是因为 44 会把战斗界面的密度撑散——密度本身也是可用性;
 * 几个最要害的单独提到 26/32/40。 */
describe("触摸目标不能小于 WCAG 下限", () => {
  // 第 16 轮这里写着"vitest 读不到 CSS 源码(?raw 和 glob 都返回空)",于是那条
  // 保底只能靠注释背书。其实 vitest 跑在 node 里,直接读文件就行——第 82 轮补上,
  // 因为这一轮真正的规则就写在 CSS 里,靠注释背书的规则等于没有规则。
  const TOKENS = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

  it("鼠标那一侧的保底还在(24 = WCAG 2.5.8 的 AA 下限)", () => {
    expect(TOKENS, ".btn 的最小高度没了").toMatch(/min-height: var\(--tap-min, 24px\)/);
  });

  /** 第 82 轮。第 16 轮量过一次并**刻意**选了 24 而不是 44,理由写在上面:
   * "44 会把战斗界面的密度撑散——密度本身也是可用性"。那个理由是对的,但它是
   * 针对**所有输入方式**一刀切的 44 说的。
   *
   * 这一轮在 375×812 手机视口上重量了战斗中的每一个控件:24 以下一个没有(第 16
   * 轮那次修好了),**44 以下 15 个全中**——高度普遍 24~32,最小的「超载」40×27。
   * 而这是实时战斗:误触意味着技能放空,或者在撤离充能到一半时把舵手指令拨掉
   * (第 75 轮那条规则下等于丢掉整次脱离)。
   *
   * 所以不是推翻那个决定,是把它**按输入方式分开**:pointer: coarse 下抬到 44,
   * 鼠标那一侧一个像素不动,密度的担心因此不成立。撑不撑得下是实测过的
   * (见提交信息里的量测)。 */
  it("触屏那一侧抬到 44,而且只在触屏", () => {
    expect(TOKENS, "没有按输入方式区分").toMatch(/@media \(pointer: coarse\)/);
    const coarse = TOKENS.slice(TOKENS.indexOf("@media (pointer: coarse)"));
    expect(coarse, "触屏下没有把 --tap-min 抬上去").toMatch(/--tap-min:\s*44px/);
    expect(coarse, "裸 button 吃不到这条保底").toMatch(/button\s*\{[^}]*min-height: var\(--tap-min\)/);
  });

  it("战斗里那几个裸 button 跟着同一个变量走,不写死", () => {
    // 内联样式会盖过样式表,所以它们必须也读 --tap-min,否则触屏那条规则对它们无效。
    expect(COMBAT_SRC, "速度切换按钮写死了尺寸,触屏抬不动它").toMatch(
      /minWidth: "var\(--tap-min, 26px\)", minHeight: "var\(--tap-min, 26px\)"/,
    );
    expect(COMBAT_SRC, "反应堆通道按钮写死了高度").toMatch(/minHeight: "var\(--tap-min, 32px\)"/);
  });

  it("刻印购买按钮不靠内容长度撑开", () => {
    // 价格是一两位数时它只有 22px 宽,而按错是永久花钱。
    expect(BRIDGE_SRC).toMatch(/flex: "none", minWidth: 40/);
  });
});
