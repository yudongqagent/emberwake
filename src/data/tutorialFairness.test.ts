import { describe, expect, it } from "vitest";
import { COMBAT_UNLOCKS, isUnlocked } from "./combatUnlocks";
import { advanceRangeBand } from "../engine/combat";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";

/** 没给你工具的事,不该先发生在你身上。
 *
 * 2026-08-31(/loop 第 60 轮)。搜到的一条:"30 秒内玩家必须知道现在该干什么",
 * 以及"前五分钟每一秒非游玩内容都在流失玩家"。于是**从头开了一局**——我连改了
 * 十几轮数值(合金曲线、技能冷却、阵位时间、等级门槛、船体显示),却从没重玩过
 * 开场。
 *
 * 回归结果大部分是好的:开场 13 段可跳过的对白、目标横幅一路正确更新、交战前的
 * 威胁读数在教学关上写着"2 艘 · 单发最重占船体 5%"、抉择卡上词条差和擅长射程都
 * 在、结算面板资源和战后报告齐全。
 *
 * 但实测抓到一条**我自己第 51 轮改出来的**问题。那一轮把敌方的距离拉扯从 1/18
 * 提到 1/8,让"保持也有代价"第一次成立——它同时也在教学关里成立了:
 *
 *     第一场真正的仗(求救信号,掠夺者,偏好近距),耗时 10.4 秒
 *     玩家被从中距拖到**近距**,而开局武器是**远距**枪,在近距吃 ×0.75
 *     而舵手指令要 act1.static.cleared / 4 级才解锁
 *
 * 也就是新玩家在拿到那排按钮之前,就已经在被一个他看不见也管不了的机制扣伤害。
 * combatUnlocks 的原则是"控件在它开始有用的那一刻出现",这条守卫盯的是它的反面。 */

describe("教学期不该被没有解法的机制惩罚", () => {
  it("舵手指令确实是后解锁的——这是问题的前提", () => {
    const stance = COMBAT_UNLOCKS.find((u) => u.id === "stance")!;
    expect(isUnlocked("stance", {}, 1), "1 级就有舵手指令,那这条守卫是空转").toBe(false);
    expect(stance.level).toBeGreaterThan(1);
  });

  it("敌方拉扯的速率快到足以在一场仗里改变档位——所以它必须被门控", () => {
    // 第 51 轮定的:敌方单独拉扯约 8 秒换一档,而实测一场仗中位 11.6 秒。
    let st = { band: "mid" as const, progress: 0 };
    let t = 0;
    let moved = false;
    for (; t < 11.6; t += 0.15) {
      const next = advanceRangeBand(st, "hold", "close", 1 / 4, 1 / 8, 0.15);
      if (next.band !== st.band) { moved = true; break; }
      st = next as typeof st;
    }
    expect(moved, "敌方在一场仗里根本拖不动档位,那门控与否无所谓").toBe(true);
  });

  it("没解锁舵手指令时,敌方的拉扯速率是 0", () => {
    expect(
      COMBAT_SRC,
      "敌方拉扯没有跟着舵手指令的解锁走",
    ).toMatch(/const enemyPullRate = unlocked\("stance"\) \? ENEMY_RANGE_RATE : 0/);
    expect(
      /advanceRangeBand\(\s*\{[^}]*\},\s*stanceOrderRef\.current,\s*preferredRange,\s*playerRate,\s*ENEMY_RANGE_RATE,/.test(COMBAT_SRC),
      "又把常量直接传进去了,门控失效",
    ).toBe(false);
  });

  it("解锁之后拉扯照旧生效——不是把机制删掉", () => {
    const st = { band: "mid" as const, progress: 0 };
    const pulled = advanceRangeBand(st, "hold", "close", 1 / 4, 1 / 8, 0.15);
    expect(pulled.progress, "解锁之后敌方也不拉了,那是把机制删了不是门控").not.toBe(0);
  });
});
