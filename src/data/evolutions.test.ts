import { describe, expect, it } from "vitest";
import { EVOLUTIONS, canEvolve, evolutionBlocker, evolveModule, evolutionForFamily } from "./evolutions";
import { MODULE_DEFS, moduleDefById } from "./modules";
import { MODULE_EFFECTS } from "./moduleEffects";
import { drawModule, moduleMaxLevel, computeModuleDamage, effectiveSignature } from "../engine/modules";
import type { ModuleInstance } from "./types";
import { localizedEvolutionName, localizedModuleInstanceName } from "../i18n/data";
import { setLanguage } from "../i18n/language";

function weaponOf(family: string, maxed = true): ModuleInstance {
  const def = MODULE_DEFS.find((m) => m.type === "weapon" && m.family === family)!;
  const m = drawModule(def.id);
  return { ...m, level: maxed ? moduleMaxLevel(m.rarity) : 1 };
}

function partnerProviding(effect: string): ModuleInstance {
  const def = MODULE_DEFS.find((m) => m.signature === effect)!;
  return { ...drawModule(def.id), id: "partner" };
}

// Core-loop redesign #4. From Vampire Survivors: a maxed weapon plus a specific
// partner becomes something dramatically stronger, and "that promise of a payoff
// is what makes the draft choices feel meaningful". The visibility matters more
// than the reward — an evolution you can see coming changes what you draft.
describe("weapon evolution", () => {
  it("gives every weapon family exactly one evolution", () => {
    const families = [...new Set(MODULE_DEFS.filter((m) => m.type === "weapon").map((m) => m.family))];
    for (const f of families) {
      expect(evolutionForFamily(f), `family "${f}" has no evolution to aim at`).toBeDefined();
    }
    expect(new Set(EVOLUTIONS.map((e) => e.family)).size).toBe(EVOLUTIONS.length);
  });

  it("only references effects that are actually implemented", () => {
    const known = new Set(MODULE_EFFECTS.map((e) => e.id));
    for (const e of EVOLUTIONS) {
      expect(known.has(e.partnerEffect), `${e.family}: partner effect "${e.partnerEffect}" is not implemented`).toBe(true);
      expect(known.has(e.signature), `${e.family}: evolved signature "${e.signature}" is not implemented`).toBe(true);
    }
  });

  it("requires a partner effect that some module can actually provide", () => {
    // An unreachable requirement would be a permanently dangled carrot.
    for (const e of EVOLUTIONS) {
      const provider = MODULE_DEFS.some((m) => m.signature === e.partnerEffect || m.traitPool.includes(e.partnerEffect));
      expect(provider, `nothing in the roster can provide "${e.partnerEffect}" for ${e.family}`).toBe(true);
    }
  });

  it("refuses to evolve a weapon that isn't maxed", () => {
    const w = weaponOf("reaver", false);
    const p = partnerProviding(evolutionForFamily("reaver")!.partnerEffect);
    expect(canEvolve(w, [w, p])).toBe(false);
    expect(evolutionBlocker(w, [w, p])).toBe("needsLevel");
  });

  it("refuses to evolve without the partner effect equipped", () => {
    const w = weaponOf("reaver");
    expect(canEvolve(w, [w])).toBe(false);
    expect(evolutionBlocker(w, [w])).toBe("needsPartner");
  });

  it("never counts the weapon itself as its own partner", () => {
    // An evolution has to cost a socket, or it's a free upgrade with extra steps.
    const evo = evolutionForFamily("reaver")!;
    const selfProviding: ModuleInstance = { ...weaponOf("reaver"), traits: [evo.partnerEffect] };
    expect(canEvolve(selfProviding, [selfProviding])).toBe(false);
  });

  it("evolves when maxed with the partner equipped", () => {
    const evo = evolutionForFamily("reaver")!;
    const w = weaponOf("reaver");
    const p = partnerProviding(evo.partnerEffect);
    expect(canEvolve(w, [w, p])).toBe(true);
    expect(evolutionBlocker(w, [w, p])).toBeNull();
  });

  it("changes what the weapon DOES, not only what it hits for", () => {
    // The signature swap is the actual change; the damage is the payoff.
    const w = weaponOf("reaver");
    const before = effectiveSignature(w);
    const evolved = evolveModule(w);
    expect(effectiveSignature(evolved)).toBe(evolutionForFamily("reaver")!.signature);
    expect(effectiveSignature(evolved)).not.toBe(before);
    expect(computeModuleDamage(evolved)).toBeGreaterThan(computeModuleDamage(w));
  });

  it("cannot be evolved twice", () => {
    const evo = evolutionForFamily("reaver")!;
    const w = evolveModule(weaponOf("reaver"));
    const p = partnerProviding(evo.partnerEffect);
    expect(canEvolve(w, [w, p])).toBe(false);
    expect(evolutionBlocker(w, [w, p])).toBe("alreadyEvolved");
  });

  it("never evolves a non-weapon", () => {
    const armor = MODULE_DEFS.find((m) => m.type === "armor")!;
    const a = { ...drawModule(armor.id), level: 99 };
    expect(canEvolve(a, [a])).toBe(false);
    expect(evolutionBlocker(a, [a])).toBe("notWeapon");
  });

  it("leaves an unevolved weapon's signature exactly as authored", () => {
    for (const def of MODULE_DEFS.filter((m) => m.type === "weapon")) {
      const inst = drawModule(def.id);
      expect(effectiveSignature(inst)).toBe(moduleDefById(def.id).signature);
    }
  });
});

describe("evolution naming", () => {
  it("has a Chinese name for every evolution, with no Latin letters left in it", () => {
    // Caught live: the requirement line rendered "可进化为Red Tide" because the
    // English name was interpolated into Chinese copy.
    for (const e of EVOLUTIONS) {
      expect(e.nameCn.length, `${e.family} has no Chinese evolution name`).toBeGreaterThan(0);
      expect(/[a-zA-Z]/.test(e.nameCn), `${e.family}: Chinese name "${e.nameCn}" contains Latin letters`).toBe(false);
      expect(e.nameCn).not.toBe(e.name);
    }
  });

  it("localizes the evolution name in both languages", () => {
    setLanguage("zh");
    expect(localizedEvolutionName("reaver")).toBe(EVOLUTIONS.find((e) => e.family === "reaver")!.nameCn);
    setLanguage("en");
    expect(localizedEvolutionName("reaver")).toBe(EVOLUTIONS.find((e) => e.family === "reaver")!.name);
  });

  it("names an evolved weapon by its evolution, not its original def", () => {
    setLanguage("en");
    const w = evolveModule(weaponOf("reaver"));
    expect(localizedModuleInstanceName(w)).toBe(evolutionForFamily("reaver")!.name);
    const plain = weaponOf("reaver");
    expect(localizedModuleInstanceName(plain)).not.toBe(evolutionForFamily("reaver")!.name);
  });
});
