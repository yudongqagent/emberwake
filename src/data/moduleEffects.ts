/** The module effect vocabulary — see docs/module-system.md.
 *
 * A 200-module roster is only meaningful if the effects behind it are real, so
 * this registry is the contract: every id here is implemented at the combat call
 * site named in `site`. Anything listed and not wired would be exactly the
 * "reskins wearing different names" failure docs/content-depth-standards.md exists
 * to prevent — the test in moduleEffects.test.ts checks the registry against the
 * combat source so that can't drift silently. */

export type EffectSite =
  /** Resolved when one of the player's weapons fires — Combat.tsx fireModuleImpl. */
  | "fire"
  /** Resolved when an enemy attacks the player — Combat.tsx enemyAttack. */
  | "defend"
  /** Ticks on the combat heartbeat — Combat.tsx combatTick. */
  | "tick"
  /** Read once at combat setup / outside combat — passive aggregates. */
  | "passive";

export interface ModuleEffectDef {
  id: string;
  site: EffectSite;
  /** Short label shown on module cards. */
  label: string;
  labelCn: string;
  description: string;
  descriptionCn: string;
}

export const MODULE_EFFECTS: ModuleEffectDef[] = [
  // --- Offense: damage shaping ---
  { id: "crit", site: "fire", label: "+Crit", labelCn: "暴击", description: "Higher chance to strike a critical hit.", descriptionCn: "提高暴击几率。" },
  { id: "pierce", site: "fire", label: "Pierce", labelCn: "穿透", description: "Ignores half the target's armor.", descriptionCn: "无视目标一半护甲。" },
  { id: "execute", site: "fire", label: "Execute", labelCn: "处决", description: "+50% damage to targets below 25% hull.", descriptionCn: "对船体低于25%的目标伤害+50%。" },
  { id: "overload", site: "fire", label: "Overload", labelCn: "过载", description: "Every 3rd shot from this module hits twice as hard.", descriptionCn: "该模组每第3发射击伤害翻倍。" },
  { id: "surge", site: "fire", label: "Surge", labelCn: "涌流", description: "Bonus damage if the range band shifted since your last shot.", descriptionCn: "若距离档位自上次射击后发生变化，则造成额外伤害。" },
  { id: "opener", site: "fire", label: "Opener", labelCn: "先手", description: "The first shot of each fight deals double damage.", descriptionCn: "每场战斗的第一发射击伤害翻倍。" },
  { id: "finisher", site: "fire", label: "Finisher", labelCn: "终结", description: "+35% damage while the target is the last enemy standing.", descriptionCn: "当目标是最后一名存活敌人时，伤害+35%。" },
  { id: "rampage", site: "fire", label: "Rampage", labelCn: "杀戮狂潮", description: "+12% damage for each enemy destroyed this fight.", descriptionCn: "本场战斗每击毁一名敌人，伤害+12%。" },
  { id: "pointBlank", site: "fire", label: "Point Blank", labelCn: "抵近射击", description: "+30% damage at close range.", descriptionCn: "近距离时伤害+30%。" },
  { id: "sniper", site: "fire", label: "Sniper", labelCn: "狙击", description: "+30% damage at long range.", descriptionCn: "远距离时伤害+30%。" },
  { id: "exploit", site: "fire", label: "Exploit", labelCn: "弱点利用", description: "+40% damage against debuffed targets.", descriptionCn: "对处于减益状态的目标伤害+40%。" },
  { id: "overkill", site: "fire", label: "Overkill", labelCn: "溢伤", description: "Damage beyond a kill splashes onto another enemy.", descriptionCn: "击杀后的溢出伤害会溅射到另一名敌人。" },

  // --- Offense: multi-target ---
  { id: "chainArc", site: "fire", label: "Chain Arc", labelCn: "链弧", description: "Damage arcs to a second target.", descriptionCn: "伤害会跳跃至第二个目标。" },
  { id: "aoe", site: "fire", label: "Splash", labelCn: "溅射", description: "Also hits every other living enemy for reduced damage.", descriptionCn: "同时对其他所有存活敌人造成较低伤害。" },
  { id: "volley", site: "fire", label: "Volley", labelCn: "齐射", description: "Fires a second, independent shot at the same target.", descriptionCn: "对同一目标追加一次独立射击。" },
  { id: "scatter", site: "fire", label: "Scatter", labelCn: "散射", description: "Splits into two weaker shots at random living targets.", descriptionCn: "分裂为两发较弱的射击，随机命中存活目标。" },
  { id: "barrage", site: "fire", label: "Barrage", labelCn: "连击", description: "Fires three rapid shots at a fraction of damage each.", descriptionCn: "快速连射三发，每发伤害有所降低。" },

  // --- Offense: status ---
  { id: "disable", site: "fire", label: "Disable", labelCn: "瘫痪", description: "Chance to disable the target's next attack.", descriptionCn: "有几率使目标的下一次攻击失效。" },
  { id: "shieldBreak", site: "fire", label: "Shield Break", labelCn: "破盾", description: "Strips the target's armor for several hits.", descriptionCn: "剥离目标护甲，持续数次命中。" },
  { id: "corrode", site: "fire", label: "Corrode", labelCn: "腐蚀", description: "Permanently reduces the target's armor for the fight.", descriptionCn: "在本场战斗中永久削减目标护甲。" },
  { id: "slow", site: "fire", label: "Dampen", labelCn: "迟滞", description: "Delays the target's next attack.", descriptionCn: "延迟目标的下一次攻击。" },
  { id: "mark", site: "fire", label: "Mark", labelCn: "标记", description: "Marked targets take increased damage from everything.", descriptionCn: "被标记的目标受到的所有伤害提高。" },
  { id: "burn", site: "fire", label: "Ignite", labelCn: "点燃", description: "Applies burning damage over time.", descriptionCn: "施加持续燃烧伤害。" },
  { id: "sunder", site: "fire", label: "Sunder", labelCn: "碎甲", description: "Each hit permanently lowers the target's damage.", descriptionCn: "每次命中都会永久削弱目标的伤害。" },

  // --- Defense ---
  { id: "absorb", site: "defend", label: "Absorb", labelCn: "吸收", description: "Negates the first hit taken each fight.", descriptionCn: "完全抵消每场战斗中受到的第一次命中。" },
  { id: "reflect", site: "defend", label: "Reflect", labelCn: "反射", description: "Returns a fraction of blocked damage to the attacker.", descriptionCn: "将部分被格挡的伤害反弹给攻击者。" },
  { id: "evasion", site: "passive", label: "+Evasion", labelCn: "闪避", description: "Harder to hit.", descriptionCn: "更难被命中。" },
  { id: "momentum", site: "defend", label: "Momentum", labelCn: "动能", description: "Evasion rises with each consecutive attack avoided.", descriptionCn: "每连续躲过一次攻击，闪避率提升。" },
  { id: "hullBonus", site: "passive", label: "+Hull", labelCn: "船体", description: "Increases maximum hull integrity.", descriptionCn: "提高船体强度上限。" },
  { id: "regen", site: "tick", label: "Regen", labelCn: "再生", description: "Recovers hull steadily during combat.", descriptionCn: "战斗中持续恢复船体。" },
  { id: "ablate", site: "defend", label: "Ablate", labelCn: "烧蚀", description: "Each hit taken reduces the damage of the next one.", descriptionCn: "每受到一次命中，都会降低下一次所受伤害。" },
  { id: "bulwark", site: "defend", label: "Bulwark", labelCn: "壁垒", description: "Armor block scales up as hull drops.", descriptionCn: "船体越低，护甲格挡越高。" },
  { id: "lastStand", site: "defend", label: "Last Stand", labelCn: "背水", description: "Survives one otherwise-lethal hit per fight.", descriptionCn: "每场战斗可承受一次本应致命的攻击。" },
  { id: "deflect", site: "defend", label: "Deflect", labelCn: "偏转", description: "Chance to fully deflect an incoming attack.", descriptionCn: "有几率完全偏转一次来袭攻击。" },

  // --- Tempo / resource ---
  { id: "coolant", site: "passive", label: "Coolant", labelCn: "冷却剂", description: "Shortens this ship's weapon cooldowns.", descriptionCn: "缩短本舰武器的冷却时间。" },
  { id: "capacitor", site: "passive", label: "Capacitor", labelCn: "电容", description: "Reduces the power draw of every equipped module.", descriptionCn: "降低所有已装备模组的功率负载。" },
  { id: "novaCharge", site: "fire", label: "Nova Coil", labelCn: "新星线圈", description: "Landing hits charges Ember Nova faster.", descriptionCn: "命中时更快地为余烬新星充能。" },
  { id: "haste", site: "passive", label: "Haste", labelCn: "急动", description: "Shortens crew and hull-class ability cooldowns.", descriptionCn: "缩短船员与舰级技能的冷却时间。" },
  { id: "recycler", site: "tick", label: "Recycler", labelCn: "回收装置", description: "Slowly refunds weapon cooldown over the fight.", descriptionCn: "战斗中持续少量回退武器冷却。" },
  { id: "overdriveSync", site: "fire", label: "Overdrive Sync", labelCn: "超驱同步", description: "Overcharged shots no longer extend the cooldown penalty.", descriptionCn: "超载射击不再延长冷却惩罚。" },

  // --- Utility / economy ---
  { id: "yieldBonus", site: "passive", label: "+Yield", labelCn: "增产", description: "Bonus Salvage and Alloy from this fight.", descriptionCn: "本场战斗获得额外废料与合金。" },
  { id: "cleanse", site: "fire", label: "Cleanse", labelCn: "净化", description: "Clears corrosion stacked on your own hull.", descriptionCn: "清除己方船体上累积的腐蚀。" },
  { id: "displace", site: "fire", label: "Displace", labelCn: "位移", description: "Briefly spikes evasion by scattering the enemy formation.", descriptionCn: "打乱敌方阵型，短时间大幅提升闪避。" },
  { id: "jumpRange", site: "passive", label: "+Jump Range", labelCn: "跃迁范围", description: "Faster range-band shifts.", descriptionCn: "更快地改变交战距离。" },
  { id: "prospector", site: "passive", label: "Prospector", labelCn: "探矿", description: "Mining and salvage yield more per tick.", descriptionCn: "采矿与打捞每次获得更多资源。" },
  { id: "insightDraw", site: "passive", label: "Insight Draw", labelCn: "洞悉汲取", description: "Chance to recover Insight from a victory.", descriptionCn: "战斗胜利后有几率回收洞悉。" },
];

const BY_ID = new Map(MODULE_EFFECTS.map((e) => [e.id, e]));

export function moduleEffectById(id: string): ModuleEffectDef | undefined {
  return BY_ID.get(id);
}

export const MODULE_EFFECT_IDS: string[] = MODULE_EFFECTS.map((e) => e.id);
