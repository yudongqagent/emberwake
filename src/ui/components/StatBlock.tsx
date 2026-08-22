import type { ComponentChildren } from "preact";

/** Small icon + value readout used across Bridge/Fleet/Modules/Combat instead of "Label: number" text rows. */
export function StatReadout({
  icon,
  value,
  label,
  color,
}: {
  icon: ComponentChildren;
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span style={{ color: color ?? "var(--text-mid)", flex: "none" }}>{icon}</span>
      <div style={{ lineHeight: 1.15 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: "var(--text-hi)" }}>{value}</div>
        <div className="eyebrow" style={{ fontSize: "0.6rem" }}>{label}</div>
      </div>
    </div>
  );
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
