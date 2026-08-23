import { signal, computed } from "@preact/signals";
import type { GameState } from "../engine/save";
import { createInitialState, loadGame, saveGame } from "../engine/save";
import type { ResourceType, StoryScene, GalaxyDef, SystemDef, Poi, ShipInstance, ModuleInstance } from "../data/types";
import { fabricatorCost } from "../data/modules";
import { shipwrightCost } from "../data/hullClasses";
import { BAUHINIA_REACH } from "../data/galaxies/bauhiniaReach";
import { LIONSHEART_EXPANSE } from "../data/galaxies/lionsheartExpanse";
import { SWANREACH_COMBINE } from "../data/galaxies/swanreachCombine";
import { FRACTURED_VEIL } from "../data/galaxies/fracturedVeil";
import { DEEP_ORIGIN } from "../data/galaxies/deepOrigin";
import { UMBRAL_LINE } from "../data/galaxies/umbralLine";
import { ACT1_SCENES } from "../data/story/act1";
import { ACT2_SCENES } from "../data/story/act2";
import { ACT3_SCENES } from "../data/story/act3";
import { ACT4_SCENES } from "../data/story/act4";
import { ACT5_SCENES } from "../data/story/act5";
import { encounterById } from "../data/encounters";
import { CREW_DEFS } from "../data/crew";
import { applyXp, computeMaxHull } from "../engine/ships";
import { drawModule } from "../engine/modules";
import { randomId } from "../engine/rng";
import { playSfx } from "../audio/engine";

export const GALAXIES: GalaxyDef[] = [
  BAUHINIA_REACH,
  LIONSHEART_EXPANSE,
  SWANREACH_COMBINE,
  FRACTURED_VEIL,
  DEEP_ORIGIN,
  UMBRAL_LINE,
];
export const STORY_SCENES: StoryScene[] = [...ACT1_SCENES, ...ACT2_SCENES, ...ACT3_SCENES, ...ACT4_SCENES, ...ACT5_SCENES];

export const state = signal<GameState>(loadGame() ?? createInitialState());

export function persist() {
  saveGame(state.value);
}

export const flagship = computed(() => state.value.ships.find((s) => s.id === state.value.flagshipId) ?? null);

function findSystem(systemId: string): { system: SystemDef; galaxy: GalaxyDef } {
  for (const galaxy of GALAXIES) {
    const system = galaxy.systems.find((s) => s.id === systemId);
    if (system) return { system, galaxy };
  }
  throw new Error(`Unknown system: ${systemId}`);
}

export const currentSystem = computed(() => findSystem(state.value.currentSystemId).system);
export const currentGalaxy = computed(() => findSystem(state.value.currentSystemId).galaxy);

export function isGalaxyUnlocked(galaxy: GalaxyDef): boolean {
  return galaxy.unlockFlag === null || hasFlag(galaxy.unlockFlag);
}

export const unlockedGalaxies = computed(() => GALAXIES.filter(isGalaxyUnlocked));

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

export function setPoiRuntime(
  poiId: string,
  patch: Partial<{ remaining: number; updatedAt: number; cleared: boolean; clearedAt: number }>,
) {
  const poiState = { ...state.value.poiState, [poiId]: { ...state.value.poiState[poiId], ...patch } };
  state.value = { ...state.value, poiState };
}

/** Current mineable charge, accounting for regen since the field was last worked. */
export function effectiveRemaining(poi: Poi): number {
  const max = (poi.data?.remaining as number) ?? 0;
  const regenSeconds = (poi.data?.regenSeconds as number) ?? 24;
  const rt = poiRuntime(poi.id);
  const base = rt.remaining ?? max;
  if (base >= max) return max;
  const elapsedSec = (Date.now() - (rt.updatedAt ?? Date.now())) / 1000;
  return Math.min(max, base + Math.floor(elapsedSec / regenSeconds));
}

/** Whether a respawnable patrol/wreck has come back since it was last cleared. */
export function isPoiAvailable(poi: Poi): boolean {
  if (poi.requiresFlag && !hasFlag(poi.requiresFlag)) return false;
  if (poi.hiddenAfterFlag && hasFlag(poi.hiddenAfterFlag)) return false;
  const rt = poiRuntime(poi.id);
  if (!rt.cleared) return true;
  const respawnSeconds = poi.data?.respawnSeconds as number | undefined;
  if (!respawnSeconds) return false; // permanently cleared (story-gated one-off)
  return Date.now() - (rt.clearedAt ?? 0) >= respawnSeconds * 1000;
}

export function mineResource(poiId: string, yieldType: ResourceType, amount: number) {
  grant({ [yieldType]: amount } as Partial<Record<ResourceType, number>>);
  const poi = GALAXIES.flatMap((g) => g.systems).flatMap((s) => s.pois).find((p) => p.id === poiId);
  const current = poi ? effectiveRemaining(poi) : 0;
  setPoiRuntime(poiId, { remaining: Math.max(0, current - 1), updatedAt: Date.now() });
  persist();
}

export function collectWreck(poiId: string, rewards: Partial<Record<ResourceType, number>>) {
  grant(rewards);
  setPoiRuntime(poiId, { cleared: true, clearedAt: Date.now() });
  persist();
}

/** Adds an already-rolled ship instance (generated as a preview candidate the player
 * chose to buy, not a fresh blind draw) — see ShipwrightTab's offer-showcase flow. */
export function addShip(ship: ShipInstance) {
  state.value = { ...state.value, ships: [...state.value.ships, ship] };
  playSfx("draw");
  persist();
  return ship;
}

/** Adds an already-rolled module instance the player chose from the Fabricator's
 * offer showcase (see addShip). */
export function addModule(mod: ModuleInstance) {
  state.value = { ...state.value, modules: [...state.value.modules, mod] };
  playSfx("draw");
  persist();
  return mod;
}

/** Sells a module for a fraction of its Fabricator cost — used by both the manual
 * Sell action and Modules screen's auto-sell-duplicates tool. */
export function sellModule(moduleId: string) {
  const mod = state.value.modules.find((m) => m.id === moduleId);
  if (!mod) return;
  const equippedElsewhere = state.value.ships.some((s) => s.equipped.includes(moduleId));
  if (equippedElsewhere) return;
  const refund = Math.round(fabricatorCost(mod.rarity) * 0.4);
  state.value = {
    ...state.value,
    modules: state.value.modules.filter((m) => m.id !== moduleId),
    resources: { ...state.value.resources, sourcePoints: state.value.resources.sourcePoints + refund },
  };
  persist();
  return refund;
}

/** Sells a non-flagship ship for a fraction of its Shipwright cost. */
export function sellShip(shipId: string) {
  const ship = state.value.ships.find((s) => s.id === shipId);
  if (!ship || ship.id === state.value.flagshipId) return;
  const refund = Math.round(shipwrightCost(ship.hullClass, ship.rarity) * 0.4);
  state.value = {
    ...state.value,
    ships: state.value.ships.filter((s) => s.id !== shipId),
    resources: { ...state.value.resources, sourcePoints: state.value.resources.sourcePoints + refund },
  };
  persist();
  return refund;
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
    STORY_SCENES.find(
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

// --- Next objective (drives the "what do I do next" waypoint UI) ---

export interface Objective {
  label: string;
  systemId: string;
  systemName: string;
  poiId?: string;
}

function findPoiByVictoryFlag(flag: string): { system: SystemDef; poiId: string; poiName: string } | null {
  for (const galaxy of GALAXIES) {
    for (const system of galaxy.systems) {
      for (const poi of system.pois) {
        if (poi.data?.victoryFlag === flag) return { system, poiId: poi.id, poiName: poi.name };
      }
    }
  }
  return null;
}

export function getNextObjective(): Objective | null {
  for (const scene of STORY_SCENES) {
    if (hasFlag(scene.hiddenAfterFlag)) continue;
    const { system } = findSystem(scene.systemId);
    if (scene.requiredFlag === null || hasFlag(scene.requiredFlag)) {
      return { label: `${scene.chapterTitle}`, systemId: scene.systemId, systemName: system.name };
    }
    const gate = findPoiByVictoryFlag(scene.requiredFlag);
    if (gate) {
      return {
        label: `Engage ${gate.poiName}`,
        systemId: gate.system.id,
        systemName: gate.system.name,
        poiId: gate.poiId,
      };
    }
  }
  return null;
}

// --- Combat ---

/** How many of this crew def are currently recruited — "fleet-wide" passives (Ori's
 * alloy bonus, Kessa's victory bonus, Requiem's hull bonus, the generic recruits'
 * bonuses) apply as soon as the crew member is recruited, no assignment required,
 * and stack per-copy for the non-unique generic recruits. */
export function crewCount(defId: string): number {
  return state.value.crew.filter((c) => c.defId === defId).length;
}

export function hasCrewRecruited(defId: string): boolean {
  return crewCount(defId) > 0;
}

/** Every named ship is a singleton (see data/namedShips.ts) — pass this to drawShip
 * so an offer showcase or draw never rolls one the player already owns. */
export function ownedNamedShipIds(): Set<string> {
  return new Set(state.value.ships.map((s) => s.namedShipId).filter((id): id is string => !!id));
}

/** Unit 7-Requiem's "+15% max hull fleet-wide" passive, applied wherever a ship's max
 * hull is shown or used outside of combat (combat applies its own equipment-driven
 * hull bonus on top of this — see Combat.tsx). */
export function effectiveMaxHull(ship: Parameters<typeof computeMaxHull>[0]): number {
  const bonus = hasCrewRecruited("unit7Requiem") ? 0.15 : 0;
  return Math.round(computeMaxHull(ship) * (1 + bonus));
}

/** Issue #2 (docs/design-principles.md Player-Tested Anti-Patterns #2): a fully
 * predictable reward is necessary for pacing but never enough for excitement — this
 * is the random layer on top of the deterministic mission payout. Bosses roll higher
 * since they're already the bigger, rarer moment. */
const BONUS_DROP_CHANCE = 0.25;
const BOSS_BONUS_DROP_CHANCE = 0.5;

export function resolveCombatVictory(
  encounterId: string,
  poiId: string | null,
  victoryFlag?: string,
  salvageAlloyBonusFraction: number = 0,
): { leveledUp: boolean; newLevel: number; rewards: Partial<Record<ResourceType, number>>; bonusDrop: ModuleInstance | null } {
  const enc = encounterById(encounterId);
  const rewards = { ...enc.rewards };
  // Crew passives: Ori Vashti (+8% alloy), Kessa Vray (+15% salvage/alloy), and each
  // recruited generic tactician (+5% insight) — all fleet-wide, no assignment needed.
  const alloyBonus = salvageAlloyBonusFraction + (hasCrewRecruited("oriVashti") ? 0.08 : 0) + (hasCrewRecruited("kessaVray") ? 0.15 : 0);
  const salvageBonus = salvageAlloyBonusFraction + (hasCrewRecruited("kessaVray") ? 0.15 : 0);
  const insightBonus = crewCount("recruitTactician") * 0.05;
  if (rewards.salvage) rewards.salvage = Math.round(rewards.salvage * (1 + salvageBonus));
  if (rewards.alloy) rewards.alloy = Math.round(rewards.alloy * (1 + alloyBonus));
  if (rewards.insight && insightBonus > 0) rewards.insight = Math.round(rewards.insight * (1 + insightBonus));
  grant(rewards);
  const dropChance = enc.isBoss ? BOSS_BONUS_DROP_CHANCE : BONUS_DROP_CHANCE;
  const bonusDrop = Math.random() < dropChance ? drawModule() : null;
  if (bonusDrop) state.value = { ...state.value, modules: [...state.value.modules, bonusDrop] };
  let leveledUp = false;
  let newLevel = flagship.value?.level ?? 1;
  if (flagship.value) {
    const before = flagship.value.level;
    const ships = state.value.ships.map((s) => (s.id === flagship.value!.id ? applyXp(s, enc.xp) : s));
    state.value = { ...state.value, ships };
    newLevel = ships.find((s) => s.id === flagship.value!.id)?.level ?? before;
    leveledUp = newLevel > before;
  }
  if (poiId) setPoiRuntime(poiId, { cleared: true, clearedAt: Date.now() });
  if (victoryFlag) setFlags([victoryFlag]);
  persist();
  return { leveledUp, newLevel, rewards, bonusDrop };
}

export function resolveCombatDefeat() {
  if (flagship.value) {
    const ships = state.value.ships.map((s) =>
      s.id === flagship.value!.id ? { ...s, currentHp: Math.round(s.currentHp * 0.5 + 1) } : s,
    );
    state.value = { ...state.value, ships };
  }
  persist();
}

export function repairFlagship() {
  if (!flagship.value) return;
  const shipId = flagship.value.id;
  const ships = state.value.ships.map((s) => (s.id === shipId ? { ...s, currentHp: computeMaxHull(s) } : s));
  state.value = { ...state.value, ships };
  persist();
}
