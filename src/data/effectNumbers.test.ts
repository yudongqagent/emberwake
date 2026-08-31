import { describe, expect, it } from "vitest";
import { MODULE_EFFECTS } from "./moduleEffects";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";
import MODULES_SRC from "../engine/modules.ts?raw";
import STORE_SRC from "../state/store.ts?raw";

/** 词条说的数,必须是代码里那个数。
 *
 * 2026-08-31(/loop 第 29 轮)。46 条模组效果里,**只有 9 条给了数字**,其余 37 条
 * 写的是「提高暴击几率」「造成额外伤害」「稍微缩短冷却」这种话。
 *
 * 而第 27 轮已经量清楚:模组设计是个 10 族 × 5 层 × 4 槽的矩阵,同族同层只有一件——
 * **模组之间真正的差别就在效果上**。差别说不清楚,深度就等于不存在。
 *
 * 那 9 条有数字的先逐条核过,全部对得上(pierce 0.5 / execute 1.5 / finisher 1.35 /
 * rampage 0.12 / pointBlank 1.3 / sniper 1.3 / exploit 1.4)。剩下 37 条的数值
 * 全部从代码里挖出来填进了描述。
 *
 * 这条测试反过来钉:描述里写的每个百分数,代码里必须找得到对应的常数。它拦的是
 * 以后调平衡时只改代码、不改文案——搜到的原话是「工具提示要么缺关键信息,要么
 * 干脆是错的」。 */

const CODE = [COMBAT_SRC, MODULES_SRC, STORE_SRC].join("\n");

/** 描述里的百分数 → 代码里可能的写法。40% 可能写成 0.4 / 0.40 / 1.4 / 40。 */
function appearsInCode(pct: number): boolean {
  const frac = pct / 100;
  const forms = [
    frac.toFixed(2).replace(/0$/, ""), // 0.4
    frac.toFixed(2),                   // 0.40
    String(frac),                      // 0.4
    String(1 + frac),                  // 1.4
    String(1 - frac),                  // 0.6
    String(pct),                       // 40
  ];
  return forms.some((f) => CODE.includes(f));
}

describe("词条上的数字必须在代码里找得到", () => {
  it("测试确实读到了效果表和代码", () => {
    expect(MODULE_EFFECTS.length).toBeGreaterThan(40);
    expect(CODE.length).toBeGreaterThan(10000);
  });

  it("每条效果的描述都给出了具体数字或明确的条件", () => {
    // 少数效果本身没有可量化的数(「清除腐蚀」「抵消第一次攻击」),它们靠措辞
    // 说清楚"什么时候发生"就够了。这里只要求不出现纯模糊的量词。
    const VAGUE = /\b(some|several|slightly|a bit|more|reduced|bonus|higher|faster|steadily|briefly)\b/i;
    const offenders = MODULE_EFFECTS.filter((e) => VAGUE.test(e.description) && !/\d/.test(e.description));
    expect(
      offenders.map((e) => `${e.id} — ${e.description}`),
      `这些效果只说了"更多/更快/略微",玩家无法据此做取舍:\n${offenders.map((e) => e.id).join("\n")}`,
    ).toEqual([]);
  });

  it("描述里的每个百分数在代码里都有对应的常数", () => {
    const offenders: string[] = [];
    for (const e of MODULE_EFFECTS) {
      for (const m of e.description.matchAll(/([+-]?\d+(?:\.\d+)?)\s*%/g)) {
        const pct = Math.abs(Number(m[1]));
        if (!appearsInCode(pct)) offenders.push(`${e.id} 写着 ${m[0]},代码里找不到对应常数`);
      }
    }
    expect(offenders, `文案和代码对不上了:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("中英文描述里的数字必须一致", () => {
    const offenders: string[] = [];
    for (const e of MODULE_EFFECTS) {
      const en = [...e.description.matchAll(/\d+(?:\.\d+)?/g)].map((m) => m[0]).sort();
      const cn = [...e.descriptionCn.matchAll(/\d+(?:\.\d+)?/g)].map((m) => m[0]).sort();
      if (en.join(",") !== cn.join(",")) offenders.push(`${e.id}: EN[${en}] ≠ ZH[${cn}]`);
    }
    expect(offenders, `两种语言给玩家的数字不一样:\n${offenders.join("\n")}`).toEqual([]);
  });
});
