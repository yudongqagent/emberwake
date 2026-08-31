import { describe, expect, it } from "vitest";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";
import ENGINE_SRC from "./engine.ts?raw";

/** 防守端的每一种结果都要有自己的声音。
 *
 * 2026-08-31(/loop 第 32 轮)。战斗里挨打这一段原来只有一个声音:
 *
 *   - 抗冲**挡下**一发,和硬吃一发,播的是同一个 `hit`
 *   - 被闪掉的一发**完全静音**,只往日志里写一行
 *   - 暴击和普通命中,声音也一样(只有画面不同)
 *
 * 战斗代码自己的注释早就点破过第一条:「正确读出对手意图的奖励是一次"没有发生",
 * 而那感觉上等于什么都没有」——作者为此加了视觉弹字和光环,声音那一路没跟上。
 * 而第 24 轮之后战斗**要求**主动抗冲(零操作打不赢),这个反馈就是玩家判断自己
 * 按对没按对的唯一即时信号。
 *
 * 搜到的原则是"命中、被挡下、其它结果各要有各自的反馈";那份 DOOM 的研究里,
 * 开声音的玩家得分接近静音的两倍。
 *
 * 关于验证:暴击那一支是在真实战斗里量到的(音频节点序列里出现了它专属的
 * 1500Hz)。抗冲和闪避要撞上特定时机才会走到,所以用这条源码级的测试钉住接线——
 * 顺带记一笔:第一次读数时我把胜利小号里的 660Hz 当成了抗冲音,序列一看
 * (440,550,660,880)就知道认错了。 */

describe("防守端的三种结果各有各的声音", () => {
  it("抗冲挡下和硬吃一发,播的不是同一个音", () => {
    expect(
      COMBAT_SRC,
      "挡下和挨打共用一个 playSfx(\"hit\")——玩家听不出自己按对没按对",
    ).toMatch(/playSfx\(braced \? "braced" : "hit"\)/);
  });

  it("被闪掉的攻击有声音,不是静音", () => {
    // 闪避流派下四分之一以上的敌方攻击走这一支。
    const missBranch = COMBAT_SRC.slice(COMBAT_SRC.indexOf("combat.log.enemyMiss") - 400, COMBAT_SRC.indexOf("combat.log.enemyMiss"));
    expect(missBranch, "未命中那一支里没有任何音效").toMatch(/playSfx\("evade"\)/);
  });

  it("暴击有自己的声音", () => {
    expect(COMBAT_SRC).toMatch(/playSfx\("crit"\)/);
  });

  it("这三个音在引擎里都真的合成了,不是空分支", () => {
    for (const name of ["braced", "evade", "crit"]) {
      const at = ENGINE_SRC.indexOf(`case "${name}":`);
      expect(at, `引擎里没有 ${name} 的合成分支`).toBeGreaterThan(-1);
      const body = ENGINE_SRC.slice(at, ENGINE_SRC.indexOf("break;", at));
      expect(body, `${name} 是个空分支,不发声`).toMatch(/tone\(|noiseBurst\(/);
    }
  });

  it("挡下音和普通命中音的波形不同——不能只是改了个名字", () => {
    const bodyOf = (n: string) => {
      const at = ENGINE_SRC.indexOf(`case "${n}":`);
      return ENGINE_SRC.slice(at, ENGINE_SRC.indexOf("break;", at));
    };
    expect(bodyOf("braced")).not.toBe(bodyOf("hit"));
    expect(bodyOf("evade")).not.toBe(bodyOf("hit"));
    // 挡下带一记金属余音(振荡器),普通命中只有噪声——实测节点数 osc1+buf1 对 osc0+buf1。
    expect(bodyOf("braced"), "挡下音里没有 tone(),和普通命中听起来会是一类东西").toMatch(/tone\(/);
  });
});
