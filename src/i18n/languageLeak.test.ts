import { describe, expect, it } from "vitest";
import ASCENSION_SRC from "../ui/screens/Ascension.tsx?raw";
import FLEET_SRC from "../ui/screens/Fleet.tsx?raw";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";
import DATA_SRC from "./data/index.ts?raw";

/** 英文模式下不该冒出中文,反过来也一样。
 *
 * 2026-09-01(/loop 第 102 轮)。搜到的原话:未翻译/半翻译的字符串会混进成品,
 * 而根因往往是"文本被写死在代码里、或者被烤进了资源",于是翻译流程根本看不见它。
 *
 * 上一轮切到英文只查了**排版**;这一轮查内容。扫了每块屏幕上出现的 CJK 字符,
 * 抓到两处真的:
 *
 *   1. 进阶界面直接读 `def.nameCn` —— 英文模式下那里**只有中文**:
 *      英文玩家看到的是「主宰舰」,一个英文字都没有。
 *      (旁边的 `Sovereign-class (主宰舰)` 是刻意的双语设计,不是这一处的问题。)
 *
 *   2. 缴获的船名把**本地化之后**的字符串写进了存档:enemies 在构造时就过了
 *      localizedEnemyName,而 captureShip 存的是那一份。用中文玩时缴的船会永久
 *      叫「掠夺者副官快艇」,之后切成英文,舰队里那一行仍然是中文。
 *
 * 第二条是"存渲染结果而不是存 key"的经典形态——和文案表要存 key 是同一条规矩。 */

describe("语言不能互相渗漏", () => {
  it("进阶界面不再直接读 nameCn", () => {
    expect(
      ASCENSION_SRC,
      "进阶界面又直接读 nameCn 了——英文模式下那里会只有中文",
    ).not.toMatch(/\.nameCn\}/);
    expect(ASCENSION_SRC).toMatch(/localizedHullClassName\(/);
  });

  it("有一个只给单名的本地化函数,和双语那版分开", () => {
    expect(DATA_SRC).toMatch(/export function localizedHullClassName/);
    // 双语那版是刻意的,别顺手删掉。
    expect(DATA_SRC).toMatch(/export function localizedHullClassDisplay/);
  });

  it("缴获存的是原名,不是屏幕上那一份", () => {
    expect(COMBAT_SRC, "EnemyState 没有保留原名").toMatch(/baseName: string;/);
    expect(COMBAT_SRC, "构造 enemies 时没有留下原名").toMatch(
      /baseName: e\.name, name: localizedEnemyName\(e\.name\)/,
    );
    expect(COMBAT_SRC, "缴获又把本地化后的名字写进存档了").toMatch(
      /captureShip\(target!\.baseName, ship\.level\)/,
    );
  });

  /** 老存档里躺着的是本地化之后的名字,所以查表要能反查回去——否则修法只对
   * 新缴的船生效,已经存在的那些永远是旧语言。 */
  it("翻译是幂等的:传原名或传已翻译的名字都对", () => {
    expect(DATA_SRC, "没有反查表,老存档里的名字换语言不会变").toMatch(
      /const ENEMY_NAMES_FROM_ZH: Record<string, string> = Object\.fromEntries\(/,
    );
    expect(DATA_SRC).toMatch(/const canonical = ENEMY_NAMES_FROM_ZH\[name\] \?\? name;/);
  });

  it("舰队界面显示时才翻译", () => {
    // 缴获区和盟舰区**两处**都要翻——我第一版只改了前一处,实测舰队里那一行
    // 仍然是中文,才发现漏了。
    expect(FLEET_SRC, "缴获区没有翻译").toMatch(/localizedEnemyName\(cs\.name\)/);
    expect(FLEET_SRC, "盟舰区没有翻译——它和缴获区是同一批船").toMatch(/localizedEnemyName\(as\.name\)/);
  });
});
