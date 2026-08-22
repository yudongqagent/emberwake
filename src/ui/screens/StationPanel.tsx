import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { state, spend, grant, canAfford, drawShipAction, drawModuleAction, recruitGenericCrew } from "../../state/store";
import { HULL_CLASSES, hullClassById } from "../../data/hullClasses";
import { CREW_DEFS } from "../../data/crew";
import { moduleDefById } from "../../data/modules";
import { ShipRarityTag, ModuleRarityTag } from "../components/RarityTag";
import { ResourceIcon, TradeIcon, NavIcon, CrewRoleIcon, CREW_ROLE_COLOR, ModuleTypeIcon } from "../components/Icons";
import type { ShipInstance, ModuleInstance } from "../../data/types";

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
          {tab === "shipwright" && <ShipwrightTab onDraw={setDrawnShip} />}
          {tab === "fabricator" && <FabricatorTab onDraw={setDrawnModule} />}
          {tab === "recruit" && <RecruitTab />}
        </div>
      </div>

      {drawnShip && (
        <DrawReveal title="New Hull Drawn" accent={`var(--rarity-${drawnShip.rarity})`} onClose={() => setDrawnShip(null)}>
          <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{drawnShip.name}</div>
          <div style={{ color: "var(--text-mid)", margin: "0.4rem 0" }}>{hullClassById(drawnShip.hullClass).name}</div>
          <ShipRarityTag rarity={drawnShip.rarity} showPips={false} />
        </DrawReveal>
      )}
      {drawnModule && (
        <DrawReveal title="New Module Drawn" accent="var(--cyan)" onClose={() => setDrawnModule(null)}>
          <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{moduleDefById(drawnModule.defId).name}</div>
          <div style={{ color: "var(--text-mid)", margin: "0.4rem 0", textTransform: "capitalize" }}>
            {moduleDefById(drawnModule.defId).type}
          </div>
          <ModuleRarityTag rarity={drawnModule.rarity} />
        </DrawReveal>
      )}
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
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <div style={{ color: "var(--text-mid)", fontSize: "0.85rem" }}>
        Fence salvage for refined alloy, or break down alloy stock back into quick salvage.
      </div>
      <Row>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem" }}>
          <ResourceIcon type="salvage" size={16} /> 30 <TradeIcon size={14} color="var(--text-dim)" /> <ResourceIcon type="alloy" size={16} /> 10
        </div>
        <button className="btn" disabled={res.salvage < 30} onClick={() => { spend({ salvage: 30 }); grant({ alloy: 10 }); }}>
          Exchange
        </button>
      </Row>
      <Row>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem" }}>
          <ResourceIcon type="alloy" size={16} /> 10 <TradeIcon size={14} color="var(--text-dim)" /> <ResourceIcon type="salvage" size={16} /> 20
        </div>
        <button className="btn" disabled={res.alloy < 10} onClick={() => { spend({ alloy: 10 }); grant({ salvage: 20 }); }}>
          Exchange
        </button>
      </Row>
    </div>
  );
}

function ShipwrightTab({ onDraw }: { onDraw: (s: ShipInstance) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
      <div style={{ color: "var(--text-mid)", fontSize: "0.85rem" }}>
        Draw a new hull instance. Each draw is unique — Rarity is revealed now, Aptitude only once Scanned.
      </div>
      {HULL_CLASSES.filter((h) => h.unlockFlag === null || state.value.flags[h.unlockFlag]).map((h) => {
        const cost = 30 + h.order * 25;
        return (
          <Row key={h.id}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(75,232,255,0.08)", border: "1px solid var(--line-bright)", flex: "none" }}>
                <NavIcon name="fleet" size={16} color="var(--cyan)" />
              </div>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{h.name}</div>
                <div style={{ color: "var(--text-dim)", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  {h.nameCn} · <ResourceIcon type="sourcePoints" size={11} /> {cost}
                </div>
              </div>
            </div>
            <button
              className="btn primary"
              disabled={!canAfford({ sourcePoints: cost })}
              onClick={() => {
                spend({ sourcePoints: cost });
                onDraw(drawShipAction(h.id));
              }}
            >
              Draw
            </button>
          </Row>
        );
      })}
    </div>
  );
}

function FabricatorTab({ onDraw }: { onDraw: (m: ModuleInstance) => void }) {
  const cost = 25;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ color: "var(--text-mid)", fontSize: "0.85rem" }}>
        Draw a random module — type, rarity, and traits are rolled fresh each time.
      </div>
      <div className="panel" style={{ padding: "1.1rem", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "0.9rem" }}>
          {(["weapon", "armor", "engine", "utility"] as const).map((t) => (
            <div key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
              <ModuleTypeIcon type={t} size={22} />
              <span className="eyebrow" style={{ fontSize: "0.55rem" }}>{t}</span>
            </div>
          ))}
        </div>
        <button
          className="btn primary"
          style={{ width: "100%" }}
          disabled={!canAfford({ sourcePoints: cost })}
          onClick={() => {
            spend({ sourcePoints: cost });
            onDraw(drawModuleAction());
          }}
        >
          Draw Module — {cost} Source Points
        </button>
      </div>
    </div>
  );
}

function RecruitTab() {
  const genericDefs = CREW_DEFS.filter((c) => !c.named);
  const cost = 30;
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
            disabled={!canAfford({ sourcePoints: cost })}
            onClick={() => {
              spend({ sourcePoints: cost });
              recruitGenericCrew(c.id);
            }}
          >
            Recruit
          </button>
        </Row>
      ))}
    </div>
  );
}
