import { state } from "../../state/store";
import type { ResourceType } from "../../data/types";
import { ResourceIcon, RESOURCE_LABEL } from "./Icons";

const ORDER: ResourceType[] = ["salvage", "sourcePoints", "alloy", "originEssence", "insight"];

export function ResourceBar() {
  const res = state.value.resources;
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
      {ORDER.map((key) => (
        <span key={key} className="resource-chip" title={RESOURCE_LABEL[key]}>
          <ResourceIcon type={key} size={14} />
          {Math.floor(res[key])}
        </span>
      ))}
    </div>
  );
}
