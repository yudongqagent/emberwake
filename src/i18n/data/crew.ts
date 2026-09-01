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
    active: "野战维修 — 立即为旗舰恢复 15% 最大船体。",
  },
  ratchetKoi: {
    name: '水手长"棘轮"高伊',
    passive: "近距离交战时武器伤害+10%。",
    active: "聚焦火力 — 下一次武器齐射必定暴击（×1.75 伤害）。",
  },
  kaanFerrous: {
    name: "剑客铁衡",
    passive: "远距离交战时闪避+10%。",
    active: "反击 — 下一次闪避命中之后，立刻回敬一发，伤害为最强武器的 60%。",
  },
  priyaOsei: {
    name: "军需官苏萤",
    passive: "交易兑换获得的废料与合金+10%。",
    active: "低价倾销 — 所有敌人的格挡减半，持续 2 回合（约 4.8 秒）。",
  },
  kessaVray: {
    name: '凯莎"虎鲨"维雷',
    passive: "全舰队战斗胜利获得的废料与合金+15%。",
    active: "掠夺者切割 — 所有敌人在 1 回合（约 2.4 秒）内多受 25% 伤害。",
  },
  unit7Requiem: {
    name: "七号安魂机",
    passive: "全舰队最大船体+15%。",
    active: "构装体超驰 — 1 回合（约 2.4 秒）内完全免疫伤害。",
  },
  velaCantor: {
    name: "云筝，圣咏团最后的领唱者",
    passive: "全舰队从重大首领战获得的本源精华+12%。",
    active: "断章破音 — 对所有存活敌人造成相当于功率容量 27% 的伤害，并清空圣咏共鸣。",
  },
  recruitHelm: {
    name: "新兵",
    passive: "全舰队闪避+5%。",
    active: "闪避冲刺 — 立即切换 1 档交战距离，方向跟着你已下达的舵手指令走。",
  },
  recruitTactician: {
    name: "新兵",
    passive: "战斗胜利获得的洞悉+5%。",
    active: "目标锁定 — 目标闪避减半，持续 2 回合（约 4.8 秒）。",
  },
};
