import { describe, expect, it } from "vitest";
import { MODULE_DEFS } from "../../data/modules";
import { MODULE_EFFECTS } from "../../data/moduleEffects";
import { CREW_DEFS } from "../../data/crew";
import { HULL_CLASS_ABILITIES } from "../../data/namedShips";
import { ENCOUNTER_DEFS, BOUNTY_ENCOUNTER_DEFS } from "../../data/encounters";
import { BAUHINIA_REACH } from "../../data/galaxies/bauhiniaReach";
import { LIONSHEART_EXPANSE } from "../../data/galaxies/lionsheartExpanse";
import { SWANREACH_COMBINE } from "../../data/galaxies/swanreachCombine";
import { FRACTURED_VEIL } from "../../data/galaxies/fracturedVeil";
import { DEEP_ORIGIN } from "../../data/galaxies/deepOrigin";
import { UMBRAL_LINE } from "../../data/galaxies/umbralLine";
import { CHORUS_DEEP } from "../../data/galaxies/chorusDeep";
import { MODULE_NAMES_ZH } from "./modules";
import { CREW_ZH } from "./crew";
import { NAMED_SHIPS_ZH } from "./namedShips";
import { ENCOUNTER_NAMES_ZH, ENEMY_NAMES_ZH } from "./encounters";
import { GALAXY_NAMES_ZH, SYSTEM_NAMES_ZH, POI_NAMES_ZH } from "./places";

// Issue #11: the module/crew/named-ship translation overlays are looked up by id at
// render time (see i18n/data/index.ts) — a typo'd or stale id here just silently
// falls back to English with no error, so nothing catches drift except a real test.
describe("module/crew/named-ship translation overlays stay in sync with English data", () => {
  it("every module id with a Chinese name has a matching ModuleDef", () => {
    const defIds = new Set(MODULE_DEFS.map((m) => m.id));
    for (const id of Object.keys(MODULE_NAMES_ZH)) {
      expect(defIds.has(id), `translated module id "${id}" has no matching ModuleDef`).toBe(true);
    }
  });

  it("every ModuleDef has a Chinese name — all 200, no silent gaps", () => {
    for (const def of MODULE_DEFS) {
      expect(MODULE_NAMES_ZH[def.id], `module "${def.id}" (${def.name}) has no Chinese name`).toBeDefined();
    }
  });

  // Effect labels moved out of per-module overlays into one shared registry, so
  // the risk shifted: not "is this module's trait translated" but "does every
  // effect any module references actually exist, in both languages".
  it("every effect referenced by any module exists in the registry, in both languages", () => {
    const known = new Set(MODULE_EFFECTS.map((e) => e.id));
    for (const def of MODULE_DEFS) {
      expect(known.has(def.signature), `${def.id}: signature effect "${def.signature}" is not in the effect registry`).toBe(true);
      for (const t of def.traitPool) {
        expect(known.has(t), `${def.id}: trait "${t}" is not in the effect registry`).toBe(true);
      }
    }
    for (const e of MODULE_EFFECTS) {
      expect(e.labelCn.length, `effect "${e.id}" has no Chinese label`).toBeGreaterThan(0);
      expect(e.descriptionCn.length, `effect "${e.id}" has no Chinese description`).toBeGreaterThan(0);
    }
  });

  it("every CrewDef has a Chinese translation", () => {
    for (const def of CREW_DEFS) {
      expect(CREW_ZH[def.id], `crew "${def.id}" has no Chinese translation`).toBeDefined();
    }
  });

  it("every translated crew active ability keeps the ' — ' separator the English original uses", () => {
    for (const def of CREW_DEFS) {
      const zh = CREW_ZH[def.id];
      if (!zh) continue;
      expect(zh.active.includes(" — "), `crew "${def.id}": translated active ability is missing the ' — ' separator Combat.tsx splits on`).toBe(true);
    }
  });

  it("every HullClassAbilityDef has a Chinese translation", () => {
    for (const def of HULL_CLASS_ABILITIES) {
      expect(NAMED_SHIPS_ZH[def.id], `named ship "${def.id}" has no Chinese translation`).toBeDefined();
    }
  });

  it("every translated named-ship active ability keeps the ' — ' separator the English original uses", () => {
    for (const def of HULL_CLASS_ABILITIES) {
      const zh = NAMED_SHIPS_ZH[def.id];
      if (!zh) continue;
      expect(zh.active.includes(" — "), `named ship "${def.id}": translated active ability is missing the ' — ' separator Combat.tsx splits on`).toBe(true);
    }
  });

  it("every encounter (story and bounty) has a Chinese title, and every enemy in it has a Chinese name", () => {
    for (const def of [...ENCOUNTER_DEFS, ...BOUNTY_ENCOUNTER_DEFS]) {
      expect(ENCOUNTER_NAMES_ZH[def.id], `encounter "${def.id}" has no Chinese title`).toBeDefined();
      for (const enemy of def.enemies) {
        expect(ENEMY_NAMES_ZH[enemy.name], `encounter "${def.id}": enemy "${enemy.name}" has no Chinese name`).toBeDefined();
      }
    }
  });

  it("every galaxy, system, and POI has a Chinese name", () => {
    const galaxies = [BAUHINIA_REACH, LIONSHEART_EXPANSE, SWANREACH_COMBINE, FRACTURED_VEIL, DEEP_ORIGIN, UMBRAL_LINE, CHORUS_DEEP];
    for (const galaxy of galaxies) {
      expect(GALAXY_NAMES_ZH[galaxy.id], `galaxy "${galaxy.id}" has no Chinese name`).toBeDefined();
      for (const system of galaxy.systems) {
        expect(SYSTEM_NAMES_ZH[system.id], `system "${system.id}" has no Chinese name`).toBeDefined();
        for (const poi of system.pois) {
          expect(POI_NAMES_ZH[poi.id], `POI "${poi.id}" (system "${system.id}") has no Chinese name`).toBeDefined();
        }
      }
    }
  });
});
