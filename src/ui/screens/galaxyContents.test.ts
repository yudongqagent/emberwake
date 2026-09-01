import { describe, expect, it, beforeEach } from "vitest";
import { GALAXIES, systemContents, replaceState, state } from "../../state/store";
import { createInitialState } from "../../engine/save";
import { ENCOUNTER_DEFS, BOUNTY_ENCOUNTER_DEFS } from "../../data/encounters";
import GALAXY_SRC from "./GalaxyView.tsx?raw";
import STRINGS_SRC from "../../i18n/strings.ts?raw";

/** 星图要说出每个星系里有什么。
 *
 * 2026-09-01(/loop 第 95 轮)。全图 19 个星系、**21 条悬赏**,而星图上每个星系只
 * 画了位置和控制方——它不告诉你那里有什么。找悬赏的唯一办法是逐个跳进去看接触
 * 列表,全靠撞。
 *
 * 搜到的说法正对着这一条:游戏往往不告诉玩家错过了什么,于是玩家仅仅因为"没撞见"
 * 就漏掉了内容;而悬赏板之所以被推荐,正是因为它把所有可选项**一次摊开**。
 *
 * 21 条悬赏在数据上都放好了(每条都挂在某个 POI 上,还有专门的橙色标记和
 * 「悬赏目标——可重复挑战」的文案)——内容是齐的,缺的只是一个够得到的入口。
 *
 * 写成**文字**而不是只用图标:关键信息不能只由颜色/字形承载(第 71 轮),
 * 而且触屏上没有悬停可以补说明(第 81 轮)。 */

describe("星图上的星系内容", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("21 条悬赏确实都放在地图上了——内容是齐的,缺的是入口", () => {
    const defined = [...ENCOUNTER_DEFS, ...BOUNTY_ENCOUNTER_DEFS]
      .map((e) => e.id)
      .filter((id) => id.startsWith("bounty"));
    const placed = new Set<string>();
    for (const g of GALAXIES) {
      for (const s of g.systems) {
        for (const p of s.pois) {
          const eid = (p.data as { encounterId?: string } | undefined)?.encounterId;
          if (eid?.startsWith("bounty")) placed.add(eid);
        }
      }
    }
    expect(defined.length).toBeGreaterThanOrEqual(20);
    expect(
      defined.filter((id) => !placed.has(id)),
      "有悬赏定义了却没放上地图",
    ).toEqual([]);
  });

  /** 读数必须跟着解锁走:没解锁的悬赏不该在星图上晃,解锁了的必须出现。
   * (我第一版直接断言"带悬赏的星系 > 5",在全新存档上红了——查下来是
   * requiresFlag 门控在起作用,也就是**正确行为**。断言写错了,不是代码写错了。) */
  it("新开局时几乎什么都没解锁,星图就不该乱承诺", () => {
    let withBounty = 0;
    for (const g of GALAXIES) for (const s of g.systems) if (systemContents(s, g).bounties > 0) withBounty++;
    expect(withBounty, "新开局就摊开了一堆悬赏——门控没起作用").toBeLessThan(5);
  });

  it("解锁之后,该出现的都出现", () => {
    const flags: Record<string, boolean> = {};
    for (const g of GALAXIES) for (const s of g.systems) for (const p of s.pois) {
      if (p.requiresFlag) flags[p.requiresFlag] = true;
    }
    replaceState({ ...createInitialState(), flags });
    let withBounty = 0;
    let withStation = 0;
    let total = 0;
    for (const g of GALAXIES) {
      for (const s of g.systems) {
        const c = systemContents(s, g);
        if (c.bounties > 0) withBounty++;
        if (c.station) withStation++;
        total += c.bounties;
      }
    }
    expect(withBounty, "解锁之后星图仍然数不出悬赏").toBeGreaterThan(10);
    expect(total, "悬赏总数对不上").toBeGreaterThanOrEqual(20);
    expect(withStation, "一个带空间站的星系都数不出来").toBeGreaterThan(0);
  });

  /** 只数**现在真的可去**的:清掉还没重生的、要 flag 没解锁的都不算,
   * 否则星图会承诺一件到了那儿并不存在的事。 */
  it("清掉的目标不再算数", () => {
    const g = GALAXIES.find((x) => x.systems.some((s) => systemContents(s, x).bounties > 0))!;
    const sys = g.systems.find((s) => systemContents(s, g).bounties > 0)!;
    const before = systemContents(sys, g).bounties;
    const bountyPoi = sys.pois.find(
      (p) => (p.data as { bounty?: boolean } | undefined)?.bounty,
    )!;
    replaceState({
      ...state.value,
      poiState: { [bountyPoi.id]: { cleared: true, clearedAt: Date.now() } },
    });
    expect(
      systemContents(sys, g).bounties,
      "刚清掉的悬赏还算在星图上——玩家飞过去会扑空",
    ).toBeLessThan(before);
  });

  it("星图真的把它画出来了", () => {
    expect(GALAXY_SRC, "星图没有读星系内容").toMatch(/const c = systemContents\(sys, galaxy\)/);
    expect(GALAXY_SRC, "没有画出来").toMatch(/t\("galaxy\.hasBounties", \{ n: c\.bounties \}\)/);
    // 没东西的星系不该多出一行空文字。
    expect(GALAXY_SRC).toMatch(/if \(bits\.length === 0\) return null;/);
  });

  it("文案中英都在", () => {
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      for (const k of ["galaxy.hasBounties", "galaxy.hasStation", "galaxy.hasRift"]) {
        expect(
          seg.match(new RegExp(`"${k.replace(/\./g, "\\.")}": "([^"]*)"`))?.[1],
          `${lang} 缺少 ${k}`,
        ).toBeTruthy();
      }
    }
  });
});
