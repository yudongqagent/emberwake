import { describe, expect, it } from "vitest";
import { sigilsForDive, totalSigilCost, SIGILS_PER_NEW_DEPTH, SIGIL_NODES } from "./sigils";
import { RIFT_ANOMALIES, generateRiftWaveFull } from "./rift";

/** 刻印树的顶端,不能定价在这个模式够不到的深度上。
 *
 * 2026-09-01(/loop 第 88 轮)。整棵树 201 枚。按"每次都比上次深一层"这条最努力的
 * 走法算,原来买满要潜到**第 30 层**;停在某层反复刷则要 39~92 趟。
 *
 * 而这个模式没有被写到那么深:
 *   - DEPTH_SCALE 自己的注释写着"深度 ~6 对中期船是一堵真墙"
 *   - authored 内容最深的一条异常是 minDepth 15
 *   - 敌人总血按 1.22^depth 涨——第 1 层到第 30 层是 660 倍
 *
 * 实测清一波要多久(最强 mk5 武器升满 × 最多 10 个武器槽 = 2510 DPS,再宽放到 ×3):
 *      深 15   4~10 秒        深 20   18~39 秒
 *      深 25   43~136 秒      深 30   185~502 秒
 * 常规战斗实测 8~12 秒。第 30 层一**波**就要三到八分钟,而一趟深潜要从第 1 层
 * 一路清到底。这是第 54 轮"进阶阶梯上半截够不到"的同一类缺陷。
 *
 * 这条守卫钉的是**关系**,不是具体数字:树的总价、每层的结算、内容写到多深,
 * 三者必须对得上。谁想调平衡都可以,但不能再把顶端推到够不到的地方。 */

/** 每次都比上次深一层时,累计到某深度能拿多少。 */
function cumulativeTo(depth: number): number {
  let best = 0;
  let acc = 0;
  for (let d = 1; d <= depth; d++) {
    acc += sigilsForDive(d, best);
    best = d;
  }
  return acc;
}

/** 买满全树落在第几层。 */
function completionDepth(): number {
  const total = totalSigilCost();
  for (let d = 1; d <= 200; d++) if (cumulativeTo(d) >= total) return d;
  return Infinity;
}

/** 内容被写到多深——用 authored 异常里最深的那个 minDepth。 */
const AUTHORED_DEPTH = Math.max(...RIFT_ANOMALIES.map((a) => a.minDepth));

describe("刻印树够不够得到", () => {
  it("买满全树的深度,不能远超内容写到的深度", () => {
    const d = completionDepth();
    expect(AUTHORED_DEPTH, "异常表被清空了?那这条守卫的基准要重定").toBeGreaterThanOrEqual(10);
    expect(
      d,
      `买满全树要潜到第 ${d} 层,而内容只写到第 ${AUTHORED_DEPTH} 层——顶端够不到`,
    ).toBeLessThanOrEqual(AUTHORED_DEPTH + 8);
    // 也不能反过来:一下就买满,那这棵树就没有追求的过程了。
    expect(d, `第 ${d} 层就买满了,meta 成长太快`).toBeGreaterThan(AUTHORED_DEPTH);
  });

  it("中途要有明显的进展,不能全压在最后几层", () => {
    const total = totalSigilCost();
    const half = cumulativeTo(Math.round(AUTHORED_DEPTH * 0.7));
    expect(
      half / total,
      `潜到内容深度的七成时才拿到全树的 ${(half / total * 100).toFixed(0)}%——前期毫无回报`,
    ).toBeGreaterThan(0.25);
  });

  /** 设计意图:"再深一层"永远该是最优解,反复刷浅层不该更划算。 */
  it("突破纪录仍然远比反复刷同一层划算", () => {
    const plateau = 12;
    const repeat = sigilsForDive(plateau, plateau);
    const breakthrough = sigilsForDive(plateau + 1, plateau);
    expect(
      breakthrough,
      `再深一层只多给 ${breakthrough - repeat} 枚,刷浅层会变成最优解`,
    ).toBeGreaterThan(repeat * 1.5);
    expect(SIGILS_PER_NEW_DEPTH).toBeGreaterThan(1);
  });

  /** 敌人是指数涨的,这一条把"为什么深度不能无限推"钉住。 */
  it("敌人总血按深度指数增长——所以深度不是可以随便加的资源", () => {
    const at = (d: number) => {
      const runs = Array.from({ length: 9 }, () => generateRiftWaveFull(d));
      return runs.map((w) => w.encounter.enemies.reduce((s, e) => s + e.hull, 0)).sort((a, b) => a - b)[4];
    };
    const ratio = at(25) / at(15);
    expect(ratio, `深 15 → 深 25 只涨了 ${ratio.toFixed(1)} 倍?曲线被改平了`).toBeGreaterThan(4);
  });

  it("树本身还有内容,不是被砍空了", () => {
    expect(SIGIL_NODES.length).toBeGreaterThanOrEqual(6);
    expect(totalSigilCost()).toBeGreaterThan(150);
  });
});
