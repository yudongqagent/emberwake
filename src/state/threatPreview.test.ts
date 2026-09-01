import { describe, expect, it, beforeEach } from "vitest";
import { state, replaceState, flagship, encounterThreatRead, formatThreatPct } from "./store";
import { createInitialState } from "../engine/save";
import { applyEmberLoad } from "../data/emberLoad";
import { encounterById } from "../data/encounters";
import type { HullClassId } from "../data/types";
import SORTIE_SRC from "../ui/screens/SortieInterlude.tsx?raw";
import SYSTEM_SRC from "../ui/screens/SystemView.tsx?raw";
import APP_SRC from "../App.tsx?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 战前预读的必须是玩家**真的会碰上**的那支编队。
 *
 * 2026-09-01(/loop 第 108 轮)。搜到的原则是"推还是收"这类抉择要把赔率摆出来
 * ——有的游戏一直显示概率,多数把随机藏起来。照这条查出击间隙那一屏,发现两件事:
 *
 * 1. **星图上的威胁预读漏了余烬负荷。** 预读读的是 encounters.ts 里写死的编队,
 *    而真打的时候 Combat 用的是 applyEmberLoad(encounter, emberLoad())。负荷把
 *    伤害乘 (1 + 0.08×load)、船体乘 (1 + 0.11×load),负荷 ≥ 4 发炮台,≥ 6 还会
 *    **多加一艘船**。也就是说每一个进阶过的玩家看到的"最重一击"都偏低。
 *    实测(我的存档:5 次进阶 → 负荷 5,船体压到 300,同一个 POI):
 *        改前  4 HOSTILE · HEAVIEST HIT  9% HULL
 *        改后  4 HOSTILE · HEAVIEST HIT 12% HULL
 *
 * 2. **出击间隙那一屏一个数都不给。** 它是这个游戏最直接的"推还是收":船体不回复,
 *    押的是自己剩下的命。撤离那一侧写得很清楚(整备所得全留,只是不算完成目标),
 *    推进那一侧只有一句「而下一波更难」——一个形容词。而裂隙里**同一个抉择**
 *    早就写了「{count} hostiles · ~{sp} Source Points」。规则对了,但没接全。
 *
 *    下一波的负荷是 wave(App.tsx 的 extraLoad),所以完全算得出来。实测:
 *        Next wave: 5 hostile · heaviest hit 1% of your remaining hull
 *    那个 5 不是笔误——本轮负荷 5 + 下一波 1 = 6,正好越过"多加一艘船"的线。
 *    这正是玩家该在按下去之前知道的事。 */

describe("战前威胁预读", () => {
  beforeEach(() => replaceState(createInitialState()));

  /** createInitialState() **每次调用都重掷属性**(满血、格挡都会变),所以两次读数
   *  之间只能改 currentHp,不能各建一份新存档——否则比较的是两条不同的船。
   *  第 103 轮栽过同一个坑,这轮反向验证时"分母用当前船体"那条没变红才又发现。 */
  function setHull(hp: number) {
    replaceState({
      ...state.value,
      ships: state.value.ships.map((s) =>
        s.id === state.value.flagshipId ? { ...s, currentHp: hp } : s,
      ),
    });
  }

  function withLoad(ascended: HullClassId[], hp: number) {
    const init = createInitialState();
    replaceState({
      ...init,
      ships: init.ships.map((s) =>
        s.id === init.flagshipId ? { ...s, ascendedFrom: ascended, currentHp: hp } : s,
      ),
    });
  }

  const ENC = "kestrelsRestRaid";

  it("负荷会真的抬高预读出来的那一击", () => {
    withLoad([], 100);
    const none = encounterThreatRead(ENC)!;
    withLoad(["corvette", "destroyer", "cruiser", "battleship", "dreadnought"], 100);
    const loaded = encounterThreatRead(ENC)!;
    expect(loaded.worstHitFraction, "上了负荷之后预读没变——说明它还在读没负荷的编队")
      .toBeGreaterThan(none.worstHitFraction);
  });

  /** 「显示的不等于生效的」:预读的编队必须**就是** applyEmberLoad 之后那一支。 */
  it("预读的敌舰数就是实际会碰上的数", () => {
    withLoad(["corvette", "destroyer", "cruiser", "battleship", "dreadnought"], 100);
    const raw = encounterById(ENC);
    for (const extra of [0, 1, 2]) {
      const read = encounterThreatRead(ENC, extra)!;
      // 直接拿战斗用的那条路算一遍,两边必须一致。
      const ascended = flagship.value!.ascendedFrom.length;
      const actual = applyEmberLoad(raw, ascended + state.value.voluntaryLoad + extra);
      expect(read.enemies, `extraLoad=${extra} 时预读 ${read.enemies} 艘,实际 ${actual.enemies.length} 艘`)
        .toBe(actual.enemies.length);
    }
  });

  /** 负荷 ≥ 6 会多加一艘——这是"推还是收"里最该被提前告知的一条。 */
  it("越过加船那条线时,预读的数量会跟着变", () => {
    withLoad(["corvette", "destroyer", "cruiser", "battleship", "dreadnought"], 100);
    const now = encounterThreatRead(ENC, 0)!.enemies;
    const next = encounterThreatRead(ENC, 1)!.enemies;
    expect(next, "负荷 5 → 6 应该多一艘,预读却没反映").toBeGreaterThan(now);
  });

  it("分母是当前船体,不是满血——玩家问的是'我现在扛不扛得住'", () => {
    // 两个值都要**低于满血**,否则 clampHullToMax 会把它们夹成同一个数,
    // 这条测试就等于没跑(我第一版就是这样,反向验证时它没变红才发现)。
    withLoad([], 100);
    const healthy = encounterThreatRead(ENC)!.worstHitFraction;
    setHull(30);
    const hurt = encounterThreatRead(ENC)!.worstHitFraction;
    expect(hurt, "残血时那一击占比没变,说明分母用的是满血").toBeGreaterThan(healthy);
  });

  it("出击间隙把下一波预读出来了", () => {
    expect(SORTIE_SRC, "出击间隙没有任何威胁预读").toMatch(
      /encounterThreatRead\(encounterId, wave\)/,
    );
    expect(SORTIE_SRC).toMatch(/t\("sortie\.nextWaveThreat"/);
    // 没有 encounterId 就算不出来——它必须真的被传进去。
    expect(APP_SRC, "App 没有把 encounterId 传给出击间隙").toMatch(
      /encounterId=\{sortie\.encounterId\}/,
    );
  });

  it("文案中英都在,而且带着两个数", () => {
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      const v = seg.match(/"sortie\.nextWaveThreat": "([^"]*)"/)?.[1];
      expect(v, `${lang} 缺少 sortie.nextWaveThreat`).toBeTruthy();
      for (const slot of ["{count}", "{pct}"]) {
        expect(v, `${lang} 的预告缺 ${slot}——又变回形容词了:「${v}」`).toContain(slot);
      }
    }
  });
});

/** 裂隙口的三档潜入。
 *
 * 2026-09-01(/loop 第 109 轮)。这三个按钮原来只有形容词——浅层 / 深层 / 深渊
 * ——而它是**三选一**,玩家没有任何可比的东西。巡逻点早就有威胁读数了
 * (ThreatRead 只对 kind === "patrol" 渲染,裂隙口是 riftPocket,所以漏在外面),
 * 出击间隙上一轮也补上了。规则对了,但没接全。
 *
 * 顺带确认了一件我差点搞错的事:裂隙口那三个按钮走的是**普通出击**那条路
 * (onEngage → setSortie),不是异空间战场那套深潜。深潜是舰桥上的一个"能力"
 * (Bridge.tsx 里 2026-08-24 明确改过:它不是星图上的一个地点)。两套东西,
 * 名字像而已——所以这里该给的就是普通的威胁读数,和巡逻点同一份。 */
describe("裂隙口的三档", () => {
  beforeEach(() => replaceState(createInitialState()));

  const TIERS = ["riftDiveShallow", "riftDiveDeep", "riftDiveAbyssal"] as const;

  it("三档都能算出读数", () => {
    for (const id of TIERS) {
      expect(encounterThreatRead(id), `${id} 算不出威胁读数`).toBeTruthy();
    }
  });

  /** 越深的一档必须**真的**更凶,否则这个选择是假的。 */
  it("越深的一档,最重一击越重", () => {
    const hits = TIERS.map((id) => encounterThreatRead(id)!.worstHitFraction);
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i], `${TIERS[i]} 的最重一击不比 ${TIERS[i - 1]} 重`).toBeGreaterThan(hits[i - 1]);
    }
  });

  it("界面上三个按钮都挂了读数,而且复用巡逻点那一份文案", () => {
    expect(SYSTEM_SRC, "裂隙口的按钮没有威胁读数").toMatch(/encounterThreatRead\(tier\.id\)/);
    expect(SYSTEM_SRC, "另写了一份文案——两份迟早对不上").toMatch(
      /t\("system\.threatRead", \{ count: read\.enemies, pct \}\)/,
    );
    // 三档必须都从同一张表里出来,不能只给其中一两个接上。
    for (const key of ["system.riftShallow", "system.riftDeep", "system.riftAbyssal"]) {
      expect(SYSTEM_SRC, `${key} 不在那张表里`).toContain(key);
    }
  });
});

/** 四舍五入不能把真相抹平成 0。 */
describe("威胁百分比的排版", () => {
  it("非零但不足 1% 写成 <1,不写 0", () => {
    expect(formatThreatPct(0.004)).toBe("<1");
    expect(formatThreatPct(0.0001)).toBe("<1");
  });

  it("真的是 0 就写 0", () => {
    expect(formatThreatPct(0)).toBe("0");
  });

  it("正常范围照常四舍五入", () => {
    expect(formatThreatPct(0.09)).toBe("9");
    expect(formatThreatPct(0.125)).toBe("13");
    expect(formatThreatPct(1.2)).toBe("120");
  });
});
