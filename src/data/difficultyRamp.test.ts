import { describe, expect, it } from "vitest";
import { GALAXIES, STORY_SCENES } from "../state/store";
import { ENCOUNTER_DEFS, BOUNTY_ENCOUNTER_DEFS } from "./encounters";
import { HULL_CLASSES } from "./hullClasses";
import { computeMaxHull } from "../engine/ships";
import { resolveAttack } from "../engine/combat";
import type { EncounterDef } from "./types";

/** 难度曲线的形状。生成器是 tools/genEnemyScale.py。
 *
 * 2026-08-31(/loop 第 22 轮)实测的病:敌人数值是各写各的,从来没对照过它被放在
 * 哪个星区。于是——
 *
 *     最重一击占玩家该阶段血量的比例
 *         威胁1  11.4%     威胁5  1.0%
 *         威胁2   5.1%     威胁6  1.0%
 *         威胁3   1.6%  ←  威胁7  0.7%
 *
 * 玩家耐久涨了约 190 倍,敌人伤害只涨了 7.3 倍。而威胁 3 的星区**全线弱于新手村**,
 * 却在地图上挂着三格危险条。
 *
 * 这几条测试钉的是形状,不是具体数字:曲线可以调,但不能再出现"更深的地方更安全"。 */

const byId = new Map<string, EncounterDef>(
  [...ENCOUNTER_DEFS, ...BOUNTY_ENCOUNTER_DEFS].map((e) => [e.id, e]),
);

/** 每个星区**实际能打到**的遭遇:POI 上挂的,加上剧情场景按 systemId 归区的。 */
function encountersByGalaxy(): { threat: number; id: string; defs: EncounterDef[] }[] {
  const sysGalaxy = new Map<string, string>();
  for (const g of GALAXIES) for (const s of g.systems) sysGalaxy.set(s.id, g.id);
  const ids: Record<string, Set<string>> = {};
  for (const g of GALAXIES) {
    ids[g.id] = new Set();
    for (const sys of g.systems) {
      for (const p of sys.pois) {
        const eid = (p.data as { encounterId?: string } | undefined)?.encounterId;
        if (eid) ids[g.id].add(eid);
      }
    }
  }
  for (const s of STORY_SCENES as { systemId?: string; startEncounter?: string }[]) {
    const gid = s.systemId ? sysGalaxy.get(s.systemId) : undefined;
    if (s.startEncounter && gid) ids[gid].add(s.startEncounter);
  }
  return GALAXIES.map((g) => ({
    threat: g.threat,
    id: g.id,
    defs: [...ids[g.id]].map((i) => byId.get(i)).filter((d): d is EncounterDef => !!d),
  })).sort((a, b) => a.threat - b.threat);
}

/** 玩家走到该威胁度时**预期**的血量。用舰级阶梯的解锁等级推,不手填。 */
function expectedHull(threat: number): number {
  const tier = Math.min(Math.max(threat - 1, 0), Math.max(...HULL_CLASSES.map((h) => h.order)));
  const classes = HULL_CLASSES.filter((h) => h.order === tier);
  return Math.max(
    ...classes.map((h) => computeMaxHull({ hullClass: h.id, rarity: "standard", level: Math.max(1, h.minLevel) })),
  );
}

function damages(row: { defs: EncounterDef[] }): number[] {
  return row.defs.flatMap((d) => d.enemies.map((e) => e.damage)).sort((a, b) => a - b);
}

/** 一次最重的攻击,在没有格挡的情况下打掉玩家血量的几分之几。 */
function worstHitFraction(row: { threat: number; defs: EncounterDef[] }): number {
  const worst = Math.max(...damages(row));
  return resolveAttack(worst, 0, 0, 1, 0.99, 0).damageDealt / expectedHull(row.threat);
}

/** **中位**一击的占比。这才是玩家一路上一直在挨的那个数——生成器控制的也是它。
 * 最重一击是本星区里那门攻城炮/那个 BOSS,按中位的 3 倍封顶,不参与"变强"的度量。 */
function typicalHitFraction(row: { threat: number; defs: EncounterDef[] }): number {
  const d = damages(row);
  return resolveAttack(d[Math.floor(d.length / 2)], 0, 0, 1, 0.99, 0).damageDealt / expectedHull(row.threat);
}

describe("难度必须随星区威胁上升", () => {
  const rows = encountersByGalaxy().filter((r) => r.defs.length > 0);

  it("有战斗内容的星区不止一个,否则下面几条都是空转", () => {
    expect(rows.length).toBeGreaterThan(4);
  });

  it("没有哪个星区比更安全的星区还弱", () => {
    // 这一条正是当初漏掉的:威胁 3 的伤害上限 16,低于新手村的 18。
    const offenders: string[] = [];
    for (let i = 1; i < rows.length; i++) {
      const cur = Math.max(...rows[i].defs.flatMap((d) => d.enemies.map((e) => e.damage)));
      const prev = Math.max(...rows[i - 1].defs.flatMap((d) => d.enemies.map((e) => e.damage)));
      if (cur < prev) offenders.push(`威胁${rows[i].threat} ${rows[i].id}(${cur}) < 威胁${rows[i - 1].threat}(${prev})`);
    }
    expect(offenders, `更危险的星区反而更弱——地图上的危险条在骗玩家:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("最重一击始终值得在意:占预期血量 3% 以上", () => {
    for (const r of rows) {
      const f = worstHitFraction(r);
      expect(
        f,
        `威胁${r.threat} ${r.id} 的最重一击只占预期血量 ${(f * 100).toFixed(2)}%——这个星区打不输`,
      ).toBeGreaterThan(0.03);
    }
  });

  it("但也不能一击接近致命:占比不超过 25%", () => {
    for (const r of rows) {
      const f = worstHitFraction(r);
      expect(f, `威胁${r.threat} ${r.id} 的最重一击占 ${(f * 100).toFixed(1)}%,四下就能打死玩家`).toBeLessThan(0.25);
    }
  });

  it("越往后越耐打,但幅度有限——变强要能被感觉到,又不能变成无敌", () => {
    const first = typicalHitFraction(rows[0]);
    const last = typicalHitFraction(rows[rows.length - 1]);
    expect(last, "终局的常规一击占比反而更高了,玩家一路变强的回报没兑现").toBeLessThan(first);
    expect(
      first / last,
      `从头到尾相对威胁掉了 ${(first / last).toFixed(1)} 倍——改前是 16 倍,那正是后期没有输的可能的原因`,
    ).toBeLessThan(4);
  });

  it("档与档之间不能出现难度尖刺", () => {
    // 第 22 轮按"最重一击"对齐,结果威胁3→4 的中位伤害跳了 ×3.59,而其余每档只有
    // 1.2–1.9×——图上拱起一段再回到趋势线,正是尖刺的形状。
    const steps: string[] = [];
    for (let i = 1; i < rows.length; i++) {
      const cur = damages(rows[i]);
      const prev = damages(rows[i - 1]);
      const step = cur[Math.floor(cur.length / 2)] / prev[Math.floor(prev.length / 2)];
      if (step > 3) steps.push(`威胁${rows[i - 1].threat}→${rows[i].threat} 中位伤害 ×${step.toFixed(2)}`);
    }
    expect(steps, `跨一个星区难度就翻三倍以上,玩家会撞墙:\n${steps.join("\n")}`).toEqual([]);
  });

  it("一个星区里最重的一击不能远离它的中位", () => {
    // 按中位对齐会把"中位和上限的差距"一起放大:威胁6 原本 19 对 101,放大后
    // 最重一击占预期血量 25%,一发抽掉四分之一。生成器按中位的 3 倍封顶。
    for (const r of rows) {
      const d = damages(r);
      const ratio = d[d.length - 1] / d[Math.floor(d.length / 2)];
      expect(ratio, `威胁${r.threat} ${r.id} 里最重的一击是中位的 ${ratio.toFixed(1)} 倍`).toBeLessThanOrEqual(3.05);
    }
  });
});
