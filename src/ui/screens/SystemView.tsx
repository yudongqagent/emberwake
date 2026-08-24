import { useEffect, useRef, useState } from "preact/hooks";
import {
  GALAXIES,
  state,
  flagship,
  mineResource,
  collectWreck,
  isPoiAvailable,
  effectiveRemaining,
  getNextObjective,
} from "../../state/store";
import type { Poi, ResourceType } from "../../data/types";
import { playSfx } from "../../audio/engine";
import { attachResponsiveCanvas } from "../../engine/viewport";
import { encounterById } from "../../data/encounters";
import { computeSpeed } from "../../engine/ships";
import {
  drawPlayerHull,
  drawEnemyHull,
  drawStationArt,
  drawAsteroidRocks,
  drawWreckArt,
  drawDerelictArt,
} from "../render/shipArt";
import { reportError } from "../../engine/errorReporting";
import { t } from "../../i18n/strings";
import { localizedSystemName, localizedPoiName } from "../../i18n/data";

const REF_W = 1000;
const REF_H = 600;

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
    const shipSpeed = flagship.value ? computeSpeed(flagship.value) : 200;
    const shipAccel = shipSpeed * 2.4;
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
      try {
        const world = vp.toWorld(e.clientX, e.clientY);
        if (Number.isFinite(world.x) && Number.isFinite(world.y)) target = world;
      } catch (err) {
        reportError("SystemView.onPointer", err);
      }
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
      player.vx += (ax / mag) * shipAccel * dt;
      player.vy += (ay / mag) * shipAccel * dt;
      const speed = Math.hypot(player.vx, player.vy);
      if (speed > shipSpeed) {
        player.vx = (player.vx / speed) * shipSpeed;
        player.vy = (player.vy / speed) * shipSpeed;
      }
      // Frame-rate-independent drag: ~2% of velocity remains after 1 full second of no thrust.
      const dragFactor = Math.pow(0.02, dt);
      player.vx *= dragFactor;
      player.vy *= dragFactor;
      const nextX = player.x + player.vx * dt;
      const nextY = player.y + player.vy * dt;
      // Defense in depth — see the matching guard in Combat.tsx: NaN/Infinity from
      // anywhere upstream must never poison position/velocity permanently.
      if (Number.isFinite(nextX) && Number.isFinite(nextY)) {
        player.x = Math.max(20, Math.min(REF_W - 20, nextX));
        player.y = Math.max(20, Math.min(REF_H - 20, nextY));
      } else {
        reportError("SystemView.step (player position)", new Error(`non-finite position: vx=${player.vx} vy=${player.vy}`));
        player.vx = 0;
        player.vy = 0;
        target = null;
      }
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
      } else if (nearest && nearest.kind === "riftPocket") {
        // Issue #10: unlike every other POI kind, a Rift Pocket isn't a proximity-
        // timer collection — approaching it just surfaces the dive-depth panel (see
        // the JSX below); the actual "collection" happens by winning the fight.
        workingPoi = null;
        setProgressPct(0);
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

      drawPlayer(ctx2d, player, now, Math.hypot(player.vx, player.vy) > 12);
      ctx2d.restore();
    }
    // A fixed-interval tick (rather than requestAnimationFrame) keeps the loop running
    // at a steady rate across embedding contexts that throttle rAF for backgrounded/
    // composited tabs — movement is still computed from real elapsed time either way.
    // See the matching guard in Combat.tsx: a throw anywhere in step() must never
    // permanently stall the loop.
    const intervalId = setInterval(() => {
      try {
        step(performance.now());
      } catch (err) {
        reportError("SystemView.step", err);
      }
    }, 16);

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
        <div className="title">{localizedSystemName(system)}</div>
        <button className="btn" onClick={() => onNavigate("galaxy")}>{t("common.jumpOut")}</button>
      </div>
      {objectiveElsewhere && (
        <button
          className="btn primary"
          style={{ margin: "0 1rem 0.5rem", textAlign: "left" }}
          onClick={() => onNavigate("galaxy")}
        >
          {t("system.next", { label: objectiveElsewhere.label, system: objectiveElsewhere.systemName })}
        </button>
      )}
      <div style={{ flex: 1, position: "relative" }}>
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "crosshair" }}
        />
        {nearPoi && nearPoi.kind === "station" && (
          <div className="panel" style={{ position: "absolute", left: "50%", bottom: 20, transform: "translateX(-50%)", padding: "0.75rem 1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <span>{localizedPoiName(nearPoi)}</span>
            <button className="btn primary" onClick={() => onDock(nearPoi.id)}>{t("common.dock")}</button>
          </div>
        )}
        {nearPoi && nearPoi.kind === "asteroidField" && (
          <div className="panel" style={{ position: "absolute", left: "50%", bottom: 20, transform: "translateX(-50%)", padding: "0.75rem 1rem", minWidth: 220 }}>
            <div style={{ fontSize: "0.85rem", marginBottom: "0.35rem" }}>{t("system.mining", { name: localizedPoiName(nearPoi) })}</div>
            <div style={{ height: 6, background: "var(--bg-inset)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPct * 100}%`, background: "var(--cyan)" }} />
            </div>
          </div>
        )}
        {nearPoi && nearPoi.kind === "wreck" && (
          <div className="panel" style={{ position: "absolute", left: "50%", bottom: 20, transform: "translateX(-50%)", padding: "0.75rem 1rem", minWidth: 220 }}>
            <div style={{ fontSize: "0.85rem", marginBottom: "0.35rem" }}>{t("system.salvaging", { name: localizedPoiName(nearPoi) })}</div>
            <div style={{ height: 6, background: "var(--bg-inset)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPct * 100}%`, background: "var(--violet)" }} />
            </div>
          </div>
        )}
        {nearPoi && nearPoi.kind === "riftPocket" && (() => {
          const tiers = (nearPoi.data?.riftTiers as Record<"shallow" | "deep" | "abyssal", string> | undefined) ?? {
            shallow: "riftDiveShallow", deep: "riftDiveDeep", abyssal: "riftDiveAbyssal",
          };
          return (
            <div className="panel accent scanline" style={{ position: "absolute", left: "50%", bottom: 20, transform: "translateX(-50%)", padding: "0.75rem 1rem", minWidth: 260, textAlign: "center", ["--accent" as any]: "var(--violet)" }}>
              <div style={{ fontSize: "0.85rem", marginBottom: "0.15rem", fontWeight: 700 }}>{localizedPoiName(nearPoi)}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: "0.55rem" }}>
                {t("system.riftPrompt")}
              </div>
              <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap" }}>
                <button className="btn" onClick={() => onEngage(tiers.shallow, nearPoi.id)}>{t("system.riftShallow")}</button>
                <button className="btn" onClick={() => onEngage(tiers.deep, nearPoi.id)}>{t("system.riftDeep")}</button>
                <button className="btn danger" onClick={() => onEngage(tiers.abyssal, nearPoi.id)}>{t("system.riftAbyssal")}</button>
              </div>
            </div>
          );
        })()}
        {isBounty && nearPoi && (
          <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", fontSize: "0.72rem", color: "var(--amber)", background: "rgba(3,5,9,0.7)", padding: "0.3rem 0.7rem", borderRadius: 999, border: "1px solid var(--amber)" }}>
            {t("system.bountyContact")}
          </div>
        )}
      </div>
      <div style={{ padding: "0.5rem 1rem", color: "var(--text-dim)", fontSize: "0.78rem" }}>
        {t("system.hint")}
      </div>
    </div>
  );
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: { x: number; y: number; angle: number }, now: number, thrusting: boolean) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  drawPlayerHull(ctx, 1.05, now, thrusting);
  ctx.restore();
}

function drawPoi(ctx: CanvasRenderingContext2D, poi: Poi, ex: number, ey: number, now: number, isObjective: boolean) {
  ctx.save();
  ctx.translate(ex, ey);
  if (poi.kind === "station") {
    drawStationArt(ctx, 30, now);
  } else if (poi.kind === "asteroidField") {
    const remaining = effectiveRemaining(poi);
    drawAsteroidRocks(ctx, poi.id, remaining > 0, now);
  } else if (poi.kind === "wreck") {
    drawWreckArt(ctx, poi.id, now);
  } else if (poi.kind === "riftPocket") {
    // Issue #10: a swirling void portal, not a wreck — the map's own signal that
    // this POI leads somewhere else entirely rather than sitting still to be mined.
    const t = now / 1000;
    for (let ring = 0; ring < 3; ring++) {
      const rr = 12 + ring * 7 + Math.sin(t * 1.4 + ring) * 2;
      ctx.globalAlpha = 0.5 - ring * 0.12;
      ctx.strokeStyle = "#b478ff";
      ctx.shadowColor = "#b478ff";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, rr, rr * 0.6, t * 0.8 + ring, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
    coreGrad.addColorStop(0, "#0a0416");
    coreGrad.addColorStop(1, "#b478ff");
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
  } else if (poi.kind === "patrol") {
    const bounty = !!poi.data?.bounty;
    const baseColor = bounty ? "255,159,77" : "255,92,92";
    const pulse = 0.5 + 0.5 * Math.sin(now / 220);
    ctx.strokeStyle = `rgba(${baseColor},${0.3 + pulse * 0.4})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, poi.radius, 0, Math.PI * 2);
    ctx.stroke();
    let faction = "reavers";
    const encounterId = poi.data?.encounterId as string | undefined;
    if (encounterId) {
      try {
        faction = encounterById(encounterId).faction;
      } catch {
        // unknown encounter id — keep the reavers fallback
      }
    }
    drawEnemyHull(ctx, faction, 1.05, now);
  } else if (poi.kind === "derelict") {
    drawDerelictArt(ctx, poi.id, now);
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
  ctx.fillText(localizedPoiName(poi), ex, ey + poi.radius + 16);
  ctx.restore();
}
