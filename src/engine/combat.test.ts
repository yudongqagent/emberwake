import { describe, expect, it } from "vitest";
import { resolveAttack, advanceRangeBand, isEncounterCleared, isPlayerDefeated, RANGE_MODIFIERS, type RangeState } from "./combat";
import { ENCOUNTER_DEFS } from "../data/encounters";

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

// Bridge-command redesign (docs/story/research-notes-bridge-command.md, section
// H): range is a discrete tug-of-war advanced per tick, not read off live pixel
// distance — replaces the old rangeBandFromDistance model entirely.
describe("advanceRangeBand", () => {
  it("closing under a close order with no enemy contest transitions once progress reaches 1", () => {
    let state: RangeState = { band: "long", progress: 0 };
    // rate=0.1/sec, dt=5s → 0.5 progress after one tick, not yet transitioned
    state = advanceRangeBand(state, "close", "long", 0.1, 0, 5);
    expect(state.band).toBe("long");
    expect(state.progress).toBeCloseTo(0.5);
    // another 5s tick pushes total to 1.0 → transitions to mid, remainder carried
    state = advanceRangeBand(state, "close", "long", 0.1, 0, 5);
    expect(state.band).toBe("mid");
    expect(state.progress).toBeCloseTo(0);
  });

  it("holding still drifts if the enemy prefers a different band, but the player contributes nothing", () => {
    const state = advanceRangeBand({ band: "long", progress: 0 }, "hold", "close", 0, 0.1, 5);
    expect(state.band).toBe("long");
    expect(state.progress).toBeCloseTo(0.5); // enemy alone pulls toward closing
  });

  it("an enemy preferring the current band contributes no pull either way", () => {
    const state = advanceRangeBand({ band: "mid", progress: 0 }, "hold", "mid", 0.1, 0.1, 10);
    expect(state.progress).toBe(0);
  });

  it("reversing direction mid-transition costs back the progress already made, not a free flip", () => {
    let state: RangeState = { band: "mid", progress: 0.6 }; // 60% of the way toward closing
    state = advanceRangeBand(state, "retreat", "mid", 0.1, 0, 3); // retreat pulls the other way
    expect(state.band).toBe("mid"); // hasn't transitioned
    expect(state.progress).toBeCloseTo(0.3); // 0.6 - 0.1*3
  });

  it("cannot close past the closest band or retreat past the farthest", () => {
    const atClose = advanceRangeBand({ band: "close", progress: 0 }, "close", "close", 0.1, 0, 10);
    expect(atClose.band).toBe("close");
    expect(atClose.progress).toBeLessThanOrEqual(0);
    const atLong = advanceRangeBand({ band: "long", progress: 0 }, "retreat", "long", 0.1, 0, 10);
    expect(atLong.band).toBe("long");
    expect(atLong.progress).toBeGreaterThanOrEqual(0);
  });

  it("a faster ship (higher playerRate) closes range in less time", () => {
    const slow = advanceRangeBand({ band: "long", progress: 0 }, "close", "long", 0.05, 0, 5);
    const fast = advanceRangeBand({ band: "long", progress: 0 }, "close", "long", 0.15, 0, 5);
    expect(fast.progress).toBeGreaterThan(slow.progress);
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

// Player-Tested Anti-Patterns #7 (docs/design-principles.md): a 2026-08 playtest
// found early combat felt like "stand and auto-attack" partly because trash-tier
// enemy damage was so low relative to the starting Plate Barrier's block (10) that
// resolveAttack's damage-floor (never less than 1) clamped every range band to the
// same result — moving to long range for safety felt identical to standing at close
// range, so positioning had no legible payoff. This guards against that regressing:
// every Act I encounter's weakest enemy must deal *different* damage at close vs.
// long range against a representative starting loadout, not the same floor value.
describe("early-game damage floor (Act I trash-tier enemies vs. starting block)", () => {
  const STARTING_ARMOR_BLOCK = 10; // Plate Barrier, mk1, neutral roll — see ships.ts
  const ACT1_COMBAT_IDS = ["kestrelsRestRaid", "thornwakeDefenseGrid", "coldreachAnchorage", "emberRisingAssault"];

  it("close-range and long-range damage are not identically floor-clamped", () => {
    for (const id of ACT1_COMBAT_IDS) {
      const enc = ENCOUNTER_DEFS.find((e) => e.id === id)!;
      const weakest = [...enc.enemies].sort((a, b) => a.damage - b.damage)[0];
      const closeDmg = resolveAttack(weakest.damage, STARTING_ARMOR_BLOCK, 0, RANGE_MODIFIERS.close.incoming, 0.99, 0).damageDealt;
      const longDmg = resolveAttack(weakest.damage, STARTING_ARMOR_BLOCK, 0, RANGE_MODIFIERS.long.incoming, 0.99, 0).damageDealt;
      expect(closeDmg, `${id}'s weakest enemy (${weakest.name}, dmg ${weakest.damage}) should hit harder at close than long range`).toBeGreaterThan(longDmg);
    }
  });
});
