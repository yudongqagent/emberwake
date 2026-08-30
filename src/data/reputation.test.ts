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
