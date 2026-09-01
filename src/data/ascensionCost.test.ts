import { describe, expect, it } from "vitest";
import { loadThresholdCrossed, applyEmberLoad, LOAD_HULL_PCT, LOAD_DAMAGE_PCT } from "./emberLoad";
import { encounterById } from "./encounters";
import ASCENSION_SRC from "../ui/screens/Ascension.tsx?raw";
import BRIDGE_SRC from "../ui/screens/Bridge.tsx?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 进阶要把**代价**也说出来,而且没碰上的系统先别摆出来。
 *
 * 2026-09-01(/loop 第 113 轮)。搜到的原则是"先限制初始的可玩面,别一上来就淹了
 * 玩家"——把全套 arcana / aspects / keepsakes / boons 一次性摆给新人是压垮人的。
 * 这个仓库自己在 combatUnlocks.ts 里量过同一件事(「25 个独立系统」),但那次
 * **只在战斗内**做了渐进解锁。顺着这条查舰桥,查出两件事:
 *
 * 一、进阶界面只讲好处,不讲代价。
 *
 * 它列涨了多少船体/功率/航速/槽位,外加解锁哪个技能——全是加号。而每进阶一次
 * 余烬负荷 +1,往后**每一仗**敌人伤害 ×1.08、船体 ×1.11;跨过 1/3/4/6 还分别
 * 多出锚定、医疗、炮台,以及**整整一艘船**。这是全游戏最重要的一个决定,而它的
 * 代价一个字都没写。舰桥上的负荷面板是唯一提过这件事的地方,可它在你按下按钮
 * 之前不会拦你。
 *
 * 二、那块负荷面板在一级玩家的舰桥上就摆着,而每个数都是 0。
 *
 * 开一局新游戏实测:0 次进阶 / 0 主动 / 0 星区威胁,面板讲的是一个玩家还没做过
 * 的动作。而**同一屏上的刻印面板早就老实地不显示**
 * (`if (sigils === 0 && best === 0) return null;`)。同一条规矩,一个接了一个没接。
 *
 * 实测(我的存档,负荷 7):
 *     WHAT IT COSTS
 *     Ember Load 7 → 8. Every fight from here on: enemy damage +8%, enemy hull +11%.
 * 一级新档的舰桥上负荷面板已经不出现了。 */

describe("进阶的代价", () => {
  it("负荷确实会让每一仗更难——代价是真的", () => {
    const enc = encounterById("kestrelsRestRaid");
    const at0 = applyEmberLoad(enc, 0);
    const at1 = applyEmberLoad(enc, 1);
    expect(Math.max(...at1.enemies.map((e) => e.damage)))
      .toBeGreaterThan(Math.max(...at0.enemies.map((e) => e.damage)));
    expect(Math.max(...at1.enemies.map((e) => e.hull)))
      .toBeGreaterThan(Math.max(...at0.enemies.map((e) => e.hull)));
  });

  /** 界面上写的百分比必须来自实际生效的常量,不能是手抄的。 */
  it("界面用的是生效的那两个常量", () => {
    expect(LOAD_DAMAGE_PCT).toBeGreaterThan(0);
    expect(LOAD_HULL_PCT).toBeGreaterThan(0);
    expect(ASCENSION_SRC, "百分比是手写死的,迟早和实际数值对不上").toMatch(
      /dmg: Math\.round\(LOAD_DAMAGE_PCT \* 100\)/,
    );
    expect(ASCENSION_SRC).toMatch(/hull: Math\.round\(LOAD_HULL_PCT \* 100\)/);
  });

  /** 跨过门槛那几级最要紧——多出一艘船不是"再难一点"。 */
  it("跨过门槛时能报出多出来的是什么", () => {
    expect(loadThresholdCrossed(0, 1)).toBe("anchor");
    expect(loadThresholdCrossed(2, 3)).toBe("mender");
    expect(loadThresholdCrossed(3, 4)).toBe("artillery");
    expect(loadThresholdCrossed(5, 6)).toBe("extra");
    // 没跨过就不要吓唬人。
    expect(loadThresholdCrossed(6, 7)).toBeNull();
    expect(loadThresholdCrossed(7, 8)).toBeNull();
    // 不会倒着报。
    expect(loadThresholdCrossed(6, 5)).toBeNull();
  });

  it("负荷 6 那一级确实是多一艘船,不只是数值", () => {
    const enc = encounterById("kestrelsRestRaid");
    expect(applyEmberLoad(enc, 6).enemies.length)
      .toBeGreaterThan(applyEmberLoad(enc, 5).enemies.length);
  });

  it("进阶界面真的把代价渲染出来了", () => {
    expect(ASCENSION_SRC, "进阶界面没有代价区块").toMatch(/t\("ascension\.costTitle"\)/);
    expect(ASCENSION_SRC).toMatch(/t\("ascension\.loadCost"/);
    expect(ASCENSION_SRC, "跨门槛的那一行没接上").toMatch(/loadThresholdCrossed\(currentLoad, nextLoad\)/);
    // 横向重铸不涨负荷,不该显示。
    expect(ASCENSION_SRC, "横向重铸也显示了负荷代价——它并不涨负荷").toMatch(/\{!lateral && \(\(\) => \{/);
  });

  it("代价文案中英都在,而且带着数字", () => {
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      for (const k of ["ascension.costTitle", "ascension.loadCost", "ascension.loadNewRole", "ascension.loadExtraShip"]) {
        const v = seg.match(new RegExp(`"${k.replace(/\./g, "\\.")}": "([^"]*)"`))?.[1];
        expect(v, `${lang} 缺少 ${k}`).toBeTruthy();
      }
      const cost = seg.match(/"ascension\.loadCost": "([^"]*)"/)?.[1] ?? "";
      for (const slot of ["{from}", "{to}", "{dmg}", "{hull}"]) {
        expect(cost, `${lang} 的代价文案缺 ${slot}——又变回形容词了:「${cost}」`).toContain(slot);
      }
    }
  });
});

describe("还没碰上的系统先别摆出来", () => {
  it("负荷全为零时,舰桥不显示那块面板", () => {
    expect(BRIDGE_SRC, "负荷面板没有任何门槛,一级新人就会看见一块全是 0 的板").toMatch(
      /if \(total === 0 && voluntary === 0\) return null;/,
    );
  });

  /** 同一屏上刻印面板本来就是这么做的——这次是把它接齐,不是发明新规矩。 */
  it("刻印面板那条老规矩还在", () => {
    expect(BRIDGE_SRC).toMatch(/if \(sigils === 0 && best === 0\) return null;/);
  });

  /** 别藏过头:已经在用主动负荷的人不能看着它消失。 */
  it("主动加过负荷的人仍然看得见", () => {
    const gate = BRIDGE_SRC.match(/if \(total === 0 && (\w+) === 0\) return null;/);
    expect(gate, "门槛的写法变了").toBeTruthy();
    expect(gate![1], "门槛没有把主动负荷算进去——玩家自己加的负荷会让面板消失").toBe("voluntary");
  });
});
