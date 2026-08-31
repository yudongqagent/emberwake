import { describe, expect, it } from "vitest";
import { generateDraft, draftTierFor } from "./draft";
import { moduleDefById } from "./modules";
import { moduleEffectById } from "./moduleEffects";
import { drawModule, moduleMaxLevel } from "../engine/modules";
import type { ModuleInstance } from "./types";

function owned(n: number, level = 1): ModuleInstance[] {
  return Array.from({ length: n }, () => ({ ...drawModule("bauhiniaWeapon1"), level }));
}

// Core-loop redesign #1. The measured problem this exists to fix: the whole
// 40-scene campaign offered 7 choices, and loot was
// `Math.random() < dropChance ? drawModule(...) : null` — zero draft moments.
// These tests guard the properties that make a draft a decision rather than
// three random things: it always offers a real choice, the randomness is
// legible, and no option is free.
describe("Refit Draft", () => {
  it("always offers exactly three options", () => {
    for (let i = 0; i < 200; i++) {
      const hand = generateDraft({ faction: "reavers", shipLevel: 5, owned: owned(3), activeBoons: [] });
      expect(hand.length).toBe(3);
    }
  });

  it("biases the module options toward the region you are fighting in", () => {
    // "Where you fight shapes what you can build" is the whole reason the map
    // matters after this change.
    let reaverCount = 0, total = 0;
    for (let i = 0; i < 120; i++) {
      for (const opt of generateDraft({ faction: "reavers", shipLevel: 5, owned: owned(2), activeBoons: [] })) {
        if (opt.kind !== "module" || !opt.module) continue;
        total++;
        if (moduleDefById(opt.module.defId).family === "reaver") reaverCount++;
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(reaverCount / total, "region bias is not actually biasing anything").toBeGreaterThan(0.9);
  });

  it("always includes one free option and one that costs hull", () => {
    // Into the Breach's rule: no option should be free. A hand of three costless
    // gifts is not a decision.
    for (let i = 0; i < 200; i++) {
      const hand = generateDraft({ faction: "swarm", shipLevel: 8, owned: owned(3), activeBoons: [] });
      expect(hand.some((o) => o.hullCost && o.hullCost > 0), "no greedy option in the hand").toBe(true);
      expect(hand.some((o) => !o.hullCost), "every option costs hull").toBe(true);
    }
  });

  it("makes the greedy option genuinely better, not just more expensive", () => {
    const hand = generateDraft({ faction: "bauhinia", shipLevel: 25, owned: owned(2), activeBoons: [] });
    const safe = hand.find((o) => o.kind === "module" && !o.hullCost)!;
    const greedy = hand.find((o) => o.hullCost)!;
    const order = ["mk1", "mk2", "mk3", "mk4", "mk5"];
    expect(order.indexOf(greedy.module!.rarity)).toBeGreaterThan(order.indexOf(safe.module!.rarity));
  });

  it("scales the offered tier with progress, and never past the top", () => {
    expect(draftTierFor(1, false)).toBe("mk1");
    expect(draftTierFor(35, false)).toBe("mk4");
    expect(draftTierFor(35, true)).toBe("mk5");
    // Greedy at the ceiling must not fall off the end of the tier list.
    expect(draftTierFor(999, true)).toBe("mk5");
  });

  it("offers a boon the player does not already have, never a duplicate", () => {
    // A boon you already carry would read as a wasted pick.
    const all = ["crit", "pierce", "coolant", "regen", "evasion", "hullBonus",
      "haste", "yieldBonus", "novaCharge", "deflect", "momentum", "recycler"];
    for (let i = 0; i < 300; i++) {
      const hand = generateDraft({ faction: "choir", shipLevel: 5, owned: [], activeBoons: all.slice(0, 11) });
      for (const opt of hand) {
        if (opt.kind === "boon") expect(all.slice(0, 11)).not.toContain(opt.boonId);
      }
    }
  });

  it("only ever offers boons that are real implemented effects", () => {
    for (let i = 0; i < 300; i++) {
      for (const opt of generateDraft({ faction: "hollow", shipLevel: 5, owned: [], activeBoons: [] })) {
        if (opt.kind === "boon") {
          expect(moduleEffectById(opt.boonId!), `boon "${opt.boonId}" is not an implemented effect`).toBeDefined();
        }
      }
    }
  });

  it("never offers an upgrade on a module that is already maxed", () => {
    const maxed = owned(3).map((m) => ({ ...m, level: moduleMaxLevel(m.rarity) }));
    for (let i = 0; i < 200; i++) {
      const hand = generateDraft({ faction: "bauhinia", shipLevel: 5, owned: maxed, activeBoons: [] });
      expect(hand.some((o) => o.kind === "upgrade"), "offered an upgrade with nothing upgradable").toBe(false);
    }
  });

  it("still produces a valid hand for a player who owns nothing at all", () => {
    for (let i = 0; i < 100; i++) {
      const hand = generateDraft({ faction: "riftEchoes", shipLevel: 1, owned: [], activeBoons: [] });
      expect(hand.length).toBe(3);
      for (const o of hand) {
        // 2026-08-30 起第三格还可能是余烬契约(data/pacts.ts)。
        expect(o.kind === "module" || o.kind === "boon" || o.kind === "pact").toBe(true);
      }
    }
  });

  it("prefers upgrading the module the player has invested in most", () => {
    const mods = [
      { ...drawModule("bauhiniaWeapon1"), id: "low", level: 1 },
      { ...drawModule("reaverWeapon1"), id: "high", level: 4 },
    ];
    const picks = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const hand = generateDraft({ faction: "bauhinia", shipLevel: 5, owned: mods, activeBoons: [] });
      const up = hand.find((o) => o.kind === "upgrade");
      if (up) picks.add(up.targetModuleId!);
    }
    expect([...picks], "upgrade offers should deepen the build, not scatter").toEqual(["high"]);
  });
});
