import { describe, expect, it } from "vitest";
import SRC from "./strings.ts?raw";

/** 两张字符串表必须一一对应。
 *
 * 2026-08-31(/loop 第 27 轮)。加一条新文案时,我的脚本把中文那行插进了**英文表**,
 * 于是英文表里同一个 key 出现两次、中文表里那个 key 根本不存在。tsc 恰好报了
 * "重复属性名"才被发现——但如果只是漏插一条(不重复,只是缺),tsc 什么都不会说,
 * t() 会安静地回退到 key 本身,界面上就出现一串 `draft.reroll` 这样的裸 key。
 *
 * 这条测试直接读源码分表比对,不依赖运行时。 */

function tableKeys(src: string, marker: string): string[] {
  const start = src.indexOf(marker);
  expect(start, `找不到 ${marker}`).toBeGreaterThan(-1);
  // 表以顶格的 `};` 结束
  const end = src.indexOf("\n};", start);
  const body = src.slice(start, end);
  return [...body.matchAll(/^\s{2}"([^"]+)":/gm)].map((m) => m[1]);
}

describe("英文表和中文表必须一一对应", () => {
  const en = tableKeys(SRC, "const EN: StringTable = {");
  const zh = tableKeys(SRC, "const ZH: StringTable = {");

  it("两张表都读到了内容", () => {
    expect(en.length).toBeGreaterThan(300);
    expect(zh.length).toBeGreaterThan(300);
  });

  it("同一张表里没有重复的 key", () => {
    for (const [name, keys] of [["EN", en], ["ZH", zh]] as const) {
      const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
      expect([...new Set(dupes)], `${name} 表里有重复 key——后一条会静默覆盖前一条`).toEqual([]);
    }
  });

  it("没有只在一边存在的 key", () => {
    const onlyEn = en.filter((k) => !zh.includes(k));
    const onlyZh = zh.filter((k) => !en.includes(k));
    expect(onlyEn, `这些 key 只有英文,中文界面上会直接显示裸 key:\n${onlyEn.join("\n")}`).toEqual([]);
    expect(onlyZh, `这些 key 只有中文,英文界面上会直接显示裸 key:\n${onlyZh.join("\n")}`).toEqual([]);
  });
});
