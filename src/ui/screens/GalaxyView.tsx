import { useState } from "preact/hooks";
import { unlockedGalaxies, currentGalaxy, state, travelToSystem, getNextObjective } from "../../state/store";
import { playSfx } from "../../audio/engine";
import { FACTION_HULL_COLOR } from "../render/shipArt";

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function GalaxyView({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const current = state.value.currentSystemId;
  const galaxies = unlockedGalaxies.value;
  const [viewingId, setViewingId] = useState(currentGalaxy.value.id);
  const galaxy = galaxies.find((g) => g.id === viewingId) ?? currentGalaxy.value;
  const objective = getNextObjective();
  const [jumping, setJumping] = useState(false);

  function jump(systemId: string) {
    if (systemId === current || jumping) return;
    playSfx("jump");
    setJumping(true);
    // A real transition with motion, not an instant screen swap — see
    // docs/visual-standards.md §3 ("Jump/travel/dock").
    setTimeout(() => {
      travelToSystem(systemId);
      onNavigate("system");
    }, 320);
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {jumping && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            pointerEvents: "none",
            background: "radial-gradient(circle at 50% 50%, rgba(75,232,255,0.9), rgba(75,232,255,0.1) 40%, transparent 70%)",
            animation: "warpFlash 320ms ease-in forwards",
          }}
        />
      )}
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
          <defs>
            <radialGradient id="galaxyBg" cx="50%" cy="45%" r="75%">
              <stop offset="0%" stopColor="#0d1526" />
              <stop offset="100%" stopColor="#03050a" />
            </radialGradient>
            {galaxy.systems.map((sys) => {
              const color = (sys.controllingFaction && FACTION_HULL_COLOR[sys.controllingFaction]) || "#4be8ff";
              return (
                <radialGradient key={sys.id} id={`sysGlow-${sys.id}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={color} stopOpacity="0.55" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </radialGradient>
              );
            })}
          </defs>
          <rect x={0} y={0} width={1000} height={700} fill="url(#galaxyBg)" />
          {Array.from({ length: 70 }, (_, i) => {
            const seed = hashSeed(galaxy.id + "-star-" + i);
            const x = (seed % 997) / 997 * 1000;
            const y = ((seed * 7) % 631) / 631 * 700;
            const r = 0.5 + (seed % 5) / 5 * 1.3;
            return <circle key={i} cx={x} cy={y} r={r} fill="#dce8ff" opacity={0.2 + (seed % 10) / 10 * 0.4} />;
          })}

          {galaxy.lanes.map((lane) => {
            const from = galaxy.systems.find((s) => s.id === lane.from)!;
            const to = galaxy.systems.find((s) => s.id === lane.to)!;
            return (
              <g key={`${lane.from}-${lane.to}`}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(75,232,255,0.12)" strokeWidth={4} />
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--line-bright)" strokeWidth={1.5} strokeDasharray="4 4">
                  <animate attributeName="stroke-dashoffset" values="16;0" dur="1.1s" repeatCount="indefinite" />
                </line>
              </g>
            );
          })}
          {galaxy.systems.map((sys) => {
            const isCurrent = sys.id === current;
            const isObjective = objective?.systemId === sys.id;
            const color = (sys.controllingFaction && FACTION_HULL_COLOR[sys.controllingFaction]) || "#4be8ff";
            const seed = hashSeed(sys.id);
            return (
              <g
                key={sys.id}
                transform={`translate(${sys.x}, ${sys.y})`}
                onClick={() => jump(sys.id)}
                style={{ cursor: "pointer" }}
              >
                <circle r={54} fill={`url(#sysGlow-${sys.id})`} />
                {isObjective && (
                  <circle r={30} fill="none" stroke="var(--amber)" strokeWidth={2} opacity={0.7}>
                    <animate attributeName="r" values="24;34;24" dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.15;0.8" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                )}
                <g style={{ transformOrigin: `${0}px ${0}px` }}>
                  <ellipse
                    rx={22}
                    ry={7}
                    fill="none"
                    stroke={color}
                    strokeOpacity={0.45}
                    strokeWidth={1}
                    strokeDasharray="2 4"
                    transform={`rotate(${(seed % 180)})`}
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from={`0 0 0`}
                      to={`360 0 0`}
                      dur={`${14 + (seed % 10)}s`}
                      repeatCount="indefinite"
                    />
                  </ellipse>
                </g>
                <circle
                  r={isCurrent ? 15 : 11}
                  fill={isCurrent ? color : "var(--bg-panel-raised)"}
                  stroke={isObjective ? "var(--amber)" : color}
                  strokeWidth={2}
                  opacity={isCurrent ? 0.95 : 0.75}
                />
                {isCurrent && (
                  <circle r={5} fill="#fff" opacity={0.85}>
                    <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.4s" repeatCount="indefinite" />
                  </circle>
                )}
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
