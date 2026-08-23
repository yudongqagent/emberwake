import { state, flagship, setActiveFlagship, scanShipAction, effectiveMaxHull } from "../../state/store";
import { hullClassById } from "../../data/hullClasses";
import { computePowerCapacity, computeSpeed, computeBaseEvasion, computeBaseCritChance } from "../../engine/ships";
import { ShipRarityTag } from "../components/RarityTag";
import { playSfx } from "../../audio/engine";
import { HullIcon, PowerIcon, SlotsIcon, AptitudeIcon, NavIcon, SpeedIcon, EvasionIcon, CritIcon } from "../components/Icons";
import { StatReadout, Bar, hullBarKind, RollQualityBadge, AnimatedFraction } from "../components/StatBlock";

export function Fleet() {
  const activeId = flagship.value?.id;
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div>
        <div className="title" style={{ fontSize: "1.2rem" }}>Hangar</div>
        <div style={{ color: "var(--text-mid)", fontSize: "0.82rem", marginTop: "0.25rem" }}>
          Every drawn hull is a unique instance. Scan reveals hidden Aptitude — how well a ship grows as it levels.
        </div>
      </div>
      {state.value.ships.map((ship) => {
        const def = hullClassById(ship.hullClass);
        const isActive = ship.id === activeId;
        const totalSlots = def.slots.weapon + def.slots.armor + def.slots.engine + def.slots.utility;
        const hullFraction = ship.currentHp / effectiveMaxHull(ship);
        return (
          <div key={ship.id} className={`panel ${isActive ? "accent" : ""}`} style={{ padding: "1.1rem", ["--accent" as any]: `var(--rarity-${ship.rarity})` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: "0.7rem", alignItems: "center" }}>
                <div
                  style={{
                    width: 42, height: 42, borderRadius: 6, flex: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: `radial-gradient(circle, var(--rarity-${ship.rarity})22, transparent 70%)`,
                    border: `1px solid var(--rarity-${ship.rarity})`,
                  }}
                >
                  <NavIcon name="fleet" size={22} color={`var(--rarity-${ship.rarity})`} />
                </div>
                <div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    {ship.name}
                    {isActive && <span className="eyebrow" style={{ color: "var(--cyan)" }}>Flagship</span>}
                  </div>
                  <div style={{ color: "var(--text-mid)", fontSize: "0.8rem" }}>{def.name} ({def.nameCn})</div>
                </div>
              </div>
              <ShipRarityTag rarity={ship.rarity} />
            </div>

            <div style={{ margin: "0.75rem 0 0" }}>
              <Bar fraction={hullFraction} kind={hullBarKind(hullFraction)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: "0.6rem", margin: "0.8rem 0" }}>
              <StatReadout icon={<HullIcon size={16} />} value={<AnimatedFraction current={ship.currentHp} max={effectiveMaxHull(ship)} />} label="Hull" />
              <StatReadout icon={<PowerIcon size={16} />} value={computePowerCapacity(ship)} label="Power" color="var(--amber)" />
              <StatReadout icon={<SpeedIcon size={16} />} value={computeSpeed(ship)} label="Speed" color="var(--cyan)" />
              <StatReadout icon={<EvasionIcon size={16} />} value={`${Math.round(computeBaseEvasion(ship) * 100)}%`} label="Evasion" color="var(--green)" />
              <StatReadout icon={<CritIcon size={16} />} value={`${Math.round(computeBaseCritChance(ship) * 100)}%`} label="Crit" color="var(--red)" />
              <StatReadout icon={<SlotsIcon size={16} />} value={totalSlots} label="Slots" color="var(--violet)" />
              <StatReadout icon={<AptitudeIcon size={16} />} value={ship.scanned ? ship.aptitude! : "??"} label="Aptitude" color="var(--green)" />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.7rem" }}>
              <RollQualityBadge roll={ship.rolls.hull} label="Hull roll" />
              <RollQualityBadge roll={ship.rolls.speed} label="Speed roll" />
              <RollQualityBadge roll={ship.rolls.evasion} label="Evasion roll" />
              <RollQualityBadge roll={ship.rolls.crit} label="Crit roll" />
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              {!ship.scanned && (
                <button className="btn" onClick={() => { scanShipAction(ship.id); playSfx("click"); }}>
                  Scan
                </button>
              )}
              <button className="btn primary" disabled={isActive} onClick={() => setActiveFlagship(ship.id)}>
                {isActive ? "Active Flagship" : "Set as Flagship"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
