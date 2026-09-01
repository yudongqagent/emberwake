import type { HullClassId } from "./types";

export interface HullClassAbilityDef {
  id: string;
  /** The callsign Whisper earns once ascended to this hull class — flavor, not a
   * separate ship identity (see docs/story/research-notes-ship-ascension.md: this
   * project used to model these as rare singleton "named ships" you could draw
   * instead of your own flagship; the ascension redesign folded that into the
   * flagship's own growth — every hull class change grants its own ability). */
  name: string;
  hullClass: HullClassId;
  /** Every hull class's ability is a unique combat behavior, not a stat bump — see
   * the dispatch switch in Combat.tsx's useShipActive. */
  abilityId: string;
  /** "Label — description", same convention as CrewDef.active. */
  active: string;
  activeCooldown: number;
  flavor: string;
}

/** Player-Tested Anti-Patterns #1 (docs/design-principles.md): a hull class has to
 * read as different to fly, not just hit harder — every hull class past the
 * starting Corvette grants a genuinely unique combat behavior the moment Whisper
 * ascends into it, not a bigger number. Corvette (the baseline) has none — nothing
 * to compare it against yet. */
export const HULL_CLASS_ABILITIES: HullClassAbilityDef[] = [
  {
    id: "nightfallVow",
    name: "Nightfall Vow",
    hullClass: "destroyer",
    abilityId: "alphaStrike",
    active: "Alpha Strike — the next shot this turn deals double damage; that weapon's cooldown is 2 turns longer.",
    activeCooldown: 4,
    flavor: "A Destroyer that never learned to pace itself. Every shot is the last shot.",
  },
  {
    id: "blinkVector",
    name: "Blink Vector",
    hullClass: "interceptor",
    abilityId: "blinkVector",
    active: "Blink Vector — shift one range band instantly and gain +25 points of evasion for 2 turns (about 4.8s).",
    activeCooldown: 5,
    flavor: "Interceptor-class. It isn't where you last saw it, and it won't be where you're aiming next.",
  },
  {
    id: "hollowPoint",
    name: "Hollow Point",
    hullClass: "cruiser",
    abilityId: "phaseShift",
    active: "Phase Shift — the enemy's next 1 attack misses outright.",
    activeCooldown: 5,
    flavor: "Cruiser-class, technically. It spends more time not-quite-there than actually present.",
  },
  {
    id: "ravagerSalvo",
    name: "Ravager Salvo",
    hullClass: "vanguard",
    abilityId: "ravagerSalvo",
    active: "Ravager Salvo — every equipped weapon fires once immediately, each shot at 50% damage.",
    activeCooldown: 6,
    flavor: "Vanguard-class. Built on the theory that the best defense is running out of targets first.",
  },
  {
    id: "ironVerdict",
    name: "Iron Verdict",
    hullClass: "battleship",
    abilityId: "fortify",
    active: "Iron Verdict — doubles armour block for 2 turns (about 4.8s).",
    activeCooldown: 4,
    flavor: "Built for sieges no one else thought were winnable. Most of them weren't, until this.",
  },
  {
    id: "bastionWard",
    name: "Bastion Ward",
    hullClass: "bulwark",
    abilityId: "bastionWard",
    active: "Bastion Ward — the next 2 hits that would land are negated outright.",
    activeCooldown: 7,
    flavor: "Bulwark-class. It doesn't out-armor a hit. It simply declines to have taken it.",
  },
  {
    id: "starvingWolf",
    name: "Starving Wolf",
    hullClass: "dreadnought",
    abilityId: "bloodscent",
    active: "Starving Wolf — for 2 turns (about 4.8s), 25% of the damage you deal to the marked target heals you.",
    activeCooldown: 5,
    flavor: "Dreadnought-class. The gunnery crews call it that for a reason no one explains to new recruits.",
  },
  {
    id: "firstBlood",
    name: "First Blood",
    hullClass: "corsair",
    abilityId: "firstBlood",
    active: "First Blood — before the enemy's next attack lands, strike first for 100% of your best weapon's damage.",
    activeCooldown: 5,
    flavor: "Corsair-class. It doesn't wait to see if the first punch lands before throwing its own.",
  },
  {
    id: "lastLight",
    name: "Last Light",
    hullClass: "sovereign",
    abilityId: "overdrive",
    active: "Overdrive — every weapon's cooldown drops to 0s at once.",
    activeCooldown: 8,
    flavor: "Sovereign-class. The last hull anyone expects to still be flying when it matters.",
  },
  {
    id: "aegisWard",
    name: "Aegis Ward",
    hullClass: "aegis",
    abilityId: "aegisWard",
    active: "Aegis Ward — incoming damage is halved for 3 turns (about 7.2s).",
    activeCooldown: 7,
    flavor: "Aegis-class. Sovereign's counterpart hull: less interested in hitting back, entirely uninterested in going down.",
  },
  {
    id: "chorusOverture",
    name: "Chorus Overture",
    hullClass: "anthem",
    abilityId: "chorusOverture",
    active: "Choir Overture — the next 3 shots cannot miss and deal x1.3 damage.",
    activeCooldown: 7,
    flavor: "Anthem-class. Reverse-engineered Choir tech — every shot fired in resonance with the last.",
  },
  {
    id: "sanctuaryField",
    name: "Sanctuary Field",
    hullClass: "sanctum",
    abilityId: "sanctuaryField",
    active: "Sanctuary Stand — block all incoming damage for 2.5 turns (about 6s) and restore 20% max hull at once.",
    activeCooldown: 9,
    flavor: "Sanctum-class. Anthem's counterpart hull: the Choir's other answer to being judged unworthy.",
  },
];

export function hullClassAbility(hullClass: HullClassId): HullClassAbilityDef | null {
  return HULL_CLASS_ABILITIES.find((a) => a.hullClass === hullClass) ?? null;
}
