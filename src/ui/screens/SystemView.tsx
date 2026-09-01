import { useEffect, useRef, useState } from "preact/hooks";
import {
  GALAXIES,
  state,
  flagship,
  mineResource,
  collectWreck,
  isPoiAvailable,
  systemPois,
  effectiveRemaining,
  getNextObjective,
  effectiveMaxHull,
  encounterThreatRead,
  formatThreatPct,
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
import { HullIcon, FACTION_COLOR } from "../components/Icons";
import { Bar, hullBarKind } from "../components/StatBlock";

/** One colour per contact type so the manifest and the map agree at a glance
 * (design-principles.md tenet 4 — identify by colour/shape, not by reading). */
const POI_KIND_COLOR: Record<string, string> = {
  station: "#5dd6ff",
  asteroidField: "#9fb8cc",
  derelict: "#b98cff",
  patrol: "#ff5c5c",
  storyMarker: "#ffe25d",
  wreck: "#b98cff",
  riftPocket: "#c48cff",
};

const REF_W = 1000;
const REF_H = 600;

interface Props {
  onNavigate: (screen: string) => void;
  onDock: (poiId: string) => void;
  onEngage: (encounterId: string, poiId: string, victoryFlag?: string) => void;
  /** 废弃船:开一个星图事件。 */
  onInvestigate: (poiId: string) => void;
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

export function SystemView({ onNavigate, onDock, onEngage, onInvestigate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [nearPoi, setNearPoi] = useState<Poi | null>(null);
  /** Set by the contacts panel to order a course for a POI. The canvas effect
   * is frozen at mount, so it reads this ref every frame instead of a prop. */
  /** Mirrored for the canvas loop, which is frozen at mount — same pattern as
   * navTargetRef. Feeds the in-world hull ring on the player ship. */
  const hullFracRef = useRef(1);
  const navTargetRef = useRef<{ x: number; y: number } | null>(null);
  const [navTargetId, setNavTargetId] = useState<string | null>(null);
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 120, y: 300 });
  const [progressPct, setProgressPct] = useState(0);
  const engagedRef = useRef(false);

  const system = GALAXIES.flatMap((g) => g.systems).find((s) => s.id === state.value.currentSystemId)!;
  // 猎杀队按星区威胁度缩放,所以取目标需要知道自己在哪个星区。
  const galaxy = GALAXIES.find((g) => g.id === system.galaxyId)!;
  const objective = getNextObjective();
  const objectivePoiId = objective?.systemId === system.id ? objective.poiId : undefined;
  const objectiveElsewhere = objective && !objective.panel && objective.systemId !== system.id ? objective : null;
  // 这一步不在星图上,而在舰上面板里(进阶)。点了就把那个面板打开——
  // 目标条说"提升舰级"却把玩家丢到星图上,等于又指错一次。
  const objectivePanel = objective?.panel ? objective : null;
  // 只有在本星系**而且真的有一个点可去**的时候才提示。
  //
  // 少了后半个条件的话,开场就会显示「下一步:寒醒——就在本星系」——而"寒醒"正是
  // 此刻正在播的那场戏,而且没有对应的 POI,按钮点了什么都不会发生。
  // 指路指到一个不存在的地方,比不指路更糟。
  const objectiveHere = objective && objective.systemId === system.id && objective.poiId ? objective : null;

  useEffect(() => {
    engagedRef.current = false;
    const canvas = canvasRef.current!;
    const container = canvas.parentElement as HTMLElement;
    const ctx2d = canvas.getContext("2d")!;
    const vp = attachResponsiveCanvas(canvas, container, REF_W, REF_H);
    const player = { x: 120, y: REF_H / 2, vx: 0, vy: 0, angle: 0 };
    // Hull speeds became monotonic on 2026-08-24 (ascension must never reduce a
    // stat), which raised the top end from ~352 to ~616 — fast enough to make the
    // system map feel twitchy. Compressed toward the old comfortable range here so
    // a bigger hull still flies faster, just not disproportionately: the map is a
    // place to navigate, not a race track.
    const rawSpeed = flagship.value ? computeSpeed(flagship.value) : 200;
    const shipSpeed = 200 + (rawSpeed - 200) * 0.45;
    const shipAccel = shipSpeed * 2.4;
    let target: { x: number; y: number } | null = null;
    let lastPosPush = 0;
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

      // A course ordered from the contacts panel behaves exactly like a tap on
      // the map: it sets the flight target, and manual input still overrides it.
      if (navTargetRef.current) {
        target = navTargetRef.current;
        navTargetRef.current = null;
      }

      let ax = 0;
      let ay = 0;
      const usingKeys = keys.has("w") || keys.has("a") || keys.has("s") || keys.has("d") ||
        keys.has("arrowup") || keys.has("arrowdown") || keys.has("arrowleft") || keys.has("arrowright");
      if (usingKeys) {
        setNavTargetId(null);
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
        if (now - lastPosPush > 180) {
          lastPosPush = now;
          setPlayerPos({ x: player.x, y: player.y });
        }
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
      const pois = systemPois(system, galaxy).filter(isPoiAvailable);
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

      drawPlayer(ctx2d, player, now, Math.hypot(player.vx, player.vy) > 12, hullFracRef.current);
      ctx2d.restore();
    }
    // 画面循环跟着显示器走(requestAnimationFrame),不是定时器。
    //
    // 2026-09-01(/loop 第 84 轮)。原来是 setInterval(16),SystemView 那边还写了
    // 理由:"固定间隔能在会限制 rAF 的嵌入环境里保持稳定节奏"。那个顾虑是真的,
    // 但它换来的代价更大:
    //
    //   1. 16ms 对不上 60Hz 的 16.67ms —— 相位一直在漂,每秒有两三帧落进同一个
    //      刷新间隔里被白画一遍,画面因此有细微的抖动。rAF 存在的理由就是这个。
    //   2. **看不见的时候照画**。实测(手机视口、标签页隐藏):画布每秒仍在执行
    //      约 1833 次 ctx.save() —— 玩家切走之后,手机还在满速渲染没人看的画面。
    //
    // 换成 rAF 是安全的:step(now) 自己从 now 算 dt(还夹了 0.25 秒上限),所以
    // 停一段再回来不会跳;而**战斗逻辑走的是另一条 150ms 的心跳**,不在这个循环
    // 里,所以画面暂停不会让战斗暂停。这个仓库里另外六处动画本来就用的 rAF,
    // 这两处才是例外。
    // 和 Combat.tsx 里同一条:step() 里任何一处抛异常都不能把循环永久卡死。
    let raf = 0;
    const frame = (now: number) => {
      try {
        step(now);
      } catch (err) {
        reportError("SystemView.step", err);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      vp.destroy();
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system.id]);

  const isBounty = !!nearPoi?.data?.bounty;
  const ship = flagship.value;
  const shipHullFrac = ship ? ship.currentHp / effectiveMaxHull(ship) : 0;
  hullFracRef.current = shipHullFrac;
  const visiblePois = systemPois(system, galaxy).filter((p) => isPoiAvailable(p));

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* ---- SYSTEM IDENTITY + VITALS ----
          Redesigned 2026-08-24 (player report: "地图...还是旧的"). The map used to
          be a bare title strip over a mostly-empty starfield: you couldn't see your
          own hull, what faction held the system, or what was even in it without
          pixel-hunting for unlabelled blobs. */}
      <div style={{ padding: "0.55rem 1rem 0.5rem", borderBottom: "1px solid var(--line)", background: "rgba(5,8,16,0.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ minWidth: 0 }}>
            {/* 星系名允许折行,不要截断。
                2026-09-01(第 101 轮):切到英文 + 375px 手机宽度实测,
                「Coldreach Anchorage」需要 266px 而只拿到 224px——**每一块屏幕**
                的页首都被切掉一截,而玩家看的正是"我现在在哪儿"。中文名四个字
                塞得下,所以只测中文永远撞不到。
                容器改成往下长一行,而不是把名字砍掉——搜到的原话就是
                "用能纵向生长的自适应容器,别给文字定死宽度"。 */}
            <div className="title" style={{ fontSize: "1rem", overflowWrap: "anywhere" }}>
              {localizedSystemName(system)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.1rem" }}>
              <span
                style={{
                  width: 7, height: 7, borderRadius: "50%", flex: "none",
                  background: system.controllingFaction ? FACTION_COLOR[system.controllingFaction] : "var(--text-dim)",
                  boxShadow: system.controllingFaction ? `0 0 6px ${FACTION_COLOR[system.controllingFaction]}` : "none",
                }}
              />
              <span className="eyebrow" style={{ color: "var(--text-dim)" }}>
                {system.controllingFaction ? t(`faction.${system.controllingFaction}`) : t("system.unclaimed")}
              </span>
            </div>
          </div>
          <button className="btn" style={{ flex: "none" }} onClick={() => onNavigate("galaxy")}>{t("common.jumpOut")}</button>
        </div>

        {ship && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginTop: "0.5rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", flex: "none" }}>
              <HullIcon size={13} color={shipHullFrac > 0.5 ? "var(--green)" : shipHullFrac > 0.2 ? "var(--amber)" : "var(--red)"} />
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.76rem", fontVariantNumeric: "tabular-nums", color: "var(--text-hi)" }}>
                {ship.currentHp} / {effectiveMaxHull(ship)}
              </span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}><Bar fraction={shipHullFrac} kind={hullBarKind(shipHullFrac)} /></span>
            <span className="eyebrow" style={{ flex: "none", color: "var(--text-dim)" }}>
              {t("ascension.level", { level: ship.level })}
            </span>
          </div>
        )}
      </div>
      {objectivePanel && (
        <button
          className="btn primary"
          style={{ margin: "0 1rem 0.5rem", textAlign: "left" }}
          onClick={() => onNavigate(objectivePanel.panel!)}
        >
          {`\u25b8 ${objectivePanel.label}`}
        </button>
      )}
      {objectiveElsewhere && (
        <button
          className="btn primary"
          style={{ margin: "0 1rem 0.5rem", textAlign: "left" }}
          onClick={() => onNavigate("galaxy")}
        >
          {t("system.next", { label: objectiveElsewhere.label, system: objectiveElsewhere.systemName })}
        </button>
      )}
      {/* 目标就在本星系时,原来什么都不说——只在画布上给那个点加个高亮。
      
          实测(2026-08-31):游戏让你跳到茶隼歇息地,你跳过来了,顶部的提示就消失了,
          而目标列表里躺着 4 个点,没有任何标记。玩家最需要指路的那一刻,指路的
          东西不见了。搜到的原则是「标记应当随进度**变化**,而不是消失」。
          
          点一下就设航向:玩家已经在读这一行了,让它直接可用。 */}
      {objectiveHere && (
        <button
          className="btn primary"
          style={{ margin: "0 1rem 0.5rem", textAlign: "left" }}
          onClick={() => {
            const poi = visiblePois.find((p) => p.id === objectivePoiId);
            if (poi) {
              navTargetRef.current = { x: poi.x, y: poi.y };
              setNavTargetId(poi.id);
              playSfx("click");
            }
          }}
        >
          {t("system.nextHere", { label: objectiveHere.label })}
        </button>
      )}
      <div style={{ flex: 1, position: "relative" }}>
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "crosshair" }}
        />
        {/* 废弃船:靠近之后它会问你一个问题(data/events.ts)。
            在此之前这三个点只画了美术、没有任何交互代码——星图上 61 个点,
            0 个会给玩家一个选择。 */}
        {nearPoi && nearPoi.kind === "derelict" && (
          <div className="panel" style={{ position: "absolute", left: "50%", bottom: 20, transform: "translateX(-50%)", padding: "0.75rem 1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <span>{localizedPoiName(nearPoi)}</span>
            <button className="btn primary" onClick={() => onInvestigate(nearPoi.id)}>{t("event.investigate")}</button>
          </div>
        )}
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
              {/* 每一档下面都把威胁读数写出来。
                *
                * 2026-09-01(/loop 第 109 轮)。这三个按钮原来只有形容词——浅层 /
                * 深层 / 深渊——而这是整个游戏里赌注最大的一次选择,而且是**三选一**,
                * 玩家却没有任何可比的东西。巡逻点早就有 ThreatRead 了(它只对
                * kind === "patrol" 渲染,裂隙口是 riftPocket,所以漏在外面),
                * 裂隙的层间面板也有预告。规则对了,但没接全。
                *
                * 文案复用巡逻点那一条 system.threatRead,不另写一份——两份迟早对不上。 */}
              <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap" }}>
                {([
                  { id: tiers.shallow, labelKey: "system.riftShallow", cls: "btn" },
                  { id: tiers.deep, labelKey: "system.riftDeep", cls: "btn" },
                  { id: tiers.abyssal, labelKey: "system.riftAbyssal", cls: "btn danger" },
                ] as const).map((tier) => {
                  const read = encounterThreatRead(tier.id);
                  const pct = formatThreatPct(read?.worstHitFraction ?? 0);
                  return (
                    <button
                      key={tier.id}
                      className={tier.cls}
                      style={{ flexDirection: "column", gap: 2, paddingTop: "0.4em", paddingBottom: "0.4em" }}
                      onClick={() => onEngage(tier.id, nearPoi.id)}
                    >
                      <span>{t(tier.labelKey)}</span>
                      {read && (
                        <span
                          style={{
                            fontSize: "0.56rem", opacity: 0.85, fontWeight: 400,
                            letterSpacing: "normal", textTransform: "none",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {t("system.threatRead", { count: read.enemies, pct })}
                        </span>
                      )}
                    </button>
                  );
                })}
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
      {/* ---- CONTACTS ----
          A legible manifest of what's actually in this system, with type icon,
          distance, and a course order. Deliberately NOT a mission-select menu
          (design-principles.md tenet 2): ordering a course flies the ship there
          through real space exactly as tapping the map does — it never teleports,
          never skips the approach, and manual flight overrides it instantly. It
          exists so the system reads as a place with known contacts instead of a
          dark field you sweep for unlabelled dots. */}
      <div style={{ borderTop: "1px solid var(--line)", background: "rgba(5,8,16,0.72)", padding: "0.45rem 1rem 0.55rem" }}>
        <div className="eyebrow" style={{ color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>
          {t("system.contacts", { count: visiblePois.length })}
        </div>
        {visiblePois.length === 0 ? (
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{t("system.noContacts")}</div>
        ) : (
          <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", paddingBottom: "0.15rem" }}>
            {visiblePois.map((poi) => {
              const d = Math.round(Math.hypot(poi.x - playerPos.x, poi.y - playerPos.y));
              const isNear = nearPoi?.id === poi.id;
              const isNav = navTargetId === poi.id;
              // 剧情目标在列表里也要标出来。画布上的那个高亮很含蓄,而玩家真正
              // 在读的是这一行。
              const isObjective = poi.id === objectivePoiId;
              const color = POI_KIND_COLOR[poi.kind] ?? "var(--text-mid)";
              return (
                <button
                  key={poi.id}
                  className="btn ghost"
                  style={{
                    flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.15rem",
                    padding: "0.4em 0.6em", minWidth: 108, textAlign: "left",
                    borderColor: isObjective ? "var(--amber)" : isNear ? color : isNav ? "var(--cyan)" : undefined,
                    boxShadow: isObjective ? "0 0 10px var(--amber)" : isNear ? `0 0 8px ${color}` : undefined,
                  }}
                  onClick={() => {
                    navTargetRef.current = { x: poi.x, y: poi.y };
                    setNavTargetId(poi.id);
                    playSfx("click");
                  }}
                  title={t("system.setCourse", { name: localizedPoiName(poi) })}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.68rem", fontWeight: 700, color, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: isObjective ? "var(--amber)" : color, flex: "none" }} />
                    {localizedPoiName(poi)}
                    {isObjective && <span style={{ color: "var(--amber)", flex: "none" }}>▸</span>}
                  </span>
                  <span style={{ fontSize: "0.6rem", color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>
                    {isNear ? t("system.inRange") : `${d}u`}
                  </span>
                  {/* 第 49 轮:这张卡原来只有名字和距离,而靠近巡逻点就直接开打。
                      玩家判断"这仗该不该打"的全部依据是一个地名。 */}
                  <ThreatRead poi={poi} />
                </button>
              );
            })}
          </div>
        )}
        <div style={{ marginTop: "0.35rem", color: "var(--text-dim)", fontSize: "0.66rem" }}>
          {t("system.hint")}
        </div>
      </div>
    </div>
  );
}

/** 交战前的扫描读数——几艘船,以及最重的一击占你当前船体多少。
 *
 * 给事实不给结论:不写"困难/普通",写"3 艘 · 单发最重占船体 18%"。判断留给玩家,
 * 和模组卡不给"这是升级"徽章是同一条立场。25% 这条线不是拍的——难度曲线守卫
 * (difficultyRamp.test.ts)本来就用"最重一击不得超过预期船体 25%"当上限,
 * 超过它就是这个星区本来不该出现的强度,红色是名副其实的。 */
function ThreatRead({ poi }: { poi: Poi }) {
  if (poi.kind !== "patrol") return null;
  const encounterId = poi.data?.encounterId as string | undefined;
  if (!encounterId) return null;
  const read = encounterThreatRead(encounterId);
  if (!read) return null;
  const pct = formatThreatPct(read.worstHitFraction);
  const n = read.worstHitFraction * 100;
  const color = n >= 25 ? "var(--red)" : n >= 10 ? "var(--amber)" : "var(--green)";
  return (
    <span
      style={{ fontSize: "0.58rem", color, fontVariantNumeric: "tabular-nums" }}
      title={t("system.threatReadTitle")}
    >
      {t("system.threatRead", { count: read.enemies, pct })}
    </span>
  );
}

/** Player direction 2026-08-24: "内容应该在canvas里最合适的地方用图形方式展现".
 * The most appropriate place for your hull state is ON your ship, not only in a
 * readout bar at the top of the screen — so the ship carries a status ring in
 * the world: a full circle when healthy, visibly eaten away and reddening as the
 * hull drops, pulsing once it's critical. */
function drawPlayer(
  ctx: CanvasRenderingContext2D,
  p: { x: number; y: number; angle: number },
  now: number,
  thrusting: boolean,
  hullFrac: number,
) {
  ctx.save();
  ctx.translate(p.x, p.y);

  const r = 26;
  const clamped = Math.max(0, Math.min(1, hullFrac));
  const color = clamped > 0.5 ? "#5dffb0" : clamped > 0.2 ? "#ffb84d" : "#ff5c5c";
  const critical = clamped <= 0.2;
  const pulse = critical ? 0.55 + 0.45 * Math.sin(now / 180) : 1;

  // Unfilled remainder — a faint track, so the ring reads as a gauge not a halo.
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  if (clamped > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + clamped * Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.globalAlpha = pulse;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = critical ? 12 : 7;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

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
