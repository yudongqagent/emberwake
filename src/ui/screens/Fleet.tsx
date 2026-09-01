import { state, flagship, scanShipAction, effectiveMaxHull, effectiveShipEvasion, effectiveShipSpeed, effectiveShipCrit, effectiveShipBlock, effectiveShipPowerDraw, giftCapturedShip } from "../../state/store";
import { hullClassById } from "../../data/hullClasses";
import { hullClassAbility } from "../../data/namedShips";
import { computePowerCapacity } from "../../engine/ships";
import { ShipRarityTag } from "../components/RarityTag";
import { playSfx } from "../../audio/engine";
import { HullIcon, PowerIcon, SlotsIcon, AptitudeIcon, NavIcon, SpeedIcon, EvasionIcon, CritIcon, ModuleTypeIcon} from "../components/Icons";
import { StatReadout, Bar, hullBarKind, RollQualityBadge, AnimatedFraction } from "../components/StatBlock";
import { APTITUDE_GROWTH } from "../../data/hullClasses";
import { t } from "../../i18n/strings";
import { localizedNamedShipActive, localizedNamedShipFlavor, localizedHullClassDisplay, localizedEnemyName} from "../../i18n/data";

/** Ship-ascension redesign (docs/story/research-notes-ship-ascension.md): Whisper
 * is the only ship there is, so this screen used to be a multi-ship hangar (switch
 * flagship, sell spares) and is now her single ascension-status readout — current
 * tier, stats, her hull class's ability (if any), and a simple history of the tiers
 * she's passed through. Growing her further happens at the Station's Ascension tab. */
export function Fleet() {
  const ship = flagship.value;
  if (!ship) return null;
  const def = hullClassById(ship.hullClass);
  const ability = hullClassAbility(ship.hullClass);
  const totalSlots = def.slots.weapon + def.slots.armor + def.slots.engine + def.slots.utility;
  const hullFraction = ship.currentHp / effectiveMaxHull(ship);

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div>
        <div className="title" style={{ fontSize: "1.2rem" }}>{t("fleet.hangar")}</div>
        <div style={{ color: "var(--text-mid)", fontSize: "0.82rem", marginTop: "0.25rem" }}>
          {t("fleet.hangarHint")}
        </div>
      </div>
      <div className="panel accent" style={{ padding: "1.1rem", ["--accent" as any]: `var(--rarity-${ship.rarity})` }}>
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
              <div style={{ fontSize: "1.05rem", fontWeight: 700 }}>{ship.name}</div>
              <div style={{ color: "var(--text-mid)", fontSize: "0.8rem" }}>{localizedHullClassDisplay(def)}</div>
            </div>
          </div>
          <ShipRarityTag rarity={ship.rarity} />
        </div>

        {ability && (
          <div style={{ margin: "0.6rem 0 0", padding: "0.55rem 0.7rem", borderRadius: 6, border: "1px solid var(--amber)", background: "rgba(255,193,71,0.08)" }}>
            <div className="eyebrow" style={{ color: "var(--amber)", marginBottom: "0.25rem" }}>{t("fleet.namedShipAbility")}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-mid)" }}>{localizedNamedShipActive(ability)}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "0.3rem", fontStyle: "italic" }}>{localizedNamedShipFlavor(ability)}</div>
          </div>
        )}

        <div style={{ margin: "0.75rem 0 0" }}>
          <Bar fraction={hullFraction} kind={hullBarKind(hullFraction)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: "0.6rem", margin: "0.8rem 0" }}>
          <StatReadout icon={<HullIcon size={16} />} value={<AnimatedFraction current={ship.currentHp} max={effectiveMaxHull(ship)} />} label={t("bridge.stat.hull")} />
          <StatReadout icon={<PowerIcon size={16} />}
              /* 超载时数字本身变红——StatReadout 的 color 只管图标,
                 而需要被看见的是这个数。 */
              value={<span style={{ color: effectiveShipPowerDraw(ship) > computePowerCapacity(ship) ? "var(--red)" : undefined }}>{effectiveShipPowerDraw(ship)}/{computePowerCapacity(ship)}</span>}
              label={t("bridge.stat.power")} color="var(--amber)" title={t("bridge.stat.powerTitle")} />
          <StatReadout icon={<SpeedIcon size={16} />} value={effectiveShipSpeed(ship)} label={t("bridge.stat.speed")} color="var(--cyan)" />
          <StatReadout icon={<EvasionIcon size={16} />} value={`${(effectiveShipEvasion(ship) * 100).toFixed(1)}%`} label={t("bridge.stat.evasion")} color="var(--green)" />
          <StatReadout icon={<ModuleTypeIcon type="armor" size={16} color="var(--cyan)" />} value={effectiveShipBlock(ship)} label={t("bridge.stat.block")} color="var(--cyan)" title={t("bridge.stat.blockTitle")} />
          <StatReadout icon={<CritIcon size={16} />} value={`${Math.round(effectiveShipCrit(ship) * 100)}%`} label={t("bridge.stat.crit")} color="var(--red)" title={t("bridge.stat.critTitle")} />
          <StatReadout icon={<SlotsIcon size={16} />} value={totalSlots} label={t("fleet.stat.slots")} color="var(--violet)" />
          <StatReadout icon={<AptitudeIcon size={16} />} value={ship.scanned && ship.aptitude ? `${ship.aptitude} ×${APTITUDE_GROWTH[ship.aptitude].toFixed(2).replace(/0$/, "")}` : "??"} label={t("bridge.stat.aptitude")} color="var(--green)" title={t("bridge.stat.aptitudeTitle")} />
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.7rem" }}>
          <RollQualityBadge roll={ship.rolls.hull} label={t("fleet.roll.hull")} />
          <RollQualityBadge roll={ship.rolls.speed} label={t("fleet.roll.speed")} />
          <RollQualityBadge roll={ship.rolls.evasion} label={t("fleet.roll.evasion")} />
          <RollQualityBadge roll={ship.rolls.crit} label={t("fleet.roll.crit")} />
        </div>

        {!ship.scanned && (
          <button className="btn" onClick={() => { scanShipAction(ship.id); playSfx("click"); }}>
            {t("fleet.scan")}
          </button>
        )}
      </div>

      {ship.ascendedFrom.length > 0 && (
        <div className="panel compact" style={{ padding: "0.75rem 0.9rem" }}>
          <div className="eyebrow" style={{ marginBottom: "0.5rem" }}>{t("fleet.ascensionHistory")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center", fontSize: "0.78rem", color: "var(--text-mid)" }}>
            {ship.ascendedFrom.map((id, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                {localizedHullClassDisplay(hullClassById(id))}
                <span style={{ color: "var(--text-dim)" }}>→</span>
              </span>
            ))}
            <span style={{ color: "var(--text-hi)", fontWeight: 700 }}>{localizedHullClassDisplay(def)}</span>
          </div>
        </div>
      )}

      {state.value.capturedShips.length > 0 && (
        <div>
          <div className="title" style={{ fontSize: "1.05rem" }}>{t("fleet.capturedShips")}</div>
          <div style={{ color: "var(--text-mid)", fontSize: "0.8rem", marginTop: "0.2rem", marginBottom: "0.6rem" }}>
            {t("fleet.capturedShipsHint")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {state.value.capturedShips.map((cs) => (
              <div key={cs.id} className="panel compact" style={{ padding: "0.7rem 0.9rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{localizedEnemyName(cs.name)}</div>
                <button className="btn" onClick={() => { giftCapturedShip(cs.id); playSfx("click"); }}>
                  {t("fleet.giftShip")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.value.alliedShips.length > 0 && (
        <div>
          <div className="title" style={{ fontSize: "1.05rem" }}>{t("fleet.alliedFleet")}</div>
          <div style={{ color: "var(--text-mid)", fontSize: "0.8rem", marginTop: "0.2rem", marginBottom: "0.6rem" }}>
            {t("fleet.alliedFleetHint")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {state.value.alliedShips.map((as) => (
              <div key={as.id} className="panel compact accent" style={{ padding: "0.7rem 0.9rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem", ["--accent" as any]: "var(--green)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <NavIcon name="fleet" size={15} color="var(--green)" />
                  <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{localizedEnemyName(as.name)}</div>
                </div>
                <span className="eyebrow" style={{ color: "var(--text-dim)" }}>{t("fleet.allyLevel", { level: as.level })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
