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
  | "swarm";

export type HullClassId =
  | "corvette"
  | "destroyer"
  | "cruiser"
  | "battleship"
  | "dreadnought"
  | "sovereign";

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

export interface ModuleInstance {
  id: string;
  defId: string;
  rarity: ModuleRarity;
  level: number;
  traits: string[];
  lockedTraitSlot: number | null;
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
}

export interface CrewDef {
  id: string;
  name: string;
  role: CrewRole;
  rarity: "recruit" | "veteran" | "elite" | "ace" | "legend";
  named: boolean;
  passive: string;
  active: string;
  activeCooldown: number;
  unlockFlag: string | null;
}

export interface CrewInstance {
  id: string;
  defId: string;
  approval: number;
  assignedShipId: string | null;
}

export type PoiKind = "station" | "asteroidField" | "derelict" | "patrol" | "storyMarker";

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
