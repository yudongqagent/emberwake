import { describe, expect, it } from "vitest";
import { hunterThreatFor, generateHunterEncounter } from "./hunters";
import { HULL_CLASSES } from "./hullClasses";
import { GALAXIES } from "../state/store";
import STORE_SRC from "../state/store.ts?raw";

/** 猎杀队要跟着**玩家**缩放,不只是跟着星区。
 *
 * 2026-09-01(/loop 第 78 轮)。hunters.ts 顶上那句设计意图自己就写着:
 *
 *     "猎杀队必须跟着星区威胁度缩放:威胁 6 的星区里冒出一队威胁 1 的猎杀船,
 *      那不是威胁,是免费经验。"
 *
 * 话说对了,但只做了一半——只看星区,不看玩家。镜像的那种情况一直存在:一个
 * 已经进阶到主权级的玩家回到新手村,招来的还是威胁 1 的猎杀队。
 *
 * 实测(洋紫荆疆域,威胁 1):4 艘血群快艇,每艘伤害 5;一整场仗**总共掉 6 点血
 * (274 里的 6)**,8.2 秒结束,反过来白拿 +60 废料 +30 源点 +27 合金。
 * 声望系统里唯一的那个"惩罚",实际是一份免费补给。
 *
 * 搜到的说法正对着这一条:一味按进度堆数值,最后会"用过于简单的遭遇去惩罚那些
 * 把每一条成长线都点满了的玩家"。
 *
 * 玩家这一侧刻意用**已经进阶到的舰级**而不是等级:等级会虚高(一条 14 级的
 * 护卫舰仍然只是护卫舰),舰级是真的跨过门槛才拿到的。 */

const MAX_ORDER = Math.max(...HULL_CLASSES.map((h) => h.order));

describe("猎杀队的档位", () => {
  it("星区高、玩家低时,按星区走(原来那一半不能坏掉)", () => {
    expect(hunterThreatFor(6, 0)).toBe(6);
    expect(hunterThreatFor(7, 1)).toBe(7);
  });

  it("玩家高、星区低时,按玩家走——这就是补上的那一半", () => {
    // 主权级(order 5)回到新手村(威胁 1):不再是威胁 1 的送菜队。
    expect(hunterThreatFor(1, 5)).toBe(6);
    expect(hunterThreatFor(1, MAX_ORDER)).toBe(7);
  });

  it("只往上抬,永远不往下压", () => {
    for (let region = 1; region <= 7; region++) {
      for (let order = 0; order <= MAX_ORDER; order++) {
        expect(
          hunterThreatFor(region, order),
          `威胁${region} / 舰级${order} 反而被压到了更低的档`,
        ).toBeGreaterThanOrEqual(Math.min(7, region));
      }
    }
  });

  it("不会越界到没有内容的档", () => {
    for (let region = 1; region <= 7; region++) {
      for (let order = 0; order <= MAX_ORDER + 3; order++) {
        const t = hunterThreatFor(region, order);
        expect(t).toBeGreaterThanOrEqual(1);
        expect(t).toBeLessThanOrEqual(7);
      }
    }
  });

  /** 起步那一档不能被顺手抬高:新玩家开局就是护卫舰(order 0),他遇到的
   * 猎杀队必须还是威胁 1 那一档。 */
  it("开局的护卫舰在新手村,面对的还是最低档", () => {
    const corvette = HULL_CLASSES.find((h) => h.id === "corvette")!;
    expect(corvette.order).toBe(0);
    expect(hunterThreatFor(1, corvette.order)).toBe(1);
  });

  /** 抬上去之后确实变强了——不然改的只是一个 id。 */
  it("档位抬上去,船是真的变强", () => {
    const low = generateHunterEncounter("reavers", hunterThreatFor(1, 0));
    const high = generateHunterEncounter("reavers", hunterThreatFor(1, 5));
    const dmg = (e: typeof low) => Math.max(...e.enemies.map((x) => x.damage));
    const hull = (e: typeof low) => Math.max(...e.enemies.map((x) => x.hull));
    expect(dmg(high), `伤害没涨:${dmg(low)} → ${dmg(high)}`).toBeGreaterThan(dmg(low) * 5);
    expect(hull(high)).toBeGreaterThan(hull(low) * 5);
    // 被追杀不该是纯亏损——奖励也得跟着走,否则抬难度等于单方面惩罚。
    expect(high.rewards.salvage!).toBeGreaterThan(low.rewards.salvage!);
    expect(high.xp).toBeGreaterThan(low.xp);
  });

  it("生成猎杀队的那一处真的用上了这个函数", () => {
    expect(STORE_SRC, "猎杀队还是只看星区威胁").toMatch(
      /hunterEncounterId\(\s*f,\s*hunterThreatFor\(galaxy\.threat, flagship\.value \? hullClassById\(flagship\.value\.hullClass\)\.order : 0\)/,
    );
    expect(STORE_SRC, "旧的只看星区的写法还在").not.toMatch(/hunterEncounterId\(f, galaxy\.threat\)/);
  });

  /** 星区威胁本身是数据,别哪天变成小数把档位算歪。 */
  it("星区威胁都是 1..7 的整数", () => {
    for (const g of GALAXIES) {
      expect(Number.isInteger(g.threat), `${g.id} 的威胁度不是整数`).toBe(true);
      expect(g.threat).toBeGreaterThanOrEqual(1);
      expect(g.threat).toBeLessThanOrEqual(7);
    }
  });
});
