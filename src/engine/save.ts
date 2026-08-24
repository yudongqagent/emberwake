import type { CrewInstance, ModuleInstance, ResourceType, ShipInstance } from "../data/types";
import { createWhisper } from "./ships";
import { randomId } from "./rng";

export const SCHEMA_VERSION = 4;
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
}

function startingModule(defId: string): ModuleInstance {
  return { id: randomId("module"), defId, rarity: "mk1", level: 1, traits: [], lockedTraitSlot: null, quality: 0.5 };
}

export function createInitialState(): GameState {
  const whisper = createWhisper();
  const startingWeapon = startingModule("pulseCannon");
  const startingArmor = startingModule("plateBarrier");
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
};

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
