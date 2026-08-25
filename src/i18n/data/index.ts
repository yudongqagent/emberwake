import { language } from "../language";
import { MODULE_NAMES_ZH } from "./modules";
import { CREW_ZH } from "./crew";
import { NAMED_SHIPS_ZH } from "./namedShips";
import { ENCOUNTER_NAMES_ZH, ENEMY_NAMES_ZH } from "./encounters";
import { GALAXY_NAMES_ZH, SYSTEM_NAMES_ZH, POI_NAMES_ZH } from "./places";
import type { ModuleDef, ModuleTrait, CrewDef, EncounterDef, GalaxyDef, SystemDef, Poi } from "../../data/types";
import { moduleEffectById } from "../../data/moduleEffects";
import type { HullClassAbilityDef } from "../../data/namedShips";

/** Issue #11: thin localization wrappers around the module/crew/named-ship data
 * defs — call these instead of reading `.name`/`.label`/`.passive`/etc. directly at
 * any UI call site, so every screen picks up the Chinese overlay automatically.
 * English (the def's own field) is always the fallback for a missing translation. */

export function localizedModuleName(def: ModuleDef): string {
  if (language.value !== "zh") return def.name;
  return MODULE_NAMES_ZH[def.id] ?? def.name;
}

/** Effect labels now live in one place — the shared effect registry
 * (data/moduleEffects.ts) carries both languages, so 200 modules referencing the
 * same effect can't drift out of sync the way per-module trait copies would. The
 * `def` parameter is kept for call-site compatibility and unknown-id fallback. */
export function localizedTrait(_def: ModuleDef, traitId: string): ModuleTrait {
  const eff = moduleEffectById(traitId);
  if (!eff) return { id: traitId, label: traitId, description: "" };
  return language.value === "zh"
    ? { id: traitId, label: eff.labelCn, description: eff.descriptionCn }
    : { id: traitId, label: eff.label, description: eff.description };
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

export function localizedNamedShipName(def: HullClassAbilityDef): string {
  if (language.value !== "zh") return def.name;
  return NAMED_SHIPS_ZH[def.id]?.name ?? def.name;
}

export function localizedNamedShipActive(def: HullClassAbilityDef): string {
  if (language.value !== "zh") return def.active;
  return NAMED_SHIPS_ZH[def.id]?.active ?? def.active;
}

export function localizedNamedShipFlavor(def: HullClassAbilityDef): string {
  if (language.value !== "zh") return def.flavor;
  return NAMED_SHIPS_ZH[def.id]?.flavor ?? def.flavor;
}

/** Hull classes already carry both languages natively (HullClassDef.name/nameCn —
 * predates this i18n system), just always displayed English-primary. Swaps the
 * order so Chinese mode reads primary-language-first instead of "Corvette-class
 * (护卫舰)" staying English-first even with the language toggle set to Chinese. */
export function localizedHullClassDisplay(def: { name: string; nameCn: string }): string {
  return language.value === "zh" ? `${def.nameCn} (${def.name})` : `${def.name} (${def.nameCn})`;
}

/** Rift waves are generated at runtime (data/rift.ts) with a random id, so they
 * can never appear in the static ZH table the way authored encounters do — which
 * left the one repeatable endgame mode showing an English title inside an
 * otherwise fully Chinese UI. Recognised by their id prefix and titled from the
 * depth encoded in it.
 *
 * Built from the `language` signal directly rather than through `t()`: this
 * module is imported by the string table's own consumers, and pulling
 * i18n/strings.ts in here creates an import cycle that leaves `t` undefined at
 * call time (a runtime-only failure — the types are perfectly happy). */
const RIFT_WAVE_ID = /^riftWave_(\d+)_/;

export function localizedEncounterName(def: Pick<EncounterDef, "id" | "name">): string {
  const rift = RIFT_WAVE_ID.exec(def.id);
  if (rift) {
    return language.value === "zh" ? `异空间侵袭 — 第 ${rift[1]} 层` : `Rift Incursion — Depth ${rift[1]}`;
  }
  if (language.value !== "zh") return def.name;
  return ENCOUNTER_NAMES_ZH[def.id] ?? def.name;
}

/** Enemy names are looked up by the literal English name string itself (see
 * i18n/data/encounters.ts), not by encounter+index — the same name is reused
 * verbatim across many encounters. Call this once at combat setup (see Combat.tsx's
 * `enemies` initializer) rather than at every individual render call site, since
 * `enemy.name`/`target.name` are read in dozens of places throughout combat. */
export function localizedEnemyName(name: string): string {
  if (language.value !== "zh") return name;
  return ENEMY_NAMES_ZH[name] ?? name;
}

export function localizedGalaxyName(def: Pick<GalaxyDef, "id" | "name">): string {
  if (language.value !== "zh") return def.name;
  return GALAXY_NAMES_ZH[def.id] ?? def.name;
}

export function localizedSystemName(def: Pick<SystemDef, "id" | "name">): string {
  if (language.value !== "zh") return def.name;
  return SYSTEM_NAMES_ZH[def.id] ?? def.name;
}

export function localizedPoiName(def: Pick<Poi, "id" | "name">): string {
  if (language.value !== "zh") return def.name;
  return POI_NAMES_ZH[def.id] ?? def.name;
}
