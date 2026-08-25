import { describe, expect, it } from "vitest";
import { weaponVfxForFamily, weaponVfxForFaction, VFX_MAPPED_FACTIONS, type WeaponVfx } from "./weaponVfx";
import { MODULE_DEFS } from "../../data/modules";
import { ENCOUNTER_DEFS, BOUNTY_ENCOUNTER_DEFS } from "../../data/encounters";

// Player report (2026-08-25): "武器没有特效". The effect existed, but every weapon
// drew the same tracer in a different hue, so the screen read as having none.
// These guard the thing that actually fixes that: that a weapon's look is derived
// from its family, and that families genuinely map to *different* looks. A future
// family added without an entry here would silently fall back to the default and
// quietly recreate the original complaint for that whole tech line.
describe("weapon VFX archetypes", () => {
  it("every module family in the roster maps to an archetype, and they are distinct", () => {
    const families = [...new Set(MODULE_DEFS.map((m) => m.family))];
    expect(families.length).toBe(10);
    const seen = new Map<WeaponVfx, string>();
    for (const family of families) {
      const vfx = weaponVfxForFamily(family);
      const clash = seen.get(vfx);
      expect(clash, `families "${family}" and "${clash}" both render as "${vfx}" — they'd be indistinguishable in combat`).toBeUndefined();
      seen.set(vfx, family);
    }
    expect(seen.size).toBe(10);
  });

  it("every faction that actually fights the player is mapped explicitly", () => {
    // Checked by membership, not by comparing against the fallback: the fallback
    // is itself a real archetype ("slug"), so a value comparison cannot tell
    // "deliberately mapped to slug" apart from "fell through to the default".
    const factions = [...new Set([...ENCOUNTER_DEFS, ...BOUNTY_ENCOUNTER_DEFS].map((e) => e.faction))];
    for (const f of factions) {
      expect(VFX_MAPPED_FACTIONS.includes(f), `faction "${f}" has no archetype of its own — its ships would shoot like something else`).toBe(true);
    }
    const distinct = new Set(factions.map((f) => weaponVfxForFaction(f)));
    expect(distinct.size, "fighting factions collapsed into too few looks").toBeGreaterThanOrEqual(Math.min(6, factions.length));
  });

  it("an unknown family or faction still yields a usable archetype rather than throwing", () => {
    expect(weaponVfxForFamily("nonesuch")).toBeTruthy();
    expect(weaponVfxForFaction("nonesuch")).toBeTruthy();
  });
});
