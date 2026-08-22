import { signal, computed } from "@preact/signals";
import type { GameState } from "../engine/save";
import { createInitialState, loadGame, saveGame } from "../engine/save";
import type { ResourceType, StoryScene } from "../data/types";
import { BAUHINIA_REACH } from "../data/galaxies/bauhiniaReach";
import { ACT1_SCENES } from "../data/story/act1";
import { encounterById } from "../data/encounters";
import { CREW_DEFS } from "../data/crew";
import { drawShip, applyXp, computeMaxHull } from "../engine/ships";
import { drawModule } from "../engine/modules";
import { randomId } from "../engine/rng";
import { playSfx } from "../audio/engine";

export const GALAXY = BAUHINIA_REACH;

export const state = signal<GameState>(loadGame() ?? createInitialState());

export function persist() {
  saveGame(state.value);
}

export const flagship = computed(() => state.value.ships.find((s) => s.id === state.value.flagshipId) ?? null);

export const currentSystem = computed(() => GALAXY.systems.find((s) => s.id === state.value.currentSystemId)!);

export function hasFlag(flag: string): boolean {
  return !!state.value.flags[flag];
}

export function canAfford(costs: Partial<Record<ResourceType, number>>): boolean {
  return Object.entries(costs).every(([k, v]) => state.value.resources[k as ResourceType] >= (v ?? 0));
}

export function spend(costs: Partial<Record<ResourceType, number>>) {
  const resources = { ...state.value.resources };
  for (const [k, v] of Object.entries(costs)) {
    resources[k as ResourceType] -= v ?? 0;
  }
  state.value = { ...state.value, resources };
}

export function grant(rewards: Partial<Record<ResourceType, number>>) {
  const resources = { ...state.value.resources };
  for (const [k, v] of Object.entries(rewards)) {
    resources[k as ResourceType] = (resources[k as ResourceType] ?? 0) + (v ?? 0);
  }
  state.value = { ...state.value, resources };
}

function setFlags(flags: string[]) {
  const next = { ...state.value.flags };
  for (const f of flags) next[f] = true;
  state.value = { ...state.value, flags: next };
  checkNamedCrewUnlocks();
}

function checkNamedCrewUnlocks() {
  const existing = new Set(state.value.crew.map((c) => c.defId));
  const toAdd = CREW_DEFS.filter(
    (c) => c.named && c.unlockFlag && state.value.flags[c.unlockFlag] && !existing.has(c.id),
  );
  if (toAdd.length === 0) return;
  const crew = [
    ...state.value.crew,
    ...toAdd.map((c) => ({ id: randomId("crew"), defId: c.id, approval: 50, assignedShipId: null })),
  ];
  state.value = { ...state.value, crew };
}

export function travelToSystem(systemId: string) {
  state.value = { ...state.value, currentSystemId: systemId };
  persist();
}

export function poiRuntime(poiId: string) {
  return state.value.poiState[poiId] ?? {};
}

export function setPoiRuntime(poiId: string, patch: Partial<{ remaining: number; cleared: boolean }>) {
  const poiState = { ...state.value.poiState, [poiId]: { ...state.value.poiState[poiId], ...patch } };
  state.value = { ...state.value, poiState };
}

export function mineResource(poiId: string, yieldType: ResourceType, amount: number) {
  grant({ [yieldType]: amount } as Partial<Record<ResourceType, number>>);
  const current = poiRuntime(poiId).remaining ?? 0;
  setPoiRuntime(poiId, { remaining: Math.max(0, current - 1) });
  playSfx("mine");
  persist();
}

export function drawShipAction(hullClassId: Parameters<typeof drawShip>[0]) {
  const ship = drawShip(hullClassId);
  state.value = { ...state.value, ships: [...state.value.ships, ship] };
  playSfx("draw");
  persist();
  return ship;
}

export function drawModuleAction() {
  const mod = drawModule();
  state.value = { ...state.value, modules: [...state.value.modules, mod] };
  playSfx("draw");
  persist();
  return mod;
}

export function recruitGenericCrew(defId: string) {
  const crew = [...state.value.crew, { id: randomId("crew"), defId, approval: 50, assignedShipId: null }];
  state.value = { ...state.value, crew };
  playSfx("draw");
  persist();
}

export function scanShipAction(shipId: string) {
  const ships = state.value.ships.map((s) => {
    if (s.id !== shipId || s.scanned) return s;
    return { ...s, scanned: true, aptitude: pickAptitude() };
  });
  state.value = { ...state.value, ships };
  persist();
}

function pickAptitude(): "S" | "A" | "B" | "C" | "D" {
  const weights: Record<string, number> = { S: 3, A: 12, B: 40, C: 30, D: 15 };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [k, w] of Object.entries(weights)) {
    roll -= w;
    if (roll <= 0) return k as any;
  }
  return "B";
}

export function setActiveFlagship(shipId: string) {
  state.value = { ...state.value, flagshipId: shipId };
  persist();
}

export function equipModule(shipId: string, slotIndex: number, moduleId: string | null) {
  const ships = state.value.ships.map((s) => {
    if (s.id !== shipId) return s;
    const equipped = [...s.equipped];
    // unequip this module from any other slot on this ship first
    if (moduleId) {
      for (let i = 0; i < equipped.length; i++) if (equipped[i] === moduleId) equipped[i] = null;
    }
    equipped[slotIndex] = moduleId;
    return { ...s, equipped };
  });
  state.value = { ...state.value, ships };
  persist();
}

export function assignCrew(crewId: string, shipId: string | null) {
  const crew = state.value.crew.map((c) => (c.id === crewId ? { ...c, assignedShipId: shipId } : c));
  state.value = { ...state.value, crew };
  persist();
}

// --- Story ---

export function availableScene(systemId: string): StoryScene | null {
  return (
    ACT1_SCENES.find(
      (sc) =>
        sc.systemId === systemId &&
        (sc.requiredFlag === null || hasFlag(sc.requiredFlag)) &&
        !hasFlag(sc.hiddenAfterFlag),
    ) ?? null
  );
}

export function completeScene(scene: StoryScene) {
  setFlags(scene.onCompleteFlags);
  persist();
}

// --- Combat ---

export function resolveCombatVictory(encounterId: string, poiId: string | null, victoryFlag?: string) {
  const enc = encounterById(encounterId);
  grant(enc.rewards);
  if (flagship.value) {
    const ships = state.value.ships.map((s) => (s.id === flagship.value!.id ? applyXp(s, enc.xp) : s));
    state.value = { ...state.value, ships };
  }
  if (poiId) setPoiRuntime(poiId, { cleared: true });
  if (victoryFlag) setFlags([victoryFlag]);
  persist();
}

export function resolveCombatDefeat() {
  if (flagship.value) {
    const ships = state.value.ships.map((s) =>
      s.id === flagship.value!.id ? { ...s, currentHp: Math.round(s.currentHp * 0.5 + 1) } : s,
    );
    state.value = { ...state.value, ships };
  }
  state.value = { ...state.value, currentSystemId: "bauhiniaPrime" };
  persist();
}

export function repairFlagship() {
  if (!flagship.value) return;
  const shipId = flagship.value.id;
  const ships = state.value.ships.map((s) => (s.id === shipId ? { ...s, currentHp: computeMaxHull(s) } : s));
  state.value = { ...state.value, ships };
  persist();
}
