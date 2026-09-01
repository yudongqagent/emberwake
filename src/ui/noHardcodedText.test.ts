import { describe, expect, it } from "vitest";
import COMBAT_SRC from "./screens/Combat.tsx?raw";
import SHIPART_SRC from "./render/shipArt.ts?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 画在 canvas 上的字,也得过翻译表。
 *
 * 2026-08-31(/loop 第 74 轮)。搜到的说法:"写死在代码里的字符串根本进不了翻译流程",
 * 而漏翻的字符串会直接击碎沉浸感。
 *
 * JSX 里的文本扫下来是干净的(只有 Bridge 上那个 "Emberwake" 字标,那是刻意的)。
 * 但正则看不见 canvas——那里有 **7 处写死的英文**,而且全在最常看的那块屏幕上,
 * 正是告诉玩家"这个敌人在干什么"的标签:
 *
 *     PHASED / ⚠ CHARGING / DISABLED        敌人状态
 *     ✚ MENDER / ◈ ANCHOR / ◎ SIEGE        敌人角色
 *     recharging…                            舰船绘制
 *
 * 中文玩家在战斗里看到的是这些英文。而代码里那条注释自己都写着
 * 「"MENDER" 第一次看到时什么也说明不了」——它说的是需要解释,而当时连翻译都没有。 */

const SOURCES: [string, string][] = [
  ["Combat.tsx", COMBAT_SRC],
  ["shipArt.ts", SHIPART_SRC],
];

describe("画布上的字不能写死", () => {
  it("canvas 不再直接画字面量", () => {
    const bad: string[] = [];
    for (const [name, src] of SOURCES) {
      for (const m of src.matchAll(/fillText\(\s*"([^"]*)"/g)) {
        bad.push(`${name}: fillText("${m[1]}")`);
      }
    }
    expect(bad, `这些字画在画布上,但没走翻译表:\n${bad.join("\n")}`).toEqual([]);
  });

  it("七个徽章中英都在", () => {
    const keys = ["mender", "anchor", "siege", "phased", "charging", "disabled", "recharging"];
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      for (const k of keys) {
        expect(
          seg.match(new RegExp(`"combat\\.badge\\.${k}": "([^"]*)"`))?.[1],
          `${lang} 缺少 combat.badge.${k}`,
        ).toBeTruthy();
      }
    }
  });

  it("中文那份真的翻了,不是把英文抄一遍", () => {
    const zh = STRINGS_SRC.slice(STRINGS_SRC.indexOf('const ZH: StringTable = {'));
    for (const k of ["phased", "charging", "disabled", "recharging", "mender", "anchor", "siege"]) {
      const v = zh.match(new RegExp(`"combat\\.badge\\.${k}": "([^"]*)"`))?.[1] ?? "";
      expect(/[一-鿿]/.test(v), `combat.badge.${k} 的中文还是英文:「${v}」`).toBe(true);
    }
  });

  /** JSX 那一侧扫下来是干净的,把它也钉住。 */
  it("战斗界面的 JSX 里没有裸露的英文文本", () => {
    const bare = [...COMBAT_SRC.matchAll(/>\s*([A-Z][A-Za-z][A-Za-z \-'/%.,:]{3,40})\s*</g)]
      .map((m) => m[1].trim())
      .filter((x) => !["NEW", "EN", "ZH", "Emberwake"].includes(x));
    expect(bare, `战斗界面里有写死的英文:\n${bare.join("\n")}`).toEqual([]);
  });
});
