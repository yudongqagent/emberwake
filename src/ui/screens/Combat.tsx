import { useEffect, useRef, useState } from "preact/hooks";
import { encounterById } from "../../data/encounters";
import { moduleDefById } from "../../data/modules";
import { computeModuleDamage, computeModuleBlock, computeCritChance } from "../../engine/modules";
import { ModuleRarityTag } from "../components/RarityTag";
import { computeMaxHull, computePowerCapacity, computeSpeed, computeBaseEvasion, computeBaseCritChance } from "../../engine/ships";
import { RANGE_MODIFIERS, resolveAttack, rangeBandFromDistance, CRIT_MULTIPLIER, type RangeBand } from "../../engine/combat";
import { state, flagship, resolveCombatVictory, resolveCombatDefeat, hasCrewRecruited, crewCount, spend } from "../../state/store";
import { crewDefById } from "../../data/crew";
import { namedShipDefById } from "../../data/namedShips";
import { playSfx } from "../../audio/engine";
import type { FactionId, ResourceType, ModuleInstance } from "../../data/types";
import { randomId } from "../../engine/rng";
import { attachResponsiveCanvas } from "../../engine/viewport";
import { ResourceIcon, resourceLabel } from "../components/Icons";
import { AnimatedFraction } from "../components/StatBlock";
import { drawPlayerHull, drawEnemyHull, drawWeaponBeam, drawExplosionRing } from "../render/shipArt";
import { reportError } from "../../engine/errorReporting";
import { t } from "../../i18n/strings";
import { localizedModuleName, localizedCrewActive, localizedNamedShipActive } from "../../i18n/data";

const REF_W = 900;
const REF_H = 520;
const PROJECTILE_DURATION = 0.3;

/** Issue #8 (2026-08 playtest): combat used to be a strict turn drum — player acts,
 * then every enemy fires at once, then control returns. Now every timer (weapon
 * cooldowns, debuffs, enemy attacks) runs on a real clock instead of a turn counter.
 * TURN_SECONDS is the conversion factor from the old "N turns" balance numbers
 * (still authored as small ints in crew/namedShips/module cooldown data) to real
 * seconds, so existing balance ratios carry over instead of being re-tuned from
 * scratch. COMBAT_TICK_MS drives cooldown/debuff decay and enemy attack dispatch —
 * fast enough to feel continuous, slow enough to keep state updates cheap. */
const TURN_SECONDS = 2.4;
const COMBAT_TICK_MS = 150;
const COMBAT_TICK_SEC = COMBAT_TICK_MS / 1000;
/** Baseline seconds between one enemy's attacks, jittered per-enemy so a multi-enemy
 * fight doesn't just relocate the old synchronized volley to a shorter clock — each
 * enemy now runs its own independent attack rhythm. */
const ENEMY_ATTACK_INTERVAL = 2.6;
const ENEMY_ATTACK_JITTER = 0.7;
/** How long a boss's charged-strike telegraph (the red warning ring) holds before it
 * unleashes, replacing the old "one full turn of warning." */
const CHARGE_WINDUP_SEC = 1.9;
const REGEN_INTERVAL_SEC = TURN_SECONDS;

/** Issue #9 (docs/design-principles.md Player-Tested Anti-Patterns #7): before this,
 * enemies only bobbed in place around a fixed slot — range band was something the
 * player set once and forgot, not a contested space. Each faction now actively
 * closes to (or holds) the distance its doctrine wants, so staying put has a real
 * cost and repositioning is a continuous tactical choice, not a one-time setup step. */
const FACTION_PREFERRED_RANGE: Partial<Record<FactionId, RangeBand>> = {
  reavers: "close",
  swarm: "close",
  constructs: "long",
  bauhinia: "long",
  swanreach: "long",
  hollow: "mid",
  lionsheart: "mid",
  riftEchoes: "mid",
};
const RANGE_TARGET_DISTANCE: Record<RangeBand, number> = { close: 100, mid: 250, long: 420 };
/** World-units/sec an enemy closes/opens distance at — deliberately slower than the
 * player's own speed (see computeSpeed), so the player can always out-position them
 * with attention, but standing still lets the enemy dictate the range instead. */
const ENEMY_REPOSITION_SPEED = 70;

interface EnemyState {
  name: string;
  maxHull: number;
  hull: number;
  damage: number;
  block: number;
  evasion: number;
  regen?: number;
  /** Telegraphing a charged strike — see CHARGE_WINDUP_SEC. Unleashes a 2x-damage hit
   * when the windup elapses, then clears. */
  charging?: boolean;
  /** Disabled by an EMP proc — skips its next attack entirely. */
  stunned?: boolean;
  /** Shield-stripped by an EMP proc — takes full damage (block ignored) for N more player hits. */
  blockBrokenHits?: number;
  /** True once a boss has crossed the 50% enrage threshold. */
  enraged?: boolean;
  /** Target Lock: halves evasion against the player's attacks. Real-time seconds remaining. */
  evasionDebuffSec?: number;
  /** Undercut: halves block against the player's attacks. Real-time seconds remaining. */
  blockDebuffSec?: number;
  /** Reaver's Cut: takes +25% damage from the player. Real-time seconds remaining. */
  vulnerableSec?: number;
  /** Issue #10: Rift Echoes doctrine, axis 1 (Phase Flicker) — while true this enemy
   * is out of the fight both ways: player attacks against it auto-miss, and it skips
   * its own attack timer, until it flickers back. See combatTick. */
  phased?: boolean;
}

/** Per-enemy real-time attack/charge/regen clocks — kept in a ref (not React state)
 * since they tick every frame; only the moments they actually fire, start a charge,
 * or land a regen heal touch React state. Parallel-indexed to the enemies array. */
interface EnemyTimer {
  attackRemaining: number;
  charging: boolean;
  chargeRemaining: number;
  regenAccum: number;
  /** Rift Echoes only (see EnemyState.phased) — unused (stays false) for every other faction. */
  phased: boolean;
  phaseRemaining: number;
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
  weight: number;
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
  const [log, setLog] = useState<string[]>([t("combat.log.contact", { name: encounter.name })]);
  const [status, setStatus] = useState<"active" | "victory" | "defeat">("active");
  const [popups, setPopups] = useState<Popup[]>([]);
  const [playerShakeToken, setPlayerShakeToken] = useState(0);
  const [rewardsEarned, setRewardsEarned] = useState<Partial<Record<ResourceType, number>> | null>(null);
  const [bonusDrop, setBonusDrop] = useState<ModuleInstance | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [levelUpHullGain, setLevelUpHullGain] = useState(0);
  const [levelUpPowerGain, setLevelUpPowerGain] = useState(0);
  const [displayRange, setDisplayRange] = useState<RangeBand>("mid");
  const [comboCount, setComboCount] = useState(0);
  const [overcharged, setOvercharged] = useState(false);
  const [guaranteedCrit, setGuaranteedCrit] = useState(false);
  const [riposteArmed, setRiposteArmed] = useState(false);
  // Construct Override, real-time form: since enemies no longer act in a single
  // synchronized batch, "negate the next enemy turn" becomes "negate incoming damage
  // for a short window" — long enough to plausibly catch more than one enemy's
  // attack in a multi-target fight, distinct from Phase Shift's single-hit dodge.
  const [shieldSec, setShieldSec] = useState(0);
  // Hollow doctrine, axis 2: Corrosion. Unlike the decaying-over-time debuffs crew
  // abilities apply (evasionDebuffSec/blockDebuffSec), this is permanent for the
  // rest of the fight — Hollow attacks don't just drain resources, they eat the
  // plating itself. A distinct status-effect category from anything else in combat.
  const [corrodedBlock, setCorrodedBlock] = useState(0);
  const bossPhaseRef = useRef(false);
  // Issue #10: Rift Echoes doctrine, axis 2 (Rift Anchor). Unlike Swarm's Hive
  // Retaliation (allies get stronger as the group thins), a Rift Echo dying breaks
  // the pocket's stability further — every surviving Echo becomes easier to hit hard
  // for the rest of the fight. A reversal of the usual "fewer allies, more danger"
  // pattern, set once and never cleared (see the reactive effect keyed on [enemies]).
  const riftAnchoredRef = useRef(false);
  // Named-ship signature abilities (issues #3/#4 — see data/namedShips.ts): each one
  // is a distinct mechanical axis, not a bigger number. namedAbilityCooldown mirrors
  // crewCooldowns' per-instance pattern, just for the single flagship ability slot.
  const [namedAbilityCooldown, setNamedAbilityCooldown] = useState(0);
  const [alphaStrikeArmed, setAlphaStrikeArmed] = useState(false);
  const [phaseShiftReady, setPhaseShiftReady] = useState(false);
  const [fortifySec, setFortifySec] = useState(0);
  const [bloodscentSec, setBloodscentSec] = useState(0);
  const bloodscentTargetRef = useRef<number | null>(null);
  // Issues #5/#6 (2026-08 playtest): a signature ultimate, and the game's first
  // guaranteed (not rarity-pull-dependent) AoE — every ship has this regardless of
  // loadout. Charges from landing hits, not from time or RNG, so it rewards active
  // play. Damage scales with Power Capacity, which now grows with level (see
  // computePowerCapacity) — leveling up makes the ultimate hit harder too.
  const [emberNovaCharge, setEmberNovaCharge] = useState(0);
  const EMBER_NOVA_MAX = 100;
  // Shared with the physics loop below so Displacement Charge (fired from
  // fireModuleImpl) can shove an enemy's chase position directly, not just read it.
  const enemyChaseXRef = useRef<number[]>([]);
  // Issue #8: each enemy's independent real-time attack clock — see EnemyTimer.
  // Initialized lazily (per index, on first tick) with a staggered random start so
  // a multi-enemy fight doesn't open with every enemy firing in lockstep.
  const enemyTimersRef = useRef<EnemyTimer[]>([]);
  // Ion Disruptor's Overload: a per-module shot counter, keyed by module instance id
  // so two Ion Disruptors equipped at once track independently.
  const overloadCountersRef = useRef<Record<string, number>>({});
  // Vector Drive's Surge: distance covered since the last shot fired, any weapon —
  // an engine-wide bonus, not a per-weapon one, so it accumulates regardless of what
  // eventually spends it.
  const distanceSinceLastShotRef = useRef(0);
  // Ablative Plating's Absorb: negates exactly the first hit landed each fight, then
  // behaves like ordinary block for the rest of it — a ref because it must mutate
  // synchronously mid-resolution, before any re-render, same pattern as bossPhaseRef.
  const absorbRef = useRef(true);
  const hasAbsorbArmor = equippedModuleList.some(
    (m) => moduleDefById(m.defId).type === "armor" && m.traits.includes("absorb"),
  );
  // Kinetic Reflector's Reflect: the only module that punishes an enemy for hitting
  // you, instead of just mitigating what you take.
  const hasReflectArmor = equippedModuleList.some(
    (m) => moduleDefById(m.defId).type === "armor" && m.traits.includes("reflect"),
  );
  // Inertial Dampers' Momentum: evasion rises with consecutive undamaged enemy
  // attacks, capped modestly so it augments rather than replaces the flat +evasion
  // trait. Computed live off unhitStreakRef inside enemyAttack (see the ref-mirror
  // block below), not here — this render-scope value would go stale inside the
  // frozen combatTick/enemyAttack closure.
  const [unhitStreak, setUnhitStreak] = useState(0);
  const hasMomentum = equippedModuleList.some(
    (m) => moduleDefById(m.defId).type === "engine" && m.traits.includes("momentum"),
  );

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
  // Issue #8: combatTick/enemyAttack run inside a setInterval closure frozen at
  // mount (same pattern as the existing physics loop below), so any state that
  // changes mid-fight and needs to be read there must be mirrored into a ref every
  // render — plain state reads inside that closure would stay stuck at their
  // mount-time value forever.
  const riposteArmedRef = useRef(riposteArmed);
  const shieldSecRef = useRef(shieldSec);
  const phaseShiftReadyRef = useRef(phaseShiftReady);
  const fortifySecRef = useRef(fortifySec);
  const corrodedBlockRef = useRef(corrodedBlock);
  const unhitStreakRef = useRef(unhitStreak);
  enemiesRef.current = enemies;
  targetIdxRef.current = targetIdx;
  statusRef.current = status;
  riposteArmedRef.current = riposteArmed;
  shieldSecRef.current = shieldSec;
  phaseShiftReadyRef.current = phaseShiftReady;
  fortifySecRef.current = fortifySec;
  corrodedBlockRef.current = corrodedBlock;
  unhitStreakRef.current = unhitStreak;

  useEffect(() => {
    if (enemies[targetIdx] && enemies[targetIdx].hull <= 0) {
      const nextLiving = enemies.findIndex((e) => e.hull > 0);
      if (nextLiving >= 0) setTargetIdx(nextLiving);
    }
  }, [enemies, targetIdx]);

  // Explosion burst the moment an enemy's hull crosses to zero.
  const prevHullsRef = useRef<number[]>(enemies.map((e) => e.hull));
  useEffect(() => {
    let anyDiedThisUpdate = false;
    enemies.forEach((e, i) => {
      if (prevHullsRef.current[i] > 0 && e.hull <= 0) {
        anyDiedThisUpdate = true;
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
    // Issue #10: Rift Anchor — the first Rift Echo to die breaks the pocket's
    // stability for the rest of the fight, permanently boosting the player's damage
    // against every survivor (see fireModuleImpl's riftAnchorMult).
    if (anyDiedThisUpdate && encounter.faction === "riftEchoes" && !riftAnchoredRef.current && enemies.some((e) => e.hull > 0)) {
      riftAnchoredRef.current = true;
      pushLog(t("combat.log.riftAnchor"));
    }
    prevHullsRef.current = enemies.map((e) => e.hull);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemies]);

  // Boss enrage: crossing 50% hull permanently shifts the fight — harder hits,
  // thinner plating. Issue #8: this used to be checked once per enemy-turn batch;
  // now that batches don't exist it fires reactively the instant the hull actually
  // crosses the threshold, which is strictly more responsive than before.
  useEffect(() => {
    if (!encounter.isBoss || bossPhaseRef.current) return;
    const boss = enemies[0];
    if (!boss || boss.hull <= 0 || boss.hull > boss.maxHull * 0.5) return;
    bossPhaseRef.current = true;
    setEnemies((prev) => prev.map((e, i) => (i === 0
      ? { ...e, damage: Math.round(e.damage * 1.3), block: Math.max(0, Math.round(e.block * 0.75)), enraged: true }
      : e)));
    pushLog(t("combat.log.bossEnrage", { boss: boss.name }));
    const pos = arenaRef.current.enemyPos[0];
    if (pos) {
      spawnBurst(pos.x, pos.y, "255,92,92", 24, 120);
      explosionsRef.current.push({ x: pos.x, y: pos.y, start: performance.now() });
    }
    playSfx("alarm");
    shakeRef.current = 14;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemies]);

  // Issue #8: victory/defeat used to be checked inline at the tail of the batched
  // endPlayerAction/enemyTurn functions. Now that player fire and enemy attacks
  // both mutate enemies/playerHull independently and asynchronously, detecting
  // "the fight just ended" has to be reactive to whichever state actually crossed
  // the line, not baked into whichever function happened to cause it.
  useEffect(() => {
    if (status === "active" && enemies.length > 0 && enemies.every((e) => e.hull <= 0)) {
      finishCombat("victory", enemies);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemies, status]);

  useEffect(() => {
    if (status === "active" && playerHull <= 0) {
      finishCombat("defeat", enemiesRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerHull, status]);

  // Issue #8: the real-time heartbeat — separate from the 16ms canvas/physics loop
  // below since cooldown/debuff decay doesn't need per-frame precision.
  useEffect(() => {
    const id = setInterval(() => {
      try {
        combatTick();
      } catch (err) {
        reportError("Combat.combatTick", err);
      }
    }, COMBAT_TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Issue #4 (2026-08 playtest): spawnBurst takes "r,g,b" (used as rgb(...) in the
  // particle fillStyle), but every weapon's signature color is authored as hex — one
  // small conversion point instead of re-deriving it at every call site.
  function hexToRgbString(hex: string): string {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `${r},${g},${b}`;
  }

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
    weight: number = 1,
  ) {
    projectilesRef.current.push({ fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, t: 0, duration: PROJECTILE_DURATION, color, weight });
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

  // Player passive-regen clock (Field Repair / regen-trait stacks) — independent of
  // any specific enemy attack now that enemies no longer act in a synchronized
  // batch; see combatTick.
  const playerRegenAccumRef = useRef(0);

  function getEnemyTimer(i: number): EnemyTimer {
    if (!enemyTimersRef.current[i]) {
      // Staggered random start so a multi-enemy fight doesn't open with every
      // enemy's first shot landing in lockstep.
      enemyTimersRef.current[i] = {
        attackRemaining: 0.8 + Math.random() * ENEMY_ATTACK_INTERVAL,
        charging: false,
        chargeRemaining: 0,
        regenAccum: 0,
        phased: false,
        // Staggered per-enemy so a multi-enemy Rift fight doesn't flicker in unison.
        phaseRemaining: 1.8 + Math.random() * 1.6,
      };
    }
    return enemyTimersRef.current[i];
  }

  /** Issue #8: fires ONE enemy's attack, independent of every other enemy's clock —
   * this is the real-time replacement for the old batched enemyTurn(). Reads all
   * mutable combat state off the *Ref mirrors (see the ref-mirror block above),
   * since this runs from a setInterval closure frozen at mount. Ported line-for-line
   * from the original per-enemy turn logic where the mechanic itself didn't change,
   * only its trigger (this enemy's own timer, not "everyone, once per batch"). */
  function enemyAttack(idx: number, charged: boolean) {
    const currentEnemies = enemiesRef.current;
    const enemy = currentEnemies[idx];
    if (!enemy || enemy.hull <= 0) return;

    if (enemy.stunned) {
      setEnemies((prev) => prev.map((e, i) => (i === idx ? { ...e, stunned: false } : e)));
      pushLog(t("combat.log.disabled", { enemy: enemy.name }));
      return;
    }

    const shieldActive = shieldSecRef.current > 0;
    // Hollow Point's Phase Shift: the next enemy attack (whichever fires first)
    // auto-misses — a guaranteed single-attack dodge, distinct from Construct
    // Override's short full-negation window — a miss still triggers Lionsheart's
    // honor-counter, a real tradeoff Construct Override doesn't have.
    const phaseShiftBlocksThis = phaseShiftReadyRef.current;
    if (phaseShiftBlocksThis) setPhaseShiftReady(false);
    const riposteActive = riposteArmedRef.current;

    // Reaver doctrine: Frenzy. Below 30% hull, a Reaver stops fighting defensively
    // and goes all-in — a real threshold distinct from boss enrage (50%, isBoss-only).
    const frenzied = encounter.faction === "reavers" && enemy.hull <= enemy.maxHull * 0.3;
    // Swarm doctrine: Hive Retaliation. A downed hive-mate doesn't weaken the
    // swarm, it enrages what's left — every dead ally adds +15% damage to each
    // surviving Swarm attacker.
    const deadHiveAllies = encounter.faction === "swarm" ? currentEnemies.filter((e) => e.hull <= 0).length : 0;
    const hiveBonus = 1 + 0.15 * deadHiveAllies;
    const enemyPos = arenaRef.current.enemyPos[idx] ?? enemySlot(idx, currentEnemies.length);
    const dist = Math.hypot(enemyPos.x - arenaRef.current.player.x, enemyPos.y - arenaRef.current.player.y);
    const band = rangeBandFromDistance(dist);
    // A charge telegraph is a real spatial tell, not just a stat flag: burning
    // distance to long range during the windup negates the charged bonus entirely.
    const chargeDodged = charged && band === "long";
    const dmgMultiplier = (charged && !chargeDodged ? 2 : 1) * (frenzied ? 1.4 : 1) * hiveBonus;
    const baseEvasion = shipBaseEvasion + evasionTraitCount * 0.05 + shieldBreakArmorStacks * 0.08 + recruitHelmEvasionBonus
      + (hasMomentum ? Math.min(0.15, unhitStreakRef.current * 0.03) : 0);
    // Kaan Ferrous: "+10% evasion when at Long range" — only when he's assigned to the flagship.
    const kaanAssigned = assignedCrew.some((c) => c.defId === "kaanFerrous");
    const evasion = Math.min(0.6, baseEvasion + (kaanAssigned && band === "long" ? 0.1 : 0));
    // Iron Verdict's Fortify: armor block doubles for its duration.
    const fortifyMult = fortifySecRef.current > 0 ? 2 : 1;
    const rawResult = resolveAttack(enemy.damage * dmgMultiplier, Math.max(0, armorBlock - corrodedBlockRef.current) * fortifyMult, evasion, RANGE_MODIFIERS[band].incoming);
    const result = phaseShiftBlocksThis ? { ...rawResult, hit: false } : rawResult;
    // Ablative Plating's Absorb: negates exactly the first hit of the fight,
    // regardless of which enemy lands it — consumed the instant it's used.
    const absorbedHit = hasAbsorbArmor && absorbRef.current && result.hit && result.damageDealt > 0;
    if (absorbedHit) absorbRef.current = false;
    const dealt = shieldActive || absorbedHit ? 0 : result.hit ? result.damageDealt : 0;
    // Kinetic Reflector's Reflect: a fraction of whatever the block actually
    // absorbed strikes back, computed from resolveAttack's own pre-block raw damage.
    let reflectDmg = 0;
    if (hasReflectArmor && result.hit && !absorbedHit && !shieldActive) {
      const preBlockRaw = Math.max(1, Math.round(enemy.damage * dmgMultiplier * RANGE_MODIFIERS[band].incoming));
      const blockedAmount = Math.max(0, preBlockRaw - result.damageDealt);
      reflectDmg = Math.round(blockedAmount * 0.3);
    }

    if (!result.hit && riposteActive) {
      setRiposteArmed(false);
      const bestWeapon = equippedModules
        .filter((m) => moduleDefById(m.defId).baseDamage)
        .sort((a, b) => computeModuleDamage(b) - computeModuleDamage(a))[0];
      if (bestWeapon) {
        const riposteDmg = Math.round(computeModuleDamage(bestWeapon) * 0.6);
        setTimeout(() => {
          setEnemies((prev) => prev.map((e, i) => (i === idx ? { ...e, hull: Math.max(0, e.hull - riposteDmg) } : e)));
          const pos = arenaRef.current.enemyPos[idx];
          if (pos) {
            fireProjectile(arenaRef.current.player, pos, "#ffe25d", () => {
              spawnBurst(pos.x, pos.y, "255,226,93", 14, 110);
              addPopup(idx, `-${riposteDmg}`, "#ffe25d");
            });
          }
          pushLog(t("combat.log.riposte", { enemy: enemy.name, dmg: riposteDmg }));
          playSfx("laser");
        }, 220);
      }
    }

    fireProjectile(enemyPos, arenaRef.current.player, charged ? "#ffe25d" : "#ff6b6b", () => {
      if (result.hit && shieldActive) {
        spawnBurst(arenaRef.current.player.x, arenaRef.current.player.y, "143,243,255", 10, 90);
        addPopup("player", t("combat.popup.deflected"), "#8ff3ff");
        pushLog(t("combat.log.overrideDeflect", { enemy: enemy.name }));
      } else if (result.hit && absorbedHit) {
        spawnBurst(arenaRef.current.player.x, arenaRef.current.player.y, "180,220,255", 10, 90);
        addPopup("player", t("combat.popup.absorbed"), "#b4dcff");
        pushLog(t("combat.log.absorbFull", { enemy: enemy.name }));
      } else if (result.hit) {
        spawnBurst(arenaRef.current.player.x, arenaRef.current.player.y, "255,107,107", charged ? 20 : 10, charged ? 130 : 90);
        addPopup("player", `-${result.damageDealt}`, "#ff5c5c", charged);
        playSfx("hit");
        setPlayerShakeToken((t) => t + 1);
        triggerHitStop(charged ? 100 : 45);
        hitPulseRef.current.player = performance.now();
        const hitKey = charged ? (chargeDodged ? "combat.log.enemyHitChargedDodged" : "combat.log.enemyHitCharged") : "combat.log.enemyHitPlain";
        pushLog(t(hitKey, { enemy: enemy.name, dmg: result.damageDealt }) + (deadHiveAllies > 0 ? t("combat.log.hiveSuffix") : ""));
        if (reflectDmg > 0) {
          spawnBurst(enemyPos.x, enemyPos.y, "255,143,102", 8, 90);
          addPopup(idx, `-${reflectDmg}`, "#ff8f66");
          pushLog(t("combat.log.reflect", { dmg: reflectDmg, enemy: enemy.name }));
        }

        // Construct doctrine: a precise EMP pulse on hit has a chance to lock out
        // one of the player's own weapons — the mirror of the player's own EMP
        // Burst "disable" trait, from the enemy's side.
        if (encounter.faction === "constructs" && Math.random() < 0.3) {
          const targetable = equippedModules.filter((m) => moduleDefById(m.defId).cooldown !== null);
          if (targetable.length > 0) {
            const jammed = targetable[Math.floor(Math.random() * targetable.length)];
            const jammedDef = moduleDefById(jammed.defId);
            setCooldowns((prev) => ({ ...prev, [jammed.id]: Math.max(prev[jammed.id] ?? 0, TURN_SECONDS) }));
            pushLog(t("combat.log.empJam", { enemy: enemy.name, module: jammedDef.name }));
          }
        }
        // Hollow doctrine: it doesn't just damage the hull, it drains what's inside it.
        if (encounter.faction === "hollow") {
          const drain = Math.max(1, Math.round(result.damageDealt * 0.25));
          const pool: ResourceType = state.value.resources.insight > 0 ? "insight" : "sourcePoints";
          const actualDrain = Math.min(drain, state.value.resources[pool]);
          if (actualDrain > 0) {
            spend({ [pool]: actualDrain } as Partial<Record<ResourceType, number>>);
            addPopup("player", `-${actualDrain} ${resourceLabel(pool)}`, "#e8d9ff");
            pushLog(t("combat.log.hollowDrain", { enemy: enemy.name, amount: actualDrain, resource: resourceLabel(pool) }));
          }
          // Hollow doctrine, axis 2: Corrosion. A permanent (not decaying) block
          // reduction for the rest of the fight.
          if (armorBlock - corrodedBlockRef.current > 0) {
            setCorrodedBlock((c) => c + 1);
            pushLog(t("combat.log.corrode", { enemy: enemy.name }));
          }
        }
      } else {
        pushLog(phaseShiftBlocksThis ? t("combat.log.phaseShiftMiss", { enemy: enemy.name }) : t("combat.log.enemyMiss", { enemy: enemy.name }));
      }
      if (dealt > 0) setPlayerHull((prev) => Math.max(0, Math.min(maxHull, prev - dealt)));
      // Inertial Dampers' Momentum: real-time reinterpretation of "a clean enemy
      // turn" — now evaluated per individual attack event instead of per batch,
      // since batches no longer exist. Any hit landed resets the streak to zero.
      if (hasMomentum) setUnhitStreak((s) => (dealt > 0 ? 0 : s + 1));
    });

    if (charged) setEnemies((prev) => prev.map((e, i) => (i === idx ? { ...e, charging: false } : e)));
    if (reflectDmg > 0) setEnemies((prev) => prev.map((e, i) => (i === idx ? { ...e, hull: Math.max(0, e.hull - reflectDmg) } : e)));
  }

  /** Issue #8: the real-time heartbeat replacing the old turn drum. Runs on a fixed
   * COMBAT_TICK_MS cadence (not the 16ms physics frame — cooldown/debuff decay
   * doesn't need per-frame precision, and ticking that often would mean far more
   * state-setter calls than necessary). Decays every cooldown/debuff by real
   * elapsed time, and advances each enemy's independent attack clock — a boss's
   * charge windup included — dispatching enemyAttack() only for the enemy whose
   * own timer just expired, never all of them at once. */
  function combatTick() {
    if (statusRef.current !== "active") return;
    const dt = COMBAT_TICK_SEC;

    setCooldowns((prev) => {
      const next: Record<string, number> = {};
      for (const [k, v] of Object.entries(prev)) next[k] = Math.max(0, v - dt);
      return next;
    });
    setCrewCooldowns((prev) => {
      const next: Record<string, number> = {};
      for (const [k, v] of Object.entries(prev)) next[k] = Math.max(0, v - dt);
      return next;
    });
    setNamedAbilityCooldown((c) => Math.max(0, c - dt));
    setFortifySec((t) => Math.max(0, t - dt));
    setBloodscentSec((t) => Math.max(0, t - dt));
    setShieldSec((t) => Math.max(0, t - dt));

    setEnemies((prev) => prev.map((e) => (e.hull <= 0 ? e : {
      ...e,
      evasionDebuffSec: Math.max(0, (e.evasionDebuffSec ?? 0) - dt),
      blockDebuffSec: Math.max(0, (e.blockDebuffSec ?? 0) - dt),
      vulnerableSec: Math.max(0, (e.vulnerableSec ?? 0) - dt),
    })));

    // Passive player field regen — its own clock now, decoupled from any specific
    // enemy attack (there's no longer a "batch boundary" to hang it on).
    if (regenStacks > 0) {
      playerRegenAccumRef.current += dt;
      if (playerRegenAccumRef.current >= REGEN_INTERVAL_SEC) {
        playerRegenAccumRef.current -= REGEN_INTERVAL_SEC;
        const tick = Math.round(maxHull * 0.04 * regenStacks);
        if (tick > 0) {
          setPlayerHull((prev) => {
            if (prev <= 0 || prev >= maxHull) return prev;
            const next = Math.min(maxHull, prev + tick);
            if (next > prev) pushLog(t("combat.log.fieldRegen", { amount: next - prev }));
            return next;
          });
        }
      }
    }

    enemiesRef.current.forEach((enemy, i) => {
      if (enemy.hull <= 0) return;
      const timer = getEnemyTimer(i);

      if (enemy.regen) {
        timer.regenAccum += dt;
        if (timer.regenAccum >= REGEN_INTERVAL_SEC) {
          timer.regenAccum -= REGEN_INTERVAL_SEC;
          setEnemies((prev) => prev.map((e, idx) => {
            if (idx !== i || e.hull <= 0 || !e.regen) return e;
            const healed = Math.min(e.maxHull, e.hull + e.regen);
            if (healed > e.hull) {
              addPopup(idx, `+${healed - e.hull}`, "#5dffb0");
              pushLog(t("combat.log.enemyRegen", { enemy: e.name, amount: healed - e.hull }));
            }
            return { ...e, hull: healed };
          }));
        }
      }

      // Issue #10: Rift Echoes doctrine, axis 1 (Phase Flicker). Each enemy cycles
      // solid/phased on its own independent clock — while phased it's out of the
      // fight both ways: unhittable, and it skips its own attack. This is the
      // mode's real tactical texture: focus whichever Echo is currently solid
      // instead of just target-locking the whole fight onto one enemy.
      if (encounter.faction === "riftEchoes") {
        timer.phaseRemaining -= dt;
        if (timer.phaseRemaining <= 0) {
          timer.phased = !timer.phased;
          timer.phaseRemaining = timer.phased ? 1.6 : 2.2 + Math.random() * 1.2;
          setEnemies((prev) => prev.map((e, idx) => (idx === i ? { ...e, phased: timer.phased } : e)));
          pushLog(t(timer.phased ? "combat.log.riftFlickerOut" : "combat.log.riftFlickerIn", { enemy: enemy.name }));
        }
        if (timer.phased) return;
      }

      if (timer.charging) {
        timer.chargeRemaining -= dt;
        if (timer.chargeRemaining <= 0) {
          timer.charging = false;
          enemyAttack(i, true);
          timer.attackRemaining = ENEMY_ATTACK_INTERVAL + (Math.random() - 0.5) * 2 * ENEMY_ATTACK_JITTER;
        }
        return;
      }

      timer.attackRemaining -= dt;
      if (timer.attackRemaining <= 0) {
        // Bosses occasionally wind up a haymaker instead of attacking — a real
        // windup (the red ring on the arena), then it lands for double.
        if (encounter.isBoss && i === 0 && Math.random() < 0.3) {
          timer.charging = true;
          timer.chargeRemaining = CHARGE_WINDUP_SEC;
          setEnemies((prev) => prev.map((e, idx) => (idx === i ? { ...e, charging: true } : e)));
          pushLog(t("combat.log.bossCharging", { enemy: enemy.name }));
          playSfx("alarm");
        } else {
          enemyAttack(i, false);
          timer.attackRemaining = ENEMY_ATTACK_INTERVAL + (Math.random() - 0.5) * 2 * ENEMY_ATTACK_JITTER;
        }
      }
    });
  }

  function finishCombat(result: "victory" | "defeat", finalEnemies: EnemyState[]) {
    setStatus(result);
    setEnemies(finalEnemies);
    if (result === "victory") {
      playSfx("victory");
      // Convert the combat-local (hullBonus-scaled) playerHull back to the ship's
      // own terms before persisting — see resolveCombatVictory's endingHullPoints.
      const realEndingHull = playerHull / (1 + hullBonusFraction);
      const outcome = resolveCombatVictory(encounterId, poiId, victoryFlag, yieldBonusFraction, realEndingHull);
      setRewardsEarned(outcome.rewards);
      if (outcome.bonusDrop) {
        setBonusDrop(outcome.bonusDrop);
        playSfx("draw");
      }
      if (outcome.leveledUp) {
        const hullBefore = computeMaxHull(ship);
        const hullAfter = computeMaxHull({ ...ship, level: outcome.newLevel });
        const powerBefore = computePowerCapacity(ship);
        const powerAfter = computePowerCapacity({ ...ship, level: outcome.newLevel });
        setLevelUpHullGain(hullAfter - hullBefore);
        setLevelUpPowerGain(powerAfter - powerBefore);
        setLevelUp(outcome.newLevel);
        playSfx("levelUp");
        shakeRef.current = 10;
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
    // Issue #10: Rift Echoes' Phase Flicker — a phased target is out of reach
    // entirely; block the shot (and don't burn the weapon's cooldown for nothing)
    // rather than let it fire and silently miss, so the player retargets instead.
    if (target.phased) {
      pushLog(t("combat.log.phased", { enemy: target.name }));
      return;
    }

    const enemyPos = arenaRef.current.enemyPos[targetIdx] ?? enemySlot(targetIdx, enemies.length);
    const dist = Math.hypot(enemyPos.x - arenaRef.current.player.x, enemyPos.y - arenaRef.current.player.y);
    const band = rangeBandFromDistance(dist);
    const outgoingMult = RANGE_MODIFIERS[band].outgoing;

    const wasOvercharged = overcharged;
    const wasGuaranteedCrit = guaranteedCrit;
    const wasAlphaStrike = alphaStrikeArmed;
    const baseDmg = computeModuleDamage(mod);
    const vulnerable = (target.vulnerableSec ?? 0) > 0;
    // Ratchet Koi: "+10% weapon damage when at Close range" — only when he's assigned.
    const ratchetBonus = band === "close" && assignedCrew.some((c) => c.defId === "ratchetKoi") ? 1.1 : 1;
    // Railgun's Execute: a finisher axis, not a raw-damage lead — it does nothing
    // against a healthy target and swings hard against a dying one.
    const executeMult = mod.traits.includes("execute") && target.hull <= target.maxHull * 0.25 ? 1.5 : 1;
    // Ion Disruptor's Overload: every 3rd shot from THIS module instance hits double —
    // an automatic charge-up rhythm, distinct from Alpha Strike's manual one-shot arm.
    const overloadShotCount = mod.traits.includes("overload") ? (overloadCountersRef.current[mod.id] ?? 0) + 1 : 0;
    const overloadMult = overloadShotCount > 0 && overloadShotCount % 3 === 0 ? 2 : 1;
    // Vector Drive's Surge: a real burst of movement since the last shot (any
    // weapon) charges the next one — rewards actually using the positioning game,
    // not just picking a lane and holding it.
    const hasSurgeEngine = equippedModuleList.some((m) => moduleDefById(m.defId).type === "engine" && m.traits.includes("surge"));
    const surgeMult = hasSurgeEngine && distanceSinceLastShotRef.current > 150 ? 1.25 : 1;
    // Nightfall Vow's Alpha Strike: doubles this one shot, at the cost of that
    // weapon's cooldown locking out 2 extra turns (see the cooldown-set below).
    // Issue #10: Rift Anchor — once any Rift Echo has died this fight, every
    // survivor takes +50% from the player for the rest of it (see the reactive
    // effect keyed on [enemies]).
    const riftAnchorMult = encounter.faction === "riftEchoes" && riftAnchoredRef.current ? 1.5 : 1;
    const dmg = Math.round(baseDmg * ratchetBonus * (wasOvercharged ? 1.5 : 1) * (vulnerable ? 1.25 : 1) * executeMult * (wasAlphaStrike ? 2 : 1) * overloadMult * surgeMult * riftAnchorMult);
    distanceSinceLastShotRef.current = 0;
    const nextEnemies = [...enemies];
    if (dmg > 0) {
      const targetEvasion = (target.evasionDebuffSec ?? 0) > 0 ? target.evasion * 0.5 : target.evasion;
      const blockBroken = (target.blockBrokenHits ?? 0) > 0;
      const undercut = (target.blockDebuffSec ?? 0) > 0;
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
      // Every weapon now fires in its own signature color (def.color) instead of a
      // single generic blue for every module — a crit still flashes gold on top of
      // that, so "this was a crit" stays a distinct, readable signal.
      const weaponColor = def.color ?? "#8ff3ff";
      const beamColor = result.crit ? "#ffe25d" : weaponColor;
      const weaponWeight = def.powerDraw / 2;
      fireProjectile(playerPos, impactPos, beamColor, () => {
        if (result.hit) {
          spawnBurst(impactPos.x, impactPos.y, result.crit ? "255,226,93" : hexToRgbString(weaponColor), result.crit ? 22 : 12, result.crit ? 150 : 110);
          addPopup(targetIdx, `${result.crit ? t("combat.critPrefix") : ""}-${result.damageDealt}`, result.crit ? "#ffe25d" : weaponColor, result.crit);
          triggerHitStop(result.crit ? 90 : 35);
          hitPulseRef.current.enemy[targetIdx] = performance.now();
          if (result.crit) setPlayerShakeToken((t) => t + 1);
        }
      }, weaponWeight);
      playSfx("laser");
      setComboCount((c) => (result.hit ? c + 1 : 0));
      if (result.hit) setEmberNovaCharge((c) => Math.min(EMBER_NOVA_MAX, c + 12));

      let hitTarget = { ...target, hull: Math.max(0, target.hull - (result.hit ? result.damageDealt : 0)) };
      if (result.hit && blockBroken) hitTarget.blockBrokenHits = Math.max(0, (target.blockBrokenHits ?? 0) - 1);

      if (result.hit) {
        const hitLogKey = wasGuaranteedCrit ? "combat.log.weaponHitFocusFire" : result.crit ? "combat.log.weaponHitCrit" : "combat.log.weaponHit";
        pushLog(t(hitLogKey, { weapon: localizedModuleName(def), target: target.name, dmg: result.damageDealt }));
        if (pointDefense) pushLog(t("combat.log.pointDefense", { target: target.name }));
      } else {
        pushLog(t("combat.log.weaponMiss", { weapon: localizedModuleName(def), target: target.name }));
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
          pushLog(t("combat.log.honorRiposte", { target: target.name, dmg: counterDmg }));
        }
      }

      // EMP-style traits: a chance to disable the target's next attack, or strip
      // its block outright so follow-up hits land at full force.
      if (result.hit && mod.traits.includes("disable") && hitTarget.hull > 0 && Math.random() < 0.35) {
        hitTarget.stunned = true;
        pushLog(t("combat.log.stunned", { target: target.name }));
      }
      if (result.hit && def.type === "utility" && mod.traits.includes("shieldBreak") && hitTarget.hull > 0) {
        hitTarget.blockBrokenHits = 3;
        pushLog(t("combat.log.shieldStripped", { target: target.name }));
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
            fireProjectile(impactPos, arcPos, weaponColor, () => {
              if (arcResult.hit) {
                spawnBurst(arcPos.x, arcPos.y, hexToRgbString(weaponColor), 8, 90);
                addPopup(arcIdx, `-${arcResult.damageDealt}`, weaponColor);
              }
            }, weaponWeight);
          }, 90);
          if (arcResult.hit) {
            nextEnemies[arcIdx] = { ...arcTarget, hull: Math.max(0, arcTarget.hull - arcResult.damageDealt) };
            pushLog(t("combat.log.chainArcHit", { target: arcTarget.name, dmg: arcResult.damageDealt }));
          } else {
            pushLog(t("combat.log.chainArcMiss", { target: arcTarget.name }));
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
            fireProjectile(impactPos, splashPos, weaponColor, () => {
              if (splashResult.hit) {
                spawnBurst(splashPos.x, splashPos.y, hexToRgbString(weaponColor), 8, 90);
                addPopup(splashIdx, `-${splashResult.damageDealt}`, weaponColor);
              }
            }, weaponWeight);
          }, 90);
          if (splashResult.hit) {
            nextEnemies[splashIdx] = { ...splashTarget, hull: Math.max(0, splashTarget.hull - splashResult.damageDealt) };
            pushLog(t("combat.log.splashHit", { target: splashTarget.name, dmg: splashResult.damageDealt }));
          }
        });
      }

      // Twin-Linked Cannon's Volley: a second, fully independent hit-or-miss roll at
      // the same target — unlike Chain Arc/Splash (which only fire off a successful
      // first hit and spread to OTHER targets), this always fires and stays on the
      // same one, trading peak burst for a second real chance to land.
      if (mod.traits.includes("volley") && nextEnemies[targetIdx].hull > 0) {
        const volleyTarget = nextEnemies[targetIdx];
        const volleyResult = resolveAttack(dmg, effectiveBlock, targetEvasion, outgoingMult);
        setTimeout(() => {
          fireProjectile(playerPos, impactPos, weaponColor, () => {
            if (volleyResult.hit) {
              spawnBurst(impactPos.x, impactPos.y, hexToRgbString(weaponColor), 10, 90);
              addPopup(targetIdx, `-${volleyResult.damageDealt}`, weaponColor);
            }
          }, weaponWeight);
        }, 120);
        if (volleyResult.hit) {
          nextEnemies[targetIdx] = { ...volleyTarget, hull: Math.max(0, volleyTarget.hull - volleyResult.damageDealt) };
          pushLog(t("combat.log.volleyHit", { target: volleyTarget.name, dmg: volleyResult.damageDealt }));
        } else {
          pushLog(t("combat.log.volleyMiss", { target: volleyTarget.name }));
        }
      }
    } else {
      pushLog(t("combat.log.moduleActivated", { module: localizedModuleName(def) }));
      // Purge Field's Cleanse: the only removal effect in combat — instantly clears
      // Hollow's permanent Corrosion stack, restoring the ship's real armor value.
      if (mod.traits.includes("cleanse") && corrodedBlock > 0) {
        setCorrodedBlock(0);
        pushLog(t("combat.log.purgeField", { amount: corrodedBlock }));
      }
      // Displacement Charge's Displace: shoves the target to whichever horizontal
      // extreme is farthest from Whisper right now — the only module that moves an
      // enemy instead of the player, buying breathing room without you spending it.
      if (mod.traits.includes("displace") && target.hull > 0) {
        const awayX = arenaRef.current.player.x < REF_W / 2 ? REF_W - 40 : 60;
        enemyChaseXRef.current[targetIdx] = awayX;
        pushLog(t("combat.log.displace", { target: target.name }));
      }
    }
    const overchargePenalty = wasOvercharged ? 2 : 0;
    const alphaStrikePenalty = wasAlphaStrike ? 2 : 0;
    const cooldownReduction = jumpRangeStacks > 0 ? 1 : 0;
    setCooldowns((prev) => ({ ...prev, [moduleId]: Math.max(0, ((def.cooldown ?? 0) + overchargePenalty + alphaStrikePenalty - cooldownReduction) * TURN_SECONDS) }));
    if (overloadShotCount > 0) overloadCountersRef.current[mod.id] = overloadShotCount >= 3 ? 0 : overloadShotCount;
    if (wasOvercharged) setOvercharged(false);
    if (wasGuaranteedCrit) setGuaranteedCrit(false);
    if (wasAlphaStrike) setAlphaStrikeArmed(false);
    // Starving Wolf's Bloodscent: a fraction of damage dealt to the marked target
    // heals Whisper — a sustain axis nothing else in combat has.
    if (dmg > 0 && bloodscentSec > 0 && targetIdx === bloodscentTargetRef.current) {
      const dealt = nextEnemies[targetIdx].hull < target.hull ? target.hull - nextEnemies[targetIdx].hull : 0;
      const healed = Math.round(dealt * 0.25);
      if (healed > 0) {
        setPlayerHull((h) => Math.min(maxHull, h + healed));
        addPopup("player", `+${healed}`, "#5dffb0");
        pushLog(t("combat.log.bloodscentDraw", { amount: healed, target: target.name }));
      }
    }
    setEnemies(nextEnemies);
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
      pushLog(t("combat.log.fieldPatch", { amount: heal }));
      playSfx("dock");
    } else if (abilityId === "focusFire") {
      // Ratchet Koi: no damage now — the next weapon fired this fight is a guaranteed crit.
      setGuaranteedCrit(true);
      pushLog(t("combat.log.focusFireArm"));
      playSfx("click");
    } else if (abilityId === "riposte") {
      // Kaan Ferrous: arms a free counter-attack the next time an enemy misses.
      setRiposteArmed(true);
      pushLog(t("combat.log.riposteArm"));
      playSfx("click");
    } else if (abilityId === "undercut") {
      // Priya Osei: halves every living enemy's block for a short window.
      nextEnemies = enemies.map((e, i) => (livingIdx.includes(i) ? { ...e, blockDebuffSec: 2 * TURN_SECONDS } : e));
      pushLog(t("combat.log.undercutArm"));
      playSfx("click");
    } else if (abilityId === "reaversCut") {
      // Kessa Vray: every living enemy takes +25% damage for a short window.
      nextEnemies = enemies.map((e, i) => (livingIdx.includes(i) ? { ...e, vulnerableSec: TURN_SECONDS } : e));
      pushLog(t("combat.log.reaversCutArm"));
      playSfx("click");
    } else if (abilityId === "constructOverride") {
      // Unit 7-Requiem: negates incoming damage for a short window.
      setShieldSec(TURN_SECONDS);
      pushLog(t("combat.log.overrideArm"));
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
      pushLog(t("combat.log.evasiveBurn"));
      playSfx("jump");
    } else if (abilityId === "targetLock") {
      // Generic recruit tactician: halves the current target's evasion for a short window.
      const target = enemies[targetIdx];
      if (target && target.hull > 0) {
        nextEnemies = enemies.map((e, i) => (i === targetIdx ? { ...e, evasionDebuffSec: 2 * TURN_SECONDS } : e));
        pushLog(t("combat.log.targetLock", { target: target.name }));
      }
    }
    const cooldownValue = crewDefById(state.value.crew.find((c) => c.id === crewId)!.defId).activeCooldown;
    setCrewCooldowns((prev) => ({ ...prev, [crewId]: cooldownValue * TURN_SECONDS }));
    setEnemies(nextEnemies);
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
      pushLog(t("combat.log.alphaStrikeArm"));
    } else if (namedDef.abilityId === "phaseShift") {
      setPhaseShiftReady(true);
      pushLog(t("combat.log.phaseShiftArm"));
    } else if (namedDef.abilityId === "fortify") {
      setFortifySec(2 * TURN_SECONDS);
      pushLog(t("combat.log.fortifyArm"));
    } else if (namedDef.abilityId === "bloodscent") {
      const target = enemies[targetIdx];
      if (target && target.hull > 0) {
        setBloodscentSec(2 * TURN_SECONDS);
        bloodscentTargetRef.current = targetIdx;
        pushLog(t("combat.log.bloodscentMark", { target: target.name }));
      }
    } else if (namedDef.abilityId === "overdrive") {
      setCooldowns({});
      pushLog(t("combat.log.overdriveArm"));
    }
    setNamedAbilityCooldown(namedDef.activeCooldown * TURN_SECONDS);
    playSfx("click");
  }

  function useEmberNova() {
    try {
      useEmberNovaImpl();
    } catch (err) {
      reportError("Combat.useEmberNova", err);
      setStatus("active");
    }
  }

  /** Issues #5/#6: a genuinely guaranteed AoE ultimate — every living enemy takes
   * real damage scaled off Power Capacity (which itself now grows with level, see
   * computePowerCapacity), not gated behind a rarity pull the way Flak Battery's
   * Splash trait is. */
  function useEmberNovaImpl() {
    if (status !== "active" || emberNovaCharge < EMBER_NOVA_MAX) return;
    const novaDamage = Math.round(capacity * 1.5);
    const nextEnemies = enemies.map((enemy, i) => {
      if (enemy.hull <= 0) return enemy;
      const pos = arenaRef.current.enemyPos[i] ?? enemySlot(i, enemies.length);
      spawnBurst(pos.x, pos.y, "255,159,77", 26, 160);
      addPopup(i, `-${novaDamage}`, "#ff9f4d", true);
      explosionsRef.current.push({ x: pos.x, y: pos.y, start: performance.now() });
      return { ...enemy, hull: Math.max(0, enemy.hull - novaDamage) };
    });
    pushLog(t("combat.log.emberNovaFire", { dmg: novaDamage }));
    playSfx("explosion");
    shakeRef.current = 22;
    triggerHitStop(140);
    setEmberNovaCharge(0);
    setEnemies(nextEnemies);
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
    // Persistent per-enemy "chase" X position — separate from the fixed Y lane and
    // the decorative bob, so an enemy that closed distance last frame stays closed
    // this frame instead of snapping back to its spawn slot. Lives in a ref (not a
    // local array) so Displacement Charge can push it from outside this effect.
    const enemyChaseX = enemyChaseXRef.current;
    const preferredRange = FACTION_PREFERRED_RANGE[encounter.faction] ?? "mid";
    const preferredDistance = RANGE_TARGET_DISTANCE[preferredRange];

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
        const prevX = arena.player.x;
        const prevY = arena.player.y;
        arena.player.x = Math.max(24, Math.min(REF_W - 24, nextX));
        arena.player.y = Math.max(24, Math.min(REF_H - 24, nextY));
        distanceSinceLastShotRef.current += Math.hypot(arena.player.x - prevX, arena.player.y - prevY);
      } else {
        reportError("Combat.step (player position)", new Error(`non-finite position: vx=${player.vx} vy=${player.vy}`));
        player.vx = 0;
        player.vy = 0;
        pointerTarget = null;
      }
      if (Math.hypot(player.vx, player.vy) > 8) player.angle = Math.atan2(player.vy, player.vx);

      // Enemies actively close to (or hold) their faction's preferred range instead
      // of just bobbing in place — see FACTION_PREFERRED_RANGE. A dead enemy stops
      // repositioning (no point chasing after it's destroyed).
      const liveEnemies = enemiesRef.current;
      arena.enemyPos = liveEnemies.map((enemy, i) => {
        const slot = enemySlot(i, liveEnemies.length);
        if (enemyChaseX[i] === undefined) enemyChaseX[i] = slot.x;
        if (!combatOver && enemy.hull > 0) {
          const dist = Math.hypot(arena.player.x - enemyChaseX[i], arena.player.y - slot.y) || 1;
          const diff = dist - preferredDistance;
          if (Math.abs(diff) > 8) {
            const step = Math.sign(diff) * Math.min(Math.abs(diff), ENEMY_REPOSITION_SPEED * dt);
            const dirX = (arena.player.x - enemyChaseX[i]) / dist;
            enemyChaseX[i] = Math.max(60, Math.min(REF_W - 40, enemyChaseX[i] + dirX * step));
          }
        }
        const seed = i * 1.7;
        return {
          x: enemyChaseX[i] + Math.sin(now / 900 + seed) * 10,
          y: slot.y + Math.cos(now / 760 + seed * 1.3) * 14,
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
            {t("combat.combo", { count: comboCount })}
          </span>
        )}
        <span>
          {t("combat.range")}: <span style={{ color: displayRange === "close" ? "var(--red)" : displayRange === "mid" ? "var(--amber)" : "var(--cyan)" }}>{displayRange}</span>
          {" · "}{t("combat.power")} {capacity}
        </span>
      </div>

      {(guaranteedCrit || riposteArmed || shieldSec > 0 || alphaStrikeArmed || phaseShiftReady || fortifySec > 0 || bloodscentSec > 0) && (
        <div style={{ display: "flex", gap: "0.4rem", padding: "0 1rem 0.4rem", flexWrap: "wrap" }}>
          {/* Gacha-RPG grounding #1 (docs/design-principles.md): a distinct glyph per
              status so the badge row reads by shape/color before the text even
              registers, instead of requiring every badge to be read to tell them
              apart — the same "icon over text" bar the resource/module/crew icons
              already clear. */}
          {guaranteedCrit && <StatusBadge glyph="🎯" color="var(--amber)" text={t("combat.status.guaranteedCrit")} />}
          {riposteArmed && <StatusBadge glyph="↩" color="var(--cyan)" text={t("combat.status.riposteArmed")} />}
          {shieldSec > 0 && <StatusBadge glyph="🛡" color="var(--violet)" text={t("combat.status.overrideShield", { sec: shieldSec.toFixed(1) })} />}
          {alphaStrikeArmed && <StatusBadge glyph="⚡" color="var(--red)" text={t("combat.status.alphaStrike")} />}
          {phaseShiftReady && <StatusBadge glyph="◈" color="var(--cyan)" text={t("combat.status.phaseShift")} />}
          {fortifySec > 0 && <StatusBadge glyph="🔰" color="var(--violet)" text={t("combat.status.fortified", { sec: fortifySec.toFixed(1) })} />}
          {bloodscentSec > 0 && <StatusBadge glyph="🩸" color="var(--green)" text={t("combat.status.bloodscent", { sec: bloodscentSec.toFixed(1) })} />}
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
          title={t("combat.overchargeTitle")}
        >
          {overcharged ? t("combat.overcharged") : t("combat.overcharge")}
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
              {localizedModuleName(def)}{cd > 0 ? ` (${cd.toFixed(1)}s)` : ""}
            </button>
          );
        })}
        {assignedCrew.map((c) => {
          const def = crewDefById(c.defId);
          const cd = crewCooldowns[c.id] ?? 0;
          return (
            <button key={c.id} className="btn" disabled={status !== "active" || cd > 0} onClick={() => useCrewActive(c.id, def.abilityId)}>
              {localizedCrewActive(def).split(" — ")[0]}{cd > 0 ? ` (${cd.toFixed(1)}s)` : ""}
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
              title={localizedNamedShipActive(namedDef)}
            >
              {localizedNamedShipActive(namedDef).split(" — ")[0]}{namedAbilityCooldown > 0 ? ` (${namedAbilityCooldown.toFixed(1)}s)` : ""}
            </button>
          );
        })()}
        <button
          className={`btn ${emberNovaCharge >= EMBER_NOVA_MAX ? "danger" : "ghost"}`}
          disabled={status !== "active" || emberNovaCharge < EMBER_NOVA_MAX}
          onClick={useEmberNova}
          title={t("combat.emberNovaTitle")}
          style={emberNovaCharge >= EMBER_NOVA_MAX ? { boxShadow: "0 0 14px var(--red)", fontWeight: 800 } : undefined}
        >
          {emberNovaCharge >= EMBER_NOVA_MAX ? t("combat.emberNova") : t("combat.emberNovaCharging", { charge: emberNovaCharge, max: EMBER_NOVA_MAX })}
        </button>
      </div>

      <div className="panel" style={{ margin: "0.6rem 1rem", padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "var(--text-mid)", maxHeight: 84, overflowY: "auto" }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>

      {status === "victory" && (
        <div className="panel pop-in" style={{ margin: "0 1rem 1rem", padding: "1rem", textAlign: "center" }}>
          <div className="title" style={{ marginBottom: "0.5rem" }}>{t("combat.victory")}</div>
          {levelUp && (
            <div className="panel accent scanline pop-in" style={{ padding: "0.9rem 1rem", marginBottom: "0.75rem", ["--accent" as any]: "var(--amber)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 800, color: "var(--amber)", letterSpacing: "0.03em" }}>
                {t("combat.levelUp", { level: levelUp })}
              </div>
              <div className="eyebrow" style={{ marginTop: "0.15rem" }}>{t("combat.powerJump", { ship: ship.name })}</div>
              <div style={{ display: "flex", justifyContent: "center", gap: "1.25rem", marginTop: "0.55rem" }}>
                {levelUpHullGain > 0 && (
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-hi)" }}>
                    +{levelUpHullGain} <span style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontWeight: 500 }}>{t("combat.maxHull")}</span>
                  </div>
                )}
                {levelUpPowerGain > 0 && (
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--amber)" }}>
                    +{levelUpPowerGain} <span style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontWeight: 500 }}>{t("combat.power")}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          {rewardsEarned && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.75rem", fontSize: "0.8rem", color: "var(--text-mid)" }}>
              {Object.entries(rewardsEarned).map(([k, v]) => (
                <span key={k} className="resource-chip">
                  <ResourceIcon type={k as ResourceType} size={13} />+{v} {resourceLabel(k as ResourceType)}
                </span>
              ))}
            </div>
          )}
          {bonusDrop && (() => {
            const def = moduleDefById(bonusDrop.defId);
            return (
              <div className="panel accent pop-in scanline" style={{ padding: "0.8rem 1rem", marginBottom: "0.75rem", ["--accent" as any]: `var(--rarity-${bonusDrop.rarity})` }}>
                <div className="eyebrow" style={{ color: `var(--rarity-${bonusDrop.rarity})` }}>{t("combat.bonusDrop")}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginTop: "0.4rem" }}>
                  <span style={{ fontWeight: 700 }}>{localizedModuleName(def)}</span>
                  <ModuleRarityTag rarity={bonusDrop.rarity} />
                </div>
                <div style={{ fontSize: "0.76rem", color: "var(--text-mid)", marginTop: "0.3rem" }}>
                  {def.baseDamage !== undefined && t("combat.dmgLabel", { value: computeModuleDamage(bonusDrop) })}
                  {def.baseBlock !== undefined && t("combat.blockLabel", { value: computeModuleBlock(bonusDrop) })}
                </div>
              </div>
            );
          })()}
          <button className="btn primary" onClick={() => onResolve("victory")}>{t("common.continue")}</button>
        </div>
      )}
      {status === "defeat" && (
        <div className="panel pop-in" style={{ margin: "0 1rem 1rem", padding: "1rem", textAlign: "center" }}>
          <div className="title" style={{ marginBottom: "0.5rem", color: "var(--red)" }}>{t("combat.defeatTitle")}</div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-mid)", marginBottom: "0.5rem" }}>
            {t("combat.defeatBody")}
          </div>
          <button className="btn primary" onClick={() => onResolve("defeat")}>{t("common.continue")}</button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ glyph, color, text }: { glyph: string; color: string; text: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35em",
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
      <span aria-hidden="true" style={{ fontSize: "0.95em" }}>{glyph}</span>
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
  riftEchoes: "180,120,255",
};

function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]) {
  for (const p of projectiles) {
    drawWeaponBeam(ctx, p.fromX, p.fromY, p.toX, p.toY, p.t, p.color, p.weight);
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
  // Issue #10: Phase Flicker — a phased Rift Echo fades to a translucent, fast-jittering
  // silhouette so "you can't hit this right now" reads at a glance, not just from the log.
  if (enemy.phased) {
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(now / 60);
    ctx.translate((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
  }
  drawEnemyHull(ctx, faction, 1.5, now);
  ctx.restore();

  if (enemy.phased) {
    ctx.save();
    ctx.fillStyle = "#b478ff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "#b478ff";
    ctx.shadowBlur = 8;
    ctx.fillText("PHASED", pos.x, pos.y + 62);
    ctx.restore();
  }
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
