import { describe, expect, it } from "vitest";
import { ENCOUNTER_DEFS } from "../../data/encounters";
import { applyEmberLoad } from "../../data/emberLoad";
import { MAX_BLOCK_FRACTION } from "../../engine/combat";
import COMBAT_SRC from "./Combat.tsx?raw";

/** 送出去的船,在团战里得真的打得动。
 *
 * 2026-08-31(/loop 第 64 轮)。搜到的说法:"回报不是循环的终点,它决定玩家还想不想
 * 继续";一个到手却没有用处的回报,等于没接上下一轮。
 *
 * 上一轮我刚缴获了一艘船,顺着往下查:缴获 → 赠送 → 变成友舰 → 在团战里开火。
 * 链条是通的,但最后一环是空的。
 *
 * 原来友舰的一轮齐射是 `ally.level * 1.7`,而 captureShip 把缴获舰的等级**写死成
 * 12**——固定 20 点,再**减去**敌方格挡。而团战敌人的格挡随星区指数增长:
 *
 *     疆域开启(第2区)   格挡  8  → 每轮 12  → 打光 532 血要 151 秒
 *     方舟防卫(第四幕)   格挡 28  → 每轮 **1** → 17,605 秒
 *     二次点燃(第六区)   格挡 30  → 每轮 **1** → 72,124 秒
 *     文明失格(终局)     格挡 26  → 每轮 **1** → **160,592 秒**
 *
 * act 2 之后的每一场团战里,一艘友舰每 3.4 秒打 1 点伤害,占终局战的 0.002%。
 *
 * 改成按玩家最强那把武器的一个比例算,并且格挡走 resolveAttack 的 75% 封顶规则
 * ——两条一起,才让"次要但真实"这句设计意图在每一层都成立。 */

const FLEET_FIGHTS = ENCOUNTER_DEFS.filter((e) => (e as { fleetBattle?: boolean }).fleetBattle);

function constant(name: string): number {
  const m = COMBAT_SRC.match(new RegExp(`const ${name} = ([0-9.]+);`));
  expect(m, `Combat.tsx 里找不到 ${name}`).toBeTruthy();
  return Number(m![1]);
}

describe("友舰在团战里要打得动", () => {
  it("确实有团战,而且不止一场", () => {
    expect(FLEET_FIGHTS.length).toBeGreaterThan(2);
  });

  /** 前提:团战敌人的格挡大到能把一个固定小数值减成 1。 */
  it("后期团战的格挡确实能吃掉一个写死的小数值", () => {
    const late = FLEET_FIGHTS.map((e) => Math.max(...applyEmberLoad(e, 6).enemies.map((x) => x.block)));
    expect(
      Math.max(...late),
      "团战敌人的格挡都很低,那这条守卫的前提要重写",
    ).toBeGreaterThan(20);
  });

  it("齐射不再按写死的等级算,而是跟着玩家的武器走", () => {
    expect(COMBAT_SRC, "还在用写死等级的老式算法").not.toMatch(/ALLY_DAMAGE_PER_LEVEL/);
    expect(COMBAT_SRC, "没有按玩家最强武器取基准").toMatch(/allyBaseRef\.current \* ALLY_DAMAGE_FRACTION/);
    expect(COMBAT_SRC).toMatch(/allyBaseRef\.current = autoFireWeapons\.length/);
  });

  it("格挡按 75% 封顶吸收,不会把齐射减成 1", () => {
    expect(COMBAT_SRC, "格挡还是直接相减").toMatch(/Math\.min\(target\.block, allyRaw \* MAX_BLOCK_FRACTION\)/);
    // 数学上:无论格挡多大,至少留下 25%。
    for (const raw of [20, 200, 2000]) {
      const dealt = Math.max(1, Math.round(raw - Math.min(9999, raw * MAX_BLOCK_FRACTION)));
      expect(dealt / raw, `齐射 ${raw} 被减到只剩 ${dealt}`).toBeGreaterThanOrEqual(0.24);
    }
  });

  /** "次要但真实":一艘友舰不该顶掉玩家自己,也不该等于没有。 */
  it("一艘友舰的贡献在合理区间——既不喧宾夺主,也不是零", () => {
    const frac = constant("ALLY_DAMAGE_FRACTION");
    const interval = constant("ALLY_ATTACK_INTERVAL");
    expect(frac, "一艘友舰一轮就打出玩家满伤,那这仗不是你的了").toBeLessThan(0.6);
    expect(frac, "比例太小,友舰又变回摆设").toBeGreaterThan(0.15);
    expect(interval, "齐射间隔比玩家武器还快,友舰会喧宾夺主").toBeGreaterThan(2);
  });

  it("在最难的那场团战里,三艘友舰也能打出可观的一块", () => {
    const frac = constant("ALLY_DAMAGE_FRACTION");
    const interval = constant("ALLY_ATTACK_INTERVAL");
    const hardest = FLEET_FIGHTS.reduce((a, b) => {
      const h = (e: typeof a) => applyEmberLoad(e, 9).enemies.reduce((s, x) => s + x.hull, 0);
      return h(b) > h(a) ? b : a;
    });
    const scaled = applyEmberLoad(hardest, 9);
    const totalHull = scaled.enemies.reduce((s, x) => s + x.hull, 0);
    const block = Math.max(...scaled.enemies.map((x) => x.block));
    // 终局玩家的一把武器大约打 1000(见第 56 轮的实测量级)。
    const playerWeapon = 1000;
    const raw = playerWeapon * frac;
    const dealt = Math.max(1, raw - Math.min(block, raw * MAX_BLOCK_FRACTION));
    const threeAllies = (dealt / interval) * 3;
    const secondsToClear = totalHull / threeAllies;
    expect(
      secondsToClear,
      `三艘友舰要 ${Math.round(secondsToClear)} 秒才打得光——还是摆设`,
    ).toBeLessThan(600);
  });
});
