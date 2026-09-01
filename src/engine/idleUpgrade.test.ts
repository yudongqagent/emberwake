import { describe, expect, it } from "vitest";
import { idleUpgradeFor, moduleRank, benchmarkFor } from "./modules";
import type { ModuleInstance, ModuleRarity } from "../data/types";
import MODULES_SRC from "../ui/screens/Modules.tsx?raw";
import ENGINE_SRC from "./modules.ts?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 库存里躺着更强的,得说一声。
 *
 * 2026-09-01(/loop 第 115 轮)。搜到的对照是 Dragon Age 2 的老毛病:"升级件
 * 好得不得了,但**极容易被错过**"。
 *
 * 这个游戏刻意**不**自动替换已装备的模组——那是有取舍的决定,不该由系统替玩家
 * 做(SortieInterlude 的注释里写过:空槽自动装,换掉已装备的那件由玩家自己来)。
 * 但"不替你做"不等于"不告诉你"。实测我自己的存档(41 级,23 个槽全满):
 *
 *     装甲槽装着 mk1 / mk1 / mk1 / mk2,而库存里躺着**四件 mk5 装甲**
 *     还有一件 mk5 工程件闲着,槽里是 mk3
 *
 * 界面上没有任何一处提过——要发现它,玩家得逐个槽点开 SWAP 一件件比。
 *
 * 修完实测,九个槽亮起提示:装甲 +241% / +625% / +544% / +1060%,
 * 引擎 ×4 各 +34%,工程件 +73%。
 *
 * 两个坑,都是先踩了才想明白的:
 *
 *   1. 门槛。第一版只要"库存里更强"就提示,于是差 +1 的也亮。用游戏自己的品质
 *      掷点幅度当门槛(0.88~1.12,同一个 def 的两件能差 1.27 倍):只有"它掷到
 *      最差也强过你这件掷到最好"才算。第 106 轮量内容压制时踩过同一个坑。
 *   2. 单位。改完门槛还是显示「+1」——因为引擎的主属性是闪避,基数只有个位数,
 *      +1 其实是 +34%。绝对差值在三种主属性之间不可比,改成百分比。 */

const R: ModuleRarity[] = ["mk1", "mk2", "mk3", "mk4", "mk5"];
function mod(defId: string, rarity: ModuleRarity, level = 1, id = `${defId}_${rarity}_${level}`): ModuleInstance {
  return { id, defId, rarity, level, traits: [], lockedTraitSlot: null, quality: 0.5 };
}

describe("库存里更强的要提示", () => {
  it("同类型、明显更强的会被找出来", () => {
    const equipped = mod("bauhiniaArmor1", "mk1");
    const idle = [mod("constructArmor5", "mk5")];
    const found = idleUpgradeFor(equipped, idle);
    expect(found, "库存里躺着 mk5 装甲却没被找出来").toBeTruthy();
    expect(moduleRank(found!)).toBeGreaterThan(moduleRank(equipped));
  });

  it("不同类型的不算——mk5 武器换不了装甲槽", () => {
    const equipped = mod("bauhiniaArmor1", "mk1");
    const idle = [mod("mayethWeapon5", "mk5")];
    expect(idleUpgradeFor(equipped, idle), "拿武器去比装甲了").toBeNull();
  });

  /** 差得不够多就别提示——否则玩家换过去可能反而更弱。 */
  it("差距在品质掷点范围内的不提示", () => {
    const equipped = mod("constructArmor5", "mk5", 1, "a");
    // 同一个 def、同稀有度,只差一级——完全落在掷点能覆盖的范围里。
    const idle = [mod("constructArmor5", "mk5", 2, "b")];
    const found = idleUpgradeFor(equipped, idle);
    if (found) {
      expect(
        moduleRank(found) * 0.88,
        `提示了一个只强一点点的(${moduleRank(equipped)} → ${moduleRank(found)})——掷点就能盖过去`,
      ).toBeGreaterThan(moduleRank(equipped) * 1.12);
    }
  });

  it("已经装着最强的那件时不提示", () => {
    const equipped = mod("constructArmor5", "mk5");
    const idle = [mod("bauhiniaArmor1", "mk1"), mod("lionsheartArmor2", "mk2")];
    expect(idleUpgradeFor(equipped, idle)).toBeNull();
  });

  it("多个候选里挑最强的那个", () => {
    const equipped = mod("bauhiniaArmor1", "mk1");
    const idle = [mod("lionsheartArmor2", "mk2"), mod("constructArmor5", "mk5"), mod("bauhiniaArmor3", "mk3")];
    const found = idleUpgradeFor(equipped, idle)!;
    expect(R.indexOf(found.rarity)).toBe(R.indexOf("mk5"));
  });

  it("不会把自己算成自己的升级", () => {
    const m = mod("constructArmor5", "mk5");
    expect(idleUpgradeFor(m, [m])).toBeNull();
  });

  /** 尺子只能有一把:抽卡卡面和工坊的"vs. your best of this type"用的是同一个。 */
  it("和 benchmarkFor 共用同一把尺子", () => {
    // 要在 benchmarkFor **自己的函数体里**找,不能全文件搜——idleUpgradeFor 末尾
    // 有一模一样的一行,全文件搜会被它顶掉(第一版就是这样,破坏了也不变红)。
    const bi = ENGINE_SRC.indexOf("export function benchmarkFor(");
    const body = ENGINE_SRC.slice(bi, ENGINE_SRC.indexOf("\n}", bi));
    expect(body, "benchmarkFor 又自己写了一份排序").toMatch(/moduleRank\(m\) > moduleRank\(best\)/);
    expect(body, "benchmarkFor 里出现了绕过 moduleRank 的比较").not.toMatch(/primaryStat\(m\)\?\.value/);
    expect(ENGINE_SRC, "idleUpgradeFor 没有用同一把尺子").toMatch(
      /moduleRank\(m\) \* QUALITY_MIN > mine \* QUALITY_MAX/,
    );
    // benchmarkFor 仍然正常工作(它比的是**已装备**的同类)。
    const ship = { hullClass: "sovereign", equipped: ["a", "b"] };
    const a = mod("constructArmor5", "mk5", 1, "a");
    const b = mod("bauhiniaArmor1", "mk1", 1, "b");
    const lookup = (id: string) => (id === "a" ? a : id === "b" ? b : undefined);
    expect(benchmarkFor(ship, b, lookup)?.id).toBe("a");
  });

  it("界面上真的渲染了,而且给的是百分比", () => {
    expect(MODULES_SRC, "装备槽上没有这个提示").toMatch(/idleUpgradeFor\(mod, idle\)/);
    expect(MODULES_SRC, "还在用绝对差值——三种主属性之间不可比").toMatch(
      /moduleRank\(better\) \/ moduleRank\(mod\) - 1/,
    );
    expect(MODULES_SRC).toMatch(/t\("modules\.idleUpgrade"/);
    // 点了要能直接去换,不能只是干说。
    expect(MODULES_SRC, "提示不可点——玩家还得自己找 SWAP").toMatch(
      /onClick=\{\(\) => setPickerSlot\(slot\.index\)\}/,
    );
  });

  it("文案中英都在,而且带名字和幅度", () => {
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      const v = seg.match(/"modules\.idleUpgrade": "([^"]*)"/)?.[1];
      expect(v, `${lang} 缺少 modules.idleUpgrade`).toBeTruthy();
      for (const slot of ["{name}", "{delta}"]) {
        expect(v, `${lang} 的提示缺 ${slot}:「${v}」`).toContain(slot);
      }
    }
  });
});
