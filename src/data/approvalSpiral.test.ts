import { describe, expect, it } from "vitest";
import {
  approvalGainForWin, approvalTier, approvalEffects,
  APPROVAL_PER_WIN, APPROVAL_PER_LOSS, clampApproval,
} from "./crewApproval";
import CREW_SRC from "../ui/screens/Crew.tsx?raw";
import STORE_SRC from "../state/store.ts?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 输了要能爬回来。
 *
 * 2026-09-01(/loop 第 112 轮)。上一轮结尾我记下了这件事,说留给下一轮——就是它。
 *
 * 原来赢固定 +2、输固定 -5,而支持度直接决定船员被动强度和技能冷却。于是这是一条
 * 教科书式的死亡螺旋:输 → 被动变弱、冷却变长 → 更容易再输。实测(steady 50 起):
 *
 *     第 3 败 → 存疑    被动 0.75×  冷却 1.15×
 *     第 7 败 → 记恨    被动 0.50×  冷却 1.35×
 *     从 15 爬回 50 要 **20 场胜利**
 *     胜负各半打 20 场,从 15 出发会一路掉到 **0**
 *
 * 搜到的说法正对着这条:死亡螺旋"一旦开始几乎无法逃脱";而解法不是把负反馈拆掉,
 * 是另加一条**随着下沉而变强的正反馈**,让落后方有机会打回来。
 *
 * 这个仓库自己在声望那边已经写过同一句话:猎杀队自卫不扣声望,因为那会变成
 * 「一个爬不出来的坑」。船员支持度这边恰恰就是那个坑。
 *
 * 改法:输还是一律 -5(疼不变),赢的收益按档位放大——记恨 +6、存疑 +4、其余 +2。
 * 改完实测:
 *
 *     从 15 爬回 50   20 场 → **11 场**
 *     胜负各半 20 场   掉到 0 → 稳在 **19**(记恨/存疑那条线上)
 *
 * 也就是说打成五五开的玩家会停在「存疑」附近,而不是一路烂到底;赢面过半就能真的
 * 爬出去。坑有了出口,但输依然疼。 */

describe("支持度不能是爬不出来的坑", () => {
  it("越低的档位,一场胜利涨得越多", () => {
    const resentful = approvalGainForWin(10);
    const wary = approvalGainForWin(30);
    const steady = approvalGainForWin(50);
    expect(approvalTier(10)).toBe("resentful");
    expect(approvalTier(30)).toBe("wary");
    expect(approvalTier(50)).toBe("steady");
    expect(resentful).toBeGreaterThan(wary);
    expect(wary).toBeGreaterThan(steady);
    expect(steady, "正常档位的收益被改了——基准应该还是 APPROVAL_PER_WIN").toBe(APPROVAL_PER_WIN);
  });

  /** 最要紧的一条:在最底下,赢一场要压得过输一场,否则坑还是封死的。 */
  it("在最底下,一胜的收益盖得过一败的损失", () => {
    expect(
      approvalGainForWin(10),
      "记恨档赢一场还不如输一场亏得多——五五开还是会一路掉到 0",
    ).toBeGreaterThan(Math.abs(APPROVAL_PER_LOSS));
  });

  it("输的代价没有被削弱——疼还得疼", () => {
    expect(APPROVAL_PER_LOSS).toBe(-5);
  });

  /** 拿实际的数跑一遍,而不是只看常数。 */
  it("五五开不再一路掉到底", () => {
    let v = 15;
    for (let i = 0; i < 40; i++) {
      v = i % 2 === 0
        ? clampApproval(v + approvalGainForWin(v))
        : clampApproval(v + APPROVAL_PER_LOSS);
    }
    expect(v, `五五开打 40 场之后掉到了 ${v}——坑还在`).toBeGreaterThan(10);
  });

  it("赢面过半的玩家能真的爬出记恨档", () => {
    let v = 15;
    // 三胜一败
    for (let i = 0; i < 40; i++) {
      v = i % 4 === 3
        ? clampApproval(v + APPROVAL_PER_LOSS)
        : clampApproval(v + approvalGainForWin(v));
    }
    expect(approvalTier(v), `三胜一败打了 40 场还停在 ${approvalTier(v)}(${v})`).not.toBe("resentful");
    expect(approvalTier(v)).not.toBe("wary");
  });

  /** 别把坑填平了:高档位不该被加速,否则支持度就没有意义了。 */
  it("高档位不加速,顶端仍然要慢慢挣", () => {
    for (const v of [70, 90]) {
      expect(approvalGainForWin(v), `${approvalTier(v)} 档被加速了`).toBe(APPROVAL_PER_WIN);
    }
  });

  it("胜利结算走的是按档位放大的那条路", () => {
    expect(STORE_SRC, "胜利还在给所有人加同一个固定值").toMatch(
      /adjustAssignedCrewApprovalScaled\(\);/,
    );
    expect(STORE_SRC, "放大函数没有真的按每个人自己的支持度算").toMatch(
      /clampApproval\(c\.approval \+ approvalGainForWin\(c\.approval\)\)/,
    );
    // 失败那条仍然是一律 -5。
    expect(STORE_SRC).toMatch(/adjustAssignedCrewApproval\(APPROVAL_PER_LOSS\);/);
  });

  /** 爬出去的那条路要让玩家看得见,而且要给数字。 */
  it("船员界面把「下一场胜利涨多少」写出来了", () => {
    expect(CREW_SRC, "界面没有显示追赶收益").toMatch(
      /approvalGainForWin\(c\.approval\) > APPROVAL_PER_WIN/,
    );
    expect(CREW_SRC).toMatch(/t\("crew\.approvalCatchUp", \{ gain: approvalGainForWin\(c\.approval\) \}\)/);
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      const v = seg.match(/"crew\.approvalCatchUp": "([^"]*)"/)?.[1];
      expect(v, `${lang} 缺少 crew.approvalCatchUp`).toBeTruthy();
      expect(v, `${lang} 的追赶提示没给数字:「${v}」`).toContain("{gain}");
    }
  });

  /** 顺带钉住这条螺旋当初为什么要紧:档位是有机制后果的。 */
  it("档位确实改变被动和冷却,所以掉档是真的变弱", () => {
    const low = approvalEffects(10), mid = approvalEffects(50);
    expect(low.passiveMultiplier).toBeLessThan(mid.passiveMultiplier);
    expect(low.cooldownMultiplier).toBeGreaterThan(mid.cooldownMultiplier);
  });
});
