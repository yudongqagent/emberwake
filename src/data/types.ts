export type ResourceType =
  | "salvage"
  | "sourcePoints"
  | "alloy"
  | "originEssence"
  | "insight";

export type FactionId =
  | "bauhinia"
  | "lionsheart"
  | "swanreach"
  | "reavers"
  | "swarm"
  | "constructs"
  | "hollow";

export type HullClassId =
  | "corvette"
  | "destroyer"
  | "interceptor"
  | "cruiser"
  | "vanguard"
  | "battleship"
  | "bulwark"
  | "dreadnought"
  | "corsair"
  | "sovereign"
  | "aegis";

export type ShipRarity =
  | "salvage"
  | "standard"
  | "reinforced"
  | "advanced"
  | "prototype"
  | "ascendant";

export type Aptitude = "S" | "A" | "B" | "C" | "D";

export type ModuleType = "weapon" | "armor" | "engine" | "utility";

export type ModuleRarity = "mk1" | "mk2" | "mk3" | "mk4" | "mk5";

export type CrewRole = "helm" | "gunner" | "engineer" | "tactician";

export interface HullClassDef {
  id: HullClassId;
  order: number;
  name: string;
  nameCn: string;
  slots: { weapon: number; armor: number; engine: number; utility: number };
  baseHull: number;
  basePower: number;
  baseSpeed: number;
  unlockFlag: string | null;
  essenceCost: number;
}

export interface ModuleTrait {
  id: string;
  label: string;
  description: string;
}

export interface ModuleDef {
  id: string;
  type: ModuleType;
  name: string;
  baseRarity: ModuleRarity;
  powerDraw: number;
  cooldown: number | null;
  baseDamage?: number;
  baseBlock?: number;
  traitPool: ModuleTrait[];
}

/** Roll quality is 0..1, drawn from a band that shifts upward with rarity but always
 * overlaps neighboring tiers — so a lucky low-rarity roll can beat an unlucky high-rarity
 * one, and no two items of the same rarity are identical. */
export interface ModuleInstance {
  id: string;
  defId: string;
  rarity: ModuleRarity;
  level: number;
  traits: string[];
  lockedTraitSlot: number | null;
  /** 0..1 roll governing this instance's primary stat within its rarity's range. */
  quality: number;
}

export interface ShipRolls {
  hull: number;
  power: number;
  speed: number;
  evasion: number;
  crit: number;
}

export interface ShipInstance {
  id: string;
  hullClass: HullClassId;
  rarity: ShipRarity;
  aptitude: Aptitude | null;
  scanned: boolean;
  name: string;
  level: number;
  xp: number;
  equipped: (string | null)[]; // parallel to slot order: weapon..weapon,armor..armor,engine..engine,utility..utility
  currentHp: number;
  /** Independent 0..1 rolls per attribute — two ships of the same rarity can trade off
   * a tanky hull against a nimble evasion build. */
  rolls: ShipRolls;
  /** Set only for a named-ship draw (see data/namedShips.ts) — grants a fixed name and
   * a unique combat ability nothing else has, not just bigger numbers. Each named ship
   * is a singleton: once owned, it won't roll again. Null for an ordinary hull. */
  namedShipId: string | null;
}

export interface CrewDef {
  id: string;
  name: string;
  role: CrewRole;
  rarity: "recruit" | "veteran" | "elite" | "ace" | "legend";
  named: boolean;
  passive: string;
  active: string;
  /** Identifies which distinct combat behavior this crew member's active triggers —
   * every named crew member has a unique implementation, not a generic per-role one. */
  abilityId: string;
  activeCooldown: number;
  unlockFlag: string | null;
}

export interface CrewInstance {
  id: string;
  defId: string;
  approval: number;
  assignedShipId: string | null;
}

export type PoiKind = "station" | "asteroidField" | "derelict" | "patrol" | "storyMarker" | "wreck";

export interface Poi {
  id: string;
  kind: PoiKind;
  name: string;
  x: number;
  y: number;
  radius: number;
  requiresFlag?: string;
  hiddenAfterFlag?: string;
  data?: Record<string, unknown>;
}

export interface SystemDef {
  id: string;
  galaxyId: string;
  name: string;
  x: number;
  y: number;
  controllingFaction: FactionId | null;
  pois: Poi[];
}

export interface JumpLane {
  from: string;
  to: string;
}

export interface GalaxyDef {
  id: string;
  name: string;
  unlockFlag: string | null;
  systems: SystemDef[];
  lanes: JumpLane[];
}

export interface EnemyShipDef {
  name: string;
  hull: number;
  damage: number;
  block: number;
  evasion: number;
  /** Hull regenerated at the start of each of this enemy's turns (Swarm doctrine). */
  regen?: number;
}

export interface EncounterDef {
  id: string;
  name: string;
  faction: FactionId;
  isBoss: boolean;
  enemies: EnemyShipDef[];
  rewards: Partial<Record<ResourceType, number>>;
  xp: number;
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface StoryChoiceOption {
  label: string;
  setFlags?: string[];
}

export interface StoryScene {
  id: string;
  chapter: string;
  chapterTitle: string;
  systemId: string;
  requiredFlag: string | null;
  hiddenAfterFlag: string;
  lines: DialogueLine[];
  choices?: StoryChoiceOption[];
  onCompleteFlags: string[];
  startEncounter?: string;
  unlockHullClass?: HullClassId;
}
