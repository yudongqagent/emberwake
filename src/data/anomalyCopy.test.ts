import { describe, expect, it } from "vitest";
import { RIFT_ANOMALIES } from "./rift";
import STRINGS_SRC from "../i18n/strings.ts?raw";
import RIFT_SRC from "./rift.ts?raw";

/** 裂隙异常的说明,得让玩家在"要不要再下一层"之前算得出账。
 *
 * 2026-08-31(/loop 第 70 轮)。第 55 轮把"现在撤出能拿什么档次 / 再撑一层能拿什么"
 * 摆到了那个抉择点上;这一轮回去看同一块屏幕上另一半信息——异常。
 *
 * 十条异常说明,**一条数字都没有**:
 *
 *     数量远多于常,但个个孱弱。
 *     护甲极厚。需要能穿透的武器。
 *     此处万物自我修复。要么打得更快,要么撤离。
 *
 * 而它们背后是很硬的数:蜂群是编队预算 ×1.6、血量 55%、伤害 70%、格挡 60%、
 * 收获 ×1.15;壁垒是格挡 ×2.4;再生是再生 ×3。玩家要拿这些去赌整趟深潜的收获,
 * 而屏幕上给的是形容词。
 *
 * 搜到的一条反面论点值得记下:经典 roguelike 里道具的模糊是**刻意**的("道具伪装
 * 规则")。但那针对的是鉴定谜题——你花一次使用去换一次知识。异常不是谜题:它写在
 * 你按下"再下一层"之前的那块牌子上,它的全部作用就是让你判断。判断用的牌子上
 * 不该只有形容词。
 *
 * 这也是第 30 轮(模组词条)、第 53 轮(教学文案)、第 69 轮(技能说明)同一条规矩的
 * 第四处。 */

const table = (name: "EN" | "ZH") => STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${name}: StringTable = {`));

function desc(lang: "EN" | "ZH", id: string): string | null {
  const m = table(lang).match(new RegExp(`"rift\\.anomaly\\.${id}\\.desc": "((?:[^"\\\\]|\\\\.)*)"`));
  return m ? m[1] : null;
}

/** 有说明文案的异常(none 是"没有异常",不需要说明)。 */
const DESCRIBED = RIFT_ANOMALIES.filter((a) => a.id !== "none");

describe("裂隙异常的说明", () => {
  it("每个异常中英都有说明", () => {
    for (const a of DESCRIBED) {
      expect(desc("EN", a.id), `${a.id} 缺英文说明`).toBeTruthy();
      expect(desc("ZH", a.id), `${a.id} 缺中文说明`).toBeTruthy();
    }
  });

  it("每条说明都带数字", () => {
    const bare: string[] = [];
    for (const a of DESCRIBED) {
      for (const lang of ["EN", "ZH"] as const) {
        const d = desc(lang, a.id);
        if (d && !/\d/.test(d)) bare.push(`${lang}/${a.id}: ${d}`);
      }
    }
    expect(bare, `这些异常说明只有形容词,玩家没法据此决定要不要再下一层:\n${bare.join("\n")}`).toEqual([]);
  });

  /** 收获倍率是"值不值得冒这个险"的另一半,每条都得写出来。 */
  it("每条说明都写了收获倍率,而且和数据一致", () => {
    for (const a of DESCRIBED) {
      const zh = desc("ZH", a.id)!;
      const nums = (zh.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
      expect(
        nums.some((n) => Math.abs(n - a.haul) < 1e-6),
        `${a.id} 的说明里没有它的收获倍率 ${a.haul}:「${zh}」`,
      ).toBe(true);
    }
  });

  /** 改数据而不改文案,比没有文案更糟——把每条里出现的倍率都对一遍。
   *
   * 第一版只拿那六个乘数字段当"数据",于是把 unstable 的 ±55% / ±12% 判成了漂移
   * ——那两个数是真的,只是住在 rift.ts 的 spread 常量里,不在字段上。守卫的模型
   * 不完整不等于文案错;把校验范围扩到数据源文件本身。 */
  it("说明里出现的倍率,都能在数据里找到对应项", () => {
    const inSource = new Set((RIFT_SRC.match(/\d+(?:\.\d+)?/g) ?? []).map(Number));
    const drift: string[] = [];
    for (const a of DESCRIBED) {
      const zh = desc("ZH", a.id)!;
      const known = new Set([a.budget, a.hull, a.damage, a.block, a.regen, a.haul].map((v) => Number(v.toFixed(2))));
      for (const v of inSource) known.add(v);
      // 百分比写法(55%)对应 0.55;倍率写法(×1.6)直接对应。
      for (const m of zh.matchAll(/×(\d+(?:\.\d+)?)/g)) known.has(Number(m[1])) || drift.push(`${a.id}: ×${m[1]} 在数据里找不到`);
      for (const m of zh.matchAll(/(\d+)%/g)) known.has(Number((Number(m[1]) / 100).toFixed(2))) || drift.push(`${a.id}: ${m[1]}% 在数据里找不到`);
    }
    expect(drift, `文案里的数字和数据对不上:\n${drift.join("\n")}`).toEqual([]);
  });
});
