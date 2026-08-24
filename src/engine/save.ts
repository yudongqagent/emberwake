import type { CrewInstance, ModuleInstance, ResourceType, ShipInstance } from "../data/types";
import { createWhisper } from "./ships";
import { randomId } from "./rng";

export const SCHEMA_VERSION = 7;
const SAVE_KEY = "emberwake.save";

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
  /** Captured ships that have been gifted on to family/allies. They're gone from
   * the player's own hands for good, but they fight alongside Whisper in fleet
   * battles (团战) — see EncounterDef.fleetBattle. Never in the extradimensional
   * battlefield, which stays solo. */
  alliedShips: ShipInstance[];
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
};

/** Exposed for tests — migrations are only otherwise reachable through
 * localStorage, and the legacy module remap is exactly the kind of thing that
 * silently breaks every existing save if it regresses. */
export function migrateForTest(raw: any): GameState {
  return migrate(raw);
}

function migrate(raw: any): GameState {
  let state = raw;
  while (state.schemaVersion < SCHEMA_VERSION) {
    const step = migrations[state.schemaVersion];
    if (!step) break;
    state = step(state);
  }
  return state as GameState;
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private browsing quota, etc.) — game continues unsaved.
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
