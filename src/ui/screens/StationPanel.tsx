import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { state, flagship, spend, grant, canAfford, addShip, addModule, recruitGenericCrew, hasCrewRecruited, effectiveMaxHull, ownedNamedShipIds, repairFlagship } from "../../state/store";
import { HULL_CLASSES, hullClassById, shipwrightCost } from "../../data/hullClasses";
import { CREW_DEFS } from "../../data/crew";
import { moduleDefById, fabricatorCost } from "../../data/modules";
import { namedShipDefById } from "../../data/namedShips";
import { computeModuleDamage, computeModuleBlock } from "../../engine/modules";
import { drawShip } from "../../engine/ships";
import { computeMaxHull, computePowerCapacity, computeSpeed } from "../../engine/ships";
import { drawModule } from "../../engine/modules";
import { ShipRarityTag, ModuleRarityTag } from "../components/RarityTag";
import { ResourceIcon, TradeIcon, NavIcon, CrewRoleIcon, CREW_ROLE_COLOR, ModuleTypeIcon, HullIcon, PowerIcon, SpeedIcon } from "../components/Icons";
import { RollQualityBadge } from "../components/StatBlock";
import type { ShipInstance, ModuleInstance } from "../../data/types";
import { pickOne } from "../../engine/rng";

type Tab = "trade" | "shipwright" | "fabricator" | "recruit";

const TAB_META: { id: Tab; label: string; icon: preact.ComponentChildren }[] = [
  { id: "trade", label: "Trade", icon: <TradeIcon size={16} /> },
  { id: "shipwright", label: "Shipwright", icon: <NavIcon name="fleet" size={16} /> },
  { id: "fabricator", label: "Fabricator", icon: <NavIcon name="modules" size={16} /> },
  { id: "recruit", label: "Recruit", icon: <NavIcon name="crew" size={16} /> },
];

export function StationPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("trade");
  const [drawnShip, setDrawnShip] = useState<ShipInstance | null>(null);
  const [drawnModule, setDrawnModule] = useState<ModuleInstance | null>(null);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(3,5,9,0.85)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 40,
        padding: "1rem",
      }}
    >
      <div className="panel pop-in" style={{ width: "min(560px, 100%)", maxWidth: "100%", boxSizing: "border-box", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1rem 0" }}>
          <div className="title">Station</div>
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
        <div style={{ display: "flex", gap: "0.3rem", padding: "0.75rem 1rem" }}>
          {TAB_META.map(({ id, label, icon }) => (
            <button
              key={id}
              className={`btn ${tab === id ? "primary" : "ghost"}`}
              onClick={() => setTab(id)}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                overflow: "hidden",
                padding: "0.55em 0.2em",
                fontSize: "0.66rem",
                flexDirection: "column",
                gap: "0.3em",
              }}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
        <div style={{ padding: "0 1rem 1rem", overflowY: "auto" }}>
          {tab === "trade" && <TradeTab />}
          {tab === "shipwright" && <ShipwrightTab onBuy={setDrawnShip} />}
          {tab === "fabricator" && <FabricatorTab onBuy={setDrawnModule} />}
          {tab === "recruit" && <RecruitTab />}
        </div>
      </div>

      {drawnShip && (() => {
        const cur = flagship.value;
        const newHull = effectiveMaxHull(drawnShip);
        const curHull = cur ? effectiveMaxHull(cur) : 0;
        const delta = newHull - curHull;
        return (
          <DrawReveal title={drawnShip.namedShipId ? "Named Ship Acquired!" : "Hull Acquired"} accent={drawnShip.namedShipId ? "var(--amber)" : `var(--rarity-${drawnShip.rarity})`} onClose={() => setDrawnShip(null)}>
            <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{drawnShip.name}</div>
            <div style={{ color: "var(--text-mid)", margin: "0.4rem 0" }}>{hullClassById(drawnShip.hullClass).name}</div>
            {drawnShip.namedShipId && (
              <div style={{ fontSize: "0.78rem", color: "var(--amber)", marginBottom: "0.5rem" }}>
                {namedShipDefById(drawnShip.namedShipId).active}
              </div>
            )}
            <ShipRarityTag rarity={drawnShip.rarity} showPips={false} />
            <div style={{ marginTop: "0.5rem" }}>
              <RollQualityBadge
                roll={(drawnShip.rolls.hull + drawnShip.rolls.power + drawnShip.rolls.speed + drawnShip.rolls.evasion + drawnShip.rolls.crit) / 5}
                label="Overall roll"
              />
            </div>
            {cur && (
              <div style={{ marginTop: "0.75rem", fontFamily: "var(--font-display)", fontWeight: 700, color: delta >= 0 ? "var(--green)" : "var(--red)" }}>
                {delta >= 0 ? "+" : ""}{delta} Hull vs {cur.name}
              </div>
            )}
          </DrawReveal>
        );
      })()}
      {drawnModule && (() => {
        const def = moduleDefById(drawnModule.defId);
        const cur = flagship.value;
        const equippedSameType = cur
          ? cur.equipped
              .map((id) => state.value.modules.find((m) => m.id === id))
              .find((m): m is NonNullable<typeof m> => !!m && moduleDefById(m.defId).type === def.type)
          : null;
        const statLabel = def.baseDamage !== undefined ? "Damage" : def.baseBlock !== undefined ? "Block" : null;
        const newStat = def.baseDamage !== undefined ? computeModuleDamage(drawnModule) : def.baseBlock !== undefined ? computeModuleBlock(drawnModule) : null;
        const curStat = equippedSameType
          ? def.baseDamage !== undefined
            ? computeModuleDamage(equippedSameType)
            : def.baseBlock !== undefined
              ? computeModuleBlock(equippedSameType)
              : null
          : null;
        return (
          <DrawReveal title="Module Acquired" accent="var(--cyan)" onClose={() => setDrawnModule(null)}>
            <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{def.name}</div>
            <div style={{ color: "var(--text-mid)", margin: "0.4rem 0", textTransform: "capitalize" }}>{def.type}</div>
            <ModuleRarityTag rarity={drawnModule.rarity} />
            <div style={{ marginTop: "0.5rem" }}>
              <RollQualityBadge roll={drawnModule.quality} />
            </div>
            {drawnModule.traits.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", justifyContent: "center", marginTop: "0.6rem" }}>
                {drawnModule.traits.map((t, i) => (
                  <span key={i} style={{ fontSize: "0.68rem", padding: "0.15em 0.5em", borderRadius: 999, border: "1px solid var(--violet)", color: "var(--violet)" }}>
                    {def.traitPool.find((tp) => tp.id === t)?.label ?? t}
                  </span>
                ))}
              </div>
            )}
            {statLabel && newStat !== null && (
              <div style={{ marginTop: "0.75rem", fontFamily: "var(--font-display)", fontWeight: 700, color: curStat === null || newStat >= curStat ? "var(--green)" : "var(--red)" }}>
                {curStat === null
                  ? `${newStat} ${statLabel} — nothing equipped in this slot yet`
                  : `${newStat >= curStat ? "+" : ""}${newStat - curStat} ${statLabel} vs equipped`}
              </div>
            )}
          </DrawReveal>
        );
      })()}
    </div>
  );
}

function DrawReveal({ title, children, accent, onClose }: { title: string; children: ComponentChildren; accent: string; onClose: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(3,5,9,0.7)" }}
      onClick={onClose}
    >
      <div className="panel accent scanline pop-in" style={{ padding: "2rem", textAlign: "center", minWidth: 260, ["--accent" as any]: accent }} onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow" style={{ marginBottom: "0.75rem" }}>{title}</div>
        {children}
        <div style={{ marginTop: "1.25rem" }}>
          <button className="btn primary" onClick={onClose}>Nice.</button>
        </div>
      </div>
    </div>
  );
}

function Row({ children }: { children: ComponentChildren }) {
  return (
    <div className="panel compact" style={{ padding: "0.7rem 0.9rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem" }}>
      {children}
    </div>
  );
}

function TradeTab() {
  const res = state.value.resources;
  const ship = flagship.value;
  // Priya Osei: "+10% Salvage and Alloy from Trade exchanges" — fleet-wide once recruited.
  const tradeBonus = hasCrewRecruited("priyaOsei") ? 1.1 : 1;
  const alloyOut = Math.round(10 * tradeBonus);
  const salvageOut = Math.round(20 * tradeBonus);
  const missingHp = ship ? effectiveMaxHull(ship) - ship.currentHp : 0;
  const repairCost = Math.round(missingHp * 0.5);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {ship && (
        <Row>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem" }}>
            <HullIcon size={16} />
            {missingHp > 0 ? (
              <>Repair {missingHp} Hull <TradeIcon size={14} color="var(--text-dim)" /> <ResourceIcon type="salvage" size={16} /> {repairCost}</>
            ) : (
              "Hull at full"
            )}
          </div>
          <button
            className="btn"
            disabled={missingHp <= 0 || res.salvage < repairCost}
            onClick={() => { spend({ salvage: repairCost }); repairFlagship(); }}
          >
            Repair
          </button>
        </Row>
      )}
      <div style={{ color: "var(--text-mid)", fontSize: "0.85rem" }}>
        Fence salvage for refined alloy, or break down alloy stock back into quick salvage.
      </div>
      <Row>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem" }}>
          <ResourceIcon type="salvage" size={16} /> 30 <TradeIcon size={14} color="var(--text-dim)" /> <ResourceIcon type="alloy" size={16} /> {alloyOut}
        </div>
        <button className="btn" disabled={res.salvage < 30} onClick={() => { spend({ salvage: 30 }); grant({ alloy: alloyOut }); }}>
          Exchange
        </button>
      </Row>
      <Row>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem" }}>
          <ResourceIcon type="alloy" size={16} /> 10 <TradeIcon size={14} color="var(--text-dim)" /> <ResourceIcon type="salvage" size={16} /> {salvageOut}
        </div>
        <button className="btn" disabled={res.alloy < 10} onClick={() => { spend({ alloy: 10 }); grant({ salvage: salvageOut }); }}>
          Exchange
        </button>
      </Row>
    </div>
  );
}

const OFFER_COUNT = 4;

function generateShipOffers(): ShipInstance[] {
  const unlocked = HULL_CLASSES.filter((h) => h.unlockFlag === null || state.value.flags[h.unlockFlag]);
  // Exclude within this batch too, not just already-owned ones — otherwise two
  // offers in the same showcase could independently roll the same "singleton" named
  // ship, and buying both would break the singleton guarantee.
  const excluded = new Set(ownedNamedShipIds());
  return Array.from({ length: OFFER_COUNT }, () => {
    const candidate = drawShip(pickOne(unlocked).id, excluded);
    if (candidate.namedShipId) excluded.add(candidate.namedShipId);
    return candidate;
  });
}

/** Curated random showcase, not a blind pull: every candidate's rarity, stats, and
 * cost are visible before spending anything, and the player picks the one they want
 * (Player-Tested Anti-Patterns #4/#3 in docs/design-principles.md — a shown-then-
 * chosen offer preserves agency and makes rarity unmistakable, instead of finding out
 * what you got only after paying for it). */
/** Issue #9 (2026-08 playtest, docs/design-principles.md Player-Tested
 * Anti-Patterns #4): a free, unlimited Refresh let a player just reroll until they
 * got something great, which quietly turned the curated showcase back into the
 * blind-pull problem it was built to fix — the showcase itself needs its own
 * economy, or "choose from a shown list" has no more real tension than "keep
 * spinning until you like the result." Cost escalates per refresh within one visit
 * (resets when the tab remounts) so a first look is still cheap but fishing for a
 * perfect roll isn't free. */
function refreshCost(count: number): number {
  return 10 + count * 15;
}

function ShipwrightTab({ onBuy }: { onBuy: (s: ShipInstance) => void }) {
  const [offers, setOffers] = useState<ShipInstance[]>(() => generateShipOffers());
  const [refreshCount, setRefreshCount] = useState(0);
  const cost = refreshCost(refreshCount);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "var(--text-mid)", fontSize: "0.85rem" }}>
          Today's hulls. Rarity and stats are visible now — pick the one you want.
        </div>
        <button
          className="btn ghost"
          style={{ fontSize: "0.7rem", padding: "0.4em 0.7em", flex: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}
          disabled={!canAfford({ sourcePoints: cost })}
          onClick={() => {
            spend({ sourcePoints: cost });
            setOffers(generateShipOffers());
            setRefreshCount((c) => c + 1);
          }}
        >
          Refresh <ResourceIcon type="sourcePoints" size={11} /> {cost}
        </button>
      </div>
      {offers.map((candidate, i) => {
        const def = hullClassById(candidate.hullClass);
        const cost = shipwrightCost(candidate.hullClass, candidate.rarity);
        const namedDef = candidate.namedShipId ? namedShipDefById(candidate.namedShipId) : null;
        return (
          <div key={i} className={`panel compact ${namedDef ? "accent" : ""}`} style={{ padding: "0.75rem 0.9rem", ["--accent" as any]: namedDef ? "var(--amber)" : undefined }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{namedDef ? namedDef.name : def.name}</div>
                <div style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>{def.name} ({def.nameCn})</div>
              </div>
              <ShipRarityTag rarity={candidate.rarity} showPips={false} />
            </div>
            {namedDef && (
              <div style={{ fontSize: "0.72rem", color: "var(--amber)", marginBottom: "0.5rem" }}>
                ★ Named Ship — {namedDef.active}
              </div>
            )}
            <div style={{ display: "flex", gap: "0.9rem", fontSize: "0.76rem", color: "var(--text-mid)", marginBottom: "0.6rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><HullIcon size={12} /> {computeMaxHull(candidate)}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><PowerIcon size={12} /> {computePowerCapacity(candidate)}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><SpeedIcon size={12} /> {computeSpeed(candidate)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-mid)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><ResourceIcon type="sourcePoints" size={13} /> {cost}</span>
                {def.essenceCost > 0 && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: canAfford({ originEssence: def.essenceCost }) ? "var(--text-mid)" : "var(--red)" }}>
                    <ResourceIcon type="originEssence" size={13} /> {def.essenceCost}
                  </span>
                )}
              </span>
              <button
                className="btn primary"
                disabled={!canAfford({ sourcePoints: cost, originEssence: def.essenceCost })}
                onClick={() => {
                  spend({ sourcePoints: cost, originEssence: def.essenceCost });
                  addShip(candidate);
                  onBuy(candidate);
                  setOffers((prev) => prev.map((o, idx) => (idx === i ? drawShip(pickOne(HULL_CLASSES.filter((h) => h.unlockFlag === null || state.value.flags[h.unlockFlag])).id, ownedNamedShipIds()) : o)));
                }}
              >
                Buy
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function generateModuleOffers(): ModuleInstance[] {
  return Array.from({ length: OFFER_COUNT }, () => drawModule());
}

/** Same curated-showcase pattern as ShipwrightTab — see the comment there. */
function FabricatorTab({ onBuy }: { onBuy: (m: ModuleInstance) => void }) {
  const [offers, setOffers] = useState<ModuleInstance[]>(() => generateModuleOffers());
  const [refreshCount, setRefreshCount] = useState(0);
  const cost = refreshCost(refreshCount);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "var(--text-mid)", fontSize: "0.85rem" }}>
          Today's modules. Type, rarity, and traits are visible now — pick the one you want.
        </div>
        <button
          className="btn ghost"
          style={{ fontSize: "0.7rem", padding: "0.4em 0.7em", flex: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}
          disabled={!canAfford({ sourcePoints: cost })}
          onClick={() => {
            spend({ sourcePoints: cost });
            setOffers(generateModuleOffers());
            setRefreshCount((c) => c + 1);
          }}
        >
          Refresh <ResourceIcon type="sourcePoints" size={11} /> {cost}
        </button>
      </div>
      {offers.map((candidate, i) => {
        const def = moduleDefById(candidate.defId);
        const cost = fabricatorCost(candidate.rarity);
        return (
          <div key={i} className="panel compact" style={{ padding: "0.75rem 0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ModuleTypeIcon type={def.type} size={16} />
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{def.name}</div>
                  <div style={{ color: "var(--text-dim)", fontSize: "0.72rem", textTransform: "capitalize" }}>{def.type}</div>
                </div>
              </div>
              <ModuleRarityTag rarity={candidate.rarity} />
            </div>
            <div style={{ display: "flex", gap: "0.7rem", fontSize: "0.76rem", color: "var(--text-mid)", marginBottom: "0.5rem", flexWrap: "wrap" }}>
              {def.baseDamage !== undefined && <span style={{ color: "var(--red)" }}>Dmg {computeModuleDamage(candidate)}</span>}
              {def.baseBlock !== undefined && <span style={{ color: "var(--cyan)" }}>Block {computeModuleBlock(candidate)}</span>}
              {candidate.traits.map((t, ti) => (
                <span key={ti} style={{ fontSize: "0.68rem", padding: "0.1em 0.5em", borderRadius: 999, border: "1px solid var(--violet)", color: "var(--violet)" }}>
                  {def.traitPool.find((tp) => tp.id === t)?.label ?? t}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "var(--text-mid)" }}>
                <ResourceIcon type="sourcePoints" size={13} /> {cost}
              </span>
              <button
                className="btn primary"
                disabled={!canAfford({ sourcePoints: cost })}
                onClick={() => {
                  spend({ sourcePoints: cost });
                  addModule(candidate);
                  onBuy(candidate);
                  setOffers((prev) => prev.map((o, idx) => (idx === i ? drawModule() : o)));
                }}
              >
                Buy
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecruitTab() {
  const genericDefs = CREW_DEFS.filter((c) => !c.named);
  // Issue #2 (2026-08 playtest): Alloy had no spend sink at all besides trading it
  // back to Salvage at a loss — a resource with no real purpose is exactly the
  // legibility problem reported. Crew outfitting is a natural fit and gives every
  // resource a distinct, memorable job: Source Points for hulls/modules, Alloy for
  // crew, Origin Essence gates hull tiers, Insight rerolls traits, Salvage repairs
  // and is the base trade currency.
  const cost = 20;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
      <div style={{ color: "var(--text-mid)", fontSize: "0.85rem" }}>
        Named crew join through the story. Generic reinforcements can be recruited here.
      </div>
      {genericDefs.map((c) => (
        <Row key={c.id}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `${CREW_ROLE_COLOR[c.role]}18`, border: `1px solid ${CREW_ROLE_COLOR[c.role]}`, flex: "none" }}>
              <CrewRoleIcon role={c.role} size={15} />
            </div>
            <div>
              <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                {c.name} <span style={{ textTransform: "capitalize", color: "var(--text-dim)", fontWeight: 400 }}>· {c.role}</span>
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>{c.passive}</div>
            </div>
          </div>
          <button
            className="btn primary"
            disabled={!canAfford({ alloy: cost })}
            onClick={() => {
              spend({ alloy: cost });
              recruitGenericCrew(c.id);
            }}
          >
            Recruit <ResourceIcon type="alloy" size={12} /> {cost}
          </button>
        </Row>
      ))}
    </div>
  );
}
