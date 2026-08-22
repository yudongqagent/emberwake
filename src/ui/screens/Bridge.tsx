import { state, flagship, currentSystem, currentGalaxy, getNextObjective, travelToSystem } from "../../state/store";
import { hullClassById } from "../../data/hullClasses";
import { computeMaxHull, computePowerCapacity } from "../../engine/ships";
import { ShipRarityTag } from "../components/RarityTag";
import { crewDefById } from "../../data/crew";
import { playSfx } from "../../audio/engine";
import { HullIcon, PowerIcon, AptitudeIcon, LevelIcon, LocationIcon, CrewRoleIcon, NavIcon } from "../components/Icons";
import { StatReadout, Bar, hullBarKind } from "../components/StatBlock";

export function Bridge({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const ship = flagship.value;
  const hullDef = ship ? hullClassById(ship.hullClass) : null;
  const crewCount = state.value.crew.length;
  const objective = getNextObjective();
  const sameSystem = objective?.systemId === currentSystem.value.id;
  const hullFraction = ship ? ship.currentHp / computeMaxHull(ship) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", height: "100%", overflowY: "auto", padding: "1rem" }}>
      <div className="panel scanline" style={{ padding: "1.25rem" }}>
        <div className="title" style={{ fontSize: "1.5rem" }}>Emberwake</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-mid)", marginTop: "0.4rem" }}>
          <LocationIcon size={14} color="var(--cyan)" />
          <span>
            <strong style={{ color: "var(--text-hi)" }}>{currentSystem.value.name}</strong> — {currentGalaxy.value.name}
          </span>
        </div>
      </div>

      {objective && (
        <div className="panel accent" style={{ padding: "1.1rem", ["--accent" as any]: "var(--amber)" }}>
          <div className="eyebrow" style={{ color: "var(--amber)" }}>Next Objective</div>
          <div style={{ marginTop: "0.4rem", fontSize: "1.05rem", fontWeight: 600 }}>{objective.label}</div>
          <div style={{ color: "var(--text-mid)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            {sameSystem ? "Here — look for the marker in system view." : `Travel to ${objective.systemName}`}
          </div>
          <button
            className="btn primary"
            style={{ marginTop: "0.85rem" }}
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
        <div className="panel" style={{ padding: "1.1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="eyebrow">Flagship</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 700, marginTop: "0.15rem" }}>{ship.name}</div>
              <div style={{ color: "var(--text-mid)", fontSize: "0.82rem" }}>
                {hullDef.name} ({hullDef.nameCn})
              </div>
            </div>
            <ShipRarityTag rarity={ship.rarity} />
          </div>

          <div style={{ margin: "0.75rem 0 0.15rem" }}>
            <Bar fraction={hullFraction} kind={hullBarKind(hullFraction)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: "0.75rem", marginTop: "0.9rem" }}>
            <StatReadout icon={<HullIcon size={18} />} value={`${ship.currentHp}/${computeMaxHull(ship)}`} label="Hull" />
            <StatReadout icon={<PowerIcon size={18} />} value={computePowerCapacity(ship)} label="Power" color="var(--amber)" />
            <StatReadout icon={<LevelIcon size={18} />} value={ship.level} label="Level" color="var(--violet)" />
            <StatReadout icon={<AptitudeIcon size={18} />} value={ship.scanned ? ship.aptitude! : "??"} label="Aptitude" color="var(--green)" />
          </div>
        </div>
      )}

      <div className="panel" style={{ padding: "1.1rem" }}>
        <div className="eyebrow">Crew ({crewCount})</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.6rem" }}>
          {state.value.crew.length === 0 && <div style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>No crew assigned yet — recruit at a station.</div>}
          {state.value.crew.map((c) => {
            const def = crewDefById(c.defId);
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", border: "1px solid var(--line)", flex: "none" }}>
                  <CrewRoleIcon role={def.role} size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{def.name}</div>
                </div>
                <span className="eyebrow" style={{ color: "var(--text-dim)" }}>{def.role}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.6rem" }}>
        <button className="btn primary" onClick={() => onNavigate("galaxy")}>
          <NavIcon name="galaxy" size={15} /> Galaxy Map
        </button>
        <button className="btn" onClick={() => onNavigate("fleet")}>
          <NavIcon name="fleet" size={15} /> Fleet
        </button>
        <button className="btn" onClick={() => onNavigate("modules")}>
          <NavIcon name="modules" size={15} /> Modules
        </button>
        <button className="btn" onClick={() => onNavigate("crew")}>
          <NavIcon name="crew" size={15} /> Crew
        </button>
      </div>
    </div>
  );
}
