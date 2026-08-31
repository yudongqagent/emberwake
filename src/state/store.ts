import { signal, computed } from "@preact/signals";
import type { GameState } from "../engine/save";
import { createInitialState, loadGame, saveGame } from "../engine/save";
import type { ResourceType, StoryScene, GalaxyDef, SystemDef, Poi, ModuleInstance, HullClassId, HullClassDef, ShipInstance, FactionId } from "../data/types";
import { fabricatorCost, MARKET_MAX_RARITY, moduleDefById } from "../data/modules";
import { hullClassById, ascensionRequirementsMet, HULL_CLASSES } from "../data/hullClasses";
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
import { STANDING_SCENES } from "../data/story/standing";
import { encounterById } from "../data/encounters";
import { isHunterId, hunterEncounterId } from "../data/hunters";
import type { StoryContext } from "../data/story/reactive";
import { localizedSystemName, localizedPoiName } from "../i18n/data";
import { localizedScene } from "../i18n/story";
import { t } from "../i18n/strings";
import { CREW_DEFS, crewDefById } from "../data/crew";
import { applyXp, computeMaxHull, ascendShip } from "../engine/ships";
import { drawModule, riftDropRarityFloor, levelUpModule, moduleUpgradeCost, isModuleMaxed } from "../engine/modules";
import type { DraftOption } from "../data/draft";
import { totalEmberLoad, emberLoadRewardMultiplier } from "../data/emberLoad";
import { CHOICE_REPUTATION, clampRep, repEffects, isDiplomatic, DIPLOMATIC_FACTIONS, REP_PER_KILL, type RepEffects } from "../data/reputation";
import { canEvolve, evolveModule } from "../data/evolutions";
import { sigilBonus, sigilUpgradeCost, sigilsForDive, type SigilNodeId } from "../data/sigils";
import { setPermanentBonusSource } from "../engine/permanent";
import { CREW_ALLEGIANCE, APPROVAL_FROM_REPUTATION, APPROVAL_PER_WIN, APPROVAL_PER_LOSS, clampApproval, approvalEffects, type ApprovalEffects } from "../data/crewApproval";
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
// 立场戏排在主线之后:availableScene 取的是第一个满足条件的场景,主线优先,
// 免得一场角色戏把玩家正在追的那条线顶掉。
export const STORY_SCENES: StoryScene[] = [...ACT1_SCENES, ...ACT2_SCENES, ...ACT3_SCENES, ...ACT4_SCENES, ...ACT5_SCENES, ...ACT6_SCENES, ...STANDING_SCENES];

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
  } else if (opt.kind === "pact" && opt.pactId) {
    next.sortiePacts = [...next.sortiePacts, opt.pactId];
  }
  state.value = next;
  persist();
  playSfx("draw");
}

/** Boons last until the ship docks — that's what makes docking a decision rather
 * than a free reset, and what keeps a good run's momentum meaningful. */
/** Total Ember Load in force: what the flagship's ascensions impose, plus what
 * the player has opted into. */
/** Core-loop redesign #4: evolve a maxed weapon that has its partner effect
 * equipped. Free — the cost was getting the weapon to its cap and giving up a
 * socket to the partner. */
export function evolveEquippedModule(moduleId: string): boolean {
  const ship = flagship.value;
  if (!ship) return false;
  const mod = state.value.modules.find((m) => m.id === moduleId);
  if (!mod) return false;
  const equipped = ship.equipped
    .map((id) => state.value.modules.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => !!m);
  if (!canEvolve(mod, equipped)) return false;
  state.value = {
    ...state.value,
    modules: state.value.modules.map((m) => (m.id === moduleId ? evolveModule(m) : m)),
  };
  persist();
  playSfx("victory");
  return true;
}

export function emberLoad(): number {
  const ship = flagship.value;
  return totalEmberLoad(ship?.ascendedFrom.length ?? 0, state.value.voluntaryLoad) + regionThreatLoad();
}

/** Open-world redesign: the region's own danger, expressed as Ember Load.
 *
 * This is what replaces the unlock chain. Every region is reachable from the
 * first minute; the far ones are simply lethal until you're ready for them. The
 * home region contributes nothing, so early play is unchanged.
 *
 * Offset by how far the ship has come, so a region stops being frightening once
 * you've outgrown it rather than scaling with you forever — an open world has to
 * let you come back and feel the difference. */
export function regionThreatLoad(): number {
  const galaxy = currentGalaxy.value;
  const ship = flagship.value;
  const threat = (galaxy?.threat ?? 1) - 1;
  const outgrown = Math.floor((ship?.level ?? 1) / 9) + (ship?.ascendedFrom.length ?? 0);
  return Math.max(0, threat - outgrown);
}

/** How far above the player this region is, for the map warning. 0 means "this
 * is where you belong right now". */
export function regionDangerGap(galaxyThreat: number): number {
  const ship = flagship.value;
  const outgrown = Math.floor((ship?.level ?? 1) / 9) + (ship?.ascendedFrom.length ?? 0);
  return Math.max(0, (galaxyThreat - 1) - outgrown);
}

export function setVoluntaryLoad(n: number): void {
  state.value = { ...state.value, voluntaryLoad: Math.max(0, Math.min(10, Math.round(n))) };
  persist();
}

export function clearSortieBoons(): void {
  // 刻印「决意」:每次离港自带的增益。清空之后立刻补上,所以它是"每次出击的起点
  // 更高",而不是"多一次性的好处"。
  const free = startingBoons();
  if (state.value.sortieBoons.length === 0 && state.value.sortiePacts.length === 0 && free.length === 0) return;
  // 契约和增益同寿:都持续到回港。
  state.value = { ...state.value, sortieBoons: free, sortiePacts: [] };
  persist();
}

/** 刻印「决意」发的开局增益。从已实现的效果里挑,和 Refit Draft 用同一套管线。 */
const RESOLVE_BOONS = ["coolant", "hullBonus"];
export function startingBoons(): string[] {
  const n = Math.min(RESOLVE_BOONS.length, sigilBonusOf("resolve"));
  return RESOLVE_BOONS.slice(0, n);
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
  // 声望:剧情选择在这里兑现。这是那 16 个"死 flag"复活的地方——它们一直被写进
  // 存档,只是从前没有任何代码读。
  applyChoiceReputation(flags);
  checkNamedCrewUnlocks();
}

/** 把刚设置的 flag 里带声望后果的部分结算掉。 */
function applyChoiceReputation(flags: string[]) {
  const rep = { ...state.value.reputation };
  const repDelta: Partial<Record<FactionId, number>> = {};
  let changed = false;
  for (const f of flags) {
    const deltas = CHOICE_REPUTATION[f];
    if (!deltas) continue;
    for (const [fac, d] of Object.entries(deltas)) {
      const k = fac as FactionId;
      rep[k] = clampRep((rep[k] ?? 0) + (d ?? 0));
      repDelta[k] = (repDelta[k] ?? 0) + (d ?? 0);
      changed = true;
    }
  }
  if (!changed) return;
  // 船员就在你船上,他们知道你为他们那一派做了什么、又卖了什么。
  // 直接从声望变化换算,而不是再维护一张平行的表——两张表迟早会对不上,
  // 而那种不一致不报错,只会让玩家觉得游戏的反应莫名其妙。
  const crew = state.value.crew.map((c) => {
    const side = CREW_ALLEGIANCE[c.defId];
    const d = side ? repDelta[side] : undefined;
    if (!d) return c;
    return { ...c, approval: clampApproval(c.approval + d * APPROVAL_FROM_REPUTATION) };
  });
  state.value = { ...state.value, reputation: rep, crew };
}

/** 支持度:带着谁打赢,谁就更信你;打输了,信任掉得比涨得快。
 *
 * 只动**派在这条船上**的人。没上船的人不知道刚才发生了什么。 */
export function adjustAssignedCrewApproval(delta: number): void {
  const shipId = flagship.value?.id;
  if (!shipId || delta === 0) return;
  let changed = false;
  const crew = state.value.crew.map((c) => {
    if (c.assignedShipId !== shipId) return c;
    const next = clampApproval(c.approval + delta);
    if (next === c.approval) return c;
    changed = true;
    return { ...c, approval: next };
  });
  if (changed) state.value = { ...state.value, crew };
}

/** 某个船员当前的支持度效果。没派上船的人按中间档算。 */
export function approvalEffectsFor(crewInstanceId: string): ApprovalEffects {
  const c = state.value.crew.find((x) => x.id === crewInstanceId);
  return approvalEffects(c?.approval ?? 50);
}

export function reputationOf(faction: FactionId): number {
  return state.value.reputation[faction] ?? 0;
}

/** 声望带来的实际效果。不讲道理的派系(虫群/构装体/空壳/裂隙)永远是中立值。 */
export function effectsFor(faction: FactionId): RepEffects {
  if (!isDiplomatic(faction)) return repEffects(0);
  return repEffects(reputationOf(faction));
}

/** 改动声望并存盘。delta 可正可负。 */
export function adjustReputation(faction: FactionId, delta: number): void {
  if (!isDiplomatic(faction) || delta === 0) return;
  const rep = { ...state.value.reputation };
  rep[faction] = clampRep((rep[faction] ?? 0) + delta);
  state.value = { ...state.value, reputation: rep };
  persist();
}

/** 面对余烬身世的三种反应,改的是余烬对你的信任,不是外部势力。 */
export function adjustCinderTrust(delta: number): void {
  state.value = { ...state.value, cinderTrust: Math.max(-3, Math.min(3, state.value.cinderTrust + delta)) };
  persist();
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

/** 一个星系里实际存在的目标 = 作者写死的那些 + 声望招来的猎杀队。
 *
 * 猎杀队不写进星区数据,因为它们的存在取决于存档里的声望,而星区数据是静态的。
 * 敌对(<= -50)时,那个派系控制的每个星系都会多出一队冲你来的船。
 *
 * 位置用星系 id 做哈希算出来,所以同一个星系里猎杀队永远在同一个地方——玩家能
 * 记住"那边有埋伏",而不是每次进来都被随机糊一脸。 */
export function systemPois(system: SystemDef, galaxy: GalaxyDef): Poi[] {
  const f = system.controllingFaction;
  if (!f || !isDiplomatic(f) || !effectsFor(f).huntsYou) return system.pois;
  let h = 0;
  for (let i = 0; i < system.id.length; i++) h = (h * 31 + system.id.charCodeAt(i)) >>> 0;
  return [
    ...system.pois,
    {
      id: `hunter:${system.id}`,
      kind: "patrol",
      name: t("rep.hunterPatrol", { faction: t(`faction.${f}`) }),
      x: 180 + (h % 620),
      y: 120 + ((h >> 8) % 340),
      radius: 95,
      // 清掉之后过几分钟他们会再派一队来——只要你还是敌对。
      data: { encounterId: hunterEncounterId(f, galaxy.threat), respawnSeconds: 240 },
    },
  ];
}

/** 当前星系归谁管。中立星系(controllingFaction 为 null)和不讲道理的派系都返回 null。 */
export function stationOwner(): FactionId | null {
  const f = currentSystem.value.controllingFaction;
  return f && isDiplomatic(f) ? f : null;
}

/** 站点标价。声望的第一个摸得着的后果:得罪谁,就在谁的地盘上多掏钱。
 *
 * 刻意不做成"敌对方拒绝交易"。那样只是把一家店关掉,玩家绕开就行;多掏 60%
 * 是每次点下去都会疼一下的东西。 */
export function stationPrice(base: number): number {
  const f = stationOwner();
  if (!f) return base;
  return Math.max(1, Math.round(base * effectsFor(f).priceMultiplier));
}

/** 给"会看玩家的剧情"用的快照 (data/story/reactive.ts)。
 *
 * 单独拎出来是为了让那批条件可以纯函数测试——把 when() 写成直接摸 signal 的形式,
 * 就再也没法在测试里构造"重铸过四次、跟公国敌对"的玩家了。 */
export function storyContext(): StoryContext {
  const ship = flagship.value;
  return {
    level: ship?.level ?? 1,
    ascensions: ship?.ascendedFrom.length ?? 0,
    hullClassName: ship ? hullClassById(ship.hullClass).name : "",
    reputation: state.value.reputation,
    cinderTrust: state.value.cinderTrust,
    alliedShips: state.value.alliedShips.length,
    capturedShips: state.value.capturedShips.length,
    voluntaryLoad: state.value.voluntaryLoad,
    flags: state.value.flags,
  };
}

/** 余烬刻印(data/sigils.ts):跨越整局的永久成长。
 *
 * 每一个节点都必须在下面某个地方真的被读——一个买得到却没人消费的升级,和之前
 * 那 16 个死 flag、死掉的 approval、死掉的 lockedTraitSlot 是同一种东西。
 * sigils.test.ts 里有一条会遍历全部节点,确认它们都被接上了。 */
/** engine/ 侧的纯函数通过这个取值函数读永久加成(见 engine/permanent.ts)。
 *
 * 注册一个函数、而不是推一份快照:注册时不读任何东西,真正读是在渲染时。这样就
 * 不存在"买了升级但要刷新页面才生效"的同步遗漏,也不存在模块初始化顺序的坑。 */
setPermanentBonusSource(() => state.value.sigilRanks);

export function sigilRank(id: SigilNodeId): number {
  return state.value.sigilRanks[id] ?? 0;
}

export function sigilBonusOf(id: SigilNodeId): number {
  return sigilBonus(state.value.sigilRanks, id);
}

/** 一次深潜结束时结算刻印,并更新最深纪录。 */
export function bankDive(depth: number): { earned: number; newRecord: boolean } {
  const best = state.value.deepestDive;
  const earned = sigilsForDive(depth, best);
  const newRecord = depth > best;
  state.value = {
    ...state.value,
    sigils: state.value.sigils + earned,
    deepestDive: Math.max(best, depth),
  };
  persist();
  return { earned, newRecord };
}

export function buySigilRank(id: SigilNodeId): boolean {
  const rank = sigilRank(id);
  const cost = sigilUpgradeCost(id, rank);
  if (cost === null || state.value.sigils < cost) return false;
  state.value = {
    ...state.value,
    sigils: state.value.sigils - cost,
    sigilRanks: { ...state.value.sigilRanks, [id]: rank + 1 },
  };
  persist();
  return true;
}

/** 结算一个星图事件的结果(data/events.ts)。
 *
 * 集中在 store 里,而不是让 App 去拼 setFlags + setPoiRuntime + grant + 改船体
 * 四件事:那样每加一种结果类型都要改两个地方,而两个地方迟早对不上。 */
export function resolveEventOutcome(
  eventId: string,
  poiId: string,
  outcome: {
    resources?: Partial<Record<ResourceType, number>>;
    hull?: number;
    reputation?: Partial<Record<FactionId, number>>;
  },
): void {
  // 同一个事件只发生一次。可以反复刷的"选择"不是选择,是刷子。
  setFlags([`event.${eventId}.done`]);
  setPoiRuntime(poiId, { cleared: true, clearedAt: Date.now() });
  if (outcome.resources) {
    const gain: Partial<Record<ResourceType, number>> = {};
    const cost: Partial<Record<ResourceType, number>> = {};
    for (const [k, v] of Object.entries(outcome.resources)) {
      if (!v) continue;
      if (v > 0) gain[k as ResourceType] = v;
      // 扣不出来就扣到零为止——事件不该把玩家推进负数。
      else cost[k as ResourceType] = Math.min(-v, state.value.resources[k as ResourceType]);
    }
    if (Object.keys(gain).length) grant(gain);
    if (Object.keys(cost).length) spend(cost);
  }
  if (outcome.hull) {
    const ship = flagship.value;
    if (ship) {
      const next = Math.max(1, Math.min(effectiveMaxHull(ship), ship.currentHp + outcome.hull));
      state.value = {
        ...state.value,
        ships: state.value.ships.map((sh) => (sh.id === ship.id ? { ...sh, currentHp: next } : sh)),
      };
    }
  }
  if (outcome.reputation) {
    for (const [f, v] of Object.entries(outcome.reputation)) adjustReputation(f as FactionId, v!);
  }
  persist();
}

/** 记下"这个战斗控件的解锁提示已经给过了"(data/combatUnlocks.ts)。 */
export function markUnlockSeen(id: string): void {
  const key = `unlockSeen.${id}`;
  if (state.value.flags[key]) return;
  state.value = { ...state.value, flags: { ...state.value.flags, [key]: true } };
  persist();
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

/** Whether a scene's progress gates are met (open-world redesign). A scene with
 * neither gate set behaves exactly as before, so this is additive. */
export function sceneProgressMet(sc: StoryScene): boolean {
  const ship = flagship.value;
  if (sc.requiresAscensions !== undefined && (ship?.ascendedFrom.length ?? 0) < sc.requiresAscensions) return false;
  if (sc.requiresLevel !== undefined && (ship?.level ?? 1) < sc.requiresLevel) return false;
  if (sc.requiresStanding) {
    const v = reputationOf(sc.requiresStanding.faction);
    if (sc.requiresStanding.min !== undefined && v < sc.requiresStanding.min) return false;
    if (sc.requiresStanding.max !== undefined && v > sc.requiresStanding.max) return false;
  }
  return true;
}

export function availableScene(systemId: string): StoryScene | null {
  return (
    STORY_SCENES.find(
      (sc) =>
        sc.systemId === systemId &&
        (sc.requiredFlag === null || hasFlag(sc.requiredFlag)) &&
        sceneProgressMet(sc) &&
        !hasFlag(sc.hiddenAfterFlag),
    ) ?? null
  );
}

/** 这一幕结束时,有哪些舰级刚刚解锁。
 *
 * 从 hullClasses 的 unlockFlag 反推,而**不是**读场景上那个 `unlockHullClass`
 * 字段——那个字段五处声明、零处读取(2026-08-30 扫出来的死字段),而且它一处只
 * 写得下一个舰级,实际上好几个解锁 flag 一次开两条线。两份真相里,能自动对上的
 * 那一份才是真的。 */
export function hullClassesUnlockedBy(flags: string[]): HullClassDef[] {
  const before = state.value.flags;
  return HULL_CLASSES.filter(
    (h) => h.unlockFlag !== null && flags.includes(h.unlockFlag) && !before[h.unlockFlag],
  );
}

/** 刚刚解锁、还没被玩家看过的舰级。剧情结束后弹一次。 */
export const pendingHullUnlocks = signal<HullClassDef[]>([]);

export function completeScene(scene: StoryScene) {
  // 必须在 setFlags 之前算——setFlags 之后 flag 已经写进去了,"之前没有"就判不出来了。
  const unlocked = hullClassesUnlockedBy(scene.onCompleteFlags);
  setFlags(scene.onCompleteFlags);
  // 整个游戏最大的进度事件从前是**静悄悄**发生的:剧情演完,新舰级就那么出现在
  // 进阶页里,没有任何人告诉玩家。
  if (unlocked.length > 0) pendingHullUnlocks.value = unlocked;
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
    // Open-world redesign: never point the player at a beat their ship isn't
    // ready for. Without this the marker would send them somewhere nothing
    // happens, which is worse than no marker at all.
    if (!sceneProgressMet(scene)) continue;
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
  // 打谁,谁记仇 (docs/story-engagement-analysis.md)。这让"去哪儿打"变成有后果的
  // 选择,而不只是刷哪张地图的问题。
  //
  // 遭遇自带 `reputation` 时以它为准——赏金必须这样,因为赏金的 faction 是**目标**
  // 的派系,套默认规则会变成"清掉掠夺者让掠夺者更喜欢你"。
  //
  // 找上门的猎杀队(hunt:*)刻意不改任何声望:敌对方主动来打你,自卫再扣分就成了
  // 一个爬不出来的坑,而声望的意义恰恰是给玩家可以扭转的东西。
  // 带着他打赢仗,他就更信你一点。数值很小,靠一路打下去累积。
  adjustAssignedCrewApproval(APPROVAL_PER_WIN);

  if (enc.reputation) {
    for (const [f, d] of Object.entries(enc.reputation)) adjustReputation(f as FactionId, d!);
  } else if (isDiplomatic(enc.faction) && !isHunterId(enc.id)) {
    adjustReputation(enc.faction, REP_PER_KILL * enc.enemies.length);
  }

  // Ember Load's payoff (core-loop redesign #3): fighting under Load pays more,
  // which is the whole reason to opt into it. Applied last so it scales the real
  // total rather than the authored base.
  // emberLoad() now includes the region's threat, so a fight in a region above
  // your ship pays proportionally more. That temptation is the point of an open
  // world — without it, "go anywhere" just means the map is bigger.
  // 盟友会分你战利品——声望的第二个摸得着的好处。只算**没在跟你打**的那些盟友:
  // 正在被你围攻的一方不会同时给你分成。
  const allyShare = Math.max(0, ...DIPLOMATIC_FACTIONS
    .filter((f) => f !== enc.faction)
    .map((f) => effectsFor(f).rewardBonus));
  const loadMult = emberLoadRewardMultiplier(emberLoad()) * (1 + allyShare);
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
      // 经验也吃余烬负荷。
      //
      // 2026-08-30:从前只有资源吃 loadMult,经验拿的是遭遇表上的原始值。
      // 于是"去更危险的地方,赚得更多"这条循环给的是材料而**不是等级**,
      // 而等级恰恰是最高舰级(55 级)唯一的门槛。量出来的结果:整个战役的
      // 全部经验之和是 6,782,而 55 级需要 39,285——战役的 5.8 倍。
      // 打完剧情之后,唯一的出路是刷 164 场悬赏,或者反复深潜裂隙。
      //
      // 负荷本来的承诺就是"更难的仗付得更多"。等级也是一种报酬。
      const leveled = applyXp(s, Math.round(enc.xp * loadMult));
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
  adjustAssignedCrewApproval(APPROVAL_PER_LOSS);
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
