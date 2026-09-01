import { describe, expect, it } from "vitest";
import { CREW_DEFS } from "../../data/crew";
import { HULL_CLASS_ABILITIES } from "../../data/namedShips";
import COMBAT_SRC from "./Combat.tsx?raw";

/** 每一个主动技能都得真的改变点什么。
 *
 * 2026-08-31(/loop 第 69 轮)。搜到的说法:重构最容易留下的是"静默改坏"——覆盖率
 * 不够的地方,能力会在系统重写之后悄悄变成空壳。
 *
 * 上一轮就撞到两个:「闪避冲刺」和「相位跃迁」都写着"立即重新定位",而实现只推了
 * 渲染用的精灵坐标——因为距离档位在"舰桥指挥"重构里从 x/y 变成了独立状态,
 * 而这两个技能没跟着改。
 *
 * 那一轮是靠手工读代码发现的。这条守卫把那次审计固化下来:21 个主动技能,每一个
 * 都必须有实现分支,而且分支里必须有**真正的状态改动**,不能只有特效和日志。
 *
 * 判据刻意宽:setX(...)、给 nextEnemies 赋值、写某个 Ref.current、或调用已知会改
 * 状态的函数,任一即可。写窄了会出假阳性——第一次手工扫的时候我的正则就把
 * targetLock 判成了"只有特效",因为它是用 `nextEnemies = enemies.map(...)` 改的,
 * 不是 setX()。假阳性比没有守卫更糟(第 28 轮的教训)。 */

const ABILITY_IDS = [
  ...CREW_DEFS.map((c) => c.abilityId),
  ...HULL_CLASS_ABILITIES.map((h) => h.abilityId),
].filter((x): x is string => !!x);

/** 一个技能分支的源码:从它的判断开始,到下一个技能分支为止。 */
function branchOf(id: string): string | null {
  const start = COMBAT_SRC.indexOf(`abilityId === "${id}"`);
  if (start < 0) return null;
  const rest = COMBAT_SRC.slice(start + id.length + 16);
  const next = rest.indexOf('abilityId === "');
  return rest.slice(0, next >= 0 ? next : 2000);
}

/** "真的改变了点什么"的宽判据。 */
const MUTATES = /set[A-Z]\w*\(|nextEnemies\s*=|\w+Ref\.current\s*=|jumpOneBand\(/;

describe("主动技能不能是空壳", () => {
  it("确实有一批主动技能,不是空转", () => {
    expect(new Set(ABILITY_IDS).size).toBeGreaterThan(15);
  });

  it("每个技能都有实现分支", () => {
    const missing = [...new Set(ABILITY_IDS)].filter((id) => branchOf(id) === null);
    expect(missing, `这些技能在战斗里没有任何实现:\n${missing.join("\n")}`).toEqual([]);
  });

  it("每个分支都真的改变了状态,不只是放特效和写日志", () => {
    const hollow = [...new Set(ABILITY_IDS)].filter((id) => {
      const body = branchOf(id);
      return body !== null && !MUTATES.test(body);
    });
    expect(
      hollow,
      `这些技能只有特效和日志——描述承诺的事一件都没发生:\n${hollow.join("\n")}`,
    ).toEqual([]);
  });

  /** 反过来也要查:数据里删了的技能,战斗里不该还留着一个够不到的分支。 */
  it("没有够不到的孤儿分支", () => {
    const implemented = [...COMBAT_SRC.matchAll(/abilityId === "(\w+)"/g)].map((m) => m[1]);
    const known = new Set(ABILITY_IDS);
    const orphans = [...new Set(implemented)].filter((id) => !known.has(id));
    expect(orphans, `战斗里有分支,但数据里已经没有这些技能了:\n${orphans.join("\n")}`).toEqual([]);
  });

  /** 上一轮那两个的具体形状也钉住:说"重新定位"的,得动档位。 */
  it("说重新定位的技能,分支里要有换档", () => {
    for (const id of ["evasiveBurn", "blinkVector"]) {
      expect(branchOf(id), `${id} 没有实现分支`).toBeTruthy();
      expect(branchOf(id)!, `${id} 又变回只推精灵坐标了`).toMatch(/jumpOneBand\(\)/);
    }
  });
});

/** 说明文案也得带数字——第 30 轮给模组词条、第 53 轮给教学文案立过的同一条规矩,
 * 技能这一层一直没修:21 条里有 **16 条一个数字都没有**。
 *
 *     野战维修 — 战斗中为旗舰恢复船体。          (恢复多少?)
 *     低价倾销 — 使所有敌人的格挡降低,持续两回合。 (降多少?)
 *     掠夺者切割 — 所有敌人在一回合内受到额外伤害。 (多多少?)
 *
 * 而这些是玩家**每场仗都要按**的按钮。 */
describe("技能说明要带数字", () => {
  it("每条技能说明里都有数字", () => {
    const bare = [
      ...CREW_DEFS.map((c) => [c.id, c.active] as const),
      ...HULL_CLASS_ABILITIES.map((h) => [h.id, h.active] as const),
    ].filter(([, txt]) => txt && !/\d/.test(txt));
    expect(
      bare.map(([id, txt]) => `${id}: ${txt}`),
      `这些技能说明一个数字都没有,玩家没法判断该不该按:\n${bare.map(([id]) => id).join(", ")}`,
    ).toEqual([]);
  });
});
