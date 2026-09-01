import { describe, expect, it } from "vitest";
import {
  weaponsCadenceMultiplier,
  shieldsDamageMultiplier,
  enginesRateMultiplier,
  enginesEvasionBonus,
  REACTOR_PIPS,
  DEFAULT_ALLOCATION,
} from "./combat";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 功率分配必须是**三条都有理由走**的取舍。
 *
 * 2026-09-01(/loop 第 77 轮)。功率分配是战斗里唯一一个每场都在的资源取舍
 * (core-loop redesign #2),它自己的注释写着"每拿走一格都是让出一格,所以这是
 * 真正的分配而不是三根一起往上涨的滑条"。
 *
 * 量下来它不是。护盾那一路是**被严格支配**的:
 *
 *     一场仗挨的总伤 ∝ (打完要多久) × (每发打进来多少)
 *     而"打完要多久"正比于武器的冷却倍率 —— **火力也是防御**。
 *
 *     全火力  打完耗时 ×0.60   挨的总伤 ×0.708
 *     全护盾  打完耗时 ×1.20   挨的总伤 ×0.768
 *
 * 押满火力**比押满护盾还更抗打**,同时还快一倍。护盾在它唯一的本职上输给了
 * 火力,所以那一格没有任何理由去点。
 *
 * 代数上很干净:武器每格 w、护盾每格 s,两条路挨的总伤在 **w = s** 时正好相等。
 * 原来 w=0.10 > s=0.09,所以护盾必输。提到 0.13。
 *
 * 这条守卫钉的是**不等式**,不是具体数字——以后谁调平衡都可以,但不能调回
 * "有一路怎么点都不对"。 */

const P = REACTOR_PIPS;

/** 一整场仗挨的总伤,相对均衡态。打得快 = 挨打的时间短,所以火力也进这个式子。 */
function damageTaken(w: number, s: number, e: number): number {
  return weaponsCadenceMultiplier(w) * shieldsDamageMultiplier(s) * (1 - enginesEvasionBonus(e));
}

describe("功率分配必须是真的取舍", () => {
  it("均衡态是干净的:三格中立,谁都不吃亏也不占便宜", () => {
    const { weapons, shields, engines } = DEFAULT_ALLOCATION;
    expect(weapons + shields + engines).toBe(P);
    expect(weaponsCadenceMultiplier(weapons)).toBeCloseTo(1);
    expect(shieldsDamageMultiplier(shields)).toBeCloseTo(1);
    expect(enginesRateMultiplier(engines)).toBeCloseTo(1);
    expect(enginesEvasionBonus(engines)).toBeCloseTo(0);
  });

  it("押满火力,打得最快", () => {
    expect(weaponsCadenceMultiplier(P)).toBeLessThan(weaponsCadenceMultiplier(0));
    expect(weaponsCadenceMultiplier(P)).toBeLessThan(weaponsCadenceMultiplier(2));
  });

  it("押满引擎,换档最快", () => {
    expect(enginesRateMultiplier(P)).toBeGreaterThan(enginesRateMultiplier(2));
    expect(enginesRateMultiplier(P)).toBeGreaterThan(enginesRateMultiplier(0));
  });

  /** 这就是坏掉的那一条。 */
  it("押满护盾,挨打最少——包括比押满火力还少", () => {
    const allShields = damageTaken(0, P, 0);
    const allWeapons = damageTaken(P, 0, 0);
    const allEngines = damageTaken(0, 0, P);
    expect(
      allShields,
      `押满护盾挨 ${allShields.toFixed(3)},押满火力只挨 ${allWeapons.toFixed(3)}——` +
        "火力打得快也等于少挨打,于是护盾在它唯一的本职上都是输的,那一格没有理由去点",
    ).toBeLessThan(allWeapons);
    expect(allShields).toBeLessThan(allEngines);
    expect(allShields).toBeLessThan(damageTaken(2, 2, 2));
  });

  /** 只是"险胜"不算取舍——差得太少玩家感觉不到,还是会一路点火力。 */
  it("而且要赢出让人看得见的幅度", () => {
    const margin = damageTaken(P, 0, 0) / damageTaken(0, P, 0);
    expect(margin, `护盾只比火力抗打 ${((margin - 1) * 100).toFixed(0)}%`).toBeGreaterThan(1.15);
  });

  /** 全押进攻得有代价,否则"分配"退化成"火力条"。 */
  it("一格护盾都不点是要付代价的", () => {
    expect(shieldsDamageMultiplier(0)).toBeGreaterThan(1.15);
  });

  /** 这个仓库自己的规矩:给数字,不给形容词(第 30/53/69/70 轮)。而功率分配此前
   * 只有一个名字和几个亮点,一个数都没有——玩家没法判断该不该挪这一格。 */
  it("控件上写出每一格换来什么", () => {
    // 只查"有没有这个 t() 调用"是不够的:第一版守卫就是这么写的,而我把渲染条件
    // 改成 {false && (...)} 之后它照样绿——数字在页面上已经没了。守卫必须把
    // **渲染条件**一起钉住,否则它证明的只是代码还在,不是玩家还看得见。
    expect(COMBAT_SRC, "功率条上的数字被关掉了").toMatch(
      /\{pct !== 0 && \(\s*\n[\s\S]{0,300}?t\(`reactor\.effect\.\$\{id\}`, \{ pct:/,
    );
    expect(COMBAT_SRC, "三条轴没有各算各的").toMatch(/function effectPct\(/);
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      for (const k of ["weapons", "shields", "engines"]) {
        const v = seg.match(new RegExp(`"reactor\\.effect\\.${k}": "([^"]*)"`))?.[1];
        expect(v, `${lang} 缺少 reactor.effect.${k}`).toBeTruthy();
        expect(v, `reactor.effect.${k} 没有留数字的位置`).toContain("{pct}");
      }
    }
  });

  /** 显示的必须是生效的——这个仓库反复撞到的那一类。 */
  it("控件上那三个百分比,就是那三个函数的真值", () => {
    // 火力看射速(冷却倍率的倒数),不是看冷却本身:玩家关心的是"打得多快"。
    expect(Math.round((1 / weaponsCadenceMultiplier(P) - 1) * 100)).toBe(67);
    expect(Math.round((shieldsDamageMultiplier(P) - 1) * 100)).toBe(-52);
    expect(Math.round((enginesRateMultiplier(P) - 1) * 100)).toBe(88);
    expect(COMBAT_SRC).toMatch(/1 \/ weaponsCadenceMultiplier\(pips\) - 1/);
    expect(COMBAT_SRC).toMatch(/shieldsDamageMultiplier\(pips\) - 1/);
    expect(COMBAT_SRC).toMatch(/enginesRateMultiplier\(pips\) - 1/);
  });
});
