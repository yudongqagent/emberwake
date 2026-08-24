import type { ShipRarity, ModuleRarity } from "../../data/types";
import { RarityPips } from "./Icons";
import { language } from "../../i18n/language";

const SHIP_RARITY_LABEL_EN: Record<ShipRarity, string> = {
  salvage: "Salvage",
  standard: "Standard",
  reinforced: "Reinforced",
  advanced: "Advanced",
  prototype: "Prototype",
  ascendant: "Ascendant",
};
const SHIP_RARITY_LABEL_ZH: Record<ShipRarity, string> = {
  salvage: "废品级",
  standard: "标准级",
  reinforced: "强化级",
  advanced: "高级",
  prototype: "原型级",
  ascendant: "超凡级",
};

export function ShipRarityTag({ rarity, showPips = true }: { rarity: ShipRarity; showPips?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "0.3em",
      }}
    >
      <span
        style={{
          color: `var(--rarity-${rarity})`,
          border: `1px solid var(--rarity-${rarity})`,
          background: `linear-gradient(180deg, var(--rarity-${rarity})26, transparent)`,
          borderRadius: 4,
          padding: "0.2em 0.6em",
          fontSize: "0.68rem",
          fontWeight: 700,
          fontFamily: "var(--font-display)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          boxShadow: `0 0 8px var(--rarity-${rarity})33`,
        }}
      >
        {(language.value === "zh" ? SHIP_RARITY_LABEL_ZH : SHIP_RARITY_LABEL_EN)[rarity]}
      </span>
      {showPips && <RarityPips rarity={rarity} />}
    </span>
  );
}

const MODULE_RARITY_COLOR: Record<ModuleRarity, string> = {
  mk1: "#8a97a6",
  mk2: "#5dd6ff",
  mk3: "#5dffb0",
  mk4: "#b98cff",
  mk5: "#ffe25d",
};

export function ModuleRarityTag({ rarity }: { rarity: ModuleRarity }) {
  const color = MODULE_RARITY_COLOR[rarity];
  return (
    <span
      style={{
        color,
        border: `1px solid ${color}`,
        background: `linear-gradient(180deg, ${color}22, transparent)`,
        borderRadius: 4,
        padding: "0.18em 0.55em",
        fontSize: "0.68rem",
        fontWeight: 700,
        fontFamily: "var(--font-display)",
        letterSpacing: "0.04em",
      }}
    >
      {rarity.toUpperCase()}
    </span>
  );
}
