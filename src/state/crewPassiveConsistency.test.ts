import { describe, expect, it, beforeEach } from "vitest";
import { state, replaceState, flagship, effectiveShipEvasion, crewPassiveScale } from "./store";
import { createInitialState } from "../engine/save";
import { approvalEffects } from "../data/crewApproval";
import STORE_SRC from "./store.ts?raw";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";
import CREW_SRC from "../ui/screens/Crew.tsx?raw";

/** 船员被动要**全部**按支持度缩放,一条都不能例外。
 *
 * 2026-09-01(/loop 第 116 轮)。搜到的说法是"机制对齐":玩家的动机和系统的奖励
 * 要指向同一处,否则就是反向激励。顺着这条查船员系统,查出的不是激励问题,是
 * 一条更直接的:**显示的不等于生效的**。
 *
 * 六条船员被动走 crewPassiveScale(按支持度缩放):
 *     priyaOsei / unit7Requiem / oriVashti / kessaVray / recruitTactician / velaCantor
 * 而舵手那条走的是 crewCount()——**只数人头,不看支持度**,而且两处都是这样
 * (store.ts 的 effectiveShipEvasion,以及 Combat.tsx 自己那份战斗内的式子)。
 *
 * 后果:船员界面按 approvalEffects 写着「被动发挥 50%」,实际给的是 100%。
 * 实测(我的存档,把在编舵手在两个档位之间来回调,读舰桥的闪避):
 *
 *     改前   稳当(50) 30.2%    记恨(15) 30.2%   ← 一动不动
 *     改后   稳当(50) 30.2%    记恨(15) 28.4%
 *
 * 这条同时也让第 112 轮那条"输了要能爬回来"对舵手完全失效——他的被动本来就不受
 * 支持度影响,涨跌都无所谓。
 *
 * 线性叠加和"没有上限"都没有变(第 66 轮那条守卫的原意仍然成立:价格是唯一的
 * 刹车),变的只是每一份按各自的支持度打折。 */

describe("船员被动的缩放要一致", () => {
  beforeEach(() => replaceState(createInitialState()));

  function withHelm(approval: number) {
    const init = createInitialState();
    replaceState({
      ...init,
      crew: [{ id: "helm_1", defId: "recruitHelm", approval, assignedShipId: init.flagshipId }],
    });
  }

  it("支持度掉档之后,闪避真的会跟着掉", () => {
    withHelm(50);
    const steady = effectiveShipEvasion(flagship.value!);
    replaceState({
      ...state.value,
      crew: state.value.crew.map((c) => ({ ...c, approval: 15 })),
    });
    const resentful = effectiveShipEvasion(flagship.value!);
    expect(resentful, `记恨档的闪避没有比稳当档低(${resentful} vs ${steady})——被动没在看支持度`)
      .toBeLessThan(steady);
  });

  /** 界面显示的倍率必须就是实际生效的那个。 */
  it("界面写的倍率和实际缩放对得上", () => {
    withHelm(15);
    const shown = approvalEffects(15).passiveMultiplier;
    expect(crewPassiveScale("recruitHelm"), `界面写 ${shown}×,实际缩放却不是`).toBeCloseTo(shown, 5);
  });

  it("多个同类船员按各自的支持度分别打折", () => {
    const init = createInitialState();
    replaceState({
      ...init,
      crew: [
        { id: "a", defId: "recruitHelm", approval: 50, assignedShipId: init.flagshipId },
        { id: "b", defId: "recruitHelm", approval: 15, assignedShipId: null },
      ],
    });
    const expected = approvalEffects(50).passiveMultiplier + approvalEffects(15).passiveMultiplier;
    expect(crewPassiveScale("recruitHelm"), "没有按每个人各自的档位算").toBeCloseTo(expected, 5);
  });

  /** 这条是核心:不能再有哪条被动绕过 crewPassiveScale 直接数人头。 */
  it("没有任何一条船员被动还在用裸人头数", () => {
    const offenders: string[] = [];
    for (const [name, src] of [["store.ts", STORE_SRC], ["Combat.tsx", COMBAT_SRC]] as const) {
      // crewCount 本身还有合法用途(招募定价按已有人数),所以只抓"乘一个系数"
      // 这种当被动强度用的写法。
      for (const m of src.matchAll(/crewCount\("(\w+)"\)\s*\*/g)) {
        offenders.push(`${name}: crewCount("${m[1]}") 被当成被动强度用了`);
      }
      for (const m of src.matchAll(/\*\s*crewCount\("(\w+)"\)/g)) {
        offenders.push(`${name}: crewCount("${m[1]}") 被当成被动强度用了`);
      }
    }
    expect(offenders, `这些被动绕过了支持度:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("舵手那条确实换成了按支持度缩放,两处都换了", () => {
    expect(STORE_SRC, "store 的闪避式子还在数人头").toMatch(
      /\+ 0\.05 \* crewPassiveScale\("recruitHelm"\)/,
    );
    expect(COMBAT_SRC, "战斗内那份式子还在数人头").toMatch(
      /crewPassiveScale\("recruitHelm"\) \* 0\.05/,
    );
  });

  /** 界面那句话是这条 bug 的原告,顺手钉住它还在。 */
  it("船员界面仍然在按 approvalEffects 报倍率", () => {
    expect(CREW_SRC).toMatch(/passive: Math\.round\(eff\.passiveMultiplier \* 100\)/);
  });
});
