import { useEffect, useRef, useState } from "preact/hooks";
import { encounterById } from "../../data/encounters";
import { moduleDefById } from "../../data/modules";
import { computeModuleDamage, computeCritChance } from "../../engine/modules";
import { computeMaxHull, computePowerCapacity, computeSpeed, computeBaseEvasion, computeBaseCritChance } from "../../engine/ships";
import { RANGE_MODIFIERS, resolveAttack, rangeBandFromDistance, CRIT_MULTIPLIER, type RangeBand } from "../../engine/combat";
import { state, flagship, resolveCombatVictory, resolveCombatDefeat, hasCrewRecruited, crewCount, spend } from "../../state/store";
import { crewDefById } from "../../data/crew";
import { namedShipDefById } from "../../data/namedShips";
import { playSfx } from "../../audio/engine";
import type { FactionId, ResourceType } from "../../data/types";
import { randomId } from "../../engine/rng";
import { attachResponsiveCanvas } from "../../engine/viewport";
import { ResourceIcon, RESOURCE_LABEL } from "../components/Icons";
import { AnimatedFraction } from "../components/StatBlock";
import { drawPlayerHull, drawEnemyHull, drawWeaponBeam, drawExplosionRing } from "../render/shipArt";
import { reportError } from "../../engine/errorReporting";

const REF_W = 900;
const REF_H = 520;
const PROJECTILE_DURATION = 0.3;

interface EnemyState {
  name: string;
  maxHull: number;
  hull: number;
  damage: number;
  block: number;
  evasion: number;
  regen?: number;
  /** Wound up on a prior turn — unleashes a 2x-damage strike this turn, then clears. */
  charging?: boolean;
  /** Disabled by an EMP proc — skips its attack entirely this turn. */
  stunned?: boolean;
  /** Shield-stripped by an EMP proc — takes full damage (block ignored) for N more player hits. */
  blockBrokenHits?: number;
  /** True once a boss has crossed the 50% enrage threshold. */
  enraged?: boolean;
  /** Target Lock: halves evasion against the player's attacks. Decays once per round. */
  evasionDebuffTurns?: number;
  /** Undercut: halves block against the player's attacks. Decays once per round. */
  blockDebuffTurns?: number;
  /** Reaver's Cut: takes +25% damage from the player. Decays once per round. */
  vulnerableTurns?: number;
}

interface Popup {
  id: string;
  target: "player" | number;
  text: string;
  color: string;
  big?: boolean;
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
  const equippedModuleList = ship.equipped
    .map((id) => state.value.modules.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => !!m);
  const equippedModules = equippedModuleList.filter((m) => moduleDefById(m.defId).cooldown !== null);
  const armorBlock = equippedModuleList
    .filter((m) => moduleDefById(m.defId).baseBlock !== undefined)
    .reduce((sum, m) => sum + (moduleDefById(m.defId).baseBlock ?? 0), 0);
  const evasionTraitCount = equippedModuleList.filter((m) => m.traits.includes("evasion")).length;
  // Passive trait aggregates — every trait id in the game now does something real:
  // hullBonus grows the flagship's effective max hull for this fight, regen ticks
  // hull back each round, jumpRange shaves a turn off weapon cooldowns, an armor-slot
  // shieldBreak grants bonus evasion, and yieldBonus boosts salvage/alloy on victory.
  // Unit 7-Requiem's passive ("+15% max hull fleet-wide") stacks with equipment hullBonus traits.
  const hullBonusFraction = 0.15 * equippedModuleList.filter((m) => m.traits.includes("hullBonus")).length + (hasCrewRecruited("unit7Requiem") ? 0.15 : 0);
  // Generic recruit helms passively contribute "+5% evasion fleet-wide" each, just by being recruited.
  const recruitHelmEvasionBonus = crewCount("recruitHelm") * 0.05;
  const regenStacks = equippedModuleList.filter((m) => m.traits.includes("regen")).length;
  const jumpRangeStacks = equippedModuleList.filter((m) => m.traits.includes("jumpRange")).length;
  const shieldBreakArmorStacks = equippedModuleList.filter(
    (m) => moduleDefById(m.defId).type === "armor" && m.traits.includes("shieldBreak"),
  ).length;
  const yieldBonusFraction = 0.2 * equippedModuleList.filter((m) => m.traits.includes("yieldBonus")).length;
  const assignedCrew = state.value.crew.filter((c) => c.assignedShipId === ship.id);
  // The ship's own rolled attributes — real itemization variance, not a flat rarity number.
  const shipBaseEvasion = computeBaseEvasion(ship);
  const shipBaseCrit = computeBaseCritChance(ship);
  const shipSpeed = computeSpeed(ship);
  const shipAccel = shipSpeed * 2.4;

  const [enemies, setEnemies] = useState<EnemyState[]>(
    encounter.enemies.map((e) => ({ ...e, maxHull: e.hull })),
  );
  const maxHull = Math.round(computeMaxHull(ship) * (1 + hullBonusFraction));
  const [playerHull, setPlayerHull] = useState(Math.min(maxHull, Math.round(ship.currentHp * (1 + hullBonusFraction))));
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [crewCooldowns, setCrewCooldowns] = useState<Record<string, number>>({});
  const [targetIdx, setTargetIdx] = useState(0);
  const [log, setLog] = useState<string[]>([`Contact: ${encounter.name}.`]);
  const [status, setStatus] = useState<"active" | "resolving" | "victory" | "defeat">("active");
  const [popups, setPopups] = useState<Popup[]>([]);
  const [playerShakeToken, setPlayerShakeToken] = useState(0);
  const [rewardsEarned, setRewardsEarned] = useState<Partial<Record<ResourceType, number>> | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [levelUpHullGain, setLevelUpHullGain] = useState(0);
  const [displayRange, setDisplayRange] = useState<RangeBand>("mid");
  const [comboCount, setComboCount] = useState(0);
  const [overcharged, setOvercharged] = useState(false);
  const [guaranteedCrit, setGuaranteedCrit] = useState(false);
  const [riposteArmed, setRiposteArmed] = useState(false);
  const [shieldedNextTurn, setShieldedNextTurn] = useState(false);
  // Hollow doctrine, axis 2: Corrosion. Unlike the decaying-per-round debuffs crew
  // abilities apply (evasionDebuffTurns/blockDebuffTurns), this is permanent for the
  // rest of the fight — Hollow attacks don't just drain resources, they eat the
  // plating itself. A distinct status-effect category from anything else in combat.
  const [corrodedBlock, setCorrodedBlock] = useState(0);
  const bossPhaseRef = useRef(false);
  // Named-ship signature abilities (issues #3/#4 — see data/namedShips.ts): each one
  // is a distinct mechanical axis, not a bigger number. namedAbilityCooldown mirrors
  // crewCooldowns' per-instance pattern, just for the single flagship ability slot.
  const [namedAbilityCooldown, setNamedAbilityCooldown] = useState(0);
  const [alphaStrikeArmed, setAlphaStrikeArmed] = useState(false);
  const [phaseShiftReady, setPhaseShiftReady] = useState(false);
  const [fortifyTurns, setFortifyTurns] = useState(0);
  const [bloodscentTurns, setBloodscentTurns] = useState(0);
  const bloodscentTargetRef = useRef<number | null>(null);
  // Ablative Plating's Absorb: negates exactly the first hit landed each fight, then
  // behaves like ordinary block for the rest of it — a ref because it must mutate
  // synchronously mid-resolution, before any re-render, same pattern as bossPhaseRef.
  const absorbRef = useRef(true);
  const hasAbsorbArmor = equippedModuleList.some(
    (m) => moduleDefById(m.defId).type === "armor" && m.traits.includes("absorb"),
  );
  // Inertial Dampers' Momentum: evasion rises with consecutive undamaged enemy turns,
  // capped modestly so it augments rather than replaces the flat +evasion trait.
  const [unhitStreak, setUnhitStreak] = useState(0);
  const hasMomentum = equippedModuleList.some(
    (m) => moduleDefById(m.defId).type === "engine" && m.traits.includes("momentum"),
  );
  const momentumBonus = hasMomentum ? Math.min(0.15, unhitStreak * 0.03) : 0;

  const capacity = computePowerCapacity(ship);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const arenaRef = useRef<{ player: ArenaPoint; enemyPos: ArenaPoint[] }>({
    player: { x: 130, y: REF_H / 2 },
    enemyPos: enemies.map((_, i) => enemySlot(i, enemies.length)),
  });
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const explosionsRef = useRef<{ x: number; y: number; start: number }[]>([]);
  /** Squash-and-stretch pulse timestamps — see docs/visual-standards.md §3. */
  const hitPulseRef = useRef<{ enemy: Record<number, number>; player: number }>({ enemy: {}, player: 0 });
  const shakeRef = useRef(0);
  /** Freeze-frame juice on meaningful impacts — see docs/visual-standards.md §3.
   * A timestamp; while performance.now() is under it, the sim clock stalls for a
   * beat (motion visibly freezes) without touching the setTimeout-driven combat
   * resolution at all. */
  const hitStopUntilRef = useRef(0);
  function triggerHitStop(ms: number) {
    hitStopUntilRef.current = Math.max(hitStopUntilRef.current, performance.now() + ms);
  }
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
        if (pos) {
          spawnBurst(pos.x, pos.y, "255,180,90", 30, 140);
          spawnBurst(pos.x, pos.y, "255,226,93", 14, 70);
          triggerHitStop(120);
          explosionsRef.current.push({ x: pos.x, y: pos.y, start: performance.now() });
        }
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

  function addPopup(target: "player" | number, text: string, color: string, big: boolean = false) {
    const id = randomId("popup");
    setPopups((p) => [...p, { id, target, text, color, big }]);
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
    const wasCharging = currentEnemies.map((e) => !!e.charging);
    const shieldActive = shieldedNextTurn;
    if (shieldActive) setShieldedNextTurn(false);
    let riposteTriggered = false;
    // Hollow Point's Phase Shift: the FIRST enemy attack this turn auto-misses (a
    // guaranteed single-attack dodge), distinct from Construct Override's full-turn
    // damage negation — a miss still triggers Lionsheart's honor-counter, a real
    // tradeoff Construct Override doesn't have.
    let phaseShiftConsumed = false;
    const phaseShiftWasReady = phaseShiftReady;
    if (phaseShiftWasReady) setPhaseShiftReady(false);
    if (fortifyTurns > 0) setFortifyTurns((t) => t - 1);
    if (bloodscentTurns > 0) setBloodscentTurns((t) => t - 1);

    let regenerated = currentEnemies.map((e) => {
      // Crew debuffs decay by one round every enemy turn, whether or not they're read.
      const decayed = {
        ...e,
        evasionDebuffTurns: Math.max(0, (e.evasionDebuffTurns ?? 0) - 1),
        blockDebuffTurns: Math.max(0, (e.blockDebuffTurns ?? 0) - 1),
        vulnerableTurns: Math.max(0, (e.vulnerableTurns ?? 0) - 1),
      };
      if (decayed.hull <= 0 || !decayed.regen) return decayed;
      const healed = Math.min(decayed.maxHull, decayed.hull + decayed.regen);
      if (healed > decayed.hull) pushLog(`${decayed.name} regenerates ${healed - decayed.hull} hull.`);
      return { ...decayed, hull: healed };
    });
    regenerated.forEach((e, i) => {
      if (e.regen && e.hull > currentEnemies[i].hull) addPopup(i, `+${e.hull - currentEnemies[i].hull}`, "#5dffb0");
    });

    // Boss enrage: crossing 50% hull permanently shifts the fight — harder hits,
    // thinner plating. A real climax beat instead of a flat stat blob.
    if (encounter.isBoss && !bossPhaseRef.current && regenerated[0] && regenerated[0].hull > 0) {
      const boss = regenerated[0];
      if (boss.hull <= boss.maxHull * 0.5) {
        bossPhaseRef.current = true;
        regenerated = [
          { ...boss, damage: Math.round(boss.damage * 1.3), block: Math.max(0, Math.round(boss.block * 0.75)), enraged: true },
          ...regenerated.slice(1),
        ];
        pushLog(`${boss.name} is enraged — its strikes land harder now.`);
        const pos = arenaRef.current.enemyPos[0];
        if (pos) {
          spawnBurst(pos.x, pos.y, "255,92,92", 24, 120);
          explosionsRef.current.push({ x: pos.x, y: pos.y, start: performance.now() });
        }
        playSfx("alarm");
        shakeRef.current = 14;
      }
    }

    const baseEvasion = shipBaseEvasion + evasionTraitCount * 0.05 + shieldBreakArmorStacks * 0.08 + recruitHelmEvasionBonus + momentumBonus;
    // Kaan Ferrous: "+10% evasion when at Long range" — only when he's assigned to the flagship.
    const kaanAssigned = assignedCrew.some((c) => c.defId === "kaanFerrous");
    let totalDamage = 0;
    const riposteActive = riposteArmed;
    regenerated = regenerated.map((enemy, i) => {
      if (enemy.hull <= 0) return enemy;

      if (enemy.stunned) {
        pushLog(`${enemy.name} is disabled and can't fire.`);
        return { ...enemy, stunned: false };
      }

      // Bosses occasionally wind up a haymaker instead of attacking — one full
      // player turn of warning (a red ring on the arena), then it lands for double.
      if (!wasCharging[i] && encounter.isBoss && i === 0 && Math.random() < 0.3) {
        pushLog(`${enemy.name} is charging a devastating strike — brace for it!`);
        playSfx("alarm");
        return { ...enemy, charging: true };
      }

      // Reaver doctrine: Frenzy. Below 30% hull, a Reaver stops fighting defensively
      // and goes all-in — a real threshold distinct from boss enrage (50%, isBoss-only).
      const frenzied = encounter.faction === "reavers" && enemy.hull <= enemy.maxHull * 0.3;
      // Swarm doctrine: Hive Retaliation. A downed hive-mate doesn't weaken the
      // swarm, it enrages what's left — every dead ally adds +15% damage to each
      // surviving Swarm attacker. Trigger is ally-death-count, not self-hull or
      // boss-phase, so it's a genuinely distinct axis from Reaver frenzy/boss enrage.
      const deadHiveAllies = encounter.faction === "swarm" ? regenerated.filter((e) => e.hull <= 0).length : 0;
      const hiveBonus = 1 + 0.15 * deadHiveAllies;
      const dmgMultiplier = (wasCharging[i] ? 2 : 1) * (frenzied ? 1.4 : 1) * hiveBonus;
      const enemyPos = arenaRef.current.enemyPos[i] ?? enemySlot(i, regenerated.length);
      const dist = Math.hypot(enemyPos.x - arenaRef.current.player.x, enemyPos.y - arenaRef.current.player.y);
      const band = rangeBandFromDistance(dist);
      const evasion = Math.min(0.6, baseEvasion + (kaanAssigned && band === "long" ? 0.1 : 0));
      // Iron Verdict's Fortify: armor block doubles for its duration — a defense
      // multiplier, not a bigger flat block number, so it scales with whatever's
      // equipped instead of competing with it.
      const fortifyMult = fortifyTurns > 0 ? 2 : 1;
      const rawResult = resolveAttack(enemy.damage * dmgMultiplier, Math.max(0, armorBlock - corrodedBlock) * fortifyMult, evasion, RANGE_MODIFIERS[band].incoming);
      const phaseShiftBlocksThis = phaseShiftWasReady && !phaseShiftConsumed;
      if (phaseShiftBlocksThis) phaseShiftConsumed = true;
      const result = phaseShiftBlocksThis ? { ...rawResult, hit: false } : rawResult;
      // Ablative Plating's Absorb: negates exactly the first hit of the fight,
      // regardless of which enemy lands it — consumed the instant it's used.
      const absorbedHit = hasAbsorbArmor && absorbRef.current && result.hit && result.damageDealt > 0;
      if (absorbedHit) absorbRef.current = false;
      const dealt = shieldActive || absorbedHit ? 0 : result.hit ? result.damageDealt : 0;
      if (dealt > 0) totalDamage += dealt;

      if (!result.hit && riposteActive && !riposteTriggered) {
        riposteTriggered = true;
        const bestWeapon = equippedModules
          .filter((m) => moduleDefById(m.defId).baseDamage)
          .sort((a, b) => computeModuleDamage(b) - computeModuleDamage(a))[0];
        if (bestWeapon) {
          const riposteDmg = Math.round(computeModuleDamage(bestWeapon) * 0.6);
          setTimeout(() => {
            setEnemies((prev) => prev.map((e, idx) => (idx === i ? { ...e, hull: Math.max(0, e.hull - riposteDmg) } : e)));
            const pos = arenaRef.current.enemyPos[i];
            if (pos) {
              fireProjectile(arenaRef.current.player, pos, "#ffe25d", () => {
                spawnBurst(pos.x, pos.y, "255,226,93", 14, 110);
                addPopup(i, `-${riposteDmg}`, "#ffe25d");
              });
            }
            pushLog(`Riposte! Whisper counters ${enemy.name} for ${riposteDmg}.`);
            playSfx("laser");
          }, 220);
        }
      }

      fireProjectile(enemyPos, arenaRef.current.player, wasCharging[i] ? "#ffe25d" : "#ff6b6b", () => {
        if (result.hit && shieldActive) {
          spawnBurst(arenaRef.current.player.x, arenaRef.current.player.y, "143,243,255", 10, 90);
          addPopup("player", "DEFLECTED", "#8ff3ff");
          pushLog(`Construct Override deflects ${enemy.name}'s attack.`);
        } else if (result.hit && absorbedHit) {
          spawnBurst(arenaRef.current.player.x, arenaRef.current.player.y, "180,220,255", 10, 90);
          addPopup("player", "ABSORBED", "#b4dcff");
          pushLog(`Ablative Plating absorbs ${enemy.name}'s hit completely.`);
        } else if (result.hit) {
          spawnBurst(arenaRef.current.player.x, arenaRef.current.player.y, "255,107,107", wasCharging[i] ? 20 : 10, wasCharging[i] ? 130 : 90);
          addPopup("player", `-${result.damageDealt}`, "#ff5c5c", wasCharging[i]);
          playSfx("hit");
          setPlayerShakeToken((t) => t + 1);
          triggerHitStop(wasCharging[i] ? 100 : 45);
          hitPulseRef.current.player = performance.now();
          pushLog(`${enemy.name}${wasCharging[i] ? "'s charged strike" : ""}${deadHiveAllies > 0 ? " (hive-enraged)" : ""} hits Whisper for ${result.damageDealt}.`);

          // Construct doctrine: a precise EMP pulse on hit has a chance to lock out
          // one of the player's own weapons for a turn — the mirror of the player's
          // own EMP Burst "disable" trait, from the enemy's side.
          if (encounter.faction === "constructs" && Math.random() < 0.3) {
            const targetable = equippedModules.filter((m) => moduleDefById(m.defId).cooldown !== null);
            if (targetable.length > 0) {
              const jammed = targetable[Math.floor(Math.random() * targetable.length)];
              const jammedDef = moduleDefById(jammed.defId);
              setCooldowns((prev) => ({ ...prev, [jammed.id]: Math.max(prev[jammed.id] ?? 0, 1) }));
              pushLog(`${enemy.name}'s EMP pulse jams ${jammedDef.name} — it won't answer next turn.`);
            }
          }
          // Hollow doctrine: it doesn't just damage the hull, it drains what's inside
          // it — a real punishment axis distinct from hull damage (see the design
          // intent in docs/story, never wired until now).
          if (encounter.faction === "hollow") {
            const drain = Math.max(1, Math.round(result.damageDealt * 0.25));
            const pool: ResourceType = state.value.resources.insight > 0 ? "insight" : "sourcePoints";
            const actualDrain = Math.min(drain, state.value.resources[pool]);
            if (actualDrain > 0) {
              spend({ [pool]: actualDrain } as Partial<Record<ResourceType, number>>);
              addPopup("player", `-${actualDrain} ${RESOURCE_LABEL[pool]}`, "#e8d9ff");
              pushLog(`${enemy.name} drains ${actualDrain} ${RESOURCE_LABEL[pool]} straight from Whisper's stores.`);
            }
            // Hollow doctrine, axis 2: Corrosion. A permanent (not decaying) block
            // reduction for the rest of the fight — it's eating the plating, not just
            // stunning or stealing from it.
            if (armorBlock - corrodedBlock > 0) {
              setCorrodedBlock((c) => c + 1);
              pushLog(`${enemy.name}'s touch corrodes Whisper's plating — armor weakened for the rest of the fight.`);
            }
          }
        } else {
          pushLog(phaseShiftBlocksThis ? `Phase Shift — ${enemy.name}'s attack passes through nothing.` : `${enemy.name} misses.`);
        }
      });
      return wasCharging[i] ? { ...enemy, charging: false } : enemy;
    });
    if (riposteTriggered) setRiposteArmed(false);

    setEnemies(regenerated);

    setCooldowns((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, Math.max(0, v - 1)])));
    setCrewCooldowns((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, Math.max(0, v - 1)])));
    setNamedAbilityCooldown((c) => Math.max(0, c - 1));
    // Inertial Dampers' Momentum: a clean enemy turn (no damage taken, even if
    // Ablative absorbed one) extends the streak; any damage resets it to zero.
    if (hasMomentum) setUnhitStreak((s) => (totalDamage > 0 ? 0 : s + 1));

    const finalEnemies = regenerated;
    setTimeout(() => {
      setPlayerHull((prev) => {
        const regenTick = regenStacks > 0 ? Math.round(maxHull * 0.04 * regenStacks) : 0;
        const nextHull = Math.max(0, Math.min(maxHull, prev - totalDamage + regenTick));
        if (nextHull <= 0) {
          finishCombat("defeat", finalEnemies);
        } else {
          if (regenTick > 0 && prev < maxHull) pushLog(`Field systems recover ${Math.min(regenTick, maxHull - prev)} hull.`);
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
      const outcome = resolveCombatVictory(encounterId, poiId, victoryFlag, yieldBonusFraction);
      setRewardsEarned(outcome.rewards);
      if (outcome.leveledUp) {
        const hullBefore = computeMaxHull(ship);
        const hullAfter = computeMaxHull({ ...ship, level: outcome.newLevel });
        setLevelUpHullGain(hullAfter - hullBefore);
        setLevelUp(outcome.newLevel);
      }
    } else {
      playSfx("defeat");
      resolveCombatDefeat();
    }
  }

  // Click handlers run as raw DOM/Preact event dispatch, outside the render cycle an
  // ErrorBoundary can see — a throw here needs its own guard, or one bad shot could
  // leave combat stuck mid-action forever with no visible cause.
  function fireModule(moduleId: string) {
    try {
      fireModuleImpl(moduleId);
    } catch (err) {
      reportError("Combat.fireModule", err);
      setStatus("active");
    }
  }

  function fireModuleImpl(moduleId: string) {
    if (status !== "active") return;
    const mod = state.value.modules.find((m) => m.id === moduleId)!;
    const def = moduleDefById(mod.defId);
    const target = enemies[targetIdx];
    if (!target || target.hull <= 0) return;

    const enemyPos = arenaRef.current.enemyPos[targetIdx] ?? enemySlot(targetIdx, enemies.length);
    const dist = Math.hypot(enemyPos.x - arenaRef.current.player.x, enemyPos.y - arenaRef.current.player.y);
    const band = rangeBandFromDistance(dist);
    const outgoingMult = RANGE_MODIFIERS[band].outgoing;

    const wasOvercharged = overcharged;
    const wasGuaranteedCrit = guaranteedCrit;
    const wasAlphaStrike = alphaStrikeArmed;
    const baseDmg = computeModuleDamage(mod);
    const vulnerable = (target.vulnerableTurns ?? 0) > 0;
    // Ratchet Koi: "+10% weapon damage when at Close range" — only when he's assigned.
    const ratchetBonus = band === "close" && assignedCrew.some((c) => c.defId === "ratchetKoi") ? 1.1 : 1;
    // Railgun's Execute: a finisher axis, not a raw-damage lead — it does nothing
    // against a healthy target and swings hard against a dying one.
    const executeMult = mod.traits.includes("execute") && target.hull <= target.maxHull * 0.25 ? 1.5 : 1;
    // Nightfall Vow's Alpha Strike: doubles this one shot, at the cost of that
    // weapon's cooldown locking out 2 extra turns (see the cooldown-set below).
    const dmg = Math.round(baseDmg * ratchetBonus * (wasOvercharged ? 1.5 : 1) * (vulnerable ? 1.25 : 1) * executeMult * (wasAlphaStrike ? 2 : 1));
    const nextEnemies = [...enemies];
    if (dmg > 0) {
      const targetEvasion = (target.evasionDebuffTurns ?? 0) > 0 ? target.evasion * 0.5 : target.evasion;
      const blockBroken = (target.blockBrokenHits ?? 0) > 0;
      const undercut = (target.blockDebuffTurns ?? 0) > 0;
      const blockMult = blockBroken ? 0 : Math.min(mod.traits.includes("pierce") ? 0.5 : 1, undercut ? 0.5 : 1);
      const effectiveBlock = Math.round(target.block * blockMult);
      const critChance = wasGuaranteedCrit ? 1 : computeCritChance(mod, comboCount, shipBaseCrit);
      const rawResult = resolveAttack(dmg, effectiveBlock, targetEvasion, outgoingMult, undefined, critChance);
      // Bauhinia/Swanreach doctrine: Point Defense. Utilitarian military-industrial
      // hulls run point-defense grids that specifically blunt precision hits — a crit
      // against them lands at a reduced multiplier instead of the full 1.75x.
      const pointDefense = rawResult.crit && (encounter.faction === "bauhinia" || encounter.faction === "swanreach");
      const result = pointDefense
        ? { ...rawResult, damageDealt: Math.max(1, Math.round((rawResult.damageDealt / CRIT_MULTIPLIER) * 1.2)) }
        : rawResult;
      const playerPos = { ...arenaRef.current.player };
      const impactPos = { ...enemyPos };
      fireProjectile(playerPos, impactPos, result.crit ? "#ffe25d" : "#8ff3ff", () => {
        if (result.hit) {
          spawnBurst(impactPos.x, impactPos.y, result.crit ? "255,226,93" : "143,243,255", result.crit ? 22 : 12, result.crit ? 150 : 110);
          addPopup(targetIdx, `${result.crit ? "CRIT " : ""}-${result.damageDealt}`, result.crit ? "#ffe25d" : "#8ff3ff", result.crit);
          triggerHitStop(result.crit ? 90 : 35);
          hitPulseRef.current.enemy[targetIdx] = performance.now();
          if (result.crit) setPlayerShakeToken((t) => t + 1);
        }
      });
      playSfx("laser");
      setComboCount((c) => (result.hit ? c + 1 : 0));

      let hitTarget = { ...target, hull: Math.max(0, target.hull - (result.hit ? result.damageDealt : 0)) };
      if (result.hit && blockBroken) hitTarget.blockBrokenHits = Math.max(0, (target.blockBrokenHits ?? 0) - 1);

      if (result.hit) {
        const critNote = wasGuaranteedCrit ? " — Focus Fire's mark guarantees the critical hit on" : result.crit ? " lands a CRITICAL hit on" : " hits";
        pushLog(`${def.name}${critNote} ${target.name} for ${result.damageDealt}.`);
        if (pointDefense) pushLog(`${target.name}'s point-defense grid blunts the critical strike.`);
      } else {
        pushLog(`${def.name} missed ${target.name}.`);
        // Lionsheart doctrine: Honor Duel. A duelist culture doesn't let a wasted
        // swing go unanswered — a wild miss draws an immediate free counter.
        if (encounter.faction === "lionsheart" && hitTarget.hull > 0) {
          const counterDmg = Math.round(target.damage * 0.5);
          setTimeout(() => {
            setPlayerHull((h) => Math.max(0, h - counterDmg));
            addPopup("player", `-${counterDmg}`, "#5dd6ff");
            spawnBurst(arenaRef.current.player.x, arenaRef.current.player.y, "93,214,255", 10, 90);
            playSfx("hit");
          }, 180);
          pushLog(`${target.name} answers the missed swing with an honor riposte for ${counterDmg}.`);
        }
      }

      // EMP-style traits: a chance to disable the target's next attack, or strip
      // its block outright so follow-up hits land at full force.
      if (result.hit && mod.traits.includes("disable") && hitTarget.hull > 0 && Math.random() < 0.35) {
        hitTarget.stunned = true;
        pushLog(`${target.name}'s systems lock up — it won't fire next turn.`);
      }
      if (result.hit && def.type === "utility" && mod.traits.includes("shieldBreak") && hitTarget.hull > 0) {
        hitTarget.blockBrokenHits = 3;
        pushLog(`${target.name}'s plating is stripped — the next few hits land unblocked.`);
      }
      nextEnemies[targetIdx] = hitTarget;

      // Chain Arc: a fraction of the hit arcs to a second living target.
      if (result.hit && mod.traits.includes("chainArc")) {
        const others = nextEnemies.map((e, i) => ({ e, i })).filter(({ e, i }) => i !== targetIdx && e.hull > 0);
        if (others.length > 0) {
          const { e: arcTarget, i: arcIdx } = others[Math.floor(Math.random() * others.length)];
          const arcPos = arenaRef.current.enemyPos[arcIdx] ?? enemySlot(arcIdx, enemies.length);
          const arcResult = resolveAttack(Math.round(dmg * 0.4), arcTarget.block, arcTarget.evasion, outgoingMult);
          setTimeout(() => {
            fireProjectile(impactPos, arcPos, "#8ff3ff", () => {
              if (arcResult.hit) {
                spawnBurst(arcPos.x, arcPos.y, "143,243,255", 8, 90);
                addPopup(arcIdx, `-${arcResult.damageDealt}`, "#8ff3ff");
              }
            });
          }, 90);
          if (arcResult.hit) {
            nextEnemies[arcIdx] = { ...arcTarget, hull: Math.max(0, arcTarget.hull - arcResult.damageDealt) };
            pushLog(`Chain Arc jumps to ${arcTarget.name} for ${arcResult.damageDealt}.`);
          } else {
            pushLog(`Chain Arc jumps to ${arcTarget.name} but misses.`);
          }
        }
      }

      // Flak Battery's Splash: unlike Chain Arc (one random secondary target at 40%),
      // this hits every other living enemy at once — weak against a lone boss, strong
      // against the multi-enemy Swarm/Reaver formations. A group-control axis, not a
      // bigger single-target number.
      if (result.hit && mod.traits.includes("aoe")) {
        nextEnemies.forEach((splashTarget, splashIdx) => {
          if (splashIdx === targetIdx || splashTarget.hull <= 0) return;
          const splashResult = resolveAttack(Math.round(dmg * 0.6), splashTarget.block, splashTarget.evasion, outgoingMult);
          const splashPos = arenaRef.current.enemyPos[splashIdx] ?? enemySlot(splashIdx, enemies.length);
          setTimeout(() => {
            fireProjectile(impactPos, splashPos, "#8ff3ff", () => {
              if (splashResult.hit) {
                spawnBurst(splashPos.x, splashPos.y, "143,243,255", 8, 90);
                addPopup(splashIdx, `-${splashResult.damageDealt}`, "#8ff3ff");
              }
            });
          }, 90);
          if (splashResult.hit) {
            nextEnemies[splashIdx] = { ...splashTarget, hull: Math.max(0, splashTarget.hull - splashResult.damageDealt) };
            pushLog(`Splash catches ${splashTarget.name} for ${splashResult.damageDealt}.`);
          }
        });
      }
    } else {
      pushLog(`${def.name} activated.`);
      // Purge Field's Cleanse: the only removal effect in combat — instantly clears
      // Hollow's permanent Corrosion stack, restoring the ship's real armor value.
      if (mod.traits.includes("cleanse") && corrodedBlock > 0) {
        setCorrodedBlock(0);
        pushLog(`Purge Field clears ${corrodedBlock} points of corroded plating.`);
      }
    }
    const overchargePenalty = wasOvercharged ? 2 : 0;
    const alphaStrikePenalty = wasAlphaStrike ? 2 : 0;
    const cooldownReduction = jumpRangeStacks > 0 ? 1 : 0;
    setCooldowns((prev) => ({ ...prev, [moduleId]: Math.max(0, (def.cooldown ?? 0) + overchargePenalty + alphaStrikePenalty - cooldownReduction) }));
    if (wasOvercharged) setOvercharged(false);
    if (wasGuaranteedCrit) setGuaranteedCrit(false);
    if (wasAlphaStrike) setAlphaStrikeArmed(false);
    // Starving Wolf's Bloodscent: a fraction of damage dealt to the marked target
    // heals Whisper — a sustain axis nothing else in combat has.
    if (dmg > 0 && bloodscentTurns > 0 && targetIdx === bloodscentTargetRef.current) {
      const dealt = nextEnemies[targetIdx].hull < target.hull ? target.hull - nextEnemies[targetIdx].hull : 0;
      const healed = Math.round(dealt * 0.25);
      if (healed > 0) {
        setPlayerHull((h) => Math.min(maxHull, h + healed));
        addPopup("player", `+${healed}`, "#5dffb0");
        pushLog(`Bloodscent draws ${healed} hull back from ${target.name}.`);
      }
    }
    setEnemies(nextEnemies);
    endPlayerAction(nextEnemies);
  }

  function useCrewActive(crewId: string, abilityId: string) {
    try {
      useCrewActiveImpl(crewId, abilityId);
    } catch (err) {
      reportError("Combat.useCrewActive", err);
      setStatus("active");
    }
  }

  function useCrewActiveImpl(crewId: string, abilityId: string) {
    if (status !== "active") return;
    let nextEnemies = enemies;
    const livingIdx = enemies.map((e, i) => ({ e, i })).filter(({ e }) => e.hull > 0).map(({ i }) => i);

    if (abilityId === "fieldPatch") {
      // Ori Vashti: a straightforward mid-battle repair.
      const heal = Math.round(maxHull * 0.15);
      setPlayerHull((h) => Math.min(maxHull, h + heal));
      addPopup("player", `+${heal}`, "#5dffb0");
      pushLog(`Field Patch restores ${heal} hull.`);
      playSfx("dock");
    } else if (abilityId === "focusFire") {
      // Ratchet Koi: no damage now — the next weapon fired this fight is a guaranteed crit.
      setGuaranteedCrit(true);
      pushLog("Focus Fire locks in a guaranteed critical hit on the next weapon volley.");
      playSfx("click");
    } else if (abilityId === "riposte") {
      // Kaan Ferrous: arms a free counter-attack the next time an enemy misses.
      setRiposteArmed(true);
      pushLog("Riposte primed — the next evaded hit draws an automatic counter.");
      playSfx("click");
    } else if (abilityId === "undercut") {
      // Priya Osei: halves every living enemy's block for two rounds.
      nextEnemies = enemies.map((e, i) => (livingIdx.includes(i) ? { ...e, blockDebuffTurns: 2 } : e));
      pushLog("Undercut strips block fleet-wide for two rounds.");
      playSfx("click");
    } else if (abilityId === "reaversCut") {
      // Kessa Vray: every living enemy takes +25% damage for one round.
      nextEnemies = enemies.map((e, i) => (livingIdx.includes(i) ? { ...e, vulnerableTurns: 1 } : e));
      pushLog("Reaver's Cut marks every hostile — bonus damage incoming.");
      playSfx("click");
    } else if (abilityId === "constructOverride") {
      // Unit 7-Requiem: negates all incoming damage on the next enemy turn.
      setShieldedNextTurn(true);
      pushLog("Construct Override primes a full damage negation for the next assault.");
      playSfx("click");
    } else if (abilityId === "evasiveBurn") {
      // Generic recruit helm: an instant burst toward the target, closing or opening range.
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
    } else if (abilityId === "targetLock") {
      // Generic recruit tactician: halves the current target's evasion for two rounds.
      const target = enemies[targetIdx];
      if (target && target.hull > 0) {
        nextEnemies = enemies.map((e, i) => (i === targetIdx ? { ...e, evasionDebuffTurns: 2 } : e));
        pushLog(`Target Lock cuts ${target.name}'s evasion for two rounds.`);
      }
    }
    const cooldownValue = crewDefById(state.value.crew.find((c) => c.id === crewId)!.defId).activeCooldown;
    setCrewCooldowns((prev) => ({ ...prev, [crewId]: cooldownValue }));
    setEnemies(nextEnemies);
    endPlayerAction(nextEnemies);
  }

  function useShipActive() {
    try {
      useShipActiveImpl();
    } catch (err) {
      reportError("Combat.useShipActive", err);
      setStatus("active");
    }
  }

  function useShipActiveImpl() {
    if (status !== "active" || !ship.namedShipId) return;
    const namedDef = namedShipDefById(ship.namedShipId);
    if (namedDef.abilityId === "alphaStrike") {
      setAlphaStrikeArmed(true);
      pushLog("Alpha Strike arms the next weapon volley for double damage.");
    } else if (namedDef.abilityId === "phaseShift") {
      setPhaseShiftReady(true);
      pushLog("Phase Shift primes — the next enemy attack will find nothing there.");
    } else if (namedDef.abilityId === "fortify") {
      setFortifyTurns(2);
      pushLog("Fortify doubles Whisper's armor block for two rounds.");
    } else if (namedDef.abilityId === "bloodscent") {
      const target = enemies[targetIdx];
      if (target && target.hull > 0) {
        setBloodscentTurns(2);
        bloodscentTargetRef.current = targetIdx;
        pushLog(`Bloodscent marks ${target.name} — damage dealt to it will heal Whisper.`);
      }
    } else if (namedDef.abilityId === "overdrive") {
      setCooldowns({});
      pushLog("Overdrive resets every weapon's cooldown.");
    }
    setNamedAbilityCooldown(namedDef.activeCooldown);
    playSfx("click");
    endPlayerAction(enemies);
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
      try {
        if (statusRef.current === "victory" || statusRef.current === "defeat") return;
        const world = vp.toWorld(e.clientX, e.clientY);
        if (!Number.isFinite(world.x) || !Number.isFinite(world.y)) return;
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
      } catch (err) {
        reportError("Combat.onPointer", err);
      }
    }
    function onKeyDown(e: KeyboardEvent) { keys.add(e.key.toLowerCase()); }
    function onKeyUp(e: KeyboardEvent) { keys.delete(e.key.toLowerCase()); }
    canvas.addEventListener("pointerdown", onPointer);
    canvas.addEventListener("pointermove", (e) => { if (e.buttons > 0) onPointer(e); });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const player = { vx: 0, vy: 0, angle: 0 };

    function step(now: number) {
      const frozen = now < hitStopUntilRef.current;
      const dt = frozen ? 0 : Math.min(0.25, Math.max(0, (now - last) / 1000));
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
      player.vx += (ax / mag) * shipAccel * dt;
      player.vy += (ay / mag) * shipAccel * dt;
      const spd = Math.hypot(player.vx, player.vy);
      if (spd > shipSpeed) { player.vx = (player.vx / spd) * shipSpeed; player.vy = (player.vy / spd) * shipSpeed; }
      const drag = Math.pow(0.02, dt);
      player.vx *= drag; player.vy *= drag;
      const nextX = arena.player.x + player.vx * dt;
      const nextY = arena.player.y + player.vy * dt;
      // Defense in depth: NaN/Infinity anywhere upstream (a bad pointerTarget, a
      // momentary zero-size viewport) would otherwise poison position/velocity
      // permanently — every later frame's arithmetic on a NaN stays NaN forever,
      // which reads to a player as the ship silently freezing. If either axis ever
      // goes non-finite, drop the velocity and pointer target and hold the last
      // good position instead of propagating the corruption.
      if (Number.isFinite(nextX) && Number.isFinite(nextY)) {
        arena.player.x = Math.max(24, Math.min(REF_W - 24, nextX));
        arena.player.y = Math.max(24, Math.min(REF_H - 24, nextY));
      } else {
        reportError("Combat.step (player position)", new Error(`non-finite position: vx=${player.vx} vy=${player.vy}`));
        player.vx = 0;
        player.vy = 0;
        pointerTarget = null;
      }
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

      explosionsRef.current = explosionsRef.current.filter((e) => now - e.start < 500);

      const thrusting = Math.hypot(player.vx, player.vy) > 12;
      draw(ctx, vp, arena, { ...player, thrusting }, liveEnemies, targetIdxRef.current, stars, now, encounter.faction, shakeRef.current, projectilesRef.current, particlesRef.current, explosionsRef.current, hitPulseRef.current);
    }

    // A throw anywhere in step() (physics, draw, anything reachable from a frame
    // tick) must never permanently stall the loop — catch, report, and let the next
    // tick try again instead of leaving the canvas on its last frame forever.
    const interval = setInterval(() => {
      try {
        step(performance.now());
      } catch (err) {
        reportError("Combat.step", err);
      }
    }, 16);
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.3rem 1rem 0.5rem", fontSize: "0.78rem", color: "var(--text-mid)" }}>
        <span>{ship.name} — Hull <AnimatedFraction current={playerHull} max={maxHull} /></span>
        {comboCount > 0 && (
          <span
            className="eyebrow"
            style={{
              color: comboCount >= 8 ? "var(--red)" : comboCount >= 4 ? "var(--amber)" : "var(--cyan)",
              textShadow: `0 0 ${6 + Math.min(comboCount, 10)}px currentColor`,
              fontWeight: 700,
            }}
          >
            Combo ×{comboCount}
          </span>
        )}
        <span>
          Range: <span style={{ color: displayRange === "close" ? "var(--red)" : displayRange === "mid" ? "var(--amber)" : "var(--cyan)" }}>{displayRange}</span>
          {" · "}Power {capacity}
        </span>
      </div>

      {(guaranteedCrit || riposteArmed || shieldedNextTurn || alphaStrikeArmed || phaseShiftReady || fortifyTurns > 0 || bloodscentTurns > 0) && (
        <div style={{ display: "flex", gap: "0.4rem", padding: "0 1rem 0.4rem", flexWrap: "wrap" }}>
          {guaranteedCrit && <StatusBadge color="var(--amber)" text="Guaranteed Crit Armed" />}
          {riposteArmed && <StatusBadge color="var(--cyan)" text="Riposte Armed" />}
          {shieldedNextTurn && <StatusBadge color="var(--violet)" text="Override Shield Primed" />}
          {alphaStrikeArmed && <StatusBadge color="var(--red)" text="Alpha Strike Armed" />}
          {phaseShiftReady && <StatusBadge color="var(--cyan)" text="Phase Shift Primed" />}
          {fortifyTurns > 0 && <StatusBadge color="var(--violet)" text={`Fortified (${fortifyTurns})`} />}
          {bloodscentTurns > 0 && <StatusBadge color="var(--green)" text={`Bloodscent (${bloodscentTurns})`} />}
        </div>
      )}

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
        <button
          className={`btn ${overcharged ? "danger" : "ghost"}`}
          disabled={status !== "active"}
          onClick={() => setOvercharged((o) => !o)}
          title="Overcharge: next weapon shot deals +50% damage, but that weapon locks out for 2 extra turns."
        >
          {overcharged ? "Overcharged ⚡" : "Overcharge"}
        </button>
        {equippedModules.map((mod) => {
          const def = moduleDefById(mod.defId);
          const cd = cooldowns[mod.id] ?? 0;
          return (
            <button
              key={mod.id}
              className={`btn ${overcharged && def.baseDamage ? "primary" : ""}`}
              disabled={status !== "active" || cd > 0}
              onClick={() => fireModule(mod.id)}
            >
              {def.name}{cd > 0 ? ` (${cd})` : ""}
            </button>
          );
        })}
        {assignedCrew.map((c) => {
          const def = crewDefById(c.defId);
          const cd = crewCooldowns[c.id] ?? 0;
          return (
            <button key={c.id} className="btn" disabled={status !== "active" || cd > 0} onClick={() => useCrewActive(c.id, def.abilityId)}>
              {def.active.split(" — ")[0]}{cd > 0 ? ` (${cd})` : ""}
            </button>
          );
        })}
        {ship.namedShipId && (() => {
          const namedDef = namedShipDefById(ship.namedShipId);
          return (
            <button
              className="btn primary"
              disabled={status !== "active" || namedAbilityCooldown > 0}
              onClick={useShipActive}
              title={namedDef.active}
            >
              {namedDef.active.split(" — ")[0]}{namedAbilityCooldown > 0 ? ` (${namedAbilityCooldown})` : ""}
            </button>
          );
        })()}
      </div>

      <div className="panel" style={{ margin: "0.6rem 1rem", padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "var(--text-mid)", maxHeight: 84, overflowY: "auto" }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>

      {status === "victory" && (
        <div className="panel pop-in" style={{ margin: "0 1rem 1rem", padding: "1rem", textAlign: "center" }}>
          <div className="title" style={{ marginBottom: "0.5rem" }}>Victory</div>
          {levelUp && (
            <div className="panel accent pop-in" style={{ padding: "0.7rem 1rem", marginBottom: "0.75rem", ["--accent" as any]: "var(--amber)" }}>
              <div className="eyebrow" style={{ color: "var(--amber)" }}>Level Up — {ship.name} reached Level {levelUp}</div>
              {levelUpHullGain > 0 && (
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-hi)", marginTop: "0.3rem" }}>
                  +{levelUpHullGain} Max Hull
                </div>
              )}
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

function StatusBadge({ color, text }: { color: string; text: string }) {
  return (
    <span
      style={{
        fontSize: "0.66rem",
        fontWeight: 700,
        fontFamily: "var(--font-display)",
        color,
        border: `1px solid ${color}`,
        borderRadius: 999,
        padding: "0.2em 0.65em",
        textShadow: `0 0 6px ${color}`,
      }}
    >
      {text}
    </span>
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
          fontSize: popup.big ? "1.6rem" : "1rem",
          fontWeight: 700,
          textShadow: popup.big ? `0 0 14px ${popup.color}, 0 0 4px rgba(0,0,0,0.9)` : "0 0 6px rgba(0,0,0,0.8)",
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
  player: { angle: number; thrusting: boolean },
  enemies: EnemyState[],
  targetIdx: number,
  stars: { x: number; y: number; r: number; a: number }[],
  now: number,
  faction: FactionId,
  shake: number,
  projectiles: Projectile[],
  particles: Particle[],
  explosions: { x: number; y: number; start: number }[],
  hitPulse: { enemy: Record<number, number>; player: number },
) {
  vp.beginFrame(ctx);
  const { scale, offsetX, offsetY } = vp.transform();

  const bg = ctx.createRadialGradient(vp.displayW / 2, vp.displayH / 2, 0, vp.displayW / 2, vp.displayH / 2, Math.max(vp.displayW, vp.displayH) * 0.8);
  bg.addColorStop(0, "#161022");
  bg.addColorStop(1, "#040308");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, vp.displayW, vp.displayH);

  const nebula = ctx.createRadialGradient(vp.displayW * 0.75, vp.displayH * 0.25, 0, vp.displayW * 0.75, vp.displayH * 0.25, vp.displayW * 0.5);
  nebula.addColorStop(0, `rgba(${FACTION_HULL_COLOR_RGB[faction] ?? "255,159,77"},0.1)`);
  nebula.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = nebula;
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
  for (const ex of explosions) {
    ctx.save();
    drawExplosionRing(ctx, ex.x, ex.y, now - ex.start, 500);
    ctx.restore();
  }

  enemies.forEach((e, i) => {
    if (e.hull <= 0) return;
    const pos = arena.enemyPos[i];
    if (!pos) return;
    drawEnemyShip(ctx, pos, faction, now + i * 500, i === targetIdx, e, pulseScale(now, hitPulse.enemy[i]));
  });

  drawPlayerShip(ctx, arena.player, player.angle, now, player.thrusting, pulseScale(now, hitPulse.player));
  ctx.restore();
}

/** A brief squash-and-stretch pulse decaying from a hit timestamp — see
 * docs/visual-standards.md §3. Returns {sx, sy} scale factors, 1/1 once decayed. */
function pulseScale(now: number, hitAt: number | undefined): { sx: number; sy: number } {
  if (!hitAt) return { sx: 1, sy: 1 };
  const age = now - hitAt;
  const duration = 180;
  if (age < 0 || age > duration) return { sx: 1, sy: 1 };
  const decay = 1 - age / duration;
  return { sx: 1 + 0.22 * decay, sy: 1 - 0.16 * decay };
}

const FACTION_HULL_COLOR_RGB: Record<string, string> = {
  reavers: "255,92,92",
  lionsheart: "93,214,255",
  swarm: "140,255,158",
  swanreach: "255,184,77",
  bauhinia: "185,140,255",
  constructs: "159,184,204",
  hollow: "232,217,255",
};

function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]) {
  for (const p of projectiles) {
    drawWeaponBeam(ctx, p.fromX, p.fromY, p.toX, p.toY, p.t, p.color);
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

function drawPlayerShip(
  ctx: CanvasRenderingContext2D,
  pos: ArenaPoint,
  angle: number,
  now: number,
  thrusting: boolean,
  squash: { sx: number; sy: number } = { sx: 1, sy: 1 },
) {
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);
  ctx.scale(squash.sx, squash.sy);
  drawPlayerHull(ctx, 1.7, now, thrusting);
  ctx.restore();
}

function drawEnemyShip(
  ctx: CanvasRenderingContext2D,
  pos: ArenaPoint,
  faction: FactionId,
  now: number,
  targeted: boolean,
  enemy: EnemyState,
  squash: { sx: number; sy: number } = { sx: 1, sy: 1 },
) {
  ctx.save();
  ctx.translate(pos.x, pos.y);

  if (targeted) {
    const pulse = 0.6 + 0.4 * Math.sin(now / 200);
    ctx.strokeStyle = `rgba(255,226,93,${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (enemy.charging) {
    // telegraphed haymaker — an urgent, fast-pulsing warning ring the player has
    // exactly one turn to react to.
    const pulse = 0.5 + 0.5 * Math.sin(now / 90);
    ctx.strokeStyle = `rgba(255,92,92,${0.4 + pulse * 0.5})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, 46 + pulse * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (enemy.enraged) {
    const pulse = 0.4 + 0.3 * Math.sin(now / 200);
    ctx.strokeStyle = `rgba(255,92,92,${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.scale(squash.sx, squash.sy);
  drawEnemyHull(ctx, faction, 1.5, now);
  ctx.restore();

  if (enemy.charging) {
    ctx.save();
    ctx.fillStyle = "#ff5c5c";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "#ff5c5c";
    ctx.shadowBlur = 8;
    ctx.fillText("⚠ CHARGING", pos.x, pos.y + 62);
    ctx.restore();
  }
  if (enemy.stunned) {
    ctx.save();
    ctx.fillStyle = "#8ff3ff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DISABLED", pos.x, pos.y + 62);
    ctx.restore();
  }

  // HP bar
  const w = 54;
  const frac = Math.max(0, enemy.hull / enemy.maxHull);
  ctx.save();
  ctx.translate(pos.x - w / 2, pos.y - 46);
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
  ctx.fillText(enemy.name + (enemy.regen ? " ⟳" : ""), pos.x, pos.y - 52);
  ctx.restore();
}
