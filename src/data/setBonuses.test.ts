import { describe, expect, it } from "vitest";
import { FAMILY_SETS, activeSetBonuses, setProgress, SET_TWO, SET_FOUR } from "./setBonuses";
import { MODULE_DEFS } from "./modules";
import { MODULE_EFFECTS } from "./moduleEffects";
import type { ModuleFamily, ModuleInstance } from "./types";
import { HULL_CLASSES } from "./hullClasses";
import { ACT1_SCENES } from "./story/act1";
import { ACT2_SCENES } from "./story/act2";
import { ACT3_SCENES } from "./story/act3";
import { ACT4_SCENES } from "./story/act4";
import { ACT5_SCENES } from "./story/act5";
import { ACT6_SCENES } from "./story/act6";

const ALL_STORY = [...ACT1_SCENES, ...ACT2_SCENES, ...ACT3_SCENES, ...ACT4_SCENES, ...ACT5_SCENES, ...ACT6_SCENES];

const EFFECT_IDS = new Set(MODULE_EFFECTS.map((e) => e.id));

function inst(defId: string): ModuleInstance {
  return { id: `i-${defId}`, defId, rarity: "mk1", level: 1, traits: [], lockedTraitSlot: null, quality: 0.5 };
}

/** 取某家族的 n 件模组。 */
function fromFamily(fam: ModuleFamily, n: number): ModuleInstance[] {
  return MODULE_DEFS.filter((d) => d.family === fam).slice(0, n).map((d) => inst(d.id));
}

describe("门派套装", () => {
  it("每个家族都有一套,不会有哪一派穿了没奖励", () => {
    const families = new Set(MODULE_DEFS.map((d) => d.family));
    for (const f of families) {
      expect(FAMILY_SETS.some((s) => s.family === f), `家族 "${f}" 没有套装`).toBe(true);
    }
  });

  it("套装发的必须是**已实现**的效果 id", () => {
    // 这是整个设计的支点:只发已实现的效果,套装就不可能变成"列了却没接"的假内容。
    for (const s of FAMILY_SETS) {
      expect(EFFECT_IDS, `${s.family} 的两件套效果 "${s.two}" 不存在`).toContain(s.two);
      expect(EFFECT_IDS, `${s.family} 的四件套效果 "${s.four}" 不存在`).toContain(s.four);
      expect(s.two, `${s.family} 的两件套和四件套是同一个效果`).not.toBe(s.four);
    }
  });

  it("凑够两件才生效,一件不算", () => {
    expect(activeSetBonuses(fromFamily("reaver", 1))).toEqual([]);
    const two = activeSetBonuses(fromFamily("reaver", SET_TWO));
    expect(two).toHaveLength(1);
    expect(two[0].effects).toEqual(["pointBlank"]);
  });

  it("四件套时两件套依然生效,而不是被顶掉", () => {
    // 「升级换掉旧奖励」是最容易写错、也最气人的一种套装:玩家凑到第四件,
    // 结果前面那个效果没了。
    const four = activeSetBonuses(fromFamily("reaver", SET_FOUR));
    expect(four[0].effects).toEqual(["pointBlank", "rampage"]);
  });

  it("只数已装备的,仓库里堆着不算", () => {
    // 否则套装就只是"你拥有过什么"的记录,不是一个配装决定。
    expect(activeSetBonuses([])).toEqual([]);
  });

  it("混装两派会同时吃到两派的两件套", () => {
    const mixed = [...fromFamily("reaver", 2), ...fromFamily("choir", 2)];
    const active = activeSetBonuses(mixed);
    expect(active.map((a) => a.family).sort()).toEqual(["choir", "reaver"]);
    for (const a of active) expect(a.effects).toHaveLength(1);
  });

  it("进度表会列出还没凑够的,玩家才看得见'再来一件就成套'", () => {
    const rows = setProgress(fromFamily("hollow", 3));
    expect(rows).toHaveLength(1);
    expect(rows[0].pieces).toBe(3);
    expect(rows[0].set.family).toBe("hollow");
  });

  it("件数多的排前面", () => {
    const mixed = [...fromFamily("reaver", 2), ...fromFamily("choir", 4)];
    expect(activeSetBonuses(mixed)[0].family).toBe("choir");
  });

  it("每个家族的四件都凑得出来——槽位不够就等于这套永远拿不到", () => {
    // 每个家族在四种槽位上各有五件,所以四件套一定可以在 weapon/armor/engine/
    // utility 各取一件凑成。如果以后有家族只做武器,这条会失败。
    for (const s of FAMILY_SETS) {
      const types = new Set(MODULE_DEFS.filter((d) => d.family === s.family).map((d) => d.type));
      expect(types.size, `家族 "${s.family}" 只有 ${types.size} 种槽位,凑不出四件套`).toBeGreaterThanOrEqual(4);
    }
  });
});

// 舰级解锁提示的数据侧保证。手写的 `unlockHullClass` 字段(五处声明、零处读取)
// 已经删掉,改成从 hullClasses 的 unlockFlag 反推——两份真相里,能自动对上的
// 那一份才是真的。
describe("舰级解锁", () => {
  it("每个带解锁 flag 的舰级,那个 flag 都真的会被某场戏设上", () => {
    // 否则那条舰级永远解不开,而且不会有任何报错。
    const setFlags = new Set(ALL_STORY.flatMap((s) => s.onCompleteFlags));
    for (const h of HULL_CLASSES) {
      if (h.unlockFlag === null) continue;
      expect(setFlags, `舰级 "${h.id}" 等的 flag "${h.unlockFlag}" 没有任何场景会设上`).toContain(h.unlockFlag);
    }
  });

  it("一个 flag 一次开出的所有舰级都会被提示到", () => {
    // 手写字段一处只写得下一个,而实测「本源潮汐」那一场同时开出歼星舰和掠夺舰
    // ——照原来的写法,掠夺舰会被静悄悄漏掉。
    const byFlag = new Map<string, string[]>();
    for (const h of HULL_CLASSES) {
      if (!h.unlockFlag) continue;
      byFlag.set(h.unlockFlag, [...(byFlag.get(h.unlockFlag) ?? []), h.id]);
    }
    const multi = [...byFlag.values()].filter((v) => v.length > 1);
    expect(multi.length, "没有任何 flag 一次开多条舰级,那这条测试就没有意义了").toBeGreaterThan(0);
  });
});
