import { describe, expect, it } from "vitest";
import { PACTS, PACT_IDS, isPact, pactModifiers, NO_PACTS } from "./pacts";
import { generateDraft } from "./draft";
import type { ModuleInstance } from "./types";

// Vite 的 ?raw 导入,避免依赖 node 的类型。
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 契约在战斗里真正被读的那些系数名。一条契约如果只改了这里的数字、却没有任何
 * 战斗代码读它,它就是又一个"列出来却没接"的死东西——今天已经修掉四个了。 */
const HOOK_TO_FIELD: Record<string, keyof typeof NO_PACTS> = {
  cadence: "cadenceMult",
  armorBlock: "blockMult",
  lockBand: "lockedBand",
  bandDamage: "lockedBandDamageMult",
  brace: "braceReduction",
  evasion: "evasionMult",
  novaCharge: "novaChargeMult",
  maxHull: "maxHullMult",
};

describe("余烬契约", () => {
  it("每一条契约声明的每一个接入点,都真的在 Combat.tsx 里被读", () => {
    // 这条是整套东西的守卫。契约的意义是"改玩法",而改玩法必须落在战斗代码上;
    // 只改一个没人读的系数,和 approval / lockedTraitSlot / unlockHullClass
    // 那几个死字段是同一种东西。
    for (const p of PACTS) {
      for (const hook of p.hooks) {
        const field = HOOK_TO_FIELD[hook];
        expect(field, `契约 "${p.id}" 的接入点 "${hook}" 没有对应的系数`).toBeDefined();
        expect(
          COMBAT_SRC.includes(`pacts.${field}`) || COMBAT_SRC.includes(`pactsRef.current.${field}`),
          `契约系数 "${field}"(来自 ${p.id})在 Combat.tsx 里没有任何地方读它`,
        ).toBe(true);
      }
    }
  });

  it("每一条契约都同时有好处和代价", () => {
    // "只有好处"的东西是加成,不是契约。契约存在的理由是它让这一局和上一局
    // 不一样,而不是让你更强。
    for (const id of PACT_IDS) {
      const m = pactModifiers([id]);
      const changed = (Object.keys(NO_PACTS) as (keyof typeof NO_PACTS)[])
        .filter((k) => m[k] !== NO_PACTS[k]);
      expect(changed.length, `契约 "${id}" 什么都没改`).toBeGreaterThanOrEqual(2);
    }
  });

  it("没有契约时,一切照旧", () => {
    expect(pactModifiers([])).toEqual(NO_PACTS);
    // 普通增益(效果 id)不该被误认成契约。
    expect(pactModifiers(["coolant", "regen", "crit"])).toEqual(NO_PACTS);
  });

  it("孤注一掷:快得多,但完全不挡", () => {
    const m = pactModifiers(["allIn"]);
    expect(m.cadenceMult).toBeLessThan(1);
    expect(m.blockMult).toBe(0);
  });

  it("铁壁和孤注一掷方向相反", () => {
    const a = pactModifiers(["allIn"]), w = pactModifiers(["ironWall"]);
    expect(w.cadenceMult).toBeGreaterThan(1);
    expect(a.cadenceMult).toBeLessThan(1);
    expect(w.blockMult).toBeGreaterThan(1);
    expect(a.blockMult).toBeLessThan(1);
  });

  it("同时拿到两条时相乘,不会互相覆盖", () => {
    const both = pactModifiers(["allIn", "ironWall"]);
    expect(both.cadenceMult).toBeCloseTo(0.6 * 1.5, 5);
    // 孤注把格挡归零,乘以铁壁的 2 仍然是 0——玩家自己选的组合,不该偷偷救他。
    expect(both.blockMult).toBe(0);
  });

  it("锁位契约会真的锁住一个档位", () => {
    expect(pactModifiers(["lockClose"]).lockedBand).toBe("close");
    expect(pactModifiers(["lockLong"]).lockedBand).toBe("long");
    expect(pactModifiers(["lockClose"]).lockedBandDamageMult).toBeGreaterThan(1);
  });

  it("isPact 认得出契约,也认得出普通效果不是契约", () => {
    for (const id of PACT_IDS) expect(isPact(id)).toBe(true);
    for (const id of ["crit", "coolant", "hullBonus"]) expect(isPact(id)).toBe(false);
  });

  it("改装征召确实会发契约", () => {
    // 只改数据不接到抉择界面,玩家永远拿不到。
    const owned: ModuleInstance[] = [];
    let sawPact = false;
    for (let i = 0; i < 400; i++) {
      const hand = generateDraft({ faction: "reavers", shipLevel: 5, owned, activeBoons: [] });
      if (hand.some((o) => o.kind === "pact" && o.pactId && isPact(o.pactId))) { sawPact = true; break; }
    }
    expect(sawPact, "抽了 400 次也没抽到契约").toBe(true);
  });

  it("已经拿过的契约不会再发一次", () => {
    for (let i = 0; i < 200; i++) {
      const hand = generateDraft({ faction: "reavers", shipLevel: 5, owned: [], activeBoons: [], activePacts: [...PACT_IDS] });
      const dup = hand.find((o) => o.kind === "pact");
      expect(dup, "重复发了已经生效的契约").toBeUndefined();
    }
  });

  it("每条契约中英文案都有,不会在界面上蹦出 id", () => {
    const strings = STRINGS_SRC;
    for (const id of PACT_IDS) {
      expect(strings.includes(`"pact.${id}"`), `契约 "${id}" 缺名字`).toBe(true);
      expect(strings.includes(`"pact.${id}.desc"`), `契约 "${id}" 缺说明`).toBe(true);
    }
  });
});
