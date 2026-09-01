import { describe, expect, it } from "vitest";
import { MODULE_DEFS, moduleDefById } from "../../data/modules";
import { drawModule, computeModuleDamage } from "../../engine/modules";
import { weaponCycleSeconds, TURN_SECONDS, AUTO_FIRE_MIN_INTERVAL } from "../../engine/combat";
import MODULESTATS_SRC from "./ModuleStats.tsx?raw";
import COMBAT_SRC from "../screens/Combat.tsx?raw";
import WEAPONS_TEST_SRC from "../../data/weapons.test.ts?raw";
import type { ModuleDef, ModuleRarity } from "../../data/types";

/** 卡片上被拿来比较的那个数,必须是决定胜负的那个数。
 *
 * 2026-09-01(/loop 第 76 轮)。搜到的说法是"升级幅度太小,玩家就感觉不到成长";
 * 顺着去量整备抉择——这个游戏每 90 秒一次的核心奖励时刻——结果撞见的是别的东西。
 *
 * 武器唯一被**比较**的数字一直是"每发多少伤害"。而这个仓库自己的武器表是刻意
 * 按 DPS 配平的:同一层里各族武器的每秒伤害被压在 20% 以内(见
 * data/weapons.test.ts 那条"同层要有真正不同的数值线"),每发的巨大差别几乎
 * **全是射速换来的**。
 *
 *     mk3:  劫掠者  16 伤害 / 0.84 秒        = 19.0 每秒
 *           玛耶   116 伤害 / 5.76 秒        = 20.1 每秒
 *
 * 于是卡片上那个 +/- 经常指错方向。量了一遍玩家真会遇到的组合(同层或相邻层,
 * 1250 组):**40% 的比较符号是反的**,其中 277 组显示的差值超过 20。最难看的
 * 一组是在装玛耶 mk5、卡片递上劫掠者 mk5:卡上一个巨大的 **−250**,而它实际
 * 每秒还高 0.3。
 *
 * 这是这个仓库反复撞到的同一类——**显示的不等于生效的**——而且撞在最要紧的
 * 那块屏幕上:玩家就是靠这个数字做决定的。 */

const TIERS: ModuleRarity[] = ["mk1", "mk2", "mk3", "mk4", "mk5"];
const WEAPONS = MODULE_DEFS.filter((m) => m.type === "weapon");
const inst = (d: ModuleDef) => drawModule(d.id, { minRarity: d.baseRarity, maxRarity: d.baseRarity });
const dps = (m: ReturnType<typeof inst>) =>
  computeModuleDamage(m) / weaponCycleSeconds(moduleDefById(m.defId).cooldown ?? 0);

describe("武器卡片上的比较", () => {
  /** 先把"为什么每发不够用"本身钉住:同层各族 DPS 接近,单发差别巨大。
   * 哪天配平改了、每发重新变成有意义的比较轴,这条会先红,提醒重新想一遍。 */
  it("同一层里,每发差得很远而每秒几乎一样——所以每发不能是唯一被比的数", () => {
    for (const tier of TIERS) {
      const ws = WEAPONS.filter((w) => w.baseRarity === tier).map(inst);
      if (ws.length < 2) continue;
      const dmgs = ws.map(computeModuleDamage);
      const rates = ws.map(dps);
      const dmgSpread = Math.max(...dmgs) / Math.min(...dmgs);
      const dpsSpread = Math.max(...rates) / Math.min(...rates);
      expect(dmgSpread, `${tier} 的单发差距只有 ${dmgSpread.toFixed(2)}×`).toBeGreaterThan(3);
      expect(dpsSpread, `${tier} 的每秒差距有 ${dpsSpread.toFixed(2)}×`).toBeLessThan(1.35);
    }
  });

  it("只看每发的话,四成的比较符号是反的——这就是修它的理由", () => {
    let pairs = 0;
    let wrong = 0;
    for (const a of WEAPONS) {
      for (const b of WEAPONS) {
        if (a.id === b.id) continue;
        if (Math.abs(TIERS.indexOf(a.baseRarity) - TIERS.indexOf(b.baseRarity)) > 1) continue;
        const ia = inst(a);
        const ib = inst(b);
        const dmgDelta = computeModuleDamage(ib) - computeModuleDamage(ia);
        const dpsDelta = dps(ib) - dps(ia);
        pairs++;
        if (dpsDelta !== 0 && Math.sign(dmgDelta) !== Math.sign(dpsDelta)) wrong++;
      }
    }
    expect(pairs).toBeGreaterThan(500);
    expect(
      wrong / pairs,
      `只按每发比,${Math.round((wrong / pairs) * 100)}% 的组合方向是反的`,
    ).toBeGreaterThan(0.2);
  });

  it("所以模组数值行必须把每秒也摆出来,而且它也参与比较", () => {
    expect(MODULESTATS_SRC, "武器没有每秒伤害这一行").toMatch(/t\("modules\.dps"/);
    // 光显示不够——第 47 轮那个射程标签就是"显示了但没法比"。这一行必须带 delta。
    const seg = MODULESTATS_SRC.slice(MODULESTATS_SRC.indexOf('t("modules.dps"'));
    expect(
      seg.slice(0, 400),
      "每秒伤害只显示不比较——玩家还是没法判断该不该换",
    ).toMatch(/delta: oldDps !== undefined \? dps - oldDps : undefined/);
  });

  /** 卡片上的每秒和战斗里真实的开火节奏必须是同一个公式,否则这次修完又是一个
   * "显示的不等于生效的"。TURN_SECONDS 原来抄了三份。 */
  it("开火节奏只有一个出处,战斗和卡片共用", () => {
    expect(TURN_SECONDS).toBe(2.4);
    expect(AUTO_FIRE_MIN_INTERVAL).toBe(0.6);
    expect(weaponCycleSeconds(1)).toBeCloseTo(2.4);
    expect(weaponCycleSeconds(0), "0 冷却的武器要吃下限,不能是 0 秒一发").toBeCloseTo(0.6);
    // 谁都不许再抄一份。
    for (const [name, src] of [
      ["Combat.tsx", COMBAT_SRC],
      ["ModuleStats.tsx", MODULESTATS_SRC],
      ["weapons.test.ts", WEAPONS_TEST_SRC],
    ] as const) {
      expect(src, `${name} 又自己抄了一份 TURN_SECONDS`).not.toMatch(/const TURN_SECONDS\s*=/);
      expect(src, `${name} 又自己抄了一份 AUTO_FIRE_MIN_INTERVAL`).not.toMatch(
        /const AUTO_FIRE_MIN_INTERVAL\s*=/,
      );
    }
    expect(COMBAT_SRC, "战斗没有从唯一出处取节奏常数").toMatch(
      /import \{ TURN_SECONDS, AUTO_FIRE_MIN_INTERVAL,/,
    );
  });
});
