import { describe, expect, it } from "vitest";
import { qualityMultiplier, drawModule, riftDropRarityFloor, moduleMaxLevel, moduleUpgradeCost, isModuleMaxed, levelUpModule, computeModuleDamage, effectPotency, computeModuleEvasion, computeModuleThrust } from "./modules";
import { MODULE_DEFS } from "../data/moduleDefs";
import type { ModuleInstance } from "../data/types";
import { MODULE_RARITY_ORDER, MODULE_RARITY_MULTIPLIER, MARKET_MAX_RARITY, fabricatorCost, moduleDefById } from "../data/modules";
import { createInitialState, migrateForTest } from "./save";

// Player-Tested Anti-Patterns #6 (docs/design-principles.md): tier gaps must be
// verified, not assumed. A worst-roll module of tier N+1 must always beat a
// best-roll module of tier N, or the rarity ladder doesn't actually mean anything in
// practice — this exact overlap was the real bug a 2026-08-23 player playtest caught.
describe("module rarity tier gaps (no overlap between adjacent tiers)", () => {
  it("a worst-roll module of the next rarity always beats a best-roll module of this one", () => {
    for (let i = 0; i < MODULE_RARITY_ORDER.length - 1; i++) {
      const lo = MODULE_RARITY_ORDER[i];
      const hi = MODULE_RARITY_ORDER[i + 1];
      const loBest = MODULE_RARITY_MULTIPLIER[lo] * qualityMultiplier(1);
      const hiWorst = MODULE_RARITY_MULTIPLIER[hi] * qualityMultiplier(0);
      expect(hiWorst, `${hi} (worst roll) should exceed ${lo} (best roll)`).toBeGreaterThan(loBest);
    }
  });
});

// Section B (2026-08-24 player brief): "市场上买的模组应该要么品质一般，要么非常
// 贵；真正稀有的模组应该来自异空间战场". Two invariants worth guarding, because
// both are the kind of rule a future call site breaks silently:
//   1. no purchasable/ordinary source ever yields mk4+
//   2. the rift's depth floor actually delivers top tier
describe("module economy sourcing (section B)", () => {
  it("the market ceiling never yields a top-tier module, over many draws", () => {
    const topTier = new Set(["mk4", "mk5"]);
    for (let i = 0; i < 800; i++) {
      const m = drawModule(undefined, { maxRarity: MARKET_MAX_RARITY });
      expect(topTier.has(m.rarity), `market draw produced ${m.rarity}, which must be rift-only`).toBe(false);
    }
  });

  it("the rift floor rises with depth and reaches the top tiers", () => {
    expect(riftDropRarityFloor(1)).toBe("mk2");
    expect(riftDropRarityFloor(2)).toBe("mk3");
    expect(riftDropRarityFloor(4)).toBe("mk4");
    expect(riftDropRarityFloor(7)).toBe("mk5");
  });

  it("a deep rift run always drops at or above its floor", () => {
    for (let i = 0; i < 400; i++) {
      const m = drawModule(undefined, { minRarity: riftDropRarityFloor(7) });
      expect(m.rarity, "a depth-7 rift drop must be mk5").toBe("mk5");
    }
    for (let i = 0; i < 400; i++) {
      const m = drawModule(undefined, { minRarity: riftDropRarityFloor(4) });
      expect(["mk4", "mk5"]).toContain(m.rarity);
    }
  });

  it("market pricing is non-linear — each tier costs much more than the last power step justifies", () => {
    const order = ["mk1", "mk2", "mk3"] as const;
    for (let i = 0; i < order.length - 1; i++) {
      const priceRatio = fabricatorCost(order[i + 1]) / fabricatorCost(order[i]);
      const powerRatio = MODULE_RARITY_MULTIPLIER[order[i + 1]] / MODULE_RARITY_MULTIPLIER[order[i]];
      expect(
        priceRatio,
        `${order[i]}→${order[i + 1]}: price should climb faster than power (a market shortcut must be a real sacrifice)`,
      ).toBeGreaterThan(powerRatio * 1.5);
    }
  });
});

// Module leveling was specified in docs/systems-design.md ("Level: upgraded with
// Alloy, independent of Rarity") but levelUpModule had NO callers — every module
// sat at level 1 forever and the +12%/level term in computeModuleDamage never
// fired. Wired up 2026-08-24; these guard the rules it now runs on.
describe("module upgrading", () => {
  const mk = (rarity: "mk1" | "mk3" | "mk5", level = 1) => ({
    id: "m", defId: "bauhiniaWeapon1", rarity, level, traits: [], lockedTraitSlot: null, quality: 0.5,
  });

  it("the level cap rises with rarity, so rarity buys investment headroom", () => {
    expect(moduleMaxLevel("mk1")).toBeLessThan(moduleMaxLevel("mk3"));
    expect(moduleMaxLevel("mk3")).toBeLessThan(moduleMaxLevel("mk5"));
  });

  it("leveling actually raises the module's real damage output", () => {
    const base = mk("mk3", 1);
    const leveled = levelUpModule(base);
    expect(leveled.level).toBe(2);
    expect(computeModuleDamage(leveled)).toBeGreaterThan(computeModuleDamage(base));
  });

  it("never levels past the rarity cap", () => {
    let m = mk("mk1", 1);
    for (let i = 0; i < 50; i++) m = levelUpModule(m) as typeof m;
    expect(m.level).toBe(moduleMaxLevel("mk1"));
    expect(isModuleMaxed(m)).toBe(true);
  });

  it("upgrade cost climbs with each level and with rarity", () => {
    expect(moduleUpgradeCost(mk("mk3", 2))).toBeGreaterThan(moduleUpgradeCost(mk("mk3", 1)));
    expect(moduleUpgradeCost(mk("mk5", 3))).toBeGreaterThan(moduleUpgradeCost(mk("mk1", 3)));
  });
});

// A save's starting loadout references module ids by string. When the roster was
// replaced wholesale those ids silently pointed at nothing — moduleDefById throws,
// so a brand-new game would have crashed on first load. Nothing else covered it.
describe("starting loadout integrity", () => {
  it("every module id a new save creates actually exists in the roster", () => {
    const state = createInitialState();
    for (const m of state.modules) {
      expect(() => moduleDefById(m.defId), `starting module "${m.defId}" is not in the roster`).not.toThrow();
    }
    expect(state.modules.length).toBeGreaterThan(0);
  });
});

// Existing saves referenced the retired 17-module roster by string id, and
// moduleDefById THROWS on an unknown id — so without a remap every pre-existing
// save would hard-crash on load. This checks the migration actually produces ids
// the current roster knows.
describe("legacy module id migration (schema 6 -> 7)", () => {
  it("remaps every retired module id onto a real module in the current roster", () => {
    const legacy = ["pulseCannon","arcLance","railgun","flakBattery","ionDisruptor","twinLinkedCannon",
      "plateBarrier","reactiveMesh","ablativePlating","kineticReflector",
      "thrusterArray","vectorDrive","inertialDampers",
      "empBurst","salvageDrone","purgeField","displacementCharge"];
    const rarities = ["mk1","mk2","mk3","mk4","mk5"] as const;
    for (const defId of legacy) {
      for (const rarity of rarities) {
        const save: any = {
          schemaVersion: 6, resources: {}, flags: {}, ships: [], crew: [],
          flagshipId: null, currentSystemId: "amaranthBelt", poiState: {},
          capturedShips: [], alliedShips: [],
          modules: [{ id: "x", defId, rarity, level: 3, traits: ["crit"], lockedTraitSlot: null, quality: 0.5 }],
        };
        const out = migrateForTest(save);
        const migrated = out.modules[0];
        expect(() => moduleDefById(migrated.defId), `${defId}/${rarity} -> "${migrated.defId}" is not a real module`).not.toThrow();
        expect(moduleDefById(migrated.defId).baseRarity, `${defId}/${rarity} should keep its tier`).toBe(rarity);
        expect(migrated.level, "level must be preserved — it's paid-for progress").toBe(3);
      }
    }
  });
});

// docs/module-system-audit-round2.md #11/#12/#13。这三条是同一个根因:效果强度
// 完全不看稀有度、等级、品质,所以引擎(唯一一种没有数值的模组)升级等于白花钱,
// 而 mk5 引擎因为耗电更多,严格劣于 mk1。
describe("效果强度会随投资增长", () => {
  const mod = (over: Partial<ModuleInstance> = {}): ModuleInstance => ({
    id: "m", defId: MODULE_DEFS.find((d) => d.type === "engine")!.id,
    rarity: "mk1", level: 1, traits: [], lockedTraitSlot: null, quality: 0.5, ...over,
  });

  it("升级一件模组会让它的效果更强——这正是从前完全不成立的那条", () => {
    const l1 = effectPotency(mod({ level: 1 }));
    const l5 = effectPotency(mod({ level: 5 }));
    expect(l5).toBeGreaterThan(l1);
  });

  it("高稀有度的效果更强,所以 mk5 引擎不再严格劣于 mk1", () => {
    expect(effectPotency(mod({ rarity: "mk5" }))).toBeGreaterThan(effectPotency(mod({ rarity: "mk1" })));
  });

  it("品质也算数", () => {
    expect(effectPotency(mod({ quality: 1 }))).toBeGreaterThan(effectPotency(mod({ quality: 0 })));
  });

  it("曲线刻意比伤害缓——满级 mk5 大约 2.4 倍,不是 5.5 倍", () => {
    // 效果里有一半是几率和减免,乘 5.5 会直接把上限顶穿。
    const best = effectPotency(mod({ rarity: "mk5", level: 13, quality: 1 }));
    expect(best).toBeGreaterThan(2.2);
    expect(best).toBeLessThan(2.7);
  });

  it("引擎现在有真的数值了", () => {
    // 审计当时:50 件引擎,0 件有数值。
    const engines = MODULE_DEFS.filter((d) => d.type === "engine");
    for (const d of engines) {
      expect(
        d.baseEvasion !== undefined || d.baseThrust !== undefined,
        `引擎 "${d.id}" 仍然没有任何数值,升级它等于白花合金`,
      ).toBe(true);
    }
  });

  it("装备的闪避和推力也随投资增长", () => {
    const e = MODULE_DEFS.find((d) => d.type === "engine" && (d.baseEvasion ?? 0) > 0)!;
    const lo = { ...mod({ defId: e.id }), rarity: "mk1" as const, level: 1 };
    const hi = { ...mod({ defId: e.id }), rarity: "mk5" as const, level: 13 };
    expect(computeModuleEvasion(hi)).toBeGreaterThan(computeModuleEvasion(lo));
  });

  it("重甲的拖累不会因为升级而变得更重", () => {
    // 否则投资一件重甲等于惩罚自己,那没人会升级它。
    const heavy = MODULE_DEFS.find((d) => d.type === "armor" && (d.baseThrust ?? 0) < 0)!;
    const lo = { ...mod({ defId: heavy.id }), rarity: "mk1" as const, level: 1 };
    const hi = { ...mod({ defId: heavy.id }), rarity: "mk5" as const, level: 13 };
    expect(computeModuleThrust(hi)).toBe(computeModuleThrust(lo));
  });

  it("单件装备不该一个人就顶满推力上限", () => {
    // 实测抓到的:第一版按稀有度倍率(3.04x)放大推力,一件 mk5 掠夺者轻甲单独
    // 给出 +52%,而总上限是 +60%——一件就顶满,后面所有推力设计当场作废。
    // 界限定在总上限的四成:任何一件东西都不该单独决定这条轴。
    const light = MODULE_DEFS.filter((d) => (d.baseThrust ?? 0) > 0);
    for (const d of light) {
      const best: ModuleInstance = {
        id: "m", defId: d.id, rarity: "mk5", level: 13, traits: [], lockedTraitSlot: null, quality: 1,
      };
      expect(computeModuleThrust(best), `${d.id} 单件推力 ${computeModuleThrust(best)}`).toBeLessThan(0.25);
    }
  });
});
