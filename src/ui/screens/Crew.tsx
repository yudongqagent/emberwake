import { state, flagship, assignCrew } from "../../state/store";
import { crewDefById } from "../../data/crew";
import { CrewRoleIcon, CREW_ROLE_COLOR, CREW_RARITY_COLOR } from "../components/Icons";
import { Bar } from "../components/StatBlock";
import { t } from "../../i18n/strings";
import { localizedCrewName, localizedCrewPassive, localizedCrewActive } from "../../i18n/data";

export function Crew() {
  const ship = flagship.value;
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
      <div className="title" style={{ fontSize: "1.2rem" }}>{t("crew.roster")}</div>
      {state.value.crew.length === 0 && (
        <div className="panel" style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-dim)" }}>
          {t("crew.empty")}
        </div>
      )}
      {state.value.crew.map((c) => {
        const def = crewDefById(c.defId);
        const assigned = c.assignedShipId === ship?.id;
        const rarityColor = CREW_RARITY_COLOR[def.rarity];
        return (
          <div key={c.id} className={`panel ${assigned ? "accent" : ""}`} style={{ padding: "1rem", ["--accent" as any]: "var(--cyan)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
              <div style={{ display: "flex", gap: "0.7rem" }}>
                <div
                  style={{
                    width: 44, height: 44, borderRadius: "50%", flex: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: `radial-gradient(circle, ${CREW_ROLE_COLOR[def.role]}22, transparent 70%)`,
                    border: `1.5px solid ${rarityColor}`,
                    boxShadow: `0 0 10px ${rarityColor}44`,
                  }}
                >
                  <CrewRoleIcon role={def.role} size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "1rem", fontWeight: 700 }}>{localizedCrewName(def)}</div>
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginTop: "0.15rem" }}>
                    <span className="eyebrow" style={{ color: CREW_ROLE_COLOR[def.role] }}>{t(`crewRole.${def.role}`)}</span>
                    <span style={{ color: "var(--text-dim)" }}>&middot;</span>
                    <span className="eyebrow" style={{ color: rarityColor }}>{t(`crewRarity.${def.rarity}`)}</span>
                  </div>
                </div>
              </div>
              <button
                className={`btn ${assigned ? "primary" : ""}`}
                style={{ flex: "none", alignSelf: "center" }}
                disabled={!ship}
                onClick={() => assignCrew(c.id, assigned ? null : ship!.id)}
              >
                {assigned ? t("crew.assigned") : t("crew.assign")}
              </button>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-mid)", marginTop: "0.7rem", lineHeight: 1.5 }}>
              <div><strong style={{ color: "var(--text-hi)" }}>{t("crew.passive")}</strong> — {localizedCrewPassive(def)}</div>
              <div><strong style={{ color: "var(--text-hi)" }}>{t("crew.active")}</strong> — {localizedCrewActive(def)} <span style={{ color: "var(--text-dim)" }}>{t("crew.cooldown", { value: def.activeCooldown })}</span></div>
            </div>
            <div style={{ marginTop: "0.6rem" }}>
              <div className="eyebrow" style={{ marginBottom: "0.25rem", display: "flex", justifyContent: "space-between" }}>
                <span>{t("crew.approval")}</span>
                <span>{c.approval}%</span>
              </div>
              <Bar fraction={c.approval / 100} kind="good" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
