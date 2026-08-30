/** Issue #11: Chinese translation overlay for crew reference data, keyed by CrewDef
 * id. Same fallback-to-English pattern as the other data overlays. Original prose,
 * not sourced. `active` keeps the exact " — " separator the English original uses
 * (Combat.tsx's action buttons split on it to get just the ability name), so the
 * literal ASCII " — " must be preserved, not swapped for a full-width Chinese dash. */
export interface CrewZh {
  name: string;
  passive: string;
  active: string;
}

export const CREW_ZH: Record<string, CrewZh> = {
  oriVashti: {
    name: "柳芸",
    passive: "全舰队从战斗残骸打捞中额外获得+8%合金。",
    active: "野战维修 — 战斗中为旗舰恢复船体。",
  },
  ratchetKoi: {
    name: '水手长"棘轮"高伊',
    passive: "近距离交战时武器伤害+10%。",
    active: "聚焦火力 — 下一次武器齐射必定暴击。",
  },
  kaanFerrous: {
    name: "剑客铁衡",
    passive: "远距离交战时闪避+10%。",
    active: "反击 — 闪避命中后发动一次免费反击。",
  },
  priyaOsei: {
    name: "军需官苏萤",
    passive: "交易兑换获得的废料与合金+10%。",
    active: "低价倾销 — 使所有敌人的格挡降低，持续两回合。",
  },
  kessaVray: {
    name: '凯莎"虎鲨"维雷',
    passive: "全舰队战斗胜利获得的废料与合金+15%。",
    active: "掠夺者切割 — 所有敌人在一回合内受到额外伤害。",
  },
  unit7Requiem: {
    name: "七号安魂机",
    passive: "全舰队最大船体+15%。",
    active: "构装体超驰 — 抵消一回合内的所有受到伤害。",
  },
  velaCantor: {
    name: "云筝，圣咏团最后的领唱者",
    passive: "全舰队从重大首领战获得的本源精华+12%。",
    active: "断章破音 — 对所有存活敌人造成伤害，并打破圣咏团的共同共鸣。",
  },
  recruitHelm: {
    name: "新兵",
    passive: "全舰队闪避+5%。",
    active: "闪避冲刺 — 立即切换一档交战距离。",
  },
  recruitTactician: {
    name: "新兵",
    passive: "战斗胜利获得的洞悉+5%。",
    active: "目标锁定 — 降低敌方闪避，持续两回合。",
  },
};
