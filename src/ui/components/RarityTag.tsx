import type { ShipRarity, ModuleRarity } from "../../data/types";

const SHIP_RARITY_LABEL: Record<ShipRarity, string> = {
  salvage: "Salvage",
  standard: "Standard",
  reinforced: "Reinforced",
  advanced: "Advanced",
  prototype: "Prototype",
  ascendant: "Ascendant",
};

export function ShipRarityTag({ rarity }: { rarity: ShipRarity }) {
  return (
    <span
      style={{
        color: `var(--rarity-${rarity})`,
        border: `1px solid var(--rarity-${rarity})`,
        borderRadius: 4,
        padding: "0.1em 0.5em",
        fontSize: "0.72rem",
        fontFamily: "var(--font-display)",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      {SHIP_RARITY_LABEL[rarity]}
    </span>
  );
}

export function ModuleRarityTag({ rarity }: { rarity: ModuleRarity }) {
  return (
    <span
      style={{
        color: "var(--cyan)",
        border: "1px solid var(--cyan-dim)",
        borderRadius: 4,
        padding: "0.1em 0.5em",
        fontSize: "0.72rem",
        fontFamily: "var(--font-display)",
      }}
    >
      {rarity.toUpperCase()}
    </span>
  );
}
