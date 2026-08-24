import { describe, expect, it } from "vitest";
import { computeMaxHull, computePowerCapacity, computeSpeed, computeBaseEvasion, computeBaseCritChance, xpToNextLevel, applyXp, qualityMultiplier, canAscend, ascendShip } from "./ships";
import { HULL_CLASSES, RARITY_ORDER, RARITY_MULTIPLIER } from "../data/hullClasses";
import type { ShipInstance } from "../data/types";

function makeShip(overrides: Partial<ShipInstance> = {}): ShipInstance {
  return {
    id: "test",
    hullClass: "corvette",
    rarity: "salvage",
    aptitude: "B",
    scanned: true,
    name: "Test Ship",
    level: 1,
    xp: 0,
    equipped: [null, null, null, null],
    currentHp: 120,
    rolls: { hull: 0.5, power: 0.5, speed: 0.5, evasion: 0.5, crit: 0.5 },
    ascendedFrom: [],
    ...overrides,
  };
}

describe("computeMaxHull", () => {
  it("matches the corvette base hull at level 1, Salvage rarity", () => {
    expect(computeMaxHull(makeShip())).toBe(120);
  });

  it("scales up with higher rarity", () => {
    const salvage = computeMaxHull(makeShip({ rarity: "salvage" }));
    const ascendant = computeMaxHull(makeShip({ rarity: "ascendant" }));
    expect(ascendant).toBeGreaterThan(salvage);
  });

  it("grows with level", () => {
    const level1 = computeMaxHull(makeShip({ level: 1 }));
    const level5 = computeMaxHull(makeShip({ level: 5 }));
    expect(level5).toBeGreaterThan(level1);
  });
});

describe("computePowerCapacity", () => {
  // Issue #1 (2026-08 playtest): leveling used to only grow max hull — power capacity
  // never moved, so most of a level-up did nothing you could feel. Now grows at the
  // same +8%/level rate as hull (docs/design-principles.md's own "how to check" for
  // this class of thing: does skipping the mechanic change anything real?).
  it("grows with level at the same rate as max hull, not just hull class and rarity", () => {
    const a = computePowerCapacity(makeShip({ level: 1 }));
    const b = computePowerCapacity(makeShip({ level: 10 }));
    expect(b).toBeGreaterThan(a);
  });

  it("defaults to no level bonus when level is omitted, for partial-ship callers", () => {
    const withLevel1 = computePowerCapacity(makeShip({ level: 1 }));
    const withoutLevel = computePowerCapacity({ hullClass: "corvette", rarity: "salvage", rolls: makeShip().rolls });
    expect(withoutLevel).toBe(withLevel1);
  });
});

describe("attribute rolls", () => {
  it("a neutral 0.5 roll leaves max hull unchanged from the un-rolled baseline", () => {
    expect(computeMaxHull(makeShip({ rolls: { hull: 0.5, power: 0.5, speed: 0.5, evasion: 0.5, crit: 0.5 } }))).toBe(120);
  });

  it("hull roll of 0 gives 88% and 1 gives 112% of the neutral value", () => {
    const low = computeMaxHull(makeShip({ rolls: { hull: 0, power: 0.5, speed: 0.5, evasion: 0.5, crit: 0.5 } }));
    const high = computeMaxHull(makeShip({ rolls: { hull: 1, power: 0.5, speed: 0.5, evasion: 0.5, crit: 0.5 } }));
    expect(low).toBe(106); // 120 * 0.88
    expect(high).toBe(134); // 120 * 1.12
  });

  it("two ships of the same rarity can roll differently — itemization variance is real", () => {
    const a = computeMaxHull(makeShip({ rolls: { hull: 0.1, power: 0.5, speed: 0.5, evasion: 0.5, crit: 0.5 } }));
    const b = computeMaxHull(makeShip({ rolls: { hull: 0.9, power: 0.5, speed: 0.5, evasion: 0.5, crit: 0.5 } }));
    expect(a).not.toBe(b);
  });

  // Replaces an older test that asserted the OPPOSITE ("bigger hull classes move
  // slower"). That was the pre-2026-08-24 design, and it's exactly the stat
  // regression the player reported: ascending into a bigger hull made Whisper
  // slower. Bigger hulls are now never slower — the lateral tradeoff at a tier is
  // which stat grows more, not which one shrinks.
  it("a bigger hull class is never slower than a smaller one at the same speed roll", () => {
    const neutral = { hull: 0.5, power: 0.5, speed: 0.5, evasion: 0.5, crit: 0.5 };
    const corvette = computeSpeed(makeShip({ hullClass: "corvette", rolls: neutral }));
    const sovereign = computeSpeed(makeShip({ hullClass: "sovereign", rolls: neutral }));
    expect(sovereign).toBeGreaterThanOrEqual(corvette);
  });

  it("base evasion and crit chance scale with their own rolls", () => {
    expect(computeBaseEvasion({ rolls: { hull: 0.5, power: 0.5, speed: 0.5, evasion: 0, crit: 0.5 } })).toBe(0);
    expect(computeBaseEvasion({ rolls: { hull: 0.5, power: 0.5, speed: 0.5, evasion: 1, crit: 0.5 } })).toBeCloseTo(0.1);
    expect(computeBaseCritChance({ rolls: { hull: 0.5, power: 0.5, speed: 0.5, evasion: 0.5, crit: 1 } })).toBeCloseTo(0.08);
  });
});

describe("xpToNextLevel / applyXp", () => {
  it("does not level up below the threshold", () => {
    const ship = makeShip({ level: 1, xp: 0 });
    const leveled = applyXp(ship, xpToNextLevel(1) - 1);
    expect(leveled.level).toBe(1);
  });

  it("levels up exactly at the threshold", () => {
    const ship = makeShip({ level: 1, xp: 0 });
    const leveled = applyXp(ship, xpToNextLevel(1));
    expect(leveled.level).toBe(2);
    expect(leveled.xp).toBe(0);
  });

  it("carries over remainder xp across multiple level-ups", () => {
    const ship = makeShip({ level: 1, xp: 0 });
    const totalXp = xpToNextLevel(1) + xpToNextLevel(2) + 10;
    const leveled = applyXp(ship, totalXp);
    expect(leveled.level).toBe(3);
    expect(leveled.xp).toBe(10);
  });

  it("never reduces current hp when leveling up", () => {
    const ship = makeShip({ level: 1, xp: 0, currentHp: 120 });
    const leveled = applyXp(ship, xpToNextLevel(1));
    expect(leveled.currentHp).toBeGreaterThanOrEqual(120);
  });
});

// Player-Tested Anti-Patterns #6 (docs/design-principles.md): tier gaps must be
// verified, not assumed. A worst-roll ship of tier N+1 must always beat a best-roll
// ship of tier N, or the rarity ladder doesn't actually mean anything in practice —
// this exact overlap was the real bug a 2026-08-23 player playtest caught.
describe("rarity tier gaps (no overlap between adjacent tiers)", () => {
  it("a worst-roll ship of the next rarity always beats a best-roll ship of this one", () => {
    for (let i = 0; i < RARITY_ORDER.length - 1; i++) {
      const lo = RARITY_ORDER[i];
      const hi = RARITY_ORDER[i + 1];
      const loBest = RARITY_MULTIPLIER[lo] * qualityMultiplier(1);
      const hiWorst = RARITY_MULTIPLIER[hi] * qualityMultiplier(0);
      expect(hiWorst, `${hi} (worst roll) should exceed ${lo} (best roll)`).toBeGreaterThan(loBest);
    }
  });
});

// Ship-ascension redesign (docs/story/research-notes-ship-ascension.md): hull
// classes are ordered by `order`, and a worst-roll ship at the next order should
// still hit noticeably harder than the tier it just ascended from — same shape as
// the rarity-tier-gap check above, applied to baseHull/basePower across orders
// (rarity/rolls are now held fixed across an ascension, so the tier gap has to
// come entirely from the hull class's own base stats).
describe("hull class order gaps (no overlap between adjacent ascension tiers)", () => {
  it("every order's base hull and base power exceed every hull class one order below it", () => {
    for (let order = 0; order < 6; order++) {
      const lower = HULL_CLASSES.filter((h) => h.order === order);
      const higher = HULL_CLASSES.filter((h) => h.order === order + 1);
      for (const hi of higher) {
        for (const lo of lower) {
          expect(hi.baseHull, `${hi.id} (order ${hi.order}) should exceed ${lo.id} (order ${lo.order}) in base hull`).toBeGreaterThan(lo.baseHull);
          expect(hi.basePower, `${hi.id} (order ${hi.order}) should exceed ${lo.id} (order ${lo.order}) in base power`).toBeGreaterThan(lo.basePower);
        }
      }
    }
  });
});

// Player report (2026-08-24): "进阶后不应该出现属性下降的情况" — ascending must
// never reduce anything. It used to: 24 separate stat decreases existed across the
// possible ascension paths (e.g. Interceptor speed 8 → Cruiser speed 4, Bulwark
// armor slots 4 → Corsair 2, which also silently unequipped modules). The lateral
// tradeoff at each tier is now "which stat grows MORE", never "which shrinks".
describe("ascension never reduces any stat or slot (player report 2026-08-24)", () => {
  const STATS = ["baseHull", "basePower", "baseSpeed"] as const;
  const SLOTS = ["weapon", "armor", "engine", "utility"] as const;

  it("every order-N+1 hull matches or beats every order-N hull on every stat and slot", () => {
    const maxOrder = Math.max(...HULL_CLASSES.map((h) => h.order));
    for (let order = 0; order < maxOrder; order++) {
      const from = HULL_CLASSES.filter((h) => h.order === order);
      const to = HULL_CLASSES.filter((h) => h.order === order + 1);
      for (const lower of from) {
        for (const higher of to) {
          for (const s of STATS) {
            expect(
              higher[s],
              `ascending ${lower.id} → ${higher.id} would DROP ${s} (${lower[s]} → ${higher[s]})`,
            ).toBeGreaterThanOrEqual(lower[s]);
          }
          for (const s of SLOTS) {
            expect(
              higher.slots[s],
              `ascending ${lower.id} → ${higher.id} would DROP ${s} slots (${lower.slots[s]} → ${higher.slots[s]}) and unequip a module`,
            ).toBeGreaterThanOrEqual(lower.slots[s]);
          }
        }
      }
    }
  });

  it("ascending never unequips a module, for every possible path", () => {
    const maxOrder = Math.max(...HULL_CLASSES.map((h) => h.order));
    for (let order = 0; order < maxOrder; order++) {
      for (const lower of HULL_CLASSES.filter((h) => h.order === order)) {
        const total = lower.slots.weapon + lower.slots.armor + lower.slots.engine + lower.slots.utility;
        // Fill every slot, then ascend and confirm all of them survived.
        const filled = Array.from({ length: total }, (_, i) => `mod${i}`);
        for (const higher of HULL_CLASSES.filter((h) => h.order === order + 1)) {
          const ship = makeShip({ hullClass: lower.id, equipped: filled });
          const after = ascendShip(ship, higher.id);
          for (const m of filled) {
            expect(
              after.equipped.includes(m),
              `${lower.id} → ${higher.id} dropped equipped module ${m}`,
            ).toBe(true);
          }
        }
      }
    }
  });
});

describe("ascension gating (canAscend/ascendShip)", () => {
  it("cannot ascend when level, essence, or the story flag isn't met", () => {
    const ship = makeShip({ hullClass: "corvette", level: 1 });
    expect(canAscend(ship, 0, {})).toBe(false);
    expect(canAscend(ship, 1000, {})).toBe(false); // flag still missing
    expect(canAscend(ship, 1000, { "act1.tigersReach.cleared": true })).toBe(false); // level too low
  });

  it("can ascend once level, essence, and the story flag all hold", () => {
    const ship = makeShip({ hullClass: "corvette", level: 10 });
    expect(canAscend(ship, 40, { "act1.tigersReach.cleared": true })).toBe(true);
  });

  it("ascending changes hull class, fully heals, and records ascension history", () => {
    const ship = makeShip({ hullClass: "corvette", level: 10, currentHp: 50 });
    const ascended = ascendShip(ship, "destroyer");
    expect(ascended.hullClass).toBe("destroyer");
    expect(ascended.ascendedFrom).toEqual(["corvette"]);
    expect(ascended.currentHp).toBe(computeMaxHull(ascended));
  });

  it("slot remapping keeps each module inside its own type group as slots grow", () => {
    // Corvette: 1 weapon/1 armor/1 engine/1 utility. Destroyer: 2 weapon/2 armor/1 engine/2 utility.
    const ship = makeShip({ hullClass: "corvette", equipped: ["w", "a", "e", "u"] });
    const ascended = ascendShip(ship, "destroyer");
    expect(ascended.equipped).toEqual(["w", null, "a", null, "e", "u", null]);
  });
});
