import type { HullClassId } from "./types";

export interface NamedShipDef {
  id: string;
  name: string;
  hullClass: HullClassId;
  /** Every named ship's ability is a unique combat behavior, not a stat bump — see
   * the dispatch switch in Combat.tsx's useShipActive. */
  abilityId: string;
  /** "Label — description", same convention as CrewDef.active. */
  active: string;
  activeCooldown: number;
  flavor: string;
}

/** Issues #3/#4 (docs/design-principles.md Player-Tested Anti-Patterns #1): a rare
 * ship has to read as different to play, not just hit harder. Each named ship is a
 * hull-class-locked singleton with its own signature ability — once owned, it won't
 * roll again (see engine/ships.ts's drawShip). */
export const NAMED_SHIP_DEFS: NamedShipDef[] = [
  {
    id: "nightfallVow",
    name: "Nightfall Vow",
    hullClass: "destroyer",
    abilityId: "alphaStrike",
    active: "Alpha Strike — Doubles the damage of the next weapon fired this turn, but that weapon's cooldown locks out for 2 extra turns.",
    activeCooldown: 4,
    flavor: "A Destroyer that never learned to pace itself. Every shot is the last shot.",
  },
  {
    id: "hollowPoint",
    name: "Hollow Point",
    hullClass: "cruiser",
    abilityId: "phaseShift",
    active: "Phase Shift — Whisper becomes untargetable for the enemy's next turn entirely.",
    activeCooldown: 5,
    flavor: "Cruiser-class, technically. It spends more time not-quite-there than actually present.",
  },
  {
    id: "ironVerdict",
    name: "Iron Verdict",
    hullClass: "battleship",
    abilityId: "fortify",
    active: "Fortify — Doubles armor block for the next 2 enemy turns.",
    activeCooldown: 4,
    flavor: "Built for sieges no one else thought were winnable. Most of them weren't, until this.",
  },
  {
    id: "starvingWolf",
    name: "Starving Wolf",
    hullClass: "dreadnought",
    abilityId: "bloodscent",
    active: "Bloodscent — For 2 rounds, a fraction of all damage dealt to the current target heals Whisper's hull.",
    activeCooldown: 5,
    flavor: "Dreadnought-class. The gunnery crews call it that for a reason no one explains to new recruits.",
  },
  {
    id: "lastLight",
    name: "Last Light",
    hullClass: "sovereign",
    abilityId: "overdrive",
    active: "Overdrive — Instantly resets every weapon's cooldown to zero.",
    activeCooldown: 8,
    flavor: "Sovereign-class. The last hull anyone expects to still be flying when it matters.",
  },
];

export function namedShipDefById(id: string): NamedShipDef {
  const def = NAMED_SHIP_DEFS.find((n) => n.id === id);
  if (!def) throw new Error(`Unknown named ship def: ${id}`);
  return def;
}
