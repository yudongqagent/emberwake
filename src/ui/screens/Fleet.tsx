import { state, flagship, setActiveFlagship, scanShipAction, effectiveMaxHull, sellShip } from "../../state/store";
import { hullClassById, shipwrightCost } from "../../data/hullClasses";
import { namedShipDefById } from "../../data/namedShips";
import { computePowerCapacity, computeSpeed, computeBaseEvasion, computeBaseCritChance } from "../../engine/ships";
import { ShipRarityTag } from "../components/RarityTag";
import { playSfx } from "../../audio/engine";
import { HullIcon, PowerIcon, SlotsIcon, AptitudeIcon, NavIcon, SpeedIcon, EvasionIcon, CritIcon } from "../components/Icons";
import { StatReadout, Bar, hullBarKind, RollQualityBadge, AnimatedFraction } from "../components/StatBlock";
import { t } from "../../i18n/strings";

export function Fleet() {
  const activeId = flagship.value?.id;
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div>
        <div className="title" style={{ fontSize: "1.2rem" }}>{t("fleet.hangar")}</div>
        <div style={{ color: "var(--text-mid)", fontSize: "0.82rem", marginTop: "0.25rem" }}>
          {t("fleet.hangarHint")}
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
                    {isActive && <span className="eyebrow" style={{ color: "var(--cyan)" }}>{t("fleet.flagship")}</span>}
                  </div>
                  <div style={{ color: "var(--text-mid)", fontSize: "0.8rem" }}>{def.name} ({def.nameCn})</div>
                </div>
              </div>
              <ShipRarityTag rarity={ship.rarity} />
            </div>

            {ship.namedShipId && (() => {
              const namedDef = namedShipDefById(ship.namedShipId);
              return (
                <div style={{ margin: "0.6rem 0 0", padding: "0.55rem 0.7rem", borderRadius: 6, border: "1px solid var(--amber)", background: "rgba(255,193,71,0.08)" }}>
                  <div className="eyebrow" style={{ color: "var(--amber)", marginBottom: "0.25rem" }}>{t("fleet.namedShipAbility")}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-mid)" }}>{namedDef.active}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "0.3rem", fontStyle: "italic" }}>{namedDef.flavor}</div>
                </div>
              );
            })()}

            <div style={{ margin: "0.75rem 0 0" }}>
              <Bar fraction={hullFraction} kind={hullBarKind(hullFraction)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: "0.6rem", margin: "0.8rem 0" }}>
              <StatReadout icon={<HullIcon size={16} />} value={<AnimatedFraction current={ship.currentHp} max={effectiveMaxHull(ship)} />} label={t("bridge.stat.hull")} />
              <StatReadout icon={<PowerIcon size={16} />} value={computePowerCapacity(ship)} label={t("bridge.stat.power")} color="var(--amber)" />
              <StatReadout icon={<SpeedIcon size={16} />} value={computeSpeed(ship)} label={t("bridge.stat.speed")} color="var(--cyan)" />
              <StatReadout icon={<EvasionIcon size={16} />} value={`${Math.round(computeBaseEvasion(ship) * 100)}%`} label={t("bridge.stat.evasion")} color="var(--green)" />
              <StatReadout icon={<CritIcon size={16} />} value={`${Math.round(computeBaseCritChance(ship) * 100)}%`} label={t("bridge.stat.crit")} color="var(--red)" />
              <StatReadout icon={<SlotsIcon size={16} />} value={totalSlots} label={t("fleet.stat.slots")} color="var(--violet)" />
              <StatReadout icon={<AptitudeIcon size={16} />} value={ship.scanned ? ship.aptitude! : "??"} label={t("bridge.stat.aptitude")} color="var(--green)" />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.7rem" }}>
              <RollQualityBadge roll={ship.rolls.hull} label={t("fleet.roll.hull")} />
              <RollQualityBadge roll={ship.rolls.speed} label={t("fleet.roll.speed")} />
              <RollQualityBadge roll={ship.rolls.evasion} label={t("fleet.roll.evasion")} />
              <RollQualityBadge roll={ship.rolls.crit} label={t("fleet.roll.crit")} />
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              {!ship.scanned && (
                <button className="btn" onClick={() => { scanShipAction(ship.id); playSfx("click"); }}>
                  {t("fleet.scan")}
                </button>
              )}
              <button className="btn primary" disabled={isActive} onClick={() => setActiveFlagship(ship.id)}>
                {isActive ? t("fleet.activeFlagship") : t("fleet.setAsFlagship")}
              </button>
              {!isActive && (
                <button
                  className="btn danger"
                  style={{ marginLeft: "auto" }}
                  onClick={() => sellShip(ship.id)}
                  title={t("fleet.sellFor", { value: Math.round(shipwrightCost(ship.hullClass, ship.rarity) * 0.4) })}
                >
                  {t("fleet.sellPlus", { value: Math.round(shipwrightCost(ship.hullClass, ship.rarity) * 0.4) })}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
