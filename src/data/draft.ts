import type { FactionId, ModuleInstance, ModuleRarity } from "./types";
import { drawModule, moduleMaxLevel } from "../engine/modules";
import { MODULE_DEFS } from "./modules";
import { moduleDefById } from "./modules";
import { pickOne } from "../engine/rng";
import { PACT_IDS } from "./pacts";

/** 整备抉择 — the Refit Draft.
 *
 * Core-loop redesign #1 (docs/core-loop-redesign.md). The measured problem: the
 * whole 40-scene campaign offered 7 choices, and loot was
 * `Math.random() < dropChance ? drawModule(...) : null` — the game rolled and told
 * you what you got. Zero draft moments in the entire game.
 *
 * Every reference loop is built on this one moment instead: Slay the Spire's card
 * pick, Vampire Survivors' level-up triple. So combat now ends in a pick, not a
 * roll, roughly once every ninety seconds.
 *
 * Two rules make the randomness legible, which is the property those games
 * actually share (RNG paired with clear draft rules, not RNG alone):
 *
 * 1. The module option is biased toward the faction whose space you're in, so
 *    WHERE you fight shapes what you can build.
 * 2. Every hand contains one safe option and one greedy one. Into the Breach's
 *    rule: no option should be free.
 */

export type DraftOptionKind = "module" | "upgrade" | "boon" | "pact";

export interface DraftOption {
  id: string;
  kind: DraftOptionKind;
  /** kind="module" — the rolled instance the player would receive. */
  module?: ModuleInstance;
  /** kind="upgrade" — an owned module that would gain a level for free. */
  targetModuleId?: string;
  /** kind="boon" — an effect id from data/moduleEffects.ts, active until docking. */
  boonId?: string;
  /** kind="pact" — 一条余烬契约(data/pacts.ts),同样持续到回港。
   *
   * 刻意不和 boonId 共用一个字段:增益是"已实现的效果 id",契约是另一种东西
   * (有代价的玩法交换)。两个概念挤在一个数组里,迟早会出现"某个新效果和某条
   * 契约同名"这种不报错的 bug——draft.test.ts 里那条"每个 boon 都必须是已实现
   * 的效果"当场就抓到了我第一版的这个错。 */
  pactId?: string;
  /** Greedy options are stronger and cost hull. Never more than a bruise. */
  hullCost?: number;
}

/** Boons are drawn from effects that are unambiguously good on their own and
 * don't need a specific build to function — a boon should read as a gift, not as
 * a puzzle piece you may not be able to use. */
const BOON_POOL = [
  "crit", "pierce", "coolant", "regen", "evasion", "hullBonus",
  "haste", "yieldBonus", "novaCharge", "deflect", "momentum", "recycler",
];

/** Faction → module family, for the region bias. Ids differ in a few places
 * (reavers/reaver, constructs/construct, riftEchoes/rift). */
const FAMILY_FOR_FACTION: Record<string, string> = {
  bauhinia: "bauhinia",
  lionsheart: "lionsheart",
  swanreach: "swanreach",
  reavers: "reaver",
  swarm: "swarm",
  constructs: "construct",
  hollow: "hollow",
  riftEchoes: "rift",
  choir: "choir",
};

const TIER_ORDER: ModuleRarity[] = ["mk1", "mk2", "mk3", "mk4", "mk5"];

/** The tier the draft offers, from how far the player has actually got. Kept
 * deliberately simple and legible — a player should be able to predict roughly
 * what a draft can contain. */
export function draftTierFor(shipLevel: number, greedy: boolean): ModuleRarity {
  const base = shipLevel >= 30 ? 3 : shipLevel >= 20 ? 2 : shipLevel >= 10 ? 1 : 0;
  const idx = Math.min(TIER_ORDER.length - 1, base + (greedy ? 1 : 0));
  return TIER_ORDER[idx];
}

/** 抽一件该技术族、该层的模组,**优先给玩家还没有的设计**。
 *
 * 2026-08-31 实测(/loop 第 27 轮)。原来是在候选里均匀抽,不看玩家已经有什么。
 * 而一个 (族, 层) 格里正好只有 4 件(武器/装甲/引擎/辅助各一),于是模拟一整趟
 * 80 场仗的战役:
 *
 *     160 个模组选项里,已经拥有同设计的  44 (28%)
 *     拿到手的 80 件里,重复设计          44 (55%)
 *     一整趟战役见过的不同设计           36 / 200  (18%)
 *
 * 也就是说玩家打完整个战役只见过五分之一不到的模组,而每次抉择递到手里的东西
 * 一半以上是他已经有的。搜到的说法很直接:「物品种类少,实验的空间就被压掉了,
 * 可重玩性跟着一起没」。
 *
 * 排除已有设计,不是禁止——四件全有了就还是从全部里抽(那时它是一次词条重掷,
 * 见 RefitDraft 上的标注)。`exclude` 让同一手牌里的两张不撞车。 */
function moduleOfFamily(
  family: string,
  tier: ModuleRarity,
  owned: ModuleInstance[],
  exclude: Set<string>,
): ModuleInstance {
  const cell = MODULE_DEFS.filter((m) => m.family === family && m.baseRarity === tier);
  const pool = cell.length ? cell : MODULE_DEFS.filter((m) => m.baseRarity === tier);
  const ownedDefs = new Set(owned.map((m) => m.defId));
  const fresh = pool.filter((m) => !ownedDefs.has(m.id) && !exclude.has(m.id));
  const usable = fresh.length ? fresh : pool.filter((m) => !exclude.has(m.id));
  const def = pickOne(usable.length ? usable : pool);
  exclude.add(def.id);
  return drawModule(def.id, { minRarity: tier, maxRarity: tier });
}

/** Builds one hand of three. `owned` is the player's module list, used for the
 * upgrade option — offering a free level on something you already fly is what
 * turns "I found a thing" into "I invested in my thing". */
export function generateDraft(opts: {
  faction: FactionId;
  shipLevel: number;
  owned: ModuleInstance[];
  activeBoons: string[];
  activePacts?: string[];
}): DraftOption[] {
  const { faction, shipLevel, owned, activeBoons, activePacts = [] } = opts;
  const family = FAMILY_FOR_FACTION[faction] ?? "bauhinia";
  const out: DraftOption[] = [];
  // 同一手牌里的两张模组不能是同一个设计。
  const offered = new Set<string>();

  // 1. Safe: a module from the region's own tech line, at the plain tier.
  out.push({
    id: "opt-safe",
    kind: "module",
    module: moduleOfFamily(family, draftTierFor(shipLevel, false), owned, offered),
  });

  // 2. Greedy: a tier above, paid for in hull.
  out.push({
    id: "opt-greedy",
    kind: "module",
    module: moduleOfFamily(family, draftTierFor(shipLevel, true), owned, offered),
    hullCost: 12 + shipLevel * 2,
  });

  // 3. Either a free upgrade on something owned, or a boon when there's nothing
  // worth upgrading. Upgrades are preferred because they deepen a build rather
  // than widening it.
  const upgradable = owned.filter((m) => m.level < moduleMaxLevel(m.rarity));
  const pactCandidates = PACT_IDS.filter((p) => !activePacts.includes(p));
  const boonCandidates = BOON_POOL.filter((b) => !activeBoons.includes(b));
  // 余烬契约(data/pacts.ts):改玩法而不是改数字的那一类,四分之一的概率占掉第三格。
  //
  // 量出来的理由:一整个战役里"我现在会做一件新事"的时刻只有 6~9 次,而哈迪斯
  // 单次跑动就有 30+。契约挂在这里,是因为它只持续一次出击——玩家因此**敢**去
  // 拿"冷却减四成但护甲归零"这种极端的东西。
  if (pactCandidates.length > 0 && Math.random() < 0.25) {
    out.push({ id: "opt-third", kind: "pact", pactId: pickOne(pactCandidates) });
  } else if (upgradable.length > 0 && (boonCandidates.length === 0 || Math.random() < 0.5)) {
    // Favour a module the player has actually invested in already.
    const best = [...upgradable].sort((a, b) => b.level - a.level)[0];
    out.push({ id: "opt-third", kind: "upgrade", targetModuleId: best.id });
  } else if (boonCandidates.length > 0) {
    out.push({ id: "opt-third", kind: "boon", boonId: pickOne(boonCandidates) });
  } else {
    out.push({
      id: "opt-third",
      kind: "module",
      module: moduleOfFamily(family, draftTierFor(shipLevel, false), owned, offered),
    });
  }

  return out;
}

/** Human-readable summary of what an option would give, for the card. Returns
 * the module def id / effect id; the screen localizes it. */
export function draftOptionSubject(opt: DraftOption, owned: ModuleInstance[]): string {
  if (opt.kind === "module" && opt.module) return moduleDefById(opt.module.defId).id;
  if (opt.kind === "upgrade") {
    const m = owned.find((x) => x.id === opt.targetModuleId);
    return m ? moduleDefById(m.defId).id : "";
  }
  return opt.pactId ?? opt.boonId ?? "";
}
