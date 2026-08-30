/** 余烬刻印 —— 跨越整局的永久成长。
 *
 * 2026-08-30。补 docs/content-depth-analysis.md 里剩下的两条,它们其实是同一条:
 *
 * - **裂隙在深度 ~20 撞墙**。敌人按 1.22^(深度-1) 无限增长,而玩家有硬天花板:
 *   等级 55、模组 mk5 满级、第七档骨架。所以必然存在一个你再也下不去的深度。
 * - **64 条进阶路线没有任何东西奖励重玩**。
 *
 * 撞墙本身不是问题——"能潜多深"作为一个分数是好设计。真正的问题是:**顶到天花板
 * 之后,再往下潜什么都不给**,而且没有任何办法抬高天花板。你打破了自己的记录,
 * 游戏连记都不记。
 *
 * 刻印就是那个记录,也是那个天花板的调节钮:
 *
 * - 每次深潜按到达的深度结算刻印;**刷新个人最深纪录**另有一笔大的。
 * - 刻印花在一小棵永久升级树上,每一个节点抬的都是一条硬上限。
 *
 * 于是"再深一层"永远有意义:它买来的东西会让下一次能更深。这是这个游戏第一条
 * 真正无尽的循环,也是"200 小时"那个目标唯一可能的落点。
 *
 * 刻意只做六个节点、每个三到五级。一棵大树看着丰富,实际上只会让玩家在没有信息的
 * 情况下乱点——而且每个节点都得在代码里真的接上,树越大,"列了却没接"的风险越高。
 */

export type SigilNodeId =
  | "hull"        // 船体强度上限
  | "firepower"   // 武器伤害
  | "reactor"     // 功率容量
  | "workshop"    // 模组等级上限
  | "salvager"    // 裂隙掉落稀有度下限
  | "resolve";    // 出击开局的增益数量

export interface SigilNode {
  id: SigilNodeId;
  maxRank: number;
  /** 第 rank 级(从 1 起)要花多少刻印。 */
  cost: (rank: number) => number;
  /** 每级给多少。单位由各自的接入点决定。 */
  perRank: number;
}

export const SIGIL_NODES: SigilNode[] = [
  { id: "hull",      maxRank: 5, cost: (r) => 3 * r, perRank: 0.04 },
  { id: "firepower", maxRank: 5, cost: (r) => 3 * r, perRank: 0.04 },
  { id: "reactor",   maxRank: 3, cost: (r) => 5 * r, perRank: 1 },
  { id: "workshop",  maxRank: 3, cost: (r) => 6 * r, perRank: 1 },
  { id: "salvager",  maxRank: 2, cost: (r) => 8 * r, perRank: 1 },
  { id: "resolve",   maxRank: 2, cost: (r) => 7 * r, perRank: 1 },
];

export function sigilNodeById(id: SigilNodeId): SigilNode {
  const n = SIGIL_NODES.find((x) => x.id === id);
  if (!n) throw new Error(`Unknown sigil node: ${id}`);
  return n;
}

/** 升到下一级要多少;已满级返回 null。 */
export function sigilUpgradeCost(id: SigilNodeId, currentRank: number): number | null {
  const node = sigilNodeById(id);
  if (currentRank >= node.maxRank) return null;
  return node.cost(currentRank + 1);
}

/** 某个节点当前给出的总量。 */
export function sigilBonus(ranks: Partial<Record<SigilNodeId, number>>, id: SigilNodeId): number {
  return (ranks[id] ?? 0) * sigilNodeById(id).perRank;
}

/** 一次深潜结算多少刻印。
 *
 * 两部分:到达深度的基础结算,加上**刷新纪录**的一大笔。基础那部分是线性的,
 * 所以反复刷浅层不会比往下潜划算;纪录那部分是这套东西真正的引擎——它只在你
 * 比上一次更深的时候给,所以"再深一层"永远是最优解。 */
export function sigilsForDive(depth: number, previousBest: number): number {
  const base = Math.floor(depth / 3);
  if (depth <= previousBest) return base;
  // 每突破一层给 2 枚,一次深潜突破多层就一次结清。
  return base + (depth - previousBest) * 2;
}

/** 全部买下来一共要多少——用来判断这棵树够不够长。 */
export function totalSigilCost(): number {
  return SIGIL_NODES.reduce(
    (sum, n) => sum + Array.from({ length: n.maxRank }, (_, i) => n.cost(i + 1)).reduce((a, b) => a + b, 0),
    0,
  );
}
