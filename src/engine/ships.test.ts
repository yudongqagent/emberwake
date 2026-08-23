import { describe, expect, it } from "vitest";
import { computeMaxHull, computePowerCapacity, computeSpeed, computeBaseEvasion, computeBaseCritChance, xpToNextLevel, applyXp, qualityMultiplier, drawShip } from "./ships";
import { RARITY_ORDER, RARITY_MULTIPLIER } from "../data/hullClasses";
import { NAMED_SHIP_DEFS } from "../data/namedShips";
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
    namedShipId: null,
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
  it("is unaffected by level, only by hull class and rarity", () => {
    const a = computePowerCapacity(makeShip({ level: 1 }));
    const b = computePowerCapacity(makeShip({ level: 10 }));
    expect(a).toBe(b);
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

  it("bigger hull classes move slower even at the same speed roll", () => {
    const corvette = computeSpeed(makeShip({ hullClass: "corvette", rolls: { hull: 0.5, power: 0.5, speed: 0.5, evasion: 0.5, crit: 0.5 } }));
    const sovereign = computeSpeed(makeShip({ hullClass: "sovereign", rolls: { hull: 0.5, power: 0.5, speed: 0.5, evasion: 0.5, crit: 0.5 } }));
    expect(sovereign).toBeLessThan(corvette);
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

// Issues #3/#4 (docs/design-principles.md): a named ship needs to be verifiably
// special, not just occasionally tagged onto a mediocre roll, and its singleton
// promise (data/namedShips.ts) needs to actually hold under repeated draws — not
// just look right in the one manual playtest that happened to not hit the edge case.
describe("named ship draws (data/namedShips.ts)", () => {
  it("never rolls below the named-ship rarity floor", () => {
    const destroyerNamed = NAMED_SHIP_DEFS.find((n) => n.hullClass === "destroyer")!;
    const minIdx = RARITY_ORDER.indexOf("advanced");
    for (let i = 0; i < 500; i++) {
      const ship = drawShip("destroyer");
      if (ship.namedShipId === destroyerNamed.id) {
        expect(RARITY_ORDER.indexOf(ship.rarity)).toBeGreaterThanOrEqual(minIdx);
      }
    }
  });

  it("never rolls a named ship that's already owned", () => {
    const destroyerNamed = NAMED_SHIP_DEFS.find((n) => n.hullClass === "destroyer")!;
    const owned = new Set([destroyerNamed.id]);
    for (let i = 0; i < 500; i++) {
      const ship = drawShip("destroyer", owned);
      expect(ship.namedShipId).not.toBe(destroyerNamed.id);
    }
  });
});
