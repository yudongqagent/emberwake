import type { ComponentChildren } from "preact";
import { t } from "../../i18n/strings";
import { playSfx } from "../../audio/engine";

/** A ship-system panel drawn OVER the live world view rather than replacing it —
 * the same treatment StationPanel already used, generalised so every console
 * screen (bridge, ascension, modules, crew, fleet) works the same way.
 *
 * The point (player direction 2026-08-24): the game world should never blink out
 * to show you a page. The map keeps running underneath; you're opening a console
 * on your own ship, not navigating a site. */
export function ConsoleOverlay({
  title,
  accent = "var(--cyan)",
  onClose,
  children,
}: {
  title: string;
  accent?: string;
  onClose: () => void;
  children: ComponentChildren;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 4,
        display: "flex",
        flexDirection: "column",
        // Deliberately not fully opaque: the world stays faintly visible behind
        // the console, so the player never loses the sense of being somewhere.
        background: "linear-gradient(to bottom, rgba(3,5,9,0.93), rgba(3,5,9,0.97))",
        backdropFilter: "blur(6px)",
        animation: "consoleIn 160ms ease-out",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          padding: "0.7rem 1rem",
          borderBottom: `1px solid ${accent}`,
          background: `linear-gradient(to right, color-mix(in srgb, ${accent} 12%, transparent), transparent)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
          <span style={{ width: 3, height: 18, background: accent, borderRadius: 2, flex: "none", boxShadow: `0 0 8px ${accent}` }} />
          <span
            className="title"
            style={{ fontSize: "0.95rem", color: accent, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {title}
          </span>
        </div>
        <button
          className="btn ghost"
          style={{ flex: "none", padding: "0.4em 0.75em" }}
          onClick={() => { playSfx("click"); onClose(); }}
          aria-label={t("common.close")}
        >
          ✕
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>{children}</div>
    </div>
  );
}
