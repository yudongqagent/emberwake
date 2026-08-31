import { describe, expect, it } from "vitest";
import { resourceInfo } from "./components/Icons";
import STATION_SRC from "./screens/StationPanel.tsx?raw";
import MODULES_SRC from "./screens/Modules.tsx?raw";
import STORE_SRC from "../state/store.ts?raw";
import type { ResourceType } from "../data/types";

/** 资源说明必须说的是**现在**的去处。
 *
 * 2026-08-31(/loop 第 35 轮)。Icons.tsx 里那张说明表上方的注释自己写着:
 *
 *     Each entry names the actual, current spend point(s) in the code,
 *     not an aspirational description
 *
 * 逐条核对下来,五条里漂了三条:
 *
 *   洞悉      写「花费它可以直接**锁定**模组特性」
 *             —— 实际是**重掷**。lockTrait 早就被 rerollTrait 换掉了,文案留在原地。
 *   合金      写「装备新船员、兑换废料」
 *             —— 漏了**模组升级**,而那是合金最大的去处(一件 mk5 练满要上万)。
 *   本源精华  写「进阶**唯一**需要的资源」
 *             —— 第 34 轮我自己加了改铸,也花精华,而这句话没跟着改。
 *
 * 最后一条尤其值得记:上一轮我加了新去处却没回头看文案,当场就把这张表变旧了一条。
 * 所以这里钉的不是文字本身,而是**去处的数量**:代码里多出一个 spend 点,这条测试
 * 就会红,逼人回来看一眼说明还对不对。 */

/** 每种资源当前真实的花费点数量。改了代码就要回来改这里——顺带改说明。 */
const SPEND_SITES: Record<ResourceType, number> = {
  salvage: 2,        // 修船 · 兑换合金
  sourcePoints: 2,   // 制造工坊抽取 · 刷新报价
  alloy: 3,          // 兑换废料 · 招募船员 · 模组升级
  originEssence: 2,  // 进阶 · 改铸
  insight: 1,        // 词条重掷
};

const SOURCES = [STATION_SRC, MODULES_SRC, STORE_SRC].join("\n");

/** 数一下源码里针对某种资源的扣除点。store 里的进阶/改铸是直接减字段,不走 spend()。 */
function countSites(res: ResourceType): number {
  const viaSpend = [...SOURCES.matchAll(new RegExp(`spend\\(\\{\\s*${res}:`, "g"))].length;
  const viaDirect = [...SOURCES.matchAll(new RegExp(`${res}: state\\.value\\.resources\\.${res} - `, "g"))].length;
  return viaSpend + viaDirect;
}

describe("资源说明必须对得上真实的去处", () => {
  const all = Object.keys(SPEND_SITES) as ResourceType[];

  it("每种资源都有非空的说明", () => {
    for (const r of all) expect(resourceInfo(r).length, `${r} 没有说明`).toBeGreaterThan(10);
  });

  it("代码里的花费点数量和登记的一致——多了一个就该回来看文案", () => {
    const drift = all
      .map((r) => ({ r, want: SPEND_SITES[r], got: countSites(r) }))
      .filter((x) => x.got !== x.want);
    expect(
      drift.map((x) => `${x.r}: 登记 ${x.want} 处,代码里数到 ${x.got} 处`),
      `花费点变了,而资源说明可能还停在旧的用途上(第 35 轮就是这么漂了三条):\n${drift.map((x) => x.r).join("\n")}`,
    ).toEqual([]);
  });

  it("洞悉的说明不能再写成「锁定」——那个机制已经不存在了", () => {
    for (const info of [resourceInfo("insight")]) {
      expect(info, "洞悉的说明还在描述已被移除的 lockTrait").not.toMatch(/lock in|锁定/);
    }
  });

  it("本源精华的说明不能再说自己是「唯一」用途", () => {
    expect(resourceInfo("originEssence"), "改铸也花精华,说明却还写着「唯一」").not.toMatch(/The only thing|唯一/);
  });
});
