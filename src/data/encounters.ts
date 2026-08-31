import { generateHunterEncounter, parseHunterId } from "./hunters";
import type { EncounterDef } from "./types";

// 第一幕的第二场戏刻意教一个机制(2026-08-30,见 docs/fun-audit-2026-08-30.md)。
//
// 实测:那次审计里,前四场(含两个 BOSS)**零输入全部获胜**。翻数据才发现根因是
// 它们一个敌人角色都没有——角色是靠余烬负荷发的(锚定 1、修复 3、炮击 4),而新
// 玩家整个第一幕负荷都是 0。所以第一幕字面意义上就是"看着炮自己打"。
//
// 现在第 2 场是一门会蓄力的固定炮台:单敌人,所以"抗冲"和"在蓄力期间打掉它"
// 两条出路都读得懂,是教抗冲最好的场合。
//
// 血量 70→100,配合按船体比例封顶的蓄力伤害(见 Combat.tsx 的
// SIEGE_MAX_HULL_FRACTION)。只调血量调不出稳定结果:实测 95 血跑两次,一次
// 承受 58%、一次 0%,差别全在开局武器的随机数上——教学关卡不该靠掷骰子决定
// 教不教。100 血让它多半活得过 5.5 秒的蓄力;比例封顶保证那一发疼但不致命;
// 而两次蓄力之间拉开到 8.4 秒,保证它来不及打出第二发。
//
// 别的场次刻意**没有**加角色。我本来给两个 BOSS 也加了,但:第一个 BOSS 在加
// 角色之前就已经是临界仗(承受 92/129=71%),加修复舰之后先打谁都赢不了,六次
// 全败;第二个 BOSS 我只能用 1 级船测(探针改不动应用自己的存档),而玩家到那一场
// 时大约 6 级——测不出正确强度下的结果,就不发布。
export const ENCOUNTER_DEFS: EncounterDef[] = [
  {
    id: "kestrelsRestRaid",
    name: "Shark Reaver Raiding Party",
    faction: "reavers",
    isBoss: false,
    enemies: [
      { name: "Reaver Skiff", hull: 45, damage: 14, block: 2, evasion: 0.15 },
      { name: "Reaver Skiff", hull: 45, damage: 14, block: 2, evasion: 0.15 },
    ],
    rewards: { salvage: 60, sourcePoints: 20, alloy: 11 },
    xp: 30,
  },
  {
    id: "thornwakeDefenseGrid",
    name: "Residual Defense Grid",
    faction: "bauhinia",
    isBoss: false,
    enemies: [{ name: "Automated Turret", hull: 100, damage: 15, block: 6, evasion: 0, role: "artillery" }],
    rewards: { salvage: 40, sourcePoints: 15, insight: 5 },
    xp: 25,
  },
  {
    id: "coldreachAnchorage",
    name: "Tiger Shark's Lieutenant",
    faction: "reavers",
    isBoss: true,
    capturable: true,
    enemies: [
      { name: "Reaver Lieutenant's Cutter", hull: 260, damage: 18, block: 10, evasion: 0.2 },
      { name: "Reaver Skiff", hull: 45, damage: 14, block: 2, evasion: 0.15 },
    ],
    rewards: { salvage: 140, sourcePoints: 70, alloy: 43, originEssence: 45 },
    xp: 90,
  },
  {
    id: "emberRisingAssault",
    name: "Reaver Assault on Kestrel's Rest",
    faction: "reavers",
    isBoss: true,
    // 掠夺者是有船员的海盗,他们的旗舰能被接舷夺下——第 37 轮实测:
    // 整套接舷/俘获/赠送/团战的机器造好了,而全战役**只有一艘船可以俘获**。
    capturable: true,
    enemies: [
      { name: "Reaver Skiff", hull: 50, damage: 15, block: 2, evasion: 0.15 },
      { name: "Reaver Skiff", hull: 50, damage: 15, block: 2, evasion: 0.15 },
      { name: "Reaver Raider Cutter", hull: 180, damage: 15, block: 8, evasion: 0.18 },
    ],
    rewards: { salvage: 200, sourcePoints: 100, alloy: 64, originEssence: 90 },
    xp: 150,
  },
  {
    id: "ferrousGateDuel",
    name: "Duelist Kaan Ferrous",
    faction: "lionsheart",
    isBoss: false,
    enemies: [{ name: "Kaan's Dueling Skiff", hull: 93, damage: 30, block: 6, evasion: 0.25 }],
    rewards: { salvage: 50, sourcePoints: 30, insight: 5 },
    xp: 45,
  },
  {
    id: "hollowFleetYard",
    name: "Hawke, Reaver Lieutenant",
    faction: "reavers",
    isBoss: true,
    // 掠夺者是有船员的海盗,他们的旗舰能被接舷夺下——第 37 轮实测:
    // 整套接舷/俘获/赠送/团战的机器造好了,而全战役**只有一艘船可以俘获**。
    capturable: true,
    enemies: [
      { name: "Hawke's Warcutter", hull: 332, damage: 55, block: 12, evasion: 0.22 },
      { name: "Reaver Skiff", hull: 57, damage: 22, block: 3, evasion: 0.18 },
      { name: "Reaver Skiff", hull: 57, damage: 22, block: 3, evasion: 0.18 },
    ],
    rewards: { salvage: 220, sourcePoints: 120, alloy: 106, originEssence: 60 },
    xp: 170,
  },
  {
    id: "firstContactSwarm",
    name: "Chitin Swarm Scouts",
    faction: "swarm",
    isBoss: false,
    enemies: [
      { name: "Swarm Drone", hull: 89, damage: 34, block: 0, evasion: 0.1, regen: 4, role: "mender" },
      { name: "Swarm Drone", hull: 142, damage: 51, block: 0, evasion: 0.1, regen: 4 },
      { name: "Swarm Drone", hull: 142, damage: 51, block: 0, evasion: 0.1, regen: 4 },
    ],
    rewards: { salvage: 70, sourcePoints: 40, alloy: 65 },
    xp: 60,
  },
  {
    id: "reachOpensFinale",
    name: "Swarm Incursion at the Border",
    faction: "swarm",
    isBoss: true,
    // A border defense the Principality's own houses have a stake in — exactly
    // the kind of engagement allied ships turn out for (section D, 团战).
    fleetBattle: true,
    enemies: [
      { name: "Swarm Drone", hull: 62, damage: 25, block: 0, evasion: 0.12, regen: 6 },
      { name: "Swarm Drone", hull: 62, damage: 25, block: 0, evasion: 0.12, regen: 6 },
      { name: "Swarm Drone", hull: 62, damage: 25, block: 0, evasion: 0.12, regen: 6 },
      { name: "Swarm Broodling", hull: 249, damage: 47, block: 8, evasion: 0.1, regen: 10, role: "mender" },
    ],
    rewards: { salvage: 260, sourcePoints: 150, alloy: 126, originEssence: 130 },
    xp: 210,
  },

  // --- Act III: Fractured Veil — Chitin Swarm at full doctrine (mass + regen).
  {
    id: "veilsEdgeSwarmIncursion",
    name: "Swarm Foothold at Veil's Edge",
    faction: "swarm",
    isBoss: false,
    enemies: [
      { name: "Swarm Warrior", hull: 137, damage: 97, block: 2, evasion: 0.12, regen: 9, role: "mender" },
      { name: "Swarm Warrior", hull: 219, damage: 127, block: 2, evasion: 0.12, regen: 9 },
      { name: "Swarm Warrior", hull: 219, damage: 127, block: 2, evasion: 0.12, regen: 9 },
      { name: "Swarm Warrior", hull: 219, damage: 127, block: 2, evasion: 0.12, regen: 9 },
    ],
    rewards: { salvage: 220, sourcePoints: 110, alloy: 90, originEssence: 60 },
    xp: 160,
  },
  {
    id: "tigerSharkBroodSkirmish",
    name: "Brood Attack on Tiger Shark's Anchorage",
    faction: "swarm",
    isBoss: true,
    enemies: [
      { name: "Swarm Broodling", hull: 634, damage: 175, block: 8, evasion: 0.1, regen: 12, role: "mender" },
      { name: "Swarm Warrior", hull: 232, damage: 127, block: 2, evasion: 0.12, regen: 9 },
      { name: "Swarm Warrior", hull: 232, damage: 127, block: 2, evasion: 0.12, regen: 9 },
    ],
    rewards: { salvage: 260, sourcePoints: 140, alloy: 120, originEssence: 90 },
    xp: 200,
  },
  {
    id: "queenspireBroodmother",
    name: "The Broodmother of Queenspire",
    faction: "swarm",
    isBoss: true,
    enemies: [
      { name: "The Broodmother", hull: 936, damage: 195, block: 14, evasion: 0.08, regen: 20, role: "mender" },
      { name: "Swarm Warrior", hull: 244, damage: 136, block: 3, evasion: 0.12, regen: 10 },
      { name: "Swarm Warrior", hull: 244, damage: 136, block: 3, evasion: 0.12, regen: 10 },
      { name: "Swarm Warrior", hull: 244, damage: 136, block: 3, evasion: 0.12, regen: 10 },
    ],
    rewards: { salvage: 380, sourcePoints: 220, alloy: 200, originEssence: 220 },
    xp: 320,
  },
  {
    id: "originTideRiftStorm",
    name: "The Origin Tide",
    faction: "swarm",
    isBoss: true,
    enemies: [
      { name: "Rift-Warped Hulk", hull: 1268, damage: 234, block: 16, evasion: 0.05, role: "artillery" },
      { name: "Swarm Broodling", hull: 683, damage: 185, block: 9, evasion: 0.1, regen: 14, role: "mender" },
      { name: "Swarm Warrior", hull: 268, damage: 146, block: 3, evasion: 0.12, regen: 11 },
      { name: "Swarm Warrior", hull: 268, damage: 146, block: 3, evasion: 0.12, regen: 11 },
    ],
    rewards: { salvage: 420, sourcePoints: 260, alloy: 220, originEssence: 260 },
    xp: 360,
  },

  // --- Issue #10 (2026-08-23 playtest): the extradimensional battlefield (异空间战场).
  // Per docs/story/research-notes-extradimensional.md, the novel's confirmed core loop
  // is a special warship periodically entering alternate space to harvest a resource
  // and grow stronger from it — Emberwake's Origin Rift Pocket POI already adapts that
  // premise, but until now it was just a passive resource pickup (kind: "wreck"), not
  // its own distinct combat zone. These three depth tiers ARE that zone — reachable via
  // the same Origin Rift Pocket POI (now kind: "riftPocket", see SystemView.tsx), with
  // reward scaling standing in for the novel's confirmed "3x/5x/even 100x" source-point
  // self-select ability (not a literal 100x — that would break the resource economy).
  // Faction "riftEchoes" is original invention layered on the confirmed mechanic (per
  // the research notes) — foreshadowing fragments of Act V's Hollow, thematically
  // continuous with the "Hollow Echo" bounty naming already in this file, but
  // mechanically distinct: see Phase Flicker and Rift Anchor in Combat.tsx, neither of
  // which any other faction doctrine has. Deliberately kept outside
  // BOUNTY_ENCOUNTER_DEFS below despite being repeatable — that array's "Origin Essence
  // stays story-only" rule doesn't apply here, extending the same precedent the
  // existing (pre-rewrite) Rift Pocket wreck already set by granting essence on a
  // throttled respawn rather than an unthrottled farm.
  {
    id: "riftDiveShallow",
    name: "Rift Dive — Shallow",
    faction: "riftEchoes",
    isBoss: false,
    enemies: [
      { name: "Rift Flicker", hull: 75, damage: 11, block: 2, evasion: 0.15 },
      { name: "Rift Flicker", hull: 75, damage: 11, block: 2, evasion: 0.15 },
    ],
    rewards: { salvage: 90, sourcePoints: 60, originEssence: 20 },
    xp: 45,
  },
  {
    id: "riftDiveDeep",
    name: "Rift Dive — Deep",
    faction: "riftEchoes",
    isBoss: false,
    enemies: [
      { name: "Rift Warden", hull: 210, damage: 17, block: 8, evasion: 0.12, role: "anchor" },
      { name: "Rift Flicker", hull: 95, damage: 13, block: 2, evasion: 0.18 },
      { name: "Rift Flicker", hull: 95, damage: 13, block: 2, evasion: 0.18 },
    ],
    rewards: { salvage: 190, sourcePoints: 140, originEssence: 55 },
    xp: 95,
  },
  {
    id: "riftDiveAbyssal",
    name: "Rift Dive — Abyssal",
    faction: "riftEchoes",
    isBoss: true,
    enemies: [
      { name: "Rift Sovereign", hull: 460, damage: 25, block: 14, evasion: 0.1 },
      { name: "Rift Warden", hull: 230, damage: 18, block: 8, evasion: 0.14, role: "anchor" },
      { name: "Rift Flicker", hull: 110, damage: 15, block: 3, evasion: 0.2 },
    ],
    rewards: { salvage: 380, sourcePoints: 300, originEssence: 130 },
    xp: 190,
  },

  // --- Act IV: Deep Origin — Mayeth Construct doctrine (heavy block, precise, no evasion).
  {
    id: "firstFleetDefenseDrones",
    name: "Activated Defense Drones",
    faction: "constructs",
    isBoss: false,
    enemies: [
      { name: "Construct Sentry Drone", hull: 98, damage: 59, block: 8, evasion: 0, role: "anchor" },
      { name: "Construct Sentry Drone", hull: 160, damage: 74, block: 8, evasion: 0 },
    ],
    rewards: { salvage: 200, sourcePoints: 130, alloy: 140, originEssence: 60 },
    xp: 150,
  },
  {
    id: "ghostProtocolConstructFleet",
    name: "Construct Anchor Zero Defense Fleet",
    faction: "constructs",
    isBoss: true,
    enemies: [
      { name: "Construct Warden", hull: 1095, damage: 162, block: 20, evasion: 0, role: "anchor" },
      { name: "Construct Sentry Drone", hull: 205, damage: 88, block: 10, evasion: 0 },
      { name: "Construct Sentry Drone", hull: 205, damage: 88, block: 10, evasion: 0 },
    ],
    rewards: { salvage: 340, sourcePoints: 200, alloy: 220, originEssence: 180 },
    xp: 280,
  },
  {
    id: "lastShipyardDefense",
    name: "The Ark's Final Security Response",
    faction: "constructs",
    isBoss: true,
    enemies: [
      { name: "Construct Warden", hull: 1278, damage: 184, block: 22, evasion: 0, role: "anchor" },
      { name: "Construct Warden", hull: 1278, damage: 184, block: 22, evasion: 0 },
      { name: "Construct Sentry Drone", hull: 251, damage: 103, block: 12, evasion: 0 },
      { name: "Construct Sentry Drone", hull: 251, damage: 103, block: 12, evasion: 0 },
    ],
    rewards: { salvage: 460, sourcePoints: 280, alloy: 320, originEssence: 300 },
    xp: 380,
  },
  {
    id: "deepOriginArkDefense",
    name: "The Ark Custodian",
    faction: "constructs",
    isBoss: true,
    // 终局才值得把你一路攒下的盟舰叫齐。原来只有第二幕和第六幕两场,
    // 于是"赠送一艘船"这件事在中间四幕里毫无回响。
    fleetBattle: true,
    enemies: [
      { name: "Ark Custodian", hull: 2054, damage: 221, block: 28, evasion: 0.05 },
      { name: "Construct Warden", hull: 1095, damage: 170, block: 20, evasion: 0, role: "anchor" },
      { name: "Construct Warden", hull: 1095, damage: 170, block: 20, evasion: 0 },
    ],
    rewards: { salvage: 560, sourcePoints: 340, alloy: 400, originEssence: 420 },
    xp: 460,
  },

  // --- Act V: Umbral Line — the Hollow (drains what it touches; no mercy, no doctrine to learn).
  {
    id: "umbralLineFirstContact",
    name: "First Contact with the Hollow",
    faction: "hollow",
    isBoss: false,
    enemies: [
      { name: "Hollow Wisp", hull: 87, damage: 12, block: 6, evasion: 0.15, role: "anchor" },
      { name: "Hollow Wisp", hull: 140, damage: 16, block: 6, evasion: 0.15 },
    ],
    rewards: { salvage: 250, sourcePoints: 150, alloy: 150, originEssence: 80 },
    xp: 200,
  },
  {
    id: "echoesLosingBattle",
    name: "Echoes of the Losing Battle",
    faction: "hollow",
    isBoss: true,
    enemies: [
      { name: "Hollow Vanguard", hull: 2151, damage: 354, block: 18, evasion: 0.1, role: "anchor" },
      { name: "Hollow Wisp", hull: 793, damage: 287, block: 7, evasion: 0.15 },
      { name: "Hollow Wisp", hull: 793, damage: 287, block: 7, evasion: 0.15 },
      { name: "Hollow Wisp", hull: 793, damage: 287, block: 7, evasion: 0.15 },
    ],
    rewards: { salvage: 500, sourcePoints: 300, alloy: 300, originEssence: 300 },
    xp: 420,
  },
  {
    id: "secondIgnitionFinale",
    name: "The Hollow, in Full",
    faction: "hollow",
    isBoss: true,
    // 终局才值得把你一路攒下的盟舰叫齐。原来只有第二幕和第六幕两场,
    // 于是"赠送一艘船"这件事在中间四幕里毫无回响。
    fleetBattle: true,
    enemies: [
      { name: "The Hollow", hull: 4303, damage: 456, block: 30, evasion: 0.08, role: "anchor" },
      { name: "Hollow Vanguard", hull: 3718, damage: 506, block: 20, evasion: 0.1 },
      { name: "Hollow Wisp", hull: 991, damage: 321, block: 9, evasion: 0.15 },
      { name: "Hollow Wisp", hull: 991, damage: 321, block: 9, evasion: 0.15 },
      { name: "Hollow Wisp", hull: 991, damage: 321, block: 9, evasion: 0.15 },
    ],
    rewards: { salvage: 800, sourcePoints: 500, alloy: 509, originEssence: 500 },
    xp: 700,
  },

  // --- Act VI: Chorus Deep — the Choir (harmonic doctrine: see Choral Resonance in
  // Combat.tsx). Per docs/story/research-notes-act6.md, grounded in the confirmed
  // ch.380-382 arc ("Dyson Sphere System!" / "Gospel Civilization!" / "Civilization
  // Disqualified!") — the specific enemy roster and doctrine are original invention
  // layered on that confirmed premise, not sourced.
  {
    id: "dysonSphereFirstContact",
    name: "Choir Sentinels at the Threshold",
    faction: "choir",
    isBoss: false,
    enemies: [
      { name: "Choir Acolyte", hull: 1150, damage: 554, block: 9, evasion: 0.16, role: "mender" },
      { name: "Choir Acolyte", hull: 1150, damage: 554, block: 9, evasion: 0.16 },
      { name: "Choir Acolyte", hull: 1150, damage: 554, block: 9, evasion: 0.16 },
    ],
    rewards: { salvage: 380, sourcePoints: 220, alloy: 127, originEssence: 160 },
    xp: 260,
  },
  {
    id: "choirDefenseGrid",
    name: "The Herald's Defense Choir",
    faction: "choir",
    isBoss: true,
    enemies: [
      { name: "Choir Herald", hull: 5752, damage: 792, block: 18, evasion: 0.12 },
      { name: "Choir Cantor", hull: 1938, damage: 581, block: 12, evasion: 0.14, role: "artillery" },
      { name: "Choir Cantor", hull: 1938, damage: 581, block: 12, evasion: 0.14, role: "artillery" },
    ],
    rewards: { salvage: 680, sourcePoints: 420, alloy: 267, originEssence: 380 },
    xp: 520,
  },
  {
    id: "civilizationDisqualifiedFinale",
    name: "The Conductor's Last Movement (Act VI Finale)",
    faction: "choir",
    isBoss: true,
    // The campaign's final stand — everything the player has built, including the
    // ships they captured and gave away, turns up for it (section D, 团战).
    fleetBattle: true,
    enemies: [
      { name: "The Conductor", hull: 11504, damage: 1003, block: 26, evasion: 0.1 },
      { name: "Choir Herald", hull: 6055, damage: 845, block: 20, evasion: 0.12 },
      { name: "Choir Cantor", hull: 2059, damage: 634, block: 13, evasion: 0.15, role: "artillery" },
      { name: "Choir Cantor", hull: 2059, damage: 634, block: 13, evasion: 0.15, role: "artillery" },
    ],
    rewards: { salvage: 1050, sourcePoints: 680, alloy: 433, originEssence: 700 },
    xp: 950,
  },
];

// --- Bounties: repeatable, always-farmable encounters that respawn after a cooldown.
//
// 声望(2026-08-30):每条赏金都显式写出 `reputation`,因为默认的"打谁谁记仇"规则
// 在这里是反的——赏金的 faction 是**目标**的派系。委托方是谁,只能一条条写。
// 这也让赏金板成了修复关系的唯一途径:得罪了一方,就去接他们委托的活。
// Rewards are deliberately capped to Salvage/Source Points/Alloy/Insight — Origin
// Essence stays story-only so grinding can never replace the campaign (see
// docs/systems-design.md's pacing model).
export const BOUNTY_ENCOUNTER_DEFS: EncounterDef[] = [
  {
    id: "bountyReaverScavengers",
    name: "Reaver Scavenger Skiff",
    faction: "reavers",
    isBoss: false,
    enemies: [{ name: "Scavenger Skiff", hull: 30, damage: 5, block: 2, evasion: 0.12 }],
    rewards: { salvage: 38, sourcePoints: 19 },
    xp: 21,
    reputation: { reavers: -6, bauhinia: 5 },
  },
  {
    id: "bountyArthaineSmugglers",
    name: "Arthaine Smuggler Cutter",
    faction: "bauhinia",
    isBoss: false,
    enemies: [{ name: "Smuggler Cutter", hull: 30, damage: 5, block: 2, evasion: 0.15 }],
    rewards: { salvage: 38, alloy: 11 },
    xp: 21,
    reputation: { bauhinia: -6, lionsheart: 5 },
  },
  {
    id: "bountyReaverRemnants",
    name: "Reaver Remnant Patrol",
    faction: "reavers",
    isBoss: false,
    enemies: [
      { name: "Remnant Skiff", hull: 27, damage: 6, block: 1, evasion: 0.15, role: "artillery" },
      { name: "Remnant Skiff", hull: 21, damage: 4, block: 1, evasion: 0.15 },
    ],
    rewards: { salvage: 38, sourcePoints: 19, alloy: 11 },
    xp: 21,
    reputation: { reavers: -6, lionsheart: 5 },
  },
  {
    id: "bountyConcordSparringPartner",
    name: "Concord Sparring Partner",
    faction: "lionsheart",
    isBoss: false,
    enemies: [{ name: "Sparring Skiff", hull: 57, damage: 25, block: 4, evasion: 0.2 }],
    rewards: { salvage: 71, sourcePoints: 34 },
    xp: 39,
    reputation: { lionsheart: 8 },
  },
  {
    id: "bountyShipyardSalvagers",
    name: "Reaver Shipyard Salvagers",
    faction: "reavers",
    isBoss: false,
    enemies: [
      { name: "Salvager Skiff", hull: 53, damage: 23, block: 3, evasion: 0.16, role: "artillery" },
      { name: "Salvager Skiff", hull: 41, damage: 17, block: 3, evasion: 0.16 },
    ],
    rewards: { salvage: 71, alloy: 27 },
    xp: 39,
    reputation: { reavers: -6, swanreach: 5 },
  },
  {
    // 掠夺者唯一会付钱的活。没有这条,得罪了掠夺者就再也回不去了——
    // reputation.test.ts 里"每个可交涉派系都有修复关系的路子"那条会失败。
    // 代价也是真的:接了它,商会就恨你。这正是声望该有的样子。
    id: "bountyMarkedCombineConvoy",
    name: "Reaver-Marked Combine Convoy",
    faction: "swanreach",
    isBoss: false,
    enemies: [
      { name: "Convoy Escort", hull: 25, damage: 11, block: 3, evasion: 0.1, role: "mender" },
      { name: "Convoy Hauler", hull: 41, damage: 17, block: 3, evasion: 0.05 },
    ],
    rewards: { salvage: 71, sourcePoints: 34, alloy: 28 },
    xp: 39,
    reputation: { swanreach: -10, reavers: 9 },
  },
  {
    id: "bountyCombineSmuggler",
    name: "Combine Smuggler Interceptor",
    faction: "swanreach",
    isBoss: false,
    enemies: [{ name: "Smuggler Interceptor", hull: 361, damage: 135, block: 7, evasion: 0.18 }],
    rewards: { salvage: 132, alloy: 167 },
    xp: 72,
    reputation: { swanreach: -6, bauhinia: 5 },
  },
  {
    id: "bountySwarmStragglers",
    name: "Swarm Straggler",
    faction: "swarm",
    isBoss: false,
    enemies: [{ name: "Swarm Straggler", hull: 458, damage: 282, block: 13, evasion: 0.1, regen: 16 }],
    rewards: { salvage: 243, sourcePoints: 118 },
    xp: 133,
    reputation: { bauhinia: 3, lionsheart: 3, swanreach: 3 },
  },
  {
    id: "bountyRiftScavengers",
    name: "Rift Scavenger Drones",
    faction: "swarm",
    isBoss: false,
    enemies: [
      { name: "Rift Scavenger Drone", hull: 200, damage: 156, block: 9, evasion: 0.15, regen: 11, role: "mender" },
      { name: "Rift Scavenger Drone", hull: 324, damage: 205, block: 9, evasion: 0.15, regen: 11 },
    ],
    rewards: { salvage: 243, sourcePoints: 118, alloy: 376 },
    xp: 133,
    reputation: { bauhinia: 3, lionsheart: 3, swanreach: 3 },
  },
  {
    id: "bountyConstructOutriders",
    name: "Construct Outrider Patrol",
    faction: "constructs",
    isBoss: false,
    enemies: [{ name: "Construct Outrider", hull: 796, damage: 398, block: 23, evasion: 0 }],
    rewards: { salvage: 450, sourcePoints: 218, alloy: 320 },
    xp: 247,
    reputation: { lionsheart: 4, swanreach: 4 },
  },
  {
    id: "bountyHollowEchoes",
    name: "Hollow Echo Patrol",
    faction: "hollow",
    isBoss: false,
    enemies: [{ name: "Hollow Echo", hull: 3197, damage: 962, block: 43, evasion: 0.12 }],
    rewards: { salvage: 833, sourcePoints: 403, alloy: 327 },
    xp: 457,
    reputation: { bauhinia: 4, lionsheart: 4 },
  },
  {
    id: "bountyChoirStragglers",
    name: "Choir Straggler Verse",
    faction: "choir",
    isBoss: false,
    enemies: [
      { name: "Choir Acolyte", hull: 3577, damage: 1616, block: 56, evasion: 0.15, role: "mender" },
      { name: "Choir Acolyte", hull: 5110, damage: 1901, block: 56, evasion: 0.15 },
    ],
    rewards: { salvage: 1541, sourcePoints: 746, alloy: 380 },
    xp: 845,
    reputation: { bauhinia: 4, lionsheart: 4, swanreach: 4 },
  },

  // 第 45 轮补的九条。原来可反复打的仗**随威胁度倒着塌**:紫荆疆域(威胁 1)有 4 场,
  // 而威胁 3、5、6 的星区**各只有一场**——而且都是"一个敌人、零角色"的纯血包。
  // 玩家要在深源刷级,唯一的选择就是同一个沙包反复捶。搜到的原话是重复的中段
  // 「就是干等着什么事发生」。
  //
  // 补的不是数量而是**问题**:每条都带一个角色,于是同一个星区里的三场仗问三个
  // 不同的问题——锚定(先打谁)、修复(打得动吗)、炮击(扛还是抢)。
  //
  // 数值锚在**各星区现有悬赏的真实数值**上:总输出按艘数均分(编队不比单打更疼,
  // 难度来自那个角色而不是数字),总血量按 1/sqrt(艘数) 分摊(编队更耐打,好让角色
  // 有时间起作用)。带角色的那艘伤害 ×1.35、护卫 ×0.85——"先打谁"在数值上就该
  // 看得出来。
  //
  // 刻意**没用** tools/genBounties.py:实测跑一遍它会把全部 21 条退回到一条弱得多
  // 的曲线(走私艇伤害 135 → 16)。线上数据早被 genEnemyScale 按中位重锚过,
  // genBounties 已经不是它的来源了——工具存在不等于工具还当家。
  {
    id: "bountyCombineLedgerEscort",
    name: "Combine Ledger Escort",
    faction: "swanreach",
    isBoss: false,
    enemies: [
      { name: "Ledger Warden", hull: 250, damage: 61, block: 2, evasion: 0.18, role: "anchor" },
      { name: "Combine Escort", hull: 188, damage: 38, block: 2, evasion: 0.18 },
      { name: "Combine Escort", hull: 188, damage: 38, block: 2, evasion: 0.18 },
    ],
    rewards: { salvage: 132, alloy: 167 },
    xp: 72,
    reputation: { swanreach: -6, bauhinia: 5 },
  },
  {
    id: "bountyVeilProbeFlight",
    name: "Veil Probe Flight",
    faction: "swarm",
    isBoss: false,
    enemies: [
      { name: "Veil Probe", hull: 250, damage: 61, block: 2, evasion: 0.18, regen: 9, role: "mender" },
      { name: "Veil Probe", hull: 188, damage: 38, block: 2, evasion: 0.18, regen: 7 },
      { name: "Veil Probe", hull: 188, damage: 38, block: 2, evasion: 0.18, regen: 7 },
    ],
    rewards: { salvage: 150, sourcePoints: 72 },
    xp: 80,
    reputation: { bauhinia: 3, lionsheart: 3, swanreach: 3 },
  },
  {
    id: "bountyVeilSiegeCluster",
    name: "Veil Siege Cluster",
    faction: "swarm",
    isBoss: false,
    enemies: [
      { name: "Veil Lance", hull: 389, damage: 190, block: 6, evasion: 0.1, role: "artillery" },
      { name: "Veil Drone", hull: 291, damage: 120, block: 6, evasion: 0.1, regen: 10 },
    ],
    rewards: { salvage: 243, sourcePoints: 118 },
    xp: 133,
    reputation: { bauhinia: 3, lionsheart: 3, swanreach: 3 },
  },
  {
    id: "bountyConstructAnchorGuard",
    name: "Construct Anchor Guard",
    faction: "constructs",
    isBoss: false,
    enemies: [
      { name: "Construct Bulwark", hull: 551, damage: 179, block: 8, evasion: 0.0, role: "anchor" },
      { name: "Construct Outrider", hull: 414, damage: 113, block: 8, evasion: 0.0 },
      { name: "Construct Outrider", hull: 414, damage: 113, block: 8, evasion: 0.0 },
    ],
    rewards: { salvage: 450, sourcePoints: 218, alloy: 320 },
    xp: 247,
    reputation: { lionsheart: 4, swanreach: 4 },
  },
  {
    id: "bountyConstructSiegeArray",
    name: "Construct Siege Array",
    faction: "constructs",
    isBoss: false,
    enemies: [
      { name: "Construct Siege Node", hull: 675, damage: 269, block: 12, evasion: 0.0, role: "artillery" },
      { name: "Construct Outrider", hull: 507, damage: 169, block: 12, evasion: 0.0 },
    ],
    rewards: { salvage: 450, sourcePoints: 218, alloy: 320 },
    xp: 247,
    reputation: { lionsheart: 4, swanreach: 4 },
  },
  {
    id: "bountyHollowRevenantChoir",
    name: "Hollow Revenant Choir",
    faction: "hollow",
    isBoss: false,
    enemies: [
      { name: "Hollow Revenant", hull: 2215, damage: 433, block: 14, evasion: 0.12, role: "mender" },
      { name: "Hollow Echo", hull: 1661, damage: 273, block: 14, evasion: 0.12 },
      { name: "Hollow Echo", hull: 1661, damage: 273, block: 14, evasion: 0.12 },
    ],
    rewards: { salvage: 833, sourcePoints: 403, alloy: 327 },
    xp: 457,
    reputation: { bauhinia: 4, lionsheart: 4 },
  },
  {
    id: "bountyHollowSiegeWake",
    name: "Hollow Siege Wake",
    faction: "hollow",
    isBoss: false,
    enemies: [
      { name: "Hollow Lance", hull: 2713, damage: 649, block: 22, evasion: 0.12, role: "artillery" },
      { name: "Hollow Echo", hull: 2035, damage: 409, block: 22, evasion: 0.12 },
    ],
    rewards: { salvage: 833, sourcePoints: 403, alloy: 327 },
    xp: 457,
    reputation: { bauhinia: 4, lionsheart: 4 },
  },
  {
    id: "bountyChoirAnchorVerse",
    name: "Choir Anchor Verse",
    faction: "choir",
    isBoss: false,
    enemies: [
      { name: "Choir Cantor", hull: 5006, damage: 1210, block: 26, evasion: 0.15, role: "anchor" },
      { name: "Choir Acolyte", hull: 3755, damage: 762, block: 26, evasion: 0.15 },
      { name: "Choir Acolyte", hull: 3755, damage: 762, block: 26, evasion: 0.15 },
    ],
    rewards: { salvage: 1541, sourcePoints: 746, alloy: 380 },
    xp: 845,
    reputation: { bauhinia: 4, lionsheart: 4, swanreach: 4 },
  },
  {
    id: "bountyChoirSiegeCantor",
    name: "Choir Siege Cantor",
    faction: "choir",
    isBoss: false,
    enemies: [
      { name: "Choir Psalmlance", hull: 6131, damage: 1814, block: 40, evasion: 0.15, role: "artillery" },
      { name: "Choir Acolyte", hull: 4599, damage: 1142, block: 40, evasion: 0.15 },
    ],
    rewards: { salvage: 1541, sourcePoints: 746, alloy: 380 },
    xp: 845,
    reputation: { bauhinia: 4, lionsheart: 4, swanreach: 4 },
  },
];

/** Encounters generated at runtime rather than authored — currently only the
 * Extradimensional Battlefield's waves (see data/rift.ts), whose whole point is
 * that the opposition is rolled fresh every dive instead of read off a table.
 * Kept deliberately small: one entry is registered per wave and replaced by the
 * next, so this never grows into a second, invisible content source. */
const runtimeEncounters = new Map<string, EncounterDef>();

export function registerRuntimeEncounter(def: EncounterDef): EncounterDef {
  runtimeEncounters.clear();
  runtimeEncounters.set(def.id, def);
  return def;
}

export function encounterById(id: string): EncounterDef {
  // 猎杀队是从 id 里算出来的(hunt:<派系>:<威胁度>),不进注册表——注册表只放得下
  // 一条,而猎杀队和裂隙波次可能同时存在。
  const hunter = parseHunterId(id);
  if (hunter) return generateHunterEncounter(hunter.faction, hunter.threat);
  const runtime = runtimeEncounters.get(id);
  if (runtime) return runtime;
  const bounty = BOUNTY_ENCOUNTER_DEFS.find((e) => e.id === id);
  if (bounty) return bounty;
  const def = ENCOUNTER_DEFS.find((e) => e.id === id);
  if (!def) throw new Error(`Unknown encounter: ${id}`);
  return def;
}
