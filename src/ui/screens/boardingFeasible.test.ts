import { describe, expect, it } from "vitest";
import { ENCOUNTER_DEFS, BOUNTY_ENCOUNTER_DEFS } from "../../data/encounters";
import COMBAT_SRC from "./Combat.tsx?raw";

/** 「打弱它,别直接打沉」——那就得给玩家一个不打沉它的办法。
 *
 * 2026-08-31(/loop 第 63 轮)。接舷的提示原话是"拉近后打弱它,别直接打沉",而武器
 * 是**自动开火**的,玩家没有任何停火手段。算一下实数:
 *
 *     可接舷阈值 CAPTURE_HULL_THRESHOLD = 0.4
 *     接舷需要连续 BOARD_SECONDS = 10 秒
 *
 *     实测(虎鲨副官那场):目标 260 血 → 104 血以下才可接舷
 *     单发 −47、循环 0.5 秒 ≈ 94 DPS  →  从 104 血打死只要 1.1 秒
 *
 * **窗口比要求短了近九倍。** 阈值早前从 0.25 放宽到 0.4 时,注释里已经认出了这个
 * 形状("目标常常在窗口被注意到之前就直接打沉了"),但放宽只是把窗口拉长,没有
 * 把控制权交给玩家——而两者差着一个数量级,拉长多少都不够。
 *
 * 搜到的原则:自动系统必须让位于玩家的明确意图。接舷令就是那个意图。
 *
 * 只对缴获目标停火,别的敌舰自动改打:否则下了令就等于挨打不还手。而"停火十秒"
 * 本身就是这个决定的代价——那才是设计要的取舍,不是一个够不着的时间窗。 */

const captureFights = [...ENCOUNTER_DEFS, ...BOUNTY_ENCOUNTER_DEFS].filter((e) => (e as { capturable?: boolean }).capturable);

function constant(name: string): number {
  const m = COMBAT_SRC.match(new RegExp(`const ${name} = ([0-9.]+);`));
  expect(m, `Combat.tsx 里找不到 ${name}`).toBeTruthy();
  return Number(m![1]);
}

describe("接舷得是做得到的", () => {
  it("确实有可缴获的战斗,否则这条守卫是空转", () => {
    expect(captureFights.length).toBeGreaterThan(0);
  });

  /** 前提:光靠"打弱"撑不过接舷所需的时间。 */
  it("按实测输出,可接舷的血量窗口远撑不过接舷所需的时间", () => {
    const threshold = constant("CAPTURE_HULL_THRESHOLD");
    const boardSeconds = constant("BOARD_SECONDS");
    const target = captureFights[0].enemies[0];
    const window = target.hull * threshold;
    // 实测:单发 47、循环 0.5 秒。用一个保守得多的数(每秒 20)都不够。
    const conservativeDps = 20;
    expect(
      window / conservativeDps,
      `即使按每秒 ${conservativeDps} 的保守输出,窗口也有 ${(window / conservativeDps).toFixed(1)} 秒,` +
        `而接舷要 ${boardSeconds} 秒——那这条守卫的前提要重写`,
    ).toBeLessThan(boardSeconds);
  });

  /** 这一轮的正题:下了接舷令就不再打那艘船。 */
  it("下了接舷令、且目标已进窗口时,武器不再打它", () => {
    expect(
      COMBAT_SRC,
      "自动开火没有为接舷让路——提示让玩家别打沉它,而他没有办法照做",
    ).toMatch(/if \(boardingOrder && encounter\.capturable && targetIdx === 0 && inWindow\)/);
  });

  /** 停火不能提前到"还没打弱"的时候,否则就是把够不着的窗口换成一个静默的死结。 */
  it("目标还没打弱时照常开火——提示先说的是「打弱它」", () => {
    expect(COMBAT_SRC, "没有判断目标是否已进缴获窗口").toMatch(/const inWindow = /);
    expect(COMBAT_SRC).toMatch(/prize\.hull <= prize\.maxHull \* CAPTURE_HULL_THRESHOLD/);
  });

  it("还有护卫时会自动改打护卫,不是站着挨打", () => {
    expect(COMBAT_SRC).toMatch(/const other = enemies\.findIndex\(\(e, i\) => i !== 0 && e\.hull > 0\)/);
    expect(COMBAT_SRC).toMatch(/setTargetIdx\(other\)/);
  });

  it("只剩那艘要缴获的时候才彻底停火——代价是这十秒不还手", () => {
    // return 在 setTargetIdx 之外也要执行到,否则会继续走到开火循环。
    expect(COMBAT_SRC).toMatch(/if \(other >= 0\) \{\s*\n\s*setTargetIdx\(other\);\s*\n\s*\}\s*\n\s*return;/);
  });

  it("接舷令解除之后照常开火", () => {
    // 门控只看 boardingOrder,没有别的粘滞状态。
    expect(COMBAT_SRC).toMatch(/\}, \[cooldowns, status, enemies, targetIdx, boardingOrder\]\);/);
  });
});
