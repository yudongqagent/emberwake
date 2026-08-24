import type { ModuleInstance } from "../../data/types";
import { moduleDefById } from "../../data/modules";
import { computeModuleDamage, computeModuleBlock } from "../../engine/modules";
import { ModuleRarityTag } from "../components/RarityTag";
import { RollQualityBadge } from "../components/StatBlock";
import { ModuleTypeIcon } from "../components/Icons";
import { t } from "../../i18n/strings";
import { localizedModuleName, localizedTrait } from "../../i18n/data";

/** What the Extradimensional Battlefield actually pays out in gear. mk4/mk5
 * modules have no other source in the game — the market is capped and ordinary
 * combat drops are capped with it (section B of the 2026-08-24 brief) — so this
 * reveal is the payoff for having pushed deep, and it says so explicitly. */
export function RiftDropReveal({ drop, onClose }: { drop: ModuleInstance; onClose: () => void }) {
  const def = moduleDefById(drop.defId);
  const topTier = drop.rarity === "mk4" || drop.rarity === "mk5";
  return (
    <div
      style={{
        height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "1.25rem", gap: "0.9rem",
        background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--rarity-${drop.rarity}) 22%, transparent), transparent 65%), var(--bg)`,
      }}
    >
      <div className="eyebrow" style={{ color: "var(--violet)" }}>{t("rift.title")}</div>

      <div
        className="panel accent scanline pop-in"
        style={{ padding: "1.4rem 1.5rem", textAlign: "center", minWidth: "min(320px, 92vw)", ["--accent" as any]: `var(--rarity-${drop.rarity})` }}
      >
        <div className="eyebrow" style={{ color: `var(--rarity-${drop.rarity})`, marginBottom: "0.6rem" }}>
          {topTier ? t("rift.topTierDrop") : t("rift.drop")}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
          <ModuleTypeIcon type={def.type} size={20} />
          <span style={{ fontSize: "1.2rem", fontWeight: 800, fontFamily: "var(--font-display)" }}>
            {localizedModuleName(def)}
          </span>
        </div>

        <div style={{ marginTop: "0.55rem", display: "flex", justifyContent: "center", gap: "0.5rem", alignItems: "center" }}>
          <ModuleRarityTag rarity={drop.rarity} />
          <RollQualityBadge roll={drop.quality} />
        </div>

        <div style={{ marginTop: "0.6rem", fontSize: "0.82rem", color: "var(--text-mid)" }}>
          {def.baseDamage !== undefined && t("combat.dmgLabel", { value: computeModuleDamage(drop) })}
          {def.baseBlock !== undefined && t("combat.blockLabel", { value: computeModuleBlock(drop) })}
        </div>

        {drop.traits.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", justifyContent: "center", marginTop: "0.7rem" }}>
            {drop.traits.map((traitId, i) => (
              <span key={i} style={{ fontSize: "0.68rem", padding: "0.15em 0.5em", borderRadius: 999, border: "1px solid var(--violet)", color: "var(--violet)" }}>
                {localizedTrait(def, traitId).label}
              </span>
            ))}
          </div>
        )}

        {topTier && (
          <div style={{ marginTop: "0.85rem", fontSize: "0.7rem", color: "var(--amber)" }}>
            {t("rift.topTierNote")}
          </div>
        )}
      </div>

      <button className="btn primary" style={{ minWidth: 180, padding: "0.65em" }} onClick={onClose}>
        {t("station.nice")}
      </button>
    </div>
  );
}
