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
import { grant, grantRiftDrop } from "./state/store";
import { setMuted, isMuted } from "./audio/engine";
import { setMood } from "./audio/music";
import { ErrorBoundary } from "./ui/components/ErrorBoundary";
import { ErrorToast } from "./ui/components/ErrorToast";
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

/** An in-progress Extradimensional Battlefield run (see data/rift.ts). Held in
 * component state, not the save: a run is a single sitting, and its haul is
 * explicitly provisional until extraction — persisting a half-finished dive
 * across reloads would quietly hand players a way to bank a losing run. */
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
  const [riftRun, setRiftRun] = useState<RiftRun | null>(null);
  const [riftDrop, setRiftDrop] = useState<ModuleInstance | null>(null);
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
      setRiftRun({ depth: 1, haul: {}, awaitingChoice: false, anomaly: w.anomaly, haulMultiplier: w.haulMultiplier, lastSurge: 1 }),
    );
  }

  /** Banks the run's haul and ends it, including the run's single module reward —
   * the rift is the only place mk4/mk5 gear exists (see grantRiftDrop). */
  function extractFromRift() {
    if (!riftRun) return;
    grant(riftRun.haul);
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
        />
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
              setRiftRun(null);
              return;
            }
            setRiftRun((run) => {
              if (!run) return run;
              const surge = rollSourceSurge(run.depth);
              return {
                ...run,
                haul: addHaul(run.haul, riftWaveHaul(run.depth, run.haulMultiplier, surge)),
                awaitingChoice: true,
                lastSurge: surge,
              };
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
      <SaveRecovery current={state.value} onRestore={replaceState} />
      {settingsOpen && <SettingsScreen onClose={() => setSettingsOpen(false)} />}
      {navBar}
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
        <ErrorToast />
      </div>
    </div>
  );
}
