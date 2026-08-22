import { state, flagship, setActiveFlagship, scanShipAction } from "../../state/store";
import { hullClassById } from "../../data/hullClasses";
import { computeMaxHull, computePowerCapacity } from "../../engine/ships";
import { ShipRarityTag } from "../components/RarityTag";
import { playSfx } from "../../audio/engine";

export function Fleet() {
  const activeId = flagship.value?.id;
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div className="title">Hangar</div>
      <div style={{ color: "var(--text-mid)", fontSize: "0.85rem" }}>
        Every drawn hull is a unique instance. Scan reveals hidden Aptitude — how well a ship grows as it levels.
      </div>
      {state.value.ships.map((ship) => {
        const def = hullClassById(ship.hullClass);
        const isActive = ship.id === activeId;
        return (
          <div key={ship.id} className="panel" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "1.05rem" }}>{ship.name}</div>
                <div style={{ color: "var(--text-mid)", fontSize: "0.82rem" }}>{def.name} ({def.nameCn}) &middot; Lvl {ship.level}</div>
              </div>
              <ShipRarityTag rarity={ship.rarity} />
            </div>
            <div style={{ display: "flex", gap: "1.2rem", margin: "0.6rem 0", fontSize: "0.82rem", color: "var(--text-mid)" }}>
              <span>Hull {ship.currentHp}/{computeMaxHull(ship)}</span>
              <span>Power {computePowerCapacity(ship)}</span>
              <span>Slots {def.slots.weapon + def.slots.armor + def.slots.engine + def.slots.utility}</span>
              <span>Aptitude {ship.scanned ? ship.aptitude : "??"}</span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {!ship.scanned && (
                <button className="btn" onClick={() => { scanShipAction(ship.id); playSfx("click"); }}>
                  Scan
                </button>
              )}
              <button className="btn primary" disabled={isActive} onClick={() => setActiveFlagship(ship.id)}>
                {isActive ? "Flagship" : "Set as Flagship"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
