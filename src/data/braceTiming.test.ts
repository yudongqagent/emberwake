import { describe, expect, it } from "vitest";
import { COMBAT_UNLOCKS } from "./combatUnlocks";
import { ENCOUNTER_DEFS } from "./encounters";
import { applyEmberLoad } from "./emberLoad";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";

/** "有大家伙在蓄力的时候按下去"——那句话得在真的有东西蓄力的时候说。
 *
 * 2026-08-31(/loop 第 61 轮)。搜到的原则:"最好的战斗是在战斗里教会你的",
 * "让第一场遭遇战自然要求你用到那个动作"。
 *
 * 原来的写法是:控件一解锁,就在**当时正在打的那一场**弹提示。从头开一局实测,
 * 我正好撞上了——等级兜底在一场掠夺者混战里解锁了抗冲,屏幕上写着"有大家伙在
 * 蓄力的时候按下去,1.3 秒的窗口内接住",而那场仗里**没有任何东西会蓄力**。
 *
 * 剧情路径上不会发生:抗冲挂在第一场剧情战之后(act1.firstBlood.cleared),紧接着
 * 那一幕就是会蓄力的炮台(staticAndSignal 的 thornwakeDefenseGrid)。但等级兜底
 * 是给跳过主线的开放世界玩家准备的——他们恰恰最需要这句话说在点子上。
 *
 * 这一轮同时查了几条,结论是"设计如此"的记在这里,免得下次重查:
 *
 *   - 出击的每一波是同一场遭遇战(App.tsx),但 extraLoad 会加角色:第 2 波
 *     kestrelsRestRaid 会多出一个**锚定舰**,所以波次之间确实不一样。
 *   - 剧情路径上四个控件的等级兜底都不会先于 flag 触发(走到各 flag 时仍是 1 级)。 */

describe("抗冲要在有东西蓄力时才教", () => {
  it("抗冲的解锁点确实排在那门会蓄力的炮台之前", () => {
    const brace = COMBAT_UNLOCKS.find((u) => u.id === "brace")!;
    expect(brace.flag).toBe("act1.firstBlood.cleared");
    const turret = ENCOUNTER_DEFS.find((e) => e.id === "thornwakeDefenseGrid");
    expect(turret, "那门教抗冲的炮台不见了").toBeTruthy();
    expect(turret!.enemies.some((e) => e.role === "artillery"), "炮台没有蓄力角色").toBe(true);
  });

  it("确实存在没有蓄力敌人的早期战斗——所以这条门控不是空转", () => {
    const early = ENCOUNTER_DEFS.find((e) => e.id === "kestrelsRestRaid")!;
    // 连出击第二波(负荷 +1)也不会凭空长出炮击角色:那一档给的是锚定。
    for (const load of [0, 1, 2]) {
      const scaled = applyEmberLoad(early, load);
      expect(
        scaled.enemies.some((e) => e.role === "artillery"),
        `负荷 ${load} 下这场仗长出了炮击角色,那这条守卫的前提要重写`,
      ).toBe(false);
    }
  });

  it("抗冲的提示被推迟到蓄力开始那一刻", () => {
    expect(COMBAT_SRC, "抗冲没有被单独推迟").toMatch(/if \(u\.id === "brace"\) \{\s*\n\s*setBracePending\(true\);/);
    expect(
      COMBAT_SRC,
      "推迟了却没有在蓄力开始时兑现——那玩家就永远看不到这句话了",
    ).toMatch(/siegeCharging[\s\S]{0,320}?markUnlockSeen\("brace"\)/);
  });

  it("其它三个控件照旧开场就提示——它们不依赖某种特定敌人", () => {
    for (const u of COMBAT_UNLOCKS.filter((x) => x.id !== "brace")) {
      expect(
        COMBAT_SRC.includes(`if (u.id === "${u.id}")`),
        `${u.id} 也被推迟了,而它并不依赖某种敌人`,
      ).toBe(false);
    }
  });

  /** 推迟不能变成"永远不说":一旦兑现就要记进存档,不再重复。 */
  it("兑现的时候记进存档,不会每场仗都弹一次", () => {
    expect(COMBAT_SRC).toMatch(/bracePendingRef\.current = false;/);
    expect(COMBAT_SRC).toMatch(/markUnlockSeen\("brace"\)/);
  });
});
