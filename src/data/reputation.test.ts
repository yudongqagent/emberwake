import { describe, expect, it } from "vitest";
import {
  CHOICE_REPUTATION, DIPLOMATIC_FACTIONS, isDiplomatic,
  repTier, repEffects, clampRep, REP_MIN, REP_MAX,
} from "./reputation";
import { ACT1_SCENES } from "./story/act1";
import { ACT2_SCENES } from "./story/act2";
import { ACT3_SCENES } from "./story/act3";
import { ACT4_SCENES } from "./story/act4";
import { ACT5_SCENES } from "./story/act5";
import { ACT6_SCENES } from "./story/act6";
import { migrateReputationFromFlags } from "../engine/save";
import { BOUNTY_ENCOUNTER_DEFS, encounterById } from "./encounters";
import { generateHunterEncounter, hunterEncounterId, parseHunterId, isHunterId } from "./hunters";
import { ENCOUNTER_NAMES_ZH, ENEMY_NAMES_ZH } from "../i18n/data/encounters";

const SCENES = [...ACT1_SCENES, ...ACT2_SCENES, ...ACT3_SCENES, ...ACT4_SCENES, ...ACT5_SCENES, ...ACT6_SCENES];

function allChoiceFlags(): string[] {
  const out: string[] = [];
  for (const s of SCENES) for (const c of s.choices ?? []) out.push(...(c.setFlags ?? []));
  return out;
}

// docs/story-engagement-analysis.md:剧情里 7 个选择点设了 20 个 flag,其中 16 个
// 没有任何代码读——玩家做了道德选择,游戏立刻忘掉。声望系统就是为修这件事存在的,
// 所以"每个选择都有后果"必须被测试钉死,否则下一个新增的选项又会悄悄变成死 flag。
describe("剧情选择必须有后果", () => {
  it("每一个选项 flag 都要么给声望,要么被剧情 gate,要么解锁东西", () => {
    const gated = new Set(SCENES.map((s) => s.requiredFlag).filter(Boolean) as string[]);
    // 已知的非声望消费者:虎鲨结盟解锁船员;余烬三选一改的是 cinderTrust。
    const otherConsumers = new Set([
      "tigerSharkAlliance",
      "cinderReveal.anger", "cinderReveal.acceptance", "cinderReveal.focus",
    ]);
    const dead: string[] = [];
    for (const f of allChoiceFlags()) {
      if (CHOICE_REPUTATION[f] || gated.has(f) || otherConsumers.has(f)) continue;
      dead.push(f);
    }
    expect(dead, `这些选项设置后没有任何后果,玩家选了等于没选:\n${dead.join("\n")}`).toEqual([]);
  });

  it("同一个选择点的不同选项,后果必须不同", () => {
    // 三个选项导向同一结果的话,那不是选择,是装饰。
    for (const s of SCENES) {
      if (!s.choices || s.choices.length < 2) continue;
      const sigs = s.choices.map((c) =>
        JSON.stringify((c.setFlags ?? []).map((f) => CHOICE_REPUTATION[f] ?? f).sort()),
      );
      expect(new Set(sigs).size, `场景 "${s.id}" 的选项后果完全相同`).toBe(s.choices.length);
    }
  });

  it("只给讲道理的派系配声望", () => {
    // 给虫群/构装体做声望等于承诺一套不存在的外交玩法。
    for (const [flag, deltas] of Object.entries(CHOICE_REPUTATION)) {
      for (const f of Object.keys(deltas)) {
        expect(isDiplomatic(f), `${flag} 改了不可交涉派系 "${f}" 的声望`).toBe(true);
      }
    }
  });
});

describe("声望的档位与效果", () => {
  it("档位随数值单调变化,不会跳档", () => {
    const order = ["hostile", "cold", "neutral", "friendly", "allied"];
    let last = -1;
    for (let v = REP_MIN; v <= REP_MAX; v++) {
      const idx = order.indexOf(repTier(v));
      expect(idx).toBeGreaterThanOrEqual(last);
      last = idx;
    }
  });

  it("敌对确实难受,盟友确实划算", () => {
    const hostile = repEffects(-100), allied = repEffects(100), neutral = repEffects(0);
    expect(hostile.priceMultiplier).toBeGreaterThan(neutral.priceMultiplier);
    expect(allied.priceMultiplier).toBeLessThan(neutral.priceMultiplier);
    expect(hostile.huntsYou).toBe(true);
    expect(allied.fightsAlongside).toBe(true);
    // 中立不该有任何惩罚——不选边站是合法玩法。
    expect(neutral.priceMultiplier).toBe(1);
    expect(neutral.huntsYou).toBe(false);
  });

  it("数值永远夹在区间内", () => {
    expect(clampRep(9999)).toBe(REP_MAX);
    expect(clampRep(-9999)).toBe(REP_MIN);
  });

  it("每个可交涉派系都至少能被某个选择改动", () => {
    // 一个永远动不了的派系,面板上就是个死条。
    const touched = new Set<string>();
    for (const deltas of Object.values(CHOICE_REPUTATION)) {
      for (const f of Object.keys(deltas)) touched.add(f);
    }
    for (const f of DIPLOMATIC_FACTIONS) {
      expect(touched.has(f), `派系 "${f}" 没有任何剧情选择能改动它`).toBe(true);
    }
  });
});

describe("老存档的选择要被追认", () => {
  it("已经做过的选择会被换算成声望,而不是从零开始", () => {
    // 这些 flag 一直被写进存档,只是从前没人读。老玩家不该白选。
    const flags = { "ridgeReachOutcome.lionsheart": true, "act2.bloodDebt.formal": true };
    const rep = migrateReputationFromFlags(flags);
    expect(rep.lionsheart).toBeGreaterThan(0);
    expect(rep.bauhinia).toBeLessThan(0);
  });

  it("没做过选择的存档,声望就是空的", () => {
    expect(migrateReputationFromFlags({})).toEqual({});
  });

  it("互相冲突的选择会相互抵消而不是叠加成荒谬值", () => {
    const rep = migrateReputationFromFlags({
      "ridgeReachOutcome.lionsheart": true,
      "ridgeReachOutcome.swanreach": true,
    });
    for (const v of Object.values(rep)) {
      expect(Math.abs(v!)).toBeLessThanOrEqual(REP_MAX);
    }
  });
});

// 2026-08-30。写这批测试的直接原因:我自己把赏金的方向写反了——按"打谁谁记仇"
// 的默认规则,清掉掠夺者的赏金会让**掠夺者**加 6 分。声望面板上什么都看不出来,
// 因为面板只显示结果不显示原因。没有测试的话这个 bug 能活到玩家发现为止。
describe("赏金的声望方向", () => {
  it("赏金必须显式写声望,不能落到默认的记仇规则上", () => {
    for (const b of BOUNTY_ENCOUNTER_DEFS) {
      expect(b.reputation, `赏金 "${b.id}" 没写 reputation,会被当成"打谁谁记仇"`).toBeDefined();
    }
  });

  it("打某派系的赏金,不能反而让那个派系更喜欢你", () => {
    for (const b of BOUNTY_ENCOUNTER_DEFS) {
      if (!isDiplomatic(b.faction)) continue;
      const own = b.reputation?.[b.faction] ?? 0;
      // 例外:狮心的切磋是友谊赛,不死人。
      if (b.id === "bountyConcordSparringPartner") {
        expect(own).toBeGreaterThan(0);
        continue;
      }
      expect(own, `赏金 "${b.id}" 打的是 ${b.faction} 的船,却给他们加分`).toBeLessThan(0);
    }
  });

  it("每个可交涉派系都有修复关系的路子", () => {
    // 敌对如果没有出路,声望就成了一条单向下坡路,玩家做的选择只会越来越糟。
    for (const f of DIPLOMATIC_FACTIONS) {
      const repair = BOUNTY_ENCOUNTER_DEFS.filter((b) => (b.reputation?.[f] ?? 0) > 0);
      expect(repair.length, `派系 "${f}" 没有任何赏金能加分,得罪了就再也回不来`).toBeGreaterThan(0);
    }
  });
});

describe("敌对招来的猎杀队", () => {
  it("只有敌对档才会被追杀", () => {
    expect(repEffects(-100).huntsYou).toBe(true);
    expect(repEffects(-50).huntsYou).toBe(true);
    expect(repEffects(-49).huntsYou).toBe(false);
  });

  it("猎杀队跟着星区威胁度变强,而不是一直是新手村的强度", () => {
    const low = generateHunterEncounter("reavers", 1);
    const high = generateHunterEncounter("reavers", 6);
    expect(high.enemies[0].hull).toBeGreaterThan(low.enemies[0].hull * 10);
    expect(high.rewards.salvage!).toBeGreaterThan(low.rewards.salvage!);
  });

  it("id 能来回解析,四个派系都认得", () => {
    for (const f of DIPLOMATIC_FACTIONS) {
      const id = hunterEncounterId(f, 3);
      expect(parseHunterId(id)).toEqual({ faction: f, threat: 3 });
      expect(encounterById(id).faction).toBe(f);
    }
    expect(parseHunterId("bountyReaverScavengers")).toBeNull();
    expect(parseHunterId("hunt:swarm:3"), "虫群不参与外交,不该有猎杀队").toBeNull();
  });

  it("自卫打赢猎杀队不再扣声望,否则敌对就是个爬不出来的坑", () => {
    const hunter = generateHunterEncounter("bauhinia", 4);
    expect(hunter.reputation, "猎杀队不该带声望表").toBeUndefined();
    expect(isHunterId(hunter.id), "store 靠这个跳过记仇").toBe(true);
  });
});

// 运行时生成的内容 data.test.ts 那套遍历看不见——裂隙波次就是这么在中文界面里
// 漏了一批英文名出去的。猎杀队是同一类东西,所以单独钉一次。
describe("猎杀队的中文名", () => {
  it("四个派系的猎杀队和它们的船都有中文名", () => {
    for (const f of DIPLOMATIC_FACTIONS) {
      const enc = generateHunterEncounter(f, 3);
      const key = `hunt:${f}`;
      expect(ENCOUNTER_NAMES_ZH[key], `猎杀队 "${key}" 没有中文名`).toBeDefined();
      for (const e of enc.enemies) {
        expect(ENEMY_NAMES_ZH[e.name], `猎杀队敌人 "${e.name}" 没有中文名`).toBeDefined();
      }
    }
  });
});
