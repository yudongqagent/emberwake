import { flagship, effectiveMaxHull } from "../../state/store";
import { Bar, hullBarKind } from "../components/StatBlock";
import { HullIcon } from "../components/Icons";
import { t } from "../../i18n/strings";

/** 出击 — the between-waves decision on a sortie.
 *
 * Core-loop redesign #5. The rift's push-your-luck structure is the strongest
 * thing in the game and it was walled off in a side mode; this brings the same
 * shape to ordinary POI combat. Hull does not heal between waves, so pressing on
 * is a real bet against a resource you are actively spending.
 *
 * Withdrawing keeps everything drafted along the way and costs only the mission
 * itself. That asymmetry is deliberate: the decision should be "is the objective
 * worth my remaining hull", not "do I dare risk my loot". */
export function SortieInterlude({
  wave,
  total,
  onPress,
  onWithdraw,
  onLoadout,
}: {
  wave: number;
  total: number;
  onPress: () => void;
  onWithdraw: () => void;
  /** 打开配装。抉择刚给了你一件装备,这里必须能把它装上——否则那件装备在这次
   * 出击里完全是死的(实测 2026-08-30)。空槽已经自动装了,这个入口是给"要换掉
   * 已装备的那件"用的:那是有取舍的决定,不该由游戏替玩家做。 */
  onLoadout: () => void;
}) {
  const ship = flagship.value;
  const max = ship ? effectiveMaxHull(ship) : 1;
  const frac = ship ? Math.max(0, Math.min(1, ship.currentHp / max)) : 1;
  const hurt = frac < 0.45;

  return (
    <div
      style={{
        height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "1rem", padding: "1.25rem",
        background: "radial-gradient(circle at 50% 40%, rgba(255,92,92,0.10), transparent 65%), var(--bg)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div className="eyebrow" style={{ color: "var(--amber)" }}>{t("sortie.eyebrow")}</div>
        <div className="title" style={{ fontSize: "1.4rem", marginTop: "0.15rem" }}>
          {t("sortie.cleared", { wave, total })}
        </div>
      </div>

      <div className="panel" style={{ padding: "0.9rem 1rem", width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <HullIcon size={15} color={hurt ? "var(--red)" : "var(--green)"} />
          <span className="eyebrow">{t("combat.hull")}</span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-display)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {ship?.currentHp ?? 0} / {max}
          </span>
        </div>
        <div style={{ marginTop: "0.45rem" }}>
          <Bar fraction={frac} kind={hullBarKind(frac)} />
        </div>
        <div style={{ fontSize: "0.74rem", color: "var(--text-mid)", marginTop: "0.5rem", lineHeight: 1.45 }}>
          {t("sortie.noRepair")}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button className="btn ghost" onClick={onWithdraw}>{t("sortie.withdraw")}</button>
        <button className="btn ghost" onClick={onLoadout}>{t("sortie.loadout")}</button>
        <button className="btn primary" onClick={onPress}>
          {t("sortie.press", { wave: wave + 1, total })}
        </button>
      </div>
      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textAlign: "center", maxWidth: 420 }}>
        {t("sortie.withdrawNote")}
      </div>
    </div>
  );
}
