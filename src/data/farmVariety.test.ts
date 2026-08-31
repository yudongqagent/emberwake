import { describe, expect, it } from "vitest";
import { GALAXIES } from "../state/store";
import { ENCOUNTER_DEFS, BOUNTY_ENCOUNTER_DEFS } from "./encounters";
import type { EncounterDef } from "./types";

/** 后期星区不能只有一场仗可打。
 *
 * 2026-08-31(/loop 第 45 轮)。搜同类游戏,反复出现的差评是中段"重复"、"就是干等着
 * 什么事发生"。回头量 Emberwake,发现**可反复打的仗随威胁度倒着塌**:
 *
 *     紫荆疆域   威胁 1   4 场可反复打   3 种
 *     狮心广域   威胁 2   3 场           3 种
 *     天鹅域     威胁 3   **1 场**       1 种
 *     破碎帷幕   威胁 4   2 场           2 种
 *     深源       威胁 5   **1 场**       1 种
 *     暗影线     威胁 6   **1 场**       1 种
 *     圣咏深渊   威胁 7   **1 场**       1 种
 *
 * 而那几场唯一的仗全是"一个敌人、零角色"的纯血包。也就是说:玩家要在深源刷级,
 * 唯一的选择是同一个沙包反复捶——恰好是搜出来那句差评的字面形状。
 *
 * 更糟的是方向反了:新手村内容最多,而**需要刷的是后期**——等级门槛、装备、
 * 声望全压在那儿。
 *
 * 这条守卫盯两件事:数量,以及"这些仗问的是不是同一个问题"。 */

const byId = new Map<string, EncounterDef>(
  [...ENCOUNTER_DEFS, ...BOUNTY_ENCOUNTER_DEFS].map((e) => [e.id, e]),
);

/** 一个星区里"能反复打"的仗——有 respawnSeconds 才算,一次性剧情战不算。 */
function farmable(galaxyId: string): EncounterDef[] {
  const g = GALAXIES.find((x) => x.id === galaxyId)!;
  const out: EncounterDef[] = [];
  for (const sys of g.systems) {
    for (const p of sys.pois) {
      const d = p.data as { encounterId?: string; respawnSeconds?: number } | undefined;
      if (!d?.encounterId || !d.respawnSeconds) continue;
      const def = byId.get(d.encounterId);
      if (def) out.push(def);
    }
  }
  return out;
}

describe("每个星区都得有的打,而且不止一种打法", () => {
  it("没有哪个星区只剩一场可反复打的仗", () => {
    const thin = GALAXIES.map((g) => ({ g, f: farmable(g.id) }))
      .filter((r) => new Set(r.f.map((d) => d.id)).size < 3)
      .map((r) => `威胁${r.g.threat} ${r.g.id}: 只有 ${new Set(r.f.map((d) => d.id)).size} 场`);
    expect(thin, `刷级只剩一个沙包可捶:\n${thin.join("\n")}`).toEqual([]);
  });

  /** 数量本身不解决问题——三场一模一样的仗还是一场仗。 */
  it("每个星区的可反复打的仗里至少有两种角色", () => {
    for (const g of GALAXIES) {
      const roles = new Set(farmable(g.id).flatMap((d) => d.enemies.map((e) => e.role ?? "plain")));
      expect(
        roles.size,
        `威胁${g.threat} ${g.id} 可反复打的仗只问一个问题(${[...roles]}),打三遍等于打一遍`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  /** 方向不能反:需要刷的是后期,不该是新手村内容最多。 */
  it("后期星区不比新手村的选择少", () => {
    const sorted = [...GALAXIES].sort((a, b) => a.threat - b.threat);
    const first = new Set(farmable(sorted[0].id).map((d) => d.id)).size;
    for (const g of sorted.slice(1)) {
      const n = new Set(farmable(g.id).map((d) => d.id)).size;
      expect(n, `威胁${g.threat} ${g.id} 只有 ${n} 场,比新手村的 ${first} 场还少`).toBeGreaterThanOrEqual(first - 1);
    }
  });

  /** 带角色的那艘要在数值上就看得出来,否则"先打谁"是猜的。
   *
   * 判据刻意是"不一样",不是"更强":修复舰**更脆**才是对的读法(先秒它),而炮击舰
   * 该更硬更疼(值得为它改打击顺序)。方向由设计决定,守卫只管不许一模一样——
   * 第一版写成"必须更强",立刻把 bountyRiftScavengers 那条本来就对的判成了错。
   *
   * 它同时抓出了三条**旧**内容:掠夺者残党、船坞拾荒者、圣咏散兵,带角色的那艘
   * 和护卫数值完全相同——角色标签在打,数值上却没有任何理由先打它。 */
  it("带角色的敌人和同场的护卫不能数值全等", () => {
    for (const g of GALAXIES) {
      for (const def of farmable(g.id)) {
        const lead = def.enemies.find((e) => e.role);
        const plain = def.enemies.find((e) => !e.role);
        if (!lead || !plain) continue;
        expect(
          lead.hull !== plain.hull || lead.damage !== plain.damage,
          `${def.id}: 带 ${lead.role} 的那艘和护卫数值全等,玩家没有理由先打它`,
        ).toBe(true);
      }
    }
  });
});
