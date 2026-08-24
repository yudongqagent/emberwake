import { useState } from "preact/hooks";
import { availableScene, completeScene, currentSystem } from "./state/store";
import { ResourceBar } from "./ui/components/ResourceBar";
import { NavIcon, SoundIcon } from "./ui/components/Icons";
import { Bridge } from "./ui/screens/Bridge";
import { GalaxyView } from "./ui/screens/GalaxyView";
import { SystemView } from "./ui/screens/SystemView";
import { StationPanel } from "./ui/screens/StationPanel";
import { Fleet } from "./ui/screens/Fleet";
import { Modules } from "./ui/screens/Modules";
import { Crew } from "./ui/screens/Crew";
import { StoryOverlay } from "./ui/screens/StoryOverlay";
import { Combat } from "./ui/screens/Combat";
import type { StoryScene } from "./data/types";
import { setMuted, isMuted } from "./audio/engine";
import { ErrorBoundary } from "./ui/components/ErrorBoundary";
import { ErrorToast } from "./ui/components/ErrorToast";
import { t } from "./i18n/strings";
import { language, setLanguage } from "./i18n/language";

type Screen = "bridge" | "system" | "galaxy" | "fleet" | "modules" | "crew";

const NAV_ITEMS: { id: Screen; labelKey: string }[] = [
  { id: "bridge", labelKey: "nav.bridge" },
  { id: "system", labelKey: "nav.system" },
  { id: "galaxy", labelKey: "nav.galaxy" },
  { id: "fleet", labelKey: "nav.fleet" },
  { id: "modules", labelKey: "nav.modules" },
  { id: "crew", labelKey: "nav.crew" },
];

interface PendingCombat {
  encounterId: string;
  poiId: string;
  victoryFlag?: string;
}

interface PendingStoryEncounter {
  encounterId: string;
}

export function App() {
  const [screen, setScreen] = useState<Screen>("system");
  const [docked, setDocked] = useState(false);
  const [combat, setCombat] = useState<PendingCombat | PendingStoryEncounter | null>(null);
  const [muted, setMutedState] = useState(isMuted());

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

  if (combat) {
    const isPoiCombat = "poiId" in combat;
    return (
      <ErrorBoundary label={t("combat.title")}>
        <Combat
          encounterId={combat.encounterId}
          poiId={isPoiCombat ? combat.poiId : null}
          victoryFlag={isPoiCombat ? combat.victoryFlag : undefined}
          onResolve={() => setCombat(null)}
        />
        <ErrorToast />
      </ErrorBoundary>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {navBar}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <div key={screen} className="screen-enter" style={{ position: "absolute", inset: 0 }}>
          <ErrorBoundary label={t(NAV_ITEMS.find((n) => n.id === screen)?.labelKey ?? "nav.system")}>
            {screen === "bridge" && <Bridge onNavigate={(s) => setScreen(s as Screen)} />}
            {screen === "galaxy" && <GalaxyView onNavigate={(s) => setScreen(s as Screen)} />}
            {screen === "system" && (
              <SystemView
                onNavigate={(s) => setScreen(s as Screen)}
                onDock={() => setDocked(true)}
                onEngage={(encounterId, poiId, victoryFlag) => setCombat({ encounterId, poiId, victoryFlag })}
              />
            )}
            {screen === "fleet" && <Fleet />}
            {screen === "modules" && <Modules />}
            {screen === "crew" && <Crew />}
          </ErrorBoundary>
        </div>
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
      <nav
        style={{
          display: "flex",
          borderTop: "1px solid var(--line)",
          background: "rgba(5,8,16,0.65)",
          backdropFilter: "blur(8px)",
          paddingBottom: "var(--safe-bottom)",
          paddingLeft: "var(--safe-left)",
          paddingRight: "var(--safe-right)",
          position: "relative",
          zIndex: 2,
        }}
      >
        {NAV_ITEMS.map(({ id, labelKey }) => {
          const active = screen === id;
          return (
            <button
              key={id}
              onClick={() => setScreen(id)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.55rem 0 0.45rem",
                background: "transparent",
                border: "none",
                borderTop: active ? "2px solid var(--cyan)" : "2px solid transparent",
                color: active ? "var(--cyan)" : "var(--text-dim)",
                fontFamily: "var(--font-display)",
                fontSize: "0.6rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                cursor: "pointer",
                transition: "color 150ms ease",
              }}
            >
              <NavIcon name={id} size={19} color={active ? "var(--cyan)" : "currentColor"} />
              {t(labelKey)}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
