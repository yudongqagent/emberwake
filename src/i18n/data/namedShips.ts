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
    active: "阿尔法打击 — 本回合下一次开火伤害翻倍，该武器的冷却额外延长 2 回合。",
    flavor: "一艘从未学会节制的驱逐舰。每一发炮弹都当成最后一发来打。",
  },
  hollowPoint: {
    name: "空弹头号",
    active: "相位偏移 — 让敌方接下来的 1 次攻击必定落空。",
    flavor: "严格来说属于巡洋舰级。但它待在「不完全在场」状态的时间，比真正在场的时间还长。",
  },
  ironVerdict: {
    name: "铁判号",
    active: "铁律裁决 — 2 回合（约 4.8 秒）内装甲格挡翻倍。",
    flavor: "为了没人认为能打赢的攻坚战而建造。大多数确实打不赢——直到有了它。",
  },
  starvingWolf: {
    name: "饿狼号",
    active: "饿狼 — 2 回合（约 4.8 秒）内，你对被标记目标造成的伤害有 25% 回复自身。",
    flavor: "无畏舰级。炮组船员这么称呼它是有原因的，只是从没人跟新兵解释过。",
  },
  lastLight: {
    name: "余光号",
    active: "超驱 — 所有武器的冷却立刻清零（0 秒）。",
    flavor: "神盾舰级。当真正要紧的时刻到来时，没人指望还能有战舰在天上飞——除了它。",
  },
  blinkVector: {
    name: "闪跃矢量号",
    active: "闪跃矢量 — 立即切换一档交战距离，并在 2 回合（约 4.8 秒）内获得 +25 点闪避。",
    flavor: "拦截舰级。它从不待在你最后看到它的地方，也不会出现在你正瞄准的地方。",
  },
  ravagerSalvo: {
    name: "劫掠齐射号",
    active: "劫掠齐射 — 所有已装备武器立刻齐射一次，每发 50% 伤害。",
    flavor: "先锋舰级。信奉的道理很简单：最好的防御，就是先让敌人无路可退。",
  },
  bastionWard: {
    name: "壁垒结界号",
    active: "壁垒结界 — 接下来的 2 次命中被完全挡下。",
    flavor: "壁垒舰级。它不靠装甲去扛下一击，而是干脆让那一击没有发生。",
  },
  firstBlood: {
    name: "先手号",
    active: "先手 — 在敌方下一次攻击落下之前先打一发，伤害为最强武器的 100%。",
    flavor: "掠夺舰级。它不会等对方先出手，再看看拳头有没有打中。",
  },
  aegisWard: {
    name: "神盾结界号",
    active: "神盾结界 — 3 回合（约 7.2 秒）内受到的伤害减半。",
    flavor: "神盾舰级。主宰号的姊妹舰型：不太在乎能不能反击，只在乎绝不会倒下。",
  },
  chorusOverture: {
    name: "圣咏序曲号",
    active: "圣咏序曲 — 接下来 3 次射击必定命中，且伤害 ×1.3。",
    flavor: "颂歌舰级。逆向解析出的圣咏团科技——每一发炮弹都与前一发共鸣。",
  },
  sanctuaryField: {
    name: "圣所立场号",
    active: "圣所立场 — 2.5 回合（约 6 秒）内完全格挡伤害，并立即恢复 20% 最大船体。",
    flavor: "圣所舰级。颂歌号的姊妹舰型：圣咏团对「不被认可」给出的另一种回答。",
  },
};
