import type { EncounterDef } from "./types";

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
    rewards: { salvage: 60, sourcePoints: 20, alloy: 15 },
    xp: 30,
  },
  {
    id: "thornwakeDefenseGrid",
    name: "Residual Defense Grid",
    faction: "bauhinia",
    isBoss: false,
    enemies: [{ name: "Automated Turret", hull: 70, damage: 15, block: 6, evasion: 0 }],
    rewards: { salvage: 40, sourcePoints: 15, insight: 5 },
    xp: 25,
  },
  {
    id: "coldreachAnchorage",
    name: "Tiger Shark's Lieutenant",
    faction: "reavers",
    isBoss: true,
    enemies: [
      { name: "Reaver Lieutenant's Cutter", hull: 260, damage: 18, block: 10, evasion: 0.2 },
      { name: "Reaver Skiff", hull: 45, damage: 14, block: 2, evasion: 0.15 },
    ],
    rewards: { salvage: 140, sourcePoints: 70, alloy: 60, originEssence: 45 },
    xp: 90,
  },
  {
    id: "emberRisingAssault",
    name: "Reaver Assault on Kestrel's Rest",
    faction: "reavers",
    isBoss: true,
    enemies: [
      { name: "Reaver Skiff", hull: 50, damage: 15, block: 2, evasion: 0.15 },
      { name: "Reaver Skiff", hull: 50, damage: 15, block: 2, evasion: 0.15 },
      { name: "Reaver Raider Cutter", hull: 180, damage: 15, block: 8, evasion: 0.18 },
    ],
    rewards: { salvage: 200, sourcePoints: 100, alloy: 90, originEssence: 90 },
    xp: 150,
  },
  {
    id: "ferrousGateDuel",
    name: "Duelist Kaan Ferrous",
    faction: "lionsheart",
    isBoss: false,
    enemies: [{ name: "Kaan's Dueling Skiff", hull: 90, damage: 11, block: 6, evasion: 0.25 }],
    rewards: { salvage: 50, sourcePoints: 30, insight: 5 },
    xp: 45,
  },
  {
    id: "hollowFleetYard",
    name: "Hawke, Reaver Lieutenant",
    faction: "reavers",
    isBoss: true,
    enemies: [
      { name: "Hawke's Warcutter", hull: 320, damage: 20, block: 12, evasion: 0.22 },
      { name: "Reaver Skiff", hull: 55, damage: 8, block: 3, evasion: 0.18 },
      { name: "Reaver Skiff", hull: 55, damage: 8, block: 3, evasion: 0.18 },
    ],
    rewards: { salvage: 220, sourcePoints: 120, alloy: 110, originEssence: 60 },
    xp: 170,
  },
  {
    id: "firstContactSwarm",
    name: "Chitin Swarm Scouts",
    faction: "swarm",
    isBoss: false,
    enemies: [
      { name: "Swarm Drone", hull: 40, damage: 6, block: 0, evasion: 0.1, regen: 4 },
      { name: "Swarm Drone", hull: 40, damage: 6, block: 0, evasion: 0.1, regen: 4 },
      { name: "Swarm Drone", hull: 40, damage: 6, block: 0, evasion: 0.1, regen: 4 },
    ],
    rewards: { salvage: 70, sourcePoints: 40, alloy: 20 },
    xp: 60,
  },
  {
    id: "reachOpensFinale",
    name: "Swarm Incursion at the Border",
    faction: "swarm",
    isBoss: true,
    enemies: [
      { name: "Swarm Drone", hull: 60, damage: 9, block: 0, evasion: 0.12, regen: 6 },
      { name: "Swarm Drone", hull: 60, damage: 9, block: 0, evasion: 0.12, regen: 6 },
      { name: "Swarm Drone", hull: 60, damage: 9, block: 0, evasion: 0.12, regen: 6 },
      { name: "Swarm Broodling", hull: 240, damage: 17, block: 8, evasion: 0.1, regen: 10 },
    ],
    rewards: { salvage: 260, sourcePoints: 150, alloy: 130, originEssence: 130 },
    xp: 210,
  },

  // --- Act III: Fractured Veil — Chitin Swarm at full doctrine (mass + regen).
  {
    id: "veilsEdgeSwarmIncursion",
    name: "Swarm Foothold at Veil's Edge",
    faction: "swarm",
    isBoss: false,
    enemies: [
      { name: "Swarm Warrior", hull: 90, damage: 13, block: 2, evasion: 0.12, regen: 9 },
      { name: "Swarm Warrior", hull: 90, damage: 13, block: 2, evasion: 0.12, regen: 9 },
      { name: "Swarm Warrior", hull: 90, damage: 13, block: 2, evasion: 0.12, regen: 9 },
      { name: "Swarm Warrior", hull: 90, damage: 13, block: 2, evasion: 0.12, regen: 9 },
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
      { name: "Swarm Broodling", hull: 260, damage: 18, block: 8, evasion: 0.1, regen: 12 },
      { name: "Swarm Warrior", hull: 95, damage: 13, block: 2, evasion: 0.12, regen: 9 },
      { name: "Swarm Warrior", hull: 95, damage: 13, block: 2, evasion: 0.12, regen: 9 },
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
      { name: "The Broodmother", hull: 620, damage: 26, block: 14, evasion: 0.08, regen: 20 },
      { name: "Swarm Warrior", hull: 100, damage: 14, block: 3, evasion: 0.12, regen: 10 },
      { name: "Swarm Warrior", hull: 100, damage: 14, block: 3, evasion: 0.12, regen: 10 },
      { name: "Swarm Warrior", hull: 100, damage: 14, block: 3, evasion: 0.12, regen: 10 },
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
      { name: "Rift-Warped Hulk", hull: 520, damage: 24, block: 16, evasion: 0.05 },
      { name: "Swarm Broodling", hull: 280, damage: 19, block: 9, evasion: 0.1, regen: 14 },
      { name: "Swarm Warrior", hull: 110, damage: 15, block: 3, evasion: 0.12, regen: 11 },
      { name: "Swarm Warrior", hull: 110, damage: 15, block: 3, evasion: 0.12, regen: 11 },
    ],
    rewards: { salvage: 420, sourcePoints: 260, alloy: 220, originEssence: 260 },
    xp: 360,
  },

  // --- Act IV: Deep Origin — Mayeth Construct doctrine (heavy block, precise, no evasion).
  {
    id: "firstFleetDefenseDrones",
    name: "Activated Defense Drones",
    faction: "constructs",
    isBoss: false,
    enemies: [
      { name: "Construct Sentry Drone", hull: 70, damage: 10, block: 8, evasion: 0 },
      { name: "Construct Sentry Drone", hull: 70, damage: 10, block: 8, evasion: 0 },
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
      { name: "Construct Warden", hull: 480, damage: 22, block: 20, evasion: 0 },
      { name: "Construct Sentry Drone", hull: 90, damage: 12, block: 10, evasion: 0 },
      { name: "Construct Sentry Drone", hull: 90, damage: 12, block: 10, evasion: 0 },
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
      { name: "Construct Warden", hull: 560, damage: 25, block: 22, evasion: 0 },
      { name: "Construct Warden", hull: 560, damage: 25, block: 22, evasion: 0 },
      { name: "Construct Sentry Drone", hull: 110, damage: 14, block: 12, evasion: 0 },
      { name: "Construct Sentry Drone", hull: 110, damage: 14, block: 12, evasion: 0 },
    ],
    rewards: { salvage: 460, sourcePoints: 280, alloy: 320, originEssence: 300 },
    xp: 380,
  },
  {
    id: "deepOriginArkDefense",
    name: "The Ark Custodian",
    faction: "constructs",
    isBoss: true,
    enemies: [
      { name: "Ark Custodian", hull: 900, damage: 30, block: 28, evasion: 0.05 },
      { name: "Construct Warden", hull: 480, damage: 23, block: 20, evasion: 0 },
      { name: "Construct Warden", hull: 480, damage: 23, block: 20, evasion: 0 },
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
      { name: "Hollow Wisp", hull: 140, damage: 16, block: 6, evasion: 0.15 },
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
      { name: "Hollow Vanguard", hull: 700, damage: 28, block: 18, evasion: 0.1 },
      { name: "Hollow Wisp", hull: 160, damage: 17, block: 7, evasion: 0.15 },
      { name: "Hollow Wisp", hull: 160, damage: 17, block: 7, evasion: 0.15 },
      { name: "Hollow Wisp", hull: 160, damage: 17, block: 7, evasion: 0.15 },
    ],
    rewards: { salvage: 500, sourcePoints: 300, alloy: 300, originEssence: 300 },
    xp: 420,
  },
  {
    id: "secondIgnitionFinale",
    name: "The Hollow, in Full",
    faction: "hollow",
    isBoss: true,
    enemies: [
      { name: "The Hollow", hull: 1400, damage: 36, block: 30, evasion: 0.08 },
      { name: "Hollow Vanguard", hull: 750, damage: 30, block: 20, evasion: 0.1 },
      { name: "Hollow Wisp", hull: 200, damage: 19, block: 9, evasion: 0.15 },
      { name: "Hollow Wisp", hull: 200, damage: 19, block: 9, evasion: 0.15 },
      { name: "Hollow Wisp", hull: 200, damage: 19, block: 9, evasion: 0.15 },
    ],
    rewards: { salvage: 800, sourcePoints: 500, alloy: 500, originEssence: 500 },
    xp: 700,
  },
];

// --- Bounties: repeatable, always-farmable encounters that respawn after a cooldown.
// Rewards are deliberately capped to Salvage/Source Points/Alloy/Insight — Origin
// Essence stays story-only so grinding can never replace the campaign (see
// docs/systems-design.md's pacing model).
export const BOUNTY_ENCOUNTER_DEFS: EncounterDef[] = [
  {
    id: "bountyReaverScavengers",
    name: "Reaver Scavenger Skiff",
    faction: "reavers",
    isBoss: false,
    enemies: [{ name: "Scavenger Skiff", hull: 35, damage: 6, block: 1, evasion: 0.12 }],
    rewards: { salvage: 25, sourcePoints: 8 },
    xp: 12,
  },
  {
    id: "bountyArthaineSmugglers",
    name: "Arthaine Smuggler Cutter",
    faction: "bauhinia",
    isBoss: false,
    enemies: [{ name: "Smuggler Cutter", hull: 55, damage: 8, block: 4, evasion: 0.15 }],
    rewards: { salvage: 35, alloy: 10 },
    xp: 18,
  },
  {
    id: "bountyReaverRemnants",
    name: "Reaver Remnant Patrol",
    faction: "reavers",
    isBoss: false,
    enemies: [
      { name: "Remnant Skiff", hull: 40, damage: 7, block: 2, evasion: 0.15 },
      { name: "Remnant Skiff", hull: 40, damage: 7, block: 2, evasion: 0.15 },
    ],
    rewards: { salvage: 40, sourcePoints: 15, alloy: 10 },
    xp: 20,
  },
  {
    id: "bountyConcordSparringPartner",
    name: "Concord Sparring Partner",
    faction: "lionsheart",
    isBoss: false,
    enemies: [{ name: "Sparring Skiff", hull: 70, damage: 9, block: 5, evasion: 0.2 }],
    rewards: { salvage: 45, sourcePoints: 20 },
    xp: 25,
  },
  {
    id: "bountyShipyardSalvagers",
    name: "Reaver Shipyard Salvagers",
    faction: "reavers",
    isBoss: false,
    enemies: [
      { name: "Salvager Skiff", hull: 45, damage: 8, block: 3, evasion: 0.16 },
      { name: "Salvager Skiff", hull: 45, damage: 8, block: 3, evasion: 0.16 },
    ],
    rewards: { salvage: 50, alloy: 25 },
    xp: 28,
  },
  {
    id: "bountyCombineSmuggler",
    name: "Combine Smuggler Interceptor",
    faction: "swanreach",
    isBoss: false,
    enemies: [{ name: "Smuggler Interceptor", hull: 50, damage: 7, block: 3, evasion: 0.18 }],
    rewards: { salvage: 40, alloy: 15 },
    xp: 20,
  },
  {
    id: "bountySwarmStragglers",
    name: "Swarm Straggler",
    faction: "swarm",
    isBoss: false,
    enemies: [{ name: "Swarm Straggler", hull: 60, damage: 9, block: 1, evasion: 0.1, regen: 5 }],
    rewards: { salvage: 55, sourcePoints: 25 },
    xp: 22,
  },
  {
    id: "bountyRiftScavengers",
    name: "Rift Scavenger Drones",
    faction: "swarm",
    isBoss: false,
    enemies: [
      { name: "Rift Scavenger Drone", hull: 50, damage: 8, block: 0, evasion: 0.15, regen: 4 },
      { name: "Rift Scavenger Drone", hull: 50, damage: 8, block: 0, evasion: 0.15, regen: 4 },
    ],
    rewards: { salvage: 60, sourcePoints: 20, alloy: 15 },
    xp: 24,
  },
  {
    id: "bountyConstructOutriders",
    name: "Construct Outrider Patrol",
    faction: "constructs",
    isBoss: false,
    enemies: [{ name: "Construct Outrider", hull: 100, damage: 12, block: 10, evasion: 0 }],
    rewards: { salvage: 70, sourcePoints: 35, alloy: 20 },
    xp: 30,
  },
  {
    id: "bountyHollowEchoes",
    name: "Hollow Echo Patrol",
    faction: "hollow",
    isBoss: false,
    enemies: [{ name: "Hollow Echo", hull: 120, damage: 14, block: 5, evasion: 0.12 }],
    rewards: { salvage: 85, sourcePoints: 45, alloy: 25 },
    xp: 35,
  },
];

export function encounterById(id: string): EncounterDef {
  const bounty = BOUNTY_ENCOUNTER_DEFS.find((e) => e.id === id);
  if (bounty) return bounty;
  const def = ENCOUNTER_DEFS.find((e) => e.id === id);
  if (!def) throw new Error(`Unknown encounter: ${id}`);
  return def;
}
