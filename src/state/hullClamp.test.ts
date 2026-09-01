import { describe, expect, it, beforeEach } from "vitest";
import { state, replaceState, clampHullToMax, effectiveMaxHull } from "./store";
import { createInitialState } from "../engine/save";
import STORE_SRC from "./store.ts?raw";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";

/** 当前船体不能高过上限。
 *
 * 2026-09-01(/loop 第 92 轮)。effectiveMaxHull 里有一项是**装备给的**:
 * `min(0.6, 0.15 × 船体模组层数)` —— 最多 +60%。而换装时没有任何人管 currentHp:
 *
 *     装上几件船体模组 → 上限涨 → 修满 → 卸下来 → 上限跌回去,当前值没动
 *
 * 于是 currentHp 超过上限。实测(第 91 轮验证格挡时顺手看到的)舰桥上写着
 * 「7203 / 5541」——血条超过 100%。
 *
 * 真正的伤害不在那个读数,而在**它是悄悄消失的**:进战斗那一刻
 * playerHull = min(maxHull, ...) 会把超出的部分削掉。玩家带着 7203 出发,
 * 开打时只有 5541,中间没有任何提示。搜到的说法把这种叫 silent loss。
 *
 * 修法是"当场夹住":卸下那一刻血条就往下走,玩家看得见因果。 */

describe("船体不能超过上限", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("上限本来就受装备影响——所以这条路是真的通的", () => {
    expect(STORE_SRC, "effectiveMaxHull 不再受装备影响?那这条守卫的理由要重写").toMatch(
      /const gear = Math\.min\(0\.6, 0\.15 \* equippedEffectStacks\("hullBonus"\)\)/,
    );
  });

  it("夹取会把超出的部分拉回上限", () => {
    const ship = state.value.ships[0];
    const max = effectiveMaxHull(ship);
    replaceState({
      ...state.value,
      ships: [{ ...ship, currentHp: max + 5000 }],
    });
    clampHullToMax();
    expect(state.value.ships[0].currentHp).toBe(effectiveMaxHull(state.value.ships[0]));
  });

  it("没超的时候一点都不动——不能顺手把受伤的船修好", () => {
    const ship = state.value.ships[0];
    replaceState({ ...state.value, ships: [{ ...ship, currentHp: 1 }] });
    clampHullToMax();
    expect(state.value.ships[0].currentHp, "夹取把受伤的船治好了").toBe(1);
  });

  it("换装之后会夹一次", () => {
    const i = STORE_SRC.indexOf("export function equipModule");
    const body = STORE_SRC.slice(i, i + 2200);
    expect(body, "换装之后没有夹——卸下船体模组会留下超上限的当前值").toMatch(/clampHullToMax\(\);/);
  });

  /** 老存档可能已经处在那个状态里,启动时先拉回来,而不是等进战斗时悄悄削掉。 */
  it("启动时夹一次", () => {
    expect(STORE_SRC, "启动时没有夹一次,老存档会带着超上限的值继续跑").toMatch(
      /\nclampHullToMax\(\);\s*$/,
    );
  });

  /** 战斗那一侧的 min 保留着——它是最后一道防线,不是唯一一道。
   * 这条钉住:哪天有人以为"已经夹过了"就把它删掉,静默削减会立刻回来。 */
  it("战斗入口的那道 min 还在", () => {
    expect(COMBAT_SRC).toMatch(
      /useState\(Math\.min\(maxHull, Math\.round\(ship\.currentHp \* \(1 \+ hullBonusFraction\)\)\)\)/,
    );
  });

  it("夹取不会把船体压到 0 以下", () => {
    const ship = state.value.ships[0];
    replaceState({ ...state.value, ships: [{ ...ship, currentHp: effectiveMaxHull(ship) * 10 }] });
    clampHullToMax();
    expect(state.value.ships[0].currentHp).toBeGreaterThan(0);
  });
});
