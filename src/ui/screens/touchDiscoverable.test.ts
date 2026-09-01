import { describe, expect, it } from "vitest";
import COMBAT_SRC from "./Combat.tsx?raw";
import STRINGS_SRC from "../../i18n/strings.ts?raw";

/** 规则不能只写在 title 里。
 *
 * 2026-09-01(/loop 第 81 轮)。搜到的两句原话:"title 属性对触屏和键盘用户根本
 * 不会出现";"如果一个界面需要靠 tooltip 才能用,那就该重新设计"。
 *
 * 先确认这不是空担心:把窗口调到 375×812 实测,手机布局是**做过**的——不横向
 * 溢出、导航收成右侧竖栏、目标列表横向滚动。也就是说真的有人会在手机上打这个
 * 游戏,而在手机上 title 一个字都不会出现。
 *
 * 然后逐条对了一遍战斗控件的**规则**写在哪里:
 *
 *     抗冲的窗口和冷却      combat.braceTitle          仅悬停
 *     接舷的三个条件        combat.boardTitle          仅悬停
 *     撤离要在远距保持 7 秒  combat.stance.retreatTitle 仅悬停  ← 第 75 轮刚做的机制
 *     余烬新星怎么充能      combat.emberNovaTitle      仅悬停
 *     超载的代价            combat.overchargeTitle     仅悬停
 *     自动开火是什么意思    combat.autoFireTitle       仅悬停
 *     裂隙异常的那串数字    rift.anomaly.*.desc        仅悬停  ← 第 70 轮刚补的数字
 *
 * 也就是说前面好几轮"把数字给玩家"的修法,落点都在一个手机上不存在的地方。
 *
 * 第 71 轮那条守卫其实已经写下过这个原则("悬停说明不算数——触屏上根本没有
 * 悬停"),只是当时只用在射程标签那一处。
 *
 * 修法按搜到的建议来:内容多的说明不做 tooltip,做成一个点得开的面板。文案复用
 * title 用的同一批 key,所以说明只有一份——改了 tooltip,面板跟着变。 */

const zh = STRINGS_SRC.slice(STRINGS_SRC.indexOf('const ZH: StringTable = {'));
const en = STRINGS_SRC.slice(
  STRINGS_SRC.indexOf("const EN: StringTable = {"),
  STRINGS_SRC.indexOf('const ZH: StringTable = {'),
);

describe("规则要有一个点得开的去处", () => {
  it("战斗里有说明面板,而且是按钮点开的,不是悬停", () => {
    expect(COMBAT_SRC, "没有说明面板").toMatch(/function CommandHelp\(/);
    expect(COMBAT_SRC, "面板没有入口按钮").toMatch(/onClick=\{\(\) => \{ setHelpOpen\(true\)/);
    expect(COMBAT_SRC, "面板不是对话框语义").toMatch(/role="dialog"/);
    expect(COMBAT_SRC).toMatch(/\{helpOpen && <CommandHelp/);
  });

  /** 关键的一条:面板里的文案必须**就是** title 里的那些 key,不能另写一份——
   * 另写一份迟早对不上,那比没有更糟。 */
  it("面板复用 title 用的同一批文案,不是另抄一份", () => {
    const help = COMBAT_SRC.slice(COMBAT_SRC.indexOf("const helpEntries = useMemo("));
    const body = help.slice(0, help.indexOf("}, [rift"));
    for (const key of [
      "combat.stance.${order}Title",
      "combat.braceTitle",
      "combat.boardTitle",
      "combat.overchargeTitle",
      "combat.emberNovaTitle",
      "combat.autoFireTitle",
      "rift.anomaly.${rift.anomaly}.desc",
    ]) {
      expect(body, `说明面板里没有 ${key},那条规则在手机上还是读不到`).toContain(key);
    }
  });

  /** 没给你的控件不该出现在说明里——和 combatUnlocks 那套渐进解锁同一条规矩。 */
  it("只列当前真的解锁了的控件", () => {
    const help = COMBAT_SRC.slice(COMBAT_SRC.indexOf("const helpEntries = useMemo("));
    const body = help.slice(0, help.indexOf("}, [rift"));
    for (const gate of ['unlocked("stance")', 'unlocked("brace")', 'unlocked("reactor")', 'unlocked("overcharge")']) {
      expect(body, `说明面板没有按 ${gate} 过滤`).toContain(gate);
    }
  });

  it("入口文案中英都在", () => {
    for (const [lang, seg] of [["EN", en], ["ZH", zh]] as const) {
      for (const k of ["combat.help.open", "combat.help.title"]) {
        const v = seg.match(new RegExp(`"${k.replace(/\./g, "\\.")}": "([^"]*)"`))?.[1];
        expect(v, `${lang} 缺少 ${k}`).toBeTruthy();
      }
    }
  });

  /** 那几条规则本身也钉住:它们必须真的带着可操作的内容,而不是一句形容词。
   * 仓库自己"给数字不给形容词"的规矩(第 30/53/69/70/77 轮)。 */
  it("被搬进面板的那几条说明,都还带着数字", () => {
    const bare: string[] = [];
    for (const k of ["combat.braceTitle", "combat.overchargeTitle", "combat.stance.retreatTitle"]) {
      const v = zh.match(new RegExp(`"${k.replace(/\./g, "\\.")}": "([^"]*)"`))?.[1] ?? "";
      if (!/\d/.test(v)) bare.push(`${k}: ${v}`);
    }
    expect(bare, `这些说明没有数字,搬到面板里也还是没法照着做决定:\n${bare.join("\n")}`).toEqual([]);
  });
});
