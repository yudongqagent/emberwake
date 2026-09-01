import { describe, expect, it } from "vitest";
import { repEffects, DIPLOMATIC_FACTIONS, REP_MIN, REP_MAX } from "./reputation";
import BRIDGE_SRC from "../ui/screens/Bridge.tsx?raw";
import STORE_SRC from "../state/store.ts?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 声望的每一条效果都得在界面上说出来。
 *
 * 2026-09-01(/loop 第 117 轮)。搜到的说法:声望系统最常见的毛病是"玩家看不到
 * 它在做什么"——没有 UI 交代那些隐性收益,机制再扎实也等于不存在。
 *
 * repEffects 有**四条**效果,而且四条都真的接上了:
 *
 *     priceMultiplier   空间站定价(stationPrice)
 *     huntsYou          巡逻队来追杀(systemPois 过滤)
 *     fightsAlongside   盟舰参加你的舰队战(Combat.tsx)
 *     rewardBonus       战利品分成(resolveCombatVictory 的 allyShare)
 *
 * 舰桥的立场面板有五句文案,覆盖了前三条——**第四条一个字都没提**。而它偏偏是
 * 最大的一条:友善 +10%、盟友 +20%,乘在**每一场**战斗的全部战利品上,而不是只在
 * 那个派系的地盘上。store 里那行注释自己都写着它是"声望的第二个摸得着的好处"。
 *
 * 实测(把四个派系分别调到盟友/友善/中立/敌对,读舰桥):
 *
 *     ALLIED    25% off their markets, and their ships join your fleet battles.
 *               +20% loot from every fight that is not against them.
 *     FRIENDLY  They shave 12% off their prices for you.
 *               +10% loot from every fight that is not against them.
 *     NEUTRAL   They trade with you at the going rate.          ← 不该有分成那句
 *     HOSTILE   Their patrols hunt you...                        ← 不该有分成那句
 */

describe("声望的效果要看得见", () => {
  it("分成这条效果确实存在,而且不小", () => {
    const allied = repEffects(REP_MAX).rewardBonus;
    const neutral = repEffects(0).rewardBonus;
    expect(neutral).toBe(0);
    expect(allied, "盟友档没有战利品分成了?那这条守卫要重写").toBeGreaterThan(0.1);
  });

  it("它真的乘在战利品上,不是个死字段", () => {
    expect(STORE_SRC, "allyShare 没有接进结算").toMatch(/effectsFor\(f\)\.rewardBonus/);
    expect(STORE_SRC).toMatch(/const loadMult = emberLoadRewardMultiplier\(emberLoad\(\)\) \* \(1 \+ allyShare\)/);
  });

  /** 核心:只要某一档有分成,界面就必须说;没有分成的档不能乱说。 */
  it("有分成的档位都会显示,没有的不显示", () => {
    expect(BRIDGE_SRC, "立场面板没有渲染分成那一条").toMatch(
      /eff\.rewardBonus > 0 && \(/,
    );
    expect(BRIDGE_SRC, "百分比是写死的,调数值时文案会掉队").toMatch(
      /pct: Math\.round\(eff\.rewardBonus \* 100\)/,
    );
  });

  /** 四条效果一条都不能在界面上失踪。 */
  it("四条效果在文案里都有对应的说法", () => {
    const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf('const EN: StringTable = {'));
    const keys = {
      priceMultiplier: ["rep.effect.markup", "rep.effect.discount", "rep.effect.neutral"],
      huntsYou: ["rep.effect.hunts"],
      fightsAlongside: ["rep.effect.allied"],
      rewardBonus: ["rep.effect.rewardShare"],
    };
    const missing: string[] = [];
    for (const [axis, ks] of Object.entries(keys)) {
      for (const k of ks) {
        const re = new RegExp(`"${k.replace(/\./g, "\\.")}": "([^"]*)"`);
        if (!re.test(seg)) missing.push(`${axis}: 缺 ${k}`);
      }
    }
    expect(missing, missing.join("\n")).toEqual([]);
  });

  it("分成文案中英都在,而且带数字", () => {
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      const v = seg.match(/"rep\.effect\.rewardShare": "([^"]*)"/)?.[1];
      expect(v, `${lang} 缺少 rep.effect.rewardShare`).toBeTruthy();
      expect(v, `${lang} 的分成文案没给数字:「${v}」`).toContain("{pct}");
    }
  });

  /** 顺带钉住:每个可交涉派系在每个档位上都算得出效果,没有漏网的档。 */
  it("每个派系每个档位都有确定的效果", () => {
    for (const f of DIPLOMATIC_FACTIONS) {
      for (const v of [REP_MIN, -50, 0, 50, REP_MAX]) {
        const e = repEffects(v);
        expect(typeof e.priceMultiplier, `${f} @ ${v}`).toBe("number");
        expect(typeof e.rewardBonus, `${f} @ ${v}`).toBe("number");
      }
    }
  });
});
