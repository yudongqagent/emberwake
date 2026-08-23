import type { ModuleDef, ModuleRarity } from "./types";

export const MODULE_RARITY_ORDER: ModuleRarity[] = ["mk1", "mk2", "mk3", "mk4", "mk5"];

/** ~1.32x per tier — wide enough, paired with the ±12% quality-roll band in
 * engine/modules.ts, that a worst-roll mk-N+1 module always beats a best-roll mk-N
 * one. See docs/design-principles.md's Player-Tested Anti-Patterns #6 and the
 * verification in ships.test.ts. */
export const MODULE_RARITY_MULTIPLIER: Record<ModuleRarity, number> = {
  mk1: 1.0,
  mk2: 1.32,
  mk3: 1.74,
  mk4: 2.3,
  mk5: 3.04,
};

/** Fabricator showcase price for a rolled module — scales with rarity so a visibly
 * better module costs visibly more, instead of every rarity costing the same flat
 * fee (which made rarity invisible at the point of purchase). */
export function fabricatorCost(rarity: ModuleRarity): number {
  return Math.round(25 * MODULE_RARITY_MULTIPLIER[rarity]);
}

export const MODULE_DEFS: ModuleDef[] = [
  {
    id: "pulseCannon",
    type: "weapon",
    name: "Pulse Cannon",
    baseRarity: "mk1",
    powerDraw: 2,
    cooldown: 0,
    baseDamage: 14,
    traitPool: [
      { id: "crit", label: "+Crit", description: "Higher chance to strike a critical hit." },
      { id: "pierce", label: "+Pierce", description: "Ignores a portion of enemy armor." },
    ],
  },
  {
    id: "arcLance",
    type: "weapon",
    name: "Arc Lance",
    baseRarity: "mk2",
    powerDraw: 3,
    cooldown: 1,
    baseDamage: 22,
    traitPool: [
      { id: "chainArc", label: "Chain Arc", description: "Damage arcs to a second target." },
      { id: "pierce", label: "+Pierce", description: "Ignores a portion of enemy armor." },
    ],
  },
  {
    id: "plateBarrier",
    type: "armor",
    name: "Plate Barrier",
    baseRarity: "mk1",
    powerDraw: 1,
    cooldown: null,
    baseBlock: 10,
    traitPool: [
      { id: "hullBonus", label: "+Hull", description: "Increases maximum hull integrity." },
      { id: "regen", label: "Regen", description: "Recovers a little hull each turn." },
    ],
  },
  {
    id: "reactiveMesh",
    type: "armor",
    name: "Reactive Mesh",
    baseRarity: "mk2",
    powerDraw: 2,
    cooldown: null,
    baseBlock: 18,
    traitPool: [
      { id: "regen", label: "Regen", description: "Recovers a little hull each turn." },
      { id: "shieldBreak", label: "Anti-Breach", description: "Resists module disable effects." },
    ],
  },
  {
    id: "thrusterArray",
    type: "engine",
    name: "Thruster Array",
    baseRarity: "mk1",
    powerDraw: 1,
    cooldown: null,
    traitPool: [
      { id: "evasion", label: "+Evasion", description: "Harder to hit." },
      { id: "jumpRange", label: "+Jump Range", description: "Faster range-band shifts." },
    ],
  },
  {
    id: "vectorDrive",
    type: "engine",
    name: "Vector Drive",
    baseRarity: "mk2",
    powerDraw: 2,
    cooldown: null,
    traitPool: [
      { id: "surge", label: "Surge", description: "Covering real distance since your last shot charges the next one for bonus damage — rewards actually repositioning, not just holding a lane." },
      { id: "jumpRange", label: "+Jump Range", description: "Faster range-band shifts." },
    ],
  },
  {
    id: "empBurst",
    type: "utility",
    name: "EMP Burst",
    baseRarity: "mk2",
    powerDraw: 2,
    cooldown: 3,
    baseDamage: 6,
    traitPool: [
      { id: "disable", label: "Disable", description: "Chance to disable an enemy module." },
      { id: "shieldBreak", label: "Shield Break", description: "Strips enemy block." },
    ],
  },
  {
    id: "salvageDrone",
    type: "utility",
    name: "Salvage Drone",
    baseRarity: "mk1",
    powerDraw: 1,
    cooldown: 2,
    traitPool: [
      { id: "yieldBonus", label: "+Yield", description: "Bonus Salvage/Alloy from this fight." },
      { id: "regen", label: "Field Repair", description: "Small hull repair to the fleet." },
    ],
  },
  {
    id: "railgun",
    type: "weapon",
    name: "Railgun",
    baseRarity: "mk3",
    powerDraw: 4,
    cooldown: 2,
    baseDamage: 34,
    traitPool: [
      { id: "execute", label: "Execute", description: "+50% damage against a target below 25% hull — a finisher, not a raw damage lead." },
      { id: "pierce", label: "+Pierce", description: "Ignores a portion of enemy armor." },
    ],
  },
  {
    id: "flakBattery",
    type: "weapon",
    name: "Flak Battery",
    baseRarity: "mk2",
    powerDraw: 3,
    cooldown: 1,
    baseDamage: 12,
    traitPool: [
      { id: "aoe", label: "Splash", description: "Also hits every other living enemy for reduced damage — trades single-target power for group control." },
      { id: "crit", label: "+Crit", description: "Higher chance to strike a critical hit." },
    ],
  },
  {
    id: "ablativePlating",
    type: "armor",
    name: "Ablative Plating",
    baseRarity: "mk3",
    powerDraw: 2,
    cooldown: null,
    baseBlock: 6,
    traitPool: [
      { id: "absorb", label: "Absorb", description: "Fully negates the first hit taken each fight — weaker steady-state block, traded for one guaranteed no-damage exchange." },
      { id: "hullBonus", label: "+Hull", description: "Increases maximum hull integrity." },
    ],
  },
  {
    id: "inertialDampers",
    type: "engine",
    name: "Inertial Dampers",
    baseRarity: "mk3",
    powerDraw: 2,
    cooldown: null,
    traitPool: [
      { id: "momentum", label: "Momentum", description: "Evasion climbs the longer you go without being hit this fight, and resets the moment you are." },
      { id: "evasion", label: "+Evasion", description: "Harder to hit." },
    ],
  },
  {
    id: "purgeField",
    type: "utility",
    name: "Purge Field",
    baseRarity: "mk3",
    powerDraw: 2,
    cooldown: 2,
    traitPool: [
      { id: "cleanse", label: "Cleanse", description: "Instantly clears corroded/stripped plating, restoring your armor to its equipped value." },
      { id: "yieldBonus", label: "+Yield", description: "Bonus Salvage/Alloy from this fight." },
    ],
  },
  {
    id: "ionDisruptor",
    type: "weapon",
    name: "Ion Disruptor",
    baseRarity: "mk2",
    powerDraw: 3,
    cooldown: 1,
    baseDamage: 11,
    traitPool: [
      { id: "overload", label: "Overload", description: "Every third shot from this weapon deals double damage — a charge-up rhythm, not a flat number." },
      { id: "crit", label: "+Crit", description: "Higher chance to strike a critical hit." },
    ],
  },
  {
    id: "kineticReflector",
    type: "armor",
    name: "Kinetic Reflector",
    baseRarity: "mk3",
    powerDraw: 2,
    cooldown: null,
    baseBlock: 8,
    traitPool: [
      { id: "reflect", label: "Reflect", description: "A fraction of the damage this armor blocks strikes the attacker back — the only module that punishes an enemy for hitting you." },
      { id: "hullBonus", label: "+Hull", description: "Increases maximum hull integrity." },
    ],
  },
  {
    id: "displacementCharge",
    type: "utility",
    name: "Displacement Charge",
    baseRarity: "mk2",
    powerDraw: 2,
    cooldown: 3,
    traitPool: [
      { id: "displace", label: "Displace", description: "Instantly shoves the current target out to long range — the only module that manipulates enemy position instead of your own." },
      { id: "yieldBonus", label: "+Yield", description: "Bonus Salvage/Alloy from this fight." },
    ],
  },
  {
    id: "twinLinkedCannon",
    type: "weapon",
    name: "Twin-Linked Cannon",
    baseRarity: "mk3",
    powerDraw: 4,
    cooldown: 1,
    baseDamage: 16,
    traitPool: [
      { id: "volley", label: "Volley", description: "Fires twice per activation, each an independent hit-or-miss roll against the same target — trades peak single-hit power for consistency." },
      { id: "pierce", label: "+Pierce", description: "Ignores a portion of enemy armor." },
    ],
  },
];

export function moduleDefById(id: string): ModuleDef {
  const def = MODULE_DEFS.find((m) => m.id === id);
  if (!def) throw new Error(`Unknown module def: ${id}`);
  return def;
}
