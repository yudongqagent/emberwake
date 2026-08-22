import { describe, expect, it } from "vitest";
import { resolveAttack, shiftRangeBand, isEncounterCleared, isPlayerDefeated } from "./combat";

describe("resolveAttack", () => {
  it("misses when the roll is below evasion", () => {
    const result = resolveAttack(20, 0, 0.5, 1, 0.2);
    expect(result.hit).toBe(false);
    expect(result.damageDealt).toBe(0);
  });

  it("hits and applies block when the roll clears evasion", () => {
    const result = resolveAttack(20, 5, 0.1, 1, 0.5);
    expect(result.hit).toBe(true);
    expect(result.damageDealt).toBe(15);
  });

  it("never deals less than 1 damage on a hit, even through heavy block", () => {
    const result = resolveAttack(5, 100, 0, 1, 0.9);
    expect(result.hit).toBe(true);
    expect(result.damageDealt).toBe(1);
  });

  it("scales damage by the range multiplier before block", () => {
    const result = resolveAttack(10, 0, 0, 1.2, 0.9);
    expect(result.damageDealt).toBe(12);
  });
});

describe("shiftRangeBand", () => {
  it("moves toward close range without going past the end", () => {
    expect(shiftRangeBand("mid", "in")).toBe("close");
    expect(shiftRangeBand("close", "in")).toBe("close");
  });

  it("moves toward long range without going past the end", () => {
    expect(shiftRangeBand("mid", "out")).toBe("long");
    expect(shiftRangeBand("long", "out")).toBe("long");
  });
});

describe("isEncounterCleared / isPlayerDefeated", () => {
  it("reports cleared only once every enemy is at 0 hull", () => {
    expect(isEncounterCleared([{ name: "a", maxHull: 10, hull: 0, damage: 1, block: 0, evasion: 0 }])).toBe(true);
    expect(
      isEncounterCleared([
        { name: "a", maxHull: 10, hull: 0, damage: 1, block: 0, evasion: 0 },
        { name: "b", maxHull: 10, hull: 3, damage: 1, block: 0, evasion: 0 },
      ]),
    ).toBe(false);
  });

  it("reports defeat only at 0 or below", () => {
    expect(isPlayerDefeated(1)).toBe(false);
    expect(isPlayerDefeated(0)).toBe(true);
    expect(isPlayerDefeated(-5)).toBe(true);
  });
});
