import { useEffect, useRef, useState } from "preact/hooks";
import { encounterById } from "../../data/encounters";
import { moduleDefById } from "../../data/modules";
import { computeModuleDamage } from "../../engine/modules";
import { computeMaxHull, computePowerCapacity } from "../../engine/ships";
import { RANGE_MODIFIERS, resolveAttack, rangeBandFromDistance, type RangeBand } from "../../engine/combat";
import { state, flagship, resolveCombatVictory, resolveCombatDefeat } from "../../state/store";
import { crewDefById } from "../../data/crew";
import { playSfx } from "../../audio/engine";
import type { CrewRole, FactionId, ResourceType } from "../../data/types";
import { randomId } from "../../engine/rng";
import { attachResponsiveCanvas } from "../../engine/viewport";
import { ResourceIcon, RESOURCE_LABEL } from "../components/Icons";

const REF_W = 900;
const REF_H = 520;
const PLAYER_SPEED = 230;
const ACCEL = 560;
const PROJECTILE_DURATION = 0.3;

interface EnemyState {
  name: string;
  maxHull: number;
  hull: number;
  damage: number;
  block: number;
  evasion: number;
  debuffed?: boolean;
  regen?: number;
}

interface Popup {
  id: string;
  target: "player" | number;
  text: string;
  color: string;
}

interface ArenaPoint {
  x: number;
  y: number;
}

interface Projectile {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number;
  duration: number;
  color: string;
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

interface Props {
  encounterId: string;
  poiId: string | null;
  victoryFlag?: string;
  onResolve: (result: "victory" | "defeat") => void;
}

export function Combat({ encounterId, poiId, victoryFlag, onResolve }: Props) {
  const encounter = encounterById(encounterId);
  const ship = flagship.value!;
  const equippedModules = ship.equipped
    .map((id) => state.value.modules.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => !!m && moduleDefById(m.defId).cooldown !== null);
  const armorBlock = ship.equipped
    .map((id) => state.value.modules.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => !!m && moduleDefById(m.defId).baseBlock !== undefined)
    .reduce((sum, m) => sum + (moduleDefById(m.defId).baseBlock ?? 0), 0);
  const evasionTraitCount = ship.equipped
    .map((id) => state.value.modules.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => !!m)
    .filter((m) => m.traits.includes("evasion")).length;
  const assignedCrew = state.value.crew.filter((c) => c.assignedShipId === ship.id);

  const [enemies, setEnemies] = useState<EnemyState[]>(
    encounter.enemies.map((e) => ({ ...e, maxHull: e.hull })),
  );
  const [playerHull, setPlayerHull] = useState(ship.currentHp);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [crewCooldowns, setCrewCooldowns] = useState<Record<string, number>>({});
  const [targetIdx, setTargetIdx] = useState(0);
  const [log, setLog] = useState<string[]>([`Contact: ${encounter.name}.`]);
  const [status, setStatus] = useState<"active" | "resolving" | "victory" | "defeat">("active");
  const [popups, setPopups] = useState<Popup[]>([]);
  const [playerShakeToken, setPlayerShakeToken] = useState(0);
  const [rewardsEarned, setRewardsEarned] = useState<Partial<Record<ResourceType, number>> | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [displayRange, setDisplayRange] = useState<RangeBand>("mid");

  const maxHull = computeMaxHull(ship);
  const capacity = computePowerCapacity(ship);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const arenaRef = useRef<{ player: ArenaPoint; enemyPos: ArenaPoint[] }>({
    player: { x: 130, y: REF_H / 2 },
    enemyPos: enemies.map((_, i) => enemySlot(i, enemies.length)),
  });
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef(0);
  const vpRef = useRef<ReturnType<typeof attachResponsiveCanvas> | null>(null);
  const enemiesRef = useRef(enemies);
  const targetIdxRef = useRef(targetIdx);
  const statusRef = useRef(status);
  enemiesRef.current = enemies;
  targetIdxRef.current = targetIdx;
  statusRef.current = status;

  useEffect(() => {
    if (enemies[targetIdx] && enemies[targetIdx].hull <= 0) {
      const nextLiving = enemies.findIndex((e) => e.hull > 0);
      if (nextLiving >= 0) setTargetIdx(nextLiving);
    }
  }, [enemies, targetIdx]);

  // Explosion burst the moment an enemy's hull crosses to zero.
  const prevHullsRef = useRef<number[]>(enemies.map((e) => e.hull));
  useEffect(() => {
    enemies.forEach((e, i) => {
      if (prevHullsRef.current[i] > 0 && e.hull <= 0) {
        const pos = arenaRef.current.enemyPos[i];
        if (pos) spawnBurst(pos.x, pos.y, "255,180,90", 26, 130);
        playSfx("explosion");
      }
    });
    prevHullsRef.current = enemies.map((e) => e.hull);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemies]);

  function spawnBurst(x: number, y: number, color: string, count: number, speed: number) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      particlesRef.current.push({
        x, y,
        vx: Math.cos(ang) * s,
        vy: Math.sin(ang) * s,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.6,
        color,
        size: 1.5 + Math.random() * 2.5,
      });
    }
    if (particlesRef.current.length > 400) particlesRef.current.splice(0, particlesRef.current.length - 400);
  }

  function fireProjectile(
    from: ArenaPoint,
    to: ArenaPoint,
    color: string,
    onImpact: () => void,
  ) {
    projectilesRef.current.push({ fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, t: 0, duration: PROJECTILE_DURATION, color });
    setTimeout(onImpact, PROJECTILE_DURATION * 1000);
  }

  function pushLog(line: string) {
    setLog((l) => [...l.slice(-5), line]);
  }

  function addPopup(target: "player" | number, text: string, color: string) {
    const id = randomId("popup");
    setPopups((p) => [...p, { id, target, text, color }]);
    setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 900);
  }

  function endPlayerAction(nextEnemies: EnemyState[]) {
    if (nextEnemies.every((e) => e.hull <= 0)) {
      finishCombat("victory", nextEnemies);
      return;
    }
    setStatus("resolving");
    setTimeout(() => enemyTurn(nextEnemies), 650);
  }

  function enemyTurn(currentEnemies: EnemyState[]) {
    const regenerated = currentEnemies.map((e) => {
      if (e.hull <= 0 || !e.regen) return e;
      const healed = Math.min(e.maxHull, e.hull + e.regen);
      if (healed > e.hull) pushLog(`${e.name} regenerates ${healed - e.hull} hull.`);
      return { ...e, hull: healed };
    });
    regenerated.forEach((e, i) => {
      if (e.regen && e.hull > currentEnemies[i].hull) addPopup(i, `+${e.hull - currentEnemies[i].hull}`, "#5dffb0");
    });
    setEnemies(regenerated);

    const evasion = Math.min(0.6, 0.05 + evasionTraitCount * 0.05);
    let totalDamage = 0;
    regenerated.forEach((enemy, i) => {
      if (enemy.hull <= 0) return;
      const enemyPos = arenaRef.current.enemyPos[i] ?? enemySlot(i, regenerated.length);
      const dist = Math.hypot(enemyPos.x - arenaRef.current.player.x, enemyPos.y - arenaRef.current.player.y);
      const band = rangeBandFromDistance(dist);
      const result = resolveAttack(enemy.damage, armorBlock, evasion, RANGE_MODIFIERS[band].incoming);
      if (result.hit) totalDamage += result.damageDealt;
      fireProjectile(enemyPos, arenaRef.current.player, "#ff6b6b", () => {
        if (result.hit) {
          spawnBurst(arenaRef.current.player.x, arenaRef.current.player.y, "255,107,107", 10, 90);
          addPopup("player", `-${result.damageDealt}`, "#ff5c5c");
          playSfx("hit");
          setPlayerShakeToken((t) => t + 1);
          pushLog(`${enemy.name} hits Whisper for ${result.damageDealt}.`);
        } else {
          pushLog(`${enemy.name} misses.`);
        }
      });
    });

    setCooldowns((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, Math.max(0, v - 1)])));
    setCrewCooldowns((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, Math.max(0, v - 1)])));

    setTimeout(() => {
      setPlayerHull((prev) => {
        const nextHull = Math.max(0, prev - totalDamage);
        if (nextHull <= 0) {
          finishCombat("defeat", regenerated);
        } else {
          setStatus("active");
        }
        return nextHull;
      });
    }, PROJECTILE_DURATION * 1000 + 20);
  }

  function finishCombat(result: "victory" | "defeat", finalEnemies: EnemyState[]) {
    setStatus(result);
    setEnemies(finalEnemies);
    if (result === "victory") {
      playSfx("victory");
      const outcome = resolveCombatVictory(encounterId, poiId, victoryFlag);
      setRewardsEarned(encounter.rewards);
      if (outcome.leveledUp) setLevelUp(outcome.newLevel);
    } else {
      playSfx("defeat");
      resolveCombatDefeat();
    }
  }

  function fireModule(moduleId: string) {
    if (status !== "active") return;
    const mod = state.value.modules.find((m) => m.id === moduleId)!;
    const def = moduleDefById(mod.defId);
    const target = enemies[targetIdx];
    if (!target || target.hull <= 0) return;

    const enemyPos = arenaRef.current.enemyPos[targetIdx] ?? enemySlot(targetIdx, enemies.length);
    const dist = Math.hypot(enemyPos.x - arenaRef.current.player.x, enemyPos.y - arenaRef.current.player.y);
    const band = rangeBandFromDistance(dist);
    const outgoingMult = RANGE_MODIFIERS[band].outgoing;

    const dmg = computeModuleDamage(mod);
    const nextEnemies = [...enemies];
    if (dmg > 0) {
      const targetEvasion = target.debuffed ? target.evasion * 0.5 : target.evasion;
      const result = resolveAttack(dmg, target.block, targetEvasion, outgoingMult);
      const playerPos = { ...arenaRef.current.player };
      const impactPos = { ...enemyPos };
      fireProjectile(playerPos, impactPos, "#8ff3ff", () => {
        if (result.hit) {
          spawnBurst(impactPos.x, impactPos.y, "143,243,255", 12, 110);
          addPopup(targetIdx, `-${result.damageDealt}`, "#ffe25d");
        }
      });
      playSfx("laser");
      if (result.hit) {
        nextEnemies[targetIdx] = { ...target, hull: Math.max(0, target.hull - result.damageDealt) };
        pushLog(`${def.name} hits ${target.name} for ${result.damageDealt}.`);
      } else {
        pushLog(`${def.name} missed ${target.name}.`);
      }
    } else {
      pushLog(`${def.name} activated.`);
    }
    setCooldowns((prev) => ({ ...prev, [moduleId]: def.cooldown ?? 0 }));
    setEnemies(nextEnemies);
    endPlayerAction(nextEnemies);
  }

  function useCrewActive(crewId: string, role: CrewRole) {
    if (status !== "active") return;
    let nextEnemies = enemies;
    if (role === "engineer") {
      const heal = Math.round(maxHull * 0.15);
      setPlayerHull((h) => Math.min(maxHull, h + heal));
      addPopup("player", `+${heal}`, "#5dffb0");
      pushLog(`Field Patch restores ${heal} hull.`);
      playSfx("dock");
    } else if (role === "gunner") {
      const target = enemies[targetIdx];
      if (target && target.hull > 0) {
        nextEnemies = enemies.map((e, i) => (i === targetIdx ? { ...e, hull: Math.max(0, e.hull - 20) } : e));
        pushLog(`Focus Fire deals 20 direct damage to ${target.name}.`);
        const pos = arenaRef.current.enemyPos[targetIdx];
        if (pos) spawnBurst(pos.x, pos.y, "255,159,77", 10, 100);
        addPopup(targetIdx, "-20", "#ff9f4d");
        playSfx("laser");
      }
    } else if (role === "helm") {
      // Evasive Burn: an instant burst toward the target, closing or opening range on demand.
      const target = arenaRef.current.enemyPos[targetIdx];
      if (target) {
        const dx = target.x - arenaRef.current.player.x;
        const dy = target.y - arenaRef.current.player.y;
        const dist = Math.hypot(dx, dy) || 1;
        const closing = dist > 160;
        const dir = closing ? 1 : -1;
        arenaRef.current.player.x = Math.max(20, Math.min(REF_W - 20, arenaRef.current.player.x + (dx / dist) * 140 * dir));
        arenaRef.current.player.y = Math.max(20, Math.min(REF_H - 20, arenaRef.current.player.y + (dy / dist) * 140 * dir));
      }
      pushLog("Evasive Burn repositions Whisper instantly.");
      playSfx("jump");
    } else if (role === "tactician") {
      const target = enemies[targetIdx];
      if (target && target.hull > 0) {
        nextEnemies = enemies.map((e, i) => (i === targetIdx ? { ...e, debuffed: true } : e));
        pushLog(`Target Lock cuts ${target.name}'s evasion.`);
      }
    }
    const cooldownValue = crewDefById(state.value.crew.find((c) => c.id === crewId)!.defId).activeCooldown;
    setCrewCooldowns((prev) => ({ ...prev, [crewId]: cooldownValue }));
    setEnemies(nextEnemies);
    endPlayerAction(nextEnemies);
  }

  // --- Arena render/physics loop ---
  useEffect(() => {
    const canvas = canvasRef.current!;
    const container = canvas.parentElement as HTMLElement;
    const ctx = canvas.getContext("2d")!;
    const vp = attachResponsiveCanvas(canvas, container, REF_W, REF_H);
    vpRef.current = vp;
    const arena = arenaRef.current;
    const keys = new Set<string>();
    let pointerTarget: ArenaPoint | null = null;
    let last = performance.now();
    let lastDisplayRange: RangeBand | null = null;

    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.3, a: Math.random() * 0.5 + 0.2,
    }));

    function onPointer(e: PointerEvent) {
      if (statusRef.current === "victory" || statusRef.current === "defeat") return;
      const world = vp.toWorld(e.clientX, e.clientY);
      // Tapping near a living enemy selects it as target instead of flying there.
      const enemies = enemiesRef.current;
      for (let i = 0; i < enemies.length; i++) {
        if (enemies[i].hull <= 0) continue;
        const pos = arena.enemyPos[i];
        if (pos && Math.hypot(world.x - pos.x, world.y - pos.y) < 34) {
          setTargetIdx(i);
          playSfx("click");
          return;
        }
      }
      pointerTarget = world;
    }
    function onKeyDown(e: KeyboardEvent) { keys.add(e.key.toLowerCase()); }
    function onKeyUp(e: KeyboardEvent) { keys.delete(e.key.toLowerCase()); }
    canvas.addEventListener("pointerdown", onPointer);
    canvas.addEventListener("pointermove", (e) => { if (e.buttons > 0) onPointer(e); });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const player = { vx: 0, vy: 0, angle: 0 };

    function step(now: number) {
      const dt = Math.min(0.25, Math.max(0, (now - last) / 1000));
      last = now;

      // player free movement — frozen once the encounter has ended
      let ax = 0, ay = 0;
      const combatOver = statusRef.current === "victory" || statusRef.current === "defeat";
      const usingKeys = !combatOver && (
        keys.has("w") || keys.has("a") || keys.has("s") || keys.has("d") ||
        keys.has("arrowup") || keys.has("arrowdown") || keys.has("arrowleft") || keys.has("arrowright")
      );
      if (combatOver) {
        pointerTarget = null;
      } else if (usingKeys) {
        if (keys.has("w") || keys.has("arrowup")) ay -= 1;
        if (keys.has("s") || keys.has("arrowdown")) ay += 1;
        if (keys.has("a") || keys.has("arrowleft")) ax -= 1;
        if (keys.has("d") || keys.has("arrowright")) ax += 1;
        pointerTarget = null;
      } else if (pointerTarget) {
        const dx = pointerTarget.x - arena.player.x;
        const dy = pointerTarget.y - arena.player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 6) { ax = dx / dist; ay = dy / dist; } else pointerTarget = null;
      }
      const mag = Math.hypot(ax, ay) || 1;
      player.vx += (ax / mag) * ACCEL * dt;
      player.vy += (ay / mag) * ACCEL * dt;
      const spd = Math.hypot(player.vx, player.vy);
      if (spd > PLAYER_SPEED) { player.vx = (player.vx / spd) * PLAYER_SPEED; player.vy = (player.vy / spd) * PLAYER_SPEED; }
      const drag = Math.pow(0.02, dt);
      player.vx *= drag; player.vy *= drag;
      arena.player.x = Math.max(24, Math.min(REF_W - 24, arena.player.x + player.vx * dt));
      arena.player.y = Math.max(24, Math.min(REF_H - 24, arena.player.y + player.vy * dt));
      if (Math.hypot(player.vx, player.vy) > 8) player.angle = Math.atan2(player.vy, player.vx);

      // enemy gentle bob around their assigned slot
      const liveEnemies = enemiesRef.current;
      arena.enemyPos = liveEnemies.map((_, i) => {
        const base = enemySlot(i, liveEnemies.length);
        const seed = i * 1.7;
        return {
          x: base.x + Math.sin(now / 900 + seed) * 14,
          y: base.y + Math.cos(now / 760 + seed * 1.3) * 18,
        };
      });

      // live range-band readout for the HUD
      const tIdx = targetIdxRef.current;
      const tPos = arena.enemyPos[tIdx];
      if (tPos && liveEnemies[tIdx] && liveEnemies[tIdx].hull > 0) {
        const band = rangeBandFromDistance(Math.hypot(tPos.x - arena.player.x, tPos.y - arena.player.y));
        if (band !== lastDisplayRange) { lastDisplayRange = band; setDisplayRange(band); }
      }

      // projectiles
      projectilesRef.current = projectilesRef.current.filter((p) => p.t < 1);
      for (const p of projectilesRef.current) p.t = Math.min(1, p.t + dt / p.duration);

      // particles
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
      for (const p of particlesRef.current) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; }

      // screen shake decay
      shakeRef.current = Math.max(0, shakeRef.current - dt * 30);

      draw(ctx, vp, arena, player, liveEnemies, targetIdxRef.current, stars, now, encounter.faction, shakeRef.current, projectilesRef.current, particlesRef.current);
    }

    const interval = setInterval(() => step(performance.now()), 16);
    return () => {
      clearInterval(interval);
      vp.destroy();
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (playerShakeToken > 0) shakeRef.current = 10;
  }, [playerShakeToken]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "0.6rem 1rem 0" }} className="title">{encounter.name}</div>

      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 1rem 0.5rem", fontSize: "0.78rem", color: "var(--text-mid)" }}>
        <span>{ship.name} — Hull {playerHull}/{maxHull}</span>
        <span>
          Range: <span style={{ color: displayRange === "close" ? "var(--red)" : displayRange === "mid" ? "var(--amber)" : "var(--cyan)" }}>{displayRange}</span>
          {" · "}Power {capacity}
        </span>
      </div>

      <div style={{ flex: 1, position: "relative", minHeight: 220 }}>
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "crosshair" }}
        />
        {popups.map((p) => (
          <PopupOverlay key={p.id} popup={p} arenaRef={arenaRef} vpRef={vpRef} />
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", padding: "0.6rem 1rem 0" }}>
        {equippedModules.map((mod) => {
          const def = moduleDefById(mod.defId);
          const cd = cooldowns[mod.id] ?? 0;
          return (
            <button key={mod.id} className="btn" disabled={status !== "active" || cd > 0} onClick={() => fireModule(mod.id)}>
              {def.name}{cd > 0 ? ` (${cd})` : ""}
            </button>
          );
        })}
        {assignedCrew.map((c) => {
          const def = crewDefById(c.defId);
          const cd = crewCooldowns[c.id] ?? 0;
          return (
            <button key={c.id} className="btn" disabled={status !== "active" || cd > 0} onClick={() => useCrewActive(c.id, def.role)}>
              {def.active.split(" — ")[0]}{cd > 0 ? ` (${cd})` : ""}
            </button>
          );
        })}
      </div>

      <div className="panel" style={{ margin: "0.6rem 1rem", padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "var(--text-mid)", maxHeight: 84, overflowY: "auto" }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>

      {status === "victory" && (
        <div className="panel pop-in" style={{ margin: "0 1rem 1rem", padding: "1rem", textAlign: "center" }}>
          <div className="title" style={{ marginBottom: "0.5rem" }}>Victory</div>
          {levelUp && (
            <div className="eyebrow" style={{ color: "var(--amber)", marginBottom: "0.6rem" }}>
              Level Up — {ship.name} reached Level {levelUp}
            </div>
          )}
          {rewardsEarned && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.75rem", fontSize: "0.8rem", color: "var(--text-mid)" }}>
              {Object.entries(rewardsEarned).map(([k, v]) => (
                <span key={k} className="resource-chip">
                  <ResourceIcon type={k as ResourceType} size={13} />+{v} {RESOURCE_LABEL[k as ResourceType]}
                </span>
              ))}
            </div>
          )}
          <button className="btn primary" onClick={() => onResolve("victory")}>Continue</button>
        </div>
      )}
      {status === "defeat" && (
        <div className="panel pop-in" style={{ margin: "0 1rem 1rem", padding: "1rem", textAlign: "center" }}>
          <div className="title" style={{ marginBottom: "0.5rem", color: "var(--red)" }}>Fleet Limps Home</div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-mid)", marginBottom: "0.5rem" }}>
            Whisper's hull is patched enough to fly. The fight isn't over — try again when ready.
          </div>
          <button className="btn primary" onClick={() => onResolve("defeat")}>Continue</button>
        </div>
      )}
    </div>
  );
}

function PopupOverlay({
  popup,
  arenaRef,
  vpRef,
}: {
  popup: Popup;
  arenaRef: { current: { player: ArenaPoint; enemyPos: ArenaPoint[] } };
  vpRef: { current: ReturnType<typeof attachResponsiveCanvas> | null };
}) {
  const world = popup.target === "player" ? arenaRef.current.player : arenaRef.current.enemyPos[popup.target] ?? { x: 450, y: 260 };
  const vp = vpRef.current;
  const { scale, offsetX, offsetY } = vp ? vp.transform() : { scale: 1, offsetX: 0, offsetY: 0 };
  const screenX = offsetX + world.x * scale;
  const screenY = offsetY + world.y * scale;
  return (
    <div style={{ position: "absolute", left: screenX, top: screenY, transform: "translate(-50%, -50%)", zIndex: 5, pointerEvents: "none" }}>
      <div
        style={{
          color: popup.color,
          fontFamily: "var(--font-display)",
          fontSize: "1rem",
          fontWeight: 700,
          textShadow: "0 0 6px rgba(0,0,0,0.8)",
          animation: "floatUp 0.9s ease-out forwards",
        }}
      >
        {popup.text}
      </div>
    </div>
  );
}

function enemySlot(index: number, total: number): ArenaPoint {
  const marginY = 90;
  const usable = REF_H - marginY * 2;
  const y = total <= 1 ? REF_H / 2 : marginY + (usable * index) / (total - 1);
  const xJitter = index % 2 === 0 ? 0 : 40;
  return { x: REF_W - 190 + xJitter, y };
}

function draw(
  ctx: CanvasRenderingContext2D,
  vp: ReturnType<typeof attachResponsiveCanvas>,
  arena: { player: ArenaPoint; enemyPos: ArenaPoint[] },
  player: { angle: number },
  enemies: EnemyState[],
  targetIdx: number,
  stars: { x: number; y: number; r: number; a: number }[],
  now: number,
  faction: FactionId,
  shake: number,
  projectiles: Projectile[],
  particles: Particle[],
) {
  vp.beginFrame(ctx);
  const { scale, offsetX, offsetY } = vp.transform();

  const bg = ctx.createRadialGradient(vp.displayW / 2, vp.displayH / 2, 0, vp.displayW / 2, vp.displayH / 2, Math.max(vp.displayW, vp.displayH) * 0.8);
  bg.addColorStop(0, "#161022");
  bg.addColorStop(1, "#040308");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, vp.displayW, vp.displayH);
  for (const s of stars) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = "#e8d9ff";
    ctx.beginPath();
    ctx.arc(s.x * vp.displayW, s.y * vp.displayH, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const shakeX = (Math.random() - 0.5) * shake;
  const shakeY = (Math.random() - 0.5) * shake;

  ctx.save();
  ctx.translate(offsetX + shakeX, offsetY + shakeY);
  ctx.scale(scale, scale);

  // range rings around the player for tactile positioning feedback
  ctx.save();
  ctx.translate(arena.player.x, arena.player.y);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, 160, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 340, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  drawProjectiles(ctx, projectiles);
  drawParticles(ctx, particles);

  enemies.forEach((e, i) => {
    if (e.hull <= 0) return;
    const pos = arena.enemyPos[i];
    if (!pos) return;
    drawEnemyShip(ctx, pos, faction, now + i * 500, i === targetIdx, e);
  });

  drawPlayerShip(ctx, arena.player, player.angle);
  ctx.restore();
}

function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]) {
  for (const p of projectiles) {
    const x = p.fromX + (p.toX - p.fromX) * p.t;
    const y = p.fromY + (p.toY - p.fromY) * p.t;
    ctx.save();
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2.5;
    const trailX = p.fromX + (p.toX - p.fromX) * Math.max(0, p.t - 0.12);
    const trailY = p.fromY + (p.toY - p.fromY) * Math.max(0, p.t - 0.12);
    ctx.beginPath();
    ctx.moveTo(trailX, trailY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = `rgb(${p.color})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPlayerShip(ctx: CanvasRenderingContext2D, pos: ArenaPoint, angle: number) {
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);
  ctx.shadowColor = "#4be8ff";
  ctx.shadowBlur = 16;
  const grad = ctx.createLinearGradient(-12, 0, 18, 0);
  grad.addColorStop(0, "#1c7d94");
  grad.addColorStop(1, "#8ff3ff");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-13, -12);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-13, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function drawEnemyShip(
  ctx: CanvasRenderingContext2D,
  pos: ArenaPoint,
  faction: FactionId,
  now: number,
  targeted: boolean,
  enemy: EnemyState,
) {
  ctx.save();
  ctx.translate(pos.x, pos.y);

  if (targeted) {
    const pulse = 0.6 + 0.4 * Math.sin(now / 200);
    ctx.strokeStyle = `rgba(255,226,93,${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();
  }

  const colors: Record<string, string> = {
    reavers: "#ff5c5c",
    lionsheart: "#5dd6ff",
    swarm: "#8cff9e",
    swanreach: "#ffb84d",
    bauhinia: "#b98cff",
    constructs: "#9fb8cc",
    hollow: "#e8d9ff",
  };
  const color = colors[faction] ?? "#ff9f4d";
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;

  if (faction === "swarm") {
    const pulse = 1 + 0.08 * Math.sin(now / 260);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = (i % 2 === 0 ? 15 : 9) * pulse;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (faction === "lionsheart") {
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(10, -9);
    ctx.lineTo(18, 0);
    ctx.lineTo(10, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (faction === "reavers") {
    ctx.beginPath();
    ctx.moveTo(-16, -13);
    ctx.lineTo(14, -5);
    ctx.lineTo(20, 0);
    ctx.lineTo(14, 5);
    ctx.lineTo(-16, 13);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (faction === "constructs") {
    // cold, geometric, precise — a rotating hexagonal shell around a fixed core
    ctx.save();
    ctx.rotate((now / 4000) % (Math.PI * 2));
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const x = Math.cos(a) * 17, y = Math.sin(a) * 17;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fill();
  } else if (faction === "hollow") {
    // color-drained, glitchy — a flickering, slightly displaced double-outline
    const glitchX = (Math.random() - 0.5) * 3;
    const glitchY = (Math.random() - 0.5) * 3;
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now / 140);
    ctx.beginPath();
    ctx.moveTo(-15 + glitchX, -15 + glitchY);
    ctx.lineTo(15 + glitchX, -6 + glitchY);
    ctx.lineTo(15 + glitchX, 6 + glitchY);
    ctx.lineTo(-15 + glitchX, 15 + glitchY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.moveTo(-15 - glitchX, -15 - glitchY);
    ctx.lineTo(15 - glitchX, -6 - glitchY);
    ctx.lineTo(15 - glitchX, 6 - glitchY);
    ctx.lineTo(-15 - glitchX, 15 - glitchY);
    ctx.closePath();
    ctx.stroke();
  } else {
    // bauhinia / swanreach / default: utilitarian octagon hull
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      const x = Math.cos(a) * 15, y = Math.sin(a) * 15;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // HP bar
  const w = 44;
  const frac = Math.max(0, enemy.hull / enemy.maxHull);
  ctx.save();
  ctx.translate(pos.x - w / 2, pos.y - 34);
  ctx.fillStyle = "rgba(5,8,16,0.7)";
  ctx.fillRect(0, 0, w, 5);
  ctx.fillStyle = frac > 0.5 ? "#5dffb0" : frac > 0.2 ? "#ffb84d" : "#ff5c5c";
  ctx.fillRect(0, 0, w * frac, 5);
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(0, 0, w, 5);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(234,246,255,0.8)";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(enemy.name + (enemy.regen ? " ⟳" : ""), pos.x, pos.y - 40);
  ctx.restore();
}
