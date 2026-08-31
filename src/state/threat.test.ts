import { describe, expect, it, beforeEach } from "vitest";
import { regionThreatLoad, replaceState, GALAXIES } from "./store";
import { createInitialState } from "../engine/save";

/** 2026-08-31(/loop 第 21 轮)。「长大了就不再怕」这条规则原来不分老新地一律相减:
 *
 *     regionThreatLoad = max(0, (威胁-1) - (floor(等级/9) + 进阶次数))
 *
 * 于是 55 级玩家走进威胁 7 的合唱深域,拿到的负荷是 **0** —— 和新手村一模一样
 * (实测,战后报告「承受伤害 0」)。整个游戏最深的地方不该有被彻底走过头的那天。
 *
 * 现在留了一条随威胁升高的地板。这条测试钉住两头:老星区照旧会被走过头,
 * 前沿星区永远压着你一点。 */

function atLevel(level: number, systemId: string) {
  const base = createInitialState();
  const galaxy = GALAXIES.find((g) => g.systems.some((s) => s.id === systemId))!;
  expect(galaxy, `找不到 ${systemId} 所在的星区`).toBeTruthy();
  replaceState({
    ...base,
    currentSystemId: systemId,
    ships: base.ships.map((s, i) => (i === 0 ? { ...s, level } : s)),
  });
  return galaxy.threat;
}

const HOME = GALAXIES[0].systems[0].id;
const FRONTIER_GALAXY = GALAXIES.reduce((a, b) => (b.threat > a.threat ? b : a));
const FRONTIER = FRONTIER_GALAXY.systems[0].id;

describe("星区威胁不能被完全走过头", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("最高威胁的星区,再高的等级也还有负荷", () => {
    for (const level of [1, 20, 40, 55, 80, 200]) {
      atLevel(level, FRONTIER);
      expect(
        regionThreatLoad(),
        `${level} 级在威胁 ${FRONTIER_GALAXY.threat} 的星区拿到 0 负荷——游戏最深处对他没有任何威胁`,
      ).toBeGreaterThan(0);
    }
  });

  it("老星区照旧会被走过头——回头路过要感觉到自己变强了", () => {
    atLevel(60, HOME);
    expect(regionThreatLoad(), "起始星区在高等级下应当归零").toBe(0);
  });

  it("低等级时行为不变:负荷仍然等于威胁差", () => {
    const threat = atLevel(1, FRONTIER);
    expect(regionThreatLoad()).toBe(threat - 1);
  });

  it("负荷随星区威胁单调不减", () => {
    const loads = GALAXIES.map((g) => {
      atLevel(55, g.systems[0].id);
      return { id: g.id, threat: g.threat, load: regionThreatLoad() };
    });
    const sorted = [...loads].sort((a, b) => a.threat - b.threat);
    for (let i = 1; i < sorted.length; i++) {
      expect(
        sorted[i].load,
        `${sorted[i].id}(威胁 ${sorted[i].threat})的负荷比更安全的 ${sorted[i - 1].id} 还低`,
      ).toBeGreaterThanOrEqual(sorted[i - 1].load);
    }
  });
});
