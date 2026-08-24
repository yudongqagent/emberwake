import { useState } from "preact/hooks";
import { availableScene, completeScene, currentSystem } from "./state/store";
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
import type { StoryScene, ResourceType, ModuleInstance } from "./data/types";
import { generateRiftWave, riftWaveHaul, addHaul } from "./data/rift";
import { registerRuntimeEncounter } from "./data/encounters";
import { grant, grantRiftDrop } from "./state/store";
import { setMuted, isMuted } from "./audio/engine";
import { ErrorBoundary } from "./ui/components/ErrorBoundary";
import { ErrorToast } from "./ui/components/ErrorToast";
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
}

export function App() {
  const [screen, setScreen] = useState<Screen>("system");
  const [panel, setPanel] = useState<ConsolePanelId | null>(null);
  const [docked, setDocked] = useState(false);
  const [combat, setCombat] = useState<PendingCombat | PendingStoryEncounter | null>(null);
  const [muted, setMutedState] = useState(isMuted());
  const [riftRun, setRiftRun] = useState<RiftRun | null>(null);
  const [riftDrop, setRiftDrop] = useState<ModuleInstance | null>(null);

  function launchRiftWave(depth: number) {
    const wave = registerRuntimeEncounter(generateRiftWave(depth));
    setCombat({ encounterId: wave.id });
  }

  function enterRift() {
    setRiftRun({ depth: 1, haul: {}, awaitingChoice: false });
    launchRiftWave(1);
  }

  /** Banks the run's haul and ends it, including the run's single module reward —
   * the rift is the only place mk4/mk5 gear exists (see grantRiftDrop). */
  function extractFromRift() {
    if (!riftRun) return;
    grant(riftRun.haul);
    setRiftDrop(grantRiftDrop(riftRun.depth));
    setRiftRun(null);
  }

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
    </div>
  );

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
          onDiveDeeper={() => {
            const next = riftRun.depth + 1;
            setRiftRun({ ...riftRun, depth: next, awaitingChoice: false });
            launchRiftWave(next);
          }}
          onExtract={extractFromRift}
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
          victoryFlag={isPoiCombat ? combat.victoryFlag : undefined}
          onResolve={(result) => {
            setCombat(null);
            if (!riftRun) return;
            if (result === "defeat") {
              // The whole provisional haul is lost — that risk is what makes
              // "one more wave" an actual decision rather than free money.
              setRiftRun(null);
              return;
            }
            setRiftRun((run) =>
              run ? { ...run, haul: addHaul(run.haul, riftWaveHaul(run.depth)), awaitingChoice: true } : run,
            );
          }}
        />
        <ErrorToast />
      </ErrorBoundary>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
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
                onDock={() => setDocked(true)}
                onEngage={(encounterId, poiId, victoryFlag) => setCombat({ encounterId, poiId, victoryFlag })}
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
