/** Issue #11: Chinese translation overlay for named-ship reference data, keyed by
 * NamedShipDef id. Same fallback-to-English pattern as the other data overlays.
 * `active` keeps the literal " — " separator (Fleet.tsx/StationPanel.tsx don't split
 * on it today, but Combat.tsx's action button does via namedDef.active.split(" — ")
 * — see useShipActiveImpl's button render). Original prose, not sourced. */
export interface NamedShipZh {
  name: string;
  active: string;
  flavor: string;
}

export const NAMED_SHIPS_ZH: Record<string, NamedShipZh> = {
  nightfallVow: {
    name: "暮誓号",
    active: "阿尔法打击 — 使本回合下一次开火的武器伤害翻倍，但该武器的冷却将额外锁定2回合。",
    flavor: "一艘从未学会节制的驱逐舰。每一发炮弹都当成最后一发来打。",
  },
  hollowPoint: {
    name: "空弹头号",
    active: "相位偏移 — 使「絮语」号在敌方下一回合完全无法被锁定。",
    flavor: "严格来说属于巡洋舰级。但它待在「不完全在场」状态的时间，比真正在场的时间还长。",
  },
  ironVerdict: {
    name: "铁判号",
    active: "强化 — 未来2个敌方回合内，护甲格挡翻倍。",
    flavor: "为了没人认为能打赢的攻坚战而建造。大多数确实打不赢——直到有了它。",
  },
  starvingWolf: {
    name: "饿狼号",
    active: "血腥气味 — 未来2回合内，对当前目标造成的部分伤害会转化为「絮语」号的船体治疗。",
    flavor: "无畏舰级。炮组船员这么称呼它是有原因的，只是从没人跟新兵解释过。",
  },
  lastLight: {
    name: "余光号",
    active: "超驱 — 立即将所有武器的冷却重置为零。",
    flavor: "神盾舰级。当真正要紧的时刻到来时，没人指望还能有战舰在天上飞——除了它。",
  },
};
