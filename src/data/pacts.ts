/** 余烬契约 —— 改玩法的东西,不是改数字的东西。
 *
 * 2026-08-30,/loop 第 3 轮。量出来的问题:
 *
 *   一整个战役里,玩家做出「我现在会做一件新事」的选择约 **6~9 次**
 *     舰级进阶 4~5 次(每次一个独特主动技能)
 *     武器进化 1~2 次(要满级武器 + 特定搭档)
 *     门派套装 0~2 次(换的是数值取向)
 *     改装征召 0 次(发的是已有效果 id,改数值不改玩法)
 *     余烬刻印 0 次(六个节点全是百分比)
 *
 *   对比:哈迪斯**单次跑动**就有 30+ 次祝福选择,其中多个直接改变攻击方式;
 *   杀戮尖塔一局约 30 张牌 + 10~15 个遗物。
 *
 * 顺带更正我自己在 docs/fun-audit-2026-08-30.md 里写重的一句:"46 个效果全都是
 * 数值修饰"是不准确的——其中 20 个确实改变一次攻击怎么运作(跳弹、溅射、齐射、
 * 吸收、背水、偏转……)。真正缺的不是"效果不够花",是**没有任何东西改变玩家怎么
 * 打这一仗**。
 *
 * 契约就是那样东西。每一条都是**有代价的交换**,不是白给的加成:
 *
 *     孤注一掷:冷却缩到六成,但护甲格挡归零。
 *
 * 所以它不是"更强",是"另一种打法"。这是杀戮尖塔的遗物、哈迪斯的祝福真正在做的
 * 事——不是让你更强,是让这一局和上一局不一样。
 *
 * 挂在改装征召上(每次出击 3 选 1,回港作废),因为那是现成的、玩家已经熟悉的抉择
 * 时刻,而且"只持续一次出击"让玩家敢于尝试极端的组合。
 *
 * 六条,不是六十条。每一条都在 Combat.tsx 里真的接上了,而 pacts.test.ts 会逐条
 * 确认——一个列出来却没接的契约,和今天修掉的那四个死字段是同一种东西。
 */

export type PactId =
  | "allIn"        // 孤注一掷
  | "lockClose"    // 咬死
  | "lockLong"     // 长枪
  | "ironWall"     // 铁壁
  | "braceMaster"  // 抗冲专精
  | "novaCore";    // 新星核心

export interface PactDef {
  id: PactId;
  /** 战斗里真正读它的那几个地方,写出来是为了让"有没有接上"可被测试检查。 */
  hooks: string[];
}

export const PACTS: PactDef[] = [
  // 冷却 ×0.6,护甲格挡归零。极端的"以攻代守"。
  { id: "allIn", hooks: ["cadence", "armorBlock"] },
  // 阵位锁死近距,近距伤害额外 +50%。舵手指令失效——这是它的代价。
  { id: "lockClose", hooks: ["lockBand", "bandDamage"] },
  // 阵位锁死远距,远距伤害额外 +50%。
  { id: "lockLong", hooks: ["lockBand", "bandDamage"] },
  // 格挡 ×2,武器冷却 ×1.5。把一场速决战变成消耗战。
  { id: "ironWall", hooks: ["armorBlock", "cadence"] },
  // 抗冲窗口 ×2.5、冷却 ×0.5、减伤 50%→75%,但被动闪避归零。
  { id: "braceMaster", hooks: ["brace", "evasion"] },
  // 新星充能 ×2.5,最大船体 −30%。围绕大招打。
  { id: "novaCore", hooks: ["novaCharge", "maxHull"] },
];

export const PACT_IDS: PactId[] = PACTS.map((p) => p.id);

export function isPact(id: string): id is PactId {
  return (PACT_IDS as string[]).includes(id);
}

/** 战斗读的那一组系数。全部集中在这里,免得散落在 Combat.tsx 各处对不上。 */
export interface PactModifiers {
  cadenceMult: number;
  blockMult: number;
  /** 锁死的阵位;null = 不锁。 */
  lockedBand: "close" | "mid" | "long" | null;
  /** 在锁死的那个档位上额外的伤害倍率。 */
  lockedBandDamageMult: number;
  braceWindowMult: number;
  braceCooldownMult: number;
  braceReduction: number;
  evasionMult: number;
  novaChargeMult: number;
  maxHullMult: number;
}

export const NO_PACTS: PactModifiers = {
  cadenceMult: 1,
  blockMult: 1,
  lockedBand: null,
  lockedBandDamageMult: 1,
  braceWindowMult: 1,
  braceCooldownMult: 1,
  braceReduction: 0.5,
  evasionMult: 1,
  novaChargeMult: 1,
  maxHullMult: 1,
};

/** 把当前生效的契约折算成一组系数。
 *
 * 同时生效多条时相乘。刻意允许——"冷却六成 + 格挡翻倍"互相抵消是玩家自己的选择,
 * 而两条锁位契约同时拿到时后一条覆盖前一条(见下),不会互相打架。 */
export function pactModifiers(activeBoons: string[]): PactModifiers {
  const m: PactModifiers = { ...NO_PACTS };
  for (const b of activeBoons) {
    switch (b) {
      case "allIn":
        m.cadenceMult *= 0.6;
        m.blockMult = 0;
        break;
      case "lockClose":
        m.lockedBand = "close";
        m.lockedBandDamageMult *= 1.5;
        break;
      case "lockLong":
        m.lockedBand = "long";
        m.lockedBandDamageMult *= 1.5;
        break;
      case "ironWall":
        m.blockMult *= 2;
        m.cadenceMult *= 1.5;
        break;
      case "braceMaster":
        m.braceWindowMult *= 2.5;
        m.braceCooldownMult *= 0.5;
        m.braceReduction = 0.75;
        m.evasionMult = 0;
        break;
      case "novaCore":
        m.novaChargeMult *= 2.5;
        m.maxHullMult *= 0.7;
        break;
    }
  }
  return m;
}
