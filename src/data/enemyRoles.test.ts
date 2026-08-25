import { describe, expect, it } from "vitest";
import { ENCOUNTER_DEFS, BOUNTY_ENCOUNTER_DEFS } from "./encounters";
import { generateRiftWaveFull } from "./rift";
import { t } from "../i18n/strings";
import { setLanguage } from "../i18n/language";
import type { EnemyRole } from "./types";

const ROLES: EnemyRole[] = ["mender", "anchor", "artillery"];

// Player report (2026-08-25): "战斗还是很无聊". With auto-fire, the only decision a
// fight leaves is which target to focus, and every enemy was an interchangeable
// stat block — so that decision never mattered. Roles exist to make the formation
// itself the puzzle. These guard the parts that make that real rather than
// cosmetic: that roles actually reach encounters, and that the player can read
// them in both languages.
describe("enemy roles", () => {
  it("reach a meaningful share of story encounters, not just one showcase fight", () => {
    const withRoles = ENCOUNTER_DEFS.filter((e) => e.enemies.some((x) => x.role));
    expect(withRoles.length, "roles were defined but almost no encounter uses them").toBeGreaterThanOrEqual(6);
  });

  it("cover all three roles across the game's encounters", () => {
    const seen = new Set<string>();
    for (const enc of [...ENCOUNTER_DEFS, ...BOUNTY_ENCOUNTER_DEFS]) {
      for (const e of enc.enemies) if (e.role) seen.add(e.role);
    }
    for (const r of ROLES) {
      expect(seen.has(r), `role "${r}" is implemented but never actually appears in a fight`).toBe(true);
    }
  });

  it("never field more than one support ship in a formation", () => {
    // Caught a real design bug when first written: tagging by name had made
    // dysonSphereFirstContact three menders healing each other — a stalemate with
    // no pressure rather than a fight. One support ship per formation also keeps
    // the priority target unambiguous, which is the whole point of the mechanic.
    for (const enc of [...ENCOUNTER_DEFS, ...BOUNTY_ENCOUNTER_DEFS]) {
      const support = enc.enemies.filter((e) => e.role === "mender" || e.role === "anchor").length;
      expect(support, `encounter "${enc.id}" fields ${support} support ships`).toBeLessThanOrEqual(1);
      expect(support, `encounter "${enc.id}" is entirely support ships`).toBeLessThan(enc.enemies.length);
    }
  });

  it("keep a lone enemy free of an anchor role, which would do nothing", () => {
    // An anchor armours every OTHER ship; alone it is a plain enemy wearing a
    // label that promises a payoff it cannot deliver.
    for (const enc of [...ENCOUNTER_DEFS, ...BOUNTY_ENCOUNTER_DEFS]) {
      if (enc.enemies.length !== 1) continue;
      expect(enc.enemies[0].role, `solo encounter "${enc.id}" has a role that can't function`).not.toBe("anchor");
    }
  });

  it("also appear in the rift, so dives have the same texture", () => {
    const seen = new Set<string>();
    for (let depth = 1; depth <= 12; depth++) {
      for (let i = 0; i < 80; i++) {
        for (const e of generateRiftWaveFull(depth).encounter.enemies) if (e.role) seen.add(e.role);
      }
    }
    for (const r of ROLES) {
      expect(seen.has(r), `rift never fields role "${r}"`).toBe(true);
    }
  });

  it("are readable in both languages — name and the reason it matters", () => {
    for (const lang of ["en", "zh"] as const) {
      setLanguage(lang);
      for (const r of ROLES) {
        const label = t(`combat.role.${r}`);
        const hint = t(`combat.role.${r}Hint`);
        expect(label, `${lang}: role "${r}" renders as a raw key`).not.toBe(`combat.role.${r}`);
        expect(hint, `${lang}: role "${r}" hint renders as a raw key`).not.toBe(`combat.role.${r}Hint`);
        // The hint is what teaches the priority decision; an empty one makes the
        // badge meaningless the first time a player meets it.
        expect(hint.length).toBeGreaterThan(10);
      }
    }
    setLanguage("en");
  });
});
