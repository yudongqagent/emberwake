import { describe, expect, it } from "vitest";
import { MODULE_DEFS } from "./modules";
import { MODULE_EFFECTS } from "./moduleEffects";
import { rangeProfileMultiplier, powerStrainMultiplier, POWER_STRAIN_CAP, TURN_SECONDS, AUTO_FIRE_MIN_INTERVAL } from "../engine/combat";
import type { ModuleDef, ModuleRarity } from "./types";
import { HULL_CLASSES } from "./hullClasses";

const TIERS: ModuleRarity[] = ["mk1", "mk2", "mk3", "mk4", "mk5"];
const RARITY_MULT: Record<ModuleRarity, number> = { mk1: 1.0, mk2: 1.32, mk3: 1.74, mk4: 2.3, mk5: 3.04 };

const WEAPONS = MODULE_DEFS.filter((m) => m.type === "weapon");

/** Sustained DPS at instance-rarity == baseRarity, level 1, neutral quality —
 * the same figure the audit measured. */
function dps(def: ModuleDef): number {
  const interval = Math.max(AUTO_FIRE_MIN_INTERVAL, (def.cooldown ?? 0) * TURN_SECONDS);
  return ((def.baseDamage ?? 0) * RARITY_MULT[def.baseRarity]) / interval;
}

// Every assertion here corresponds to a numbered finding in
// docs/weapon-system-audit.md. They exist because all of these were true of the
// shipped roster and none of them were caught by anything.
describe("weapon roster", () => {
  it("has a strictly monotonic DPS budget across tiers (audit #2)", () => {
    // The bug: mk3 did 22.5 sustained DPS and mk4 did 22.0, because cooldown
    // doubled while damage only rose 1.32x. A fresh mk4 drop was WORSE than the
    // mk3 already in your hold.
    const perTier = TIERS.map((t) => {
      const of = WEAPONS.filter((w) => w.baseRarity === t);
      return { tier: t, avg: of.reduce((s, w) => s + dps(w), 0) / of.length };
    });
    for (let i = 1; i < perTier.length; i++) {
      expect(
        perTier[i].avg,
        `${perTier[i].tier} (${perTier[i].avg.toFixed(1)} DPS) is not an upgrade over ${perTier[i - 1].tier} (${perTier[i - 1].avg.toFixed(1)} DPS)`,
      ).toBeGreaterThan(perTier[i - 1].avg);
    }
  });

  it("gives weapons in the same tier genuinely different stat lines (audit #1)", () => {
    // The bug: measured DPS spread within every tier was exactly 1.00x — all ten
    // mk3 weapons were 31 damage / cooldown 1 / power 2, whatever built them.
    for (const t of TIERS) {
      const of = WEAPONS.filter((w) => w.baseRarity === t);
      const lines = new Set(of.map((w) => `${w.baseDamage}/${w.cooldown}/${w.powerDraw}`));
      expect(lines.size, `every ${t} weapon shares one stat line`).toBeGreaterThanOrEqual(6);
    }
  });

  it("keeps same-tier weapons close in value despite differing wildly in shape", () => {
    // Variety must not become imbalance: a tier's weapons should feel different
    // and be worth roughly the same.
    for (const t of TIERS) {
      const vals = WEAPONS.filter((w) => w.baseRarity === t).map(dps);
      const spread = Math.max(...vals) / Math.min(...vals);
      expect(spread, `${t} DPS spread is ${spread.toFixed(2)}x — one family is strictly better`).toBeLessThan(1.35);
    }
  });

  it("offers a real cadence axis rather than one pinned to tier (audit #4)", () => {
    // The bug: exactly three cooldown values existed (0, 1, 2) and each was
    // perfectly correlated with rarity, so "fast weak vs slow heavy" could not be
    // expressed at all.
    const cadences = new Set(WEAPONS.map((w) => w.cooldown));
    expect(cadences.size, "cooldown is still effectively a synonym for tier").toBeGreaterThanOrEqual(8);
    // And within a single tier there must be both fast and slow options.
    for (const t of TIERS) {
      const cds = WEAPONS.filter((w) => w.baseRarity === t).map((w) => w.cooldown ?? 0);
      expect(Math.max(...cds) / Math.max(0.01, Math.min(...cds))).toBeGreaterThan(3);
    }
  });

  it("never ships a weapon whose cadence the auto-fire floor would override (audit #5)", () => {
    // The bug: all ten mk1s declared cooldown 0 and then fired every 1.6s, so the
    // card and the game disagreed.
    for (const w of WEAPONS) {
      const declared = (w.cooldown ?? 0) * TURN_SECONDS;
      expect(
        declared,
        `${w.id} declares ${declared.toFixed(2)}s but the floor would force ${AUTO_FIRE_MIN_INTERVAL}s`,
      ).toBeGreaterThanOrEqual(AUTO_FIRE_MIN_INTERVAL);
    }
  });

  it("varies trait pools by family instead of sharing one (audit #6)", () => {
    // The bug: 43 of 50 weapons shared ["crit","pierce","execute","surge"], and
    // only 5 distinct traits appeared across the entire roster.
    const pools = new Set(WEAPONS.map((w) => [...w.traitPool].sort().join(",")));
    expect(pools.size, "weapons still share a single trait pool").toBeGreaterThanOrEqual(10);
    const distinct = new Set(WEAPONS.flatMap((w) => w.traitPool));
    expect(distinct.size, "the rolled-variance vocabulary is still tiny").toBeGreaterThanOrEqual(20);
  });

  it("gives each family five distinct signatures, one per tier (audit #7)", () => {
    // The bug: families reused signatures, so tier 1 and tier 3 of a family were
    // the same weapon with bigger numbers.
    const byFamily = new Map<string, ModuleDef[]>();
    for (const w of WEAPONS) {
      byFamily.set(w.family, [...(byFamily.get(w.family) ?? []), w]);
    }
    for (const [fam, list] of byFamily) {
      const sigs = new Set(list.map((w) => w.signature));
      expect(sigs.size, `family "${fam}" reuses signatures across its tiers: ${list.map((w) => w.signature).join(", ")}`).toBe(list.length);
    }
  });

  it("spreads signatures across much more of the effect vocabulary (audit #8)", () => {
    const sigs = new Set(WEAPONS.map((w) => w.signature));
    expect(sigs.size, "weapons still express only a narrow slice of the effect registry").toBeGreaterThanOrEqual(30);
  });

  it("every signature and pooled trait is a real implemented effect", () => {
    const known = new Set(MODULE_EFFECTS.map((e) => e.id));
    for (const w of WEAPONS) {
      expect(known.has(w.signature), `${w.id}: signature "${w.signature}" is not implemented`).toBe(true);
      for (const t of w.traitPool) {
        expect(known.has(t), `${w.id}: trait "${t}" is not implemented`).toBe(true);
      }
    }
  });

  it("gives every weapon a range identity (audit #9)", () => {
    for (const w of WEAPONS) {
      expect(w.rangeProfile, `${w.id} has no range profile`).toBeDefined();
    }
    const profiles = new Set(WEAPONS.map((w) => w.rangeProfile));
    expect(profiles.size, "every weapon prefers the same range").toBeGreaterThanOrEqual(3);
  });

  it("never lets a weapon's signature also sit in its own rolled pool", () => {
    // Rolling the effect you already have as a signature is a dead roll.
    for (const w of WEAPONS) {
      expect(w.traitPool, `${w.id} can roll its own signature "${w.signature}"`).not.toContain(w.signature);
    }
  });
});

describe("range profiles", () => {
  it("rewards the band a weapon prefers and punishes the opposite one", () => {
    expect(rangeProfileMultiplier("close", "close")).toBeGreaterThan(1);
    expect(rangeProfileMultiplier("close", "long")).toBeLessThan(1);
    expect(rangeProfileMultiplier("long", "long")).toBeGreaterThan(1);
    expect(rangeProfileMultiplier("long", "close")).toBeLessThan(1);
  });

  it("treats the adjacent band as neutral, not a penalty", () => {
    expect(rangeProfileMultiplier("close", "mid")).toBe(1);
    expect(rangeProfileMultiplier("long", "mid")).toBe(1);
  });

  it("leaves flat and unset weapons unaffected at every range", () => {
    for (const band of ["close", "mid", "long"] as const) {
      expect(rangeProfileMultiplier("flat", band)).toBe(1);
      expect(rangeProfileMultiplier(undefined, band)).toBe(1);
    }
  });
});

describe("power strain (audit #3)", () => {
  it("costs nothing at or under capacity", () => {
    expect(powerStrainMultiplier(10, 20)).toBe(1);
    expect(powerStrainMultiplier(20, 20)).toBe(1);
  });

  it("stretches weapon cooldowns in proportion to the overdraw", () => {
    const mild = powerStrainMultiplier(22, 20);
    const bad = powerStrainMultiplier(30, 20);
    expect(mild).toBeGreaterThan(1);
    expect(bad).toBeGreaterThan(mild);
  });

  it("is capped, so a wildly overdrawn fit is bad rather than bricked", () => {
    expect(powerStrainMultiplier(10_000, 20)).toBe(POWER_STRAIN_CAP);
  });

  it("is safe when a ship somehow reports no capacity", () => {
    expect(powerStrainMultiplier(5, 0)).toBe(1);
  });
});

describe("power budget is actually affordable (audit #3 follow-through)", () => {
  it("lets a full same-tier loadout fit on every hull", () => {
    // Making power real is only an improvement if a sensible fit is legal.
    // Notably this was NOT true before: a corvette had 6 capacity and three
    // non-weapon mk3 modules alone drew 6, so a full fit was already impossible.
    // Nobody noticed because power did nothing.
    const avg = (type: string, rarity: ModuleRarity) => {
      const of = MODULE_DEFS.filter((m) => m.type === type && m.baseRarity === rarity);
      return of.length ? of.reduce((s, m) => s + m.powerDraw, 0) / of.length : 0;
    };
    for (const hull of HULL_CLASSES) {
      for (const tier of TIERS) {
        const draw =
          hull.slots.weapon * avg("weapon", tier) +
          hull.slots.armor * avg("armor", tier) +
          hull.slots.engine * avg("engine", tier) +
          hull.slots.utility * avg("utility", tier);
        const capacity = hull.basePower;
        // Only the tier a hull would plausibly run needs to fit; a corvette
        // stuffed with mk5 gear SHOULD brown out.
        if (tier === "mk1" || tier === "mk3") {
          expect(
            draw / capacity,
            `${hull.id} cannot fit a full ${tier} loadout: ${draw.toFixed(1)} draw vs ${capacity} capacity`,
          ).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("still punishes over-teching a small hull", () => {
    // The budget has to bite somewhere or it's decoration again.
    const corvette = HULL_CLASSES.find((h) => h.id === "corvette")!;
    const mk5Weapon = MODULE_DEFS.filter((m) => m.type === "weapon" && m.baseRarity === "mk5");
    const avgMk5 = mk5Weapon.reduce((s, m) => s + m.powerDraw, 0) / mk5Weapon.length;
    const draw = corvette.slots.weapon * avgMk5 + (corvette.slots.armor + corvette.slots.engine + corvette.slots.utility) * 3;
    expect(draw).toBeGreaterThan(corvette.basePower);
  });

  it("holds Ember Nova steady at the mid-game reference despite the capacity change", () => {
    // Capacity had to rise for a full fit to be legal, and Nova scales off it, so
    // the coefficient came down to compensate. It cannot hold for every hull —
    // capacity rose 83% on a corvette and 12.5% on a battleship — so the contract
    // is: unchanged in the mid-game, and never a large swing at the top end.
    const NEW_COEFF = 1.33, OLD_COEFF = 1.5;
    const battleship = HULL_CLASSES.find((h) => h.id === "battleship")!;
    expect(Math.abs(battleship.basePower * NEW_COEFF - 32 * OLD_COEFF) / (32 * OLD_COEFF)).toBeLessThan(0.05);
    const sovereign = HULL_CLASSES.find((h) => h.id === "sovereign")!;
    expect(Math.abs(sovereign.basePower * NEW_COEFF - 60 * OLD_COEFF) / (60 * OLD_COEFF)).toBeLessThan(0.1);
  });
});

describe("the power budget stays live across the whole progression", () => {
  const avg = (type: string, rarity: ModuleRarity) => {
    const of = MODULE_DEFS.filter((m) => m.type === type && m.baseRarity === rarity);
    return of.length ? of.reduce((s, m) => s + m.powerDraw, 0) / of.length : 0;
  };
  const fullFit = (hull: typeof HULL_CLASSES[number], tier: ModuleRarity) =>
    hull.slots.weapon * avg("weapon", tier) +
    hull.slots.armor * avg("armor", tier) +
    hull.slots.engine * avg("engine", tier) +
    hull.slots.utility * avg("utility", tier);

  it("never lets capacity outrun a full fit by an order of magnitude", () => {
    // The real defect behind audit #3: capacity multiplied by rarity, level AND
    // the power roll, so one battleship ranged from 36 to 407 capacity while
    // module draw stayed flat. Power couldn't constrain anything a few levels in,
    // which is why nobody ever saw the overdraw warning.
    for (const hull of HULL_CLASSES) {
      for (const level of [1, 10, 20, 40]) {
        const capacity = Math.round(hull.basePower * (1 + (level - 1) * 0.04));
        const fit = fullFit(hull, "mk5");
        expect(
          capacity / Math.max(1, fit),
          `${hull.id} at level ${level}: capacity ${capacity} vs a full mk5 fit of ${fit.toFixed(0)} — the budget is decorative again`,
        ).toBeLessThan(3);
      }
    }
  });

  it("makes a top-tier fit something you ascend into rather than level into", () => {
    // A mid hull should NOT be able to run a full mk5 loadout; a late hull should.
    const battleship = HULL_CLASSES.find((h) => h.id === "battleship")!;
    const sanctum = HULL_CLASSES.find((h) => h.id === "sanctum")!;
    expect(fullFit(battleship, "mk5")).toBeGreaterThan(battleship.basePower);
    expect(fullFit(sanctum, "mk5") / Math.round(sanctum.basePower * (1 + 19 * 0.04))).toBeLessThan(1.05);
  });
});
