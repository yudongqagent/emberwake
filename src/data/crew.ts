import type { CrewDef } from "./types";

export const CREW_DEFS: CrewDef[] = [
  {
    id: "oriVashti",
    name: "Ori Vashti",
    role: "engineer",
    rarity: "veteran",
    named: true,
    passive: "+8% Alloy from combat wreck salvage fleet-wide.",
    active: "Field Patch — restore hull to the flagship mid-battle.",
    abilityId: "fieldPatch",
    activeCooldown: 3,
    unlockFlag: "act1.firstBlood.cleared",
  },
  {
    id: "ratchetKoi",
    name: 'Bosun "Ratchet" Koi',
    role: "gunner",
    rarity: "veteran",
    named: true,
    passive: "+10% weapon damage when at Close range.",
    active: "Focus Fire — guaranteed critical hit on the next weapon volley.",
    abilityId: "focusFire",
    activeCooldown: 4,
    unlockFlag: "act1.tigersReach.cleared",
  },
  {
    id: "kaanFerrous",
    name: "Duelist Kaan Ferrous",
    role: "helm",
    rarity: "veteran",
    named: true,
    passive: "+10% evasion when at Long range.",
    active: "Riposte — free counter-attack after evading a hit.",
    abilityId: "riposte",
    activeCooldown: 3,
    unlockFlag: "act2.openLanes.cleared",
  },
  {
    id: "priyaOsei",
    name: "Quartermaster Priya Osei",
    role: "tactician",
    rarity: "veteran",
    named: true,
    passive: "+10% Salvage and Alloy from Trade exchanges.",
    active: "Undercut — reduce all enemies' block for two turns.",
    abilityId: "undercut",
    activeCooldown: 4,
    unlockFlag: "act2.tradeWinds.cleared",
  },
  {
    id: "kessaVray",
    name: 'Kessa "Tiger Shark" Vray',
    role: "tactician",
    rarity: "legend",
    named: true,
    passive: "+15% Salvage and Alloy from combat victories fleet-wide.",
    active: "Reaver's Cut — all enemies take bonus damage for one turn.",
    abilityId: "reaversCut",
    activeCooldown: 4,
    unlockFlag: "tigerSharkAlliance",
  },
  {
    id: "unit7Requiem",
    name: "Unit 7-Requiem",
    role: "engineer",
    rarity: "legend",
    named: true,
    passive: "+15% max hull fleet-wide.",
    active: "Construct Override — negate all incoming damage for one turn.",
    abilityId: "constructOverride",
    activeCooldown: 5,
    unlockFlag: "act4.ghostProtocol.cleared",
  },
  {
    id: "velaCantor",
    name: "Vela, Last Cantor of the Choir",
    role: "tactician",
    rarity: "legend",
    named: true,
    passive: "+12% Origin Essence from major boss fights, fleet-wide.",
    active: "Chorus Break — deals damage to every living enemy and resets the Choir's collective resonance.",
    abilityId: "chorusBreak",
    activeCooldown: 5,
    unlockFlag: "act6.dysonSphereSystem.cleared",
  },
  {
    id: "recruitHelm",
    name: "Recruit",
    role: "helm",
    rarity: "recruit",
    named: false,
    passive: "+5% evasion fleet-wide.",
    active: "Evasive Burn — shift one range band instantly.",
    abilityId: "evasiveBurn",
    activeCooldown: 2,
    unlockFlag: null,
  },
  {
    id: "recruitTactician",
    name: "Recruit",
    role: "tactician",
    rarity: "recruit",
    named: false,
    passive: "+5% Insight from combat victories.",
    active: "Target Lock — reduce enemy evasion for two turns.",
    abilityId: "targetLock",
    activeCooldown: 3,
    unlockFlag: null,
  },
];

export function crewDefById(id: string): CrewDef {
  const def = CREW_DEFS.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown crew def: ${id}`);
  return def;
}

/** 再招同一种增援要多少合金。
 *
 * 2026-08-31(/loop 第 66 轮)。原来是固定 20,而通用增援的被动**没有上限**,
 * 且不论上不上岗都生效:
 *
 *     recruitHelmEvasionBonus = crewCount("recruitHelm") * 0.05
 *
 * 算一下就知道它有多划算:effectiveEvasion 的硬上限 60% 在原始值 1.50 时达到,
 * 只靠舵手就是 1.50 / 0.05 = **30 名 = 600 合金**。而全战役合金收入是 5,886
 * (见第 48 轮的账)——**花一成预算买下游戏允许的最高闪避**,而且永久。
 * 战术官那条更歹毒:洞悉是全游戏最稀缺的资源(一周目 123 点),而它按比例叠。
 *
 * 搜到的说法是商店该"补运气不好的缺口",不该变成一台成长机器。所以价格随手里
 * 已有的同类人数递增:第一个仍然便宜(补缺口这件事保住了),堆叠自己会停下来。
 *
 *     第 1 个   20        第 6 个   210
 *     第 3 个   51        第 10 个  1,374
 *
 * 曲线 1.6 是照着"十来个就该让人肉疼"选的,不是拍的:十个舵手是 +0.5 原始闪避、
 * 过 effectiveEvasion 之后 0.35,那是一笔看得见的收益,而它要花掉约 3,500 合金
 * ——全战役预算的六成。 */
export const GENERIC_RECRUIT_BASE_COST = 20;
export const GENERIC_RECRUIT_CURVE = 1.6;

export function genericRecruitCost(alreadyHave: number): number {
  return Math.round(GENERIC_RECRUIT_BASE_COST * Math.pow(GENERIC_RECRUIT_CURVE, alreadyHave));
}
