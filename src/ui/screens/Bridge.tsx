import { state, flagship, currentSystem } from "../../state/store";
import { hullClassById } from "../../data/hullClasses";
import { computeMaxHull, computePowerCapacity } from "../../engine/ships";
import { ShipRarityTag } from "../components/RarityTag";
import { crewDefById } from "../../data/crew";

export function Bridge({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const ship = flagship.value;
  const hullDef = ship ? hullClassById(ship.hullClass) : null;
  const crewCount = state.value.crew.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%", overflowY: "auto", padding: "1rem" }}>
      <div className="panel scanline" style={{ padding: "1.25rem" }}>
        <div className="title" style={{ fontSize: "1.4rem" }}>Emberwake</div>
        <div style={{ color: "var(--text-mid)", marginTop: "0.3rem" }}>
          Currently docked at <strong style={{ color: "var(--text-hi)" }}>{currentSystem.value.name}</strong>, Bauhinia Reach.
        </div>
      </div>

      {ship && hullDef && (
        <div className="panel" style={{ padding: "1.25rem" }}>
          <div className="title" style={{ fontSize: "1rem" }}>Flagship</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
            <div>
              <div style={{ fontSize: "1.1rem" }}>{ship.name}</div>
              <div style={{ color: "var(--text-mid)", fontSize: "0.85rem" }}>
                {hullDef.name} ({hullDef.nameCn}) &middot; Level {ship.level}
              </div>
            </div>
            <ShipRarityTag rarity={ship.rarity} />
          </div>
          <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--text-mid)" }}>
            <span>Hull {ship.currentHp}/{computeMaxHull(ship)}</span>
            <span>Power {computePowerCapacity(ship)}</span>
            <span>Aptitude {ship.scanned ? ship.aptitude : "??"}</span>
          </div>
        </div>
      )}

      <div className="panel" style={{ padding: "1.25rem" }}>
        <div className="title" style={{ fontSize: "1rem" }}>Crew ({crewCount})</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.5rem" }}>
          {state.value.crew.length === 0 && <div style={{ color: "var(--text-dim)" }}>No crew assigned yet.</div>}
          {state.value.crew.map((c) => {
            const def = crewDefById(c.defId);
            return (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                <span>{def.name}</span>
                <span style={{ color: "var(--text-dim)" }}>{def.role}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.6rem" }}>
        <button className="btn primary" onClick={() => onNavigate("galaxy")}>Galaxy Map</button>
        <button className="btn" onClick={() => onNavigate("fleet")}>Fleet</button>
        <button className="btn" onClick={() => onNavigate("modules")}>Modules</button>
        <button className="btn" onClick={() => onNavigate("crew")}>Crew</button>
      </div>
    </div>
  );
}
