import { describe, expect, it } from "vitest";
import { HULL_CLASSES } from "./hullClasses";
import { MODULE_DEFS } from "./moduleDefs";
import type { ModuleDef } from "./types";

/** 没有哪个选项是"白给的坏选项"。
 *
 * 2026-09-01(/loop 第 105 轮之后的第 106 轮)。搜到的一句话正对着这件事:
 * 「某些流派没人用,不是因为它超模,而是因为**别的选项太弱**」——被全面压制的
 * 选项不会让内容变多,只会让内容看起来比实际多。
 *
 * 这一轮我把三个选择系统都量了一遍,结论是**现在是干净的**:
 *
 *     舰级   7 个档位,除了起手的护卫舰,每档 2 个,没有一对互相压制
 *     模块   200 件、40 条(门派 × 类型)线,稀有度递增时没有任何一项倒退
 *     模块   26 组"同类型 + 同稀有度 + 同签名效果"里,没有一对互相压制
 *
 * 所以这份守卫**不是在修 bug**,是在钉住已经成立的性质——而这个性质在这个仓库
 * 里真的塌过:types.ts 上 baseEvasion 的注释记着「50 件引擎一个数值都没有,
 * mk5 引擎因为耗电更多**严格劣于 mk1**」。那次是靠人读出来的,没有守卫拦。
 * 这个仓库加内容很频繁,下一次加一条新门派线时,这三条就该由测试来拦。
 *
 * 两个关键的"别误报"的口子,是我这轮先踩了才想明白的:
 *
 *   1. 只比裸数值会把**签名效果**不同的模块判成压制。第一版扫出 11 对,逐个看下来
 *      全是假阳性——比如构装体护甲和狮心护甲格挡、耗电完全一样,只差一点推进力,
 *      但签名效果一个是 hullBonus 一个是 bulwark。types.ts 自己写着签名效果是
 *      "定义这个模块的那个固定效果",那它就不能被当成可比的同类。
 *   2. 舰级要连**槽位构成**一起比,不能只看总数——驱逐舰和拦截舰都是 6 槽,
 *      差别全在"多一个工程位还是多一个引擎位"上。
 */

const HULL_AXES = ["baseHull", "basePower", "baseSpeed"] as const;
const MOD_AXES = ["baseDamage", "baseBlock", "baseEvasion", "baseThrust"] as const;

/** 比强弱要用 **DPS**,不能用单发伤害。
 *
 * 第 76 轮就栽过一次:用单发伤害量抽卡档位差异,量出来"没区别",换成 DPS 才看见
 * 13% → 28%。这一轮我又栽了同一个坑——把冷却从比较里漏掉,于是扫出两对"压制":
 *
 *     构装体 mk5 工程件  伤害 44 / 冷却 3.0  = 14.7 dps
 *     狮心   mk5 工程件  伤害 38 / 冷却 2.6  = 14.6 dps
 *     圣咏   mk2 武器    伤害 16 / 冷却 0.62 = 25.8 dps
 *     虫群   mk2 武器    伤害 10 / 冷却 0.40 = 25.0 dps
 *
 * 两对的 DPS 几乎一样,差别是"一发重"还是"打得快"——那是真取舍,不是坏选项。
 *
 * 而且"严格帕累托压制"这把尺子本身对连续数值太脆:上面第一对只差 **0.7% DPS**,
 * 那不是压制,那是四舍五入。真正的门槛得由游戏自己的随机决定——
 * qualityMultiplier 是 0.88 + roll×0.24,也就是同一个 def 的两个实例能差到
 * 1.12/0.88 ≈ **1.27 倍**。所以只有当"B 掷到最好也打不过 A 掷到最差"时,
 * B 才真的是一个没人该拿的选项。低于这个差距的,玩家根本分不出来。 */
const QUALITY_MIN = 0.88, QUALITY_MAX = 1.12;
function comparableStats(m: ModuleDef) {
  const cd = m.cooldown ?? 0;
  return {
    // 有冷却的按 DPS 折算;没冷却的(护甲之类)伤害本来就是 0。
    dps: cd > 0 ? (m.baseDamage ?? 0) / cd : (m.baseDamage ?? 0),
    baseBlock: m.baseBlock ?? 0,
    baseEvasion: m.baseEvasion ?? 0,
    baseThrust: m.baseThrust ?? 0,
    powerDraw: m.powerDraw,
  };
}
const RARITY_ORDER = ["mk1", "mk2", "mk3", "mk4", "mk5"];

/** A 在每一条轴上都不差于 B,且至少一条严格更好。 */
function dominates<T>(A: T, B: T, higherIsBetter: readonly (keyof T)[], lowerIsBetter: readonly (keyof T)[] = []): boolean {
  const num = (v: unknown) => (typeof v === "number" ? v : 0);
  const ge = higherIsBetter.every((f) => num(A[f]) >= num(B[f])) && lowerIsBetter.every((f) => num(A[f]) <= num(B[f]));
  const gt = higherIsBetter.some((f) => num(A[f]) > num(B[f])) || lowerIsBetter.some((f) => num(A[f]) < num(B[f]));
  return ge && gt;
}

describe("内容不能有被全面压制的选项", () => {
  it("每个舰级档位(除了起手那一档)都至少有两个选择", () => {
    const byTier = new Map<number, string[]>();
    for (const h of HULL_CLASSES) byTier.set(h.order, [...(byTier.get(h.order) ?? []), h.id]);
    const thin = [...byTier.entries()]
      .filter(([order, ids]) => order > 0 && ids.length < 2)
      .map(([order, ids]) => `第 ${order} 档只有 ${ids.join("/")}`);
    expect(thin, `进阶变成一条直线了:\n${thin.join("\n")}`).toEqual([]);
  });

  /** docs/content-depth-standards.md §1:同档两条船,谁也不能全面压制谁。
   *  槽位要按**每一种**比,不能只比总数。 */
  it("同档的舰级之间没有一个全面压制另一个", () => {
    const flat = HULL_CLASSES.map((h) => ({
      id: h.id, order: h.order,
      baseHull: h.baseHull, basePower: h.basePower, baseSpeed: h.baseSpeed,
      weapon: h.slots.weapon, armor: h.slots.armor, engine: h.slots.engine, utility: h.slots.utility,
    }));
    const axes = [...HULL_AXES, "weapon", "armor", "engine", "utility"] as const;
    const bad: string[] = [];
    for (const A of flat) for (const B of flat) {
      if (A.id === B.id || A.order !== B.order) continue;
      if (dominates(A, B, axes)) bad.push(`${A.id} 全面压制同档的 ${B.id}`);
    }
    expect(bad, `同档出现了假选择:\n${bad.join("\n")}`).toEqual([]);
  });

  /** 这一条钉的正是 types.ts 里记着的那次事故:同一条线上,更高稀有度不能更差。 */
  it("同一条模块线上,稀有度越高不能有任何一项更差", () => {
    const lines = new Map<string, ModuleDef[]>();
    for (const m of MODULE_DEFS) {
      const k = `${m.family}|${m.type}`;
      lines.set(k, [...(lines.get(k) ?? []), m]);
    }
    const bad: string[] = [];
    for (const [k, list] of lines) {
      const sorted = [...list].sort(
        (a, b) => RARITY_ORDER.indexOf(a.baseRarity) - RARITY_ORDER.indexOf(b.baseRarity),
      );
      for (let i = 1; i < sorted.length; i++) {
        const lo = sorted[i - 1], hi = sorted[i];
        for (const f of MOD_AXES) {
          const a = (hi[f] ?? 0), b = (lo[f] ?? 0);
          if (a < b) bad.push(`[${k}] ${hi.id}(${hi.baseRarity}) 的 ${f} 反而更低:${a} < ${b}`);
        }
        // 耗电变高是允许的,但必须换来点什么——否则就是纯粹的退步。
        if (hi.powerDraw > lo.powerDraw && !MOD_AXES.some((f) => (hi[f] ?? 0) > (lo[f] ?? 0))) {
          bad.push(`[${k}] ${hi.id} 比 ${lo.id} 更耗电,却没有任何一项更好`);
        }
      }
    }
    expect(bad, `升级反而变弱:\n${bad.join("\n")}`).toEqual([]);
  });

  /** 只有**签名效果相同**时,裸数值才真的可比——不然是在拿两种东西比。
   *  我第一版漏了这个条件,扫出 11 对全是假阳性。 */
  it("同类型 + 同稀有度 + 同签名效果的模块,没有一个全面压制另一个", () => {
    const groups = new Map<string, ModuleDef[]>();
    for (const m of MODULE_DEFS) {
      const k = `${m.type}|${m.baseRarity}|${m.signature}`;
      groups.set(k, [...(groups.get(k) ?? []), m]);
    }
    const comparable = [...groups.values()].filter((l) => l.length > 1);
    // 先确认这条测试**有东西可比**,否则它永远绿,等于没写。
    expect(comparable.length, "一组可比的模块都没有?那这条守卫等于没跑").toBeGreaterThan(0);

    const bad: string[] = [];
    for (const list of comparable) {
      for (const A of list) for (const B of list) {
        if (A.id === B.id) continue;
        const a = comparableStats(A), b = comparableStats(B);
        const rolled = ["dps", "baseBlock", "baseEvasion", "baseThrust"] as const;
        // B 掷到最好,仍然打不过 A 掷到最差——每一条轴都是。
        const hopeless = rolled.every((f) => b[f] * QUALITY_MAX <= a[f] * QUALITY_MIN)
          && rolled.some((f) => a[f] > 0)
          && a.powerDraw <= b.powerDraw;
        if (hopeless) bad.push(`${A.id} 压制 ${B.id}(B 掷满也打不过 A 掷底)`);
      }
    }
    expect(bad, `同签名效果下出现了纯粹的坏选项:\n${bad.join("\n")}`).toEqual([]);
  });
});
