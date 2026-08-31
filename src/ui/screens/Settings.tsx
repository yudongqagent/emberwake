import { useState } from "preact/hooks";
import { getSettings, updateSettings, type TextSpeed } from "../../engine/settings";
import { setMuted, setVolume, playSfx } from "../../audio/engine";
import { refreshMusicVolume } from "../../audio/music";
import { clearSave, recoverableSave, restoreSave } from "../../engine/save";
import { t } from "../../i18n/strings";
import { language, setLanguage } from "../../i18n/language";

/** Commercial-gap audit #6: the game had no settings screen at all. Mute was a
 * bare icon in the top bar; there was no volume, no text speed, no way to start
 * over, and no motion control. Those are table stakes for the quality bar this
 * project is aiming at, and two of them (volume, reduced motion) are
 * accessibility rather than polish. */
export function Settings({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState(getSettings());

  function patch(p: Parameters<typeof updateSettings>[0]) {
    setS({ ...updateSettings(p) });
  }

  const speeds: TextSpeed[] = ["slow", "normal", "fast", "instant"];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem", background: "rgba(4,3,8,0.82)", backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{ width: "100%", maxWidth: 460, maxHeight: "88%", overflowY: "auto", padding: "1.1rem" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="title" style={{ fontSize: "1.15rem", marginBottom: "0.9rem" }}>{t("settings.title")}</div>

        {/* --- Audio --- */}
        <Row label={t("settings.volume")}>
          <input
            type="range" min={0} max={100} value={Math.round(s.volume * 100)}
            aria-label={t("settings.volume")}
            style={{ width: 150 }}
            onInput={(e) => {
              const v = Number((e.target as HTMLInputElement).value) / 100;
              setVolume(v);
              patch({ volume: v });
              refreshMusicVolume();
            }}
          />
          <span style={{ minWidth: 38, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--text-mid)" }}>
            {Math.round(s.volume * 100)}%
          </span>
        </Row>

        <Row label={t("settings.mute")}>
          <Toggle
            on={s.muted}
            label={t("settings.mute")}
            onChange={(v) => { setMuted(v); patch({ muted: v }); refreshMusicVolume(); if (!v) playSfx("click"); }}
          />
        </Row>

        {/* --- Text --- */}
        <Row label={t("settings.textSpeed")}>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {speeds.map((sp) => (
              <button
                key={sp}
                className={`btn ${s.textSpeed === sp ? "primary" : "ghost"}`}
                style={{ fontSize: "0.66rem", padding: "0.3em 0.55em" }}
                onClick={() => { patch({ textSpeed: sp }); playSfx("click"); }}
              >
                {t(`settings.speed.${sp}`)}
              </button>
            ))}
          </div>
        </Row>

        <Row label={t("settings.reduceMotion")} hint={t("settings.reduceMotionHint")}>
          <Toggle
            on={s.reduceMotion}
            label={t("settings.reduceMotion")}
            onChange={(v) => patch({ reduceMotion: v })}
          />
        </Row>

        <Row label={t("settings.language")}>
          <button
            className="btn ghost"
            style={{ fontSize: "0.72rem", padding: "0.35em 0.7em" }}
            onClick={() => { setLanguage(language.value === "zh" ? "en" : "zh"); playSfx("click"); }}
          >
            {t("nav.language")}
          </button>
        </Row>

        <div style={{ borderTop: "1px solid var(--line)", marginTop: "0.9rem", paddingTop: "0.9rem" }}>
          <RecoverPreviousRun />
          <DangerZone />
        </div>

        <button className="btn primary" style={{ width: "100%", marginTop: "1rem" }} onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: preact.ComponentChildren }) {
  return (
    <div style={{ padding: "0.55rem 0", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
        <span style={{ fontSize: "0.82rem", color: "var(--text-hi)" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>{children}</div>
      </div>
      {hint && <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>{hint}</div>}
    </div>
  );
}

function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: "pointer", position: "relative",
        border: `1px solid ${on ? "var(--cyan)" : "var(--line)"}`,
        background: on ? "rgba(93,214,255,0.2)" : "transparent",
        transition: "background 150ms ease, border-color 150ms ease",
      }}
    >
      <span
        style={{
          position: "absolute", top: 2, left: on ? 22 : 2,
          width: 18, height: 18, borderRadius: "50%",
          background: on ? "var(--cyan)" : "var(--text-dim)",
          transition: "left 150ms ease, background 150ms ease",
        }}
      />
    </button>
  );
}

/** Deleting a campaign is irreversible, so it takes two deliberate actions and
 * says exactly what it destroys. */
/** 找回上一次的战役。
 *
 * 存档恢复的横幅原来会在**每一次正常的重开**之后弹出来(判定是"新存档 flag 比
 * 备份少",而刚重开的存档 flag 就是 0)。横幅现在只在存档真的出问题时出现,
 * 所以主动找回的入口挪到这里——安全网必须还在,只是不再追着人问。 */
function RecoverPreviousRun() {
  const [candidate] = useState(() => recoverableSave());
  const [armed, setArmed] = useState(false);
  if (!candidate) return null;
  const flags = Object.keys(candidate.state.flags).length;
  const lvl = candidate.state.ships[0]?.level ?? 1;
  if (!armed) {
    return (
      <button className="btn ghost" style={{ width: "100%" }} onClick={() => setArmed(true)}>
        {t("settings.recover")}
      </button>
    );
  }
  return (
    <div className="panel accent" style={{ padding: "0.7rem", ["--accent" as never]: "var(--amber)" }}>
      <div style={{ fontSize: "0.76rem", color: "var(--text-mid)", lineHeight: 1.45 }}>
        {t("settings.recoverWarn", { flags, level: lvl })}
      </div>
      <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.55rem" }}>
        <button className="btn ghost" style={{ flex: 1 }} onClick={() => setArmed(false)}>{t("common.cancel")}</button>
        <button
          className="btn primary"
          style={{ flex: 1 }}
          onClick={() => { restoreSave(candidate.state); location.reload(); }}
        >
          {t("settings.recoverConfirm")}
        </button>
      </div>
    </div>
  );
}

function DangerZone() {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button className="btn ghost" style={{ width: "100%", color: "var(--red)" }} onClick={() => setArmed(true)}>
        {t("settings.reset")}
      </button>
    );
  }
  return (
    <div className="panel accent" style={{ padding: "0.7rem", ["--accent" as never]: "var(--red)" }}>
      <div style={{ fontSize: "0.76rem", color: "var(--text-mid)", lineHeight: 1.45 }}>{t("settings.resetWarn")}</div>
      <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.55rem" }}>
        <button className="btn ghost" style={{ flex: 1 }} onClick={() => setArmed(false)}>{t("common.cancel")}</button>
        <button
          className="btn danger"
          style={{ flex: 1 }}
          onClick={() => {
            // Reloading rather than swapping state in place: a full restart
            // should put the player back at the title with every screen's local
            // state cleared, which is exactly what a reload guarantees. The
            // previous campaign survives in the rolling backup either way.
            clearSave();
            location.reload();
          }}
        >
          {t("settings.resetConfirm")}
        </button>
      </div>
    </div>
  );
}
