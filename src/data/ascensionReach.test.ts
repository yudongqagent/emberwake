import { describe, expect, it } from "vitest";
import { GALAXIES, STORY_SCENES } from "../state/store";
import { ENCOUNTER_DEFS, BOUNTY_ENCOUNTER_DEFS } from "./encounters";
import { HULL_CLASSES } from "./hullClasses";
import { xpToNextLevel } from "../engine/ships";

/** 一周目走完,六级重铸都得够得到。
 *
 * 2026-08-31(/loop 第 54 轮)。搜同类游戏搜到的一条:"经验曲线的形状必须匹配你
 * 设计的难度坡",以及"线性曲线在前期磨、在后期崩"。
 *
 * Emberwake 的 xpToNextLevel 是线性的(40 + 25×等级),而经验奖励随星区威胁**指数**
 * 增长。按每个 POI 打一遍的口径量下来:
 *
 *     威胁1 累计   354 → 4 级      威胁5 累计 2,320 → 12 级
 *     威胁2 累计   896 → 7 级      威胁6 累计 4,391 → 17 级
 *     威胁3 累计 1,180 → 8 级      威胁7 累计 8,656 → **25 级**
 *     威胁4 累计 1,579 → 10 级
 *
 * 而进阶门槛原来是 4 / 10 / 18 / 28 / 40 / 55。**打完整个战役是 25 级**,升到 55 级
 * 要 39,285 经验——还差 4.5 个战役。六级阶梯的上面三级在一周目里永远够不到,
 * 而标题屏幕写的正是"它不会被替换——只会被一级一级地重铸"。
 *
 * 这条守卫把"承诺"和"经济"拴在一起。 */

const byId = new Map([...ENCOUNTER_DEFS, ...BOUNTY_ENCOUNTER_DEFS].map((e) => [e.id, e]));

/** 每个星系一次性打完能拿多少经验(每个 POI 一遍,不刷)。 */
function xpByGalaxy(): Map<string, number> {
  const out = new Map<string, number>();
  for (const g of GALAXIES) {
    let xp = 0;
    for (const sys of g.systems) {
      for (const p of sys.pois) {
        xp += byId.get((p.data as { encounterId?: string } | undefined)?.encounterId ?? "")?.xp ?? 0;
      }
    }
    out.set(g.id, xp);
  }
  return out;
}

function levelFor(xp: number): number {
  let level = 1;
  let rest = xp;
  while (rest >= xpToNextLevel(level)) {
    rest -= xpToNextLevel(level);
    level++;
  }
  return level;
}

/** 一个剧情 flag 属于哪个星系(按设置它的那一幕所在的星系)。 */
function galaxyOfFlag(flag: string): string | null {
  const sysGalaxy = new Map<string, string>();
  for (const g of GALAXIES) for (const s of g.systems) sysGalaxy.set(s.id, g.id);
  for (const scene of STORY_SCENES) {
    const flags = [...(scene.onCompleteFlags ?? []), ...(scene.choices ?? []).flatMap((c) => c.setFlags ?? [])];
    if (flags.includes(flag) && scene.systemId) return sysGalaxy.get(scene.systemId) ?? null;
  }
  return null;
}

/** 走到那个星系末尾时,累计经验和等级。 */
function levelAtGalaxy(galaxyId: string): number {
  const xp = xpByGalaxy();
  let cum = 0;
  for (const g of [...GALAXIES].sort((a, b) => a.threat - b.threat)) {
    cum += xp.get(g.id) ?? 0;
    if (g.id === galaxyId) break;
  }
  return levelFor(cum);
}

const CAMPAIGN_END_LEVEL = levelFor([...xpByGalaxy().values()].reduce((a, b) => a + b, 0));

describe("进阶阶梯要够得到", () => {
  it("一周目的经验总量确实只够到二十几级——这是所有事的前提", () => {
    expect(CAMPAIGN_END_LEVEL).toBeGreaterThan(15);
    expect(CAMPAIGN_END_LEVEL, "经验总量变了,下面的门槛要跟着重算").toBeLessThan(40);
  });

  it("每一级重铸的等级门槛,都低于剧情放开它时玩家的等级", () => {
    const blocked: string[] = [];
    for (const h of HULL_CLASSES) {
      if (h.order === 0 || !h.unlockFlag) continue;
      const gid = galaxyOfFlag(h.unlockFlag);
      if (!gid) continue;
      const have = levelAtGalaxy(gid);
      if (have < h.minLevel) {
        blocked.push(`${h.id}: 剧情在${gid}放开它,那时玩家 ${have} 级,门槛却是 ${h.minLevel} 级`);
      }
    }
    expect(blocked, `剧情说可以进阶了,等级门槛说不行:\n${blocked.join("\n")}`).toEqual([]);
  });

  it("最高一级在一周目之内够得到——标题屏幕承诺的就是这个", () => {
    const top = Math.max(...HULL_CLASSES.map((h) => h.order));
    for (const h of HULL_CLASSES.filter((x) => x.order === top)) {
      expect(
        h.minLevel,
        `${h.id} 要 ${h.minLevel} 级,而打完整个战役只有 ${CAMPAIGN_END_LEVEL} 级——"一级一级地重铸"是句空话`,
      ).toBeLessThanOrEqual(CAMPAIGN_END_LEVEL);
    }
  });

  it("门槛仍然是递增的,而且不是零", () => {
    const byOrder = new Map<number, number>();
    for (const h of HULL_CLASSES) byOrder.set(h.order, h.minLevel);
    for (let o = 1; o <= Math.max(...byOrder.keys()); o++) {
      expect(byOrder.get(o)!, `第 ${o} 阶门槛不高于第 ${o - 1} 阶`).toBeGreaterThan(byOrder.get(o - 1)!);
    }
  });

  it("精华也够——等级不是唯一的门", () => {
    const need = HULL_CLASSES.filter((h) => h.order > 0)
      .reduce((acc, h) => {
        acc.set(h.order, h.essenceCost);
        return acc;
      }, new Map<number, number>());
    const total = [...need.values()].reduce((a, b) => a + b, 0);
    // 一周目的本源精华总量约 2,475(见第 48 轮的账)。
    expect(total, `走完一条进阶路要 ${total} 精华`).toBeLessThan(2400);
  });
});
