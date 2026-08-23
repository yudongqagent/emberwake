import { describe, expect, it } from "vitest";
import { resolveAttack, rangeBandFromDistance, isEncounterCleared, isPlayerDefeated } from "./combat";

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

  it("never crits when critChance defaults to 0", () => {
    const result = resolveAttack(20, 0, 0, 1, 0.5);
    expect(result.crit).toBe(false);
    expect(result.damageDealt).toBe(20);
  });

  it("applies the crit multiplier when the crit roll clears critChance", () => {
    const result = resolveAttack(20, 0, 0, 1, 0.5, 0.5, 0.1);
    expect(result.crit).toBe(true);
    expect(result.damageDealt).toBe(35); // round(20 * 1.75)
  });

  it("does not crit when the crit roll fails, even with a high critChance", () => {
    const result = resolveAttack(20, 0, 0, 1, 0.5, 0.5, 0.9);
    expect(result.crit).toBe(false);
    expect(result.damageDealt).toBe(20);
  });

  it("a miss can never crit regardless of critChance", () => {
    const result = resolveAttack(20, 0, 0.9, 1, 0.5, 1, 0);
    expect(result.hit).toBe(false);
    expect(result.crit).toBe(false);
  });
});

describe("rangeBandFromDistance", () => {
  it("reads close/mid/long off live distance between ships", () => {
    expect(rangeBandFromDistance(0)).toBe("close");
    expect(rangeBandFromDistance(159)).toBe("close");
    expect(rangeBandFromDistance(160)).toBe("mid");
    expect(rangeBandFromDistance(339)).toBe("mid");
    expect(rangeBandFromDistance(340)).toBe("long");
    expect(rangeBandFromDistance(1000)).toBe("long");
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
