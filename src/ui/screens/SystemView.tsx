import { useEffect, useRef, useState } from "preact/hooks";
import {
  GALAXIES,
  state,
  mineResource,
  collectWreck,
  isPoiAvailable,
  effectiveRemaining,
  getNextObjective,
} from "../../state/store";
import type { Poi, ResourceType } from "../../data/types";
import { playSfx } from "../../audio/engine";
import { attachResponsiveCanvas } from "../../engine/viewport";

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

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

/** Slow elliptical wander for patrol contacts, so the map feels alive rather than a grid of static dots. */
function wanderOffset(poi: Poi, now: number): { x: number; y: number } {
  if (poi.kind !== "patrol") return { x: 0, y: 0 };
  const seed = hashSeed(poi.id) * Math.PI * 2;
  const t = now / 1000;
  return { x: Math.cos(t * 0.18 + seed) * 46, y: Math.sin(t * 0.14 + seed * 1.7) * 30 };
}

export function SystemView({ onNavigate, onDock, onEngage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [nearPoi, setNearPoi] = useState<Poi | null>(null);
  const [progressPct, setProgressPct] = useState(0);
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
    const vp = attachResponsiveCanvas(canvas, container, REF_W, REF_H);
    const player = { x: 120, y: REF_H / 2, vx: 0, vy: 0, angle: 0 };
    let target: { x: number; y: number } | null = null;
    const keys = new Set<string>();
    let workingPoi: Poi | null = null;
    let workingAccum = 0;
    let last = performance.now();
    let particles: Particle[] = [];

    const stars = Array.from({ length: 160 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.5 + 0.3,
      a: Math.random() * 0.6 + 0.2,
      hue: Math.random() < 0.15 ? "255,214,170" : Math.random() < 0.3 ? "180,210,255" : "220,236,255",
    }));
    // A couple of soft nebula blobs per system, seeded from the system id so each place looks distinct.
    const nebulaSeed = hashSeed(system.id);
    const nebulae = Array.from({ length: 3 }, (_, i) => ({
      x: (Math.sin(nebulaSeed * 40 + i * 13.1) * 0.5 + 0.5),
      y: (Math.cos(nebulaSeed * 27 + i * 7.3) * 0.5 + 0.5),
      r: 220 + (i * 60),
      hue: i === 0 ? "80,60,160" : i === 1 ? "40,90,140" : "120,50,110",
    }));

    function onPointer(e: PointerEvent) {
      target = vp.toWorld(e.clientX, e.clientY);
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

      // POI proximity (using wander-adjusted effective positions so hit-testing matches rendering)
      const pois = system.pois.filter(isPoiAvailable);
      let closest: Poi | null = null;
      let closestDist = Infinity;
      let closestEff = { x: 0, y: 0 };
      for (const poi of pois) {
        const off = wanderOffset(poi, now);
        const ex = poi.x + off.x;
        const ey = poi.y + off.y;
        const d = Math.hypot(ex - player.x, ey - player.y);
        if (d < poi.radius && d < closestDist) {
          closest = poi;
          closestDist = d;
          closestEff = { x: ex, y: ey };
        }
      }
      const nearest: Poi | null = closest;

      if (nearest && nearest.kind === "asteroidField") {
        const remaining = effectiveRemaining(nearest);
        if (remaining > 0) {
          if (workingPoi?.id !== nearest.id) {
            workingPoi = nearest;
            workingAccum = 0;
          }
          workingAccum += dt;
          if (Math.random() < 0.5) {
            spawnParticle({
              x: closestEff.x + (Math.random() - 0.5) * 40,
              y: closestEff.y + (Math.random() - 0.5) * 40,
              vx: (Math.random() - 0.5) * 20,
              vy: (Math.random() - 0.5) * 20,
              life: 0.5,
              maxLife: 0.5,
              color: "255,210,120",
              size: 1.5,
            });
          }
          if (workingAccum >= 0.9) {
            workingAccum = 0;
            mineResource(nearest.id, (nearest.data?.yieldType as ResourceType) ?? "salvage", 6);
            playSfx("mine");
            for (let i = 0; i < 10; i++) {
              const ang = Math.random() * Math.PI * 2;
              spawnParticle({
                x: closestEff.x,
                y: closestEff.y,
                vx: Math.cos(ang) * 60,
                vy: Math.sin(ang) * 60,
                life: 0.4,
                maxLife: 0.4,
                color: "255,230,150",
                size: 2,
              });
            }
          }
          setProgressPct(Math.min(1, workingAccum / 0.9));
        } else {
          workingPoi = null;
          setProgressPct(0);
        }
      } else if (nearest && nearest.kind === "wreck") {
        if (workingPoi?.id !== nearest.id) {
          workingPoi = nearest;
          workingAccum = 0;
        }
        workingAccum += dt;
        if (Math.random() < 0.4) {
          spawnParticle({
            x: closestEff.x + (Math.random() - 0.5) * 30,
            y: closestEff.y + (Math.random() - 0.5) * 30,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 0.6,
            maxLife: 0.6,
            color: "180,220,255",
            size: 1.6,
          });
        }
        if (workingAccum >= 1.4) {
          workingAccum = 0;
          const rewards = (nearest.data?.rewards as Partial<Record<ResourceType, number>>) ?? {};
          collectWreck(nearest.id, rewards);
          playSfx("draw");
          for (let i = 0; i < 14; i++) {
            const ang = Math.random() * Math.PI * 2;
            spawnParticle({
              x: closestEff.x,
              y: closestEff.y,
              vx: Math.cos(ang) * 80,
              vy: Math.sin(ang) * 80,
              life: 0.5,
              maxLife: 0.5,
              color: "160,210,255",
              size: 2.2,
            });
          }
        }
        setProgressPct(Math.min(1, workingAccum / 1.4));
      } else {
        workingPoi = null;
        setProgressPct(0);
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
      vp.beginFrame(ctx2d);
      const { scale, offsetX, offsetY } = vp.transform();

      // starfield + nebulae fill the whole screen, independent of the world transform
      const bgGrad = ctx2d.createRadialGradient(
        vp.displayW / 2, vp.displayH / 2, 0,
        vp.displayW / 2, vp.displayH / 2, Math.max(vp.displayW, vp.displayH) * 0.75,
      );
      bgGrad.addColorStop(0, "#0c1a2e");
      bgGrad.addColorStop(1, "#03050a");
      ctx2d.fillStyle = bgGrad;
      ctx2d.fillRect(0, 0, vp.displayW, vp.displayH);

      for (const n of nebulae) {
        const g = ctx2d.createRadialGradient(n.x * vp.displayW, n.y * vp.displayH, 0, n.x * vp.displayW, n.y * vp.displayH, n.r);
        g.addColorStop(0, `rgba(${n.hue},0.16)`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx2d.fillStyle = g;
        ctx2d.fillRect(0, 0, vp.displayW, vp.displayH);
      }

      for (const s of stars) {
        ctx2d.globalAlpha = s.a;
        ctx2d.fillStyle = `rgb(${s.hue})`;
        ctx2d.beginPath();
        ctx2d.arc(s.x * vp.displayW, s.y * vp.displayH, s.r, 0, Math.PI * 2);
        ctx2d.fill();
      }
      ctx2d.globalAlpha = 1;

      ctx2d.save();
      ctx2d.translate(offsetX, offsetY);
      ctx2d.scale(scale, scale);

      for (const poi of pois) {
        const off = wanderOffset(poi, now);
        drawPoi(ctx2d, poi, poi.x + off.x, poi.y + off.y, now, poi.id === objectivePoiId);
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
      vp.destroy();
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system.id]);

  const isBounty = !!nearPoi?.data?.bounty;

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
              <div style={{ height: "100%", width: `${progressPct * 100}%`, background: "var(--cyan)" }} />
            </div>
          </div>
        )}
        {nearPoi && nearPoi.kind === "wreck" && (
          <div className="panel" style={{ position: "absolute", left: "50%", bottom: 20, transform: "translateX(-50%)", padding: "0.75rem 1rem", minWidth: 220 }}>
            <div style={{ fontSize: "0.85rem", marginBottom: "0.35rem" }}>Salvaging {nearPoi.name}...</div>
            <div style={{ height: 6, background: "var(--bg-inset)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPct * 100}%`, background: "var(--violet)" }} />
            </div>
          </div>
        )}
        {isBounty && nearPoi && (
          <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", fontSize: "0.72rem", color: "var(--amber)", background: "rgba(3,5,9,0.7)", padding: "0.3rem 0.7rem", borderRadius: 999, border: "1px solid var(--amber)" }}>
            Bounty contact — repeatable
          </div>
        )}
      </div>
      <div style={{ padding: "0.5rem 1rem", color: "var(--text-dim)", fontSize: "0.78rem" }}>
        Drag/tap to fly, or WASD / arrow keys. Approach stations, fields, wrecks, and contacts to interact.
      </div>
    </div>
  );
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: { x: number; y: number; angle: number }) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.shadowColor = "#4be8ff";
  ctx.shadowBlur = 14;
  const grad = ctx.createLinearGradient(-10, 0, 14, 0);
  grad.addColorStop(0, "#1c7d94");
  grad.addColorStop(1, "#8ff3ff");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(-10, -9);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-10, 9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawPoi(ctx: CanvasRenderingContext2D, poi: Poi, ex: number, ey: number, now: number, isObjective: boolean) {
  ctx.save();
  ctx.translate(ex, ey);
  if (poi.kind === "station") {
    const pulse = 0.85 + 0.15 * Math.sin(now / 500);
    ctx.shadowColor = "#ffb84d";
    ctx.shadowBlur = 10 * pulse;
    ctx.strokeStyle = "#ffb84d";
    ctx.fillStyle = "rgba(255,184,77,0.14)";
    ctx.lineWidth = 2;
    drawHex(ctx, 26);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    drawHex(ctx, 14);
    ctx.strokeStyle = "rgba(255,220,160,0.8)";
    ctx.stroke();
  } else if (poi.kind === "asteroidField") {
    const remaining = effectiveRemaining(poi);
    ctx.shadowBlur = 0;
    ctx.fillStyle = remaining > 0 ? "#9fb8cc" : "#3a4553";
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2;
      const r = 18 + (i % 3) * 6;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * r, Math.sin(ang) * r, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (remaining <= 0) {
      ctx.fillStyle = "rgba(160,180,200,0.55)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("recharging…", 0, 40);
    }
  } else if (poi.kind === "wreck") {
    const pulse = 0.5 + 0.5 * Math.sin(now / 340);
    ctx.shadowColor = "#b98cff";
    ctx.shadowBlur = 8 + pulse * 6;
    ctx.strokeStyle = "#b98cff";
    ctx.fillStyle = "rgba(185,140,255,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(18, 0);
    ctx.lineTo(0, 20);
    ctx.lineTo(-18, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (poi.kind === "patrol") {
    const bounty = !!poi.data?.bounty;
    const baseColor = bounty ? "255,159,77" : "255,92,92";
    const pulse = 0.5 + 0.5 * Math.sin(now / 220);
    ctx.strokeStyle = `rgba(${baseColor},${0.3 + pulse * 0.4})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, poi.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowColor = `rgb(${baseColor})`;
    ctx.shadowBlur = 8;
    ctx.fillStyle = `rgb(${baseColor})`;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
  } else if (poi.kind === "derelict") {
    ctx.shadowBlur = 0;
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
    ctx.translate(ex, ey - poi.radius - 22 + bob);
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
  ctx.fillText(poi.name, ex, ey + poi.radius + 16);
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
