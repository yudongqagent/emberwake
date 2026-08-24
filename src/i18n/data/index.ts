import { language } from "../language";
import { MODULES_ZH } from "./modules";
import { CREW_ZH } from "./crew";
import { NAMED_SHIPS_ZH } from "./namedShips";
import type { ModuleDef, ModuleTrait, CrewDef } from "../../data/types";
import type { NamedShipDef } from "../../data/namedShips";

/** Issue #11: thin localization wrappers around the module/crew/named-ship data
 * defs — call these instead of reading `.name`/`.label`/`.passive`/etc. directly at
 * any UI call site, so every screen picks up the Chinese overlay automatically.
 * English (the def's own field) is always the fallback for a missing translation. */

export function localizedModuleName(def: ModuleDef): string {
  if (language.value !== "zh") return def.name;
  return MODULES_ZH[def.id]?.name ?? def.name;
}

export function localizedTrait(def: ModuleDef, traitId: string): ModuleTrait {
  const original = def.traitPool.find((tp) => tp.id === traitId) ?? { id: traitId, label: traitId, description: "" };
  if (language.value !== "zh") return original;
  const zh = MODULES_ZH[def.id]?.traits[traitId];
  return zh ? { id: traitId, label: zh.label, description: zh.description } : original;
}

export function localizedCrewName(def: CrewDef): string {
  if (language.value !== "zh") return def.name;
  return CREW_ZH[def.id]?.name ?? def.name;
}

export function localizedCrewPassive(def: CrewDef): string {
  if (language.value !== "zh") return def.passive;
  return CREW_ZH[def.id]?.passive ?? def.passive;
}

export function localizedCrewActive(def: CrewDef): string {
  if (language.value !== "zh") return def.active;
  return CREW_ZH[def.id]?.active ?? def.active;
}

export function localizedNamedShipName(def: NamedShipDef): string {
  if (language.value !== "zh") return def.name;
  return NAMED_SHIPS_ZH[def.id]?.name ?? def.name;
}

export function localizedNamedShipActive(def: NamedShipDef): string {
  if (language.value !== "zh") return def.active;
  return NAMED_SHIPS_ZH[def.id]?.active ?? def.active;
}

export function localizedNamedShipFlavor(def: NamedShipDef): string {
  if (language.value !== "zh") return def.flavor;
  return NAMED_SHIPS_ZH[def.id]?.flavor ?? def.flavor;
}
