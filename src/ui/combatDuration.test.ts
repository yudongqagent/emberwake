import { describe, expect, it } from "vitest";
import COMBAT_SRC from "./screens/Combat.tsx?raw";

/** 战后报告的"用时"要是**这一仗真的推进了多少秒**,不是墙上时钟。
 *
 * 2026-09-01(/loop 第 107 轮)。这一轮是真的从头开了一局打到第一场仗(前面几轮
 * 都在已有存档上抽查),在胜利面板上看见的:
 *
 *     Duration 150.7s
 *
 * 而第 89 轮的注释里量过"一场仗实测只有 8~12 秒"。差十倍以上的原因是那个数是
 * (Date.now() - 开打时刻)/1000,而**第 89 轮之后战斗在标签页看不见时是暂停的**
 * ——切走的那几分钟一秒不落地算进了"这一仗打了多久"。两个功能各自都对,凑在一起
 * 就错了,这是这个仓库最常见的那种 bug。
 *
 * 倍速按钮(1×/2×/3×)是同一个毛病的另一半:combatTick 里
 * `dt = COMBAT_TICK_SEC * combatSpeed`,三倍速下同样一场仗墙上时钟只走三分之一。
 *
 * 换成累加 combatTick 的 dt 就两个都解决了:那一跳只在战斗真的推进时执行
 * (shouldPause 在它前面挡着),倍速也已经折在 dt 里。
 *
 * 同一局里的前后实测(我一边打一边逐帧推进,所以墙上时钟被我自己拉得很长):
 *
 *                    我的墙上时钟    报告里的 Duration
 *     第一波(改前)      ~150 秒          150.7s   ← 跟着墙走
 *     第二波(改后)       47.4 秒            4.3s   ← 跟着战斗走
 */

describe("战后报告的用时", () => {
  it("用的是累加出来的模拟时间,不是墙上时钟", () => {
    expect(COMBAT_SRC, "还在用 Date.now() 减开打时刻当用时").not.toMatch(
      /seconds: \(Date\.now\(\) - \w+\.current\) \/ 1000/,
    );
    expect(COMBAT_SRC, "战后报告没有用累加的那个值").toMatch(/seconds: elapsedRef\.current/);
  });

  /** 墙上时钟的那个起点必须**彻底删掉**——留着迟早有人再拿它算时长。 */
  it("不再保留一个开打时刻的墙上时间戳", () => {
    expect(COMBAT_SRC, "combatStartRef 还在,下一个人还会拿它算时长").not.toMatch(/combatStartRef/);
  });

  /** 累加必须发生在 combatTick **里面**。
   *
   * 这是整条修法的关键:暂停的判断(shouldPause)挡在 combatTick 的调用点前面,
   * 所以只要累加在 tick 内部,看不见的那段时间就自动不算。要是有人把它挪到
   * setInterval 的回调里、挡板外面,bug 就原样回来了。 */
  it("累加在 combatTick 内部,所以暂停时不会计时", () => {
    const i = COMBAT_SRC.indexOf("function combatTick() {");
    expect(i, "找不到 combatTick").toBeGreaterThan(0);
    const body = COMBAT_SRC.slice(i, i + 600);
    expect(body, "用时的累加不在 combatTick 里").toMatch(/elapsedRef\.current \+= dt;/);
    // 累加用的就是驱动战斗的那个 dt,倍速已经折在里面。
    expect(body).toMatch(/const dt = COMBAT_TICK_SEC \* combatSpeedRef\.current;/);
  });

  /** 暂停的挡板还得在 tick 的调用点前面——第 89 轮那条,顺手一起钉住,
   *  因为这一轮的修法**依赖**它。 */
  it("看不见的时候仍然不推进战斗", () => {
    expect(COMBAT_SRC).toMatch(/if \(shouldPause\(\)\) return;\s*\n\s*combatTick\(\);/);
    expect(COMBAT_SRC, "暂停判断被改了——两个信号缺一不可").toMatch(
      /document\.hidden && Date\.now\(\) - lastFrameAtRef\.current > 500/,
    );
  });
});
