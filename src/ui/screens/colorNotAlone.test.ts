import { describe, expect, it } from "vitest";
import { rangeProfileMultiplier, rangeFitTone } from "../../engine/combat";
import COMBAT_SRC from "./Combat.tsx?raw";
import MODULESTATS_SRC from "../components/ModuleStats.tsx?raw";
import SYSTEMVIEW_SRC from "./SystemView.tsx?raw";
import STRINGS_SRC from "../../i18n/strings.ts?raw";

/** 关键信息不能只由颜色承载。
 *
 * 2026-08-31(/loop 第 71 轮)。搜到的第一条无障碍原则就是这句,而 FTL 自己就带
 * 色盲模式。逐项对了一遍这个游戏里"靠颜色说话"的地方:
 *
 *     模组数值差    有 +N / −N 的符号        ✓
 *     词条差        有 +/− 和删除线          ✓
 *     敌人角色      有字形 ✚ / ◈ / ◎        ✓
 *     交战前读数    有"占船体 90%"的百分比    ✓
 *     稀有度        有 MK1~MK5 的字样        ✓
 *     进阶门槛      有 ✓ / ○ 标记            ✓
 *
 * 唯独**第 47 轮我自己加的那个「擅长射程」标签**是纯靠颜色的:同样写着「远距」,
 * 绿色表示 ×1.25、灰色 ×1.00、红色 ×0.75,除了颜色没有第二个区分。悬停说明不算
 * 数——触屏上根本没有悬停。
 *
 * 修法照仓库自己"给数字"的规矩来:把倍率写在标签上,只在不是 ×1.00 时出现。
 * 于是"有没有这个数"是第一层信号,数值本身是第二层,颜色退化成冗余。 */

describe("关键信息不能只由颜色承载", () => {
  it("三种射程契合度确实是三种不同的结果——所以必须能区分", () => {
    expect(rangeProfileMultiplier("long", "long")).toBeCloseTo(1.25);
    expect(rangeProfileMultiplier("long", "mid")).toBeCloseTo(1.0);
    expect(rangeProfileMultiplier("long", "close")).toBeCloseTo(0.75);
    expect(new Set(["long", "mid", "close"].map((b) => rangeFitTone("long", b as never))).size).toBe(3);
  });

  it("武器上的射程标签带倍率,不是只有颜色", () => {
    expect(
      COMBAT_SRC,
      "射程契合度又变回只靠颜色了——色盲玩家和触屏玩家都读不出占便宜还是吃亏",
    ).toMatch(/mult !== 1 && <span[^>]*>×\{mult\.toFixed\(2\)\}<\/span>/);
  });

  it("中性档不显示倍率,免得三种情形长得一样", () => {
    // "有没有这个数"本身就是第一层信号。
    expect(COMBAT_SRC).toMatch(/\{mult !== 1 &&/);
  });

  /** 其它几处已经有非颜色区分的地方,一并钉住,免得以后被简化掉。 */
  it("模组数值差保留 +/− 符号", () => {
    expect(MODULESTATS_SRC).toMatch(/\{value > 0 \? "\+" : "−"\}/);
  });

  it("词条差保留 +/− 和删除线", () => {
    expect(MODULESTATS_SRC).toMatch(/textDecoration: "line-through"/);
    expect(MODULESTATS_SRC).toMatch(/\+\{localizedTrait/);
  });

  /** 第 74 轮把这三个徽章搬进了 i18n(它们原来是写死在 canvas 上的英文),
   * 所以守卫跟着搬:查的是**两种语言里都带字形**,而不是某个文件里的字面量。 */
  it("敌人角色保留字形,不只是配色——中英都要有", () => {
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      for (const [key, glyph] of [["mender", "✚"], ["anchor", "◈"], ["siege", "◎"]] as const) {
        const line = seg.match(new RegExp(`"combat\\.badge\\.${key}": "([^"]*)"`))?.[1] ?? "";
        expect(line, `${lang} 缺少 combat.badge.${key}`).toBeTruthy();
        expect(line, `${lang} 的 ${key} 徽章丢了字形,只剩配色可分`).toContain(glyph);
      }
    }
    expect(COMBAT_SRC, "战斗没有从文案表取徽章").toMatch(/t\("combat\.badge\.mender"\)/);
  });

  it("交战前的威胁读数带百分比,不只是红黄绿", () => {
    expect(SYSTEMVIEW_SRC).toMatch(/system\.threatRead/);
    expect(SYSTEMVIEW_SRC).toMatch(/pct/);
  });
});
