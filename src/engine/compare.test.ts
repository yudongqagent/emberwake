import { describe, expect, it } from "vitest";
import { benchmarkFor } from "./modules";
import { hullClassById } from "../data/hullClasses";
import type { ModuleInstance } from "../data/types";
import DRAFT_SRC from "../ui/screens/RefitDraft.tsx?raw";
import STATION_SRC from "../ui/screens/StationPanel.tsx?raw";
import MODULES_SRC from "../ui/screens/Modules.tsx?raw";
import STATS_SRC from "../ui/components/ModuleStats.tsx?raw";

/** 2026-08-31(/loop 第 19 轮)。整备抉择的卡面实拍:
 *
 *     Reaver Apotheosis   MK5   Dmg 47 · cycles 0.8s   Costs 122 hull
 *
 * 而玩家身上装着的那把是 Dmg 489。卡面只有绝对值,没有"和在装的那件差多少"。
 * 同一张界面上的**升级卡**却写着 `11 → 12` —— 容易做对比的那半做了,
 * 每场战斗都要做一次的那半没做。 */

function mod(id: string, defId: string, level: number): ModuleInstance {
  return { id, defId, rarity: "mk3", level, traits: [], lockedTraitSlot: null, quality: 0.5 };
}

const slotsOf = (h: string) => hullClassById(h).slots;

describe("换装对比:拿谁当参照", () => {
  const layout = slotsOf("destroyer");

  it("身上没有同类型的模组时不比", () => {
    const ship = { hullClass: "destroyer", equipped: Array(30).fill(null) };
    const w = mod("new", "bauhiniaWeapon1", 1);
    expect(benchmarkFor(ship, w, () => undefined)).toBeNull();
  });

  it("拿同类型里**最强的**当参照,而不是最弱的", () => {
    // 第一版拿的是最弱的("它会顶掉哪一件")。玩家心里的尺子是他最好的那把。
    const strong = mod("strong", "bauhiniaWeapon1", 12);
    const weak = mod("weak", "bauhiniaWeapon1", 1);
    const equipped: (string | null)[] = Array(30).fill(null);
    equipped[0] = "strong";
    equipped[1] = "weak";
    const ship = { hullClass: "destroyer", equipped };
    const lookup = (id: string) => ({ strong, weak }[id]);
    expect(benchmarkFor(ship, mod("cand", "bauhiniaWeapon1", 5), lookup)?.id).toBe("strong");
  });

  it("有空槽也照样比——那正是最需要参照的时候", () => {
    // 实测:那艘船 10 个武器槽只填了 1 个,"有空槽就不比"等于从不比较。
    const strong = mod("strong", "bauhiniaWeapon1", 12);
    const equipped: (string | null)[] = Array(30).fill(null);
    equipped[0] = "strong";
    const ship = { hullClass: "destroyer", equipped };
    expect(equipped.slice(0, layout.weapon).filter(Boolean).length, "这一条要在有空槽的前提下才有意义").toBeLessThan(layout.weapon);
    expect(benchmarkFor(ship, mod("cand", "bauhiniaWeapon1", 5), () => strong)?.id).toBe("strong");
  });

  it("只看同类型:装甲不会拿去和武器比", () => {
    const w = mod("w", "bauhiniaWeapon1", 9);
    const equipped: (string | null)[] = Array(30).fill(null);
    equipped[0] = "w";
    const ship = { hullClass: "destroyer", equipped };
    expect(benchmarkFor(ship, mod("a", "bauhiniaArmor1", 1), () => w)).toBeNull();
  });

  it("不会拿自己和自己比", () => {
    const self = mod("self", "bauhiniaWeapon1", 9);
    const equipped: (string | null)[] = Array(30).fill(null);
    equipped[0] = "self";
    const ship = { hullClass: "destroyer", equipped };
    expect(benchmarkFor(ship, self, () => self)).toBeNull();
  });
});

describe("每个「给玩家看候选模组」的界面都要给出对比", () => {
  /** 这是第 11 轮那条教训的同一个形状:规则对了,但只接了一处。
   * 抉择卡 / 空间站抽取 / 空间站货架 / 库存列表——四处都得传 compareTo。 */
  const SITES: [string, string][] = [
    ["整备抉择卡", DRAFT_SRC],
    ["空间站", STATION_SRC],
    ["模组页库存", MODULES_SRC],
  ];

  it("候选模组的数值行都带 compareTo", () => {
    for (const [name, src] of SITES) {
      const renders = src.match(/<ModuleStats[^>]*>/g) ?? [];
      // 已装备的那件不需要对比(它就是被比的那个),所以只查带 compareTo 的存在性
      // 和"候选"渲染点的数量对得上。
      const withCompare = renders.filter((r) => /compareTo=/.test(r));
      expect(withCompare.length, `${name} 里没有任何一处传 compareTo`).toBeGreaterThan(0);
      expect(src, `${name} 没有引用 wouldReplace`).toMatch(/wouldReplace/);
    }
  });

  it("空间站两个展示位都要比,不能只比一个", () => {
    const renders = STATION_SRC.match(/<ModuleStats[^>]*>/g) ?? [];
    expect(renders.length, "空间站的模组数值行数量变了,检查是否有新的展示位漏了对比").toBe(2);
    expect(renders.every((r) => /compareTo=/.test(r)), "空间站有展示位没传 compareTo").toBe(true);
  });

  it("功率的差值是反着算的——耗电更少才是好事", () => {
    expect(STATS_SRC, "功率没有标成 lowerIsBetter,+3 功率会被涂成绿色").toMatch(/lowerIsBetter: true/);
  });

  it("不给「这是升级」的结论徽章", () => {
    // 带词条/门派套装的那件常常数值更低却更该留着。把判断压成一个绿箭头,
    // 等于替玩家把这个游戏最有意思的决定做掉了。
    expect(STATS_SRC).not.toMatch(/UPGRADE|isUpgrade|upgradeBadge/);
  });
});
