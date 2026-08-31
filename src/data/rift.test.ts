import { describe, expect, it } from "vitest";
import { generateRiftWaveFull, riftWaveHaul, rollSourceSurge, RIFT_ANOMALIES, RIFT_ARCHETYPES } from "./rift";
import { t } from "../i18n/strings";
import { ENEMY_NAMES_ZH } from "../i18n/data/encounters";

// Player report (2026-08-25): "异空间每次应该不一样的对手和特殊奖励".
// The dive used to draw from three archetypes that differed only in their stat
// line, so every wave was the same fight with the numbers moved. These tests
// assert the variety is real rather than declared — the exact failure mode
// docs/content-depth-standards.md is about.
describe("rift wave generation", () => {
  it("produces genuinely different opponent line-ups at the same depth", () => {
    const comps = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const w = generateRiftWaveFull(5);
      comps.add(w.encounter.enemies.map((e) => e.name).sort().join("+"));
    }
    // Sixty dives at one depth should not keep serving the same line-up.
    expect(comps.size, "depth-5 dives keep producing the same roster").toBeGreaterThan(8);
  });

  it("changes which opponents exist at all as depth increases", () => {
    const namesAt = (depth: number) => {
      const s = new Set<string>();
      for (let i = 0; i < 80; i++) for (const e of generateRiftWaveFull(depth).encounter.enemies) s.add(e.name);
      return s;
    };
    const shallow = namesAt(1);
    const deep = namesAt(10);
    // Deep dives must field things a shallow dive simply cannot produce.
    const deepOnly = [...deep].filter((n) => !shallow.has(n));
    expect(deepOnly.length, "depth 10 fields nothing that depth 1 doesn't").toBeGreaterThan(2);
  });

  it("rolls a variety of anomalies, and every one it can roll is translated", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) seen.add(generateRiftWaveFull(8).anomaly);
    expect(seen.size, "deep dives are not being varied by anomalies").toBeGreaterThan(3);
    for (const a of RIFT_ANOMALIES) {
      if (a.id === "none") continue;
      // A rolled anomaly that renders as a raw key would be worse than none at all.
      expect(t(`rift.anomaly.${a.id}`)).not.toBe(`rift.anomaly.${a.id}`);
      expect(t(`rift.anomaly.${a.id}.desc`)).not.toBe(`rift.anomaly.${a.id}.desc`);
    }
  });

  // The i18n test in i18n/data/data.test.ts walks ENCOUNTER_DEFS, which cannot
  // reach a roster that only exists at runtime — nine of these shipped untranslated
  // for exactly that reason, and were only caught by looking at a live dive.
  it("every rift archetype the generator can field has a Chinese name", () => {
    const seen = new Set<string>();
    for (let depth = 1; depth <= 14; depth++) {
      for (let i = 0; i < 120; i++) {
        for (const e of generateRiftWaveFull(depth).encounter.enemies) seen.add(e.name);
      }
    }
    expect(seen.size, "generator is not fielding the whole roster").toBeGreaterThanOrEqual(12);
    for (const name of seen) {
      expect(ENEMY_NAMES_ZH[name], `rift enemy "${name}" has no Chinese name — it renders in English mid-dive`).toBeDefined();
    }
  });

  it("never generates an empty wave, at any depth", () => {
    for (let depth = 1; depth <= 15; depth++) {
      for (let i = 0; i < 30; i++) {
        expect(generateRiftWaveFull(depth).encounter.enemies.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps deeper waves harder overall despite the anomaly variance", () => {
    const power = (depth: number) => {
      let total = 0;
      const N = 120;
      for (let i = 0; i < N; i++) {
        for (const e of generateRiftWaveFull(depth).encounter.enemies) total += e.hull + e.damage * 10;
      }
      return total / N;
    };
    expect(power(8)).toBeGreaterThan(power(4));
    expect(power(4)).toBeGreaterThan(power(1));
  });
});

describe("源点获取倍率 (Source Point surge)", () => {
  it("only multiplies Source Points, never the rest of the haul", () => {
    const plain = riftWaveHaul(6, 1, 1);
    const surged = riftWaveHaul(6, 1, 100);
    // Proportional, not exactly equal: the surge is applied before rounding, so
    // round(x * 100) legitimately differs from round(x) * 100 by a little.
    expect(surged.sourcePoints! / plain.sourcePoints!).toBeCloseTo(100, 0);
    // A 100x roll must not also hand over 100x the ascension and alloy economies.
    expect(surged.alloy).toBe(plain.alloy);
    expect(surged.originEssence).toBe(plain.originEssence);
    expect(surged.salvage).toBe(plain.salvage);
  });

  it("cannot roll the rare high multipliers in the shallows", () => {
    for (let i = 0; i < 4000; i++) {
      expect(rollSourceSurge(1)).toBeLessThanOrEqual(3);
      expect(rollSourceSurge(2)).toBeLessThanOrEqual(3);
      // 100x is gated far deeper than 5x.
      expect(rollSourceSurge(5)).toBeLessThanOrEqual(5);
    }
  });

  it("does roll 3x, 5x and 100x at depth, in that order of rarity", () => {
    const counts: Record<number, number> = { 1: 0, 3: 0, 5: 0, 100: 0 };
    for (let i = 0; i < 400000; i++) counts[rollSourceSurge(8)]++;
    expect(counts[3]).toBeGreaterThan(0);
    expect(counts[5]).toBeGreaterThan(0);
    expect(counts[100]).toBeGreaterThan(0);
    expect(counts[3]).toBeGreaterThan(counts[5]);
    expect(counts[5]).toBeGreaterThan(counts[100]);
    // Still the exception, not the payout model: a 100x must stay rare enough
    // that a session cannot be planned around it (see rollSourceSurge's note on
    // why the first tuning pass was an economy off-switch).
    expect(counts[1]).toBeGreaterThan(counts[3]);
    expect(counts[100] / 400000).toBeLessThan(0.004);
  });
});

// 2026-08-31 量出来的(/loop 第 13 轮):最深的敌人原型出现在深度 7,最深的异常
// 出现在深度 5。**深度 7 之后裂隙不再出现任何新东西**——同一批原型和异常,
// 乘上 1.22^(深度-1)。而余烬刻印恰恰奖励往下潜,所以玩家被自己的收益推向那段
// 永远不变的内容。
//
// 搜到的原则:「不同深度要奖励不同的打法,而不只是数字变大」。
describe("往下潜要一直有新东西", () => {
  const deepestArchetype = Math.max(...RIFT_ARCHETYPES.map((a) => a.minDepth));
  const deepestAnomaly = Math.max(...RIFT_ANOMALIES.map((a) => a.minDepth));

  it("深潜的后半程仍在引入新内容", () => {
    // 刻印让玩家一路往 15、20 层去。如果 7 层之后什么都不变,那段就是纯刷。
    expect(deepestArchetype, `最深的原型只到第 ${deepestArchetype} 层`).toBeGreaterThanOrEqual(15);
    expect(deepestAnomaly, `最深的异常只到第 ${deepestAnomaly} 层`).toBeGreaterThanOrEqual(12);
  });

  it("每隔几层就有新东西,不会一次全开完", () => {
    const depths = [...new Set([
      ...RIFT_ARCHETYPES.map((a) => a.minDepth),
      ...RIFT_ANOMALIES.map((a) => a.minDepth),
    ])].sort((a, b) => a - b);
    for (let i = 1; i < depths.length; i++) {
      expect(depths[i] - depths[i - 1], `第 ${depths[i - 1]} 层到第 ${depths[i]} 层之间什么都没加`).toBeLessThanOrEqual(4);
    }
  });

  it("三种敌人角色在裂隙里都出现得到", () => {
    // 在补深层原型之前,裂隙里只有锚定和炮击——**没有任何修复单位**,
    // 于是"先打谁"在深潜里从来不是一个问题。
    const roles = new Set(RIFT_ARCHETYPES.map((a) => a.role).filter(Boolean));
    for (const r of ["mender", "anchor", "artillery"]) {
      expect(roles, `裂隙里没有任何「${r}」`).toContain(r);
    }
  });

  it("深层异常把编队形状推向两头,而不是又一档数值", () => {
    // "更硬一点"不是新玩法。深层异常必须在"少而巨大"和"多而脆弱"两个方向上
    // 都存在,玩家才需要为下潜单独配装。
    const deep = RIFT_ANOMALIES.filter((a) => a.minDepth >= 9);
    expect(deep.some((a) => a.budget < 0.7 && a.hull > 2), "没有「少而巨大」那一头").toBe(true);
    expect(deep.some((a) => a.budget > 2 && a.hull < 0.5), "没有「多而脆弱」那一头").toBe(true);
  });
});
