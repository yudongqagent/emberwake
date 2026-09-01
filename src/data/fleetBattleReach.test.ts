import { describe, expect, it } from "vitest";
import { ENCOUNTER_DEFS, BOUNTY_ENCOUNTER_DEFS } from "./encounters";
import { generateHunterEncounter } from "./hunters";
import { DIPLOMATIC_FACTIONS } from "./reputation";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";

/** 盟友得有地方出场。
 *
 * 2026-09-01(/loop 第 97 轮)。全部 46 个作者写死的遭遇里只有 **4 个**标了
 * fleetBattle,而且都是幕终 BOSS。于是:
 *
 *   - 声望"结盟"档最摸得着的那个后果(盟友的战舰加入团战)一整局只兑现四次
 *   - 第 96 轮刚修好的接舷缴获——缴回来的船正是靠团战出力——同样只有那四次机会
 *
 * 猎杀队是接这一条最自然的地方,而且理由是叙事上的:声望敌对招来追杀,声望结盟
 * 就该招来援军。同一套系统的惩罚和奖励第一次在同一场仗里碰面。
 *
 * 机制上也对得上:猎杀队本来就是多艘、会随玩家进阶缩放(第 78 轮)、而且会重生
 * (240 秒),所以盟友系统终于有一个**反复出现**的舞台。 */

describe("盟友能出场的地方", () => {
  it("作者写死的团战仍然只有那几个幕终——这是前提,不是要改的东西", () => {
    const authored = [...ENCOUNTER_DEFS, ...BOUNTY_ENCOUNTER_DEFS].filter((e) => e.fleetBattle);
    expect(authored.length, "作者写死的团战数量变了,这条守卫的前提要重看").toBeLessThan(8);
    expect(authored.every((e) => e.isBoss), "写死的团战不再都是 BOSS 了").toBe(true);
  });

  it("每个派系、每一档威胁的猎杀队都是团战", () => {
    for (const f of DIPLOMATIC_FACTIONS) {
      for (let t = 1; t <= 7; t++) {
        const enc = generateHunterEncounter(f, t);
        expect(enc.fleetBattle, `${f} 威胁${t} 的猎杀队不是团战——盟友不会来`).toBe(true);
      }
    }
  });

  it("猎杀队是多艘的,团战才有意义", () => {
    for (const f of DIPLOMATIC_FACTIONS) {
      expect(generateHunterEncounter(f, 3).enemies.length).toBeGreaterThan(1);
    }
  });

  /** 正在追杀你的那个派系不该来帮你——这条在 Combat.tsx 里,顺手钉住。 */
  it("追杀你的那一方不会同时来帮你", () => {
    expect(COMBAT_SRC).toMatch(/DIPLOMATIC_FACTIONS\.filter\(\(f\) => f !== encounter\.faction && effectsFor\(f\)\.fightsAlongside\)/);
  });

  /** 裂隙永远是单打独斗——这是设计,别让猎杀队这条改动把它带歪。 */
  it("裂隙仍然进不去盟友", () => {
    expect(COMBAT_SRC).toMatch(/encounter\.fleetBattle && encounter\.faction !== "riftEchoes"/);
    for (const f of DIPLOMATIC_FACTIONS) {
      expect(generateHunterEncounter(f, 5).faction, "猎杀队跑到裂隙派系去了").not.toBe("riftEchoes");
    }
  });
});
