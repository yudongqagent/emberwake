import { NavIcon } from "./Icons";
import { playSfx } from "../../audio/engine";
import { t } from "../../i18n/strings";

export type ConsolePanelId = "bridge" | "ascension" | "fleet" | "modules" | "crew";

const CONSOLE_ITEMS: { id: ConsolePanelId; labelKey: string; color: string }[] = [
  { id: "bridge", labelKey: "nav.bridge", color: "var(--cyan)" },
  { id: "ascension", labelKey: "nav.ascension", color: "var(--green)" },
  { id: "modules", labelKey: "nav.modules", color: "var(--amber)" },
  { id: "crew", labelKey: "nav.crew", color: "var(--violet)" },
  { id: "fleet", labelKey: "nav.fleet", color: "var(--text-mid)" },
];

/** Player direction 2026-08-24: "把最下面的导航栏去掉，这不是一个网页，是一个完整
 * 的游戏" — the bottom tab bar read as a mobile web app, not a game.
 *
 * Navigation is now a console cluster mounted over the viewport instead: it sits
 * inside the world view rather than under it, it's icon-first with the label as
 * support, and the ship's systems read as stations on your own bridge rather than
 * as site sections. Crucially the world never unmounts behind it — opening a
 * panel overlays the live map instead of swapping the page out. */
export function ShipConsole({
  active,
  onSelect,
}: {
  active: ConsolePanelId | null;
  onSelect: (id: ConsolePanelId) => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        right: "calc(0.6rem + var(--safe-right))",
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        zIndex: 3,
        padding: "0.5rem 0.4rem",
        borderRadius: 14,
        border: "1px solid var(--line)",
        background: "rgba(5,8,16,0.55)",
        backdropFilter: "blur(8px)",
      }}
      role="navigation"
      aria-label={t("console.label")}
    >
      {CONSOLE_ITEMS.map(({ id, labelKey, color }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => { playSfx("click"); onSelect(id); }}
            aria-label={t(labelKey)}
            title={t(labelKey)}
            style={{
              width: 46,
              height: 46,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.12rem",
              borderRadius: 10,
              cursor: "pointer",
              border: `1px solid ${isActive ? color : "transparent"}`,
              background: isActive ? `${"color-mix(in srgb, " + color + " 18%, transparent)"}` : "transparent",
              color: isActive ? color : "var(--text-dim)",
              boxShadow: isActive ? `0 0 12px ${color}` : "none",
              transition: "color 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
            }}
          >
            <NavIcon name={id} size={19} color="currentColor" />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "0.48rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              {t(labelKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
