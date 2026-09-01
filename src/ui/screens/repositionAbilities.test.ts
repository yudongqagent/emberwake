import { describe, expect, it } from "vitest";
import { CREW_DEFS } from "../../data/crew";
import { HULL_CLASS_ABILITIES } from "../../data/namedShips";
import { RANGE_ORDER } from "../../engine/combat";
import COMBAT_SRC from "./Combat.tsx?raw";

/** 说"立即换一档距离"的技能,就得真的换一档距离。
 *
 * 2026-08-31(/loop 第 68 轮)。「闪避冲刺」(通用舵手)的描述是"立即切换一档交战
 * 距离",「相位跃迁」(拦截舰)是"立即重新定位"。而两者的实现都只推了 arenaRef 里
 * 那个**渲染用的精灵坐标**,一个字都没碰 rangeBandRef。
 *
 * 这是"舰桥指挥"重构留下的:那之前距离档位由真实 x/y 距离推出
 * (rangeBandFromDistance),推一下船确实换档;重构之后档位变成独立状态,而这两个
 * 技能没跟着改。rangeBandFromDistance 现在整个代码库里都不存在了——那两下位移
 * 是纯动画。
 *
 * 对「闪避冲刺」尤其要命:那是它的**全部**效果,而它挂在一个可以反复购买的通用
 * 船员身上(第 66 轮刚给那个购买加了递增价格)。
 *
 * 这条和第 47/51 轮是一条线:那两轮把距离做成了一种要花 4~8 秒的战术资源,而这里
 * 有两个号称能瞬间改变它的按钮,实际什么都不做。 */

describe("重新定位类技能要真的改变距离档位", () => {
  it("确实有技能承诺改变距离", () => {
    const helm = CREW_DEFS.find((c) => c.id === "recruitHelm")!;
    expect(helm.active, "舵手的技能描述变了").toMatch(/range band/i);
    const interceptor = HULL_CLASS_ABILITIES.find((h) => h.abilityId === "blinkVector");
    // 查的是**意图**(承诺改变距离),不是某个措辞:第 69 轮把两条文案都改成了带数字的
    // 版本,"reposition" 这个词没了,而承诺没变。守卫盯措辞就会在文案变好时报假警。
    expect(interceptor?.active, "拦截舰的技能描述变了").toMatch(/range band/i);
  });

  /** 只查**调用**,不查这个词:实现里的说明注释本来就要提到它,
   * 第一版写成查词,立刻被自己的注释绊倒了(和第 28 轮那次扫描范围出错同类)。 */
  it("旧的距离模型已经不存在了——所以推精灵坐标什么也改不了", () => {
    expect(
      /rangeBandFromDistance\s*\(/.test(COMBAT_SRC),
      "距离又回到按 x/y 算了,那这条守卫的前提要重写",
    ).toBe(false);
  });

  it("两个技能都调了真正改档位的那个函数", () => {
    expect(COMBAT_SRC, "没有共用的换档函数").toMatch(/function jumpOneBand\(\)/);
    expect(COMBAT_SRC, "闪避冲刺没有换档").toMatch(/jumpOneBand\(\);\s*\n\s*pushLog\(t\("combat\.log\.evasiveBurn"\)\)/);
    expect(COMBAT_SRC, "相位跃迁没有换档").toMatch(/jumpOneBand\(\);\s*\n\s*pushLog\(t\("combat\.log\.blinkVector"\)\)/);
  });

  it("换档会同时改 ref 和 state,否则界面和结算会各说各的", () => {
    expect(COMBAT_SRC).toMatch(/rangeBandRef\.current = RANGE_ORDER\[next\]/);
    expect(COMBAT_SRC).toMatch(/setRangeBand\(RANGE_ORDER\[next\]\)/);
    expect(COMBAT_SRC, "跳档之后没有清掉拉锯进度").toMatch(/rangeProgressRef\.current = 0/);
  });

  it("方向跟着玩家已经下达的舵手指令走", () => {
    expect(COMBAT_SRC).toMatch(/order === "close" \? -1 : order === "retreat" \? 1 : 0/);
  });

  it("到头了就不动,不会跳出档位表", () => {
    // 实现里用 Math.max/min 夹住,再用 next === idx 提前返回。
    expect(COMBAT_SRC).toMatch(/Math\.max\(0, Math\.min\(RANGE_ORDER\.length - 1, idx \+ delta\)\)/);
    expect(COMBAT_SRC).toMatch(/if \(next === idx\) return;/);
    expect(RANGE_ORDER.length).toBe(3);
  });
});
