import { describe, expect, it } from "vitest";
import { MODULE_EFFECTS } from "./moduleEffects";
import { MODULE_DEFS } from "./modules";

/** The 200-module roster is only meaningful if the effects behind it are real.
 * docs/content-depth-standards.md exists because an earlier pass shipped "8 module
 * archetypes that were reskins wearing different names" — a declared-but-unwired
 * effect is exactly that failure, and it's invisible at runtime because an
 * unimplemented effect simply does nothing.
 *
 * So this reads the actual combat/store/UI sources and asserts every id in the
 * registry appears in one of them. It's a coarse check (a mention isn't proof of
 * correct behaviour) but it catches the failure that actually happens: adding an
 * effect to the vocabulary and forgetting to implement it. */
// Vite raw-imports rather than node's fs, so this works unchanged in the browser
// test environment and needs no node type declarations.
const SOURCE_FILES = import.meta.glob(
  ["../ui/screens/Combat.tsx", "../ui/screens/Modules.tsx", "../state/store.ts", "../engine/modules.ts"],
  { eager: true, query: "?raw", import: "default" },
) as Record<string, string>;
const SOURCES = Object.values(SOURCE_FILES).join("\n");

describe("module effect registry", () => {
  it("every declared effect is referenced by real game code, not just written down", () => {
    const unwired = MODULE_EFFECTS.filter((e) => !SOURCES.includes(`"${e.id}"`)).map((e) => e.id);
    expect(unwired, `these effects are declared but never used in combat/store/UI: ${unwired.join(", ")}`).toEqual([]);
  });

  it("effect ids are unique", () => {
    const ids = MODULE_EFFECTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("the roster is 200 modules with unique ids and names, in both languages", () => {
    expect(MODULE_DEFS.length).toBe(200);
    expect(new Set(MODULE_DEFS.map((m) => m.id)).size).toBe(200);
    expect(new Set(MODULE_DEFS.map((m) => m.name)).size).toBe(200);
  });

  it("every module type and family is represented across all five tiers", () => {
    const families = new Set(MODULE_DEFS.map((m) => m.family));
    expect(families.size).toBe(10);
    for (const fam of families) {
      for (const type of ["weapon", "armor", "engine", "utility"] as const) {
        const group = MODULE_DEFS.filter((m) => m.family === fam && m.type === type);
        expect(group.length, `${fam}/${type} should have 5 tiers`).toBe(5);
        expect(new Set(group.map((m) => m.baseRarity)).size, `${fam}/${type} tiers should be distinct`).toBe(5);
      }
    }
  });
});
