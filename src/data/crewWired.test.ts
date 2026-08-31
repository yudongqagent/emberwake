import { describe, expect, it } from "vitest";
import { CREW_DEFS } from "./crew";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";
import STORE_SRC from "../state/store.ts?raw";
import SHIPS_SRC from "../engine/ships.ts?raw";
import STATION_SRC from "../ui/screens/StationPanel.tsx?raw";

/** 卡面上写了的,代码里必须真的做。
 *
 * 2026-08-31(/loop 第 28 轮)。逐个查了 9 名船员的被动,8 名都接上了,唯独
 * **薇拉·坎托**没有:
 *
 *     velaCantor   传奇  第六幕解锁
 *     被动:「重大 BOSS 战 +12% 本源精华,全舰队生效」
 *     → 全代码库对 "velaCantor" 的引用次数:0
 *
 * 她是全游戏唯一的传奇稀有度船员,在战役高潮处解锁;本源精华是进阶货币,最稀缺的
 * 那一种。玩家读到那句话、把她招上船,然后什么都不会发生。
 *
 * 搜到的说法正是这个:「大部分属性和技能根本没有效果,描述是彻头彻尾的谎话」。
 * 一张卡面写了却不兑现,损的是玩家对**所有**卡面的信任,不只是这一张。
 *
 * 这条测试扫源码:每个有被动的船员,他的 id 必须在战斗/存档/舰船引擎里出现过;
 * 每个有主动的船员,他的 abilityId 必须有对应的分支。 */

/** 被动可能落在任何一个"结算收益"的地方,不只是战斗:普莉雅的「兑换 +10%」就写在
 * 空间站里。第一版只扫了战斗/存档/舰船三处,把她也算成了没接——扫描范围本身
 * 也得对,否则这条测试会用假阳性把人引偏。 */
const ENGINE = [COMBAT_SRC, STORE_SRC, SHIPS_SRC, STATION_SRC].join("\n");

describe("船员卡面上的每一句都要有代码兑现", () => {
  it("测试确实读到了船员表", () => {
    expect(CREW_DEFS.length).toBeGreaterThan(5);
  });

  it("每个被动都被某处读取", () => {
    const dead = CREW_DEFS.filter((c) => c.passive && !new RegExp(`"${c.id}"`).test(ENGINE));
    expect(
      dead.map((c) => `${c.id} — 「${c.passive}」`),
      `这些船员的被动只是卡面上的一句话,代码里没有任何地方读它:\n${dead.map((c) => c.id).join("\n")}`,
    ).toEqual([]);
  });

  it("每个主动技都有对应的实现分支", () => {
    const dead = CREW_DEFS.filter(
      (c) => c.abilityId && !new RegExp(`abilityId === "${c.abilityId}"`).test(COMBAT_SRC),
    );
    expect(
      dead.map((c) => `${c.id} — ${c.abilityId}`),
      `这些船员的主动技没有实现分支:\n${dead.map((c) => c.abilityId).join("\n")}`,
    ).toEqual([]);
  });
});
