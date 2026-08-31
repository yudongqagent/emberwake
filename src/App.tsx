import { useEffect, useState } from "preact/hooks";
import { availableScene, completeScene, currentSystem, state, replaceState, applyDraftChoice, clearSortieBoons, flagship } from "./state/store";
import { ResourceBar } from "./ui/components/ResourceBar";
import { SoundIcon } from "./ui/components/Icons";
import { Bridge } from "./ui/screens/Bridge";
import { GalaxyView } from "./ui/screens/GalaxyView";
import { SystemView } from "./ui/screens/SystemView";
import { StationPanel } from "./ui/screens/StationPanel";
import { Fleet } from "./ui/screens/Fleet";
import { Modules } from "./ui/screens/Modules";
import { Crew } from "./ui/screens/Crew";
import { Ascension } from "./ui/screens/Ascension";
import { StoryOverlay } from "./ui/screens/StoryOverlay";
import { EventOverlay } from "./ui/screens/EventOverlay";
import { eventsForGalaxy, type GameEvent } from "./data/events";
import { Combat } from "./ui/screens/Combat";
import { RiftInterlude } from "./ui/screens/RiftInterlude";
import { RiftDropReveal } from "./ui/screens/RiftDropReveal";
import { RefitDraft } from "./ui/screens/RefitDraft";
import { SortieInterlude } from "./ui/screens/SortieInterlude";
import { TitleScreen } from "./ui/screens/TitleScreen";
import { Settings as SettingsScreen } from "./ui/screens/Settings";
import { generateDraft, type DraftOption } from "./data/draft";
import type { StoryScene, ResourceType, ModuleInstance } from "./data/types";
import { generateRiftWaveFull, riftWaveHaul, addHaul, rollSourceSurge, type RiftAnomalyId } from "./data/rift";
import { registerRuntimeEncounter, encounterById } from "./data/encounters";
import { grant, grantRiftDrop, bankDive, resolveEventOutcome, currentGalaxy, saveRiftRun, pendingFits, fitAll } from "./state/store";
import { moduleDefById } from "./data/modules";
import { hullClassById } from "./data/hullClasses";
import { setMuted, isMuted } from "./audio/engine";
import { setMood } from "./audio/music";
import { ErrorBoundary } from "./ui/components/ErrorBoundary";
import { ErrorToast } from "./ui/components/ErrorToast";
import { pendingHullUnlocks } from "./state/store";
import { localizedHullClassDisplay } from "./i18n/data";
import { SaveRecovery } from "./ui/components/SaveRecovery";
import { hasExistingSave, createInitialState } from "./engine/save";
import { t } from "./i18n/strings";
import { language, setLanguage } from "./i18n/language";
import { ShipConsole, type ConsolePanelId } from "./ui/components/ShipConsole";
import { ConsoleOverlay } from "./ui/components/ConsoleOverlay";

/** Only the two WORLD views remain screens — the places the ship actually is.
 * Every ship system is a console panel overlaid on the live world instead (see
 * ShipConsole/ConsoleOverlay), which is what let the bottom tab bar go away. */
type Screen = "system" | "galaxy";

const PANEL_ACCENT: Record<ConsolePanelId, string> = {
  bridge: "var(--cyan)",
  ascension: "var(--green)",
  modules: "var(--amber)",
  crew: "var(--violet)",
  fleet: "var(--text-mid)",
};

const PANEL_TITLE: Record<ConsolePanelId, string> = {
  bridge: "nav.bridge",
  ascension: "ascension.title",
  modules: "nav.modules",
  crew: "crew.roster",
  fleet: "fleet.hangar",
};

interface PendingCombat {
  encounterId: string;
  poiId: string;
  victoryFlag?: string;
}

interface PendingStoryEncounter {
  encounterId: string;
}

/** An in-progress Extradimensional Battlefield run (see data/rift.ts).
 *
 * 存进存档(GameState.riftRun),但**只在两波之间**存——那是玩家已经清掉一波、
 * 正在决定推进还是撤离的时刻。战斗中途刷新会退回那一波开始前重打,所以"打输了
 * 读档把收获捞回来"这条路依然不通;而崩溃或误刷新不再毁掉一整趟深潜。 */
interface RiftRun {
  depth: number;
  haul: Partial<Record<ResourceType, number>>;
  /** Set between waves, while the player decides to push deeper or pull out. */
  awaitingChoice: boolean;
  /** The anomaly warping the wave currently being fought, and what it multiplies
   * that wave's haul by (see data/rift.ts). */
  anomaly: RiftAnomalyId;
  haulMultiplier: number;
  /** 源点获取倍率 from the wave just cleared — 1 when it didn't trigger. Surfaced
   * in the interlude as the run's headline moment when it does. */
  lastSurge: number;
}

export function App() {
  /** Commercial-gap audit #1: the game had no title screen — it opened straight
   * onto a dark map with a dialogue box already up. The title is now the entry
   * point, and it's skipped only once the player has chosen to start. */
  const [atTitle, setAtTitle] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("system");
  const [panel, setPanel] = useState<ConsolePanelId | null>(null);
  const [docked, setDocked] = useState(false);
  const [combat, setCombat] = useState<PendingCombat | PendingStoryEncounter | null>(null);
  const [muted, setMutedState] = useState(isMuted());
  // 从存档恢复一趟没打完的深潜(见 GameState.riftRun)。恢复到"两波之间"那个
  // 安全点:玩家回来时看到的是推进/撤离的选择,而不是凭空多出的收获。
  const [riftRun, setRiftRun] = useState<RiftRun | null>(() => {
    const saved = state.value.riftRun;
    return saved ? { ...saved, anomaly: saved.anomaly as RiftAnomalyId, awaitingChoice: true } : null;
  });
  const [riftDrop, setRiftDrop] = useState<ModuleInstance | null>(null);
  const [diveResult, setDiveResult] = useState<{ earned: number; newRecord: boolean; depth: number } | null>(null);
  const [pendingEvent, setPendingEvent] = useState<{ event: GameEvent; poiId: string } | null>(null);
  /** 这一次会话是玩家自己选的"新的开始"。用来压掉存档恢复提示——见 onNewGame。 */
  const [freshStart, setFreshStart] = useState(false);
  /** Core-loop redesign #1 — the hand of three waiting to be picked from. */
  const [draft, setDraft] = useState<DraftOption[] | null>(null);
  /** Core-loop redesign #5 — an in-progress sortie. The rift's push-your-luck
   * shape is the best thing in the game and it was walled off in a side mode;
   * this applies it to ordinary POI combat. Story encounters stay single-stage,
   * because they grant progression flags and a multi-stage story fight would put
   * the quest chain behind a longer, riskier gate than it was authored for. */
  const [sortie, setSortie] = useState<
    { encounterId: string; poiId: string; victoryFlag?: string; wave: number; total: number } | null
  >(null);

  /** Generates the wave AND records the anomaly warping it, so the combat screen
   * can name what the player just walked into. */
  function launchRiftWave(depth: number, apply: (w: { anomaly: RiftAnomalyId; haulMultiplier: number }) => void) {
    const wave = generateRiftWaveFull(depth);
    registerRuntimeEncounter(wave.encounter);
    apply({ anomaly: wave.anomaly, haulMultiplier: wave.haulMultiplier });
    setCombat({ encounterId: wave.encounter.id });
  }

  function enterRift() {
    launchRiftWave(1, (w) =>
      (saveRiftRun(null), setRiftRun({ depth: 1, haul: {}, awaitingChoice: false, anomaly: w.anomaly, haulMultiplier: w.haulMultiplier, lastSurge: 1 })),
    );
  }

  /** Banks the run's haul and ends it, including the run's single module reward —
   * the rift is the only place mk4/mk5 gear exists (see grantRiftDrop). */
  function extractFromRift() {
    if (!riftRun) return;
    grant(riftRun.haul);
    // 余烬刻印(data/sigils.ts):深潜第一次留下了带得走的东西。在此之前,你潜到
    // 多深,离开的那一刻就被忘掉了——所以"再深一层"完全没有理由。
    saveRiftRun(null);
    const dive = bankDive(riftRun.depth);
    setDiveResult(dive.earned > 0 ? { ...dive, depth: riftRun.depth } : null);
    setRiftDrop(grantRiftDrop(riftRun.depth));
    setRiftRun(null);
  }

  // Commercial-gap audit #2: music now follows the game's state rather than the
  // game being silent. Derived from what's on screen so there's one call site.
  useEffect(() => {
    setMood(atTitle ? "drift" : riftRun ? "rift" : combat ? "combat" : "drift");
  }, [atTitle, combat, riftRun]);

  const scene = availableScene(currentSystem.value.id);

  function handleSceneComplete(completed: StoryScene) {
    completeScene(completed);
    if (completed.startEncounter) {
      setCombat({ encounterId: completed.startEncounter });
    }
  }

  const navBar = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "0.5rem",
        padding: "calc(0.5rem + var(--safe-top)) calc(0.75rem + var(--safe-right)) 0.5rem calc(0.75rem + var(--safe-left))",
        borderBottom: "1px solid var(--line)",
        background: "rgba(5,8,16,0.55)",
        backdropFilter: "blur(8px)",
        position: "relative",
        zIndex: 2,
      }}
    >
      <ResourceBar />
      <button
        className="btn ghost"
        style={{ flex: "none", padding: "0.55em 0.7em", fontFamily: "var(--font-display)", fontSize: "0.7rem", fontWeight: 700 }}
        onClick={() => setLanguage(language.value === "zh" ? "en" : "zh")}
        aria-label="Toggle language"
      >
        {t("nav.language")}
      </button>
      <button
        className="btn ghost"
        style={{ flex: "none", padding: "0.55em 0.7em" }}
        onClick={() => {
          setMuted(!muted);
          setMutedState(!muted);
        }}
        aria-label={muted ? t("nav.unmute") : t("nav.mute")}
      >
        <SoundIcon muted={muted} size={16} />
      </button>
      {/* Settings — and with it "restart from the beginning" — has to be
          reachable mid-game, not only from the title screen a player passed
          through once and may never see again. */}
      <button
        className="btn ghost"
        style={{ flex: "none", padding: "0.55em 0.7em", fontSize: "0.75rem" }}
        onClick={() => setSettingsOpen(true)}
        aria-label={t("settings.title")}
        title={t("settings.title")}
      >
        ⚙
      </button>
    </div>
  );

  if (atTitle) {
    return (
      <ErrorBoundary label={t("title.name")}>
        <TitleScreen
          hasSave={hasExistingSave()}
          onContinue={() => setAtTitle(false)}
          onNewGame={() => {
            // saveGame keeps the previous campaign as a backup, so "New Game"
            // is recoverable through the same path a bad load uses.
            replaceState(createInitialState());
            // 但**不要**再拿恢复提示去问他。玩家刚刚点过一次"新的开始",又在覆盖
            // 警告上确认过一次——第三次追问不是保护,是打扰,而且它会盖在开场散文
            // 上面。备份仍然留着,入口挪到设置里(见 Settings 的"恢复之前的存档")。
            setFreshStart(true);
            setAtTitle(false);
          }}
        />
        <ErrorToast />
      </ErrorBoundary>
    );
  }

  // The rift's module reward, revealed after extraction. Shown on its own rather
  // than folded into the haul list because it's the mechanically distinctive part:
  // mk4/mk5 gear has no other source in the game.
  if (riftDrop) {
    return (
      <ErrorBoundary label={t("rift.title")}>
        <RiftDropReveal drop={riftDrop} onClose={() => setRiftDrop(null)} />
        <ErrorToast />
      </ErrorBoundary>
    );
  }

  // 星图事件。放在这里(战斗之外的全屏覆盖层)是因为它可能**开一场仗**——
  // 结算完之后再把控制权交回去。
  if (pendingEvent) {
    return (
      <ErrorBoundary label={t("event.title")}>
        <EventOverlay
          event={pendingEvent.event}
          onResolve={(outcome) => {
            const { event, poiId } = pendingEvent;
            resolveEventOutcome(event.id, poiId, outcome);
            setPendingEvent(null);
            if (outcome.kind === "combat" && outcome.encounterId) {
              setCombat({ encounterId: outcome.encounterId });
            }
          }}
        />
        <ErrorToast />
      </ErrorBoundary>
    );
  }

  if (riftRun && riftRun.awaitingChoice && !combat) {
    return (
      <ErrorBoundary label={t("rift.title")}>
        <RiftInterlude
          depth={riftRun.depth}
          haul={riftRun.haul}
          surge={riftRun.lastSurge}
          onDiveDeeper={() => {
            const next = riftRun.depth + 1;
            launchRiftWave(next, (w) =>
              setRiftRun({ ...riftRun, depth: next, awaitingChoice: false, anomaly: w.anomaly, haulMultiplier: w.haulMultiplier }),
            );
          }}
          onExtract={extractFromRift}
        />
        <ErrorToast />
      </ErrorBoundary>
    );
  }

  if (draft) {
    return (
      <ErrorBoundary label={t("draft.title")}>
        <RefitDraft
          options={draft}
          owned={state.value.modules}
          onPick={(opt) => {
            applyDraftChoice(opt);
            setDraft(null);
          }}
        />
        <ErrorToast />
      </ErrorBoundary>
    );
  }

  if (sortie && sortie.wave < sortie.total && !combat && !draft) {
    return (
      <ErrorBoundary label={t("sortie.eyebrow")}>
        <SortieInterlude
          wave={sortie.wave}
          total={sortie.total}
          onPress={() => {
            const next = sortie.wave + 1;
            setSortie({ ...sortie, wave: next });
            setCombat({ encounterId: sortie.encounterId, poiId: sortie.poiId, victoryFlag: sortie.victoryFlag });
          }}
          onWithdraw={() => setSortie(null)}
          onLoadout={() => setPanel("modules")}
        />
        {/* 出击间隙的配装入口。抉择刚给了一件装备,而下一步就是"继续推进还是撤离"
            ——中间没有装配的机会,那件装备在这次出击里就是死的。 */}
        {panel === "modules" && (
          <ErrorBoundary label={t(PANEL_TITLE.modules)}>
            <ConsoleOverlay
              title={t(PANEL_TITLE.modules)}
              accent={PANEL_ACCENT.modules}
              onClose={() => setPanel(null)}
            >
              <Modules />
            </ConsoleOverlay>
          </ErrorBoundary>
        )}
        <ErrorToast />
      </ErrorBoundary>
    );
  }

  if (combat) {
    const isPoiCombat = "poiId" in combat;
    return (
      <ErrorBoundary label={t("combat.title")}>
        <Combat
          encounterId={combat.encounterId}
          poiId={isPoiCombat ? combat.poiId : null}
          // Core-loop redesign #5: the objective is only met by finishing the
          // sortie. Passing the flag on wave 1 would have completed the POI
          // immediately and made every later wave pointless.
          victoryFlag={
            isPoiCombat && (!sortie || sortie.wave >= sortie.total) ? combat.victoryFlag : undefined
          }
          // UI audit #7: what this wave is actually risking, so the dive's
          // mounting stakes are visible during the fight rather than only in
          // the interlude between waves.
          rift={riftRun ? { depth: riftRun.depth, haul: riftRun.haul, anomaly: riftRun.anomaly } : null}
          // Each wave of a sortie is fought a point of Load harder than the last.
          extraLoad={sortie ? sortie.wave - 1 : 0}
          onResolve={(result) => {
            const faction = encounterById(combat.encounterId).faction;
            setCombat(null);
            // Core-loop redesign #1: a won fight now ends in a pick rather than a
            // silent dice roll. Rift waves are excluded — a dive already has its
            // own push-your-luck decision between waves, and stacking a draft on
            // top of that would blunt both.
            if (!riftRun && (result === "victory" || result === "captured")) {
              const ship = flagship.value;
              setDraft(generateDraft({
                faction,
                shipLevel: ship?.level ?? 1,
                owned: state.value.modules,
                activeBoons: state.value.sortieBoons,
                activePacts: state.value.sortiePacts,
              }));
            }
            if (!riftRun && sortie) {
              if (result === "defeat") {
                // A lost sortie ends it. Whatever was drafted along the way is
                // kept — the loss is the mission and the hull, not the refit.
                setSortie(null);
              } else if (sortie.wave >= sortie.total) {
                setSortie(null);
              }
              // A mid-sortie win falls through to the draft, then the interlude.
            }
            if (!riftRun) return;
            if (result === "defeat") {
              // The whole provisional haul is lost — that risk is what makes
              // "one more wave" an actual decision rather than free money.
              saveRiftRun(null);
              setRiftRun(null);
              return;
            }
            // 两波之间是唯一安全的存档点:这一波已经清掉,玩家正在决定推进还是撤离。
            setRiftRun((run) => {
              if (!run) return run;
              const surge = rollSourceSurge(run.depth);
              const next = {
                ...run,
                haul: addHaul(run.haul, riftWaveHaul(run.depth, run.haulMultiplier, surge)),
                awaitingChoice: true,
                lastSurge: surge,
              };
              saveRiftRun({
                depth: next.depth, haul: next.haul, anomaly: next.anomaly,
                haulMultiplier: next.haulMultiplier, lastSurge: next.lastSurge,
              });
              return next;
            });
          }}
        />
        <ErrorToast />
      </ErrorBoundary>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Offers a previous campaign back if this save looks like it replaced one.
          Silent when there's nothing better to return to. */}
      <SaveRecovery current={state.value} onRestore={replaceState} suppressed={freshStart} />
      {settingsOpen && <SettingsScreen onClose={() => setSettingsOpen(false)} />}
      {navBar}
      {/* 只在"玩家能去改配装"的时刻提醒。战斗、剧情、抉择进行中拉他去看装备,
          是把提醒变成打扰。
          排在外层 flex 列里、跟着文档流走,而不是浮在底部:第一版做成 fixed
          底部横幅,375 宽下**正好盖住底部的目标列表**——那是玩家点进战斗的
          入口,等于一边说"你没武器"一边挡住他要去的地方。 */}
      {!docked && !scene && !combat && !draft && !sortie && !riftRun && !pendingEvent && panel !== "modules" && (
        <LoadoutWarning onOpen={() => setPanel("modules")} />
      )}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {/* The world view. It stays mounted under every console panel — opening
            a ship system no longer swaps the page out from under the player. */}
        <div key={screen} className="screen-enter" style={{ position: "absolute", inset: 0 }}>
          <ErrorBoundary label={t(screen === "galaxy" ? "nav.galaxy" : "nav.system")}>
            {screen === "galaxy" && <GalaxyView onNavigate={() => setScreen("system")} />}
            {screen === "system" && (
              <SystemView
                onNavigate={(s) => setScreen(s as Screen)}
                onDock={() => {
                  // Boons last until you dock — that's what makes docking a real
                  // decision (repair and restock, or press on with what you drafted)
                  // rather than a free reset.
                  clearSortieBoons();
                  setDocked(true);
                }}
                onInvestigate={(poiId) => {
                  // 星图事件(data/events.ts):废弃船靠近之后会问你一个问题。
                  // 事件按星区筛,同一个 POI 只触发一次——一个可以反复刷的
                  // "选择"不是选择,是刷子。
                  const pool = eventsForGalaxy(currentGalaxy.value.id)
                    .filter((e) => !state.value.flags[`event.${e.id}.done`]);
                  if (pool.length === 0) return;
                  setPendingEvent({ event: pool[Math.floor(Math.random() * pool.length)], poiId });
                }}
                onEngage={(encounterId, poiId, victoryFlag) => {
                  const enc = encounterById(encounterId);
                  // Bosses run longer. Two waves is enough to make hull a
                  // resource you're spending rather than a bar that refills.
                  const total = enc.isBoss ? 3 : 2;
                  setSortie({ encounterId, poiId, victoryFlag, wave: 1, total });
                  setCombat({ encounterId, poiId, victoryFlag });
                }}
              />
            )}
          </ErrorBoundary>
        </div>

        {/* In-world console cluster, replacing the old bottom tab bar. Hidden
            while another overlay already owns the screen, so panels never stack. */}
        {!docked && !scene && (
          <ShipConsole active={panel} onSelect={(id) => setPanel(panel === id ? null : id)} />
        )}


        {panel && (
          <ErrorBoundary label={t(PANEL_TITLE[panel])}>
            <ConsoleOverlay
              title={t(PANEL_TITLE[panel])}
              accent={PANEL_ACCENT[panel]}
              onClose={() => setPanel(null)}
            >
              {panel === "bridge" && (
                <Bridge
                  onNavigate={(s) => {
                    // The bridge's own shortcuts now open console panels, except
                    // the galaxy map, which is a real place to travel to.
                    if (s === "galaxy") { setPanel(null); setScreen("galaxy"); }
                    else setPanel(s as ConsolePanelId);
                  }}
                  onEnterRift={() => { setPanel(null); enterRift(); }}
                />
              )}
              {panel === "ascension" && <Ascension />}
              {panel === "fleet" && <Fleet />}
              {panel === "modules" && <Modules />}
              {panel === "crew" && <Crew />}
            </ConsoleOverlay>
          </ErrorBoundary>
        )}

        {docked && (
          <ErrorBoundary label={t("station.title")}>
            <StationPanel onClose={() => setDocked(false)} />
          </ErrorBoundary>
        )}
        {scene && !docked && (
          <ErrorBoundary label={t("story.title")}>
            {/* key forces a full remount on scene change — otherwise lineIdx/
                showChoices carry over from the previous scene, and a transition
                into a shorter scene reads past the end of its lines array. */}
            <StoryOverlay key={scene.id} scene={scene} onComplete={handleSceneComplete} />
          </ErrorBoundary>
        )}
        <DiveResultToast result={diveResult} onClose={() => setDiveResult(null)} />
        <HullUnlockToast />
        <ErrorToast />
      </div>
    </div>
  );
}

/** 「你的船没装武器」的横幅。
 *
 * 2026-08-31(/loop 第 18 轮)。55 级存档:武器槽 ×10 全空,功率 3/256,库存里
 * 三把 MK5 武器。游戏从头到尾一个字都没说——舰桥没提,星系图没提,开打前也没提。
 * 上一轮我在裂隙里看到敌人打不死,以为是相位偏移的锅,其实是这艘船没有炮。
 *
 * 放在 App 这一层而不是舰桥或星系图里,是上几轮反复吃亏换来的:同一条规则接进
 * N 个界面,就会有 N-1 个界面漏掉。挂在最外层,玩家在哪个界面都看得见。
 *
 * 只在两种情况出现,而且都给一键修复,不给"知道了":
 *   红 — 一件武器都没装(这时候战斗根本赢不了)
 *   琥珀 — 有空槽,而库存里正好有装得进去的
 * 战斗/剧情/事件进行时不显示,那些时刻玩家不该被拉走注意力。 */
function LoadoutWarning({ onOpen }: { onOpen: () => void }) {
  const ship = flagship.value;
  if (!ship) return null;
  const equippedIds = new Set(state.value.ships.flatMap((s) => s.equipped).filter(Boolean) as string[]);
  const inventory = state.value.modules.filter((m) => !equippedIds.has(m.id));
  const fits = pendingFits(ship, inventory);
  const weaponCount = ship.equipped.filter(
    (id) => id && moduleDefById(state.value.modules.find((m) => m.id === id)!.defId).type === "weapon",
  ).length;
  const unarmed = weaponCount === 0;
  if (!unarmed && fits.length === 0) return null;

  const accent = unarmed ? "var(--red)" : "var(--amber)";
  const s = hullClassById(ship.hullClass).slots;
  const emptySlots = s.weapon + s.armor + s.engine + s.utility - ship.equipped.filter(Boolean).length;
  return (
    <div
      style={{
        flex: "none", margin: "0 0.8rem 0.5rem",
        display: "flex", alignItems: "center", gap: "0.6rem",
        padding: "0.6rem 0.75rem", borderRadius: 10,
        border: `1px solid ${accent}`, background: "rgba(6,10,16,0.94)",
        boxShadow: `0 0 18px ${unarmed ? "rgba(255,92,92,0.25)" : "rgba(255,184,77,0.2)"}`,
      }}
    >
      <div style={{ fontSize: "0.74rem", lineHeight: 1.45, color: "var(--text-mid)", minWidth: 0 }}>
        {unarmed ? (
          <b style={{ color: accent }}>{t("modules.unarmed", { name: ship.name })}</b>
        ) : (
          t("modules.emptySlots", { count: emptySlots, stowed: fits.length })
        )}
      </div>
      <button
        className="btn primary"
        style={{ marginLeft: "auto", flex: "none", fontSize: "0.7rem", padding: "0.4em 0.7em" }}
        onClick={() => (fits.length > 0 ? fitAll(ship.id) : onOpen())}
      >
        {fits.length > 0 ? t("modules.unarmedFix", { count: fits.length }) : t("nav.modules")}
      </button>
    </div>
  );
}

/** 新舰级解锁的提示。
 *
 * 整个游戏最大的进度事件从前是**静悄悄**发生的:剧情演完,新舰级就那么出现在
 * 进阶页里,没有任何人告诉玩家。场景数据上那个 `unlockHullClass` 字段五处声明、
 * 零处读取——它本来就是想干这件事的,只是从来没接上。 */
function HullUnlockToast() {
  const unlocked = pendingHullUnlocks.value;
  if (unlocked.length === 0) return null;
  const dismiss = () => { pendingHullUnlocks.value = []; };
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 70, display: "flex",
        alignItems: "center", justifyContent: "center", padding: "1rem",
        background: "rgba(3,5,9,0.8)", backdropFilter: "blur(3px)",
      }}
      onClick={dismiss}
    >
      <div className="panel pop-in" style={{ width: "min(420px, 100%)", padding: "1.4rem", textAlign: "center", border: "1px solid var(--violet)" }}>
        <div className="eyebrow" style={{ color: "var(--violet)" }}>{t("hullUnlock.title")}</div>
        <div style={{ margin: "0.8rem 0 0.4rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {unlocked.map((h) => (
            <div key={h.id}>
              <div style={{ fontSize: "1.15rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>
                {localizedHullClassDisplay(h)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                {t("hullUnlock.req", { level: h.minLevel, essence: h.essenceCost })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--text-mid)", lineHeight: 1.5, margin: "0.6rem 0 1rem" }}>
          {t("hullUnlock.body")}
        </div>
        <button className="btn primary" onClick={dismiss}>{t("common.close")}</button>
      </div>
    </div>
  );
}

/** 深潜结算:这一趟换来多少刻印,有没有刷新纪录。
 *
 * 纪录那一行是这套东西的引擎——它只在你比上一次更深的时候出现,所以"再深一层"
 * 永远是最优解。 */
function DiveResultToast({ result, onClose }: { result: { earned: number; newRecord: boolean; depth: number } | null; onClose: () => void }) {
  if (!result) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 68, display: "flex",
        alignItems: "center", justifyContent: "center", padding: "1rem",
        background: "rgba(3,5,9,0.8)", backdropFilter: "blur(3px)",
      }}
      onClick={onClose}
    >
      <div className="panel pop-in" style={{ width: "min(400px, 100%)", padding: "1.4rem", textAlign: "center", border: "1px solid var(--amber)" }}>
        <div className="eyebrow" style={{ color: "var(--amber)" }}>{t("sigil.diveTitle")}</div>
        <div style={{ fontSize: "1.6rem", fontWeight: 700, fontFamily: "var(--font-display)", margin: "0.6rem 0 0.2rem" }}>
          +{result.earned}
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--text-mid)" }}>{t("sigil.diveDepth", { depth: result.depth })}</div>
        {result.newRecord && (
          <div style={{ marginTop: "0.6rem", color: "var(--violet)", fontWeight: 700, fontSize: "0.85rem" }}>
            {t("sigil.newRecord")}
          </div>
        )}
        <button className="btn primary" style={{ marginTop: "1rem" }} onClick={onClose}>{t("common.close")}</button>
      </div>
    </div>
  );
}
