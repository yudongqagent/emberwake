import { useState } from "preact/hooks";
import { state, flagship, equipModule, spend, canAfford, sellModule, upgradeModule, isDesignEquipped } from "../../state/store";
import { hullClassById } from "../../data/hullClasses";
import { powerStrainMultiplier } from "../../engine/combat";
import { computePowerCapacity } from "../../engine/ships";
import { moduleDefById, fabricatorCost, MODULE_RARITY_ORDER } from "../../data/modules";
import { moduleEffectById } from "../../data/moduleEffects";
import { computeModuleDamage, computeModuleBlock, lockTrait, qualityMultiplier, isModuleMaxed, moduleUpgradeCost, moduleMaxLevel } from "../../engine/modules";
import { pickOne } from "../../engine/rng";
import { ModuleRarityTag } from "../components/RarityTag";
import { ModuleTypeIcon, MODULE_TYPE_COLOR, PowerIcon, ResourceIcon } from "../components/Icons";
import { Bar, RollQualityBadge, AnimatedFraction } from "../components/StatBlock";
import { LoadoutDiagram } from "../components/LoadoutDiagram";
import type { ModuleType, ModuleInstance } from "../../data/types";
import { t } from "../../i18n/strings";
import { localizedModuleName, localizedTrait } from "../../i18n/data";

const TYPE_ORDER: ModuleType[] = ["weapon", "armor", "engine", "utility"];

function slotLayout(hullClassId: string) {
  const def = hullClassById(hullClassId);
  const layout: { type: ModuleType; index: number }[] = [];
  let idx = 0;
  for (const type of TYPE_ORDER) {
    for (let i = 0; i < def.slots[type]; i++) {
      layout.push({ type, index: idx });
      idx += 1;
    }
  }
  return layout;
}

export function Modules() {
  const ship = flagship.value;
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  if (!ship) return <div style={{ padding: "1rem" }}>{t("modules.noFlagship")}</div>;

  const layout = slotLayout(ship.hullClass);
  // Capacitor (data/moduleEffects.ts) trims the draw of every fitted module, so a
  // capacitor engine buys room for a heavier loadout rather than just adding stats.
  const capacitorStacks = ship.equipped.filter((id) => {
    if (!id) return false;
    const m = state.value.modules.find((x) => x.id === id);
    if (!m) return false;
    const d = moduleDefById(m.defId);
    return d.signature === "capacitor" || m.traits.includes("capacitor");
  }).length;
  const drawMult = Math.max(0.6, 1 - 0.12 * capacitorStacks);
  const usedPower = Math.round(ship.equipped.reduce((sum, id) => {
    if (!id) return sum;
    const mod = state.value.modules.find((m) => m.id === id);
    return sum + (mod ? moduleDefById(mod.defId).powerDraw : 0);
  }, 0) * drawMult);
  const capacity = computePowerCapacity(ship);
  const overdrawn = usedPower > capacity;
  const equippedIds = new Set(ship.equipped.filter(Boolean));
  const inventory = state.value.modules.filter((m) => !equippedIds.has(m.id));

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div className="title" style={{ fontSize: "1.2rem" }}>{t("modules.titleFor", { ship: ship.name })}</div>

      <div className="panel" style={{ padding: "0.9rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PowerIcon size={18} color="var(--amber)" />
            <span className="eyebrow">{t("modules.powerDraw")}</span>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: overdrawn ? "var(--red)" : "var(--text-hi)" }}>
            <AnimatedFraction current={usedPower} max={capacity} />
          </span>
        </div>
        <div style={{ marginTop: "0.5rem" }}>
          <Bar fraction={capacity ? Math.min(1, usedPower / capacity) : 0} kind={overdrawn ? "danger" : "warn"} />
        </div>
        {/* Weapon-system audit #3: this bar used to turn red and mean nothing —
            equipModule had no check and combat never read it. Overdraw now
            stretches weapon cooldowns, so the warning states its actual cost. */}
        {overdrawn && (
          <div style={{ marginTop: "0.45rem", fontSize: "0.72rem", color: "var(--red)", lineHeight: 1.4 }}>
            {t("modules.overdrawn", { pct: Math.round((powerStrainMultiplier(usedPower, capacity) - 1) * 100) })}
          </div>
        )}
      </div>

      {/* The loadout, shown as a ship rather than a form — hardpoints arranged
          around the hull, filled sockets glowing in their type colour. Clicking a
          socket jumps to that slot's picker. */}
      <div className="panel" style={{ padding: "0.5rem" }}>
        <LoadoutDiagram
          slots={layout.map((slot) => ({
            index: slot.index,
            type: slot.type,
            filled: !!ship.equipped[slot.index],
            active: pickerSlot === slot.index,
          }))}
          onSelectSlot={(i) => setPickerSlot(i)}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "0.65rem" }}>
        {layout.map((slot) => {
          const modId = ship.equipped[slot.index];
          const mod = modId ? state.value.modules.find((m) => m.id === modId) : null;
          const def = mod ? moduleDefById(mod.defId) : null;
          const typeColor = MODULE_TYPE_COLOR[slot.type];
          return (
            <div key={slot.index} className={`panel ${mod ? "accent" : ""}`} style={{ padding: "0.85rem", ["--accent" as any]: typeColor }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <ModuleTypeIcon type={slot.type} size={15} />
                <span className="eyebrow" style={{ color: typeColor }}>{t(`moduleType.${slot.type}`)}</span>
              </div>
              {mod && def ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.4rem" }}>
                    <span style={{ fontWeight: 700 }}>{localizedModuleName(def)}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span className="eyebrow" style={{ color: "var(--amber)" }}>
                        {t("modules.levelShort", { level: mod.level })}
                      </span>
                      <ModuleRarityTag rarity={mod.rarity} />
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.9rem", fontSize: "0.76rem", color: "var(--text-mid)", margin: "0.45rem 0" }}>
                    <span>{t("modules.pwr", { value: def.powerDraw })}</span>
                    <span>{t("modules.cd", { value: def.cooldown ?? "—" })}</span>
                    {def.baseDamage ? <span style={{ color: "var(--red)" }}>{t("modules.dmg", { value: computeModuleDamage(mod) })}</span> : null}
                    {def.baseBlock ? <span style={{ color: "var(--cyan)" }}>{t("modules.block", { value: computeModuleBlock(mod) })}</span> : null}
                  </div>
                  {(def.baseDamage !== undefined || def.baseBlock !== undefined) && (
                    <div style={{ marginBottom: "0.5rem" }}>
                      <RollQualityBadge roll={mod.quality} />
                    </div>
                  )}
                  {(() => {
                    const sig = moduleEffectById(def.signature);
                    if (!sig) return null;
                    const loc = localizedTrait(def, def.signature);
                    return (
                      <div style={{ margin: "0.4rem 0", padding: "0.4rem 0.55rem", borderRadius: 5, border: "1px solid var(--violet)", background: "rgba(185,140,255,0.08)" }}>
                        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--violet)" }}>★ {loc.label}</div>
                        <div style={{ fontSize: "0.66rem", color: "var(--text-mid)", marginTop: "0.12rem" }}>{loc.description}</div>
                      </div>
                    );
                  })()}
                  <UpgradeRow mod={mod} />
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button className="btn" onClick={() => setPickerSlot(slot.index)}>{t("modules.swap")}</button>
                    <button className="btn danger" onClick={() => equipModule(ship.id, slot.index, null)}>{t("modules.remove")}</button>
                  </div>
                  <LockRow moduleId={mod.id} traits={mod.traits} />
                </>
              ) : (
                <button className="btn ghost" style={{ marginTop: "0.6rem", width: "100%" }} onClick={() => setPickerSlot(slot.index)}>
                  {t("modules.emptySocket")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <InventoryPanel inventory={inventory} />

      {pickerSlot !== null && (
        <PickerModal
          type={layout.find((l) => l.index === pickerSlot)!.type}
          options={inventory.filter((m) => moduleDefById(m.defId).type === layout.find((l) => l.index === pickerSlot)!.type)}
          onPick={(modId) => {
            equipModule(ship.id, pickerSlot, modId);
            setPickerSlot(null);
          }}
          onClose={() => setPickerSlot(null)}
          shipId={ship.id}
          slotIndex={pickerSlot}
        />
      )}
    </div>
  );
}

/** Issue #7 (docs/design-principles.md Player-Tested Anti-Patterns #5): QoL has to
 * scale with content volume. More rarities and more Fabricator draws means modules
 * pile up fast — this keeps the best copy of each archetype and clears the rest in
 * one click, instead of forcing manual cleanup one item at a time. */
function InventoryPanel({ inventory }: { inventory: ModuleInstance[] }) {
  const [lastSale, setLastSale] = useState<{ count: number; refund: number } | null>(null);

  const duplicateIdsToSell = findDuplicatesToSell(inventory);
  const duplicateRefund = duplicateIdsToSell.reduce((sum, id) => {
    const mod = inventory.find((m) => m.id === id);
    return sum + (mod ? Math.round(fabricatorCost(mod.rarity) * 0.4) : 0);
  }, 0);

  if (inventory.length === 0 && !lastSale) return null;

  return (
    <div className="panel" style={{ padding: "0.9rem 1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="eyebrow">{t("modules.inventory", { count: inventory.length })}</span>
        {duplicateIdsToSell.length > 0 && (
          <button
            className="btn ghost"
            style={{ fontSize: "0.68rem", padding: "0.35em 0.65em" }}
            onClick={() => {
              duplicateIdsToSell.forEach((id) => sellModule(id));
              setLastSale({ count: duplicateIdsToSell.length, refund: duplicateRefund });
            }}
          >
            {t("modules.autoSellDuplicates", { count: duplicateIdsToSell.length, refund: duplicateRefund })} <ResourceIcon type="sourcePoints" size={11} />
          </button>
        )}
      </div>
      {lastSale && (
        <div style={{ fontSize: "0.72rem", color: "var(--green)" }}>
          {t("modules.soldDuplicates", { count: lastSale.count, plural: lastSale.count === 1 ? "" : "s", refund: lastSale.refund })}
        </div>
      )}
      {inventory.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {inventory.map((m) => {
            const def = moduleDefById(m.defId);
            const refund = Math.round(fabricatorCost(m.rarity) * 0.4);
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                  <ModuleTypeIcon type={def.type} size={14} />
                  <span style={{ fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{localizedModuleName(def)}</span>
                  <ModuleRarityTag rarity={m.rarity} />
                </div>
                <button
                  className="btn ghost"
                  style={{ fontSize: "0.66rem", padding: "0.3em 0.55em", flex: "none" }}
                  onClick={() => {
                    sellModule(m.id);
                    setLastSale({ count: 1, refund });
                  }}
                >
                  {t("modules.sellPlus", { value: refund })}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** For every module archetype with 2+ unequipped copies, keeps the single best one
 * (highest rarity, then highest quality roll) and returns the ids of the rest. */
function findDuplicatesToSell(inventory: ModuleInstance[]): string[] {
  const byDefId = new Map<string, ModuleInstance[]>();
  for (const m of inventory) {
    const list = byDefId.get(m.defId) ?? [];
    list.push(m);
    byDefId.set(m.defId, list);
  }
  const toSell: string[] = [];
  for (const group of byDefId.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => {
      const rarityDiff = MODULE_RARITY_ORDER.indexOf(b.rarity) - MODULE_RARITY_ORDER.indexOf(a.rarity);
      if (rarityDiff !== 0) return rarityDiff;
      return qualityMultiplier(b.quality ?? 0.5) - qualityMultiplier(a.quality ?? 0.5);
    });
    toSell.push(...sorted.slice(1).map((m) => m.id));
  }
  return toSell;
}

/** Module leveling — the Alloy sink docs/systems-design.md always specified but
 * that had never actually been wired up (levelUpModule sat callerless, so every
 * module was stuck at level 1 and its +12%/level term never fired).
 *
 * Shows the concrete stat gain the next level buys rather than just a cost, so
 * spending Alloy is an informed choice; and shows the cap explicitly, since the
 * cap rising with rarity is what makes a high-rarity module worth investing in
 * long after a low-rarity one has topped out. */
function UpgradeRow({ mod }: { mod: ModuleInstance }) {
  const def = moduleDefById(mod.defId);
  const maxed = isModuleMaxed(mod);
  const cost = moduleUpgradeCost(mod);
  const affordable = state.value.resources.alloy >= cost;
  const cap = moduleMaxLevel(mod.rarity);

  // Project the next level so the player sees the actual delta they're buying.
  const next = { ...mod, level: mod.level + 1 };
  const isWeapon = def.baseDamage !== undefined;
  const isArmor = def.baseBlock !== undefined;
  const before = isWeapon ? computeModuleDamage(mod) : isArmor ? computeModuleBlock(mod) : null;
  const after = isWeapon ? computeModuleDamage(next) : isArmor ? computeModuleBlock(next) : null;

  return (
    <div
      style={{
        margin: "0.5rem 0", padding: "0.5rem 0.6rem", borderRadius: 6,
        border: `1px solid ${maxed ? "var(--line)" : "var(--amber)"}`,
        background: maxed ? "transparent" : "rgba(255,184,77,0.07)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
        <span className="eyebrow" style={{ color: maxed ? "var(--text-dim)" : "var(--amber)" }}>
          {t("modules.levelOf", { level: mod.level, cap })}
        </span>
        {maxed ? (
          <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{t("modules.maxed")}</span>
        ) : (
          <button
            className="btn"
            style={{ fontSize: "0.68rem", padding: "0.35em 0.6em", display: "flex", alignItems: "center", gap: "0.3em" }}
            disabled={!affordable}
            onClick={() => upgradeModule(mod.id)}
            title={t("modules.upgradeTitle")}
          >
            {t("modules.upgrade")} <ResourceIcon type="alloy" size={11} />
            <span style={{ color: affordable ? undefined : "var(--red)" }}>{cost}</span>
          </button>
        )}
      </div>
      <div style={{ marginTop: "0.35rem" }}>
        <Bar fraction={(mod.level - 1) / (cap - 1)} kind="progress" />
      </div>
      {!maxed && before !== null && after !== null && after > before && (
        <div style={{ marginTop: "0.3rem", fontSize: "0.66rem", color: "var(--text-dim)" }}>
          {isWeapon ? t("modules.dmg", { value: before }) : t("modules.block", { value: before })}
          {" → "}
          <span style={{ color: "var(--green)", fontWeight: 700 }}>{after}</span>
          <span style={{ color: "var(--green)" }}> (+{after - before})</span>
        </div>
      )}
    </div>
  );
}

function LockRow({ moduleId, traits }: { moduleId: string; traits: string[] }) {
  const cost = 8;
  const mod = state.value.modules.find((m) => m.id === moduleId);
  const def = mod ? moduleDefById(mod.defId) : null;
  const traitPool = def ? def.traitPool : [];
  const pool = [...traitPool];
  return (
    <div style={{ marginTop: "0.55rem" }}>
      {traits.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.4rem" }}>
          {traits.map((traitId, i) => (
            <span key={i} title={def ? localizedTrait(def, traitId).description : ""} style={{ fontSize: "0.68rem", padding: "0.15em 0.5em", borderRadius: 999, border: "1px solid var(--violet)", color: "var(--violet)" }}>
              {def ? localizedTrait(def, traitId).label : traitId}
            </span>
          ))}
        </div>
      )}
      {traits.length > 0 && pool.length > 0 && (
        <button
          className="btn ghost"
          style={{ fontSize: "0.62rem", padding: "0.35em 0.6em" }}
          disabled={!canAfford({ insight: cost })}
          onClick={() => {
            spend({ insight: cost });
            const rerolled = pickOne(pool);
            const modules = state.value.modules.map((m) => (m.id === moduleId ? lockTrait(m, rerolled, 0) : m));
            state.value = { ...state.value, modules };
          }}
        >
          {t("modules.lockReroll", { cost })}
        </button>
      )}
    </div>
  );
}

function PickerModal({
  type,
  options,
  onPick,
  onClose,
  shipId,
  slotIndex,
}: {
  type: ModuleType;
  options: ModuleInstance[];
  onPick: (id: string) => void;
  onClose: () => void;
  shipId?: string;
  slotIndex?: number;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(3,5,9,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 45, padding: "1rem" }} onClick={onClose}>
      <div className="panel pop-in" style={{ padding: "1rem", width: "min(420px,100%)", maxHeight: "70vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
          <ModuleTypeIcon type={type} size={18} />
          <div className="title" style={{ fontSize: "0.9rem", textTransform: "capitalize" }}>
            {t("modules.selectType", { type: t(`moduleType.${type}`) })}
          </div>
        </div>
        {options.length === 0 && <div style={{ color: "var(--text-dim)", padding: "0.5rem 0" }}>{t("modules.noneOwned")}</div>}
        {options.map((m) => {
          const def = moduleDefById(m.defId);
          const sig = moduleEffectById(def.signature);
          // A design already fitted elsewhere can still be picked — equipModule
          // swaps them — but say so, so the swap isn't a surprise.
          const fitted = shipId ? isDesignEquipped(shipId, m.defId, slotIndex) : false;
          return (
            <div key={m.id} style={{ padding: "0.55rem 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                  <ModuleTypeIcon type={type} size={15} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{localizedModuleName(def)}</span>
                  <ModuleRarityTag rarity={m.rarity} />
                  <span className="eyebrow" style={{ color: "var(--amber)" }}>{t("modules.levelShort", { level: m.level })}</span>
                </div>
                <button className="btn primary" style={{ flex: "none" }} onClick={() => onPick(m.id)}>
                  {fitted ? t("modules.swapWithFitted") : t("modules.equip")}
                </button>
              </div>
              {sig && (
                <div style={{ marginTop: "0.25rem", fontSize: "0.68rem", color: "var(--violet)" }}>
                  ★ {localizedTrait(def, def.signature).label} — {localizedTrait(def, def.signature).description}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ marginTop: "0.75rem" }}>
          <button className="btn ghost" onClick={onClose}>{t("modules.cancel")}</button>
        </div>
      </div>
    </div>
  );
}
