import { describe, expect, it } from "vitest";
import { applyEmberLoad, totalEmberLoad, emberLoadRewardMultiplier } from "./emberLoad";
import { ENCOUNTER_DEFS } from "./encounters";
import type { EncounterDef } from "./types";

// 样本改成自己构造,不再从 ENCOUNTER_DEFS 里挑。
//
// 原来挑的是"3 艘以上且没有角色"的遭遇。2026-08-30 给编队普遍分配角色之后,
// 这样的遭遇变成了 0 个,于是 find 返回 undefined,四条测试全部以
// "Cannot read properties of undefined" 挂掉——而它们测的是 applyEmberLoad 的
// 算法,跟roster 里恰好有没有这样一场戏毫无关系。测试的样本不该由内容数据决定。
const plain: EncounterDef = {
  id: "test-plain", name: "Test Formation", faction: "reavers", isBoss: false,
  enemies: [
    { name: "A", hull: 100, damage: 12, block: 4, evasion: 0.1 },
    { name: "B", hull: 100, damage: 12, block: 4, evasion: 0.1 },
    { name: "C", hull: 100, damage: 12, block: 4, evasion: 0.1 },
  ],
  rewards: { salvage: 50 }, xp: 30,
};
const solo: EncounterDef = {
  id: "test-solo", name: "Test Solo", faction: "reavers", isBoss: false,
  enemies: [{ name: "A", hull: 100, damage: 12, block: 4, evasion: 0.1 }],
  rewards: { salvage: 50 }, xp: 30,
};

// Core-loop redesign #3. Ascension only ever subtracted difficulty — the rift had
// depth scaling, the campaign had nothing, so the power curve ran away. Load is
// the counterweight, built out of systems that already exist so it adds no new
// combat plumbing.
describe("Ember Load", () => {
  it("changes nothing at all when there is no Load", () => {
    expect(applyEmberLoad(plain, 0)).toEqual(plain);
  });

  it("makes enemies tougher as Load climbs", () => {
    const power = (load: number) =>
      applyEmberLoad(plain, load).enemies.reduce((s, e) => s + e.hull + e.damage * 10, 0);
    expect(power(4)).toBeGreaterThan(power(0));
    expect(power(8)).toBeGreaterThan(power(4));
  });

  it("scales gently — the interesting part is the roles, not number inflation", () => {
    // A pure stat ramp is the failure mode this exists to avoid, not reproduce.
    const before = plain.enemies.reduce((s, e) => s + e.hull, 0);
    const after = applyEmberLoad(plain, 5).enemies.reduce((s, e) => s + e.hull, 0);
    expect(after / before).toBeLessThan(1.8);
  });

  it("escalates the single support role rather than stacking them", () => {
    // Caught a real design conflict when first written: the one-support rule
    // meant a mender added on top of an anchor silently never appeared. Load now
    // upgrades the one support instead — anchor first, then the strictly harder
    // mender — with artillery arriving separately on top.
    const rolesAt = (load: number) => applyEmberLoad(plain, load).enemies.map((e) => e.role).filter(Boolean);
    expect(rolesAt(1)).toContain("anchor");
    expect(rolesAt(1)).not.toContain("artillery");
    expect(rolesAt(3)).toContain("mender");
    expect(rolesAt(3)).not.toContain("anchor");
    expect(rolesAt(5)).toContain("artillery");
    expect(rolesAt(5)).toContain("mender");
  });

  it("never fields more than one support ship, matching the authored rule", () => {
    for (let load = 0; load <= 10; load++) {
      for (const enc of ENCOUNTER_DEFS) {
        const out = applyEmberLoad(enc, load);
        const support = out.enemies.filter((e) => e.role === "mender" || e.role === "anchor").length;
        expect(support, `${enc.id} at load ${load} fields ${support} support ships`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("never makes a formation entirely support", () => {
    for (let load = 0; load <= 10; load++) {
      for (const enc of ENCOUNTER_DEFS) {
        const out = applyEmberLoad(enc, load);
        const support = out.enemies.filter((e) => e.role === "mender" || e.role === "anchor").length;
        expect(support).toBeLessThan(out.enemies.length);
      }
    }
  });

  it("never gives a lone enemy an anchor role, which would armour nobody", () => {
    for (let load = 0; load <= 10; load++) {
      expect(applyEmberLoad(solo, load).enemies[0].role).not.toBe("anchor");
    }
  });

  it("leaves an encounter's own authored roles alone", () => {
    const authored = ENCOUNTER_DEFS.find((e) => e.enemies.some((x) => x.role === "mender"))!;
    const out = applyEmberLoad(authored, 8);
    const before = authored.enemies.map((e) => e.role);
    const after = out.enemies.slice(0, authored.enemies.length).map((e) => e.role);
    for (let i = 0; i < before.length; i++) {
      if (before[i]) expect(after[i], "an authored role was overwritten").toBe(before[i]);
    }
  });

  it("pays more for fighting under Load, but more slowly than it hurts", () => {
    // Raising Load has to stay a bet. If reward outran difficulty it would just
    // be a free-value slider.
    expect(emberLoadRewardMultiplier(0)).toBe(1);
    expect(emberLoadRewardMultiplier(5)).toBeGreaterThan(1);
    const rewardGrowth = emberLoadRewardMultiplier(8) / emberLoadRewardMultiplier(0);
    const powerGrowth =
      applyEmberLoad(plain, 8).enemies.reduce((s, e) => s + e.hull + e.damage * 10, 0) /
      plain.enemies.reduce((s, e) => s + e.hull + e.damage * 10, 0);
    expect(rewardGrowth).toBeLessThan(powerGrowth * 1.5);
  });

  it("counts ascensions and voluntary load together", () => {
    expect(totalEmberLoad(3, 2)).toBe(5);
    expect(totalEmberLoad(0, 0)).toBe(0);
    expect(totalEmberLoad(0, -5)).toBe(0);
  });

  it("never produces an empty or absurd formation at any Load", () => {
    for (let load = 0; load <= 10; load++) {
      for (const enc of ENCOUNTER_DEFS) {
        const out = applyEmberLoad(enc, load);
        expect(out.enemies.length).toBeGreaterThan(0);
        expect(out.enemies.length).toBeLessThanOrEqual(8);
        for (const e of out.enemies) {
          expect(e.hull).toBeGreaterThan(0);
          expect(e.damage).toBeGreaterThan(0);
        }
      }
    }
  });
});
