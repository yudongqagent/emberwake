import { describe, expect, it } from "vitest";
import { EVOLUTIONS, evolutionPartnerMatch } from "./evolutions";
import { MODULE_DEFS } from "./moduleDefs";
import { moduleMaxLevel } from "../engine/modules";
import type { ModuleInstance } from "./types";
import DRAFT_SRC from "../ui/screens/RefitDraft.tsx?raw";
import STATION_SRC from "../ui/screens/StationPanel.tsx?raw";
import EVO_SRC from "./evolutions.ts?raw";

/** 进化必须在**做决定的地方**看得见。
 *
 * 2026-08-31(/loop 第 38 轮)。武器进化那套东西自己的设计注释写得很明确:
 *
 *     The important half is not the reward, it's the *visibility*. An evolution
 *     you can see three fights away changes what you take from a Refit Draft —
 *     you start picking the partner module deliberately.
 *
 * 而实测:**整备抉择卡和商店都完全不知道进化这回事**。玩家手里有一把练满的洋紫荆
 * 武器等着 mark 搭档,抉择递上来一件正好带 mark 的模组,卡面一个字都不提——他没有
 * 任何理由不去选伤害更高的那张。这套系统声明的用途,恰恰是唯一没接上的地方。 */

function inst(defId: string, level: number, traits: string[] = []): ModuleInstance {
  return { id: defId + level, defId, rarity: "mk1", level, traits, lockedTraitSlot: null, quality: 0.5 };
}

/** 找一件签名正好是某个进化搭档需求的模组。
 *
 * 刻意排除武器:搭档如果本身也是一把待进化的武器,它会同时以"候选"和"待进化武器"
 * 两个身份进入判定,夹具就说不清了。写测试时先踩了这一脚。 */
function partnerDef(effect: string) {
  return MODULE_DEFS.find((d) => d.signature === effect && d.type !== "weapon");
}

describe("进化要在抉择的那一刻就看得见", () => {
  it("每个进化的搭档需求都有模组真的提供得了", () => {
    const anyDef = (effect: string) => MODULE_DEFS.some((d) => d.signature === effect);
    const orphans = EVOLUTIONS.filter((e) => !anyDef(e.partnerEffect));
    expect(
      orphans.map((e) => `${e.family} 需要 ${e.partnerEffect}`),
      `这些进化的搭档效果没有任何模组带,永远凑不齐:\n${orphans.map((e) => e.family).join("\n")}`,
    ).toEqual([]);
  });

  it("武器练满时,搭档模组会被认成「拿它就能进化」", () => {
    const evo = EVOLUTIONS.find((e) => partnerDef(e.partnerEffect))!;
    const weaponDef = MODULE_DEFS.find((d) => d.type === "weapon" && d.family === evo.family)!;
    const weapon = inst(weaponDef.id, moduleMaxLevel("mk1"));
    const partner = inst(partnerDef(evo.partnerEffect)!.id, 1);
    const hit = evolutionPartnerMatch(partner, [weapon]);
    expect(hit?.state, "练满的武器 + 对得上的搭档,却没认出来").toBe("ready");
    expect(hit?.evo.family).toBe(evo.family);
  });

  it("武器还没练满时只说「所需的搭档」,不谎称马上能进化", () => {
    const evo = EVOLUTIONS.find((e) => partnerDef(e.partnerEffect))!;
    const weaponDef = MODULE_DEFS.find((d) => d.type === "weapon" && d.family === evo.family)!;
    const weapon = inst(weaponDef.id, 1);
    const partner = inst(partnerDef(evo.partnerEffect)!.id, 1);
    expect(evolutionPartnerMatch(partner, [weapon])?.state).toBe("pending");
  });

  it("已经有搭档在位时不再提示——那件就不是「所缺的那个」", () => {
    const evo = EVOLUTIONS.find((e) => partnerDef(e.partnerEffect))!;
    const weaponDef = MODULE_DEFS.find((d) => d.type === "weapon" && d.family === evo.family)!;
    const pd = partnerDef(evo.partnerEffect)!;
    const weapon = inst(weaponDef.id, moduleMaxLevel("mk1"));
    const already = { ...inst(pd.id, 1), id: "already" };
    const candidate = { ...inst(pd.id, 1), id: "candidate" };
    expect(evolutionPartnerMatch(candidate, [weapon, already])).toBeNull();
  });

  it("毫不相干的模组不会误报", () => {
    const evo = EVOLUTIONS.find((e) => partnerDef(e.partnerEffect))!;
    const weaponDef = MODULE_DEFS.find((d) => d.type === "weapon" && d.family === evo.family)!;
    const unrelated = MODULE_DEFS.find((d) => d.signature !== evo.partnerEffect && d.type === "engine")!;
    expect(evolutionPartnerMatch(inst(unrelated.id, 1), [inst(weaponDef.id, moduleMaxLevel("mk1"))])).toBeNull();
  });

  it("抉择卡和商店都接上了这个提示", () => {
    expect(DRAFT_SRC, "整备抉择卡不知道进化这回事").toMatch(/evolutionHintFor\(/);
    expect(STATION_SRC, "商店不知道进化这回事").toMatch(/evolutionHintFor\(/);
  });

  it("设计注释里那句话还在——它是这条测试存在的理由", () => {
    expect(EVO_SRC).toMatch(/it's the \*visibility\*/);
  });
});
