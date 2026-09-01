import { describe, expect, it, beforeEach } from "vitest";
import { captureShip, giftCapturedShip, state, replaceState, GALAXIES } from "./store";
import { createInitialState } from "../engine/save";
import { ENCOUNTER_DEFS } from "../data/encounters";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";

/** 接舷缴获的回报,必须跟着你在哪儿缴的走。
 *
 * 2026-09-01(/loop 第 96 轮)。接舷是这个游戏里最难做的一个动作:要在近距连续
 * 保持 10 秒,还得**故意不打死**一个已经掉到 40% 以下的目标(见 Combat.tsx 的
 * CAPTURE_HULL_THRESHOLD / BOARD_SECONDS)。而它原来的产出是两个定值:
 *
 *     captureShip     level 写死 12,舰级写死驱逐舰
 *     giftCapturedShip 固定 150 废料 / 80 源点
 *
 * 量了一遍那 150 相当于同期几场普通仗:
 *     威胁1  一场仗中位 140 废料 → **1.1 场**
 *     威胁6  一场仗中位 800 废料 → **0.2 场**
 * 全游戏最难的动作,到后期回报是一场普通仗的五分之一。
 *
 * 写死的等级还有第二个后果:团战里盟友的出力按等级算,而**声望白送**的盟友拿的是
 * `level: ship.level`(跟着玩家走)。于是你亲手缴回来的船永远比白送的弱,越到后期
 * 差得越远——正好和"它更难做"反过来。 */

describe("缴获与赠船的回报", () => {
  beforeEach(() => replaceState(createInitialState()));

  it("缴获的船按当场的量级记,不是写死的", () => {
    const a = captureShip("A", 12);
    const b = captureShip("B", 40);
    expect(a.level).toBe(12);
    expect(b.level, "不管在哪儿缴的都记成同一个等级").toBe(40);
  });

  it("等级至少是 1,不会被写成 0 或负数", () => {
    expect(captureShip("C", 0).level).toBeGreaterThanOrEqual(1);
    expect(captureShip("D", -5).level).toBeGreaterThanOrEqual(1);
  });

  it("赠船的回报跟着船的等级走", () => {
    const low = captureShip("低", 12);
    const before = state.value.resources.salvage;
    giftCapturedShip(low.id);
    const lowGain = state.value.resources.salvage - before;

    replaceState(createInitialState());
    const high = captureShip("高", 40);
    const before2 = state.value.resources.salvage;
    giftCapturedShip(high.id);
    const highGain = state.value.resources.salvage - before2;

    expect(highGain, "后期缴的船和早期给一样多——那它到后期就不值得做了").toBeGreaterThan(lowGain * 2);
  });

  /** 回报要在**任何阶段**都稳定在一场半到两场的量级,不能前期慷慨后期变废。 */
  it("在每个星区,赠船都值一场仗以上", () => {
    const idsByThreat: Record<number, Set<string>> = {};
    for (const g of GALAXIES) {
      for (const s of g.systems) {
        for (const p of s.pois) {
          const e = (p.data as { encounterId?: string } | undefined)?.encounterId;
          if (e) (idsByThreat[g.threat] ??= new Set()).add(e);
        }
      }
    }
    // 每个星区玩家大致的等级:按舰级阶梯,一档一档往上
    const levelAt: Record<number, number> = { 1: 6, 2: 10, 3: 14, 4: 20, 5: 26, 6: 34, 7: 42 };
    for (const [tStr, ids] of Object.entries(idsByThreat)) {
      const t = Number(tStr);
      const sal = [...ids]
        .map((i) => ENCOUNTER_DEFS.find((e) => e.id === i))
        .map((e) => e?.rewards?.salvage ?? 0)
        .filter((x) => x > 0)
        .sort((a, b) => a - b);
      if (sal.length === 0) continue;
      const median = sal[Math.floor(sal.length / 2)];
      const gift = 30 * levelAt[t];
      expect(
        gift / median,
        `威胁${t}:赠船给 ${gift} 废料,而一场普通仗中位 ${median}——接舷不值得做`,
      ).toBeGreaterThan(1);
    }
  });

  it("战斗里真的把当场的等级传进去了", () => {
    // 第 102 轮把第一个参数从 target!.name 改成 target!.baseName(存原名而不是
    // 本地化后的名字),这条守卫钉的是**等级**那一半,跟着改名字那一半即可。
    expect(COMBAT_SRC, "还在用写死的等级缴获").toMatch(/captureShip\(target!\.baseName, ship\.level\)/);
  });
});
