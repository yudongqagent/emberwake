import { useState } from "preact/hooks";
import { unlockedGalaxies, currentGalaxy, state, travelToSystem, getNextObjective } from "../../state/store";
import { playSfx } from "../../audio/engine";
import { FACTION_HULL_COLOR } from "../render/shipArt";
import { t } from "../../i18n/strings";
import { regionDangerGap } from "../../state/store";
import { localizedGalaxyName, localizedSystemName } from "../../i18n/data";

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
          {galaxies.map((g) => {
            // Open-world redesign: every region is reachable from the first
            // minute, so the tab has to say how dangerous it is. Being killed by
            // a region you were warned about is a fair loss; being killed by one
            // you weren't is a bug.
            const gap = regionDangerGap(g.threat);
            const tone = gap >= 3 ? "var(--red)" : gap >= 1 ? "var(--amber)" : "var(--green)";
            return (
              <button
                key={g.id}
                className={`btn ${g.id === viewingId ? "primary" : ""}`}
                style={{
                  flex: "none", whiteSpace: "nowrap", fontSize: "0.7rem", padding: "0.55em 0.9em",
                  display: "flex", alignItems: "center", gap: "0.4em",
                  borderColor: g.id === viewingId ? undefined : tone,
                }}
                onClick={() => setViewingId(g.id)}
                title={t(gap >= 3 ? "region.farAbove" : gap >= 1 ? "region.above" : "region.ready", { n: g.threat })}
              >
                {localizedGalaxyName(g)}
                <span aria-hidden="true" style={{ display: "flex", gap: 1 }}>
                  {Array.from({ length: g.threat }, (_, i) => (
                    <span key={i} style={{ width: 3, height: 8, borderRadius: 1, background: tone, opacity: 0.85 }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {/* Back to the system view. Needed once the bottom nav bar was removed
          (2026-08-24): the galaxy map is a place you travel FROM, and without
          this the only exit was committing to a jump. */}
      <div style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
        <div className="title" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {localizedGalaxyName(galaxy)}
        </div>
        <button className="btn ghost" style={{ flex: "none" }} onClick={() => onNavigate("system")}>
          {t("galaxy.backToSystem")}
        </button>
      </div>
      {objective && (
        <div style={{ margin: "0 1rem 0.5rem", fontSize: "0.8rem", color: "var(--amber)" }}>
          {t("galaxy.nextAt", { label: objective.label, system: objective.systemName })}
        </div>
      )}
      {/* minHeight: 0 + 绝对定位的 svg。
          
          实测(2026-08-30):这个 flex 子元素没有 minHeight: 0,而带 viewBox 的 svg
          用 height:100% 时会按自己的宽高比撑开——在 1280x720 的窗口里它渲染成
          1280x902,底部落在 y=1077。起始星区五个星系有两个在屏幕外,而**第一个
          目标「茶隼歇息地」正是其中之一**:游戏让新玩家去一个他看不到也点不到
          的地方。
          
          绝对定位让 svg 拿到容器的真实尺寸,preserveAspectRatio 的默认值
          (xMidYMid meet)就会把整张图完整装进去。 */}
      {/* 右边留出舰船控制台的宽度。
      
          实测(2026-08-30,手机比例):控制台是绝对定位浮在地图上的,
          document.elementFromPoint 打在「荆棘航迹」和「寒域锚地」的节点上返回的是
          那块 DIV 而不是 svg 的 circle —— 也就是说手机上这两个星系**点不到**,
          而寒域锚地正是第一幕 BOSS 所在地。
          
          留白比"让控制台穿透点击"更对:后者能点了,但标签仍然被盖住看不清。 */}
      <div style={{ flex: 1, position: "relative", minHeight: 0, overflow: "hidden" }}>
        <svg
          viewBox="0 0 1000 700"
          style={{
            // 宽高都写死,不留 auto。
            //
            // 带 viewBox 的 svg 是替换元素:只要 width 或 height 有一个是 auto,
            // 它就按 viewBox 的宽高比从另一边反推,inset 完全管不住它。我在这上面
            // 连错两次:
            //   inset:0 + height:100% + width:auto → 从高度推出 796 宽,手机上横向
            //     溢出,反而多两个星系点不到
            //   四条 inset + 都 auto      → 从宽度推出 856 高,桌面上纵向溢出 353px,
            //     容器明明只有 503
            // 宽高都是确定值之后,preserveAspectRatio 的默认值(xMidYMid meet)才会
            // 老老实实把整张图装进去。右边减掉的是舰船控制台的宽度。
            position: "absolute",
            top: 0, left: 0,
            width: "calc(100% - 3.6rem - var(--safe-right))",
            height: "100%",
          }}
        >
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
                  {localizedSystemName(sys)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ padding: "0.75rem 1rem", color: "var(--text-dim)", fontSize: "0.8rem" }}>
        {galaxies.length > 1 ? t("galaxy.hintMulti") : t("galaxy.hintSingle")}
      </div>
    </div>
  );
}
