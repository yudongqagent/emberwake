import { describe, expect, it } from "vitest";
import STATION_SRC from "./StationPanel.tsx?raw";

/** 兑换的批量得跟着手里有多少走,不能钉死在 30。
 *
 * 2026-08-31(/loop 第 65 轮)。搜到的原话:"设计者必须判断一个固定加值会不会被
 * 百分比成长淹没"。空间站的兑换正是被淹没的那种——原来是写死的
 * "30 废料 → 10 合金",一次一点击。
 *
 * 而第 48 轮量过的账让这件事格外刺眼:
 *
 *     全战役废料收入 14,005,而修船这个主要去处只吃掉约 4,000
 *     全战役合金收入  5,886,而升满七件模组就要 5,131
 *
 * 也就是说**废料换合金是全游戏最有用的一笔交易**——废料富余、合金紧张——
 * 偏偏被钉死在每次 30。把富余的废料换完要点 **467 次**。
 *
 * 汇率一点没动(那是设计),动的是批量:每次换手里的一成,不足一手就换一手。 */

/** 和实现同源的批量算法。 */
const units = (held: number, unitCost: number) => Math.max(1, Math.floor((held * 0.1) / unitCost));

describe("空间站兑换", () => {
  it("批量跟着持有量长,而不是固定 30", () => {
    expect(STATION_SRC, "还在写死 30 废料一手").not.toMatch(/spend\(\{ salvage: 30 \}\)/);
    expect(STATION_SRC, "没有按持有量算批量").toMatch(/Math\.floor\(\(held \* 0\.1\) \/ unitCost\)/);
  });

  it("汇率没变——变的只是一次换几手", () => {
    // 30 换 alloyOut、10 换 salvageOut 这两条比例仍在源码里。
    expect(STATION_SRC).toMatch(/"salvage", "alloy", 30, alloyOut/);
    expect(STATION_SRC).toMatch(/"alloy", "salvage", 10, salvageOut/);
  });

  it("穷的时候仍然换得起一手", () => {
    expect(units(30, 30), "只有 30 废料时换不动,那开局就用不了这个柜台").toBe(1);
    expect(units(0, 30)).toBe(1); // 按钮会因为买不起而禁用,但批量不能算成 0
  });

  it("富的时候一次换掉一成,不用点四百次", () => {
    const held = 14005; // 第 48 轮量到的全战役废料收入
    const n = units(held, 30);
    expect(n * 30, `一次只换 ${n * 30},离一成还差得远`).toBeGreaterThan(1200);
    // 把全部富余换完需要的点击数,从 467 次降到可接受的量级
    let left = held;
    let clicks = 0;
    while (left >= 30 && clicks < 500) {
      left -= units(left, 30) * 30;
      clicks++;
    }
    expect(clicks, `换完仍然要点 ${clicks} 次`).toBeLessThan(60);
  });

  it("按钮上写的是这一下实际的花费和收益", () => {
    expect(STATION_SRC, "标签没有跟着批量走").toMatch(/\{cost\} <TradeIcon/);
    expect(STATION_SRC).toMatch(/\{gain\}/);
    expect(STATION_SRC, "禁用条件没有跟着批量走").toMatch(/disabled=\{held < cost\}/);
  });

  it("两条兑换共用同一套逻辑,不会一边改一边漏", () => {
    const spends = STATION_SRC.match(/spend\(\{ \[from\]: cost \}\)/g) ?? [];
    expect(spends.length, "两条兑换又各写各的了").toBe(1);
  });
});
