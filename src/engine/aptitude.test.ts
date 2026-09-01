import { describe, expect, it } from "vitest";
import { applyXp, computeMaxHull, scanShip, xpToNextLevel, createWhisper } from "./ships";
import { APTITUDE_GROWTH, RARITY_MULTIPLIER, RARITY_ORDER } from "../data/hullClasses";
import { qualityMultiplier } from "./modules";
import type { Aptitude, ShipInstance } from "../data/types";
import BRIDGE_SRC from "../ui/screens/Bridge.tsx?raw";
import STORE_SRC from "../state/store.ts?raw";
import { scanShipAction, replaceState, flagship } from "../state/store";
import { createInitialState } from "./save";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 资质得真的做点什么,而且不能做到把稀有度阶梯压塌。
 *
 * 2026-08-31(/loop 第 50 轮)。APTITUDE_GROWTH 在这之前唯一的作用,是升级时把最大
 * 船体的增量按倍率补进当前血量——而 computeMaxHull **根本不看资质**。也就是说:
 *
 *   - S 资质和 D 资质的船,每一级的数值完全相同
 *   - 唯一的差别是升级那一瞬间多回十几点血
 *   - 而且满血时连这点差别都没有(那一行有 Math.min 封顶)
 *
 * 可界面上资质是舰桥五个头号数值之一,还专门有个"扫描"动作把它揭出来,S 只有 3%
 * 的权重。玩家扫出一个 S,以为拿到了什么。
 *
 * 按名字直译成"成长加成"是错的——见下面那条阶梯测试。改成经验倍率。 */

/** 所有对照船共用**同一个**基底。
 *
 * 第一版每次都调 createWhisper(),而它会重掷 rolls——于是"S 和 B 的同级船体上限
 * 相同"那条测出来是 205 对 203,差的是随机数不是资质。夹具本身也得对,否则守卫
 * 会用假阳性把人引偏。 */
const BASE = createWhisper();

function ship(aptitude: Aptitude | null, over: Partial<ShipInstance> = {}): ShipInstance {
  return { ...BASE, aptitude, level: 1, xp: 0, ...over };
}

describe("资质", () => {
  it("倍率表本身是有分量的,不是 0.99~1.01", () => {
    const vals = Object.values(APTITUDE_GROWTH);
    expect(Math.max(...vals) / Math.min(...vals)).toBeGreaterThan(2);
  });

  it("S 的船在同样的战斗里比 D 升得快", () => {
    const xp = xpToNextLevel(1) * 6;
    const s = applyXp(ship("S"), xp);
    const d = applyXp(ship("D"), xp);
    expect(s.level, `同样 ${xp} 经验,S 升到 ${s.level} 级、D 升到 ${d.level} 级`).toBeGreaterThan(d.level);
  });

  it("没扫描过的老船按 B 算,不会崩", () => {
    const n = applyXp(ship(null), 500);
    const b = applyXp(ship("B"), 500);
    expect(n.level).toBe(b.level);
  });

  /** 这条是"为什么不能直译成成长加成"的证据。 */
  it("等级相同的两条船,数值不受资质影响——稀有度阶梯不能被压塌", () => {
    for (const a of Object.keys(APTITUDE_GROWTH) as Aptitude[]) {
      expect(
        computeMaxHull(ship(a, { level: 12 })),
        `${a} 资质改变了同级船体上限,那低阶好船会超过高阶差船`,
      ).toBe(computeMaxHull(ship("B", { level: 12 })));
    }
  });

  it("稀有度阶梯本身还站得住(资质叠上去会撞碎它)", () => {
    for (let i = 0; i < RARITY_ORDER.length - 1; i++) {
      const loBest = RARITY_MULTIPLIER[RARITY_ORDER[i]] * qualityMultiplier(1);
      const hiWorst = RARITY_MULTIPLIER[RARITY_ORDER[i + 1]] * qualityMultiplier(0);
      expect(hiWorst).toBeGreaterThan(loBest);
      // 资质最大跨度(1.5/0.6 = 2.5)远超一档稀有度的余量,所以它只能进经验,
      // 不能进数值——这条断言把那个理由钉在测试里。
      const headroom = hiWorst / loBest;
      const aptSpread = Math.max(...Object.values(APTITUDE_GROWTH)) / Math.min(...Object.values(APTITUDE_GROWTH));
      expect(aptSpread, "资质跨度居然塞得进稀有度余量,那这条注释要重写").toBeGreaterThan(headroom);
    }
  });

  /** 扫描不能是个赌局:不扫按 B 算,扫了 45% 概率掷出 C/D,那就成了"别扫"。 */
  it("资质在建船时就定死,扫描只是读出来", () => {
    const fresh = createWhisper();
    expect(fresh.aptitude, "新船没有资质,那扫描就成了掷骰子").not.toBeNull();
    expect(fresh.scanned).toBe(false);
    const scanned = scanShip(fresh);
    expect(scanned.scanned).toBe(true);
    expect(scanned.aptitude, "扫描把资质重掷了一次").toBe(fresh.aptitude);
  });

  /** 第 35 轮的教训:自己的改动当天就会让别处的文案变陈旧。
   * 机库那句原来写的是"扫描可揭示隐藏的资质——即战舰升级时的成长潜力",
   * 而资质现在改的是经验,不是升级成长。 */
  it("说明文案没有停留在旧含义上", () => {
    for (const table of ["EN", "ZH"]) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${table}: StringTable = {`));
      const hint = seg.match(/"fleet\.hangarHint": "([^"]*)"/)?.[1] ?? "";
      expect(hint, `${table} 里找不到 fleet.hangarHint`).toBeTruthy();
      expect(hint, `${table} 的机库说明还在讲"升级时的成长"`).not.toMatch(/成长潜力|grows as it levels/);
      expect(hint, `${table} 的机库说明没提经验`).toMatch(/经验|XP/);
    }
  });

  it("界面上写了倍率,不是只有一个字母", () => {
    expect(BRIDGE_SRC, "舰桥只显示 S/A/B/C/D,不说它做什么").toMatch(/APTITUDE_GROWTH\[ship\.aptitude\]/);
    expect(BRIDGE_SRC).toMatch(/aptitudeTitle/);
  });
});

/** 第 73 轮补:上一次的修复落在了没人调用的函数上。
 *
 * scanShip 是"资质在建船时定死、扫描只揭示"这条规则的正主,但**没有任何人调用它**
 * ——舰队面板的扫描按钮走的是 store 的 scanShipAction,而那个函数自己重写了一遍,
 * 用 pickAptitude() 在扫描时重掷,还会覆盖掉建船时定好的值。
 *
 * 第 50 轮我实测看到"资质 C ×0.8"就认为修好了;那是旧路径掷出来的 C。
 * 验的是显示,不是机制。 */
/** 扫描源码前先剥掉注释:说明里必然要引用那行旧代码,而守卫查的是**还在不在跑**,
 * 不是"这个词出现过没有"。第一版没剥,当场被自己的注释绊倒(和第 68 轮同一个错)。 */
const STORE_CODE = STORE_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("扫描走的必须是同一条规则", () => {
  it("scanShipAction 调 scanShip,不自己重掷", () => {
    expect(STORE_CODE, "扫描动作没有走共用的 scanShip").toMatch(/scanShip\(s\)/);
    expect(
      /aptitude: pickAptitude\(\)/.test(STORE_CODE),
      "store 又在扫描时自己重掷资质了",
    ).toBe(false);
  });

  it("store 里不再抄一份权重表", () => {
    expect(
      /function pickAptitude\(\)/.test(STORE_CODE),
      "store 又抄了一份 APTITUDE_WEIGHTS——两个真相来源",
    ).toBe(false);
  });

  it("扫描一条已经定好资质的船,资质不变", () => {
    replaceState(createInitialState());
    const before = flagship.value!.aptitude;
    expect(before, "新船没有资质").not.toBeNull();
    scanShipAction(flagship.value!.id);
    expect(flagship.value!.scanned).toBe(true);
    expect(flagship.value!.aptitude, "扫描把资质重掷了").toBe(before);
  });
});
