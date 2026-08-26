import { signal, computed } from "@preact/signals";
import type { GameState } from "../engine/save";
import { createInitialState, loadGame, saveGame } from "../engine/save";
import type { ResourceType, StoryScene, GalaxyDef, SystemDef, Poi, ModuleInstance, HullClassId, ShipInstance } from "../data/types";
import { fabricatorCost, MARKET_MAX_RARITY, moduleDefById } from "../data/modules";
import { hullClassById, ascensionRequirementsMet } from "../data/hullClasses";
import { BAUHINIA_REACH } from "../data/galaxies/bauhiniaReach";
import { LIONSHEART_EXPANSE } from "../data/galaxies/lionsheartExpanse";
import { SWANREACH_COMBINE } from "../data/galaxies/swanreachCombine";
import { FRACTURED_VEIL } from "../data/galaxies/fracturedVeil";
import { DEEP_ORIGIN } from "../data/galaxies/deepOrigin";
import { UMBRAL_LINE } from "../data/galaxies/umbralLine";
import { CHORUS_DEEP } from "../data/galaxies/chorusDeep";
import { ACT1_SCENES } from "../data/story/act1";
import { ACT2_SCENES } from "../data/story/act2";
import { ACT3_SCENES } from "../data/story/act3";
import { ACT4_SCENES } from "../data/story/act4";
import { ACT5_SCENES } from "../data/story/act5";
import { ACT6_SCENES } from "../data/story/act6";
import { encounterById } from "../data/encounters";
import { localizedSystemName, localizedPoiName } from "../i18n/data";
import { localizedScene } from "../i18n/story";
import { t } from "../i18n/strings";
import { CREW_DEFS, crewDefById } from "../data/crew";
import { applyXp, computeMaxHull, ascendShip } from "../engine/ships";
import { drawModule, riftDropRarityFloor, levelUpModule, moduleUpgradeCost, isModuleMaxed } from "../engine/modules";
import type { DraftOption } from "../data/draft";
import { totalEmberLoad, emberLoadRewardMultiplier } from "../data/emberLoad";
import { randomId } from "../engine/rng";
import { playSfx } from "../audio/engine";

export const GALAXIES: GalaxyDef[] = [
  BAUHINIA_REACH,
  LIONSHEART_EXPANSE,
  SWANREACH_COMBINE,
  FRACTURED_VEIL,
  DEEP_ORIGIN,
  UMBRAL_LINE,
  CHORUS_DEEP,
];
export const STORY_SCENES: StoryScene[] = [...ACT1_SCENES, ...ACT2_SCENES, ...ACT3_SCENES, ...ACT4_SCENES, ...ACT5_SCENES, ...ACT6_SCENES];

export const state = signal<GameState>(loadGame() ?? createInitialState());

export function persist() {
  saveGame(state.value);
}

/** Swaps the whole campaign in — used only by save recovery (see
 * ui/components/SaveRecovery.tsx), which hands back a campaign that a bad load
 * had replaced. Deliberately not a general-purpose setter: everything else
 * mutates state through the narrow helpers in this file. */
/** Core-loop redesign #1: applies whichever Refit Draft option the player chose.
 * All three kinds land here so the cost/benefit stays in one auditable place. */
export function applyDraftChoice(opt: DraftOption): void {
  const next = { ...state.value };
  if (opt.kind === "module" && opt.module) {
    next.modules = [...next.modules, opt.module];
    if (opt.hullCost) {
      // The greedy option's price. Never lethal — a bruise, not a gamble with
      // the run, since the fight is already won by the time this is offered.
      next.ships = next.ships.map((sh) =>
        sh.id === next.flagshipId ? { ...sh, currentHp: Math.max(1, sh.currentHp - opt.hullCost!) } : sh,
      );
    }
  } else if (opt.kind === "upgrade" && opt.targetModuleId) {
    next.modules = next.modules.map((m) => (m.id === opt.targetModuleId ? levelUpModule(m) : m));
  } else if (opt.kind === "boon" && opt.boonId) {
    next.sortieBoons = [...next.sortieBoons, opt.boonId];
  }
  state.value = next;
  persist();
  playSfx("draw");
}

/** Boons last until the ship docks — that's what makes docking a decision rather
 * than a free reset, and what keeps a good run's momentum meaningful. */
/** Total Ember Load in force: what the flagship's ascensions impose, plus what
 * the player has opted into. */
export function emberLoad(): number {
  const ship = flagship.value;
  return totalEmberLoad(ship?.ascendedFrom.length ?? 0, state.value.voluntaryLoad);
}

export function setVoluntaryLoad(n: number): void {
  state.value = { ...state.value, voluntaryLoad: Math.max(0, Math.min(10, Math.round(n))) };
  persist();
}

export function clearSortieBoons(): void {
  if (state.value.sortieBoons.length === 0) return;
  state.value = { ...state.value, sortieBoons: [] };
  persist();
}

export function replaceState(next: GameState) {
  state.value = next;
  persist();
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

/** Every other mutating action in this file (addModule, sellModule,
 * repairFlagship, recruitGenericCrew, resolveCombatVictory...) calls persist()
 * internally. spend/grant didn't, which meant every caller had to remember to
 * persist afterward themselves — several didn't (StationPanel's Trade exchanges,
 * the Shipwright/Fabricator refresh cost), so spending resources only took effect
 * in memory until some *other* action happened to save next. A page refresh before
 * that made the spend free. Fixed at the root instead of patching each call site,
 * since the next new call site would just repeat the same mistake. */
export function spend(costs: Partial<Record<ResourceType, number>>) {
  const resources = { ...state.value.resources };
  for (const [k, v] of Object.entries(costs)) {
    resources[k as ResourceType] -= v ?? 0;
  }
  state.value = { ...state.value, resources };
  persist();
}

export function grant(rewards: Partial<Record<ResourceType, number>>) {
  const resources = { ...state.value.resources };
  for (const [k, v] of Object.entries(rewards)) {
    resources[k as ResourceType] = (resources[k as ResourceType] ?? 0) + (v ?? 0);
  }
  state.value = { ...state.value, resources };
  persist();
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

/** How many equipped modules on the flagship carry an effect (signature counts). */
export function equippedEffectStacks(effectId: string): number {
  const ship = flagship.value;
  if (!ship) return 0;
  return ship.equipped.filter((id) => {
    if (!id) return false;
    const m = state.value.modules.find((x) => x.id === id);
    if (!m) return false;
    const d = moduleDefById(m.defId);
    return d.signature === effectId || m.traits.includes(effectId);
  }).length;
}

export function mineResource(poiId: string, yieldType: ResourceType, amount: number) {
  // Prospector (data/moduleEffects.ts): a real reason to fit a utility module for
  // economy rather than combat.
  const bonus = 1 + 0.25 * equippedEffectStacks("prospector");
  grant({ [yieldType]: Math.max(1, Math.round(amount * bonus)) } as Partial<Record<ResourceType, number>>);
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

/** Adds an already-rolled module instance the player chose from the Fabricator's
 * offer showcase. */
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

/** Ascends Whisper into `targetHullClass` — see engine/ships.ts's ascendShip and
 * docs/story/research-notes-ship-ascension.md. Silently no-ops if the requirements
 * aren't actually met (defense in depth; the UI should already have this gated). */
export function ascendShipAction(targetHullClass: HullClassId) {
  const ship = flagship.value;
  if (!ship) return;
  const target = hullClassById(targetHullClass);
  const req = ascensionRequirementsMet(target, ship.level, state.value.resources.originEssence, state.value.flags);
  if (!req.flag || !req.essence || !req.level) return;
  const ascended = ascendShip(ship, targetHullClass);
  state.value = {
    ...state.value,
    ships: [ascended],
    resources: { ...state.value.resources, originEssence: state.value.resources.originEssence - target.essenceCost },
  };
  playSfx("levelUp");
  persist();
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

/** Player direction 2026-08-24: "Every module should be unique. We don't want
 * repeat modules on a ship." Two copies of the same design was never an
 * interesting loadout decision — it was the absence of one. With a 200-module
 * roster the constraint costs the player nothing and forces every socket to be a
 * real choice.
 *
 * Enforced here rather than only in the picker so no path can bypass it: equipping
 * a module whose DESIGN is already fitted elsewhere on the ship swaps the two,
 * which is the behaviour a player expects from dragging one into an occupied
 * loadout — never a silent rejection, and never a duplicate. */
export function equipModule(shipId: string, slotIndex: number, moduleId: string | null) {
  const ships = state.value.ships.map((s) => {
    if (s.id !== shipId) return s;
    const equipped = [...s.equipped];
    if (moduleId) {
      const incomingDef = state.value.modules.find((m) => m.id === moduleId)?.defId;
      const displaced = equipped[slotIndex];
      for (let i = 0; i < equipped.length; i++) {
        if (i === slotIndex) continue;
        const otherId = equipped[i];
        if (!otherId) continue;
        const sameInstance = otherId === moduleId;
        const sameDesign =
          incomingDef !== undefined &&
          state.value.modules.find((m) => m.id === otherId)?.defId === incomingDef;
        if (sameInstance || sameDesign) {
          // Swap rather than blank it: the module already in the target slot takes
          // the vacated socket, so the player doesn't silently lose a fitting.
          equipped[i] = sameInstance ? null : displaced;
        }
      }
    }
    equipped[slotIndex] = moduleId;
    return { ...s, equipped };
  });
  state.value = { ...state.value, ships };
  persist();
}

/** Whether this module's design is already fitted somewhere on the ship (other
 * than `exceptSlot`). Drives the picker's "already fitted" state. */
export function isDesignEquipped(shipId: string, defId: string, exceptSlot?: number): boolean {
  const ship = state.value.ships.find((s) => s.id === shipId);
  if (!ship) return false;
  return ship.equipped.some((id, i) => {
    if (!id || i === exceptSlot) return false;
    return state.value.modules.find((m) => m.id === id)?.defId === defId;
  });
}

/** Section E (2026-08-24 player brief): crew are assigned to a fixed station,
 * not stacked without limit — each of the 4 roles (Helm/Gunner/Engineer/
 * Tactician) is one post, one crew member at a time. Assigning someone new to a
 * role that's already staffed on this ship automatically stands the previous
 * occupant down (a real loadout decision between two crew of the same role, not
 * a free stack) rather than silently rejecting the action or allowing both to
 * stay active. */
export function assignCrew(crewId: string, shipId: string | null) {
  const target = state.value.crew.find((c) => c.id === crewId);
  if (!target) return;
  const targetRole = crewDefById(target.defId).role;
  const crew = state.value.crew.map((c) => {
    if (c.id === crewId) return { ...c, assignedShipId: shipId };
    // Bump whoever else currently holds this role's station on the same ship.
    if (shipId && c.assignedShipId === shipId && crewDefById(c.defId).role === targetRole) {
      return { ...c, assignedShipId: null };
    }
    return c;
  });
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
  // Section A (2026-08-24 player brief): a scripted, guaranteed rarity upgrade —
  // e.g. the "second ship" shipyard beat — not a draw. Whisper is still the only
  // ship (see docs/story/research-notes-ship-ascension.md); this just raises the
  // one-time-fixed quality she was set at game start, exactly once, on a specific
  // story beat's own terms.
  if (scene.grantRarityUpgrade) {
    const ship = flagship.value;
    if (ship) {
      state.value = { ...state.value, ships: [{ ...ship, rarity: scene.grantRarityUpgrade }] };
    }
  }
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
      return { label: localizedScene(scene).chapterTitle, systemId: scene.systemId, systemName: localizedSystemName(system) };
    }
    const gate = findPoiByVictoryFlag(scene.requiredFlag);
    if (gate) {
      return {
        label: t("objective.engage", { poi: localizedPoiName({ id: gate.poiId, name: gate.poiName }) }),
        systemId: gate.system.id,
        systemName: localizedSystemName(gate.system),
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
  /** Hull remaining at the end of the fight, in the ship's own (non-combat-buffed)
   * terms — Combat.tsx divides out its combat-local hullBonus scaling before
   * passing this. Damage taken in a fight you win used to be silently discarded
   * (currentHp was never written back on victory, only on defeat) — undermining any
   * balance/positioning tuning, since nothing you did in a winning fight had a
   * lasting cost. Optional only so existing callers/tests don't break; always pass
   * it from real combat. */
  endingHullPoints?: number,
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
  // Insight Draw: a chance to recover the scarcest resource from a win, giving
  // Insight a repeatable trickle instead of being purely story-gated.
  const insightStacks = equippedEffectStacks("insightDraw");
  if (insightStacks > 0 && Math.random() < Math.min(0.6, 0.2 * insightStacks)) {
    rewards.insight = (rewards.insight ?? 0) + insightStacks;
  }
  // Ember Load's payoff (core-loop redesign #3): fighting under Load pays more,
  // which is the whole reason to opt into it. Applied last so it scales the real
  // total rather than the authored base.
  const loadMult = emberLoadRewardMultiplier(emberLoad());
  if (loadMult > 1) {
    for (const k of Object.keys(rewards) as ResourceType[]) {
      if (rewards[k]) rewards[k] = Math.round(rewards[k]! * loadMult);
    }
  }
  grant(rewards);
  const dropChance = enc.isBoss ? BOSS_BONUS_DROP_CHANCE : BONUS_DROP_CHANCE;
  // Section B: ordinary combat drops are capped at the market ceiling too —
  // otherwise farming trash encounters would quietly out-supply the rift.
  const bonusDrop = Math.random() < dropChance ? drawModule(undefined, { maxRarity: MARKET_MAX_RARITY }) : null;
  if (bonusDrop) state.value = { ...state.value, modules: [...state.value.modules, bonusDrop] };
  let leveledUp = false;
  let newLevel = flagship.value?.level ?? 1;
  if (flagship.value) {
    const before = flagship.value.level;
    const ships = state.value.ships.map((s) => {
      if (s.id !== flagship.value!.id) return s;
      const leveled = applyXp(s, enc.xp);
      if (endingHullPoints === undefined) return leveled;
      return { ...leveled, currentHp: Math.max(1, Math.min(computeMaxHull(leveled), Math.round(endingHullPoints))) };
    });
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

/** Section D (2026-08-24 player brief): boards and captures an enemy Ember
 * Warship — see Combat.tsx's boarding order. `EnemyShipDef` only carries combat
 * stats (name/hull/damage/block/evasion), not a Hull Class or rarity, so this is
 * a reasonable approximation, not a precise reconstruction of "what hull class
 * was this really" — Destroyer-class, Standard rarity, a flat mid-teens level, and
 * neutral rolls, close enough for a ship that's never piloted (only ever gifted
 * or, eventually, fielded in a fleet battle — see the type's own doc comment). */
export function captureShip(enemyName: string): ShipInstance {
  const captured: ShipInstance = {
    id: randomId("captured"),
    hullClass: "destroyer",
    rarity: "standard",
    aptitude: null,
    scanned: false,
    name: enemyName,
    level: 12,
    xp: 0,
    equipped: [],
    currentHp: 1,
    rolls: { hull: 0.5, power: 0.5, speed: 0.5, evasion: 0.5, crit: 0.5 },
    ascendedFrom: [],
  };
  state.value = { ...state.value, capturedShips: [...state.value.capturedShips, captured] };
  playSfx("draw");
  persist();
  return captured;
}

/** Gifting a captured ship to family/allies — it's never piloted by the player,
 * but it isn't consumed either: it joins the allied fleet and fights alongside
 * Whisper in fleet battles (团战, see EncounterDef.fleetBattle). The resource
 * grant is the immediate political/material payoff of strengthening the House's
 * own standing — see world-bible.md's Warship Supremacy Doctrine. */
export function giftCapturedShip(shipId: string) {
  const ship = state.value.capturedShips.find((s) => s.id === shipId);
  if (!ship) return;
  state.value = {
    ...state.value,
    capturedShips: state.value.capturedShips.filter((s) => s.id !== shipId),
    alliedShips: [...state.value.alliedShips, ship],
  };
  grant({ salvage: 150, sourcePoints: 80 });
  persist();
}

/** Section B (2026-08-24 brief): the Extradimensional Battlefield is the ONLY
 * source of mk4/mk5 modules — the market caps at MARKET_MAX_RARITY and ordinary
 * combat drops are capped there too. The floor scales with how deep the run got
 * (see riftDropRarityFloor), so depth buys gear quality, not just resources. */
export function grantRiftDrop(deepestDepth: number): ModuleInstance {
  const drop = drawModule(undefined, { minRarity: riftDropRarityFloor(deepestDepth) });
  state.value = { ...state.value, modules: [...state.value.modules, drop] };
  playSfx("draw");
  persist();
  return drop;
}

/** Spends Alloy to raise one owned module a level (docs/systems-design.md: Alloy
 * is always "make something you already have better"). No-ops if the module is
 * already at its rarity's cap or the player can't afford it — defense in depth;
 * the UI gates both already. */
export function upgradeModule(moduleId: string): boolean {
  const mod = state.value.modules.find((m) => m.id === moduleId);
  if (!mod || isModuleMaxed(mod)) return false;
  const cost = moduleUpgradeCost(mod);
  if (state.value.resources.alloy < cost) return false;
  const modules = state.value.modules.map((m) => (m.id === moduleId ? levelUpModule(m) : m));
  state.value = {
    ...state.value,
    modules,
    resources: { ...state.value.resources, alloy: state.value.resources.alloy - cost },
  };
  playSfx("levelUp");
  persist();
  return true;
}

export function repairFlagship() {
  if (!flagship.value) return;
  const shipId = flagship.value.id;
  // effectiveMaxHull, not the bare computeMaxHull — otherwise a ship with Unit
  // 7-Requiem's +15% max-hull passive would show "repaired" while still short of
  // the bar's own endpoint, since every other screen displays effectiveMaxHull.
  const ships = state.value.ships.map((s) => (s.id === shipId ? { ...s, currentHp: effectiveMaxHull(s) } : s));
  state.value = { ...state.value, ships };
  persist();
}
