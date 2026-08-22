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
];

export function encounterById(id: string): EncounterDef {
  const def = ENCOUNTER_DEFS.find((e) => e.id === id);
  if (!def) throw new Error(`Unknown encounter: ${id}`);
  return def;
}
