import type { EncounterDef, FactionId } from "./types";
import { isDiplomatic } from "./reputation";

/** 猎杀队:声望敌对时,那个派系会派人来找你。
 *
 * 2026-08-30。声望的第三个后果,也是唯一一个"惩罚"型的。
 *
 * 前两个后果(价格、盟友)都是你主动去用的;猎杀队是反过来找上门的,这才让敌对
 * 有重量——否则"把一方得罪光"只是少了一家商店,玩家会觉得随便得罪谁都行。
 *
 * 关键的一条克制:打赢猎杀队**不再扣声望**(见 store.ts)。敌对方主动来打你,
 * 自卫再扣分就成了一个爬不出来的坑;声望的意义是给玩家可以扭转的东西,不是一条
 * 单向的下坡路。想修复关系,去赏金板上接他们委托的活。
 *
 * 用 id 编码而不是写死一张表,是因为猎杀队必须跟着星区威胁度缩放:威胁 6 的星区
 * 里冒出一队威胁 1 的猎杀船,那不是威胁,是免费经验。 */

const HUNTER_PREFIX = "hunt:";

export function hunterEncounterId(faction: FactionId, threat: number): string {
  return `${HUNTER_PREFIX}${faction}:${threat}`;
}

export function isHunterId(id: string): boolean {
  return id.startsWith(HUNTER_PREFIX);
}

export function parseHunterId(id: string): { faction: FactionId; threat: number } | null {
  if (!isHunterId(id)) return null;
  const [faction, threatRaw] = id.slice(HUNTER_PREFIX.length).split(":");
  const threat = Number(threatRaw);
  if (!isDiplomatic(faction) || !Number.isFinite(threat)) return null;
  return { faction, threat };
}

/** 每个派系派来的东西不一样——公国走公文和精锐,狮心是正面硬碰,商会雇佣兵,
 * 掠夺者纯粹是数量。名字里带着"为什么来找你"。 */
const HUNTER_FLAVOR: Record<string, { encounter: string; ship: string; count: number; bulk: number }> = {
  bauhinia:   { encounter: "Arthaine Writ Enforcers", ship: "Writ Enforcer", count: 2, bulk: 1.15 },
  lionsheart: { encounter: "Concord Reprisal Wing", ship: "Reprisal Lancer", count: 2, bulk: 1.3 },
  swanreach:  { encounter: "Combine Contract Hunters", ship: "Contract Hunter", count: 3, bulk: 0.9 },
  reavers:    { encounter: "Reaver Blood Pack", ship: "Blood Pack Skiff", count: 4, bulk: 0.7 },
};

/** 生成式而非写死:成对的四个派系 × 七档威胁 = 28 条,手写没有意义,而且一定会
 * 有人忘了改其中一档。 */
export function generateHunterEncounter(faction: FactionId, threat: number): EncounterDef {
  const flavor = HUNTER_FLAVOR[faction] ?? HUNTER_FLAVOR.reavers;
  const t = Math.max(1, Math.min(7, Math.round(threat)));
  // 按威胁度指数缩放,和星区里的正规遭遇同一条曲线。
  const scale = Math.pow(1.85, t - 1);
  const hull = Math.round(45 * scale * flavor.bulk);
  const damage = Math.round(7 * scale * flavor.bulk);
  const block = Math.round(3 * scale * flavor.bulk);
  const enemies = Array.from({ length: flavor.count }, (_, i) => ({
    name: flavor.ship,
    hull,
    damage,
    block,
    evasion: 0.14,
    // 领队带一个 anchor,让猎杀队像个有组织的小队而不是一堆散船。
    ...(i === 0 && flavor.count > 2 ? { role: "anchor" as const } : {}),
  }));
  return {
    id: hunterEncounterId(faction, t),
    name: flavor.encounter,
    faction,
    isBoss: false,
    // 他们是冲你来的,所以身上带着值钱的东西——被追杀不该是纯亏损。
    enemies,
    rewards: {
      salvage: Math.round(60 * scale),
      sourcePoints: Math.round(30 * scale),
      alloy: Math.round(25 * scale),
    },
    xp: Math.round(30 * scale),
  };
}
