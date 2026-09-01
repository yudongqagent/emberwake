import { describe, expect, it, beforeEach } from "vitest";
import { state, replaceState, effectiveEventOutcome, resolveEventOutcome, flagship, effectiveMaxHull } from "./store";
import { createInitialState } from "../engine/save";
import { GAME_EVENTS } from "../data/events";
import { REP_MIN, REP_MAX } from "../data/reputation";
import OVERLAY_SRC from "../ui/screens/EventOverlay.tsx?raw";

/** 事件面板上的数字必须是**真的扣掉/给出**的那一个。
 *
 * 2026-09-01(/loop 第 104 轮)。搜到的原则是新手前 15 分钟"边做边学",于是这轮
 * 头一次真的开了一局**新游戏**走了一遍(前面三十来轮都在一个 40 级存档上)。
 * 第一个目标点、第一个抉择,就撞上这个:
 *
 *     arthaineToll「付钱」声明  salvage: -80
 *     新手身上只有                        20
 *     面板上写着                  -80 Salvage   ← 实测
 *     实际扣走                            20    ← 实测(20 → 0)
 *
 * 也就是说游戏对新玩家说的**第一个数字**就错了四倍。而这正是仓库自己那条
 * 「显示的不等于生效的」——而且新手余额小,恰恰是最容易被夹的时候。
 *
 * 三条轴都会夹,不只是资源:
 *     资源   扣不出来就扣到零为止
 *     船体   夹在 [1, 满血]
 *     声望   clampRep 夹在 [-100, 100](四个派系全都可交涉,我一开始以为
 *            reavers 不可交涉,错了)
 *
 * 修法是把夹的规则收成 store 里唯一一份 effectiveEventOutcome,结算按它算、
 * 面板也按它显示。补在根上,别指望下一个调用点会记得。
 *
 * 修完实测同一个事件同一份余额:面板写 **-20 Salvage**,扣掉 20,声望 +4 一致。 */

describe("事件面板不能报假账", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("扣不出来的部分不会被算进去", () => {
    replaceState({ ...state.value, resources: { ...state.value.resources, salvage: 20 } });
    const applied = effectiveEventOutcome({ resources: { salvage: -80 } });
    expect(applied.resources.salvage, "报的还是声明值 -80,而不是真能扣的 -20").toBe(-20);
  });

  it("给的那一侧不夹——只有扣才有余额上限", () => {
    const applied = effectiveEventOutcome({ resources: { salvage: 180 } });
    expect(applied.resources.salvage).toBe(180);
  });

  /** 显示的就是生效的:报出来的量必须等于余额真正的变化量。 */
  it("报出来的量和余额的实际变化一致", () => {
    for (const salvage of [0, 20, 500]) {
      replaceState({ ...createInitialState(), resources: { ...createInitialState().resources, salvage } });
      const outcome = { resources: { salvage: -80 } };
      const applied = effectiveEventOutcome(outcome);
      const before = state.value.resources.salvage;
      resolveEventOutcome("test", "poi", outcome);
      const actual = state.value.resources.salvage - before;
      expect(actual, `余额 ${salvage} 时报的是 ${applied.resources.salvage},实际变了 ${actual}`)
        .toBe(applied.resources.salvage);
    }
  });

  it("船体也夹——残血时不能报一个扣不动的数", () => {
    const ship = flagship.value!;
    replaceState({
      ...state.value,
      ships: state.value.ships.map((s) => (s.id === ship.id ? { ...s, currentHp: 10 } : s)),
    });
    // 最低只能到 1,所以 -18 实际只有 -9。
    expect(effectiveEventOutcome({ hull: -18 }).hull).toBe(-9);
    // 满血时的治疗同理:补不进去的部分不能报。
    const max = effectiveMaxHull(flagship.value!);
    replaceState({
      ...state.value,
      ships: state.value.ships.map((s) => (s.id === ship.id ? { ...s, currentHp: max } : s)),
    });
    expect(effectiveEventOutcome({ hull: 50 }).hull).toBe(0);
  });

  /** 我头一版这里断言 reavers 是"不可交涉"的——错了,四个派系全都可交涉。
   * 真正会夹的是**上下限**:声望到底了再扣也不会动。 */
  it("声望到底之后不能再报扣了多少", () => {
    replaceState({ ...state.value, reputation: { ...state.value.reputation, bauhinia: REP_MIN } });
    expect(effectiveEventOutcome({ reputation: { bauhinia: -8 } }).reputation.bauhinia ?? 0).toBe(0);
    replaceState({ ...state.value, reputation: { ...state.value.reputation, swanreach: REP_MAX } });
    expect(effectiveEventOutcome({ reputation: { swanreach: 8 } }).reputation.swanreach ?? 0).toBe(0);
  });

  it("到顶之前照常报,只夹越界的那一截", () => {
    replaceState({ ...state.value, reputation: { ...state.value.reputation, bauhinia: REP_MAX - 3 } });
    expect(effectiveEventOutcome({ reputation: { bauhinia: 8 } }).reputation.bauhinia).toBe(3);
  });

  it("会动的派系照常报", () => {
    const applied = effectiveEventOutcome({ reputation: { bauhinia: 4 } });
    expect(applied.reputation.bauhinia).toBe(4);
  });

  /** 夹的规则只能有一份——两份迟早对不上,而且不会报错。 */
  it("面板显示的是夹过的那一份,不是 data 里声明的", () => {
    expect(OVERLAY_SRC, "面板没有调用夹的那一份").toMatch(
      /const applied = effectiveEventOutcome\(outcome\);/,
    );
    for (const bad of [/Object\.entries\(outcome\.resources/, /outcome\.hull \?/, /Object\.entries\(outcome\.reputation/]) {
      expect(OVERLAY_SRC, `面板还在直接读声明值:${bad}`).not.toMatch(bad);
    }
    for (const good of ["applied.resources", "applied.hull", "applied.reputation"]) {
      expect(OVERLAY_SRC, `面板没有用 ${good}`).toContain(good);
    }
  });

  /** 顺带钉住这次是怎么被发现的:确实有事件的开价高于新手的起始余额。
   * 这不是要求改数值——收费高本来就是这个事件的意思——而是要求**别报错数**。 */
  it("确实存在开价超过新手起始余额的事件", () => {
    const startingSalvage = createInitialState().resources.salvage;
    const overpriced = GAME_EVENTS.flatMap((e) =>
      e.options.flatMap((o) => {
        const list = o.outcome ? [o.outcome] : (o.outcomes ?? []).map((x) => x.outcome);
        return list
          .filter((oc) => -(oc.resources?.salvage ?? 0) > startingSalvage)
          .map((oc) => `${e.id}: ${oc.resources!.salvage}(起始只有 ${startingSalvage})`);
      }),
    );
    expect(overpriced.length, "没有这种事件了?那这条守卫该重写").toBeGreaterThan(0);
  });
});
