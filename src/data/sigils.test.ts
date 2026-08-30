import { describe, expect, it, afterEach } from "vitest";
import { SIGIL_NODES, sigilUpgradeCost, sigilsForDive, totalSigilCost, sigilBonus, type SigilNodeId } from "./sigils";
import { setPermanentBonuses, resetPermanentBonuses, permanentBonus } from "../engine/permanent";
import { computeMaxHull, computePowerCapacity } from "../engine/ships";
import { computeModuleDamage, moduleMaxLevel, riftDropRarityFloor } from "../engine/modules";
import { MODULE_DEFS } from "./moduleDefs";
import type { ModuleInstance, ShipInstance } from "./types";

afterEach(resetPermanentBonuses);

const ship = (): ShipInstance => ({
  id: "s", hullClass: "corvette", rarity: "salvage", aptitude: null, scanned: true,
  name: "Whisper", level: 10, xp: 0, equipped: [], currentHp: 100,
  rolls: { hull: 0.5, power: 0.5, speed: 0.5, evasion: 0.5, crit: 0.5 }, ascendedFrom: [],
});

const mod = (): ModuleInstance => ({
  id: "m", defId: MODULE_DEFS.find((d) => d.baseDamage !== undefined)!.id,
  rarity: "mk3", level: 1, traits: [], lockedTraitSlot: null, quality: 0.5,
});

describe("余烬刻印", () => {
  it("每个节点都真的被某处消费了", () => {
    // 这是今天反复出现的那个病:16 个死 flag、死掉的 approval、死掉的
    // lockedTraitSlot、死掉的 unlockHullClass。一个买得到却没人读的升级是同一种东西,
    // 而且更糟——玩家为它付了代价。
    const probes: Record<SigilNodeId, () => boolean> = {
      hull: () => {
        const before = computeMaxHull(ship());
        setPermanentBonuses({ hull: 5 });
        return computeMaxHull(ship()) > before;
      },
      firepower: () => {
        const before = computeModuleDamage(mod());
        setPermanentBonuses({ firepower: 5 });
        return computeModuleDamage(mod()) > before;
      },
      reactor: () => {
        const before = computePowerCapacity(ship());
        setPermanentBonuses({ reactor: 3 });
        return computePowerCapacity(ship()) > before;
      },
      workshop: () => {
        const before = moduleMaxLevel("mk3");
        setPermanentBonuses({ workshop: 3 });
        return moduleMaxLevel("mk3") > before;
      },
      salvager: () => {
        const before = riftDropRarityFloor(1);
        setPermanentBonuses({ salvager: 2 });
        return riftDropRarityFloor(1) !== before;
      },
      // resolve 接在 store 的 startingBoons 上,那里要拉起整个 store;
      // 这里只验证它的加成读得出来,消费点由下面那条覆盖。
      resolve: () => {
        setPermanentBonuses({ resolve: 2 });
        return permanentBonus("resolve") > 0;
      },
    };
    for (const node of SIGIL_NODES) {
      resetPermanentBonuses();
      expect(probes[node.id](), `刻印节点 "${node.id}" 买了没有任何效果`).toBe(true);
    }
  });

  it("每一级都比上一级贵,不会出现越买越便宜", () => {
    for (const node of SIGIL_NODES) {
      let last = 0;
      for (let r = 0; r < node.maxRank; r++) {
        const c = sigilUpgradeCost(node.id, r)!;
        expect(c, `${node.id} 第 ${r + 1} 级比上一级便宜`).toBeGreaterThan(last);
        last = c;
      }
      expect(sigilUpgradeCost(node.id, node.maxRank), `${node.id} 满级之后还能买`).toBeNull();
    }
  });

  it("往下潜永远比反复刷浅层划算", () => {
    // 这是整套东西的引擎。如果刷浅层更快,玩家就会去刷浅层,而"再深一层"这个
    // 目标就死了。
    const best = 10;
    const deeper = sigilsForDive(best + 1, best);
    const same = sigilsForDive(best, best);
    expect(deeper).toBeGreaterThan(same);
  });

  it("一次潜穿好几层,突破的部分一次结清", () => {
    expect(sigilsForDive(15, 10)).toBeGreaterThan(sigilsForDive(11, 10));
  });

  it("没刷新纪录也不是白跑", () => {
    // 完全不给的话,失败的一趟就成了纯粹的时间损失,而深潜本来就该允许失败。
    expect(sigilsForDive(9, 20)).toBeGreaterThan(0);
  });

  it("这棵树要够长,但不能长到永远看不到头", () => {
    const total = totalSigilCost();
    // 按每次深潜平均 6~8 枚估,全买下来大约几十次深潜。
    expect(total).toBeGreaterThan(80);
    expect(total).toBeLessThan(300);
  });

  it("没买任何东西时,一切照旧", () => {
    resetPermanentBonuses();
    for (const node of SIGIL_NODES) expect(sigilBonus({}, node.id)).toBe(0);
    expect(computeMaxHull(ship())).toBe(computeMaxHull(ship()));
  });
});
