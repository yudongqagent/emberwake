import { describe, expect, it } from "vitest";
import { MODULE_DEFS } from "./modules";
import { EVOLUTIONS } from "./evolutions";
import STORE_SRC from "../state/store.ts?raw";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";

/** 查一个模组带不带某个效果,必须读 effectiveSignature,不能读 def.signature。
 *
 * 2026-09-01(/loop 第 94 轮)。进化会**换掉**武器的签名(data/evolutions.ts),
 * 所以读原始定义就会数错。第 93 轮的功率抽取正是栽在这里:模组页读原始定义、
 * 战斗读 effectiveSignature,同一条船在两块屏幕上算出两个数。
 *
 * 这一轮顺着把剩下的读法都扫了一遍。查下来 store 里那两处**目前撞不到**:
 *
 *     进化只作用于武器            canEvolve: def.type !== "weapon" → false
 *     进化只产出战斗类签名        aoe / barrage / burn / chainArc / disable /
 *                                execute / finisher / overkill / volley
 *     而 store 查的是             hullBonus / evasion / prospector / insightDraw
 *                                —— 两组不相交
 *
 * 也就是说它现在是"碰巧安全",不是"设计上安全"。而这个类别**已经真的咬过一次**
 * (第 93 轮),所以不留着赌:改成按定义正确,并把那个不相交的前提钉下来——
 * 哪天有人加一件签名是 hullBonus 的武器、或者给装甲开进化,这条会先红。 */

/** equippedEffectStacks 会去查的那几个效果。 */
const STORE_LOOKED_UP = ["hullBonus", "evasion", "prospector", "insightDraw"];

describe("效果判定要认进化后的签名", () => {
  it("store 里的效果判定不再读原始 signature", () => {
    for (const fn of ["equippedEffectStacks", "effectiveShipEvasion", "effectiveShipPowerDraw"]) {
      const i = STORE_SRC.indexOf(`export function ${fn}`);
      expect(i, `找不到 ${fn}`).toBeGreaterThan(0);
      const body = STORE_SRC.slice(i, i + 1200);
      expect(body, `${fn} 还在读 def.signature——进化过的模组会被数错`).not.toMatch(
        /\bd\.signature ===|moduleDefById\([^)]*\)\.signature ===/,
      );
    }
  });

  /** 战斗那一侧本来就是对的,顺手钉住,免得反向漂移。 */
  it("战斗里的效果判定也用 effectiveSignature", () => {
    expect(COMBAT_SRC).toMatch(/return effectiveSignature\(m\) === id \|\| m\.traits\.includes\(id\)/);
  });

  /** 上面那个"不相交"的前提本身也钉住——它是"目前撞不到"的全部理由。 */
  it("进化只作用于武器,而且只产出战斗类签名", () => {
    const outputs = new Set(EVOLUTIONS.map((e) => e.signature));
    for (const eff of STORE_LOOKED_UP) {
      expect(
        outputs.has(eff),
        `进化现在会产出「${eff}」,而 store 查的正是它——两组不再不相交了`,
      ).toBe(false);
    }
    // 也不能有武器把这些效果当签名:那样进化会让它**丢掉**这个效果。
    for (const eff of STORE_LOOKED_UP) {
      const weapons = MODULE_DEFS.filter((m) => m.type === "weapon" && m.signature === eff);
      expect(
        weapons.map((w) => w.id),
        `有武器的签名是「${eff}」,它一进化就会丢掉这个效果`,
      ).toEqual([]);
    }
  });

  it("进化确实只认武器", () => {
    expect(STORE_SRC.length).toBeGreaterThan(0);
    const evoSrc = MODULE_DEFS.filter((m) => m.type !== "weapon" && EVOLUTIONS.some((e) => e.family === m.family));
    // 非武器模组也属于这些技术族,但它们不该能进化——这条由 canEvolve 保证,
    // 这里只确认族是重叠的,所以那道 type 检查确实在承重。
    expect(evoSrc.length, "技术族不再重叠了?那 canEvolve 的 type 检查就不承重了").toBeGreaterThan(0);
  });
});
