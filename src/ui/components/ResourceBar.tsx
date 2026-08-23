import { useState } from "preact/hooks";
import { state } from "../../state/store";
import type { ResourceType } from "../../data/types";
import { ResourceIcon, RESOURCE_LABEL, RESOURCE_INFO } from "./Icons";
import { useAnimatedInt } from "../hooks/useAnimatedNumber";

const ORDER: ResourceType[] = ["salvage", "sourcePoints", "alloy", "originEssence", "insight"];

/** Issue #2 (2026-08 playtest, docs/design-principles.md Player-Tested
 * Anti-Patterns): resources need to be legible — what each one is for, where to
 * spend it. A hover title doesn't work on touch (tenet 8, touch/mouse parity), so
 * this is tap-to-reveal: one resource's info panel open at a time, dismissed by
 * tapping it again or anywhere else. */
export function ResourceBar() {
  const res = state.value.resources;
  const [openType, setOpenType] = useState<ResourceType | null>(null);
  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {ORDER.map((key) => (
          <ResourceChip
            key={key}
            type={key}
            value={Math.floor(res[key])}
            open={openType === key}
            onToggle={() => setOpenType((cur) => (cur === key ? null : key))}
          />
        ))}
      </div>
      {openType && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 29 }}
          onClick={() => setOpenType(null)}
        />
      )}
    </div>
  );
}

function ResourceChip({
  type,
  value,
  open,
  onToggle,
}: {
  type: ResourceType;
  value: number;
  open: boolean;
  onToggle: () => void;
}) {
  const shown = useAnimatedInt(value);
  return (
    <span style={{ position: "relative" }}>
      <button
        className="resource-chip"
        style={{ cursor: "pointer", font: "inherit", color: "inherit" }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-label={`${RESOURCE_LABEL[type]}: what is this for?`}
      >
        <ResourceIcon type={type} size={14} />
        {shown}
      </button>
      {open && (
        <div
          className="panel pop-in"
          style={{
            position: "absolute",
            top: "calc(100% + 0.4rem)",
            left: 0,
            width: 220,
            padding: "0.65rem 0.75rem",
            zIndex: 30,
            fontSize: "0.74rem",
            lineHeight: 1.4,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.35rem" }}>
            <ResourceIcon type={type} size={15} />
            <span style={{ fontWeight: 700, color: "var(--text-hi)" }}>{RESOURCE_LABEL[type]}</span>
          </div>
          <div style={{ color: "var(--text-mid)" }}>{RESOURCE_INFO[type]}</div>
        </div>
      )}
    </span>
  );
}
