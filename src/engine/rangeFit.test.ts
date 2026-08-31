import { describe, expect, it } from "vitest";
import { rangeProfileMultiplier, rangeFitTone } from "./combat";
import { MODULE_DEFS } from "../data/modules";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";
import STATS_SRC from "../ui/components/ModuleStats.tsx?raw";

/** 武器的偏好射程必须看得见,否则舵手指令是个没法做的决定。
 *
 * 2026-08-31(/loop 第 47 轮)。搜同类游戏,FTL 那套的说法是"每一个决定都可能
 * 决定成败"。回头量 Emberwake 的战斗:屏幕正中永远摆着一排舵手指令
 * (接近 / 保持 / 撤离),而我自己连打五场,一次都没碰过它——全程停在"保持"。
 *
 * 翻数据才知道那不是我懒:
 *
 *   - rangeProfileMultiplier 给"打在自己擅长的档位"×1.25、"差两档"×0.75
 *     ——1.67 倍的跨度
 *   - 50 把武器里 41 把带着非 flat 的偏好
 *   - 而它的**唯一消费者是伤害计算**(Combat.tsx 的 profileMult),
 *     整个界面上一个字都不显示
 *
 * 指令是有的,做决定要的那半信息不在。这和第 46 轮的词条是同一种病,只是长在
 * 武器卡的另一半上。
 *
 * 实拍的那一场最能说明问题:我那两把枪一把"远距"、一把"近距"——**要的是相反的
 * 档位**,而这件事在这一轮之前无从得知。 */

describe("偏好射程要看得见", () => {
  it("跨度是真的,不是装饰", () => {
    expect(rangeProfileMultiplier("long", "long")).toBeCloseTo(1.25);
    expect(rangeProfileMultiplier("long", "mid")).toBeCloseTo(1.0);
    expect(rangeProfileMultiplier("long", "close")).toBeCloseTo(0.75);
    const spread = rangeProfileMultiplier("long", "long") / rangeProfileMultiplier("long", "close");
    expect(spread, `擅长档和最差档只差 ${spread} 倍,那确实可以不显示`).toBeGreaterThan(1.5);
  });

  it("大多数武器都有偏好——所以这不是边角料", () => {
    const weapons = MODULE_DEFS.filter((d) => d.type === "weapon");
    const profiled = weapons.filter((d) => d.rangeProfile && d.rangeProfile !== "flat");
    expect(profiled.length / weapons.length, "带偏好射程的武器不到一半").toBeGreaterThan(0.6);
  });

  /** 配色和伤害必须同源。分开写两遍,总有一天数值改了颜色没改,界面开始骗人。 */
  it("配色档位跟着伤害倍率走", () => {
    for (const p of ["close", "mid", "long"] as const) {
      for (const b of ["close", "mid", "long"] as const) {
        const m = rangeProfileMultiplier(p, b);
        const tone = rangeFitTone(p, b);
        expect(tone, `${p} 武器在 ${b} 档:倍率 ${m} 却涂成 ${tone}`).toBe(
          m > 1 ? "good" : m < 1 ? "poor" : "neutral",
        );
      }
    }
  });

  it("没有偏好的武器不涂色——它就是哪儿都一样", () => {
    expect(rangeFitTone("flat", "close")).toBe("neutral");
    expect(rangeFitTone(undefined, "long")).toBe("neutral");
  });

  it("战斗里的武器行接上了偏好射程和当前档位", () => {
    expect(COMBAT_SRC, "武器行没拿到 rangeProfile").toMatch(/profile=\{def\.rangeProfile\}/);
    expect(COMBAT_SRC, "武器行没拿到当前档位").toMatch(/band=\{rangeBand\}/);
    expect(COMBAT_SRC, "颜色没有走 rangeFitTone,和伤害规则脱钩了").toMatch(/rangeFitTone\(profile, band\)/);
  });

  /** 战斗里看见已经晚了——挑武器的时候就得知道。 */
  it("模组卡上也写了偏好射程", () => {
    expect(STATS_SRC, "模组卡不显示偏好射程,抽卡时没法为自己的打法挑武器").toMatch(
      /modules\.prefersRange/,
    );
  });
});
