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
  { id: "crit", site: "fire", label: "+Crit", labelCn: "暴击", description: "+12% critical hit chance.", descriptionCn: "暴击几率 +12%。" },
  { id: "pierce", site: "fire", label: "Pierce", labelCn: "穿透", description: "Ignores half the target's armor.", descriptionCn: "无视目标一半护甲。" },
  { id: "execute", site: "fire", label: "Execute", labelCn: "处决", description: "+50% damage to targets below 25% hull.", descriptionCn: "对船体低于25%的目标伤害+50%。" },
  { id: "overload", site: "fire", label: "Overload", labelCn: "过载", description: "Every 3rd shot from this module hits twice as hard.", descriptionCn: "该模组每第3发射击伤害翻倍。" },
  { id: "surge", site: "fire", label: "Surge", labelCn: "涌流", description: "+25% damage if the range band shifted since your last shot.", descriptionCn: "若距离档位自上次射击后发生变化，伤害 +25%。" },
  { id: "opener", site: "fire", label: "Opener", labelCn: "先手", description: "The first shot of each fight deals double damage.", descriptionCn: "每场战斗的第一发射击伤害翻倍。" },
  { id: "finisher", site: "fire", label: "Finisher", labelCn: "终结", description: "+35% damage while the target is the last enemy standing.", descriptionCn: "当目标是最后一名存活敌人时，伤害+35%。" },
  { id: "rampage", site: "fire", label: "Rampage", labelCn: "杀戮狂潮", description: "+12% damage for each enemy destroyed this fight.", descriptionCn: "本场战斗每击毁一名敌人，伤害+12%。" },
  { id: "pointBlank", site: "fire", label: "Point Blank", labelCn: "抵近射击", description: "+30% damage at close range.", descriptionCn: "近距离时伤害+30%。" },
  { id: "sniper", site: "fire", label: "Sniper", labelCn: "狙击", description: "+30% damage at long range.", descriptionCn: "远距离时伤害+30%。" },
  { id: "exploit", site: "fire", label: "Exploit", labelCn: "弱点利用", description: "+40% damage against debuffed targets.", descriptionCn: "对处于减益状态的目标伤害+40%。" },
  { id: "overkill", site: "fire", label: "Overkill", labelCn: "溢伤", description: "60% of the damage past a kill splashes onto another enemy.", descriptionCn: "击杀后溢出伤害的 60% 溅射到另一名敌人。" },

  // --- Offense: multi-target ---
  { id: "chainArc", site: "fire", label: "Chain Arc", labelCn: "链弧", description: "Arcs 40% of the hit to a second target.", descriptionCn: "将该次命中的 40% 弹射到第二个目标。" },
  { id: "aoe", site: "fire", label: "Splash", labelCn: "溅射", description: "Also hits every other living enemy for 60% damage.", descriptionCn: "同时对其余每名存活敌人造成 60% 伤害。" },
  { id: "volley", site: "fire", label: "Volley", labelCn: "齐射", description: "Fires a second, independent shot at the same target.", descriptionCn: "对同一目标追加一次独立射击。" },
  { id: "scatter", site: "fire", label: "Scatter", labelCn: "散射", description: "Splits into two shots at 50% damage, at random living targets.", descriptionCn: "拆成两发 50% 伤害的射击，随机打向存活目标。" },
  { id: "barrage", site: "fire", label: "Barrage", labelCn: "连击", description: "Fires three rapid shots at 42% damage each.", descriptionCn: "连射三发，每发 42% 伤害。" },

  // --- Offense: status ---
  { id: "disable", site: "fire", label: "Disable", labelCn: "瘫痪", description: "35% chance to disable the target's next attack.", descriptionCn: "35% 几率让目标的下一次攻击失效。" },
  { id: "shieldBreak", site: "fire", label: "Shield Break", labelCn: "破盾", description: "Strips the target's armor for its next 3 hits.", descriptionCn: "剥掉目标接下来 3 次受击的护甲。" },
  { id: "corrode", site: "fire", label: "Corrode", labelCn: "腐蚀", description: "Permanently strips 15% of the target's armor per hit.", descriptionCn: "每次命中永久剥掉目标 15% 的护甲。" },
  { id: "slow", site: "fire", label: "Dampen", labelCn: "迟滞", description: "Delays the target's next attack by 50%.", descriptionCn: "使目标的下一次攻击延迟 50%。" },
  { id: "mark", site: "fire", label: "Mark", labelCn: "标记", description: "Marked targets take +50% damage from every source.", descriptionCn: "被标记的目标受到的所有伤害 +50%。" },
  { id: "burn", site: "fire", label: "Ignite", labelCn: "点燃", description: "Applies burning for 16% of the hit as damage over time.", descriptionCn: "点燃目标，按该次命中的 16% 持续造成伤害。" },
  { id: "sunder", site: "fire", label: "Sunder", labelCn: "碎甲", description: "Each hit permanently lowers the target's damage by 10%.", descriptionCn: "每次命中永久降低目标 10% 伤害。" },

  // --- Defense ---
  { id: "absorb", site: "defend", label: "Absorb", labelCn: "吸收", description: "Negates the first hit taken each fight.", descriptionCn: "抵消每场战斗受到的第一次攻击。" },
  { id: "reflect", site: "defend", label: "Reflect", labelCn: "反射", description: "Returns 30% of blocked damage to the attacker.", descriptionCn: "将格挡掉的伤害的 30% 反弹给攻击者。" },
  { id: "evasion", site: "passive", label: "+Evasion", labelCn: "闪避", description: "+5% evasion per module.", descriptionCn: "每件 +5% 闪避。" },
  { id: "momentum", site: "defend", label: "Momentum", labelCn: "动能", description: "+3% evasion per consecutive attack avoided, up to +15%.", descriptionCn: "每连续躲过一次攻击 +3% 闪避，最多 +15%。" },
  { id: "hullBonus", site: "passive", label: "+Hull", labelCn: "船体", description: "+15% max hull per module, up to +60%.", descriptionCn: "每件最大船体 +15%，最多 +60%。" },
  { id: "regen", site: "tick", label: "Regen", labelCn: "再生", description: "Recovers 4% max hull per tick per module, up to 14%.", descriptionCn: "每件每跳回复 4% 最大船体，最多 14%。" },
  { id: "ablate", site: "defend", label: "Ablate", labelCn: "烧蚀", description: "Each hit taken softens the next by 10%, up to 40%.", descriptionCn: "每受一次攻击，下一次减伤 10%，最多 40%。" },
  { id: "bulwark", site: "defend", label: "Bulwark", labelCn: "壁垒", description: "Armor block scales up as hull drops, to +80% at near-death.", descriptionCn: "船体越低格挡越高，濒死时最高 +80%。" },
  { id: "lastStand", site: "defend", label: "Last Stand", labelCn: "背水", description: "Survives one otherwise-lethal hit per fight.", descriptionCn: "每场战斗可承受一次本应致命的攻击。" },
  { id: "deflect", site: "defend", label: "Deflect", labelCn: "偏转", description: "14% chance per module to fully deflect an attack, up to 40%.", descriptionCn: "每件 14% 几率完全偏转一次攻击，最多 40%。" },

  // --- Tempo / resource ---
  { id: "coolant", site: "passive", label: "Coolant", labelCn: "冷却剂", description: "-18% weapon cooldown per module, up to -55%.", descriptionCn: "每件武器冷却 -18%，最多 -55%。" },
  { id: "capacitor", site: "passive", label: "Capacitor", labelCn: "电容", description: "-12% power draw per capacitor module, down to -40%.", descriptionCn: "每件电容模组降低 12% 总功率消耗，最多 -40%。" },
  { id: "novaCharge", site: "fire", label: "Nova Coil", labelCn: "新星线圈", description: "+8 Ember Nova charge per landed hit, up to +28.", descriptionCn: "每次命中为余烬新星充能 +8，最多 +28。" },
  { id: "haste", site: "passive", label: "Haste", labelCn: "急动", description: "-15% crew and hull-class ability cooldown per module, up to -50%.", descriptionCn: "每件船员/舰级技能冷却 -15%，最多 -50%。" },
  { id: "recycler", site: "tick", label: "Recycler", labelCn: "回收装置", description: "Refunds 0.35s of weapon cooldown per second per module, up to 1.2s.", descriptionCn: "每件每秒返还 0.35 秒武器冷却，最多 1.2 秒。" },
  { id: "overdriveSync", site: "fire", label: "Overdrive Sync", labelCn: "超驱同步", description: "Overcharged shots no longer extend the weapon's cooldown.", descriptionCn: "超载射击不再延长该武器的冷却。" },

  // --- Utility / economy ---
  { id: "yieldBonus", site: "passive", label: "+Yield", labelCn: "增产", description: "+20% Salvage and Alloy from this fight per module, up to +80%.", descriptionCn: "每件本场战斗废料与合金 +20%，最多 +80%。" },
  { id: "cleanse", site: "fire", label: "Cleanse", labelCn: "净化", description: "Clears corrosion stacked on your own hull.", descriptionCn: "清除累积在自己船体上的腐蚀。" },
  { id: "displace", site: "fire", label: "Displace", labelCn: "位移", description: "Scatters the enemy's aim, spiking evasion for 1.5 turns.", descriptionCn: "打乱敌方瞄准，闪避在 1.5 个回合内飙升。" },
  { id: "jumpRange", site: "passive", label: "+Jump Range", labelCn: "跃迁范围", description: "Removes the cooldown on range-band shifts.", descriptionCn: "取消距离档位切换的冷却。" },
  { id: "prospector", site: "passive", label: "Prospector", labelCn: "探矿", description: "+25% mining and salvage yield per module.", descriptionCn: "每件采矿与打捞产出 +25%。" },
  { id: "insightDraw", site: "passive", label: "Insight Draw", labelCn: "洞悉汲取", description: "20% chance per module to recover Insight from a victory, up to 60%.", descriptionCn: "每件 20% 几率在胜利后回收洞察，最多 60%。" },
];

const BY_ID = new Map(MODULE_EFFECTS.map((e) => [e.id, e]));

export function moduleEffectById(id: string): ModuleEffectDef | undefined {
  return BY_ID.get(id);
}

export const MODULE_EFFECT_IDS: string[] = MODULE_EFFECTS.map((e) => e.id);
