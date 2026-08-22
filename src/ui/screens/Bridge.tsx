import { state, flagship, currentSystem, currentGalaxy, getNextObjective, travelToSystem } from "../../state/store";
import { hullClassById } from "../../data/hullClasses";
import { computeMaxHull, computePowerCapacity } from "../../engine/ships";
import { ShipRarityTag } from "../components/RarityTag";
import { crewDefById } from "../../data/crew";
import { playSfx } from "../../audio/engine";

export function Bridge({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const ship = flagship.value;
  const hullDef = ship ? hullClassById(ship.hullClass) : null;
  const crewCount = state.value.crew.length;
  const objective = getNextObjective();
  const sameSystem = objective?.systemId === currentSystem.value.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%", overflowY: "auto", padding: "1rem" }}>
      <div className="panel scanline" style={{ padding: "1.25rem" }}>
        <div className="title" style={{ fontSize: "1.4rem" }}>Emberwake</div>
        <div style={{ color: "var(--text-mid)", marginTop: "0.3rem" }}>
          Currently at <strong style={{ color: "var(--text-hi)" }}>{currentSystem.value.name}</strong>, {currentGalaxy.value.name}.
        </div>
      </div>

      {objective && (
        <div className="panel" style={{ padding: "1.25rem", borderColor: "var(--amber)" }}>
          <div className="title" style={{ fontSize: "0.85rem", color: "var(--amber)" }}>Next Objective</div>
          <div style={{ marginTop: "0.4rem", fontSize: "1.05rem" }}>{objective.label}</div>
          <div style={{ color: "var(--text-mid)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            {sameSystem ? "Here — look for the marker in system view." : `Travel to ${objective.systemName}`}
          </div>
          <button
            className="btn primary"
            style={{ marginTop: "0.75rem" }}
            onClick={() => {
              playSfx("click");
              if (sameSystem) {
                onNavigate("system");
              } else {
                travelToSystem(objective.systemId);
                onNavigate("system");
              }
            }}
          >
            {sameSystem ? "Go to System View" : `Jump to ${objective.systemName}`}
          </button>
        </div>
      )}

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
