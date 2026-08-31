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

  it("一件装甲不该独自挡下全游戏最重的一击", () => {
    // 第 21 轮写这条时,断言的是 `best > maxEnemyDamage` —— 那是把当时的病钉下来:
    // 单件 mk5 满级装甲 158 格挡,而全游戏最重一击只有 132。第 22 轮按星区威胁
    // 重算了敌人数值(tools/genEnemyScale.py),最重一击变成 1177,于是这条断言
    // 反过来了。方向反过来正是修好的样子,所以这里改成钉住健康的那一边。
    const armors = MODULE_DEFS.filter((d) => d.type === "armor" && d.baseBlock);
    const best = Math.max(...armors.map((d) => computeModuleBlock(armor(d.id, "mk5", moduleMaxLevel("mk5")))));
    expect(best, "单件练满的装甲又一次盖过了全游戏最重的一击").toBeLessThan(maxEnemyDamage());

    // 而且就算把装甲槽全配满,也仍然要挨到伤害——这是上限那条规则兜的底。
    const slots = Math.max(...HULL_CLASSES.map((h) => h.slots.armor));
    expect(
      resolveAttack(maxEnemyDamage(), best * slots, 0, 1, 0.99, 0).damageDealt,
      "配满装甲后最重的一击几乎不疼了",
    ).toBeGreaterThan(maxEnemyDamage() * 0.2);
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
