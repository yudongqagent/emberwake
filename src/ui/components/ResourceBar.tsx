import { state } from "../../state/store";
import type { ResourceType } from "../../data/types";

const RESOURCE_META: Record<ResourceType, { label: string; color: string }> = {
  salvage: { label: "Salvage", color: "var(--res-salvage)" },
  sourcePoints: { label: "Source Pts", color: "var(--res-sourcePoints)" },
  alloy: { label: "Alloy", color: "var(--res-alloy)" },
  originEssence: { label: "Origin Ess.", color: "var(--res-originEssence)" },
  insight: { label: "Insight", color: "var(--res-insight)" },
};

export function ResourceBar() {
  const res = state.value.resources;
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
      {(Object.keys(RESOURCE_META) as ResourceType[]).map((key) => (
        <span key={key} className="resource-chip" title={RESOURCE_META[key].label}>
          <span className="icon-dot" style={{ background: RESOURCE_META[key].color }} />
          {Math.floor(res[key])}
        </span>
      ))}
    </div>
  );
}

export { RESOURCE_META };
