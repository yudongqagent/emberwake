import { describe, expect, it } from "vitest";
import { GALAXIES } from "../state/store";
import { ENCOUNTER_DEFS, BOUNTY_ENCOUNTER_DEFS } from "./encounters";
import { MODULE_RARITY_MULTIPLIER } from "./modules";
import type { EncounterDef } from "./types";

/** 升级预算必须跟着难度走,不能全堆在最后一个星区。
 *
 * 2026-08-31(/loop 第 48 轮)。搜同类游戏搜到的是"Money for Nothing"——钱堆着没处
 * 花。回头量 Emberwake,发现的是它的**镜像**:需要的时候商店是空的,不需要了才满。
 *
 *     到达时      累计合金   七件装备升得到   该区敌人中位伤害
 *     威胁 1        235         2 / 7              14
 *     威胁 2        531         3 / 7              25
 *     威胁 3        653         3 / 7              51
 *     威胁 4        807         3 / 7             190
 *     威胁 5      1,329         4 / 7             179
 *     威胁 6      2,795         6 / 7             409
 *     威胁 7      5,886         7 / 7             762
 *
 * **升级预算在威胁 2/3/4 连着三个区卡在 3 级不动,而敌人伤害在同一段翻了 7.6 倍。**
 * 全战役 53% 的合金出在最后一个星区、78% 出在最后两个——等能升满的时候游戏已经
 * 结束了。
 *
 * 根因:奖励和敌人数值共用了同一条指数曲线(1.85^(威胁-1)),而**升级需求不是指数**
 * ——玩家要的是"每进一个区,装备跟着升一级"。指数收入配线性需求,中段必然塌陷。
 *
 * tools/genAlloyCurve.py 按需求反推重分了一次,**总量不变**(5,886)。 */

const byId = new Map<string, EncounterDef>(
  [...ENCOUNTER_DEFS, ...BOUNTY_ENCOUNTER_DEFS].map((e) => [e.id, e]),
);

/** 把七件装备从 level 升到 level+1 要多少合金(以 mk2 为基准,和生成器同源)。 */
const stepCost = (level: number) => Math.round(18 * MODULE_RARITY_MULTIPLIER.mk2 * Math.pow(1.55, level - 1)) * 7;

/** 一周目走到每个星区末尾时,累计拿到多少合金、七件装备升得到几级。 */
function progression() {
  const rows: { threat: number; id: string; alloy: number; level: number }[] = [];
  let cum = 0;
  for (const g of [...GALAXIES].sort((a, b) => a.threat - b.threat)) {
    for (const sys of g.systems) {
      for (const p of sys.pois) {
        const d = p.data as { encounterId?: string; rewards?: { alloy?: number } } | undefined;
        cum += byId.get(d?.encounterId ?? "")?.rewards?.alloy ?? 0;
        cum += d?.rewards?.alloy ?? 0;
      }
    }
    let level = 1;
    let spent = 0;
    while (level < 7 && spent + stepCost(level) <= cum) {
      spent += stepCost(level);
      level++;
    }
    rows.push({ threat: g.threat, id: g.id, alloy: cum, level });
  }
  return rows;
}

describe("合金要在需要它的时候到手", () => {
  it("每进一个星区,升级预算至少往前走一级", () => {
    const rows = progression();
    const stalls: string[] = [];
    for (let i = 1; i < rows.length; i++) {
      // 已经满级(7)之后不再要求增长——没有第 8 级可升。
      if (rows[i - 1].level >= 7) continue;
      if (rows[i].level <= rows[i - 1].level) {
        stalls.push(`威胁${rows[i - 1].threat}→${rows[i].threat}: 还是只升得到 ${rows[i].level}/7`);
      }
    }
    expect(stalls, `升级预算原地踏步,而敌人在同一段变强:\n${stalls.join("\n")}`).toEqual([]);
  });

  it("不会到最后一个区才升得满", () => {
    const rows = progression();
    const maxed = rows.find((r) => r.level >= 7);
    expect(maxed, "整个战役都升不满").toBeTruthy();
    expect(
      maxed!.threat,
      `要到威胁${maxed!.threat}(倒数第 ${rows.length - rows.indexOf(maxed!)} 个区)才升得满,那升级系统只在片尾出现`,
    ).toBeLessThanOrEqual(rows[rows.length - 2].threat);
  });

  /** 最刺眼的那个数:一个区独占了整条曲线。 */
  it("没有哪个星区独占过半的合金", () => {
    const rows = progression();
    const total = rows[rows.length - 1].alloy;
    let prev = 0;
    for (const r of rows) {
      const share = (r.alloy - prev) / total;
      prev = r.alloy;
      expect(
        share,
        `威胁${r.threat} ${r.id} 一个区就占了全战役合金的 ${(share * 100).toFixed(0)}%`,
      ).toBeLessThan(0.4);
    }
  });

  /** 这次改动是重分配不是通胀——总量必须还在原来的量级上。 */
  it("总量没有被悄悄放大", () => {
    const total = progression()[6].alloy;
    expect(total, `合金总量 ${total},重分配前是 5,886`).toBeGreaterThan(5000);
    expect(total, `合金总量 ${total},重分配前是 5,886——涨这么多就不是重分配了`).toBeLessThan(6800);
  });
});
