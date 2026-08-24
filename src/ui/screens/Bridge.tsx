import { state, flagship, currentSystem, currentGalaxy, getNextObjective, travelToSystem, effectiveMaxHull } from "../../state/store";
import { hullClassById } from "../../data/hullClasses";
import { computePowerCapacity, computeSpeed, computeBaseEvasion, computeBaseCritChance } from "../../engine/ships";
import { ShipRarityTag } from "../components/RarityTag";
import { crewDefById } from "../../data/crew";
import { playSfx } from "../../audio/engine";
import { HullIcon, PowerIcon, AptitudeIcon, LevelIcon, LocationIcon, CrewRoleIcon, NavIcon, SpeedIcon, EvasionIcon, CritIcon } from "../components/Icons";
import { StatReadout, Bar, hullBarKind, AnimatedFraction } from "../components/StatBlock";
import { BridgeViewscreen } from "../components/BridgeViewscreen";
import { t } from "../../i18n/strings";
import { localizedCrewName } from "../../i18n/data";

export function Bridge({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const ship = flagship.value;
  const hullDef = ship ? hullClassById(ship.hullClass) : null;
  const crewCount = state.value.crew.length;
  const objective = getNextObjective();
  const sameSystem = objective?.systemId === currentSystem.value.id;
  const hullFraction = ship ? ship.currentHp / effectiveMaxHull(ship) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", height: "100%", overflowY: "auto", padding: "1rem" }}>
      <BridgeViewscreen systemName={currentSystem.value.name} galaxyName={currentGalaxy.value.name} />
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
          <div className="eyebrow" style={{ color: "var(--amber)" }}>{t("bridge.nextObjective")}</div>
          <div style={{ marginTop: "0.4rem", fontSize: "1.05rem", fontWeight: 600 }}>{objective.label}</div>
          <div style={{ color: "var(--text-mid)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            {sameSystem ? t("bridge.hereMarker") : t("bridge.travelTo", { system: objective.systemName })}
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
            {sameSystem ? t("bridge.goToSystem") : t("bridge.jumpTo", { system: objective.systemName })}
          </button>
        </div>
      )}

      {ship && hullDef && (
        <div className="panel" style={{ padding: "1.1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="eyebrow">{t("bridge.flagship")}</div>
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
            <StatReadout icon={<HullIcon size={18} />} value={<AnimatedFraction current={ship.currentHp} max={effectiveMaxHull(ship)} />} label={t("bridge.stat.hull")} />
            <StatReadout icon={<PowerIcon size={18} />} value={computePowerCapacity(ship)} label={t("bridge.stat.power")} color="var(--amber)" />
            <StatReadout icon={<SpeedIcon size={18} />} value={computeSpeed(ship)} label={t("bridge.stat.speed")} color="var(--cyan)" />
            <StatReadout icon={<EvasionIcon size={18} />} value={`${Math.round(computeBaseEvasion(ship) * 100)}%`} label={t("bridge.stat.evasion")} color="var(--green)" />
            <StatReadout icon={<CritIcon size={18} />} value={`${Math.round(computeBaseCritChance(ship) * 100)}%`} label={t("bridge.stat.crit")} color="var(--red)" />
            <StatReadout icon={<LevelIcon size={18} />} value={ship.level} label={t("bridge.stat.level")} color="var(--violet)" />
            <StatReadout icon={<AptitudeIcon size={18} />} value={ship.scanned ? ship.aptitude! : "??"} label={t("bridge.stat.aptitude")} color="var(--green)" />
          </div>
        </div>
      )}

      <div className="panel" style={{ padding: "1.1rem" }}>
        <div className="eyebrow">{t("bridge.crewCount", { count: crewCount })}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.6rem" }}>
          {state.value.crew.length === 0 && <div style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>{t("bridge.noCrew")}</div>}
          {state.value.crew.map((c) => {
            const def = crewDefById(c.defId);
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", border: "1px solid var(--line)", flex: "none" }}>
                  <CrewRoleIcon role={def.role} size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{localizedCrewName(def)}</div>
                </div>
                <span className="eyebrow" style={{ color: "var(--text-dim)" }}>{t(`crewRole.${def.role}`)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.6rem" }}>
        <button className="btn primary" onClick={() => onNavigate("galaxy")}>
          <NavIcon name="galaxy" size={15} /> {t("bridge.galaxyMap")}
        </button>
        <button className="btn" onClick={() => onNavigate("fleet")}>
          <NavIcon name="fleet" size={15} /> {t("bridge.fleet")}
        </button>
        <button className="btn" onClick={() => onNavigate("modules")}>
          <NavIcon name="modules" size={15} /> {t("bridge.modules")}
        </button>
        <button className="btn" onClick={() => onNavigate("crew")}>
          <NavIcon name="crew" size={15} /> {t("bridge.crew")}
        </button>
      </div>
    </div>
  );
}
