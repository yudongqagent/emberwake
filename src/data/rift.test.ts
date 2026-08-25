import { describe, expect, it } from "vitest";
import { generateRiftWaveFull, riftWaveHaul, rollSourceSurge, RIFT_ANOMALIES } from "./rift";
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
