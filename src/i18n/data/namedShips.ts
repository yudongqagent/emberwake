/** Issue #11: Chinese translation overlay for named-ship reference data, keyed by
 * HullClassAbilityDef id. Same fallback-to-English pattern as the other data overlays.
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
  blinkVector: {
    name: "闪跃矢量号",
    active: "闪跃矢量 — 立即改变位置，并在数秒内大幅提升闪避率。",
    flavor: "拦截舰级。它从不待在你最后看到它的地方，也不会出现在你正瞄准的地方。",
  },
  ravagerSalvo: {
    name: "劫掠齐射号",
    active: "劫掠齐射 — 所有已装备的武器立即齐射一次，每发伤害有所降低。",
    flavor: "先锋舰级。信奉的道理很简单：最好的防御，就是先让敌人无路可退。",
  },
  bastionWard: {
    name: "壁垒结界号",
    active: "壁垒结界 — 完全格挡「絮语」号接下来受到的2次攻击，无论要花多久才会发生。",
    flavor: "壁垒舰级。它不靠装甲去扛下一击，而是干脆让那一击没有发生。",
  },
  firstBlood: {
    name: "先手号",
    active: "先手 — 敌方下一次攻击（无论命中与否）前，先发起一次全力反击。",
    flavor: "掠夺舰级。它不会等对方先出手，再看看拳头有没有打中。",
  },
  aegisWard: {
    name: "神盾结界号",
    active: "神盾结界 — 未来数秒内，受到的伤害减半。",
    flavor: "神盾舰级。主宰号的姊妹舰型：不太在乎能不能反击，只在乎绝不会倒下。",
  },
  chorusOverture: {
    name: "圣咏序曲号",
    active: "圣咏序曲 — 接下来3次武器射击必定命中，且伤害提升。",
    flavor: "颂歌舰级。逆向解析出的圣咏团科技——每一发炮弹都与前一发共鸣。",
  },
  sanctuaryField: {
    name: "圣所立场号",
    active: "圣所立场 — 未来数秒内完全格挡所受伤害，并立即恢复「絮语」号的船体。",
    flavor: "圣所舰级。颂歌号的姊妹舰型：圣咏团对「不被认可」给出的另一种回答。",
  },
};
