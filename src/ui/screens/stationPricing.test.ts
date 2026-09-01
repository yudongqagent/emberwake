import { describe, expect, it } from "vitest";
import STATION_SRC from "./StationPanel.tsx?raw";
import STORE_SRC from "../../state/store.ts?raw";
import { refreshCostForTest } from "./StationPanel";

/** 柜台上的价格,必须按**点击那一刻**算。
 *
 * 2026-09-01(/loop 第 79 轮)。第 66 轮修过一次这个坑——招募价按人数递增,而
 * 同一个 tick 里连点三次会三次都读到渲染闭包里那个旧价。当时的修法是对的,
 * **但只修了那一个柜台**。
 *
 * 空间站上有四处花钱的地方,而那一轮之后另外三处原样留着:
 *
 *     修船      spend({ salvage: repairCost })      渲染闭包
 *     兑换      spend({ [from]: cost })             渲染闭包
 *     刷新货架  spend({ sourcePoints: cost })       渲染闭包 ← 价格是递增的
 *     买模组    spend({ sourcePoints: cost })       渲染闭包
 *
 * 刷新那一处最要命,因为它的价格明确是递增的(10 + 15n)。浏览器实测
 * (2026-09-01,洋紫荆本星交易所):同一个 tick 里连点三次,源点 670 → 640,
 * **三次刷新只花了 30,而真价是 10 + 25 + 40 = 75**。
 *
 * 这正是这个仓库反复撞的那一类:规则对了,但没接全。所以这条守卫不盯某一个
 * 柜台,它盯**每一处 spend**——下一个柜台加进来时也躲不过去。
 *
 * 根上还补了一刀:spend 原来是直接减,任何一次过期价格的连点都能把余额打成
 * 负数,而负余额会让所有 canAfford 和界面读数一起失真。 */

/** 一段 onClick={() => { ... }} 的函数体。 */
function clickBodies(src: string): string[] {
  const out: string[] = [];
  const marker = "onClick={() => {";
  let from = 0;
  for (;;) {
    const start = src.indexOf(marker, from);
    if (start < 0) break;
    let depth = 0;
    let i = start + marker.length - 1;
    for (; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    out.push(src.slice(start, i + 1));
    from = i + 1;
  }
  return out;
}

describe("空间站的价格", () => {
  const spendingClicks = clickBodies(STATION_SRC).filter((b) => /\bspend\(/.test(b));

  it("确实有好几处花钱的地方,否则下面几条是空转", () => {
    expect(spendingClicks.length).toBeGreaterThanOrEqual(4);
  });

  it("每一处花钱都在点击那一刻重算价格,并且重新检查买不买得起", () => {
    const bad: string[] = [];
    for (const body of spendingClicks) {
      // 点击那一刻重新求值的标志:要么算出一个新的价(now/costNow),要么先
      // 从当前状态取数。光有一个 disabled={} 不算——那是渲染时算的。
      const recomputes = /const (now|costNow|heldNow|missing)\b/.test(body);
      // 而且必须有一道自己的闸门,不能只靠渲染时的 disabled。
      const guards = /if \(!canAfford\(|if \(held\w* < |if \(missing \w*<?= 0\) return|<= 0\) return/.test(body);
      if (!recomputes || !guards) {
        bad.push(body.replace(/\s+/g, " ").slice(0, 110));
      }
    }
    expect(
      bad,
      `这些柜台还在用渲染闭包里的旧价格——同一个 tick 里连点就能按第一次的价格买好几次:\n${bad.join("\n\n")}`,
    ).toEqual([]);
  });

  it("刷新价确实是递增的——所以它必须按点击那一刻算", () => {
    expect(refreshCostForTest(0)).toBe(10);
    expect(refreshCostForTest(1)).toBeGreaterThan(refreshCostForTest(0));
    expect(refreshCostForTest(2)).toBeGreaterThan(refreshCostForTest(1));
    // 实测那三下的真价。
    expect(refreshCostForTest(0) + refreshCostForTest(1) + refreshCostForTest(2)).toBe(75);
    // 递增的次数得从 ref 取,state 在同一个 tick 里不会更新。
    expect(STATION_SRC, "刷新次数还是从渲染闭包里的 state 读的").toMatch(
      /refreshCost\(refreshCountRef\.current\)/,
    );
  });

  /** 补在根上,别指望下一个调用点会记得——spend 自己的注释就是这么说的。 */
  it("扣钱扣不成负数", () => {
    expect(STORE_SRC, "spend 还会把余额扣成负数").toMatch(
      /resources\[k as ResourceType\] = Math\.max\(0, resources\[k as ResourceType\] - \(v \?\? 0\)\)/,
    );
  });
});
