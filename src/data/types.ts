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

export type ModuleFamily =
  | "bauhinia" | "lionsheart" | "swanreach" | "reaver" | "swarm"
  | "construct" | "hollow" | "rift" | "choir" | "mayeth";

export interface ModuleDef {
  id: string;
  type: ModuleType;
  /** Tech family — a faction from docs/world-bible.md. Determines the module's
   * signature-effect pool, so how it plays reveals where it came from. */
  family: ModuleFamily;
  name: string;
  baseRarity: ModuleRarity;
  powerDraw: number;
  cooldown: number | null;
  baseDamage?: number;
  baseBlock?: number;
  /** The fixed effect that defines this module — present on every instance,
   * unlike traitPool which is rolled per instance. See docs/module-system.md. */
  signature: string;
  /** Effect ids (see data/moduleEffects.ts) this module can roll as variance. */
  traitPool: string[];
  /** Weapon-system audit #9 (docs/weapon-system-audit.md): range bands modified
   * damage globally and identically for every weapon, so a "sniper" and a
   * "shotgun" behaved the same at every distance. A weapon's own preferred band
   * now shifts its damage, which is what makes the helm's stance order a weapon
   * decision as well as a defensive one. "flat" means no preference. */
  rangeProfile?: "close" | "mid" | "long" | "flat";
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
  /** Core-loop redesign #4: this weapon has been evolved (see data/evolutions.ts)
   * — a maxed weapon plus the right partner module becomes categorically
   * different, with a new name, a new signature and more damage. */
  evolved?: boolean;
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
  /** Open-world redesign (2026-08-29): kept on the type for the two regions that
   * still gate on a story beat for narrative reasons, but null for every region
   * that used to gate on campaign progress. Danger is the gate now, not
   * permission — see `threat`. */
  unlockFlag: string | null;
  /** How dangerous this region is, 1 (home) to 7 (the deep). Feeds Ember Load, so
   * a high-threat region fields tougher formations with more roles, and scales
   * rewards to match. This is what replaces the unlock chain: you may fly
   * anywhere from the first minute, and the far regions will kill you for it
   * until you're ready. */
  threat: number;
  systems: SystemDef[];
  lanes: JumpLane[];
}

/** What an enemy DOES for the rest of its formation, beyond its own stat line.
 *
 * Player report (2026-08-25): "战斗还是很无聊". With the guns firing themselves, the
 * only decision a fight leaves you is which target to focus — and every enemy was
 * an interchangeable stat block, so that decision never mattered. An encounter
 * that opens with two identical Reaver Skiffs is asking a question with no wrong
 * answer. Roles make the formation itself the puzzle: kill the wrong thing first
 * and the fight gets harder.
 *
 * Each role is a real mechanic resolved in Combat.tsx, not a label:
 * - `mender`  repairs its most-wounded ally on a timer. Ignore it and your damage
 *             doesn't stick.
 * - `anchor`  projects armour onto every OTHER enemy while it lives. Kill it and
 *             the whole formation goes soft.
 * - `artillery` telegraphs a long, heavy strike. Kill it during the windup, or
 *             Brace through it.
 * Undefined means an ordinary combatant — most enemies, deliberately, so the ones
 * that matter stand out. */
export type EnemyRole = "mender" | "anchor" | "artillery";

export interface EnemyShipDef {
  name: string;
  hull: number;
  damage: number;
  block: number;
  evasion: number;
  /** Hull regenerated at the start of each of this enemy's turns (Swarm doctrine). */
  regen?: number;
  role?: EnemyRole;
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
  /** Section D, second half: a fleet battle (团战) — ships the player captured and
   * gifted to family/allies fight alongside Whisper here. Opt-in per encounter
   * ("depending on the map/mission"), and never true for the extradimensional
   * battlefield, which stays solo — see alliedFleetJoins() in Combat.tsx, which
   * additionally hard-excludes the riftEchoes faction as defense in depth. */
  fleetBattle?: boolean;
  /** 打赢之后声望怎么变。缺省时按"打谁谁记仇"处理(每艘 REP_PER_KILL)。
   *
   * 显式写出来是因为默认规则对赏金是错的:赏金的 faction 是**目标**的派系,
   * 照默认规则走,清掉掠夺者反而会让掠夺者更喜欢你。委托方是谁、得罪谁,
   * 只能一条条写清楚,推不出来。 */
  reputation?: Partial<Record<FactionId, number>>;
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
  /** Open-world redesign: spine beats gate on PROGRESS rather than on which
   * region the player happened to visit. A scene with `requiresAscensions` waits
   * until the ship has been rebuilt that many times, wherever the player is when
   * it happens. This is what lets the through-line survive an arbitrary route —
   * a chain of requiredFlags cannot, because the chain is what closes the world. */
  requiresAscensions?: number;
  /** Minimum flagship level. Same purpose as requiresAscensions, for beats that
   * should land on experience rather than on rebuilds. */
  requiresLevel?: number;
  /** 只有你跟某个派系处到这个份上,这场戏才会发生 (data/story/standing.ts)。
   *
   * 这是"内容按你怎么玩发,而不是按主线进度发"的载体:走安氏路线和走掠夺者
   * 路线的玩家,会看到两批不同的戏,而不是同一批戏配不同的结局文字。 */
  requiresStanding?: { faction: FactionId; min?: number; max?: number };
  unlockHullClass?: HullClassId;
  /** Section A of the 2026-08-24 player brief: a scripted, guaranteed rarity
   * upgrade tied to a specific story beat (e.g. the "second ship" shipyard
   * moment) — not a draw, not RNG. Applied directly in completeScene. */
  grantRarityUpgrade?: ShipRarity;
}
