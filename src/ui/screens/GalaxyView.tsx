import { useState } from "preact/hooks";
import { unlockedGalaxies, currentGalaxy, state, travelToSystem, getNextObjective } from "../../state/store";
import { playSfx } from "../../audio/engine";

export function GalaxyView({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const current = state.value.currentSystemId;
  const galaxies = unlockedGalaxies.value;
  const [viewingId, setViewingId] = useState(currentGalaxy.value.id);
  const galaxy = galaxies.find((g) => g.id === viewingId) ?? currentGalaxy.value;
  const objective = getNextObjective();

  function jump(systemId: string) {
    if (systemId === current) return;
    playSfx("jump");
    travelToSystem(systemId);
    onNavigate("system");
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {galaxies.length > 1 && (
        <div style={{ display: "flex", gap: "0.4rem", padding: "0.75rem 1rem 0", overflowX: "auto", height: "2.6rem", flex: "none" }}>
          {galaxies.map((g) => (
            <button
              key={g.id}
              className={`btn ${g.id === viewingId ? "primary" : ""}`}
              style={{ flex: "none", whiteSpace: "nowrap", fontSize: "0.7rem", padding: "0.55em 0.9em" }}
              onClick={() => setViewingId(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}
      <div style={{ padding: "0.75rem 1rem" }} className="title">{galaxy.name}</div>
      {objective && (
        <div style={{ margin: "0 1rem 0.5rem", fontSize: "0.8rem", color: "var(--amber)" }}>
          ▸ Next: {objective.label} at {objective.systemName}
        </div>
      )}
      <div style={{ flex: 1, position: "relative" }}>
        <svg viewBox="0 0 1000 700" style={{ width: "100%", height: "100%" }}>
          {galaxy.lanes.map((lane) => {
            const from = galaxy.systems.find((s) => s.id === lane.from)!;
            const to = galaxy.systems.find((s) => s.id === lane.to)!;
            return (
              <line
                key={`${lane.from}-${lane.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="var(--line-bright)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            );
          })}
          {galaxy.systems.map((sys) => {
            const isCurrent = sys.id === current;
            const isObjective = objective?.systemId === sys.id;
            return (
              <g
                key={sys.id}
                transform={`translate(${sys.x}, ${sys.y})`}
                onClick={() => jump(sys.id)}
                style={{ cursor: "pointer" }}
              >
                {isObjective && (
                  <circle r={30} fill="none" stroke="var(--amber)" strokeWidth={2} opacity={0.7}>
                    <animate attributeName="r" values="24;34;24" dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.15;0.8" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle r={isCurrent ? 22 : 16} fill={isCurrent ? "var(--cyan)" : "var(--bg-panel-raised)"} stroke={isObjective ? "var(--amber)" : "var(--cyan)"} strokeWidth={2} opacity={isCurrent ? 0.9 : 0.6} />
                <text y={40} textAnchor="middle" fill={isObjective ? "var(--amber)" : "var(--text-hi)"} fontSize={16} fontFamily="var(--font-display)">
                  {sys.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ padding: "0.75rem 1rem", color: "var(--text-dim)", fontSize: "0.8rem" }}>
        {galaxies.length > 1 ? "Tap any discovered system to jump there directly." : "More galaxies open as the campaign progresses."}
      </div>
    </div>
  );
}
