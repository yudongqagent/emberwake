import type { ComponentChildren } from "preact";
import { useAnimatedInt } from "../hooks/useAnimatedNumber";

/** Small icon + value readout used across Bridge/Fleet/Modules/Combat instead of "Label: number" text rows.
 * Numeric values count up/down on change (see docs/visual-standards.md §2) instead of snapping;
 * string values (aptitude letters, "??", pre-formatted text) render as-is. */
export function StatReadout({
  icon,
  value,
  label,
  color,
}: {
  icon: ComponentChildren;
  value: string | number | ComponentChildren;
  label: string;
  color?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span style={{ color: color ?? "var(--text-mid)", flex: "none" }}>{icon}</span>
      <div style={{ lineHeight: 1.15 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: "var(--text-hi)" }}>
          {typeof value === "number" ? <AnimatedInt value={value} /> : value}
        </div>
        <div className="eyebrow" style={{ fontSize: "0.6rem" }}>{label}</div>
      </div>
    </div>
  );
}

function AnimatedInt({ value }: { value: number }) {
  return <>{useAnimatedInt(value)}</>;
}

/** A "current/max" pair (hull, XP, etc.) where both halves animate on the same
 * timescale as their paired bar — the exact seam docs/visual-standards.md §2 was
 * written to close (a bar that eases in next to a number that snaps). */
export function AnimatedFraction({ current, max }: { current: number; max: number }) {
  const shownCurrent = useAnimatedInt(current);
  const shownMax = useAnimatedInt(max);
  return <>{shownCurrent}/{shownMax}</>;
}

export function Bar({ fraction, kind }: { fraction: number; kind: "hull" | "good" | "warn" | "danger" | "progress" }) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div className="bar-track">
      <div className={`bar-fill ${kind}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function hullBarKind(fraction: number): "good" | "warn" | "danger" {
  if (fraction > 0.5) return "good";
  if (fraction > 0.2) return "warn";
  return "danger";
}

/** Makes an item's random roll legible: every draw lands somewhere in its rarity's
 * range, and this is where. High rolls get a distinct celebratory treatment so the
 * variance actually reads as exciting rather than invisible. */
export function RollQualityBadge({ roll, label = "Roll" }: { roll: number; label?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, roll)) * 100);
  const color = pct >= 80 ? "var(--amber)" : pct >= 50 ? "var(--cyan)" : pct >= 25 ? "var(--text-mid)" : "var(--red)";
  const callout = pct >= 85 ? "High Roll!" : pct <= 15 ? "Low Roll" : null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4em" }}>
      <span
        style={{
          fontSize: "0.62rem",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          color,
          textShadow: pct >= 85 ? `0 0 6px ${color}` : "none",
        }}
      >
        {label} {pct}%
      </span>
      {callout && (
        <span
          className="eyebrow"
          style={{ color, border: `1px solid ${color}`, borderRadius: 999, padding: "0.05em 0.5em", fontSize: "0.58rem" }}
        >
          {callout}
        </span>
      )}
    </span>
  );
}
