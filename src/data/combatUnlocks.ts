/** 战斗控件的渐进式解锁。
 *
 * 2026-08-30,/loop 第 5 轮。这一轮我先查的是自己:今天连着加了声望、余烬负荷、
 * 刻印、契约、套装、船员支持度、星图事件、敌人角色……量下来玩家要面对
 * **25 个独立系统**(杀戮尖塔约 4 个,哈迪斯约 5 个)。
 *
 * 而更要命的是分布:**第一场仗就把 7 个控件同时摆出来**——反应堆分配(3 通道 ×
 * 3 档)、阵位指令、抗冲、目标选择、超载、余烬新星、自动开火。其中反应堆、阵位、
 * 抗冲、超载全都是无条件显示的。
 *
 * 而第一场仗刻意是"零输入也能赢"的(它教的是枪会自己开)。所以新玩家看到的是
 * 七个他一个都不需要按、也没人告诉他是干什么的按钮。
 *
 * 搜到的原则很直接:「上手门槛越高,能走到游戏真正好玩那一步的人越少」、
 * 「复杂机制要一件一件引入,中间留出熟悉的时间」。
 *
 * 所以控件按它**开始有用的那一刻**出现:
 *
 *   第 1 场  只有武器。学会"枪会自己开"。
 *   第 2 场  抗冲。那一场正好是会蓄力的炮台(见 encounters.ts 的说明)。
 *   之后     阵位指令 → 反应堆 → 超载,一场一件。
 *
 * 每个门槛都配一条等级兜底:这是开放世界,玩家可能一开始就飞去别的星区,不能因为
 * 没走主线就永远看不到某个控件。
 */

export interface CombatUnlock {
  id: "brace" | "stance" | "reactor" | "overcharge";
  /** 走主线时解锁它的 flag。 */
  flag: string;
  /** 兜底:到了这个等级就一定给,免得跳过主线的玩家被锁住。 */
  level: number;
}

export const COMBAT_UNLOCKS: CombatUnlock[] = [
  // 第二场戏就是那门会蓄力的炮台——抗冲必须在那之前到位。
  { id: "brace", flag: "act1.firstBlood.cleared", level: 2 },
  // 打完炮台之后。距离在那一场里第一次有意义(在蓄力期间冲上去打掉它)。
  { id: "stance", flag: "act1.static.cleared", level: 4 },
  // 第一个 BOSS 之后。到这时玩家已经有第二件武器,通道分配才有取舍。
  { id: "reactor", flag: "act1.tigersReach.cleared", level: 6 },
  { id: "overcharge", flag: "act1.houseRules.cleared", level: 8 },
];

export function unlockById(id: CombatUnlock["id"]): CombatUnlock {
  const u = COMBAT_UNLOCKS.find((x) => x.id === id);
  if (!u) throw new Error(`Unknown combat unlock: ${id}`);
  return u;
}

export function isUnlocked(
  id: CombatUnlock["id"],
  flags: Record<string, boolean>,
  shipLevel: number,
): boolean {
  const u = unlockById(id);
  return !!flags[u.flag] || shipLevel >= u.level;
}
