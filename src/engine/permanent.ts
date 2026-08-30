import { sigilBonus, type SigilNodeId } from "../data/sigils";

/** 玩家的永久加成快照(余烬刻印,见 data/sigils.ts)。
 *
 * 为什么是个模块级的东西而不是函数参数:computeMaxHull / computePowerCapacity /
 * moduleMaxLevel 这些纯函数被十几处调用,给每一处加一个参数会把这次改动摊到整个
 * 代码库上,而且以后每加一个节点都要再摊一次。它们又都在 engine/ 里,直接 import
 * store 会成环。
 *
 * 拉取式,不是推送式。
 *
 * 第一版是 store 在模块顶层调一次 setPermanentBonuses 把快照推过来。那在冷启动
 * 时能跑,但 HMR 一热更新 store 就炸 `ReferenceError: permanentBonus is not
 * defined`——模块体重新执行的时候,依赖的绑定还在 TDZ 里。这类"模块初始化顺序"
 * 的坑我在这个项目里已经踩过一次(把 t() 引进 i18n/data 那次,类型全对、运行时
 * 直接 ReferenceError)。
 *
 * 改成注册一个**取值函数**:注册的时候不读任何东西,真正读是在渲染时,那时候所有
 * 模块早就初始化完了。顺序依赖直接消失。 */
let source: (() => Partial<Record<SigilNodeId, number>>) | null = null;

export function setPermanentBonusSource(fn: () => Partial<Record<SigilNodeId, number>>): void {
  source = fn;
}

/** 测试用的直接写入口。 */
export function setPermanentBonuses(next: Partial<Record<SigilNodeId, number>>): void {
  const snapshot = next ?? {};
  source = () => snapshot;
}

export function permanentBonus(id: SigilNodeId): number {
  return sigilBonus(source ? source() : {}, id);
}

/** 测试用:回到"什么都没买"的状态。 */
export function resetPermanentBonuses(): void {
  source = null;
}
