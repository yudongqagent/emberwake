import { describe, expect, it } from "vitest";
import { generateDraft, draftTierFor } from "./draft";
import { moduleDefById } from "./modules";
import { moduleEffectById } from "./moduleEffects";
import { drawModule, moduleMaxLevel } from "../engine/modules";
import { autoEquip } from "../state/store";
import STORE_SRC from "../state/store.ts?raw";
import { MODULE_DEFS } from "./moduleDefs";
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

// 2026-08-30 实测(/loop 第 8 轮):抉择给你一件装备,**下一屏就是"继续推进还是
// 撤离"**,中间没有任何装配的机会——那件装备在这次出击里完全是死的。
//
// 搜到的原则:「奖励应当立即兑现,否则玩家会觉得刚才做的事没有意义」。杀戮尖塔
// 的牌进牌库立刻能抽到,哈迪斯的祝福当场生效。
describe("抽到的模组要立刻能用", () => {
  const shipWith = (equipped: (string | null)[]) => ({
    id: "s", hullClass: "corvette" as const, rarity: "salvage" as const, aptitude: null,
    scanned: true, name: "Whisper", level: 1, xp: 0, equipped, currentHp: 100,
    rolls: { hull: 0.5, power: 0.5, speed: 0.5, evasion: 0.5, crit: 0.5 }, ascendedFrom: [],
  });

  it("有对应空槽时,自动装上", () => {
    // 护卫舰是 weapon/armor/engine/utility 各一格,开局占了武器和护甲
    // ——引擎和辅助是空的。
    const engine = MODULE_DEFS.find((d) => d.type === "engine")!;
    const mod = { ...drawModule(engine.id), id: "newEngine" };
    const before = shipWith(["w", "a", null, null]);
    const after = autoEquip(before, mod);
    expect(after.equipped[2], "引擎槽是空的,却没有自动装上").toBe("newEngine");
  });

  it("对应槽位已占用时,不动它", () => {
    // 换掉已装备的那件是有取舍的决定(词条、门派套装、功率),不该由游戏替玩家做。
    const weapon = MODULE_DEFS.find((d) => d.type === "weapon")!;
    const mod = { ...drawModule(weapon.id), id: "newWeapon" };
    const before = shipWith(["w", "a", null, null]);
    const after = autoEquip(before, mod);
    expect(after.equipped[0], "把玩家已经装着的武器换掉了").toBe("w");
    expect(after.equipped).not.toContain("newWeapon");
  });

  it("只填第一个空槽,不会一次占两格", () => {
    const engine = MODULE_DEFS.find((d) => d.type === "engine")!;
    const mod = { ...drawModule(engine.id), id: "e1" };
    const after = autoEquip(shipWith([null, null, null, null]), mod);
    expect(after.equipped.filter((x) => x === "e1")).toHaveLength(1);
  });
});

// 2026-08-31 实测(/loop 第 10 轮):自动装备原来只做在整备抉择那一条路径上。
// 同一场战斗掉的「小节推进器 MK2」躺在库存里,而**引擎槽是空的**。
// 三条给模组的路径(抉择 / 战斗掉落 / 裂隙掉落)各写各的,所以修了一条,
// 另外两条还是老样子。
describe("所有给模组的路径都走同一条规则", () => {
  it("store 里只有一个地方把模组塞进背包", () => {
    // 这条是结构性的守卫:只要有人再写一个 `modules: [...state.value.modules, x]`,
    // 自动装备就又会漏掉一条路径,而且不会有任何报错。
    const src = STORE_SRC;
    const inlinePushes = (src.match(/modules:\s*\[\s*\.\.\.state\.value\.modules,/g) ?? []).length;
    expect(
      inlinePushes,
      `有 ${inlinePushes} 处直接往 modules 里塞东西;应该只有 receiveModule 一处`,
    ).toBeLessThanOrEqual(1);
  });

  it("战斗掉落和裂隙掉落都经过 receiveModule", () => {
    expect(STORE_SRC).toMatch(/if \(bonusDrop\) receiveModule\(bonusDrop\)/);
    expect(STORE_SRC).toMatch(/receiveModule\(drop\)/);
  });
});
