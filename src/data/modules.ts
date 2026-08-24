import type { ModuleDef, ModuleRarity } from "./types";

export const MODULE_RARITY_ORDER: ModuleRarity[] = ["mk1", "mk2", "mk3", "mk4", "mk5"];

/** ~1.32x per tier — wide enough, paired with the ±12% quality-roll band in
 * engine/modules.ts, that a worst-roll mk-N+1 module always beats a best-roll mk-N
 * one. See docs/design-principles.md's Player-Tested Anti-Patterns #6 and the
 * verification in ships.test.ts. */
export const MODULE_RARITY_MULTIPLIER: Record<ModuleRarity, number> = {
  mk1: 1.0,
  mk2: 1.32,
  mk3: 1.74,
  mk4: 2.3,
  mk5: 3.04,
};

/** Section B of the 2026-08-24 player brief: "市场上买的模组应该要么品质一般，
 * 要么非常贵（非线性定价）；真正稀有的模组应该来自异空间战场".
 *
 * MARKET_MAX_RARITY caps what the Fabricator will ever stock. mk4/mk5 are simply
 * not purchasable at any price — they come out of the Extradimensional
 * Battlefield (see engine/modules.ts's riftDropRarityFloor), which is the whole
 * point: the rift has to be the route to top-tier gear, not a faster route to it. */
export const MARKET_MAX_RARITY: ModuleRarity = "mk3";

/** Deliberately non-linear (~2.7x per tier, against a ~1.32x power step), so
 * buying up the market's ceiling is a real economic sacrifice rather than "save a
 * bit longer". Previously this was 25 × the power multiplier — near-linear, which
 * made the best purchasable module a trivially obvious buy.
 *   mk1 20 · mk2 54 · mk3 146   (mk4/mk5 priced but unreachable — see above) */
export function fabricatorCost(rarity: ModuleRarity): number {
  return Math.round(20 * Math.pow(2.7, MODULE_RARITY_ORDER.indexOf(rarity)));
}

import { MODULE_DEFS } from "./moduleDefs";
export { MODULE_DEFS };

export function moduleDefById(id: string): ModuleDef {
  const def = MODULE_DEFS.find((m) => m.id === id);
  if (!def) throw new Error(`Unknown module def: ${id}`);
  return def;
}
