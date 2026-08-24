import { describe, expect, it } from "vitest";
import { MODULE_DEFS } from "../../data/modules";
import { CREW_DEFS } from "../../data/crew";
import { NAMED_SHIP_DEFS } from "../../data/namedShips";
import { MODULES_ZH } from "./modules";
import { CREW_ZH } from "./crew";
import { NAMED_SHIPS_ZH } from "./namedShips";

// Issue #11: the module/crew/named-ship translation overlays are looked up by id at
// render time (see i18n/data/index.ts) — a typo'd or stale id here just silently
// falls back to English with no error, so nothing catches drift except a real test.
describe("module/crew/named-ship translation overlays stay in sync with English data", () => {
  it("every translated module id exists in MODULE_DEFS, and every translated trait id exists in that module's traitPool", () => {
    const defIds = new Set(MODULE_DEFS.map((m) => m.id));
    for (const [id, zh] of Object.entries(MODULES_ZH)) {
      expect(defIds.has(id), `translated module id "${id}" has no matching ModuleDef`).toBe(true);
      const def = MODULE_DEFS.find((m) => m.id === id)!;
      const traitIds = new Set(def.traitPool.map((tp) => tp.id));
      for (const traitId of Object.keys(zh.traits)) {
        expect(traitIds.has(traitId), `${id}: translated trait "${traitId}" isn't in this module's traitPool`).toBe(true);
      }
    }
  });

  it("every ModuleDef's traitPool is fully covered by its translation overlay", () => {
    for (const def of MODULE_DEFS) {
      const zh = MODULES_ZH[def.id];
      expect(zh, `module "${def.id}" has no Chinese translation at all`).toBeDefined();
      for (const tp of def.traitPool) {
        expect(zh.traits[tp.id], `${def.id}: trait "${tp.id}" has no Chinese translation`).toBeDefined();
      }
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

  it("every NamedShipDef has a Chinese translation", () => {
    for (const def of NAMED_SHIP_DEFS) {
      expect(NAMED_SHIPS_ZH[def.id], `named ship "${def.id}" has no Chinese translation`).toBeDefined();
    }
  });

  it("every translated named-ship active ability keeps the ' — ' separator the English original uses", () => {
    for (const def of NAMED_SHIP_DEFS) {
      const zh = NAMED_SHIPS_ZH[def.id];
      if (!zh) continue;
      expect(zh.active.includes(" — "), `named ship "${def.id}": translated active ability is missing the ' — ' separator Combat.tsx splits on`).toBe(true);
    }
  });
});
