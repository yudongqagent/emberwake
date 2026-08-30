import type { ModuleFamily, ModuleInstance } from "./types";
import { moduleDefById } from "./modules";

/** 家族套装。
 *
 * 2026-08-30。模组审计修完之后,200 件模组终于各不相同了,但配装的最优解还是
 * 「每个槽位挑数值最高的那件」——家族只是外观和词条池,没有任何理由让你**成套**用。
 *
 * 套装把「你用谁家的东西」变成一个决定:凑够两件同族拿到那一派的入门信条,凑够
 * 四件拿到它的看家本事。代价是你放弃了在某个槽位塞进最高数值的那件。
 *
 * 实现上刻意只发**已实现的效果 id**(见 data/moduleEffects.ts),不发任何新数值。
 * 两个原因:
 *
 * 1. 46 个效果每一个都已经在战斗里有落点,套装因此立刻是真的,不需要新的战斗管线
 *    ——而新管线正是"列了却没接"这类假内容的温床。
 * 2. 套装效果会和模组自带的同名效果叠加,所以「掠夺者四件套」给的抵近射击会和
 *    掠夺者武器本来就有的抵近射击叠起来,专精流派因此真的成立。
 */

export interface FamilySet {
  family: ModuleFamily;
  /** 两件套:这一派的入门信条。 */
  two: string;
  /** 四件套:看家本事。 */
  four: string;
}

export const FAMILY_SETS: FamilySet[] = [
  // 公国讲规矩:先立案,再执行。
  { family: "bauhinia", two: "mark", four: "exploit" },
  // 狮心是决斗者:开场一击,以及把伤残的对手了结掉。
  { family: "lionsheart", two: "opener", four: "execute" },
  // 商会算账:多捞一点,少花一点。
  { family: "swanreach", two: "yieldBonus", four: "capacitor" },
  // 掠夺者贴脸,越杀越疯。
  { family: "reaver", two: "pointBlank", four: "rampage" },
  // 虫群靠数量:跳弹与溅射。
  { family: "swarm", two: "chainArc", four: "aoe" },
  // 构装体是拒止平台:让对面动不了,自己越破越硬。
  { family: "construct", two: "disable", four: "bulwark" },
  // 空壳不靠厚度,靠腐蚀和延烧。
  { family: "hollow", two: "corrode", four: "burn" },
  // 裂隙的东西不讲位置:位移和涌流。
  { family: "rift", two: "displace", four: "surge" },
  // 合唱靠积累:充能与齐射。
  { family: "choir", two: "novaCharge", four: "volley" },
  // 玛耶斯的遗物又准又狠。
  { family: "mayeth", two: "crit", four: "overkill" },
];

export const SET_TWO = 2;
export const SET_FOUR = 4;

export function familySetFor(family: ModuleFamily): FamilySet | undefined {
  return FAMILY_SETS.find((s) => s.family === family);
}

export interface ActiveSet {
  family: ModuleFamily;
  pieces: number;
  /** 这一套当前生效的效果 id。两件套的那个在四件时依然生效。 */
  effects: string[];
}

/** 当前装备触发了哪些套装。
 *
 * 只数**已装备**的模组——仓库里堆着六件同族不算数,否则套装就只是"你拥有过什么"
 * 的记录,而不是一个配装决定。 */
export function activeSetBonuses(equipped: ModuleInstance[]): ActiveSet[] {
  const counts = new Map<ModuleFamily, number>();
  for (const m of equipped) {
    const fam = moduleDefById(m.defId).family;
    counts.set(fam, (counts.get(fam) ?? 0) + 1);
  }
  const out: ActiveSet[] = [];
  for (const [family, pieces] of counts) {
    if (pieces < SET_TWO) continue;
    const set = familySetFor(family);
    if (!set) continue;
    const effects = [set.two];
    if (pieces >= SET_FOUR) effects.push(set.four);
    out.push({ family, pieces, effects });
  }
  // 件数多的排前面,面板上一眼看到自己主修的是哪一派。
  return out.sort((a, b) => b.pieces - a.pieces);
}

/** 面板要显示的全部家族进度,包括还没凑够的——玩家得看得见"再来一件就成套"。 */
export function setProgress(equipped: ModuleInstance[]): { set: FamilySet; pieces: number }[] {
  const counts = new Map<ModuleFamily, number>();
  for (const m of equipped) {
    const fam = moduleDefById(m.defId).family;
    counts.set(fam, (counts.get(fam) ?? 0) + 1);
  }
  return FAMILY_SETS
    .map((set) => ({ set, pieces: counts.get(set.family) ?? 0 }))
    .filter((r) => r.pieces > 0)
    .sort((a, b) => b.pieces - a.pieces);
}
