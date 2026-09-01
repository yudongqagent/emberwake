import { describe, expect, it } from "vitest";
import COMBAT_SRC from "./Combat.tsx?raw";
import APP_SRC from "../../App.tsx?raw";
import STORE_SRC from "../../state/store.ts?raw";
import STRINGS_SRC from "../../i18n/strings.ts?raw";
import { hullAfterDefeat, DEFEAT_HULL_CAP_FRACTION } from "../../state/store";

/** 打不过的时候,得能走。
 *
 * 2026-09-01(/loop 第 75 轮)。搜到的对照是 FTL:一场遭遇战的两个出口是"打沉对面"
 * 和"顶住够久,把跃迁引擎充满然后跑",而后者是那个游戏紧张感的一半——你随时在
 * 判断"这仗还能不能打"。
 *
 * Emberwake 此前**只有两个出口:打赢,或者死**。而屏幕上一直摆着一个按钮,
 * 中文写的是「撤离」——它做的只是把距离拉开一档,并不能离开。玩家在血皮上按下
 * 那两个字,得到的是继续挨打,而且往往还更糟(拉到远距很多武器伤害反而掉)。
 *
 * 这不只是少一个功能,是一个**控件承诺了它做不到的事**——和第 63 轮那个接舷死局、
 * 第 68 轮那两个"重新定位"只推精灵坐标,是同一类。连战败画面自己都写着
 * 「舰队负伤撤离」:游戏的词汇表里早就有"撤离"了,只是没有对应的动作。
 *
 * 照 FTL 的形状做:
 *   - 逃要**时间**:在「远距」上持续保持撤离指令 7 秒
 *   - 充能期间对面**照打**:所以它自己有代价,不是躲开后果的按钮
 *   - 代价的形状和战败不同:
 *       战败  按**开打前**的船体砍半,期间受的伤反而不计
 *       撤离  按**打完时**的真实船体写回——那几秒挨的每一下都留着
 *   - 收获一律没有:没有战利品、没有经验、不清 POI、不写剧情 flag
 *
 * 裂隙里撤离和战败一样丢掉整趟收获——否则"再下一层"就不用赌了:推进,不行再撤,
 * 照样进银行。那会把第 55 轮才立起来的抉择整个抽空。 */

describe("撤离必须是战斗的第三个出口", () => {
  it("战斗有 withdrawn 这个结局,不是只有输赢", () => {
    expect(
      COMBAT_SRC,
      "onResolve 只认得胜/败/俘获——打不过的时候玩家还是只能等死",
    ).toMatch(/onResolve: \(result: "victory" \| "defeat" \| "captured" \| "withdrawn"\)/);
    expect(COMBAT_SRC).toMatch(/finishCombat\("withdrawn"/);
  });

  it("脱离要充能时间,不是按一下就走", () => {
    const m = COMBAT_SRC.match(/const WITHDRAW_SECONDS = (\d+(?:\.\d+)?)/);
    expect(m, "没有 WITHDRAW_SECONDS——脱离成了瞬发").toBeTruthy();
    const secs = Number(m![1]);
    // 下限:比接舷之外任何一次性操作都长,短了就成了"血皮免死金牌"。
    // 上限:超过一场仗的长度就等于没有这个出口。
    expect(secs, `脱离只要 ${secs} 秒,太短了`).toBeGreaterThanOrEqual(5);
    expect(secs, `脱离要 ${secs} 秒,比一场仗还长`).toBeLessThanOrEqual(12);
  });

  it("充能条件是「远距 + 撤离指令」,而且断了只停住不倒退", () => {
    expect(COMBAT_SRC).toMatch(
      /const charging = stanceOrderRef\.current === "retreat" && rangeBandRef\.current === "long"/,
    );
    // 和接舷同一套写法:进度只在条件成立时前进,没有任何 -= 或归零。
    const block = COMBAT_SRC.slice(COMBAT_SRC.indexOf("const charging = stanceOrderRef"));
    const tail = block.slice(0, block.indexOf("\n    }\n"));
    expect(tail, "脱离进度会倒退——短暂丢失档位不该赔掉已经挣到的时间").not.toMatch(
      /withdrawProgressRef\.current\s*(-=|= 0)/,
    );
  });

  it("代价和战败**形状不同**:撤离写回真实船体,战败按开打前砍半", () => {
    expect(STORE_SRC, "没有 resolveCombatWithdraw").toMatch(/export function resolveCombatWithdraw\(/);
    // 战败:开打前的值 × 0.5(封顶见下一条),受的伤不计。
    expect(STORE_SRC).toMatch(/hullAfterDefeat\(s\.currentHp, effectiveMaxHull\(s\)\)/);
    // 撤离:打完时的真实值。两者必须是两段不同的代码,否则"撤离"只是换个说法的死。
    const wd = STORE_SRC.slice(STORE_SRC.indexOf("export function resolveCombatWithdraw("));
    const body = wd.slice(0, wd.indexOf("\n}\n"));
    expect(body, "撤离也走了砍半那一套——那就没有区别了").not.toMatch(/0\.5/);
    expect(body, "撤离没有写回打完时的船体").toMatch(/endingHullPoints/);
    // 撤离不是败仗,不该记在船员头上。
    expect(body, "撤离扣了船员支持度").not.toMatch(/APPROVAL_PER_LOSS|adjustAssignedCrewApproval/);
  });

  /** 实测抓到的:撤离时真实船体 138,写进存档的却是 263。
   *
   * finishCombat 结算船体读的是渲染闭包里的 playerHull。胜/败两条路是 useEffect
   * 触发的(依赖里就有 playerHull),闭包是新的;而**接舷俘获和撤离都是从心跳
   * setInterval 里调的**——那个闭包停在装载那一刻。所以撤离的代价整个消失了,
   * 而俘获那条路上这个坑在这一轮之前就已经在了(俘获也走 realEndingHull)。
   *
   * 第 66 轮那次三连点击读到旧价格,是同一个坑。 */
  it("结算船体读 ref,不读渲染闭包——否则从心跳里结束的战斗会写回开打前的值", () => {
    const fin = COMBAT_SRC.slice(COMBAT_SRC.indexOf("function finishCombat("));
    const body = fin.slice(0, fin.indexOf("\n  }\n"));
    // 注释里当然会提到 playerHull——这条守卫存在的理由就得写清楚。先剥注释再扫,
    // 否则守卫会被自己的说明绊倒(第 68 轮、第 73 轮都栽过同一跤)。
    const code = body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const stale = [...code.matchAll(/[^.\w]playerHull(?![A-Za-z])/g)].map((m) => m[0]);
    expect(
      stale,
      `finishCombat 里还有 ${stale.length} 处直接读 playerHull——从 setInterval 调进来时那是开打前的值`,
    ).toEqual([]);
    expect(body).toMatch(/playerHullRef\.current \/ \(1 \+ hullBonusFraction\)/);
    expect(COMBAT_SRC, "ref 没有每次渲染同步").toMatch(/playerHullRef\.current = playerHull;/);
  });

  /** 做完撤离之后立刻露出来的一个反转:战败给的船体**不看你挨了多少**,
   * 于是残血时"去死"比"逃命"划算——那会让刚做出来的第三个出口没人按。
   *
   * 这条守卫钉的是那个不等式本身,不是某个具体公式。 */
  it("满血冲进去送死,不能比撑到脱离还划算", () => {
    const max = 263; // 实测那条船的满船体
    // 实测:满血 263 出发,第 149 点上下令撤离,脱离时 110。
    const measuredWithdraw = 110;
    expect(
      hullAfterDefeat(max, max),
      `满血战死写回 ${hullAfterDefeat(max, max)},比实测撤离剩下的 ${measuredWithdraw} 还高——那就没人会撤离了`,
    ).toBeLessThan(measuredWithdraw);
    expect(hullAfterDefeat(max, max)).toBe(Math.round(max * DEFEAT_HULL_CAP_FRACTION));
  });

  it("残血开打的人不再多挨一脚——封顶只管满血送死那一种", () => {
    const max = 400;
    // 已经很残了:砍半那条比封顶更低,就该走砍半。
    expect(hullAfterDefeat(40, max)).toBe(21);
    // 满血:走封顶。
    expect(hullAfterDefeat(max, max)).toBe(100);
    // 永远留一口气,不会归零。
    expect(hullAfterDefeat(1, max)).toBeGreaterThanOrEqual(1);
    expect(hullAfterDefeat(0, 1)).toBeGreaterThanOrEqual(1);
  });

  it("撤离拿不到任何收获", () => {
    // 抽卡只给胜/俘获。
    expect(APP_SRC).toMatch(/result === "victory" \|\| result === "captured"/);
    expect(APP_SRC, "撤离也能抽整备牌了").not.toMatch(/result === "withdrawn"[^)]*\)\s*\)\s*\{\s*\n\s*const ship/);
    // 战利品/经验/POI 清除/剧情 flag 全在 resolveCombatVictory 里,而撤离不调它。
    const fin = COMBAT_SRC.slice(COMBAT_SRC.indexOf('} else if (result === "withdrawn") {'));
    const branch = fin.slice(0, fin.indexOf("} else {"));
    expect(branch).toMatch(/resolveCombatWithdraw\(/);
    expect(branch, "撤离也结算了胜利奖励").not.toMatch(/resolveCombatVictory/);
  });

  it("裂隙里撤离和战败一样丢掉整趟收获——否则深潜就不用赌了", () => {
    expect(APP_SRC).toMatch(/const ended = result === "defeat" \|\| result === "withdrawn"/);
    // 那个 ended 必须同时管住出击和深潜两处,不能只改一处。
    const uses = APP_SRC.match(/if \(ended\) \{/g) ?? [];
    expect(uses.length, `只有 ${uses.length} 处用了 ended,出击和深潜必须都算`).toBe(2);
    // `if (!riftRun) return;` 在别的函数里也有一处(结算深潜那个),按行号切会切错——
    // 从 ended 的定义处往后找才是这个回调自己的那一段。
    const cb = APP_SRC.slice(APP_SRC.indexOf('const ended = result === "defeat"'));
    expect(cb, "深潜的撤离没有丢掉收获——那会把'再下一层'的赌局抽空").toMatch(
      /if \(ended\) \{[\s\S]{0,300}saveRiftRun\(null\)/,
    );
  });

  it("按钮不再承诺它做不到的事——中英都要说清代价", () => {
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      for (const k of ["combat.withdrawing", "combat.withdrawTitle", "combat.withdrawBody", "combat.log.withdrew"]) {
        expect(seg.match(new RegExp(`"${k.replace(/\./g, "\\.")}": "([^"]*)"`))?.[1], `${lang} 缺少 ${k}`).toBeTruthy();
      }
      // 说明文案得写出"要多久"——仓库自己"给数字不给形容词"的规矩
      // (第 30/53/69/70 轮同一条)。
      const tip = seg.match(/"combat\.stance\.retreatTitle": "([^"]*)"/)?.[1] ?? "";
      expect(/\d/.test(tip), `${lang} 的撤离说明没写要多久:「${tip}」`).toBe(true);
    }
    // 战败画面原来的中文标题是「舰队负伤撤离」——现在真有"撤离"了,
    // 输和撤离就不能再用同一个词。
    const zh = STRINGS_SRC.slice(STRINGS_SRC.indexOf('const ZH: StringTable = {'));
    const defeatTitle = zh.match(/"combat\.defeatTitle": "([^"]*)"/)?.[1] ?? "";
    expect(defeatTitle, `战败标题又叫「${defeatTitle}」了,和真正的撤离撞词`).not.toContain("撤离");
  });

  it("撤离进度画在玩家已经伸手去按的那个键上", () => {
    expect(COMBAT_SRC, "脱离进度没有任何可见反馈").toMatch(/width: `\$\{withdrawProgress \* 100\}%`/);
    expect(COMBAT_SRC).toMatch(/t\("combat\.withdrawing", \{ pct: Math\.round\(withdrawProgress \* 100\) \}\)/);
  });
});
