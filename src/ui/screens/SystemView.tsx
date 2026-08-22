import { useEffect, useRef, useState } from "preact/hooks";
import { GALAXIES, state, mineResource, hasFlag, poiRuntime, getNextObjective } from "../../state/store";
import type { Poi, ResourceType } from "../../data/types";
import { playSfx } from "../../audio/engine";

const REF_W = 1000;
const REF_H = 600;
const PLAYER_SPEED = 260; // world units/sec
const ACCEL = 620;

interface Props {
  onNavigate: (screen: string) => void;
  onDock: (poiId: string) => void;
  onEngage: (encounterId: string, poiId: string, victoryFlag?: string) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

function visiblePois(systemPois: Poi[]): Poi[] {
  return systemPois.filter((p) => {
    if (p.requiresFlag && !hasFlag(p.requiresFlag)) return false;
    if (p.hiddenAfterFlag && hasFlag(p.hiddenAfterFlag)) return false;
    if (poiRuntime(p.id).cleared) return false;
    return true;
  });
}

export function SystemView({ onNavigate, onDock, onEngage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [nearPoi, setNearPoi] = useState<Poi | null>(null);
  const [miningPct, setMiningPct] = useState(0);
  const engagedRef = useRef(false);

  const system = GALAXIES.flatMap((g) => g.systems).find((s) => s.id === state.value.currentSystemId)!;
  const objective = getNextObjective();
  const objectivePoiId = objective?.systemId === system.id ? objective.poiId : undefined;
  const objectiveElsewhere = objective && objective.systemId !== system.id ? objective : null;

  useEffect(() => {
    engagedRef.current = false;
    const canvas = canvasRef.current!;
    const container = canvas.parentElement as HTMLElement;
    const ctx2d = canvas.getContext("2d")!;
    const player = { x: 120, y: REF_H / 2, vx: 0, vy: 0, angle: 0 };
    let target: { x: number; y: number } | null = null;
    const keys = new Set<string>();
    let miningPoi: Poi | null = null;
    let miningAccum = 0;
    let last = performance.now();
    let particles: Particle[] = [];
    let displayW = 0;
    let displayH = 0;
    let dpr = 1;

    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.4 + 0.3,
      a: Math.random() * 0.6 + 0.2,
    }));

    function resize() {
      const rect = container.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      displayW = rect.width;
      displayH = rect.height;
      canvas.width = Math.max(1, Math.round(displayW * dpr));
      canvas.height = Math.max(1, Math.round(displayH * dpr));
      canvas.style.width = `${displayW}px`;
      canvas.style.height = `${displayH}px`;
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    // Uniform scale (world stays undistorted — circles stay circles) with the
    // world content centered; the starfield separately fills the full screen.
    function transform() {
      const scale = Math.min(displayW / REF_W, displayH / REF_H);
      return { scale, offsetX: (displayW - REF_W * scale) / 2, offsetY: (displayH - REF_H * scale) / 2 };
    }

    function toWorldCoords(clientX: number, clientY: number) {
      const rect = canvas.getBoundingClientRect();
      const { scale, offsetX, offsetY } = transform();
      return { x: (clientX - rect.left - offsetX) / scale, y: (clientY - rect.top - offsetY) / scale };
    }

    function onPointer(e: PointerEvent) {
      target = toWorldCoords(e.clientX, e.clientY);
    }
    function onKeyDown(e: KeyboardEvent) {
      keys.add(e.key.toLowerCase());
    }
    function onKeyUp(e: KeyboardEvent) {
      keys.delete(e.key.toLowerCase());
    }

    canvas.addEventListener("pointerdown", onPointer);
    canvas.addEventListener("pointermove", (e) => {
      if (e.buttons > 0) onPointer(e);
    });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    function spawnParticle(p: Particle) {
      particles.push(p);
      if (particles.length > 240) particles.splice(0, particles.length - 240);
    }

    function step(now: number) {
      const dt = Math.min(0.25, Math.max(0, (now - last) / 1000));
      last = now;

      let ax = 0;
      let ay = 0;
      const usingKeys = keys.has("w") || keys.has("a") || keys.has("s") || keys.has("d") ||
        keys.has("arrowup") || keys.has("arrowdown") || keys.has("arrowleft") || keys.has("arrowright");
      if (usingKeys) {
        if (keys.has("w") || keys.has("arrowup")) ay -= 1;
        if (keys.has("s") || keys.has("arrowdown")) ay += 1;
        if (keys.has("a") || keys.has("arrowleft")) ax -= 1;
        if (keys.has("d") || keys.has("arrowright")) ax += 1;
        target = null;
      } else if (target) {
        const dx = target.x - player.x;
        const dy = target.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 6) {
          ax = dx / dist;
          ay = dy / dist;
        } else {
          target = null;
        }
      }
      const mag = Math.hypot(ax, ay) || 1;
      const thrusting = mag > 0 && (ax !== 0 || ay !== 0);
      player.vx += (ax / mag) * ACCEL * dt;
      player.vy += (ay / mag) * ACCEL * dt;
      const speed = Math.hypot(player.vx, player.vy);
      if (speed > PLAYER_SPEED) {
        player.vx = (player.vx / speed) * PLAYER_SPEED;
        player.vy = (player.vy / speed) * PLAYER_SPEED;
      }
      // Frame-rate-independent drag: ~2% of velocity remains after 1 full second of no thrust.
      const dragFactor = Math.pow(0.02, dt);
      player.vx *= dragFactor;
      player.vy *= dragFactor;
      player.x = Math.max(20, Math.min(REF_W - 20, player.x + player.vx * dt));
      player.y = Math.max(20, Math.min(REF_H - 20, player.y + player.vy * dt));
      if (Math.hypot(player.vx, player.vy) > 8) {
        player.angle = Math.atan2(player.vy, player.vx);
      }

      if (thrusting && Math.random() < 0.6) {
        const back = player.angle + Math.PI;
        spawnParticle({
          x: player.x + Math.cos(back) * 10,
          y: player.y + Math.sin(back) * 10,
          vx: Math.cos(back) * 40 + (Math.random() - 0.5) * 30,
          vy: Math.sin(back) * 40 + (Math.random() - 0.5) * 30,
          life: 0.35,
          maxLife: 0.35,
          color: "75,220,255",
          size: 2 + Math.random() * 1.5,
        });
      }

      // POI proximity
      const pois = visiblePois(system.pois);
      let closest: Poi | null = null;
      let closestDist = Infinity;
      for (const poi of pois) {
        const d = Math.hypot(poi.x - player.x, poi.y - player.y);
        if (d < poi.radius && d < closestDist) {
          closest = poi;
          closestDist = d;
        }
      }

      const nearest: Poi | null = closest;

      if (nearest && nearest.kind === "asteroidField") {
        const remaining = poiRuntime(nearest.id).remaining ?? (nearest.data?.remaining as number) ?? 0;
        if (remaining > 0) {
          if (miningPoi?.id !== nearest.id) {
            miningPoi = nearest;
            miningAccum = 0;
          }
          miningAccum += dt;
          if (Math.random() < 0.5) {
            spawnParticle({
              x: nearest.x + (Math.random() - 0.5) * 40,
              y: nearest.y + (Math.random() - 0.5) * 40,
              vx: (Math.random() - 0.5) * 20,
              vy: (Math.random() - 0.5) * 20,
              life: 0.5,
              maxLife: 0.5,
              color: "255,210,120",
              size: 1.5,
            });
          }
          if (miningAccum >= 0.9) {
            miningAccum = 0;
            mineResource(nearest.id, (nearest.data?.yieldType as ResourceType) ?? "salvage", 6);
            playSfx("mine");
            for (let i = 0; i < 10; i++) {
              const ang = Math.random() * Math.PI * 2;
              spawnParticle({
                x: nearest.x,
                y: nearest.y,
                vx: Math.cos(ang) * 60,
                vy: Math.sin(ang) * 60,
                life: 0.4,
                maxLife: 0.4,
                color: "255,230,150",
                size: 2,
              });
            }
          }
          setMiningPct(Math.min(1, miningAccum / 0.9));
        } else {
          miningPoi = null;
          setMiningPct(0);
        }
      } else {
        miningPoi = null;
        setMiningPct(0);
      }

      if (nearest && nearest.kind === "patrol" && !engagedRef.current) {
        engagedRef.current = true;
        playSfx("alarm");
        const encounterId = nearest.data?.encounterId as string;
        const victoryFlag = nearest.data?.victoryFlag as string | undefined;
        const poiId = nearest.id;
        setTimeout(() => onEngage(encounterId, poiId, victoryFlag), 400);
      }

      setNearPoi((prev: Poi | null) => (prev?.id !== nearest?.id ? nearest : prev));

      // update particles
      particles = particles.filter((p) => p.life > 0);
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }

      // --- draw ---
      const { scale, offsetX, offsetY } = transform();
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.clearRect(0, 0, displayW, displayH);

      // starfield fills the whole screen, independent of the world transform
      const bgGrad = ctx2d.createRadialGradient(
        displayW / 2, displayH / 2, 0,
        displayW / 2, displayH / 2, Math.max(displayW, displayH) * 0.75,
      );
      bgGrad.addColorStop(0, "#0c1a2e");
      bgGrad.addColorStop(1, "#03050a");
      ctx2d.fillStyle = bgGrad;
      ctx2d.fillRect(0, 0, displayW, displayH);
      for (const s of stars) {
        ctx2d.globalAlpha = s.a;
        ctx2d.fillStyle = "#bfe6ff";
        ctx2d.beginPath();
        ctx2d.arc(s.x * displayW, s.y * displayH, s.r, 0, Math.PI * 2);
        ctx2d.fill();
      }
      ctx2d.globalAlpha = 1;

      ctx2d.save();
      ctx2d.translate(offsetX, offsetY);
      ctx2d.scale(scale, scale);

      for (const poi of pois) {
        drawPoi(ctx2d, poi, now, poi.id === objectivePoiId);
      }

      for (const p of particles) {
        ctx2d.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx2d.fillStyle = `rgb(${p.color})`;
        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx2d.fill();
      }
      ctx2d.globalAlpha = 1;

      drawPlayer(ctx2d, player);
      ctx2d.restore();
    }
    // A fixed-interval tick (rather than requestAnimationFrame) keeps the loop running
    // at a steady rate across embedding contexts that throttle rAF for backgrounded/
    // composited tabs — movement is still computed from real elapsed time either way.
    const intervalId = setInterval(() => step(performance.now()), 16);

    return () => {
      clearInterval(intervalId);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system.id]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "0.6rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="title">{system.name}</div>
        <button className="btn" onClick={() => onNavigate("galaxy")}>Jump Out</button>
      </div>
      {objectiveElsewhere && (
        <button
          className="btn primary"
          style={{ margin: "0 1rem 0.5rem", textAlign: "left" }}
          onClick={() => onNavigate("galaxy")}
        >
          ▸ Next: {objectiveElsewhere.label} — jump to {objectiveElsewhere.systemName}
        </button>
      )}
      <div style={{ flex: 1, position: "relative" }}>
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "crosshair" }}
        />
        {nearPoi && nearPoi.kind === "station" && (
          <div className="panel" style={{ position: "absolute", left: "50%", bottom: 20, transform: "translateX(-50%)", padding: "0.75rem 1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <span>{nearPoi.name}</span>
            <button className="btn primary" onClick={() => onDock(nearPoi.id)}>Dock</button>
          </div>
        )}
        {nearPoi && nearPoi.kind === "asteroidField" && (
          <div className="panel" style={{ position: "absolute", left: "50%", bottom: 20, transform: "translateX(-50%)", padding: "0.75rem 1rem", minWidth: 220 }}>
            <div style={{ fontSize: "0.85rem", marginBottom: "0.35rem" }}>Mining {nearPoi.name}...</div>
            <div style={{ height: 6, background: "var(--bg-inset)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${miningPct * 100}%`, background: "var(--cyan)" }} />
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: "0.5rem 1rem", color: "var(--text-dim)", fontSize: "0.78rem" }}>
        Drag/tap to fly, or WASD / arrow keys. Approach stations, asteroid fields, and contacts to interact.
      </div>
    </div>
  );
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: { x: number; y: number; angle: number }) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.shadowColor = "#4be8ff";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#4be8ff";
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-10, -8);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPoi(ctx: CanvasRenderingContext2D, poi: Poi, now: number, isObjective: boolean) {
  ctx.save();
  ctx.translate(poi.x, poi.y);
  if (poi.kind === "station") {
    ctx.strokeStyle = "#ffb84d";
    ctx.fillStyle = "rgba(255,184,77,0.12)";
    ctx.lineWidth = 2;
    drawHex(ctx, 26);
    ctx.fill();
    ctx.stroke();
  } else if (poi.kind === "asteroidField") {
    const remaining = poiRuntime(poi.id).remaining ?? (poi.data?.remaining as number) ?? 0;
    ctx.fillStyle = remaining > 0 ? "#9fb8cc" : "#3a4553";
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2;
      const r = 18 + (i % 3) * 6;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * r, Math.sin(ang) * r, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (poi.kind === "patrol") {
    const pulse = 0.5 + 0.5 * Math.sin(now / 220);
    ctx.strokeStyle = `rgba(255,92,92,${0.3 + pulse * 0.4})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, poi.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ff5c5c";
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
  } else if (poi.kind === "derelict") {
    ctx.strokeStyle = "#5d7285";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, -10);
    ctx.lineTo(16, 6);
    ctx.moveTo(-10, 12);
    ctx.lineTo(14, -8);
    ctx.stroke();
  }
  ctx.restore();

  if (isObjective) {
    const bob = Math.sin(now / 260) * 4;
    ctx.save();
    ctx.translate(poi.x, poi.y - poi.radius - 22 + bob);
    ctx.fillStyle = "#ffe25d";
    ctx.shadowColor = "#ffe25d";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-7, -12);
    ctx.lineTo(7, -12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = isObjective ? "#ffe25d" : "rgba(234,246,255,0.75)";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(poi.name, poi.x, poi.y + poi.radius + 16);
  ctx.restore();
}

function drawHex(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 3) * i - Math.PI / 6;
    const x = Math.cos(ang) * r;
    const y = Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
