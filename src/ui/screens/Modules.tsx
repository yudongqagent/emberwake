import { useState } from "preact/hooks";
import { state, flagship, equipModule, spend, canAfford, sellModule } from "../../state/store";
import { hullClassById } from "../../data/hullClasses";
import { computePowerCapacity } from "../../engine/ships";
import { moduleDefById, fabricatorCost, MODULE_RARITY_ORDER } from "../../data/modules";
import { computeModuleDamage, computeModuleBlock, lockTrait, qualityMultiplier } from "../../engine/modules";
import { pickOne } from "../../engine/rng";
import { ModuleRarityTag } from "../components/RarityTag";
import { ModuleTypeIcon, MODULE_TYPE_COLOR, PowerIcon, ResourceIcon } from "../components/Icons";
import { Bar, RollQualityBadge, AnimatedFraction } from "../components/StatBlock";
import type { ModuleType, ModuleInstance } from "../../data/types";

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
  if (!ship) return <div style={{ padding: "1rem" }}>No flagship assigned.</div>;

  const layout = slotLayout(ship.hullClass);
  const usedPower = ship.equipped.reduce((sum, id) => {
    if (!id) return sum;
    const mod = state.value.modules.find((m) => m.id === id);
    return sum + (mod ? moduleDefById(mod.defId).powerDraw : 0);
  }, 0);
  const capacity = computePowerCapacity(ship);
  const overdrawn = usedPower > capacity;
  const equippedIds = new Set(ship.equipped.filter(Boolean));
  const inventory = state.value.modules.filter((m) => !equippedIds.has(m.id));

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div className="title" style={{ fontSize: "1.2rem" }}>Modules — {ship.name}</div>

      <div className="panel" style={{ padding: "0.9rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PowerIcon size={18} color="var(--amber)" />
            <span className="eyebrow">Power Draw</span>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: overdrawn ? "var(--red)" : "var(--text-hi)" }}>
            <AnimatedFraction current={usedPower} max={capacity} />
          </span>
        </div>
        <div style={{ marginTop: "0.5rem" }}>
          <Bar fraction={capacity ? usedPower / capacity : 0} kind={overdrawn ? "danger" : "warn"} />
        </div>
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
                <span className="eyebrow" style={{ color: typeColor }}>{slot.type}</span>
              </div>
              {mod && def ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.4rem" }}>
                    <span style={{ fontWeight: 700 }}>{def.name}</span>
                    <ModuleRarityTag rarity={mod.rarity} />
                  </div>
                  <div style={{ display: "flex", gap: "0.9rem", fontSize: "0.76rem", color: "var(--text-mid)", margin: "0.45rem 0" }}>
                    <span>Pwr {def.powerDraw}</span>
                    <span>CD {def.cooldown ?? "—"}</span>
                    {def.baseDamage ? <span style={{ color: "var(--red)" }}>Dmg {computeModuleDamage(mod)}</span> : null}
                    {def.baseBlock ? <span style={{ color: "var(--cyan)" }}>Block {computeModuleBlock(mod)}</span> : null}
                  </div>
                  {(def.baseDamage !== undefined || def.baseBlock !== undefined) && (
                    <div style={{ marginBottom: "0.5rem" }}>
                      <RollQualityBadge roll={mod.quality} />
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button className="btn" onClick={() => setPickerSlot(slot.index)}>Swap</button>
                    <button className="btn danger" onClick={() => equipModule(ship.id, slot.index, null)}>Remove</button>
                  </div>
                  <LockRow moduleId={mod.id} traits={mod.traits} />
                </>
              ) : (
                <button className="btn ghost" style={{ marginTop: "0.6rem", width: "100%" }} onClick={() => setPickerSlot(slot.index)}>
                  Empty — Socket
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
        <span className="eyebrow">Inventory — {inventory.length} unequipped</span>
        {duplicateIdsToSell.length > 0 && (
          <button
            className="btn ghost"
            style={{ fontSize: "0.68rem", padding: "0.35em 0.65em" }}
            onClick={() => {
              duplicateIdsToSell.forEach((id) => sellModule(id));
              setLastSale({ count: duplicateIdsToSell.length, refund: duplicateRefund });
            }}
          >
            Auto-Sell {duplicateIdsToSell.length} Duplicates — +{duplicateRefund} <ResourceIcon type="sourcePoints" size={11} />
          </button>
        )}
      </div>
      {lastSale && (
        <div style={{ fontSize: "0.72rem", color: "var(--green)" }}>
          Sold {lastSale.count} duplicate{lastSale.count === 1 ? "" : "s"} for {lastSale.refund} Source Points.
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
                  <span style={{ fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{def.name}</span>
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
                  Sell +{refund}
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

function LockRow({ moduleId, traits }: { moduleId: string; traits: string[] }) {
  const cost = 8;
  const mod = state.value.modules.find((m) => m.id === moduleId);
  const traitPool = mod ? moduleDefById(mod.defId).traitPool : [];
  const pool = traitPool.map((t) => t.id);
  return (
    <div style={{ marginTop: "0.55rem" }}>
      {traits.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.4rem" }}>
          {traits.map((t, i) => (
            <span key={i} title={traitPool.find((tp) => tp.id === t)?.description} style={{ fontSize: "0.68rem", padding: "0.15em 0.5em", borderRadius: 999, border: "1px solid var(--violet)", color: "var(--violet)" }}>
              {traitPool.find((tp) => tp.id === t)?.label ?? t}
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
          Lock — reroll trait 1 (Insight {cost})
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
}: {
  type: ModuleType;
  options: ModuleInstance[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(3,5,9,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 45, padding: "1rem" }} onClick={onClose}>
      <div className="panel pop-in" style={{ padding: "1rem", width: "min(420px,100%)", maxHeight: "70vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
          <ModuleTypeIcon type={type} size={18} />
          <div className="title" style={{ fontSize: "0.9rem", textTransform: "capitalize" }}>
            Select {type} module
          </div>
        </div>
        {options.length === 0 && <div style={{ color: "var(--text-dim)", padding: "0.5rem 0" }}>None owned. Visit a Module Fabricator.</div>}
        {options.map((m) => {
          const def = moduleDefById(m.defId);
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ModuleTypeIcon type={type} size={15} />
                <span>{def.name}</span>
                <ModuleRarityTag rarity={m.rarity} />
              </div>
              <button className="btn primary" onClick={() => onPick(m.id)}>Equip</button>
            </div>
          );
        })}
        <div style={{ marginTop: "0.75rem" }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
