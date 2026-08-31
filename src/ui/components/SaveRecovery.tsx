import { useState } from "preact/hooks";
import { recoverableSave, getLastLoadOutcome, restoreSave, type LoadOutcome } from "../../engine/save";
import type { GameState } from "../../engine/save";
import { t } from "../../i18n/strings";

/** Player report (2026-08-25): "我的任务也没了 ... 修复之前存档".
 *
 * The engine side of this now repairs damaged saves instead of silently throwing
 * them away, and keeps a rolling backup. But a player whose campaign has ALREADY
 * been replaced needs a way back, and they can't get one from a fix that only
 * prevents the next occurrence. This is that way back.
 *
 * It only offers itself when there is genuinely something better to return to:
 * a stored campaign with real progress, while the live save has less. Silence is
 * the correct behaviour in every other case — a recovery prompt that appears on a
 * healthy save would be its own bug. */
export function SaveRecovery({
  current,
  onRestore,
  suppressed = false,
}: {
  current: GameState;
  onRestore: (s: GameState) => void;
  /** 玩家自己刚点了"新的开始"。
   *
   * 实测(2026-08-30):新玩家点「新的开始」→ 在覆盖警告上确认 → 开场散文刚出来,
   * 这个横幅就压在上面问他"要不要恢复之前的存档"。判定用的是"新存档的 flag 比
   * 备份少",而刚重开的存档 flag 当然是 0 —— 于是每一次**正常的**重开都会触发。
   *
   * 恢复提示是给"存档在玩家没要求的情况下丢了"用的,不是给"玩家自己选择重来"
   * 用的。备份不删(重开是可逆的),只是不再追问;入口在设置里。 */
  suppressed?: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [outcome] = useState<LoadOutcome>(() => getLastLoadOutcome());
  const [candidate] = useState(() => recoverableSave());

  if (dismissed || suppressed) return null;

  const currentProgress = Object.keys(current.flags).length;
  const better = candidate && Object.keys(candidate.state.flags).length > currentProgress;
  // Nothing worth saying: either no stored campaign, or the live one is ahead.
  if (!better && outcome !== "quarantined") return null;

  const banner = (children: preact.ComponentChildren, accent: string) => (
    <div
      style={{
        position: "fixed", left: 0, right: 0, top: 0, zIndex: 200,
        display: "flex", justifyContent: "center",
        padding: "calc(0.6rem + var(--safe-top)) 0.75rem 0.6rem",
        pointerEvents: "none",
      }}
    >
      <div
        className="panel accent scanline"
        style={{
          pointerEvents: "auto", maxWidth: 560, width: "100%",
          padding: "0.8rem 1rem", ["--accent" as any]: accent,
          animation: "consoleIn 260ms ease-out both",
        }}
      >
        {children}
      </div>
    </div>
  );

  if (!better) {
    // Unreadable save: say so plainly and promise nothing was destroyed.
    return banner(
      <>
        <div className="eyebrow" style={{ color: "var(--amber)" }}>{t("recover.title")}</div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-mid)", marginTop: "0.3rem" }}>
          {t("recover.quarantined")}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.6rem" }}>
          <button className="btn ghost" onClick={() => setDismissed(true)}>{t("recover.dismiss")}</button>
        </div>
      </>,
      "var(--amber)",
    );
  }

  const s = candidate!.state;
  return banner(
    <>
      <div className="eyebrow" style={{ color: "var(--green)" }}>{t("recover.title")}</div>
      <div style={{ fontSize: "0.8rem", color: "var(--text-mid)", marginTop: "0.3rem", lineHeight: 1.5 }}>
        {t("recover.body", {
          flags: Object.keys(s.flags).length,
          ship: s.ships[0]?.name ?? "—",
          level: s.ships[0]?.level ?? 1,
        })}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.7rem", flexWrap: "wrap" }}>
        <button className="btn ghost" onClick={() => setDismissed(true)}>{t("recover.dismiss")}</button>
        <button
          className="btn primary"
          onClick={() => {
            restoreSave(s);
            onRestore(s);
            setDismissed(true);
          }}
        >
          {t("recover.restore")}
        </button>
      </div>
    </>,
    "var(--green)",
  );
}
