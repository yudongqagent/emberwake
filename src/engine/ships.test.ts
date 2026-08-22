import { describe, expect, it } from "vitest";
import { computeMaxHull, computePowerCapacity, xpToNextLevel, applyXp } from "./ships";
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
