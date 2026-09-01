import { describe, expect, it } from "vitest";
import { PACTS, pactModifiers, NO_PACTS } from "../../data/pacts";
import COMBAT_SRC from "./Combat.tsx?raw";
import STRINGS_SRC from "../../i18n/strings.ts?raw";

/** 契约和战斗里那些**有条件的动作**叠在一起时,不能出现"按了没反应"。
 *
 * 2026-09-01(/loop 第 99 轮)。搜到的说法很实在:大多数缺陷来自**两个参数的交互**,
 * 所以该按成对去测,而不是逐个功能去测。上一轮(第 98 轮)撞到的正是这种:
 * 「咬死」锁近距 × 脱离要远距 = 整趟出击没有出口。
 *
 * 按同样的方式把剩下的对子过了一遍,又抓到一个:
 *
 *     「长枪」锁远距  ×  接舷要求近距  =  接舷永远不可能完成
 *
 * 但这次的结论和上次**不一样**,而这个区别是这条守卫的重点:
 *
 *     第 98 轮  "锁位就再也逃不掉"——不成比例,所以**放开规则**
 *     第 99 轮  "远距够不着敌舰的舷"——说得通,所以**不动规则**,
 *               改的是别让一个按不动的按钮装作能按
 *
 * 判断的分界是:这条限制在虚构上讲不讲得通。讲得通就把它说清楚,讲不通就拿掉。 */

describe("契约与有条件动作的叠加", () => {
  it("确实存在会把阵位锁到近距以外的契约", () => {
    const locked = PACTS.map((p) => pactModifiers([p.id]).lockedBand).filter(Boolean);
    expect(locked, "没有任何契约锁阵位了?那这条守卫的前提要重看").not.toEqual([]);
    expect(
      locked.some((b) => b !== "close"),
      "没有锁到近距以外的契约——接舷不会被挡住,这条守卫失去意义",
    ).toBe(true);
  });

  it("没有契约时不该挡住接舷", () => {
    expect(NO_PACTS.lockedBand).toBeNull();
  });

  it("接舷被挡住时,按钮是禁用的,而且说明了原因", () => {
    expect(COMBAT_SRC, "没有算出接舷被挡住的状态").toMatch(
      /const boardBlocked = pacts\.lockedBand !== null && pacts\.lockedBand !== "close";/,
    );
    expect(COMBAT_SRC, "按钮还能按——按了却永远不会有进度").toMatch(
      /disabled=\{status !== "active" \|\| boardBlocked\}/,
    );
    expect(COMBAT_SRC, "被挡住时还画进度条,那是在骗人").toMatch(
      /\{boardingOrder && !boardBlocked && \(/,
    );
    expect(COMBAT_SRC, "没有换成说明原因的文案").toMatch(/t\("combat\.boardLocked"\)/);
  });

  it("原因文案中英都在,而且锁位契约自己也写清楚了", () => {
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      for (const k of ["combat.boardLocked", "combat.boardLockedTitle"]) {
        expect(
          seg.match(new RegExp(`"${k.replace(/\./g, "\\.")}": "([^"]*)"`))?.[1],
          `${lang} 缺少 ${k}`,
        ).toBeTruthy();
      }
      const lockLong = seg.match(/"pact\.lockLong\.desc": "([^"]*)"/)?.[1] ?? "";
      expect(
        /board|缴获/.test(lockLong),
        `${lang} 的「长枪」没说它会让你无法缴获:「${lockLong}」`,
      ).toBe(true);
    }
  });

  /** 锁近距的那一条反而和接舷是**协同**的,别顺手把它也挡掉。 */
  it("锁近距的契约不该挡住接舷", () => {
    const close = PACTS.map((p) => pactModifiers([p.id])).find((m) => m.lockedBand === "close");
    expect(close, "没有锁近距的契约了?").toBeTruthy();
    // boardBlocked 的判据里显式排除了 "close"。
    expect(COMBAT_SRC).toMatch(/pacts\.lockedBand !== "close"/);
  });
});
