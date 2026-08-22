import { GALAXY, state, travelToSystem } from "../../state/store";
import { playSfx } from "../../audio/engine";

export function GalaxyView({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const current = state.value.currentSystemId;

  function jump(systemId: string) {
    if (systemId === current) return;
    playSfx("jump");
    travelToSystem(systemId);
    onNavigate("system");
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "0.75rem 1rem" }} className="title">Bauhinia Reach</div>
      <div style={{ flex: 1, position: "relative" }}>
        <svg viewBox="0 0 1000 700" style={{ width: "100%", height: "100%" }}>
          {GALAXY.lanes.map((lane) => {
            const from = GALAXY.systems.find((s) => s.id === lane.from)!;
            const to = GALAXY.systems.find((s) => s.id === lane.to)!;
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
          {GALAXY.systems.map((sys) => {
            const isCurrent = sys.id === current;
            return (
              <g
                key={sys.id}
                transform={`translate(${sys.x}, ${sys.y})`}
                onClick={() => jump(sys.id)}
                style={{ cursor: "pointer" }}
              >
                <circle r={isCurrent ? 22 : 16} fill={isCurrent ? "var(--cyan)" : "var(--bg-panel-raised)"} stroke="var(--cyan)" strokeWidth={2} opacity={isCurrent ? 0.9 : 0.6} />
                <text y={40} textAnchor="middle" fill="var(--text-hi)" fontSize={16} fontFamily="var(--font-display)">
                  {sys.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ padding: "0.75rem 1rem", color: "var(--text-dim)", fontSize: "0.8rem" }}>
        More galaxies open as the campaign progresses.
      </div>
    </div>
  );
}
