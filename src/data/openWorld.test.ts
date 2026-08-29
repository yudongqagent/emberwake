import { describe, expect, it } from "vitest";
import { BAUHINIA_REACH } from "./galaxies/bauhiniaReach";
import { LIONSHEART_EXPANSE } from "./galaxies/lionsheartExpanse";
import { SWANREACH_COMBINE } from "./galaxies/swanreachCombine";
import { FRACTURED_VEIL } from "./galaxies/fracturedVeil";
import { DEEP_ORIGIN } from "./galaxies/deepOrigin";
import { UMBRAL_LINE } from "./galaxies/umbralLine";
import { CHORUS_DEEP } from "./galaxies/chorusDeep";

const GALAXIES = [BAUHINIA_REACH, LIONSHEART_EXPANSE, SWANREACH_COMBINE, FRACTURED_VEIL, DEEP_ORIGIN, UMBRAL_LINE, CHORUS_DEEP];

// Open-world redesign (docs/open-world-redesign.md). The contract is: you may go
// anywhere from the first minute, and danger is the gate rather than permission.
// These hold that contract, because it is exactly the kind of thing a later
// "just gate this one region" change would quietly undo.
describe("open world", () => {
  it("leaves every region reachable from the first minute", () => {
    for (const g of GALAXIES) {
      expect(g.unlockFlag, `region "${g.id}" is still permission-gated`).toBeNull();
    }
  });

  it("gives every region a threat rating instead", () => {
    for (const g of GALAXIES) {
      expect(typeof g.threat, `region "${g.id}" has no threat rating`).toBe("number");
      expect(g.threat).toBeGreaterThanOrEqual(1);
      expect(g.threat).toBeLessThanOrEqual(7);
    }
  });

  it("starts the player in the only region that is genuinely safe", () => {
    // Threat 1 contributes zero Ember Load, so early play is unchanged by the
    // open-world conversion.
    expect(BAUHINIA_REACH.threat).toBe(1);
  });

  it("spreads threat across the full range rather than clustering", () => {
    const threats = GALAXIES.map((g) => g.threat).sort((a, b) => a - b);
    expect(new Set(threats).size, "regions share threat ratings — the world has no gradient").toBe(GALAXIES.length);
    expect(threats[threats.length - 1] - threats[0]).toBeGreaterThanOrEqual(5);
  });

  it("keeps every region actually populated, so 'go anywhere' means something", () => {
    for (const g of GALAXIES) {
      expect(g.systems.length, `region "${g.id}" has no systems`).toBeGreaterThan(0);
      const pois = g.systems.reduce((n, s) => n + s.pois.length, 0);
      expect(pois, `region "${g.id}" has no POIs — nothing to do on arrival`).toBeGreaterThan(0);
    }
  });

  it("connects every region's systems, so none is stranded", () => {
    for (const g of GALAXIES) {
      if (g.systems.length < 2) continue;
      const reachable = new Set<string>([g.systems[0].id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const lane of g.lanes) {
          if (reachable.has(lane.from) && !reachable.has(lane.to)) { reachable.add(lane.to); grew = true; }
          if (reachable.has(lane.to) && !reachable.has(lane.from)) { reachable.add(lane.from); grew = true; }
        }
      }
      for (const sys of g.systems) {
        expect(reachable.has(sys.id), `system "${sys.id}" in "${g.id}" is unreachable by any lane`).toBe(true);
      }
    }
  });
});
