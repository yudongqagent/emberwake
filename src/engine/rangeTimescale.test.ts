import { describe, expect, it } from "vitest";
import { advanceRangeBand, type RangeState } from "./combat";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";

/** 换一次档位所需的时间,必须短于一场仗。
 *
 * 2026-08-31(/loop 第 51 轮)。舵手指令(接近/保持/撤离)是战斗界面正中那一整行,
 * 永远摆着。而它原来的时间常数是照着"要比旧的 1.6 秒长一个数量级"定的——方向
 * 对,但**没有对照过一场仗到底有多长**。
 *
 * 实测今天的全部战斗:6.4 / 7.9 / 8.6 / 11.5 / 11.6 / 12.1 / 12.6 / 12.7 / 13.2 秒,
 * 中位 11.6,**最长 13.2**。而换一档要 16 秒,被敌方顶着时净速率是
 * 1/16 − 1/18 = 1/144 —— **争夺一个档位要 144 秒**。
 *
 * 浏览器实拍确认:下达「接近」后每 0.5 秒采样一次,25 秒里档位全程「中距」,
 * 一次都没变。也就是说整套阵位/擅长射程/派系偏好在普通战斗里是**死的**——
 * 第 47 轮拍不到武器档位变色,原因就在这儿。
 *
 * 这条守卫把两个时间常数拴在一起:阵位要是一种"要花时间"的资源,但花的时间
 * 得能在一场仗里花完。 */

/** 实测中位。改这个数之前先去量,别拍脑袋。 */
const TYPICAL_FIGHT_SECONDS = 11.6;
/** 战斗心跳。阵位就是在这个节拍上推进的。 */
const TICK = 0.15;

/** 模拟到换档为止要多少秒;换不了就返回 Infinity。 */
function secondsToShift(
  order: "close" | "hold" | "retreat",
  enemyPreferred: "close" | "mid" | "long",
  playerRate: number,
  enemyRate: number,
  cap = 120,
): number {
  let st: RangeState = { band: "mid", progress: 0 };
  for (let t = 0; t < cap; t += TICK) {
    st = advanceRangeBand(st, order, enemyPreferred, playerRate, enemyRate, TICK);
    if (st.band !== "mid") return t + TICK;
  }
  return Infinity;
}

/** 从源码里读实际用的常数,避免测试和实现各写一份数字。 */
function constant(name: string): number {
  const m = COMBAT_SRC.match(new RegExp(`const ${name} = ([0-9./ ]+);`));
  expect(m, `Combat.tsx 里找不到 ${name}`).toBeTruthy();
  return eval(m![1]) as number;
}

const BASE_CLOSE_SECONDS = constant("BASE_CLOSE_SECONDS");
const ENEMY_RANGE_RATE = constant("ENEMY_RANGE_RATE");
const PLAYER_RATE = 1 / BASE_CLOSE_SECONDS;

describe("阵位的时间尺度要和战斗长度对得上", () => {
  it("无人争夺时,一场仗之内换得掉档位", () => {
    const s = secondsToShift("close", "mid", PLAYER_RATE, ENEMY_RANGE_RATE);
    expect(
      s,
      `无人争夺换一档要 ${s} 秒,而一场仗只有 ${TYPICAL_FIGHT_SECONDS} 秒——那这排按钮按了也没用`,
    ).toBeLessThan(TYPICAL_FIGHT_SECONDS);
  });

  it("被敌方顶着时也换得掉,只是要花掉几乎整场", () => {
    // 敌人偏好远距、玩家要贴脸:两边反着拉。
    const s = secondsToShift("close", "long", PLAYER_RATE, ENEMY_RANGE_RATE);
    // 上限刻意就是"一场仗",不留 1.3 倍的宽限:第一版给了宽限,守卫过了,
    // 而实拍那场 8.8 秒的仗里档位照样没换成——**被顶着才是常态**,宽限等于放行。
    expect(s, `被顶着时要 ${s} 秒,一场仗根本打不完`).toBeLessThan(TYPICAL_FIGHT_SECONDS);
    expect(s, "被顶着和没人拦一样快,那敌人的偏好就没有意义").toBeGreaterThan(
      secondsToShift("close", "mid", PLAYER_RATE, ENEMY_RANGE_RATE) * 1.3,
    );
  });

  it("「保持」也有代价:什么都不做会被拖到对方想要的距离", () => {
    const s = secondsToShift("hold", "close", PLAYER_RATE, ENEMY_RANGE_RATE);
    expect(
      s,
      `敌人把你拖过来要 ${s} 秒,比一场仗还长——那"保持"就是免费的`,
    ).toBeLessThan(TYPICAL_FIGHT_SECONDS);
  });

  it("但也不能快到变成免费动作", () => {
    const s = secondsToShift("close", "mid", PLAYER_RATE, ENEMY_RANGE_RATE);
    expect(
      s,
      `换一档只要 ${s} 秒,阵位就不再是要花时间守住的资源了`,
    ).toBeGreaterThan(TYPICAL_FIGHT_SECONDS * 0.25);
  });

  it("撤离和接近对称", () => {
    const close = secondsToShift("close", "mid", PLAYER_RATE, ENEMY_RANGE_RATE);
    const retreat = secondsToShift("retreat", "mid", PLAYER_RATE, ENEMY_RANGE_RATE);
    expect(retreat).toBeCloseTo(close, 5);
  });
});
