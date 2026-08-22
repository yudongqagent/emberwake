import { useState } from "preact/hooks";
import { state, flagship, equipModule, spend, canAfford } from "../../state/store";
import { hullClassById } from "../../data/hullClasses";
import { computePowerCapacity } from "../../engine/ships";
import { moduleDefById } from "../../data/modules";
import { computeModuleDamage, computeModuleBlock, lockTrait } from "../../engine/modules";
import { pickOne } from "../../engine/rng";
import { ModuleRarityTag } from "../components/RarityTag";
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
  const equippedIds = new Set(ship.equipped.filter(Boolean));
  const inventory = state.value.modules.filter((m) => !equippedIds.has(m.id));

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div className="title">Modules — {ship.name}</div>
      <div className="panel" style={{ padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between" }}>
        <span>Power Draw</span>
        <span style={{ color: usedPower > capacity ? "var(--red)" : "var(--text-hi)" }}>{usedPower} / {capacity}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.6rem" }}>
        {layout.map((slot) => {
          const modId = ship.equipped[slot.index];
          const mod = modId ? state.value.modules.find((m) => m.id === modId) : null;
          const def = mod ? moduleDefById(mod.defId) : null;
          return (
            <div key={slot.index} className="panel" style={{ padding: "0.75rem" }}>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "var(--text-dim)", letterSpacing: "0.05em" }}>
                {slot.type}
              </div>
              {mod && def ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.3rem" }}>
                    <span>{def.name}</span>
                    <ModuleRarityTag rarity={mod.rarity} />
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-mid)", margin: "0.3rem 0" }}>
                    Power {def.powerDraw} &middot; Cooldown {def.cooldown ?? "—"}
                    {def.baseDamage ? ` · Dmg ${computeModuleDamage(mod)}` : ""}
                    {def.baseBlock ? ` · Block ${computeModuleBlock(mod)}` : ""}
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button className="btn" onClick={() => setPickerSlot(slot.index)}>Swap</button>
                    <button className="btn danger" onClick={() => equipModule(ship.id, slot.index, null)}>Remove</button>
                  </div>
                  <LockRow moduleId={mod.id} traits={mod.traits} />
                </>
              ) : (
                <button className="btn" style={{ marginTop: "0.5rem", width: "100%" }} onClick={() => setPickerSlot(slot.index)}>
                  Empty — Socket
                </button>
              )}
            </div>
          );
        })}
      </div>

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

function LockRow({ moduleId, traits }: { moduleId: string; traits: string[] }) {
  const cost = 8;
  const mod = state.value.modules.find((m) => m.id === moduleId);
  const pool = mod ? moduleDefById(mod.defId).traitPool.map((t) => t.id) : [];
  return (
    <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-mid)" }}>
      Traits: {traits.length ? traits.join(", ") : "none"}
      {traits.length > 0 && pool.length > 0 && (
        <button
          className="btn"
          style={{ marginLeft: "0.5rem", fontSize: "0.65rem", padding: "0.3em 0.6em" }}
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(3,5,9,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 45 }} onClick={onClose}>
      <div className="panel" style={{ padding: "1rem", width: "min(420px,90%)", maxHeight: "70vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="title" style={{ fontSize: "0.9rem", marginBottom: "0.5rem", textTransform: "capitalize" }}>
          Select {type} module
        </div>
        {options.length === 0 && <div style={{ color: "var(--text-dim)" }}>None owned. Visit a Module Fabricator.</div>}
        {options.map((m) => {
          const def = moduleDefById(m.defId);
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: "1px solid var(--line)" }}>
              <span>{def.name}</span>
              <button className="btn" onClick={() => onPick(m.id)}>Equip</button>
            </div>
          );
        })}
        <div style={{ marginTop: "0.75rem" }}>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
