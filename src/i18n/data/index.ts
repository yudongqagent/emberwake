import { language } from "../language";
import { MODULE_NAMES_ZH } from "./modules";
import { CREW_ZH } from "./crew";
import { NAMED_SHIPS_ZH } from "./namedShips";
import { ENCOUNTER_NAMES_ZH, ENEMY_NAMES_ZH } from "./encounters";
import { GALAXY_NAMES_ZH, SYSTEM_NAMES_ZH, POI_NAMES_ZH } from "./places";
import type { ModuleDef, ModuleTrait, CrewDef, EncounterDef, GalaxyDef, SystemDef, Poi } from "../../data/types";
import { moduleEffectById } from "../../data/moduleEffects";
import { moduleDefById } from "../../data/modules";
import { evolutionForFamily } from "../../data/evolutions";
import type { HullClassAbilityDef } from "../../data/namedShips";

/** Issue #11: thin localization wrappers around the module/crew/named-ship data
 * defs — call these instead of reading `.name`/`.label`/`.passive`/etc. directly at
 * any UI call site, so every screen picks up the Chinese overlay automatically.
 * English (the def's own field) is always the fallback for a missing translation. */

export function localizedModuleName(def: ModuleDef): string {
  if (language.value !== "zh") return def.name;
  return MODULE_NAMES_ZH[def.id] ?? def.name;
}

/** An evolved weapon carries its evolution's name instead of the def's (core-loop
 * redesign #4). Evolution names live in data/evolutions.ts with both languages,
 * since they're generated identity rather than roster data. */
export function localizedModuleInstanceName(mod: { defId: string; evolved?: boolean }): string {
  const def = moduleDefById(mod.defId);
  if (!mod.evolved) return localizedModuleName(def);
  const evo = evolutionForFamily(def.family);
  if (!evo) return localizedModuleName(def);
  return language.value === "zh" ? evo.nameCn : evo.name;
}

/** An evolution's own name. Evolutions carry both languages in data/evolutions.ts
 * because they're generated identity rather than roster entries keyed by id. */
export function localizedEvolutionName(family: string): string {
  const evo = evolutionForFamily(family);
  if (!evo) return "";
  return language.value === "zh" ? evo.nameCn : evo.name;
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
/** 只要一个名字的场合(进阶链、紧凑列表)——双语那一版太长,塞不进去。
 *
 * 2026-09-01(/loop 第 102 轮)。进阶界面直接读了 `def.nameCn`,于是英文模式下
 * 那里**只有中文**:一个英文玩家看到的是「主宰舰」,一个英文字都没有。
 * 双语那一版(localizedHullClassDisplay)是刻意的设计,这一处不是——这一处是
 * 漏了本地化。 */
export function localizedHullClassName(def: { name: string; nameCn: string }): string {
  return language.value === "zh" ? def.nameCn : def.name;
}

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
  // 猎杀队的 id 带着威胁度(hunt:reavers:4),查表要先把它剥掉。
  if (def.id.startsWith("hunt:")) {
    const key = def.id.split(":").slice(0, 2).join(":");
    return ENCOUNTER_NAMES_ZH[key] ?? def.name;
  }
  return ENCOUNTER_NAMES_ZH[def.id] ?? def.name;
}

/** Enemy names are looked up by the literal English name string itself (see
 * i18n/data/encounters.ts), not by encounter+index — the same name is reused
 * verbatim across many encounters. Call this once at combat setup (see Combat.tsx's
 * `enemies` initializer) rather than at every individual render call site, since
 * `enemy.name`/`target.name` are read in dozens of places throughout combat. */
/** 反查表:中文名 → 原名。
 *
 * 2026-09-01(/loop 第 102 轮)。缴获的船名在这一轮之前存的是**本地化之后**的
 * 字符串,所以老存档里可能躺着「掠夺者副官快艇」这样的名字。把它先还原成原名
 * 再本地化,老存档在英文下也能读——否则修法只对新缴的船生效。 */
const ENEMY_NAMES_FROM_ZH: Record<string, string> = Object.fromEntries(
  Object.entries(ENEMY_NAMES_ZH).map(([en, zh]) => [zh, en]),
);

/** 幂等:传原名或传已翻译的名字,结果都对。 */
export function localizedEnemyName(name: string): string {
  const canonical = ENEMY_NAMES_FROM_ZH[name] ?? name;
  if (language.value !== "zh") return canonical;
  return ENEMY_NAMES_ZH[canonical] ?? canonical;
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
