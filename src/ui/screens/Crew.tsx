import { state, flagship, assignCrew } from "../../state/store";
import { crewDefById } from "../../data/crew";
import type { CrewRole } from "../../data/types";
import { CrewRoleIcon, CREW_ROLE_COLOR, CREW_RARITY_COLOR } from "../components/Icons";
import { Bar } from "../components/StatBlock";
import { t } from "../../i18n/strings";
import { approvalEffects, approvalTier, approvalGainForWin, APPROVAL_PER_WIN, CREW_ALLEGIANCE } from "../../data/crewApproval";
import { localizedCrewName, localizedCrewPassive, localizedCrewActive } from "../../i18n/data";

const STATIONS: CrewRole[] = ["helm", "gunner", "engineer", "tactician"];

/** Section E (2026-08-24 player brief): crew are recruited through story (or, for
 * generic reinforcements, the Recruit tab — see StationPanel.tsx), then assigned
 * to one of 4 fixed stations, one crew member per station — not an unlimited
 * stack. This screen groups the roster by station so the exclusivity (and who's
 * about to get bumped) is visible before you click, not a surprise after. */
export function Crew() {
  const ship = flagship.value;
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
      <div className="title" style={{ fontSize: "1.2rem" }}>{t("crew.roster")}</div>
      <div style={{ color: "var(--text-mid)", fontSize: "0.82rem" }}>{t("crew.stationHint")}</div>
      {state.value.crew.length === 0 && (
        <div className="panel" style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-dim)" }}>
          {t("crew.empty")}
        </div>
      )}
      {STATIONS.map((role) => {
        const roster = state.value.crew.filter((c) => crewDefById(c.defId).role === role);
        if (roster.length === 0) return null;
        const stationed = roster.find((c) => c.assignedShipId === ship?.id);
        return (
          <div key={role} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div className="eyebrow" style={{ color: CREW_ROLE_COLOR[role], display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <CrewRoleIcon role={role} size={14} />
              {t(`crewRole.${role}`)} {t("crew.stationLabel")}
              {!stationed && <span style={{ color: "var(--text-dim)", fontWeight: 400, textTransform: "none" }}> — {t("crew.stationEmpty")}</span>}
            </div>
            {roster.map((c) => {
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
                      title={!assigned && stationed ? t("crew.willReplace", { name: localizedCrewName(crewDefById(stationed.defId)) }) : undefined}
                    >
                      {assigned ? t("crew.stationed") : t("crew.station")}
                    </button>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-mid)", marginTop: "0.7rem", lineHeight: 1.5 }}>
                    <div><strong style={{ color: "var(--text-hi)" }}>{t("crew.passive")}</strong> — {localizedCrewPassive(def)}</div>
                    <div><strong style={{ color: "var(--text-hi)" }}>{t("crew.active")}</strong> — {localizedCrewActive(def)} <span style={{ color: "var(--text-dim)" }}>{t("crew.cooldown", { value: def.activeCooldown })}</span></div>
                  </div>
                  {/* 支持度从前是个死字段:初始化成 50,画了条,然后没人读也没人改。
                      现在它决定被动强度和主动冷却,所以必须把**后果**写出来——
                      光有一个百分比,玩家还是不知道它意味着什么。 */}
                  {(() => {
                    const eff = approvalEffects(c.approval);
                    const side = CREW_ALLEGIANCE[def.id];
                    return (
                      <div style={{ marginTop: "0.6rem" }}>
                        <div className="eyebrow" style={{ marginBottom: "0.25rem", display: "flex", justifyContent: "space-between" }}>
                          <span>{t("crew.approval")}</span>
                          <span>{t(`crew.approvalTier.${approvalTier(c.approval)}`)} · {c.approval}%</span>
                        </div>
                        <Bar fraction={c.approval / 100} kind={c.approval < 40 ? "danger" : "good"} />
                        <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "0.35rem", lineHeight: 1.5 }}>
                          {t("crew.approvalEffect", {
                            passive: Math.round(eff.passiveMultiplier * 100),
                            cooldown: Math.round(eff.cooldownMultiplier * 100),
                          })}
                          {/* 没上岗的人支持度是**冻住**的:adjustAssignedCrewApproval
                              只动 assignedShipId 匹配的船员。而第 36 轮起,支持度
                              决定所有被动的强度——于是"这个数为什么一直不动"变成
                              一个玩家自己看不出答案的问题。 */}
                          {/* 下一场胜利能涨多少——低档涨得更快(approvalGainForWin)。
                              不写出来的话,玩家在「记恨」档只看得见自己变弱,看不见
                              爬出去的那条路有多陡。只在真的被放大时才显示。 */}
                          {assigned && approvalGainForWin(c.approval) > APPROVAL_PER_WIN && (
                            <> <span style={{ color: "var(--green)" }}>
                              {t("crew.approvalCatchUp", { gain: approvalGainForWin(c.approval) })}
                            </span></>
                          )}
                          {!assigned && (
                            <> <span style={{ color: "var(--amber)" }}>{t("crew.approvalFrozen")}</span></>
                          )}
                          {side && <> {t("crew.allegiance", { faction: t(`faction.${side}`) })}</>}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
