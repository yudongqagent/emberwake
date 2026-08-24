import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { state, flagship, spend, grant, canAfford, addModule, recruitGenericCrew, hasCrewRecruited, effectiveMaxHull, repairFlagship } from "../../state/store";
import { CREW_DEFS } from "../../data/crew";
import { moduleDefById, fabricatorCost } from "../../data/modules";
import { computeModuleDamage, computeModuleBlock, drawModule } from "../../engine/modules";
import { ModuleRarityTag } from "../components/RarityTag";
import { ResourceIcon, TradeIcon, NavIcon, CrewRoleIcon, CREW_ROLE_COLOR, ModuleTypeIcon, HullIcon } from "../components/Icons";
import { RollQualityBadge } from "../components/StatBlock";
import type { ModuleInstance } from "../../data/types";
import { t } from "../../i18n/strings";
import { localizedModuleName, localizedTrait, localizedCrewName, localizedCrewPassive } from "../../i18n/data";
type Tab = "trade" | "fabricator" | "recruit";

const TAB_META: { id: Tab; labelKey: string; icon: preact.ComponentChildren }[] = [
  { id: "trade", labelKey: "station.tab.trade", icon: <TradeIcon size={16} /> },
  { id: "fabricator", labelKey: "station.tab.fabricator", icon: <NavIcon name="modules" size={16} /> },
  { id: "recruit", labelKey: "station.tab.recruit", icon: <NavIcon name="crew" size={16} /> },
];

export function StationPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("trade");
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
          <div className="title">{t("station.title")}</div>
          <button className="btn ghost" onClick={onClose}>{t("common.close")}</button>
        </div>
        <div style={{ display: "flex", gap: "0.3rem", padding: "0.75rem 1rem" }}>
          {TAB_META.map(({ id, labelKey, icon }) => (
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
              {t(labelKey)}
            </button>
          ))}
        </div>
        <div style={{ padding: "0 1rem 1rem", overflowY: "auto" }}>
          {tab === "trade" && <TradeTab />}
          {tab === "fabricator" && <FabricatorTab onBuy={setDrawnModule} />}
          {tab === "recruit" && <RecruitTab />}
        </div>
      </div>
      {drawnModule && (() => {
        const def = moduleDefById(drawnModule.defId);
        const cur = flagship.value;
        const equippedSameType = cur
          ? cur.equipped
              .map((id) => state.value.modules.find((m) => m.id === id))
              .find((m): m is NonNullable<typeof m> => !!m && moduleDefById(m.defId).type === def.type)
          : null;
        const statLabel = def.baseDamage !== undefined ? t("station.stat.damage") : def.baseBlock !== undefined ? t("station.stat.block") : null;
        const newStat = def.baseDamage !== undefined ? computeModuleDamage(drawnModule) : def.baseBlock !== undefined ? computeModuleBlock(drawnModule) : null;
        const curStat = equippedSameType
          ? def.baseDamage !== undefined
            ? computeModuleDamage(equippedSameType)
            : def.baseBlock !== undefined
              ? computeModuleBlock(equippedSameType)
              : null
          : null;
        return (
          <DrawReveal title={t("station.moduleAcquired")} accent="var(--cyan)" onClose={() => setDrawnModule(null)}>
            <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{localizedModuleName(def)}</div>
            <div style={{ color: "var(--text-mid)", margin: "0.4rem 0", textTransform: "capitalize" }}>{t(`moduleType.${def.type}`)}</div>
            <ModuleRarityTag rarity={drawnModule.rarity} />
            <div style={{ marginTop: "0.5rem" }}>
              <RollQualityBadge roll={drawnModule.quality} />
            </div>
            {drawnModule.traits.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", justifyContent: "center", marginTop: "0.6rem" }}>
                {drawnModule.traits.map((traitId, i) => (
                  <span key={i} style={{ fontSize: "0.68rem", padding: "0.15em 0.5em", borderRadius: 999, border: "1px solid var(--violet)", color: "var(--violet)" }}>
                    {localizedTrait(def, traitId).label}
                  </span>
                ))}
              </div>
            )}
            {statLabel && newStat !== null && (
              <div style={{ marginTop: "0.75rem", fontFamily: "var(--font-display)", fontWeight: 700, color: curStat === null || newStat >= curStat ? "var(--green)" : "var(--red)" }}>
                {curStat === null
                  ? t("station.newStatNoSlot", { value: newStat, stat: statLabel })
                  : t("station.statVsEquipped", { sign: newStat >= curStat ? "+" : "", value: newStat - curStat, stat: statLabel })}
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
          <button className="btn primary" onClick={onClose}>{t("station.nice")}</button>
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
              <>{t("station.repairHull", { amount: missingHp })} <TradeIcon size={14} color="var(--text-dim)" /> <ResourceIcon type="salvage" size={16} /> {repairCost}</>
            ) : (
              t("station.hullFull")
            )}
          </div>
          <button
            className="btn"
            disabled={missingHp <= 0 || res.salvage < repairCost}
            onClick={() => { spend({ salvage: repairCost }); repairFlagship(); }}
          >
            {t("common.repair")}
          </button>
        </Row>
      )}
      <div style={{ color: "var(--text-mid)", fontSize: "0.85rem" }}>
        {t("station.tradeHint")}
      </div>
      <Row>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem" }}>
          <ResourceIcon type="salvage" size={16} /> 30 <TradeIcon size={14} color="var(--text-dim)" /> <ResourceIcon type="alloy" size={16} /> {alloyOut}
        </div>
        <button className="btn" disabled={res.salvage < 30} onClick={() => { spend({ salvage: 30 }); grant({ alloy: alloyOut }); }}>
          {t("station.exchange")}
        </button>
      </Row>
      <Row>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem" }}>
          <ResourceIcon type="alloy" size={16} /> 10 <TradeIcon size={14} color="var(--text-dim)" /> <ResourceIcon type="salvage" size={16} /> {salvageOut}
        </div>
        <button className="btn" disabled={res.alloy < 10} onClick={() => { spend({ alloy: 10 }); grant({ salvage: salvageOut }); }}>
          {t("station.exchange")}
        </button>
      </Row>
    </div>
  );
}

const OFFER_COUNT = 4;

/** Issue #9 (2026-08 playtest, docs/design-principles.md Player-Tested
 * Anti-Patterns #4): a free, unlimited Refresh let a player just reroll until they
 * got something great — this still applies to the Fabricator's module showcase
 * below. It no longer applies to ships at all: the station doesn't touch ship
 * advancement any more (player report 2026-08-24 — "跟商店没关系"), which now
 * lives in its own screen, ui/screens/Ascension.tsx, with no RNG to reroll.
 * Cost escalates per refresh within one visit (resets when the tab remounts) so a
 * first look is still cheap but fishing for a perfect roll isn't free. */
function refreshCost(count: number): number {
  return 10 + count * 15;
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
          {t("station.fabricatorHint")}
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
          {t("common.refresh")} <ResourceIcon type="sourcePoints" size={11} /> {cost}
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
                  <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{localizedModuleName(def)}</div>
                  <div style={{ color: "var(--text-dim)", fontSize: "0.72rem", textTransform: "capitalize" }}>{t(`moduleType.${def.type}`)}</div>
                </div>
              </div>
              <ModuleRarityTag rarity={candidate.rarity} />
            </div>
            <div style={{ display: "flex", gap: "0.7rem", fontSize: "0.76rem", color: "var(--text-mid)", marginBottom: "0.5rem", flexWrap: "wrap" }}>
              {def.baseDamage !== undefined && <span style={{ color: "var(--red)" }}>{t("modules.dmg", { value: computeModuleDamage(candidate) })}</span>}
              {def.baseBlock !== undefined && <span style={{ color: "var(--cyan)" }}>{t("modules.block", { value: computeModuleBlock(candidate) })}</span>}
              {candidate.traits.map((traitId, ti) => (
                <span key={ti} style={{ fontSize: "0.68rem", padding: "0.1em 0.5em", borderRadius: 999, border: "1px solid var(--violet)", color: "var(--violet)" }}>
                  {localizedTrait(def, traitId).label}
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
                {t("station.buy")}
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
        {t("station.recruitHint")}
      </div>
      {genericDefs.map((c) => (
        <Row key={c.id}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `${CREW_ROLE_COLOR[c.role]}18`, border: `1px solid ${CREW_ROLE_COLOR[c.role]}`, flex: "none" }}>
              <CrewRoleIcon role={c.role} size={15} />
            </div>
            <div>
              <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                {localizedCrewName(c)} <span style={{ textTransform: "capitalize", color: "var(--text-dim)", fontWeight: 400 }}>· {t(`crewRole.${c.role}`)}</span>
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>{localizedCrewPassive(c)}</div>
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
            {t("station.recruit")} <ResourceIcon type="alloy" size={12} /> {cost}
          </button>
        </Row>
      ))}
    </div>
  );
}
