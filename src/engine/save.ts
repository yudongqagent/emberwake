import type { CrewInstance, ModuleInstance, ResourceType, ShipInstance, FactionId } from "../data/types";
import type { SigilNodeId } from "../data/sigils";
import { MODULE_DEFS } from "../data/modules";
import { CHOICE_REPUTATION, clampRep } from "../data/reputation";
import { createWhisper } from "./ships";
import { randomId } from "./rng";

export const SCHEMA_VERSION = 11;
const SAVE_KEY = "emberwake.save";
/** Rolling copy of the previous save, written before every overwrite. */
const BACKUP_KEY = "emberwake.save.backup";
/** A save that could not be parsed at all. Kept, never dropped. */
const QUARANTINE_KEY = "emberwake.save.corrupt";

export interface PoiRuntimeState {
  remaining?: number;
  /** Wall-clock ms timestamp `remaining` was last written — regen is derived from this. */
  updatedAt?: number;
  cleared?: boolean;
  /** Wall-clock ms timestamp of the last clear — respawnable POIs use this to reopen. */
  clearedAt?: number;
}

export interface GameState {
  schemaVersion: number;
  resources: Record<ResourceType, number>;
  flags: Record<string, boolean>;
  ships: ShipInstance[];
  modules: ModuleInstance[];
  crew: CrewInstance[];
  flagshipId: string | null;
  currentSystemId: string;
  poiState: Record<string, PoiRuntimeState>;
  /** Section D (2026-08-24 player brief): enemy Ember Warships boarded and
   * captured in combat (see Combat.tsx's boarding order), held here until gifted
   * to family/allies (state/store.ts's giftCapturedShip) — never piloted by the
   * player, and not the same roster the old ship-gacha hangar used to be. */
  capturedShips: ShipInstance[];
  /** Core-loop redesign #1 (docs/core-loop-redesign.md): effect ids granted by
   * Refit Draft boons, active until the ship next docks. They join the set of
   * effects the ship's own modules provide, so a boon can be any of the 46
   * already-implemented effects rather than needing new combat plumbing. */
  sortieBoons: string[];
  /** Core-loop redesign #3 — Ember Load the player has opted into on top of what
   * ascension already imposes. Higher Load means harder encounters and richer
   * rewards; opting in is what makes it a decision rather than a difficulty knob. */
  voluntaryLoad: number;
  /** 派系声望 (docs/story-engagement-analysis.md)。玩家的剧情选择、击杀、悬赏
   * 都会改动它,而它决定价格、盟友、巡逻队敌意——即"选择有后果"的载体。 */
  reputation: Partial<Record<FactionId, number>>;
  /** 余烬对你的信任。面对身世揭底的三种反应改的是这个,不是外部势力。 */
  cinderTrust: number;
  /** Captured ships that have been gifted on to family/allies. They're gone from
   * the player's own hands for good, but they fight alongside Whisper in fleet
   * battles (团战) — see EncounterDef.fleetBattle. Never in the extradimensional
   * battlefield, which stays solo. */
  alliedShips: ShipInstance[];
  /** 余烬刻印:跨越整局的永久成长货币,从裂隙深潜里赚(见 data/sigils.ts)。 */
  sigils: number;
  sigilRanks: Partial<Record<SigilNodeId, number>>;
  /** 到过的最深一层。刷新它才是刻印的主要来源——所以"再深一层"永远有意义。 */
  deepestDive: number;
}

function startingModule(defId: string): ModuleInstance {
  return { id: randomId("module"), defId, rarity: "mk1", level: 1, traits: [], lockedTraitSlot: null, quality: 0.5 };
}

export function createInitialState(): GameState {
  const whisper = createWhisper();
  // Whisper's inherited fit — the lowest tier of the Principality's own tech line,
  // matching her backstory as a Bauhinia hull handed down rather than chosen
  // (see ACT1_SCENES coldWake). Ids are from the 200-module roster in
  // data/moduleDefs.ts.
  const startingWeapon = startingModule("bauhiniaWeapon1");
  const startingArmor = startingModule("bauhiniaArmor1");
  // Slot order matches slotLayout() in ui/screens/Modules.tsx: weapon, armor, engine, utility.
  whisper.equipped = [startingWeapon.id, startingArmor.id, null, null];
  return {
    schemaVersion: SCHEMA_VERSION,
    resources: {
      salvage: 20,
      sourcePoints: 0,
      alloy: 0,
      originEssence: 0,
      insight: 0,
    },
    flags: {},
    ships: [whisper],
    modules: [startingWeapon, startingArmor],
    crew: [],
    flagshipId: whisper.id,
    currentSystemId: "amaranthBelt",
    poiState: {},
    capturedShips: [],
    alliedShips: [],
    sigils: 0,
    sigilRanks: {},
    deepestDive: 0,
    sortieBoons: [],
    voluntaryLoad: 0,
    reputation: {},
    cinderTrust: 0,
  };
}

const NEUTRAL_ROLLS = { hull: 0.5, power: 0.5, speed: 0.5, evasion: 0.5, crit: 0.5 };

const migrations: Record<number, (s: any) => any> = {
  // Pre-itemization-overhaul saves have no per-instance rolls — backfill neutral
  // (1.0x) values so existing ships/modules keep their prior effective stats exactly.
  1: (s: any) => ({
    ...s,
    schemaVersion: 2,
    ships: s.ships.map((ship: any) => ({ ...ship, rolls: ship.rolls ?? { ...NEUTRAL_ROLLS } })),
    modules: s.modules.map((mod: any) => ({ ...mod, quality: mod.quality ?? 0.5 })),
  }),
  // Pre-named-ship saves have no namedShipId — every existing ship is an ordinary
  // hull, never one of the new singletons.
  2: (s: any) => ({
    ...s,
    schemaVersion: 3,
    ships: s.ships.map((ship: any) => ({ ...ship, namedShipId: ship.namedShipId ?? null })),
  }),
  // Ship-ascension redesign (docs/story/research-notes-ship-ascension.md): the
  // multi-ship gacha hangar is gone — a save may own several ships with one flagged
  // as the flagship. Keep only that one (whichever ship is currently flown is the
  // one that keeps growing; nothing is reset), drop the rest with no clawback of the
  // Essence/Source Points they cost, and drop the now-meaningless namedShipId (the
  // ability is derived from hullClass now, not stored — see data/namedShips.ts's
  // hullClassAbility()). Currency the player had earmarked for ship-buying is just
  // currency now.
  3: (s: any) => {
    const kept = s.ships.find((ship: any) => ship.id === s.flagshipId) ?? s.ships[0];
    const { namedShipId, ...rest } = kept;
    return {
      ...s,
      schemaVersion: 4,
      ships: [{ ...rest, ascendedFrom: rest.ascendedFrom ?? [] }],
      flagshipId: kept.id,
    };
  },
  // Section D: adds the captured-ships roster — empty for every existing save,
  // nothing to backfill.
  4: (s: any) => ({
    ...s,
    schemaVersion: 5,
    capturedShips: s.capturedShips ?? [],
  }),
  // Section D, second half: adds the allied (gifted) roster for fleet battles.
  // Empty for existing saves — ships gifted before this existed were consumed
  // outright for resources, and there's no record left to reconstruct them from.
  5: (s: any) => ({
    ...s,
    schemaVersion: 6,
    alliedShips: s.alliedShips ?? [],
    sigils: s.sigils ?? 0,
    sigilRanks: s.sigilRanks ?? {},
    deepestDive: s.deepestDive ?? 0,
  }),
  // The 17-module roster was replaced wholesale by the 200-module one
  // (data/moduleDefs.ts), so every id in an existing save now points at nothing —
  // and moduleDefById THROWS on an unknown id, which would hard-crash any save
  // from before this change the moment it loaded. Remap each retired module onto
  // the closest equivalent in the new roster rather than deleting player property:
  // same type, a family whose doctrine matches what the old module did, at a tier
  // matching the instance's own rarity so nothing is upgraded or downgraded.
  6: (s: any) => {
    const FAMILY_FOR: Record<string, string> = {
      pulseCannon: "bauhinia", arcLance: "rift", railgun: "construct",
      flakBattery: "swarm", ionDisruptor: "construct", twinLinkedCannon: "choir",
      plateBarrier: "bauhinia", reactiveMesh: "swarm", ablativePlating: "hollow",
      kineticReflector: "lionsheart",
      thrusterArray: "bauhinia", vectorDrive: "swanreach", inertialDampers: "lionsheart",
      empBurst: "construct", salvageDrone: "swanreach", purgeField: "construct",
      displacementCharge: "rift",
    };
    const TYPE_FOR: Record<string, string> = {
      pulseCannon: "Weapon", arcLance: "Weapon", railgun: "Weapon", flakBattery: "Weapon",
      ionDisruptor: "Weapon", twinLinkedCannon: "Weapon",
      plateBarrier: "Armor", reactiveMesh: "Armor", ablativePlating: "Armor", kineticReflector: "Armor",
      thrusterArray: "Engine", vectorDrive: "Engine", inertialDampers: "Engine",
      empBurst: "Utility", salvageDrone: "Utility", purgeField: "Utility", displacementCharge: "Utility",
    };
    const TIER: Record<string, number> = { mk1: 1, mk2: 2, mk3: 3, mk4: 4, mk5: 5 };
    const modules = (s.modules ?? []).map((m: any) => {
      const fam = FAMILY_FOR[m.defId];
      const typ = TYPE_FOR[m.defId];
      if (!fam || !typ) return m; // already a new-roster id
      return {
        ...m,
        defId: `${fam}${typ}${TIER[m.rarity] ?? 1}`,
        // Old rolled traits came from per-module pools that no longer exist; the
        // new module's own signature carries its identity, so clear the stale ones
        // rather than leave ids that resolve to nothing.
        traits: [],
        lockedTraitSlot: null,
      };
    });
    return { ...s, schemaVersion: 7, modules };
  },
  // Refit Draft boons — empty for every existing save, nothing to reconstruct.
  7: (s: any) => ({ ...s, schemaVersion: 8, sortieBoons: s.sortieBoons ?? [] }),
  // Ember Load — existing saves start at zero voluntary load, so nothing about
  // their difficulty changes except what their own ascensions already imply.
  8: (s: any) => ({ ...s, schemaVersion: 9, voluntaryLoad: s.voluntaryLoad ?? 0 }),
  // 声望。已有存档从 0 开始,但它们的剧情选择已经写在 flags 里了 ——
  // migrateReputationFromFlags 会把那些选择追认成声望,所以老玩家的选择
  // 不会白做。
  9: (s: any) => ({
    ...s,
    schemaVersion: 10,
    reputation: s.reputation ?? migrateReputationFromFlags(s.flags ?? {}),
    cinderTrust: s.cinderTrust ?? 0,
  }),
  // 余烬刻印(data/sigils.ts)。老存档从零开始,但 deepestDive 也从零开始,
  // 所以他们下一次潜的每一层都算"刷新纪录"——不会因为之前潜过而吃亏。
  10: (s: any) => ({
    ...s,
    schemaVersion: 11,
    sigils: s.sigils ?? 0,
    sigilRanks: s.sigilRanks ?? {},
    deepestDive: s.deepestDive ?? 0,
  }),
};

/** 把一个老存档里已经做过的剧情选择,追认成声望。
 *
 * 这些 flag 一直被写进存档,只是从来没人读。老玩家在血债、山脊、安氏终局上做的
 * 决定,现在应当立刻兑现,而不是"从今往后才算数"。 */
export function migrateReputationFromFlags(flags: Record<string, boolean>): Partial<Record<FactionId, number>> {
  const rep: Partial<Record<FactionId, number>> = {};
  for (const [flag, deltas] of Object.entries(CHOICE_REPUTATION)) {
    if (!flags[flag]) continue;
    for (const [fac, d] of Object.entries(deltas)) {
      rep[fac as FactionId] = clampRep((rep[fac as FactionId] ?? 0) + (d ?? 0));
    }
  }
  return rep;
}

/** Exposed for tests — migrations are only otherwise reachable through
 * localStorage, and the legacy module remap is exactly the kind of thing that
 * silently breaks every existing save if it regresses. */
export function migrateForTest(raw: any): GameState {
  return migrate(raw);
}

function migrate(raw: any): GameState {
  let state = raw;
  // A save with a missing/garbage schemaVersion used to fall straight through
  // this loop untouched and then blow up downstream on fields no migration had
  // added. Treat it as the oldest schema and let the chain rebuild it.
  if (typeof state.schemaVersion !== "number" || !Number.isFinite(state.schemaVersion)) {
    state = { ...state, schemaVersion: 1 };
  }
  while (state.schemaVersion < SCHEMA_VERSION) {
    const step = migrations[state.schemaVersion];
    if (!step) break;
    state = step(state);
  }
  return state as GameState;
}

/** Player report (2026-08-25): "我的任务也没了 ... 修复之前存档".
 *
 * loadGame used to be `try { parse; migrate } catch { return null }`, and the
 * caller is `loadGame() ?? createInitialState()`. So ANY defect anywhere in a
 * save — a truncated write, a field a migration didn't expect, an empty ships
 * array hitting migration 3's destructure — silently threw the player's entire
 * campaign away and started them on a brand new game. No warning, no backup, no
 * way back. That is the worst possible failure mode for a game that only stores
 * progress in one browser key, and it matches the report exactly.
 *
 * Loading is now repair-first: fill in what's missing, drop only what is truly
 * unusable, and keep everything else. A save is discarded only if it cannot be
 * parsed as JSON at all — and even then the raw text is quarantined rather than
 * dropped, so it can still be recovered by hand.
 *
 * Repairs are deliberately conservative. The goal is to return the player to
 * their campaign, not to guarantee a pristine state: losing one unrecognised
 * module is recoverable, losing forty hours of story flags is not. */
function repairState(raw: any): GameState {
  const base = createInitialState();
  if (!raw || typeof raw !== "object") return base;

  const resources = { ...base.resources };
  if (raw.resources && typeof raw.resources === "object") {
    for (const key of Object.keys(base.resources) as ResourceType[]) {
      const v = raw.resources[key];
      if (typeof v === "number" && Number.isFinite(v)) resources[key] = v;
    }
  }

  // Flags are the campaign. They're plain booleans, they're never removed during
  // play, and they're what "我的任务" is made of — so they get salvaged key by key
  // rather than discarded wholesale if the object is odd.
  const flags: Record<string, boolean> = {};
  if (raw.flags && typeof raw.flags === "object") {
    for (const [k, v] of Object.entries(raw.flags)) if (v === true) flags[k] = true;
  }

  const knownModuleIds = new Set(MODULE_DEFS.map((m) => m.id));
  const modules: ModuleInstance[] = Array.isArray(raw.modules)
    ? raw.modules.filter(
        (m: any) => m && typeof m.id === "string" && typeof m.defId === "string" && knownModuleIds.has(m.defId),
      ).map((m: any) => ({
        id: m.id,
        defId: m.defId,
        rarity: m.rarity ?? "mk1",
        level: typeof m.level === "number" && m.level > 0 ? m.level : 1,
        traits: Array.isArray(m.traits) ? m.traits.filter((t: any) => typeof t === "string") : [],
        lockedTraitSlot: typeof m.lockedTraitSlot === "number" ? m.lockedTraitSlot : null,
        quality: typeof m.quality === "number" ? m.quality : 0.5,
      }))
    : [];
  const moduleIds = new Set(modules.map((m) => m.id));

  function repairShip(rawShip: any, fallback: ShipInstance): ShipInstance {
    if (!rawShip || typeof rawShip !== "object") return fallback;
    return {
      id: typeof rawShip.id === "string" ? rawShip.id : fallback.id,
      hullClass: rawShip.hullClass ?? fallback.hullClass,
      rarity: rawShip.rarity ?? fallback.rarity,
      aptitude: rawShip.aptitude ?? null,
      scanned: !!rawShip.scanned,
      name: typeof rawShip.name === "string" ? rawShip.name : fallback.name,
      level: typeof rawShip.level === "number" && rawShip.level > 0 ? rawShip.level : 1,
      xp: typeof rawShip.xp === "number" ? rawShip.xp : 0,
      // An equipped slot pointing at a module that no longer exists becomes an
      // empty socket rather than a crash the next time the loadout renders.
      equipped: Array.isArray(rawShip.equipped)
        ? rawShip.equipped.map((id: any) => (typeof id === "string" && moduleIds.has(id) ? id : null))
        : [],
      currentHp: typeof rawShip.currentHp === "number" && rawShip.currentHp > 0 ? rawShip.currentHp : 1,
      rolls: rawShip.rolls && typeof rawShip.rolls === "object" ? { ...NEUTRAL_ROLLS, ...rawShip.rolls } : { ...NEUTRAL_ROLLS },
      ascendedFrom: Array.isArray(rawShip.ascendedFrom) ? rawShip.ascendedFrom : [],
    };
  }

  const ships: ShipInstance[] = Array.isArray(raw.ships) && raw.ships.length > 0
    ? raw.ships.map((sh: any) => repairShip(sh, base.ships[0]))
    : base.ships;

  const flagshipId = ships.some((sh) => sh.id === raw.flagshipId) ? raw.flagshipId : ships[0].id;

  return {
    schemaVersion: SCHEMA_VERSION,
    resources,
    flags,
    ships,
    modules,
    crew: Array.isArray(raw.crew)
      ? raw.crew.filter((c: any) => c && typeof c.defId === "string")
      : [],
    flagshipId,
    currentSystemId: typeof raw.currentSystemId === "string" ? raw.currentSystemId : base.currentSystemId,
    poiState: raw.poiState && typeof raw.poiState === "object" ? raw.poiState : {},
    capturedShips: Array.isArray(raw.capturedShips) ? raw.capturedShips : [],
    alliedShips: Array.isArray(raw.alliedShips) ? raw.alliedShips : [],
    sigils: typeof raw.sigils === "number" ? raw.sigils : 0,
    sigilRanks: raw.sigilRanks && typeof raw.sigilRanks === "object" ? raw.sigilRanks : {},
    deepestDive: typeof raw.deepestDive === "number" ? raw.deepestDive : 0,
    sortieBoons: Array.isArray(raw.sortieBoons) ? raw.sortieBoons.filter((b: any) => typeof b === "string") : [],
    voluntaryLoad: typeof raw.voluntaryLoad === "number" && raw.voluntaryLoad >= 0 ? raw.voluntaryLoad : 0,
    reputation: raw.reputation && typeof raw.reputation === "object" ? raw.reputation : {},
    cinderTrust: typeof raw.cinderTrust === "number" ? raw.cinderTrust : 0,
  };
}

/** How the last load went, for the UI to report honestly instead of pretending
 * a brand new game was the player's intent. */
export type LoadOutcome = "fresh" | "loaded" | "repaired" | "quarantined";
let lastLoadOutcome: LoadOutcome = "fresh";
export function getLastLoadOutcome(): LoadOutcome {
  return lastLoadOutcome;
}

export function loadGame(): GameState | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    lastLoadOutcome = "fresh";
    return null;
  }
  if (!raw) {
    lastLoadOutcome = "fresh";
    return null;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Unparseable — the only case where we genuinely cannot continue. Keep the
    // bytes so nothing is destroyed, and say so rather than silently restarting.
    try { localStorage.setItem(QUARANTINE_KEY, raw); } catch { /* quota */ }
    lastLoadOutcome = "quarantined";
    return null;
  }

  try {
    const migrated = migrate(parsed);
    // Even a clean migration gets validated: the point is that the player never
    // reaches a crash loop with a save they can't get past.
    const repaired = repairState(migrated);
    lastLoadOutcome = "loaded";
    return repaired;
  } catch {
    try {
      const repaired = repairState(parsed);
      lastLoadOutcome = "repaired";
      return repaired;
    } catch {
      try { localStorage.setItem(QUARANTINE_KEY, raw); } catch { /* quota */ }
      lastLoadOutcome = "quarantined";
      return null;
    }
  }
}

export function saveGame(state: GameState): void {
  try {
    // Roll the previous save into a backup before overwriting. This is what makes
    // "修复之前存档" answerable at all: without it there is exactly one copy of a
    // campaign and any bad write is final.
    const prev = localStorage.getItem(SAVE_KEY);
    const next = JSON.stringify(state);
    if (prev && prev !== next) localStorage.setItem(BACKUP_KEY, prev);
    localStorage.setItem(SAVE_KEY, next);
  } catch {
    // localStorage unavailable (private browsing quota, etc.) — game continues unsaved.
  }
}

/** A previous save worth offering back to the player: the rolling backup, or a
 * quarantined one if that's all there is. Returns null when neither exists or
 * neither has any progress in it. */
export function recoverableSave(): { state: GameState; source: "backup" | "quarantine" } | null {
  for (const [key, source] of [[BACKUP_KEY, "backup"], [QUARANTINE_KEY, "quarantine"]] as const) {
    let raw: string | null = null;
    try { raw = localStorage.getItem(key); } catch { continue; }
    if (!raw) continue;
    try {
      const state = repairState(migrate(JSON.parse(raw)));
      // Only offer something that actually represents progress — an empty
      // backup of a brand new game is noise.
      const progress = Object.keys(state.flags).length > 0 || state.ships[0].level > 1;
      if (progress) return { state, source };
    } catch {
      continue;
    }
  }
  return null;
}

export function restoreSave(state: GameState): void {
  saveGame(state);
}

/** Whether there's a campaign worth offering "Continue" for. Checks for actual
 * progress rather than mere existence, so a save written by simply opening the
 * game once doesn't make the title screen lie about having something to return
 * to. */
export function hasExistingSave(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = repairState(migrate(JSON.parse(raw)));
    return Object.keys(s.flags).length > 0 || s.ships[0].level > 1 || s.modules.length > 2;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
