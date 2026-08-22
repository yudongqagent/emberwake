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
    activeCooldown: 4,
    unlockFlag: "act2.tradeWinds.cleared",
  },
  {
    id: "recruitHelm",
    name: "Recruit",
    role: "helm",
    rarity: "recruit",
    named: false,
    passive: "+5% evasion fleet-wide.",
    active: "Evasive Burn — shift one range band instantly.",
    activeCooldown: 2,
    unlockFlag: null,
  },
  {
    id: "recruitTactician",
    name: "Recruit",
    role: "tactician",
    rarity: "recruit",
    named: false,
    passive: "+5% Faction Favor from missions.",
    active: "Target Lock — reduce enemy evasion for two turns.",
    activeCooldown: 3,
    unlockFlag: null,
  },
];

export function crewDefById(id: string): CrewDef {
  const def = CREW_DEFS.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown crew def: ${id}`);
  return def;
}
