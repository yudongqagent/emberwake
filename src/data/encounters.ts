import type { EncounterDef } from "./types";

export const ENCOUNTER_DEFS: EncounterDef[] = [
  {
    id: "kestrelsRestRaid",
    name: "Shark Reaver Raiding Party",
    faction: "reavers",
    isBoss: false,
    enemies: [
      { name: "Reaver Skiff", hull: 45, damage: 7, block: 2, evasion: 0.15 },
      { name: "Reaver Skiff", hull: 45, damage: 7, block: 2, evasion: 0.15 },
    ],
    rewards: { salvage: 60, sourcePoints: 20, alloy: 15 },
    xp: 30,
  },
  {
    id: "thornwakeDefenseGrid",
    name: "Residual Defense Grid",
    faction: "bauhinia",
    isBoss: false,
    enemies: [{ name: "Automated Turret", hull: 70, damage: 9, block: 6, evasion: 0 }],
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
      { name: "Reaver Skiff", hull: 45, damage: 7, block: 2, evasion: 0.15 },
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
      { name: "Reaver Skiff", hull: 50, damage: 8, block: 2, evasion: 0.15 },
      { name: "Reaver Skiff", hull: 50, damage: 8, block: 2, evasion: 0.15 },
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
];

export function encounterById(id: string): EncounterDef {
  const def = ENCOUNTER_DEFS.find((e) => e.id === id);
  if (!def) throw new Error(`Unknown encounter: ${id}`);
  return def;
}
