import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { state, spend, grant, canAfford, drawShipAction, drawModuleAction, recruitGenericCrew } from "../../state/store";
import { HULL_CLASSES, hullClassById } from "../../data/hullClasses";
import { CREW_DEFS } from "../../data/crew";
import { moduleDefById } from "../../data/modules";
import { ShipRarityTag, ModuleRarityTag } from "../components/RarityTag";
import type { ShipInstance, ModuleInstance } from "../../data/types";

type Tab = "trade" | "shipwright" | "fabricator" | "recruit";

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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 40,
        padding: "1rem",
      }}
    >
      <div className="panel" style={{ width: "min(560px, 100%)", maxWidth: "100%", boxSizing: "border-box", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1rem 0" }}>
          <div className="title">Station</div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div style={{ display: "flex", gap: "0.3rem", padding: "0.75rem 1rem" }}>
          {(["trade", "shipwright", "fabricator", "recruit"] as Tab[]).map((t) => (
            <button
              key={t}
              className={`btn ${tab === t ? "primary" : ""}`}
              onClick={() => setTab(t)}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textTransform: "capitalize",
                padding: "0.5em 0.2em",
                fontSize: "0.72rem",
              }}
            >
              {t}
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
        <DrawReveal title="New Hull Drawn" onClose={() => setDrawnShip(null)}>
          <div style={{ fontSize: "1.1rem" }}>{drawnShip.name}</div>
          <div style={{ color: "var(--text-mid)", margin: "0.4rem 0" }}>{hullClassById(drawnShip.hullClass).name}</div>
          <ShipRarityTag rarity={drawnShip.rarity} />
        </DrawReveal>
      )}
      {drawnModule && (
        <DrawReveal title="New Module Drawn" onClose={() => setDrawnModule(null)}>
          <div style={{ fontSize: "1.1rem" }}>{moduleDefById(drawnModule.defId).name}</div>
          <div style={{ color: "var(--text-mid)", margin: "0.4rem 0", textTransform: "capitalize" }}>
            {moduleDefById(drawnModule.defId).type}
          </div>
          <ModuleRarityTag rarity={drawnModule.rarity} />
        </DrawReveal>
      )}
    </div>
  );
}

function DrawReveal({ title, children, onClose }: { title: string; children: ComponentChildren; onClose: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(3,5,9,0.7)" }}
      onClick={onClose}
    >
      <div className="panel scanline" style={{ padding: "2rem", textAlign: "center", minWidth: 260 }} onClick={(e) => e.stopPropagation()}>
        <div className="title" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>{title}</div>
        {children}
        <div style={{ marginTop: "1rem" }}>
          <button className="btn primary" onClick={onClose}>Nice.</button>
        </div>
      </div>
    </div>
  );
}

function TradeTab() {
  const res = state.value.resources;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ color: "var(--text-mid)", fontSize: "0.85rem" }}>
        Fence salvage for refined alloy, or break down alloy stock back into quick salvage.
      </div>
      <ExchangeRow
        label="Salvage → Alloy (3:1)"
        canDo={res.salvage >= 30}
        onClick={() => {
          spend({ salvage: 30 });
          grant({ alloy: 10 });
        }}
      />
      <ExchangeRow
        label="Alloy → Salvage (1:2)"
        canDo={res.alloy >= 10}
        onClick={() => {
          spend({ alloy: 10 });
          grant({ salvage: 20 });
        }}
      />
    </div>
  );
}

function ExchangeRow({ label, canDo, onClick }: { label: string; canDo: boolean; onClick: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "0.9rem" }}>{label}</span>
      <button className="btn" disabled={!canDo} onClick={onClick}>Exchange</button>
    </div>
  );
}

function ShipwrightTab({ onDraw }: { onDraw: (s: ShipInstance) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <div style={{ color: "var(--text-mid)", fontSize: "0.85rem" }}>
        Draw a new hull instance. Each draw is unique — Rarity is revealed now, Aptitude only once Scanned.
      </div>
      {HULL_CLASSES.filter((h) => h.unlockFlag === null || state.value.flags[h.unlockFlag]).map((h) => {
        const cost = 30 + h.order * 25;
        return (
          <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.9rem" }}>{h.name}</div>
              <div style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>{h.nameCn} &middot; {cost} Source Points</div>
            </div>
            <button
              className="btn"
              disabled={!canAfford({ sourcePoints: cost })}
              onClick={() => {
                spend({ sourcePoints: cost });
                onDraw(drawShipAction(h.id));
              }}
            >
              Draw
            </button>
          </div>
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
      <button
        className="btn primary"
        disabled={!canAfford({ sourcePoints: cost })}
        onClick={() => {
          spend({ sourcePoints: cost });
          onDraw(drawModuleAction());
        }}
      >
        Draw Module ({cost} Source Points)
      </button>
    </div>
  );
}

function RecruitTab() {
  const genericDefs = CREW_DEFS.filter((c) => !c.named);
  const cost = 30;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <div style={{ color: "var(--text-mid)", fontSize: "0.85rem" }}>
        Named crew join through the story. Generic reinforcements can be recruited here.
      </div>
      {genericDefs.map((c) => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.9rem" }}>{c.name} &middot; <span style={{ textTransform: "capitalize", color: "var(--text-dim)" }}>{c.role}</span></div>
            <div style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>{c.passive}</div>
          </div>
          <button
            className="btn"
            disabled={!canAfford({ sourcePoints: cost })}
            onClick={() => {
              spend({ sourcePoints: cost });
              recruitGenericCrew(c.id);
            }}
          >
            Recruit
          </button>
        </div>
      ))}
    </div>
  );
}
