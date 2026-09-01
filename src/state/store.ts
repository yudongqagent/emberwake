import { signal, computed } from "@preact/signals";
import type { GameState } from "../engine/save";
import { createInitialState, loadGame, saveGame } from "../engine/save";
import type { ResourceType, StoryScene, GalaxyDef, SystemDef, Poi, ModuleInstance, ModuleType, HullClassId, HullClassDef, ShipInstance, FactionId } from "../data/types";
import { fabricatorCost, MARKET_MAX_RARITY, moduleDefById, MODULE_RARITY_ORDER } from "../data/modules";
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
import { applyXp, computeMaxHull, ascendShip, reforgeShip, scanShip, computeBaseEvasion, computeBaseCritChance, computeSpeed } from "../engine/ships";
import { drawModule, riftDropRarityFloor, levelUpModule, moduleUpgradeCost, isModuleMaxed, benchmarkFor, computeModuleBlock, computeModuleEvasion, computeModuleThrust } from "../engine/modules";
import { MAX_BLOCK_FRACTION, effectiveEvasion } from "../engine/combat";
import type { DraftOption } from "../data/draft";
import { totalEmberLoad, emberLoadRewardMultiplier } from "../data/emberLoad";
import { CHOICE_REPUTATION, CHOICE_CINDER_TRUST, clampRep, repEffects, repTier, isDiplomatic, DIPLOMATIC_FACTIONS, REP_PER_KILL, type RepEffects } from "../data/reputation";
import { canEvolve, evolveModule, evolutionPartnerMatch } from "../data/evolutions";
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
    // 抽到的模组如果有对应的空槽,直接装上(和 receiveModule 同一条规则;
    // 这里不能直接调它,因为整备抉择要在同一个 next 快照里一起结算 hullCost)。
    //
    // 实测(2026-08-30):抉择给你一件装备,**下一屏就是"继续推进还是撤离"**,中间
    // 没有任何装配的机会——于是那件装备在这次出击里完全是死的。搜到的原则是
    // 「奖励应当立即兑现,否则玩家会觉得刚才做的事没有意义」:杀戮尖塔的牌进牌库
    // 立刻能抽到,哈迪斯的祝福当场生效。
    //
    // 只填**空槽**。换掉已装备的那件是有取舍的决定(词条、门派套装、功率),
    // 不该由游戏替玩家做——那种情况留给出击间隙新加的配装入口。
    const ship = next.ships.find((sh) => sh.id === next.flagshipId);
    if (ship) {
      const fitted = autoEquip(ship, opt.module);
      if (fitted !== ship) next.ships = next.ships.map((sh) => (sh.id === ship.id ? fitted : sh));
    }
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
  // "长大了就不再怕"是对**老星区**说的——回头路过时该感觉到自己变强了。但它原来
  // 不分老新地一律相减,于是 55 级玩家在威胁 7 的合唱深域拿到的负荷是 **0**,
  // 和新手村完全一样(2026-08-31 实测)。整个游戏最深的地方不该有被彻底走过头的
  // 那一天。留一条随威胁升高的地板:老星区的地板很低,前沿星区永远压着你一点。
  const floor = Math.ceil(threat * 0.4);
  return Math.max(floor, threat - outgrown);
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
  applyChoiceCinderTrust(flags);
  checkNamedCrewUnlocks();
}

/** 刚发生、还没告诉玩家的立场变化。
 *
 * 2026-08-31(/loop 第 42 轮)。applyChoiceReputation 算出 repDelta,拿它改了声望
 * **和船员支持度**,然后把它丢掉——**一个字都不说**。
 *
 * 而这些选择很重:arthaineResolution.formal 一次是 **洋紫荆 −40**,而敌对的阈值
 * 是 −50(他们的巡逻队会来找你、市场对你关闭)。一个对话选项就能把你从中立推到
 * 敌对边上,玩家事后完全不知道发生过什么。
 *
 * 搜到的原话:「玩家做出一个得罪某派系的对话选择时,是在毫不知情的情况下给自己
 * 树敌」。 */
export interface StandingChange {
  faction: FactionId;
  delta: number;
  before: number;
  after: number;
  tierChanged: boolean;
}
export const pendingStandingChange = signal<{ standings: StandingChange[]; crew: { defId: string; delta: number }[] }>({ standings: [], crew: [] });

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
  const crewMoved: { defId: string; delta: number }[] = [];
  const crew = state.value.crew.map((c) => {
    const side = CREW_ALLEGIANCE[c.defId];
    const d = side ? repDelta[side] : undefined;
    if (!d) return c;
    const next = clampApproval(c.approval + d * APPROVAL_FROM_REPUTATION);
    if (next !== c.approval) crewMoved.push({ defId: c.defId, delta: next - c.approval });
    return { ...c, approval: next };
  });
  state.value = { ...state.value, reputation: rep, crew };

  // 把这次变动摆到玩家面前。分档变了要单独点出来——那才是价格、盟友、猎杀队
  // 真正切换的时刻。
  const standings: StandingChange[] = (Object.entries(repDelta) as [FactionId, number][])
    .filter(([, d]) => d !== 0)
    .map(([faction, delta]) => {
      const after = rep[faction] ?? 0;
      const before = after - delta;
      return { faction, delta, before, after, tierChanged: repTier(before) !== repTier(after) };
    });
  if (standings.length > 0) pendingStandingChange.value = { standings, crew: crewMoved };
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
/** 战斗带来的声望漂移。
 *
 * 漂移本身是设计(REP_PER_KILL 的注释:「一次遭遇不该毁掉一段关系,但一路杀过去
 * 应该」)。问题是它**在咬人之前完全看不见**——2026-08-31(/loop 第 43 轮)实测:
 *
 *   7 个可重复刷的悬赏属于可外交派系。刷 bountyReaverRemnants(2 艘)每次 −6,
 *   **九次**就把掠夺者从中立推到敌对——而敌对意味着他们的巡逻队会来找你、
 *   市场对你关闭(repEffects,第 37 轮验过全部真的生效)。
 *
 * 悬赏是游戏自己设计来反复刷的(它们有 respawnSeconds)。于是玩家照着游戏的指引
 * 刷资源,某一刻突然被追杀,而中间没有任何一步提示过他。
 *
 * 所以不是每次都吭声——每场仗弹一次是噪音——而是**跨档的那一刻**才说。那正是
 * 价格、盟友、猎杀队真正切换的时刻。 */
export function adjustReputation(faction: FactionId, delta: number): void {
  if (!isDiplomatic(faction) || delta === 0) return;
  const rep = { ...state.value.reputation };
  const before = rep[faction] ?? 0;
  const after = clampRep(before + delta);
  rep[faction] = after;
  state.value = { ...state.value, reputation: rep };
  if (repTier(before) !== repTier(after)) {
    // 同一次结算里可能有多个派系变档(遭遇自带的 reputation 表),所以是累加不是覆盖。
    const prev = pendingStandingChange.value;
    pendingStandingChange.value = {
      standings: [...prev.standings, { faction, delta, before, after, tierChanged: true }],
      crew: prev.crew,
    };
  }
  persist();
}

/** 把剧情选择里改余烬信任的那部分结算掉(data/reputation.ts 的 CHOICE_CINDER_TRUST)。
 *
 * **刻意不弹卡。** 声望和船员支持度必须摆出来,因为它们改的是价格、猎杀队、被动
 * 强度——玩家不看见就没法推理。而余烬信任只改她说什么话:它的回报本来就是"她
 * 对你说话的方式变了",把它变成一个数字弹在屏幕上,反而把这件事说小了。 */
function applyChoiceCinderTrust(flags: string[]) {
  let delta = 0;
  for (const f of flags) delta += CHOICE_CINDER_TRUST[f] ?? 0;
  if (delta !== 0) adjustCinderTrust(delta);
}

/** 面对余烬身世的三种反应,改的是余烬对你的信任,不是外部势力。 */
export function adjustCinderTrust(delta: number): void {
  state.value = { ...state.value, cinderTrust: Math.max(-3, Math.min(3, state.value.cinderTrust + delta)) };
  persist();
}

/** 刚入列、还没告诉玩家的具名船员。
 *
 * 2026-08-31(/loop 第 41 轮)。具名船员(7 人,含全部 3 名传奇)在剧情 flag 满足时
 * **静悄悄**加进名册——没有任何提示。而新舰级解锁是有整屏提示卡的
 * (pendingHullUnlocks / HullUnlockToast),同一类事件,两种待遇。
 *
 * 再叠上第 40 轮查出来的那条:新入列的人默认**不上岗**,支持度因此冻在 50,被动
 * 停在 ×1.0。于是一个传奇船员可以从入列到通关全程躺在名册里,玩家既不知道他来了,
 * 也不知道要把他放上岗位。 */
export const pendingCrewUnlocks = signal<typeof CREW_DEFS>([]);

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
  pendingCrewUnlocks.value = toAdd;
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

/** 把一件模组装进**对应类型的第一个空槽**;没有空槽就原样返回。
 *
 * 拆成纯函数是为了能测:这条规则有两半,而两半都容易写错——"有空槽要装上"和
 * "槽位占着就别动"。后者尤其重要:换掉已装备的那件是有取舍的决定(词条、门派套装、
 * 功率),不该由游戏替玩家做。 */
export function autoEquip(ship: ShipInstance, mod: ModuleInstance): ShipInstance {
  const def = moduleDefById(mod.defId);
  const layout = hullClassById(ship.hullClass).slots;
  let idx = 0;
  for (const type of ["weapon", "armor", "engine", "utility"] as const) {
    for (let i = 0; i < layout[type]; i++, idx++) {
      if (type === def.type && !ship.equipped[idx]) {
        const equipped = [...ship.equipped];
        equipped[idx] = mod.id;
        return { ...ship, equipped };
      }
    }
  }
  return ship;
}

/** 库存里**能直接装进空槽**的模组,按"最好的先装"排序,返回 {模组 id → 槽位号}。
 *
 * 2026-08-31 实测(/loop 第 18 轮)。55 级存档打开模组页:
 *
 *     功率负载 3/256      武器 ×10 全空      装甲 ×8 全空
 *     库存——8 件未装备    3 把 MK5 武器 / 2 件 MK5 装甲 躺在包里
 *     一键出售 4 件重复模组 — +1700   ← 面板最显眼的动作
 *
 * 也就是说:玩家一门炮都没装,而游戏唯一主动建议他做的事是**把 MK5 卖掉**。
 * 库存列表里每件模组旁边只有「出售」一个按钮,压根没有「装配」——要装得自己
 * 去槽位那边一个个点。上一轮我看到裂隙里打不死敌人,归因给了相位偏移;真实
 * 原因是这艘船没有武器。
 *
 * 这条只填**空槽**,永不顶掉已装备的东西——换掉在装的那件牵涉词条、门派套装、
 * 功率预算,是有取舍的决定,和 autoEquip 同一条原则。同一个设计不会装两次
 * (equipModule 本来就按设计去重),所以批内也要记账。 */
export function pendingFits(ship: ShipInstance, inventory: ModuleInstance[]): { moduleId: string; slotIndex: number }[] {
  const layout = hullClassById(ship.hullClass).slots;
  const slotType: ModuleType[] = [];
  for (const type of ["weapon", "armor", "engine", "utility"] as const) {
    for (let i = 0; i < layout[type]; i++) slotType.push(type);
  }
  const taken = new Set<number>();
  const designs = new Set<string>();
  ship.equipped.forEach((id, i) => {
    if (!id) return;
    taken.add(i);
    const d = state.value.modules.find((m) => m.id === id)?.defId;
    if (d) designs.add(d);
  });

  // 好的先装:同类型只有有限的空槽,不能让一件 MK1 抢在 MK5 前面。
  const ranked = [...inventory].sort((a, b) => {
    const r = MODULE_RARITY_ORDER.indexOf(b.rarity) - MODULE_RARITY_ORDER.indexOf(a.rarity);
    return r !== 0 ? r : b.quality - a.quality;
  });

  const fits: { moduleId: string; slotIndex: number }[] = [];
  for (const mod of ranked) {
    const def = moduleDefById(mod.defId);
    if (designs.has(mod.defId)) continue;
    const slot = slotType.findIndex((type, i) => type === def.type && !taken.has(i));
    if (slot === -1) continue;
    taken.add(slot);
    designs.add(mod.defId);
    fits.push({ moduleId: mod.id, slotIndex: slot });
  }
  return fits;
}

/** 这件候选模组的参照物:旗舰上同类型里最强的那件。身上一件同类都没有时返回 null。
 *
 * 界面层只调这一个东西——benchmarkFor 需要 ship 和实例查找,让每个界面各自去凑,
 * 就是又一次"规则对了但只接了一处"。 */
export function wouldReplace(mod: ModuleInstance): ModuleInstance | null {
  const ship = flagship.value;
  if (!ship) return null;
  return benchmarkFor(ship, mod, (id) => state.value.modules.find((m) => m.id === id));
}

/** 把 pendingFits 算出来的那批一次装上。 */
export function fitAll(shipId: string): number {
  const ship = state.value.ships.find((s) => s.id === shipId);
  if (!ship) return 0;
  const equippedIds = new Set(state.value.ships.flatMap((s) => s.equipped).filter(Boolean) as string[]);
  const fits = pendingFits(ship, state.value.modules.filter((m) => !equippedIds.has(m.id)));
  if (fits.length === 0) return 0;
  const equipped = [...ship.equipped];
  for (const f of fits) equipped[f.slotIndex] = f.moduleId;
  // 空槽在数组末尾时可能是 undefined(旧存档的数组比船体槽位短),补成 null。
  for (let i = 0; i < equipped.length; i++) if (equipped[i] === undefined) equipped[i] = null;
  state.value = {
    ...state.value,
    ships: state.value.ships.map((s) => (s.id === shipId ? { ...s, equipped } : s)),
  };
  persist();
  return fits.length;
}

/** 存下正在进行的深潜,或清掉它。
 *
 * 只在**两波之间**调用——那是唯一安全的存档点:玩家已经清掉了这一波,正在决定
 * 推进还是撤离。战斗中途刷新会退回那一波开始前,那一波重打。 */
export function saveRiftRun(run: GameState["riftRun"]): void {
  state.value = { ...state.value, riftRun: run };
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

/** 事件用尽之后,残骸点还剩下什么。
 *
 * 2026-08-31(/loop 第 39 轮)。全图有 **19 个残骸点**,而星图事件只有 **10 个**,
 * 完成 flag 还是全局的(event.<id>.done)。也就是说玩家探完 10 个之后,剩下 9 个
 * 残骸点飞过去、点「查看」——`if (pool.length === 0) return;`,**什么都不会发生**。
 * 一个点了没反应的 POI,比地图上没有它更糟。
 *
 * 这同时也是洞悉枯竭的一半原因(第 35 轮量到全战役只有 128 点):事件是洞悉仅有的
 * 两个来源之一,而它会用完。
 *
 * 所以这里给一条兜底:拆解。数量按残骸类 POI 的既有量级(30 废料 / 3 洞悉)给,
 * 并且跟着 POI 的重生时间走——它是一条细水,不是刷子。 */
export function scavengeDerelict(poiId: string): Partial<Record<ResourceType, number>> {
  const threat = currentGalaxy.value?.threat ?? 1;
  const rewards: Partial<Record<ResourceType, number>> = {
    salvage: 20 + threat * 10,
    insight: 2 + Math.floor(threat / 2),
  };
  grant(rewards);
  setPoiRuntime(poiId, { cleared: true, clearedAt: Date.now() });
  persist();
  return rewards;
}

export function collectWreck(poiId: string, rewards: Partial<Record<ResourceType, number>>) {
  grant(rewards);
  setPoiRuntime(poiId, { cleared: true, clearedAt: Date.now() });
  persist();
}

/** 收下一件模组:进背包,有对应空槽就顺手装上。
 *
 * 2026-08-31 实测:自动装备原来只做在整备抉择那一条路径上。同一场战斗掉的
 * 「小节推进器 MK2」躺在库存里,而**引擎槽是空的**——玩家赢了一件装备,游戏
 * 把它收进包里就不管了。三条给模组的路径(抉择 / 战斗掉落 / 裂隙掉落)各写各的,
 * 所以修了一条另外两条还是老样子。统一到这里。
 *
 * 商店购买刻意也走这条:玩家花钱买了一件装备,更没有理由让它躺在包里。 */
function receiveModule(mod: ModuleInstance): ModuleInstance {
  let ships = state.value.ships;
  const ship = ships.find((sh) => sh.id === state.value.flagshipId);
  if (ship) {
    const fitted = autoEquip(ship, mod);
    if (fitted !== ship) ships = ships.map((sh) => (sh.id === ship.id ? fitted : sh));
  }
  state.value = { ...state.value, modules: [...state.value.modules, mod], ships };
  return mod;
}

/** Adds an already-rolled module instance the player chose from the Fabricator's
 * offer showcase. */
export function addModule(mod: ModuleInstance) {
  receiveModule(mod);
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
/** 改铸:花精华横向换到同层的另一艘舰级。
 *
 * 这同时补上了精华的第二个去处。实测(第 34 轮):一整趟战役产出 4445 精华,而它
 * 唯一的用途——走完一条完整进阶路线——只要 1590。六次进阶做完之后,精华就**永远
 * 没有任何用处**了,而这是个通关后还继续玩的开放世界。 */
export function reforgeShipAction(targetHullClass: HullClassId) {
  const ship = flagship.value;
  if (!ship) return;
  const target = hullClassById(targetHullClass);
  if (target.order !== hullClassById(ship.hullClass).order) return;
  const req = ascensionRequirementsMet(target, ship.level, state.value.resources.originEssence, state.value.flags);
  if (!req.flag || !req.essence || !req.level) return;
  state.value = {
    ...state.value,
    ships: [reforgeShip(ship, targetHullClass)],
    resources: { ...state.value.resources, originEssence: state.value.resources.originEssence - target.essenceCost },
  };
  playSfx("levelUp");
  persist();
}

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

/** 扫描一条船。
 *
 * 2026-08-31(/loop 第 73 轮)。这里原来**自己重写了一遍**扫描:
 *
 *     return { ...s, scanned: true, aptitude: pickAptitude() };
 *
 * 而 engine/ships.ts 里的 scanShip 才是那条规则的正主——第 50 轮把它改成了
 * "资质在建船时定死,扫描只负责读出来",理由是:资质一旦真的有作用,"扫描时才掷"
 * 就变成一个陷阱(不扫按 B=1.0 算,扫了有 45% 概率掷出 C 或 D 把自己的船变差)。
 *
 * 那次修复落在 scanShip 上,而**没有任何人调用 scanShip**——舰队面板的扫描按钮
 * 走的是这里。于是那条修复从来没有到达游戏实际跑的路径:它照旧在扫描时重掷,
 * 还会覆盖掉 createWhisper 已经定好的资质。
 *
 * 第 50 轮我实测看到"资质 C ×0.8"就认为修好了——那是**旧路径**掷出来的 C。
 * 验的是显示,不是机制。 */
export function scanShipAction(shipId: string) {
  const ships = state.value.ships.map((s) => (s.id === shipId ? scanShip(s) : s));
  state.value = { ...state.value, ships };
  persist();
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

/** 玩家手上(装备的或库存里的)是否已经有这个设计。
 *
 * 和 isDesignEquipped 的区别:那条只看旗舰的槽位,这条看全部家当——抉择卡要回答的
 * 是"这对我来说是新东西吗",而不是"这一件此刻装着吗"。 */
/** 这件候选模组会不会补上某把武器进化所缺的搭档?界面层只调这一个。 */
export function evolutionHintFor(mod: ModuleInstance) {
  return evolutionPartnerMatch(mod, state.value.modules);
}

export function ownsDesign(defId: string): boolean {
  return state.value.modules.some((m) => m.defId === defId);
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
/** 某个 flag 是哪一幕给的?返回那一幕的本地化章节名。
 *
 * 2026-08-31(/loop 第 33 轮)实测:进阶熔炉里的条件行写的是裸标签「剧情进度 ○」,
 * 不说是**哪一段**剧情。第 26 轮我刚把目标条修成会说"去进阶",玩家照着来到这个
 * 面板,撞上第二道墙,依然不知道自己缺什么。
 *
 * 而 unlockFlag(如 act1.tigersReach.cleared)和它对应那一幕的章节名都在数据里
 * 躺着,只是没人把它们接起来。 */
export function sceneTitleForFlag(flag: string): string | null {
  const scene = STORY_SCENES.find(
    (s) => s.hiddenAfterFlag === flag || (s.onCompleteFlags ?? []).includes(flag),
  );
  return scene ? localizedScene(scene).chapterTitle : null;
}

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
  /** 这一步不在星图上,而在某个舰上面板里(目前只有进阶)。 */
  panel?: "ascension";
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

function findPoiById(poiId: string): { system: SystemDef; poi: Poi } | null {
  for (const galaxy of GALAXIES) {
    for (const system of galaxy.systems) {
      for (const poi of system.pois) {
        if (poi.id === poiId) return { system, poi };
      }
    }
  }
  return null;
}

/** 路标上的动词得对得上那个地方是什么。残骸是**拆**的,不是打的——第一版直接
 * 套了战斗用的「迎战{poi}」,于是开场变成「迎战漂流信号」。 */
function objectiveVerb(kind: Poi["kind"]): "objective.engage" | "objective.salvage" | "objective.goto" {
  if (kind === "patrol") return "objective.engage";
  if (kind === "derelict" || kind === "asteroidField") return "objective.salvage";
  return "objective.goto";
}

export function getNextObjective(): Objective | null {
  // 叙事先于路标。一幕如果用台词把玩家指向了某个 POI(StoryScene.pointsAtPoi),
  // 在那件事做完之前,目标条就跟着那句台词走。
  //
  // 2026-08-31 实测:开场幕说「前面星带里有一片残骸,能拆的都拆回来」,而目标条
  // 同时写着「跳转至茶隼歇息地」——游戏的第一分钟给出两条互相矛盾的指令。
  // 只认**最近演完的那一幕**的指向。
  //
  // 第 25 轮我加这段时忘了给它时效:任何演完的幕,只要它指的 POI 还没清掉,就会
  // 一直霸占目标条。而开场那片残骸是可以不去的——不去的玩家会被"拆解漂流信号"
  // 指着走完整局,真正的下一步被它盖住。(2026-08-31 模拟:全部剧情打完之后,
  // 目标条写的还是「拆解漂流信号 @ 苋红星带」。)
  //
  // 演完下一幕就说明玩家已经走过去了,老指向该闭嘴。
  const lastCleared = [...STORY_SCENES].reverse().find((s) => hasFlag(s.hiddenAfterFlag));
  for (const scene of lastCleared ? [lastCleared] : []) {
    if (!scene.pointsAtPoi) continue;
    const found = findPoiById(scene.pointsAtPoi);
    if (!found || poiRuntime(found.poi.id).cleared) continue;
    return {
      label: t(objectiveVerb(found.poi.kind), { poi: localizedPoiName(found.poi) }),
      systemId: found.system.id,
      systemName: localizedSystemName(found.system),
      poiId: found.poi.id,
    };
  }
  for (const scene of STORY_SCENES) {
    if (hasFlag(scene.hiddenAfterFlag)) continue;
    // 剧情推不下去时,要说**为什么**推不下去,而不是跳过它。
    //
    // 原来这里是 `if (!sceneProgressMet(scene)) continue;`,注释写的是"绝不把玩家
    // 指向一个他还没准备好的节点"。但"跳过"并不会让指针停下——它继续往后扫,
    // 于是指向一个**更靠后**的节点。实测(2026-08-31,/loop 第 26 轮):
    //
    //   20 级 / 0 次进阶 / 前两幕已完成
    //   → 目标条:「迎战「虚无」的聚集之地 @ 暗影线」
    //
    // 暗影线是威胁 6 的星区,倒数第二危险的地方。守卫本来是防这个的,结果它
    // 亲手把玩家送了过去。
    //
    // 而且第三幕卡住的原因写在剧情台词里(「Take her up a class」),游戏的路标
    // 却从不提"进阶"两个字——玩家不知道自己缺的是什么。
    if (!sceneProgressMet(scene)) {
      if (scene.requiredFlag !== null && !hasFlag(scene.requiredFlag)) continue;
      const ship = flagship.value;
      const need = scene.requiresAscensions;
      if (need !== undefined && (ship?.ascendedFrom.length ?? 0) < need) {
        const sys = currentSystem.value;
        return {
          label: t("objective.ascend", { n: need - (ship?.ascendedFrom.length ?? 0) }),
          systemId: sys.id,
          systemName: localizedSystemName(sys),
          panel: "ascension",
        };
      }
      if (scene.requiresLevel !== undefined && (ship?.level ?? 1) < scene.requiresLevel) {
        const sys = currentSystem.value;
        return {
          label: t("objective.level", { n: scene.requiresLevel }),
          systemId: sys.id,
          systemName: localizedSystemName(sys),
        };
      }
      continue;
    }
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

/** 一名船员的被动此刻打几折——把支持度算进去。
 *
 * 2026-08-31(/loop 第 36 轮)。船员面板对**每一名**船员都显示「被动 X% · 冷却 Y%」,
 * 而实际上只有走 crewPassive() 的两条战斗被动(铁衡的闪避、拉切的近距伤害)真的
 * 吃这个倍率。其余六条全是写死的 `hasCrewRecruited(id) ? 0.08 : 0`——
 *
 *   奥莉 +8% 合金 · 柯莎 +15% 废料合金 · 普莉雅 +10% 兑换
 *   七号安魂 +15% 最大船体 · 薇拉 +12% 精华 · 通用参谋 +5% 洞悉
 *
 * 于是面板告诉玩家「薇拉 · 忠诚 · 被动 125%」,而她的加成一动不动还是 12%。
 * 支持度那段代码自己的注释写的是「现在它决定被动强度和主动冷却」——没有限定
 * 只算战斗那两条。这是一套只接了四分之一的系统,而它的摆幅是 0.5x–1.5x。
 *
 * 通用招募可以有多份,所以这里是**求和**而不是取一个倍率:两名支持度 100% 的
 * 参谋给 3.0,和 crewCount() 原来的按份叠加是一致的。 */
export function crewPassiveScale(defId: string): number {
  return state.value.crew
    .filter((c) => c.defId === defId)
    .reduce((sum, c) => sum + approvalEffects(c.approval).passiveMultiplier, 0);
}

/** Unit 7-Requiem's "+15% max hull fleet-wide" passive, applied wherever a ship's max
 * hull is shown or used outside of combat (combat applies its own equipment-driven
 * hull bonus on top of this — see Combat.tsx). */
/** 这条船实际的闪避率和实际的机动——**和战斗用的是同一个式子**。
 *
 * 2026-08-31(/loop 第 59 轮)。上一轮把船体上限收成了一个来源,顺着同一条线往下扫,
 * 闪避和速度是一样的病:舰桥和舰队面板显示的是 computeBaseEvasion / computeSpeed,
 * 也就是**只有船自己的随机 roll**,而战斗里真正参与结算的是
 *
 *     闪避  船体 roll + 装备闪避 + 「闪避」词条 + 装甲位的「破盾」+ 舵手船员
 *     机动  computeSpeed × 装备推力(−35% ~ +60%)
 *
 * 实测:我那条船舰桥上写「闪避 0%」,而它装着一台 2.9% 闪避的信使引擎。也就是说
 * 引擎槽整条属性线在船的属性栏里不存在——而"升级引擎到底给了什么"本来就是这个
 * 游戏被抱怨过的老问题(见 engine/modules.ts 的 effectPotency 注释)。
 *
 * 只收**船本身就带着的**那些项。反应堆分配、契约、卡恩的主动技能都是战斗期间的
 * 临时状态,地图上并不存在,留在 Combat 里。
 *
 * 闪避要过一遍 effectiveEvasion 的软硬上限再显示:堆到 45% 的原始值实际只有 34%,
 * 显示原始值就是又一次"写的和用的不是一个数"。 */
export function effectiveShipEvasion(ship: ShipInstance): number {
  if (ship.id !== flagship.value?.id) return computeBaseEvasion(ship);
  const gear = ship.equipped.reduce((sum, id) => {
    const m = id ? state.value.modules.find((x) => x.id === id) : undefined;
    return m ? sum + computeModuleEvasion(m) : sum;
  }, 0) / 100;
  const armorShieldBreak = ship.equipped.filter((id) => {
    const m = id ? state.value.modules.find((x) => x.id === id) : undefined;
    if (!m) return false;
    const d = moduleDefById(m.defId);
    return d.type === "armor" && (d.signature === "shieldBreak" || m.traits.includes("shieldBreak"));
  }).length;
  const raw = computeBaseEvasion(ship)
    + gear
    + 0.05 * equippedEffectStacks("evasion")
    + 0.08 * armorShieldBreak
    + 0.05 * crewCount("recruitHelm");
  return effectiveEvasion(raw);
}

/** 这条船上**每一把**武器的暴击率下限。
 *
 * 2026-08-31(/loop 第 67 轮)。舰桥和舰队显示的是 computeBaseCritChance,也就是
 * 只有船自己的那一项随机 roll。而 computeCritChance 的真实式子是:
 *
 *     min(0.75, **0.08** + 船体 roll + (带「暴击」词条 ? 0.12 : 0) + min(0.2, 连击 × 0.02))
 *
 * 那个 0.08 是**每一把武器都有的底**,而属性栏把它整个漏掉了。实测:我那条船
 * 舰桥上写「暴击 1%」,而它任何一把枪的实际暴击率至少是 **9%**,带词条 21%,
 * 满连击 41%。
 *
 * 差着九倍的后果不只是数字难看:玩家读到"暴击 1%"会合理地断定这条属性没用,
 * 从而永远不选「暴击」词条——而那条词条是 +12 个百分点,在 9% 的底上翻倍还多。
 *
 * 这里给的是**下限**(零连击、不算词条):它对船上每一把武器都成立,所以放在船的
 * 属性栏里是诚实的。词条和连击是每把枪各自的事,写在模组卡上(见 moduleEffects)。 */
export function effectiveShipCrit(ship: ShipInstance): number {
  return Math.min(0.75, 0.08 + computeBaseCritChance(ship));
}

/** 装上装备之后这条船实际跑多快。推力的上下限和 Combat 里那段一致。 */
export function effectiveShipSpeed(ship: ShipInstance): number {
  const base = computeSpeed(ship);
  if (ship.id !== flagship.value?.id) return base;
  const thrust = Math.max(-0.35, Math.min(0.6, ship.equipped.reduce((sum, id) => {
    const m = id ? state.value.modules.find((x) => x.id === id) : undefined;
    return m ? sum + computeModuleThrust(m) : sum;
  }, 0)));
  return Math.round(base * (1 + thrust));
}

/** 船体上限——**战斗内外必须是同一个数**。
 *
 * 2026-08-31(/loop 第 58 轮)。这里原来只加了七号安魂那 15%,而 Combat.tsx 自己算
 * 了另一个:
 *
 *     界面    computeMaxHull × (1 + 0.15 × 七号安魂支持度缩放)
 *     战斗    computeMaxHull × (1 + min(0.6, 0.15×船体模组) + (招募了七号安魂 ? 0.15 : 0)) × 契约倍率
 *
 * 两条互不包含对方那一项:
 *
 *   - **模组「船体」加成(最高 +60%)在界面上完全不存在**。装四件船体模组的玩家,
 *     地图上的血条比战斗里短 60%。
 *   - 七号安魂那份在界面上跟着支持度缩放(0.5x~1.5x),在战斗里是**固定** 0.15。
 *
 * 而 repairFlagship() 把血修到 effectiveMaxHull,修船报价也是按它算缺多少——
 * 于是**花钱修满,进战斗还是不满**,而且没有任何办法把差的那截补上。
 *
 * 现在这里是唯一的真相来源,Combat 只在它上面乘一个出击契约倍率(契约是出击期间
 * 的临时状态,地图上本来就不存在)。
 *
 * 装备/船员加成只对**旗舰**成立——舰队面板也会拿这个函数显示友舰和缴获舰,
 * 那些船身上没有你的装备。 */
export function effectiveMaxHull(ship: Parameters<typeof computeMaxHull>[0] & { id?: string }): number {
  const isFlagship = !ship.id || ship.id === flagship.value?.id;
  if (!isFlagship) return computeMaxHull(ship);
  const crew = 0.15 * crewPassiveScale("unit7Requiem");
  // 显式上限:效果强度会随稀有度/等级增长,三件满级 mk5 船体模组能给到 +110%。
  const gear = Math.min(0.6, 0.15 * equippedEffectStacks("hullBonus"));
  return Math.round(computeMaxHull(ship) * (1 + gear + crew));
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
  // 每一条都乘上那名船员此刻的支持度倍率(见 crewPassiveScale)——船员面板上
  // 显示的那个百分比,原来只对走 crewPassive() 的两条战斗被动生效。
  const alloyBonus = salvageAlloyBonusFraction + 0.08 * crewPassiveScale("oriVashti") + 0.15 * crewPassiveScale("kessaVray");
  const salvageBonus = salvageAlloyBonusFraction + 0.15 * crewPassiveScale("kessaVray");
  const insightBonus = 0.05 * crewPassiveScale("recruitTactician");
  if (rewards.salvage) rewards.salvage = Math.round(rewards.salvage * (1 + salvageBonus));
  if (rewards.alloy) rewards.alloy = Math.round(rewards.alloy * (1 + alloyBonus));
  if (rewards.insight && insightBonus > 0) rewards.insight = Math.round(rewards.insight * (1 + insightBonus));
  // 薇拉·坎托的被动:「重大 BOSS 战 +12% 本源精华,全舰队生效」。
  //
  // 2026-08-31(/loop 第 28 轮)实测:全游戏 9 名船员里,8 名的被动都接上了,唯独
  // 她没有——而她是**唯一的传奇稀有度船员**,第六幕才解锁,也就是玩家在战役
  // 高潮处拿到的那份奖励。本源精华是进阶货币,全游戏最稀缺的东西。玩家读到那句
  // 话、把她招上船,然后什么都不会发生。
  //
  // 搜到的话正好是这个:「大部分属性和技能根本没有效果,描述是彻头彻尾的谎话」
  // ——一张卡面写了却不兑现,损的是玩家对**所有**卡面的信任,不只是这一张。
  if (enc.isBoss && rewards.originEssence) {
    const vela = crewPassiveScale("velaCantor");
    if (vela > 0) rewards.originEssence = Math.round(rewards.originEssence * (1 + 0.12 * vela));
  }
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
  if (bonusDrop) receiveModule(bonusDrop);
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

/** 主动撤离:这一仗不打了,但也没输。
 *
 * 2026-09-01(/loop 第 75 轮)。战斗此前**只有两个出口**:打赢,或者死。而屏幕上
 * 一直摆着一个写着「撤离」的按钮——它只把距离拉开一档,并不能离开。
 *
 * 和战败的区别就是代价的形状:
 *   战败  船体砍半(currentHp × 0.5 + 1),按**开打前**的值算,受的伤反而不计
 *   撤离  船体按**打完时**的真实值写回——你在充能那几秒里挨的每一下都留在船上
 *
 * 战利品、经验、POI 清除标记、剧情 flag 一律没有:这一仗没有发生过好事。
 * 船员支持度不动——撤离不是败仗,不该记在船员头上。 */
export function resolveCombatWithdraw(endingHullPoints: number) {
  if (flagship.value) {
    const ships = state.value.ships.map((s) =>
      s.id === flagship.value!.id
        ? { ...s, currentHp: Math.max(1, Math.min(effectiveMaxHull(s), Math.round(endingHullPoints))) }
        : s,
    );
    state.value = { ...state.value, ships };
  }
  persist();
}

/** 战败之后船上还剩多少。
 *
 * 老规矩是"开打前的船体砍半",而且**不看你在这一仗里挨了多少**。第 75 轮把
 * 主动撤离做出来之后,这条规矩立刻露出一个反转:
 *
 *     满血 263 出发,打到只剩 20 —— 战死,写回 263×0.5+1 = 133
 *                                   撤离,写回 20(实测那一把是 110)
 *
 * 也就是说**去死比逃命划算**,而且越是残血越划算——那会把刚做出来的第三个出口
 * 变成一个没有理性玩家会按的按钮。
 *
 * 加一条上限:战败最多给你满船体的四分之一。残血开打的人仍然走砍半那条(取更小
 * 的那个),所以这不是对已经很惨的人再踩一脚;它管的是"满血冲进去送死"这一种。 */
export const DEFEAT_HULL_CAP_FRACTION = 0.25;
export function hullAfterDefeat(preFightHull: number, maxHull: number): number {
  return Math.max(1, Math.round(Math.min(preFightHull * 0.5 + 1, maxHull * DEFEAT_HULL_CAP_FRACTION)));
}

export function resolveCombatDefeat() {
  adjustAssignedCrewApproval(APPROVAL_PER_LOSS);
  if (flagship.value) {
    const ships = state.value.ships.map((s) =>
      s.id === flagship.value!.id ? { ...s, currentHp: hullAfterDefeat(s.currentHp, effectiveMaxHull(s)) } : s,
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
  receiveModule(drop);
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

/** 交战前该知道的那点事:里面有几艘船,最重的一击能拿走你多大一块船体。
 *
 * 2026-08-31(/loop 第 49 轮)。搜同类游戏搜到的一句是:"自由要有意义,玩家得先有
 * 足够的信息判断后果;盲目的决定带来的是挫败,不是掌控感"——以及 Into the Breach
 * 的作者复盘 FTL 时说,很多人觉得那个 BOSS 的难度"来得毫无预兆"。
 *
 * 而 Emberwake 在这一轮之前:联络人卡上只有**名字和距离**,而靠近巡逻点 400ms
 * 后**自动开打**(SystemView 的 onEngage),没有预览、没有确认、没有退路。玩家
 * 判断"这仗该不该打"的全部依据是一个地名。
 *
 * 刻意给**事实而不是结论**:不写"困难/普通",写"3 艘 · 单发最重占你船体 18%"。
 * 判断留给玩家——这和模组卡不给"这是升级"徽章是同一条立场。分母用当前船体
 * 而不是满血,因为带伤进场时这个数才是玩家真正要问的那个。
 *
 * 分子走**真实结算**:减去自己的装甲格挡,并且套上 resolveAttack 那条 75% 封顶
 * (MAX_BLOCK_FRACTION)。第一版只用敌人的原始伤害,读出来是"占船体 162%",
 * 比实际重——一个吓唬人的数字和一个没有的数字一样没用。 */
export function encounterThreatRead(encounterId: string): { enemies: number; worstHitFraction: number } | null {
  const ship = flagship.value;
  if (!ship) return null;
  let enc;
  try {
    enc = encounterById(encounterId);
  } catch {
    return null;
  }
  if (!enc || enc.enemies.length === 0) return null;
  const worst = Math.max(...enc.enemies.map((e) => e.damage));
  const block = ship.equipped.reduce((sum, id) => {
    const m = id ? state.value.modules.find((x) => x.id === id) : undefined;
    if (!m || moduleDefById(m.defId).baseBlock === undefined) return sum;
    return sum + computeModuleBlock(m);
  }, 0);
  const absorbed = Math.min(block, worst * MAX_BLOCK_FRACTION);
  const landed = Math.max(1, Math.round(worst - absorbed));
  const hull = Math.max(1, ship.currentHp);
  return { enemies: enc.enemies.length, worstHitFraction: landed / hull };
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
