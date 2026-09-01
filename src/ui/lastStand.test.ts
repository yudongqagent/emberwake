import { describe, expect, it } from "vitest";
import COMBAT_SRC from "./screens/Combat.tsx?raw";
import { MODULE_EFFECTS } from "../data/moduleEffects";

/** 「背水」得对**每一种**致命伤都生效。
 *
 * 2026-09-01(/loop 第 111 轮)。搜到的对照是 Hades 的 God Mode——它和 Heat 是
 * 一对。而 emberLoad.ts 的开头就写着自己"From Hades' Heat":这个仓库把难度往上
 * 调的那一半抄来了,往下兜底的那一半没有。顺着"卡住的玩家怎么办"去翻兜底机制,
 * 翻到了这个:
 *
 * moduleEffects.ts 给「背水」的说明是"每场战斗可承受一次**本应致命**的攻击",
 * 没有任何限定。而判定原来写在 setPlayerHull 的**其中一个调用点传进去的回调里**,
 * 别的调用点各写各的:
 *
 *     直接武器火力          prev - dealt       有背水判定
 *     圣咏合击 / 攻城齐射   prev - total       **没有**
 *     狮心荣誉反击          h - counterDmg     **没有**
 *
 * 更要命的是原处那段注释明明白白写着相反的话:
 *
 *     "every other damage source (burn, Choral Strike, honor riposte) routes
 *      through setPlayerHull too, so the save applies to all of them rather
 *      than only to direct weapon fire."
 *
 * 它点名的两条,正是漏掉的两条。setPlayerHull 只是个 useState 的 setter,
 * "都路过它"不等于"都过了那道判定"。
 *
 * 修法是把判定收进唯一的入口 applyPlayerDamage,三条路全走它。 */

/** 从源码里挖出 applyPlayerDamage 的函数体。 */
function damageRoot(): string {
  const i = COMBAT_SRC.indexOf("function applyPlayerDamage(");
  expect(i, "找不到 applyPlayerDamage——玩家挨伤没有统一入口了").toBeGreaterThan(0);
  const j = COMBAT_SRC.indexOf("\n  }", i);
  return COMBAT_SRC.slice(i, j);
}

describe("背水", () => {
  it("这个效果确实承诺了「任何一次致命伤」", () => {
    const def = MODULE_EFFECTS.find((e) => e.id === "lastStand");
    expect(def, "lastStand 效果没了?那这条守卫要重写").toBeTruthy();
    // 说明里没有"只对某种伤害"的限定——所以实现也不能有。
    expect(def!.description.toLowerCase()).toContain("lethal");
    expect(def!.descriptionCn).toContain("致命");
  });

  it("判定只有一份,而且在统一入口里", () => {
    const hits = COMBAT_SRC.match(/hasEffect\("lastStand"\)/g) ?? [];
    expect(hits.length, `背水判定出现了 ${hits.length} 次——多份迟早会分叉`).toBe(1);
    expect(damageRoot(), "背水判定不在 applyPlayerDamage 里").toMatch(
      /next <= 0 && hasEffect\("lastStand"\) && !lastStandUsedRef\.current/,
    );
  });

  /** 这一条是整条修法的关键:没有任何一处再自己减血。 */
  it("没有任何地方绕过入口直接扣血", () => {
    const root = damageRoot();
    const outside = COMBAT_SRC.replace(root, "");
    const bad: string[] = [];
    // setPlayerHull 的回调里只允许出现加法(治疗)和初始化,不允许减法。
    for (const m of outside.matchAll(/setPlayerHull\(\([^)]*\)\s*=>\s*([\s\S]{0,140})/g)) {
      const body = m[1];
      if (/-\s*(dealt|total|counterDmg|dmg|amount|damage)/.test(body)) {
        bad.push(body.split("\n")[0].trim().slice(0, 80));
      }
    }
    expect(bad, `这些地方绕过 applyPlayerDamage 自己扣血,背水对它们不生效:\n${bad.join("\n")}`)
      .toEqual([]);
  });

  it("三条伤害路径都走同一个入口", () => {
    // 直接武器火力
    expect(COMBAT_SRC, "武器火力没走入口").toMatch(/if \(dealt > 0\) applyPlayerDamage\(dealt\);/);
    // 圣咏合击 / 攻城齐射
    expect(COMBAT_SRC, "齐射没走入口").toMatch(/applyPlayerDamage\(total\);/);
    // 狮心荣誉反击
    expect(COMBAT_SRC, "荣誉反击没走入口").toMatch(/applyPlayerDamage\(counterDmg\);/);
  });

  it("入口仍然只挡一次,而且留在 1 点船体", () => {
    const root = damageRoot();
    expect(root, "没有把「已经用过」记下来——那就成了无限复活").toMatch(
      /lastStandUsedRef\.current = true;/,
    );
    expect(root, "挡下来之后不是留 1 点血").toMatch(/return 1;/);
  });

  /** 治疗不能被误伤:入口只处理扣血。 */
  it("治疗仍然走各自的路径,没被卷进来", () => {
    expect(COMBAT_SRC, "治疗被改成走扣血入口了").toMatch(/setPlayerHull\(\(h\) => Math\.min\(maxHull, h \+ heal\)\)/);
  });
});
