import { describe, expect, it } from "vitest";
import STORE_SRC from "./store.ts?raw";
import MODULES_SRC from "../ui/screens/Modules.tsx?raw";
import STATION_SRC from "../ui/screens/StationPanel.tsx?raw";
import CREW_SRC from "../ui/screens/Crew.tsx?raw";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";
import APP_SRC from "../App.tsx?raw";
import BRIDGE_SRC from "../ui/screens/Bridge.tsx?raw";
import FLEET_SRC from "../ui/screens/Fleet.tsx?raw";
import SYSTEMVIEW_SRC from "../ui/screens/SystemView.tsx?raw";
import GALAXY_SRC from "../ui/screens/GalaxyView.tsx?raw";

/** 玩家每按下一件**落定**的事,都该听见一声。
 *
 * 2026-09-01(/loop 第 80 轮)。搜到的原话:"每一个玩家动作都该有即时的视觉与听觉
 * 反馈;缺了它,游戏就显得没反应、读不懂。"
 *
 * 战斗里做得很足:34 处 playSfx,顿帧、震动、粒子、飘字都在。而**出击之间**那几块
 * 屏幕——你重建这条船的地方——是哑的:
 *
 *     Modules.tsx      15 个 onClick,0 声
 *     StationPanel.tsx 10 个 onClick,0 声
 *     Crew.tsx                        0 声
 *
 * 逐个动作核过之后(有些屏幕是在调用点放声音的,所以不能只看某一个文件),真正
 * 从头到尾没有声音的是这六个:
 *
 *     equipModule     装配/替换模组  ← 战斗之外最频繁的动作
 *     fitAll          「从库存装配 N 件」
 *     sellModule      卖掉模组(不可逆)
 *     repairFlagship  花废料修船
 *     assignCrew      让船员上岗
 *     buySigilRank    花刻印买永久成长
 *
 * 声音加在 **store 这一层**,不是加在按钮上:同一个动作可能有好几个入口
 * (装配就有两处 onClick 再加一个批量按钮),加在按钮上迟早漏一个——
 * 这正是 spend() 自己的注释说的"补在根上,别指望下一个调用点会记得"。 */

/** 会调用 store 动作的那些界面文件。 */
const CALLER_SOURCES: [string, string][] = [
  ["App.tsx", APP_SRC],
  ["Modules.tsx", MODULES_SRC],
  ["StationPanel.tsx", STATION_SRC],
  ["Crew.tsx", CREW_SRC],
  ["Bridge.tsx", BRIDGE_SRC],
  ["Fleet.tsx", FLEET_SRC],
  ["SystemView.tsx", SYSTEMVIEW_SRC],
  ["GalaxyView.tsx", GALAXY_SRC],
  ["Combat.tsx", COMBAT_SRC],
];

/** 一个导出函数的函数体。 */
function bodyOf(src: string, name: string): string | null {
  const m = new RegExp(`export function ${name}\\([^)]*\\)[^{]*\\{`).exec(src);
  if (!m) return null;
  const start = m.index + m[0].length - 1;
  let depth = 0;
  for (let j = start; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}") {
      depth--;
      if (depth === 0) return src.slice(start, j + 1);
    }
  }
  return null;
}

/** 会写盘 = 这个动作**落定**了,玩家改变了自己的存档。 */
function committingActions(): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  for (const m of STORE_SRC.matchAll(/export function (\w+)\([^)]*\)[^{]*\{/g)) {
    const body = bodyOf(STORE_SRC, m[1]);
    if (body && body.includes("persist()")) out.push({ name: m[1], body });
  }
  return out;
}

/** 不该响的那些:纯管道(自己不是一个玩家动作,而是别的动作的一部分)、
 * 以及在调用点放声音更合适的(战斗结局的音效由 Combat.tsx 按胜/败/撤离分别给)。
 *
 * 这张白名单是刻意要维护的:往里加一条,就得说清楚为什么这个动作按下去不该有声音。 */
const NO_SOUND_BY_DESIGN = new Set([
  // 纯管道:由别的动作调用,不是玩家直接按的东西
  "spend", "grant", "persist", "replaceState", "saveRiftRun", "markUnlockSeen",
  "clearSortieBoons", "adjustReputation", "adjustCinderTrust", "resolveEventOutcome",
  "completeScene", "scanShipAction",
  // 战斗结局:Combat.tsx 按胜/败/撤离分别放不同的音,放在这里反而会盖掉
  "resolveCombatWithdraw", "resolveCombatDefeat",
]);

describe("出击之间的动作也要有声音", () => {
  const actions = committingActions();

  it("确实扫到了一批会写盘的动作,否则下面是空转", () => {
    expect(actions.length).toBeGreaterThan(20);
  });

  /** 声音可以加在 store 里,也可以加在调用点——两种都算数,只是加在调用点的
   * 必须**每一个**入口都加(漏一个就是漏一个)。第一版守卫只认 store 那一种,
   * 于是把六个其实有声音的动作误报成哑的(跳跃、采矿、拆解、赠船…),
   * 逐个查过调用点才发现是守卫的模型不全——假阳性比没有守卫更糟(第 28 轮)。 */
  function soundedAtEveryCallSite(name: string): boolean {
    const callers = CALLER_SOURCES.filter(([, src]) => new RegExp(`\\b${name}\\(`).test(src));
    if (callers.length === 0) return false;
    return callers.every(([, src]) =>
      [...src.matchAll(new RegExp(`\\b${name}\\(`, "g"))].every((m) =>
        /playSfx\(/.test(src.slice(Math.max(0, m.index! - 200), m.index! + 260)),
      ),
    );
  }

  it("每一个落定的动作,要么自己响,要么每个入口都响,要么写进白名单并说明理由", () => {
    const silent = actions
      .filter(
        (a) =>
          !a.body.includes("playSfx") &&
          !NO_SOUND_BY_DESIGN.has(a.name) &&
          !soundedAtEveryCallSite(a.name),
      )
      .map((a) => a.name);
    expect(
      silent,
      `这些动作按下去改了存档却一声不响——玩家不知道自己刚才那一下有没有生效:\n${silent.join("\n")}`,
    ).toEqual([]);
  });

  /** 第 80 轮实测出来的那六个,单独钉住:它们是出击之间最常按的东西。 */
  it("那六个具体的动作确实响了", () => {
    for (const name of [
      "equipModule", "fitAll", "sellModule", "repairFlagship", "assignCrew", "buySigilRank",
    ]) {
      const body = bodyOf(STORE_SRC, name);
      expect(body, `${name} 不见了`).toBeTruthy();
      expect(body!, `${name} 又变哑了`).toMatch(/playSfx\(/);
    }
  });

  /** 白名单不能悄悄膨胀成"全都不用响"。 */
  it("白名单不能大过真正会响的那一批", () => {
    const loud = actions.filter((a) => a.body.includes("playSfx")).length;
    expect(NO_SOUND_BY_DESIGN.size, "白名单比有声音的动作还多,那规则就名存实亡了").toBeLessThan(loud * 2);
  });

  /** 声音加在 store 这一层,是因为同一个动作有好几个入口。这条钉住那个理由:
   * 装配在界面上确实不止一个入口。 */
  it("装配确实有多个入口——所以声音不能加在按钮上", () => {
    const entries = MODULES_SRC.match(/equipModule\(/g) ?? [];
    expect(entries.length, "装配只剩一个入口了?那这条守卫的理由要重写").toBeGreaterThan(1);
  });

  /** 战斗那一侧本来就做得足,顺手钉住,免得以后被"统一"掉。 */
  it("战斗里的反馈不能退化", () => {
    const n = (COMBAT_SRC.match(/playSfx\(/g) ?? []).length;
    expect(n, `战斗里只剩 ${n} 处音效了`).toBeGreaterThan(25);
  });

  /** 这三块屏幕是玩家重建这条船的地方,它们背后的动作必须有声音——
   * 不管声音是加在按钮上还是加在 store 里。 */
  it("重建这条船的三块屏幕,背后的动作都通到了有声音的路径", () => {
    for (const [name, src, actionNames] of [
      ["Modules.tsx", MODULES_SRC, ["equipModule", "fitAll", "sellModule", "upgradeModule"]],
      ["StationPanel.tsx", STATION_SRC, ["repairFlagship", "recruitGenericCrew", "addModule"]],
      ["Crew.tsx", CREW_SRC, ["assignCrew"]],
    ] as const) {
      for (const action of actionNames) {
        if (!new RegExp(`\\b${action}\\b`).test(src)) continue;
        const body = bodyOf(STORE_SRC, action);
        const atCallSite = new RegExp(`${action}\\([^)]*\\)[\\s\\S]{0,120}?playSfx\\(`).test(src);
        expect(
          (body?.includes("playSfx") ?? false) || atCallSite,
          `${name} 上的「${action}」按下去没有任何声音`,
        ).toBe(true);
      }
    }
  });
});
