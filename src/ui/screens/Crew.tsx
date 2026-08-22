import { state, flagship, assignCrew } from "../../state/store";
import { crewDefById } from "../../data/crew";

export function Crew() {
  const ship = flagship.value;
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <div className="title">Crew Roster</div>
      {state.value.crew.length === 0 && <div style={{ color: "var(--text-dim)" }}>No crew yet — recruit at a station.</div>}
      {state.value.crew.map((c) => {
        const def = crewDefById(c.defId);
        const assigned = c.assignedShipId === ship?.id;
        return (
          <div key={c.id} className="panel" style={{ padding: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "1rem" }}>{def.name}</div>
                <div style={{ color: "var(--text-mid)", fontSize: "0.8rem", textTransform: "capitalize" }}>
                  {def.role} &middot; {def.rarity}
                </div>
              </div>
              <button
                className={`btn ${assigned ? "primary" : ""}`}
                disabled={!ship}
                onClick={() => assignCrew(c.id, assigned ? null : ship!.id)}
              >
                {assigned ? "Assigned" : "Assign"}
              </button>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-mid)", marginTop: "0.5rem" }}>
              <div>Passive: {def.passive}</div>
              <div>Active: {def.active} (cooldown {def.activeCooldown})</div>
            </div>
            <div style={{ height: 4, background: "var(--bg-inset)", borderRadius: 2, marginTop: "0.5rem", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${c.approval}%`, background: "var(--green)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
