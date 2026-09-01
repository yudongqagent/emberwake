import { describe, expect, it } from "vitest";
import COMBAT_SRC from "./screens/Combat.tsx?raw";
import MODULES_SRC from "./screens/Modules.tsx?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";
import { HULL_CLASSES } from "../data/hullClasses";
import { MODULE_DEFS } from "../data/modules";
import { computePowerCapacity } from "../engine/ships";
import { powerStrainMultiplier, POWER_STRAIN_CAP } from "../engine/combat";

/** 功率是真实预算,那战斗里就得写出**用了多少**,不能只写有多少。
 *
 * 2026-09-01(/loop 第 90 轮)。战斗顶栏上那行读数自己的注释写着"功率在这个游戏里
 * 是真实预算(超载会拉长武器冷却),那个数字不能缺"——可它渲染的只有 `capacity`,
 * 也就是**分母**。玩家看不到自己超没超。
 *
 * 而超载的惩罚很重。把每个槽都塞上该阶段够得到的那层里最耗电的模组:
 *
 *     巡洋舰   36 / 31   超 16%   冷却 ×1.24
 *     战列舰   64 / 45   超 42%   冷却 ×1.63
 *     无畏舰  104 / 68   超 53%   冷却 ×1.79
 *
 * 封顶 ×2.5,相当于少掉六成输出。模组页在出击前是会警告的(modules.overdrawn),
 * 但战斗里没有第二次提醒——玩家只看得到"枪很慢",看不到为什么。
 *
 * 一处自我纠正记在这里:我最初用**平均**功率算,得出"功率永远不会成为约束、
 * 这套机制是死的"。用最耗电的那些重算才发现正相反——它很活,只是不可见。
 * 平均值把一个"看不见的惩罚"误判成了"不存在的惩罚"。 */

describe("战斗里的功率读数", () => {
  it("写的是用量/容量,不是只有容量", () => {
    expect(COMBAT_SRC, "战斗顶栏只显示容量,玩家不知道自己超没超").toMatch(
      /\{t\("combat\.power"\)\} \{powerDrawUsed\}\/\{capacity\}/,
    );
  });

  it("超载时把惩罚的百分比写出来,并且变红", () => {
    expect(COMBAT_SRC).toMatch(/powerStrain > 1 &&[\s\S]{0,200}t\("combat\.powerStrain", \{ pct:/);
    expect(COMBAT_SRC, "超载没有颜色提示").toMatch(/color: powerStrain > 1 \? "var\(--red\)"/);
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      const v = seg.match(/"combat\.powerStrain": "([^"]*)"/)?.[1];
      expect(v, `${lang} 缺少 combat.powerStrain`).toBeTruthy();
      expect(v, "没有留百分比的位置").toContain("{pct}");
    }
  });

  /** 惩罚必须是真的被用上的,否则这个读数在报一个不存在的东西。 */
  it("那个倍率确实乘在武器冷却上", () => {
    expect(COMBAT_SRC).toMatch(/rawCooldownSec \* powerStrainRef\.current/);
  });

  /** 这条钉住"为什么值得显示":超载在够得到的配装里是真会发生的,不是理论值。 */
  it("满配最耗电的模组时,确实会超容量", () => {
    const TIERS = ["mk1", "mk2", "mk3", "mk4", "mk5"];
    const heaviest = (type: string, tier: string) =>
      Math.max(...MODULE_DEFS.filter((m) => m.type === type && m.baseRarity === tier).map((m) => m.powerDraw ?? 0));
    const over: string[] = [];
    for (const h of HULL_CLASSES) {
      const cap = computePowerCapacity({ hullClass: h.id, rarity: "standard", level: Math.max(1, h.minLevel) } as never);
      const tier = TIERS[Math.min(4, h.order)];
      const used =
        h.slots.weapon * heaviest("weapon", tier) + h.slots.armor * heaviest("armor", tier) +
        h.slots.engine * heaviest("engine", tier) + h.slots.utility * heaviest("utility", tier);
      if (used > cap) over.push(`${h.id} ${used}/${cap} → ×${powerStrainMultiplier(used, cap).toFixed(2)}`);
    }
    expect(
      over.length,
      "没有任何舰级会超载了——那这个读数就没必要显示惩罚,这条守卫的理由要重写",
    ).toBeGreaterThanOrEqual(4);
  });

  it("惩罚封顶,不会把船打成砖", () => {
    expect(powerStrainMultiplier(1000, 10)).toBe(POWER_STRAIN_CAP);
    expect(powerStrainMultiplier(10, 10), "没超就不该有惩罚").toBe(1);
  });

  /** 出击前那一处警告也还在——两处都要有,一处在决定时,一处在承受后果时。 */
  it("模组页出击前的超载警告没有被顺手删掉", () => {
    expect(MODULES_SRC).toMatch(/t\("modules\.overdrawn", \{ pct:/);
  });
});
