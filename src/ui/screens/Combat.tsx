import { useEffect, useState } from "preact/hooks";
import { encounterById } from "../../data/encounters";
import { moduleDefById } from "../../data/modules";
import { computeModuleDamage } from "../../engine/modules";
import { computeMaxHull, computePowerCapacity } from "../../engine/ships";
import { RANGE_MODIFIERS, resolveAttack, type RangeBand } from "../../engine/combat";
import { state, flagship, resolveCombatVictory, resolveCombatDefeat } from "../../state/store";
import { crewDefById } from "../../data/crew";
import { playSfx } from "../../audio/engine";
import type { CrewRole, ResourceType } from "../../data/types";
import { randomId } from "../../engine/rng";

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

const RESOURCE_LABEL: Record<ResourceType, string> = {
  salvage: "Salvage",
  sourcePoints: "Source Points",
  alloy: "Alloy",
  originEssence: "Origin Essence",
  insight: "Insight",
};

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
  const [range, setRange] = useState<RangeBand>("mid");
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [crewCooldowns, setCrewCooldowns] = useState<Record<string, number>>({});
  const [targetIdx, setTargetIdx] = useState(0);
  const [log, setLog] = useState<string[]>([`Contact: ${encounter.name}.`]);
  const [status, setStatus] = useState<"active" | "resolving" | "victory" | "defeat">("active");
  const [popups, setPopups] = useState<Popup[]>([]);
  const [playerShakeToken, setPlayerShakeToken] = useState(0);
  const [rewardsEarned, setRewardsEarned] = useState<Partial<Record<ResourceType, number>> | null>(null);

  const maxHull = computeMaxHull(ship);
  const capacity = computePowerCapacity(ship);

  useEffect(() => {
    if (enemies[targetIdx] && enemies[targetIdx].hull <= 0) {
      const nextLiving = enemies.findIndex((e) => e.hull > 0);
      if (nextLiving >= 0) setTargetIdx(nextLiving);
    }
  }, [enemies, targetIdx]);

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
    setTimeout(() => enemyTurn(nextEnemies), 500);
  }

  function enemyTurn(currentEnemies: EnemyState[]) {
    const regenerated = currentEnemies.map((e) => {
      if (e.hull <= 0 || !e.regen) return e;
      const healed = Math.min(e.maxHull, e.hull + e.regen);
      if (healed > e.hull) {
        pushLog(`${e.name} regenerates ${healed - e.hull} hull.`);
      }
      return { ...e, hull: healed };
    });
    regenerated.forEach((e, i) => {
      if (e.regen && e.hull > currentEnemies[i].hull) addPopup(i, `+${e.hull - currentEnemies[i].hull}`, "#5dffb0");
    });

    let totalDamage = 0;
    const incomingMult = RANGE_MODIFIERS[range].incoming;
    const evasion = Math.min(0.6, 0.05 + evasionTraitCount * 0.05);
    for (const enemy of regenerated) {
      if (enemy.hull <= 0) continue;
      const result = resolveAttack(enemy.damage, armorBlock, evasion, incomingMult);
      if (result.hit) {
        totalDamage += result.damageDealt;
        pushLog(`${enemy.name} hits Whisper for ${result.damageDealt}.`);
        playSfx("hit");
      } else {
        pushLog(`${enemy.name} misses.`);
      }
    }
    if (totalDamage > 0) {
      addPopup("player", `-${totalDamage}`, "#ff5c5c");
      setPlayerShakeToken((t) => t + 1);
    }
    setEnemies(regenerated);
    setCooldowns((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, Math.max(0, v - 1)])));
    setCrewCooldowns((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, Math.max(0, v - 1)])));

    setPlayerHull((prev) => {
      const nextHull = Math.max(0, prev - totalDamage);
      if (nextHull <= 0) {
        finishCombat("defeat", regenerated);
      } else {
        setStatus("active");
      }
      return nextHull;
    });
  }

  function finishCombat(result: "victory" | "defeat", finalEnemies: EnemyState[]) {
    setStatus(result);
    setEnemies(finalEnemies);
    if (result === "victory") {
      playSfx("victory");
      setRewardsEarned(encounter.rewards);
      resolveCombatVictory(encounterId, poiId, victoryFlag);
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

    const outgoingMult = RANGE_MODIFIERS[range].outgoing;
    const dmg = computeModuleDamage(mod);
    const nextEnemies = [...enemies];
    if (dmg > 0) {
      const targetEvasion = target.debuffed ? target.evasion * 0.5 : target.evasion;
      const result = resolveAttack(dmg, target.block, targetEvasion, outgoingMult);
      if (result.hit) {
        nextEnemies[targetIdx] = { ...target, hull: Math.max(0, target.hull - result.damageDealt) };
        pushLog(`${def.name} hits ${target.name} for ${result.damageDealt}.`);
        addPopup(targetIdx, `-${result.damageDealt}`, "#ffe25d");
        playSfx("laser");
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
        addPopup(targetIdx, "-20", "#ff9f4d");
        playSfx("laser");
      }
    } else if (role === "helm") {
      setRange((r) => (r === "close" ? "mid" : "close"));
      pushLog("Evasive Burn shifts range instantly.");
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

  function doRangeShift(dir: "in" | "out") {
    if (status !== "active") return;
    const order: RangeBand[] = ["close", "mid", "long"];
    const idx = order.indexOf(range);
    const nextIdx = dir === "in" ? Math.max(0, idx - 1) : Math.min(order.length - 1, idx + 1);
    setRange(order[nextIdx]);
    pushLog(`Shifted to ${order[nextIdx]} range.`);
    playSfx("click");
    endPlayerAction(enemies);
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "1rem", gap: "0.75rem", overflowY: "auto" }}>
      <div className="title">{encounter.name}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {enemies.map((e, i) => (
          <div
            key={i}
            className="panel"
            style={{ padding: "0.6rem 0.9rem", position: "relative", overflow: "hidden", cursor: e.hull > 0 ? "pointer" : "default", opacity: e.hull > 0 ? 1 : 0.35, border: i === targetIdx ? "1px solid var(--cyan)" : undefined }}
            onClick={() => e.hull > 0 && setTargetIdx(i)}
          >
            {popups.filter((p) => p.target === i).map((p) => (
              <div key={p.id} className="combat-popup" style={{ color: p.color }}>{p.text}</div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
              <span>{e.name}{e.debuffed ? " (debuffed)" : ""}{e.regen ? " ⟳" : ""}</span>
              <span>{e.hull}/{e.maxHull}</span>
            </div>
            <div style={{ height: 6, background: "var(--bg-inset)", borderRadius: 3, overflow: "hidden", marginTop: "0.3rem" }}>
              <div style={{ height: "100%", width: `${(e.hull / e.maxHull) * 100}%`, background: "var(--red)", transition: "width 200ms ease" }} />
            </div>
          </div>
        ))}
      </div>

      <div key={playerShakeToken} className={`panel ${playerShakeToken > 0 ? "shake" : ""}`} style={{ padding: "0.6rem 0.9rem", position: "relative", overflow: "hidden" }}>
        {popups.filter((p) => p.target === "player").map((p) => (
          <div key={p.id} className="combat-popup" style={{ color: p.color }}>{p.text}</div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
          <span>{ship.name}</span>
          <span>{playerHull}/{maxHull}</span>
        </div>
        <div style={{ height: 6, background: "var(--bg-inset)", borderRadius: 3, overflow: "hidden", marginTop: "0.3rem" }}>
          <div style={{ height: "100%", width: `${(playerHull / maxHull) * 100}%`, background: "var(--cyan)", transition: "width 200ms ease" }} />
        </div>
        <div style={{ marginTop: "0.4rem", fontSize: "0.75rem", color: "var(--text-dim)" }}>
          Range: {(["close", "mid", "long"] as RangeBand[]).map((r) => (
            <span key={r} style={{ marginRight: "0.5rem", color: r === range ? "var(--cyan)" : "var(--text-dim)" }}>{r}</span>
          ))}
          &middot; Power {capacity}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
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
        <button className="btn" disabled={status !== "active" || range === "close"} onClick={() => doRangeShift("in")}>Close Range</button>
        <button className="btn" disabled={status !== "active" || range === "long"} onClick={() => doRangeShift("out")}>Extend Range</button>
      </div>

      <div className="panel" style={{ padding: "0.6rem 0.9rem", fontSize: "0.78rem", color: "var(--text-mid)", minHeight: 90 }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>

      {status === "victory" && (
        <div className="panel pop-in" style={{ padding: "1rem", textAlign: "center" }}>
          <div className="title" style={{ marginBottom: "0.5rem" }}>Victory</div>
          {rewardsEarned && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.75rem", fontSize: "0.8rem", color: "var(--text-mid)" }}>
              {Object.entries(rewardsEarned).map(([k, v]) => (
                <span key={k} className="resource-chip">+{v} {RESOURCE_LABEL[k as ResourceType]}</span>
              ))}
            </div>
          )}
          <button className="btn primary" onClick={() => onResolve("victory")}>Continue</button>
        </div>
      )}
      {status === "defeat" && (
        <div className="panel pop-in" style={{ padding: "1rem", textAlign: "center" }}>
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
