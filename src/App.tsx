import { useState } from "preact/hooks";
import { availableScene, completeScene, currentSystem } from "./state/store";
import { ResourceBar } from "./ui/components/ResourceBar";
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

type Screen = "bridge" | "galaxy" | "system" | "fleet" | "modules" | "crew";

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
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--line)" }}>
      <ResourceBar />
      <button
        className="btn"
        style={{ flex: "none", padding: "0.5em 0.8em" }}
        onClick={() => {
          setMuted(!muted);
          setMutedState(!muted);
        }}
      >
        {muted ? "Unmute" : "Mute"}
      </button>
    </div>
  );

  if (combat) {
    const isPoiCombat = "poiId" in combat;
    return (
      <Combat
        encounterId={combat.encounterId}
        poiId={isPoiCombat ? combat.poiId : null}
        victoryFlag={isPoiCombat ? combat.victoryFlag : undefined}
        onResolve={() => setCombat(null)}
      />
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {navBar}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
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
        {docked && <StationPanel onClose={() => setDocked(false)} />}
        {scene && !docked && <StoryOverlay scene={scene} onComplete={handleSceneComplete} />}
      </div>
      <nav style={{ display: "flex", borderTop: "1px solid var(--line)" }}>
        {(["bridge", "system", "galaxy", "fleet", "modules", "crew"] as Screen[]).map((s) => (
          <button
            key={s}
            onClick={() => setScreen(s)}
            style={{
              flex: 1,
              padding: "0.7rem 0",
              background: screen === s ? "rgba(75,232,255,0.14)" : "transparent",
              border: "none",
              borderTop: screen === s ? "2px solid var(--cyan)" : "2px solid transparent",
              color: screen === s ? "var(--cyan)" : "var(--text-mid)",
              fontFamily: "var(--font-display)",
              fontSize: "0.68rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </nav>
    </div>
  );
}
