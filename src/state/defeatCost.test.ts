import { describe, expect, it, beforeEach } from "vitest";
import { state, replaceState, resolveCombatDefeat, effectiveMaxHull, hullAfterDefeat, flagship } from "./store";
import { createInitialState } from "../engine/save";
import { APPROVAL_PER_LOSS, APPROVAL_PER_WIN, approvalTier } from "../data/crewApproval";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 输了要说清楚输掉了什么。
 *
 * 2026-09-01(/loop 第 103 轮)。搜到的原则是失败反馈:玩家拿不到反馈就学不会,
 * 只会觉得挫败。战败面板**旁边**就是撤离面板,而撤离那一份把代价一条条写清楚了
 * (没有战利品、没有经验、充能时挨的伤都留着)。战败那一份原来只有一句
 * 「船体勉强能维持航行,准备好再来一次」——一个代价都没提。可它扣的是:
 *
 *     每个在编船员 -5 支持度(赢一场才 +2,输一场抵掉两场半)
 *     船体压到满血的 25%(或开打前的一半,取小)
 *
 * 支持度那条最要命,因为它有**台阶**:掉一档,船员被动 1.0×→0.75×、冷却
 * 1.0×→1.15×;一路滑到「记恨」是 0.5× 和 1.35×。连输几场之后船会实实在在
 * 变弱,而游戏从来没说过一个字——玩家只会觉得"这游戏莫名其妙"。
 *
 * 而且这直接伤到第 75 轮刚做出来的第三个出口:玩家要在"撑到脱离"和"打到沉"
 * 之间做选择,却只有其中一边标了价。
 *
 * 实测(英文模式,浏览器里读 DOM,等级 1、满船体 2068、开打前 40 血):
 *
 *     WHAT THE LOSS COST
 *     Hull                        40 → 21
 *     Crew approval (1 aboard)     -5
 *     Recruit is now Wary (was Steady) — weaker passive, slower cooldown
 *
 * 预测值(min(40×0.5+1, 2068×0.25) = 21;41-5=36 跨过 40 那道档位线)三条全中。 */

/** 装一份「有在编船员」的存档。
 *
 * 全新开局**一个在编船员都没有**——第一版几条测试用 `if (…) return;` 跳过,
 * 结果反向验证时"跨档不报"这条居然是绿的:它根本没跑过。所以这里显式派人上船,
 * 不再依赖初始存档碰巧是什么样。 */
function stateWithCrew(approval: number) {
  const init = createInitialState();
  const shipId = init.flagshipId;
  replaceState({
    ...init,
    // 全新开局 crew 是**空的**,所以这里要真的造一个人出来,而不是改现有的。
    crew: [{ id: "crew_test", defId: "recruitHelm", approval, assignedShipId: shipId }],
  });
  expect(
    state.value.crew.filter((c) => c.assignedShipId === shipId).length,
    "没人在编,这条测试等于没跑",
  ).toBeGreaterThan(0);
}

describe("战败的代价要报出来", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("输一场比赢一场影响大——所以更该说", () => {
    expect(APPROVAL_PER_LOSS).toBeLessThan(0);
    expect(Math.abs(APPROVAL_PER_LOSS)).toBeGreaterThan(APPROVAL_PER_WIN);
  });

  it("报出来的船体值就是真正写回存档的那个", () => {
    // createInitialState() 每次调用都会重掷属性,所以满血值必须从**装进去的
    // 那一份**读,不能拿另一次调用的结果来算期望值。
    const max = effectiveMaxHull(flagship.value!);
    replaceState({
      ...state.value,
      ships: state.value.ships.map((s) => (s.id === flagship.value!.id ? { ...s, currentHp: max } : s)),
    });
    const before = flagship.value!.currentHp;
    const cost = resolveCombatDefeat();
    expect(cost.hullBefore).toBe(before);
    expect(cost.hullAfter).toBe(hullAfterDefeat(before, max));
    // 显示的必须等于生效的——面板上那个数就是存档里那个数。
    expect(flagship.value!.currentHp).toBe(cost.hullAfter);
  });

  /** 「显示的不等于生效的」:已经到底的人不会再掉,报告里就不能算他一份。 */
  it("已经到底的船员不算进受影响人数", () => {
    stateWithCrew(0);
    const cost = resolveCombatDefeat();
    expect(cost.crewAffected, "支持度已经是 0 了还报成掉了").toBe(0);
    expect(cost.approvalDelta).toBe(0);
    expect(cost.demoted).toEqual([]);
  });

  it("在编的人真的掉,而且报的量和实际一致", () => {
    stateWithCrew(50);
    const n = state.value.crew.filter((c) => c.assignedShipId === flagship.value!.id).length;
    expect(n).toBeGreaterThan(0);
    const cost = resolveCombatDefeat();
    expect(cost.crewAffected).toBe(n);
    expect(cost.approvalDelta).toBe(APPROVAL_PER_LOSS);
  });

  /** 只有跨档才有机制后果(被动倍率、冷却倍率),所以跨档要单独说。 */
  it("跨过档位线的人被单独列出来", () => {
    // 41 在「稳当」区间的最下沿,-5 之后落进「存疑」——实测那一把就是这条线。
    expect(approvalTier(41)).toBe("steady");
    expect(approvalTier(41 + APPROVAL_PER_LOSS)).toBe("wary");
    stateWithCrew(41);
    const cost = resolveCombatDefeat();
    expect(cost.demoted.length, "跨档了却没报").toBeGreaterThan(0);
    expect(cost.demoted[0].from).toBe("steady");
    expect(cost.demoted[0].to).toBe("wary");
    // 存的是 defId,显示时再翻——和第 102 轮同一条规矩。
    expect(cost.demoted[0]).not.toHaveProperty("name");
  });

  it("没跨档就不要吓唬人", () => {
    stateWithCrew(60);
    expect(approvalTier(60)).toBe(approvalTier(60 + APPROVAL_PER_LOSS));
    expect(resolveCombatDefeat().demoted).toEqual([]);
  });

  it("战败面板真的把它渲染出来了", () => {
    expect(COMBAT_SRC, "没有战败代价面板").toMatch(/function DefeatCostPanel\(/);
    expect(COMBAT_SRC, "战败分支没接上这个面板").toMatch(/\{defeatCost && <DefeatCostPanel cost=\{defeatCost\} \/>\}/);
    // 面板的数必须来自 resolveCombatDefeat 的返回值,不能自己再算一遍。
    expect(COMBAT_SRC, "没有接住 resolveCombatDefeat 的返回值").toMatch(
      /setDefeatCost\(resolveCombatDefeat\(\)\)/,
    );
    for (const f of ["cost.hullBefore", "cost.hullAfter", "cost.crewAffected", "cost.approvalDelta"]) {
      expect(COMBAT_SRC, `面板没显示 ${f}`).toContain(f);
    }
  });

  it("文案中英都在,而且带着数字占位", () => {
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      for (const k of ["combat.defeatCost.title", "combat.defeatCost.hull", "combat.defeatCost.approval", "combat.defeatCost.demoted"]) {
        const v = seg.match(new RegExp(`"${k.replace(/\./g, "\\.")}": "([^"]*)"`))?.[1];
        expect(v, `${lang} 缺少 ${k}`).toBeTruthy();
      }
      // 仓库自己"给数字不给形容词"的规矩:降档那条得说清楚是谁、从哪到哪。
      const dem = seg.match(/"combat\.defeatCost\.demoted": "([^"]*)"/)?.[1] ?? "";
      for (const slot of ["{name}", "{from}", "{to}"]) {
        expect(dem, `${lang} 的降档文案缺 ${slot}:「${dem}」`).toContain(slot);
      }
    }
  });
});
