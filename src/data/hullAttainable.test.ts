import { describe, expect, it } from "vitest";
import { STORY_SCENES, GALAXIES } from "../state/store";
import { HULL_CLASSES } from "./hullClasses";
import { ENCOUNTER_DEFS, BOUNTY_ENCOUNTER_DEFS } from "./encounters";
import { applyEmberLoad } from "./emberLoad";
import { computeMaxHull } from "../engine/ships";
import { resolveAttack } from "../engine/combat";

/** 每一阶船体都得**在战役之内真的开上**,不能是通关奖杯。
 *
 * 2026-08-31(/loop 第 56 轮)。搜同类游戏搜到的是:"让世界对玩家的成长有反应"。
 * Emberwake 的标题屏幕就写着这句承诺——"它不会被替换,只会被一级一级地重铸,
 * 而它每亮一分,星海就多注视你一分"。而那个"注视"确实做了(余烬负荷:每进阶
 * 一次,敌人数值和角色都升一档)。
 *
 * 问题在"一级一级地重铸"的**最后一级**:anthem/sanctum 的解锁 flag 原来是
 * `act6.civilizationDisqualified.cleared`,而那是**打完终局之后**才产生的。
 * 玩家在整个战役里从来没开过第六阶。
 *
 * 量出来的后果:
 *
 *     第5阶 主权级   船体 5,402   终局最重一击 1,404 = **26%**   4 下打死
 *     第6阶 圣颂级   船体 7,592              1,484 =  20%    6 下
 *
 * 26% 越过了 difficultyRamp.test.ts 那条 25% 的线——而那条守卫**看不见**,因为
 * 它的 expectedHull 假设玩家开着和星区同阶的船。假设本身是假的。
 *
 * 这和第 54 轮是同一个病:那一轮修的是等级门槛(六阶只够得到三阶),这一轮修的是
 * 剧情门槛(第六阶在终局之后)。两次都不是"少了点内容",而是**难度守卫的前提
 * 被悄悄架空**。所以这条守卫直接盯前提本身。 */

const sceneIndexOfFlag = (flag: string): number =>
  STORY_SCENES.findIndex((s) => {
    const flags = [...(s.onCompleteFlags ?? []), ...(s.choices ?? []).flatMap((c) => c.setFlags ?? [])];
    return flags.includes(flag);
  });

/** 战役最后一场仗 = 剧情上排在最后的那场带 victoryFlag 的战斗。
 *
 * 第一版按"星区威胁最高"挑,而同一个星区里有好几场,`g.threat > lastThreat`
 * 只在威胁**严格更高**时才更新,于是留下的是那个星区里遇到的**第一场**,不是
 * 终局。守卫因此在数据已经改对之后仍然报红——夹具挑错了对象。
 * 现在按它前置剧情点在 STORY_SCENES 里的位置排,取最靠后的那一场。 */
function finalCombat() {
  const byId = new Map([...ENCOUNTER_DEFS, ...BOUNTY_ENCOUNTER_DEFS].map((e) => [e.id, e]));
  let best: { encounterId: string; requiresFlag?: string; rank: number } | null = null;
  for (const g of GALAXIES) {
    for (const sys of g.systems) {
      for (const p of sys.pois) {
        const d = p.data as { encounterId?: string; victoryFlag?: string } | undefined;
        if (!d?.victoryFlag || !d.encounterId || !byId.has(d.encounterId)) continue;
        const rank = g.threat * 1000 + (p.requiresFlag ? sceneIndexOfFlag(p.requiresFlag) : 0);
        if (!best || rank > best.rank) best = { encounterId: d.encounterId, requiresFlag: p.requiresFlag, rank };
      }
    }
  }
  return { ...best!, def: byId.get(best!.encounterId)! };
}

describe("船体阶梯要在战役之内开得上", () => {
  it("每一阶的解锁点都在战役最后一场仗之前", () => {
    const fin = finalCombat();
    const gate = fin.requiresFlag ? sceneIndexOfFlag(fin.requiresFlag) : STORY_SCENES.length - 1;
    expect(gate, "找不到最后一场仗的前置剧情点").toBeGreaterThanOrEqual(0);
    const late: string[] = [];
    for (const h of HULL_CLASSES) {
      if (h.order === 0 || !h.unlockFlag) continue;
      const idx = sceneIndexOfFlag(h.unlockFlag);
      if (idx < 0) continue;
      if (idx > gate) late.push(`${h.id}(第${h.order}阶): 解锁在 ${h.unlockFlag},那已经在最后一战之后了`);
    }
    expect(late, `这些船体是通关奖杯,不是能开上战场的船:\n${late.join("\n")}`).toEqual([]);
  });

  /** 难度守卫假设玩家开着和星区同阶的船。这条把那个假设本身钉住。 */
  it("最后一战里,玩家开得上的最好的船挨得住", () => {
    const fin = finalCombat();
    const topOrder = Math.max(...HULL_CLASSES.map((h) => h.order));
    // 2026-08-31(第 57 轮修正):上一版这里用的是 `topOrder`(= 6),把负荷算少了。
    // 真实负荷是 store.ts 的 emberLoad():进阶次数 + 主动负荷 + regionThreatLoad(),
    // 而最后那一项在最深的星区有一条 ceil(威胁-1 × 0.4) 的地板。
    // 第七星区、6 次进阶、25 级 → 6 + 0 + 3 = **9**。守卫按真实值算,不然它守的
    // 是一个比实际轻的世界。
    const finalThreat = Math.max(...GALAXIES.map((g) => g.threat));
    const regionFloor = Math.ceil((finalThreat - 1) * 0.4);
    const realLoad = topOrder + regionFloor;
    const scaled = applyEmberLoad(fin.def, realLoad);
    const worst = Math.max(...scaled.enemies.map((e) => e.damage));
    const landed = resolveAttack(worst, 0, 0, 1, 0.99, 0).damageDealt;
    for (const h of HULL_CLASSES.filter((x) => x.order === topOrder)) {
      const hull = computeMaxHull({ hullClass: h.id, rarity: "salvage", level: 25 });
      const frac = landed / hull;
      expect(
        frac,
        `${h.id} 在最后一战里一击就掉 ${(frac * 100).toFixed(0)}% 船体,${Math.ceil(1 / frac)} 下就死`,
      ).toBeLessThan(0.25);
    }
  });

  /** 顺带钉住"越亮越被注视":进阶必须真的把难度抬上去,否则那句承诺是空的。 */
  it("每进阶一次,敌人确实更难打", () => {
    const fin = finalCombat();
    const at = (load: number) => {
      const e = applyEmberLoad(fin.def, load);
      return e.enemies.reduce((a, x) => a + x.hull, 0);
    };
    expect(at(6), "进阶六次之后敌人没有变强——'每亮一分星海就多注视你一分'是空话").toBeGreaterThan(at(0) * 1.4);
  });
});
