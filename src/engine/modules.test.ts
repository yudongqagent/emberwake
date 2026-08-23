import { describe, expect, it } from "vitest";
import { qualityMultiplier } from "./modules";
import { MODULE_RARITY_ORDER, MODULE_RARITY_MULTIPLIER } from "../data/modules";

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
