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
  | "hollow"
  | "riftEchoes"
  | "choir";

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
  | "aegis"
  | "anthem"
  | "sanctum";

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
  /** Ship-ascension redesign (2026-08-24, see docs/story/research-notes-ship-
   * ascension.md): the flagship level Whisper must have reached before she can
   * ascend into this hull class — alongside unlockFlag and essenceCost, all three
   * gate the same "Ascend" action. 0 for the starting hull (nothing to ascend from). */
  minLevel: number;
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
  /** Issue #4 (2026-08 playtest): every weapon fired the same blue beam — the juice
   * infrastructure existed but didn't vary with what actually fired. A weapon's
   * signature color for its projectile beam and impact burst; falls back to the
   * generic cyan if unset (non-weapon modules don't need one). */
  color?: string;
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
  /** Independent 0..1 rolls per attribute — rolled once at game start and never
   * rerolled (ship ascension redesign: rarity/rolls are a one-time starting
   * property of Whisper, not something drawn repeatedly — see
   * docs/story/research-notes-ship-ascension.md). */
  rolls: ShipRolls;
  /** Hull classes Whisper has ascended through, oldest first (not including her
   * current hullClass) — a simple ascension history, mostly for narrative texture
   * on the Fleet screen. */
  ascendedFrom: HullClassId[];
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

export type PoiKind = "station" | "asteroidField" | "derelict" | "patrol" | "storyMarker" | "wreck" | "riftPocket";

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
  /** Section D of the 2026-08-24 player brief: the enemy at index 0 is itself an
   * Ember Warship that can be boarded and captured instead of destroyed, once
   * weakened enough and at close range — see Combat.tsx's boarding order. */
  capturable?: boolean;
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
  /** Section A of the 2026-08-24 player brief: a scripted, guaranteed rarity
   * upgrade tied to a specific story beat (e.g. the "second ship" shipyard
   * moment) — not a draw, not RNG. Applied directly in completeScene. */
  grantRarityUpgrade?: ShipRarity;
}
