import { state } from "../../state/store";
import type { ResourceType } from "../../data/types";
import { ResourceIcon, RESOURCE_LABEL } from "./Icons";
import { useAnimatedInt } from "../hooks/useAnimatedNumber";

const ORDER: ResourceType[] = ["salvage", "sourcePoints", "alloy", "originEssence", "insight"];

export function ResourceBar() {
  const res = state.value.resources;
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
      {ORDER.map((key) => (
        <ResourceChip key={key} type={key} value={Math.floor(res[key])} />
      ))}
    </div>
  );
}

function ResourceChip({ type, value }: { type: ResourceType; value: number }) {
  const shown = useAnimatedInt(value);
  return (
    <span className="resource-chip" title={RESOURCE_LABEL[type]}>
      <ResourceIcon type={type} size={14} />
      {shown}
    </span>
  );
}
