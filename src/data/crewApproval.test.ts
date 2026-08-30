import { describe, expect, it } from "vitest";
import {
  approvalTier, approvalEffects, clampApproval, CREW_ALLEGIANCE,
  APPROVAL_PER_WIN, APPROVAL_PER_LOSS, APPROVAL_FROM_REPUTATION,
  APPROVAL_MIN, APPROVAL_MAX,
} from "./crewApproval";
import { CREW_DEFS } from "./crew";
import { DIPLOMATIC_FACTIONS, CHOICE_REPUTATION } from "./reputation";

describe("船员支持度", () => {
  it("档位随数值单调变化", () => {
    const order = ["resentful", "wary", "steady", "loyal", "devoted"];
    let last = -1;
    for (let v = APPROVAL_MIN; v <= APPROVAL_MAX; v++) {
      const idx = order.indexOf(approvalTier(v));
      expect(idx).toBeGreaterThanOrEqual(last);
      last = idx;
    }
  });

  it("支持度高确实更强,低确实更弱", () => {
    const low = approvalEffects(0), mid = approvalEffects(50), high = approvalEffects(100);
    expect(low.passiveMultiplier).toBeLessThan(mid.passiveMultiplier);
    expect(high.passiveMultiplier).toBeGreaterThan(mid.passiveMultiplier);
    // 冷却倍率小 = 更快
    expect(high.cooldownMultiplier).toBeLessThan(mid.cooldownMultiplier);
    expect(low.cooldownMultiplier).toBeGreaterThan(mid.cooldownMultiplier);
  });

  it("初始的 50 就是基准档,老存档不会突然变强或变弱", () => {
    // 所有现存存档里每个人都是 50。如果 50 不是 1.0,这次改动会在玩家毫不知情的
    // 情况下改掉他们全船的强度。
    const e = approvalEffects(50);
    expect(e.passiveMultiplier).toBe(1);
    expect(e.cooldownMultiplier).toBe(1);
  });

  it("最差也只是不再多给,不会背叛或离船", () => {
    // 惩罚型的极端设计会让玩家不敢用任何有立场的角色,而这套系统的意义恰恰是
    // 让立场有代价、也有回报。
    expect(approvalEffects(0).passiveMultiplier).toBeGreaterThan(0);
  });

  it("输一场掉得比赢一场涨得多", () => {
    expect(Math.abs(APPROVAL_PER_LOSS)).toBeGreaterThan(APPROVAL_PER_WIN);
    expect(APPROVAL_PER_WIN).toBeGreaterThan(0);
    expect(APPROVAL_PER_LOSS).toBeLessThan(0);
  });

  it("数值永远夹在区间内", () => {
    expect(clampApproval(9999)).toBe(APPROVAL_MAX);
    expect(clampApproval(-9999)).toBe(APPROVAL_MIN);
  });
});

describe("船员的立场", () => {
  it("立场表里的人都真实存在", () => {
    const ids = new Set(CREW_DEFS.map((c) => c.id));
    for (const id of Object.keys(CREW_ALLEGIANCE)) {
      expect(ids, `立场表里的 "${id}" 不是一个船员`).toContain(id);
    }
  });

  it("只站得住的派系才有立场", () => {
    for (const [id, f] of Object.entries(CREW_ALLEGIANCE)) {
      expect(DIPLOMATIC_FACTIONS, `${id} 站在不可交涉的派系 "${f}" 那边`).toContain(f);
    }
  });

  it("每个有立场的船员,都真的会被某个剧情选择波及", () => {
    // 否则"他站那边"只是一句设定文案,玩家永远不会看到它兑现。
    const touched = new Set<string>();
    for (const deltas of Object.values(CHOICE_REPUTATION)) {
      for (const f of Object.keys(deltas)) touched.add(f);
    }
    for (const [id, f] of Object.entries(CREW_ALLEGIANCE)) {
      expect(touched.has(f), `${id} 站 "${f}",但没有任何剧情选择改动这一派`).toBe(true);
    }
  });

  it("剧情换算过来的幅度不会一次把人推到极端", () => {
    // 最大的一笔声望变化是 40。40/3 ≈ 13,不该一步跨两个档。
    const biggest = Math.max(
      ...Object.values(CHOICE_REPUTATION).flatMap((d) => Object.values(d).map((v) => Math.abs(v ?? 0))),
    );
    const swing = biggest * APPROVAL_FROM_REPUTATION;
    expect(swing, `一次选择就能改 ${swing.toFixed(1)} 点支持度`).toBeLessThan(20);
  });
});
