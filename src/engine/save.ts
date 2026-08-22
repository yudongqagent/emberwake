import type { CrewInstance, ModuleInstance, ResourceType, ShipInstance } from "../data/types";
import { drawShip, computeMaxHull } from "./ships";
import { randomId } from "./rng";

export const SCHEMA_VERSION = 1;
const SAVE_KEY = "emberwake.save";

export interface PoiRuntimeState {
  remaining?: number;
  cleared?: boolean;
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
  return { id: randomId("module"), defId, rarity: "mk1", level: 1, traits: [], lockedTraitSlot: null };
}

export function createInitialState(): GameState {
  const whisper = drawShip("corvette");
  whisper.rarity = "salvage";
  whisper.name = "Whisper";
  whisper.currentHp = computeMaxHull(whisper);
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

const migrations: Record<number, (s: any) => any> = {
  // 1 -> 2 would go here when the shape changes.
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
