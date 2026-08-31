import { describe, expect, it } from "vitest";
import { resolveAttack, MAX_BLOCK_FRACTION } from "./combat";
import { computeModuleBlock, moduleMaxLevel } from "./modules";
import { MODULE_DEFS } from "../data/moduleDefs";
import { HULL_CLASSES } from "../data/hullClasses";
import ENCOUNTERS_SRC from "../data/encounters.ts?raw";
import type { ModuleInstance } from "../data/types";

/** 2026-08-31(/loop 第 21 轮)。格挡原来是直接减法,而两边量级差了一个数量级:
 *
 *     全游戏 92 个敌人条目的伤害:  最小 4   中位 15   最大 132
 *     单件 mk5 满级装甲的格挡:                        158
 *     11 个装甲槽配满:                               1487
 *
 * 一件练满的装甲就超过了全游戏最重的一击。之后每次挨打都落在 max(1, …) 的地板上。
 * 55 级存档在威胁 7 的星区打完一整场,战后报告写「承受伤害 0」——游戏打不输了。 */

function armor(defId: string, rarity: ModuleInstance["rarity"], level: number): ModuleInstance {
  return { id: "a", defId, rarity, level, traits: [], lockedTraitSlot: null, quality: 1 };
}

/** 敌人伤害的真实上限,从数据里量,不是手写的。数据涨了这条测试要跟着说话。 */
function maxEnemyDamage(): number {
  const all = [...ENCOUNTERS_SRC.matchAll(/damage:\s*(\d+)/g)].map((m) => Number(m[1]));
  expect(all.length, "一条 damage 都没匹配到,这测试就是假的").toBeGreaterThan(50);
  return Math.max(...all);
}

describe("格挡不能把游戏变成打不输", () => {
  it("再厚的格挡也拦不掉一整击", () => {
    const dmg = maxEnemyDamage();
    // 全副 mk5 满级装甲的量级
    const r = resolveAttack(dmg, 5000, 0, 1, 0.99, 0);
    expect(r.damageDealt, "格挡 5000 挡下了全游戏最重的一击,只留下地板伤害").toBe(
      Math.round(dmg * (1 - MAX_BLOCK_FRACTION)),
    );
    expect(r.damageDealt).toBeGreaterThan(1);
  });

  it("一件练满的装甲不该超过全游戏最重的一击太多——但即便超过也不再等于无敌", () => {
    const armors = MODULE_DEFS.filter((d) => d.type === "armor" && d.baseBlock);
    const best = Math.max(...armors.map((d) => computeModuleBlock(armor(d.id, "mk5", moduleMaxLevel("mk5")))));
    const slots = Math.max(...HULL_CLASSES.map((h) => h.slots.armor));
    // 这两个数字就是问题本身,钉下来当文档
    expect(best, "单件 mk5 满级装甲的格挡").toBeGreaterThan(maxEnemyDamage());
    expect(best * slots, "配满装甲的格挡量级").toBeGreaterThan(1000);
    // 但打进来仍然要疼
    expect(resolveAttack(maxEnemyDamage(), best * slots, 0, 1, 0.99, 0).damageDealt).toBeGreaterThan(10);
  });

  it("早期完全不受影响:格挡还没到伤害的 75% 时,行为和原来一模一样", () => {
    // mk1 1 级装甲 ≈ 8 格挡,对上中位伤害 15
    for (const [dmg, block] of [[15, 8], [20, 10], [30, 4], [12, 9]] as const) {
      const capped = resolveAttack(dmg, block, 0, 1, 0.99, 0).damageDealt;
      expect(capped, `伤害 ${dmg} / 格挡 ${block} 的结果变了,这一段本该原样`).toBe(Math.max(1, dmg - block));
    }
  });

  it("同一条规则对敌人生效:玩家的小伤害打高格挡不再永远只有 1 点", () => {
    // 早期玩家伤害 20 打锚定舰的格挡 56
    expect(resolveAttack(20, 56, 0, 1, 0.99, 0).damageDealt).toBe(5);
  });

  it("闪避照旧优先于格挡", () => {
    expect(resolveAttack(100, 0, 0.5, 1, 0.2, 0).hit).toBe(false);
  });
});
