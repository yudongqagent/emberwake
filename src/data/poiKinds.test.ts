import { describe, expect, it } from "vitest";
import { GALAXIES } from "../state/store";
import TYPES_SRC from "./types.ts?raw";
import SYSTEM_SRC from "../ui/screens/SystemView.tsx?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 声明了的 POI 类型,地图上必须真的有。
 *
 * 2026-08-31 实测(/loop 第 31 轮)。types.ts 声明了 7 种 POI:
 *
 *     station | asteroidField | derelict | patrol | storyMarker | wreck | riftPocket
 *
 * 而七个星区里实际存在的只有 5 种。`riftPocket` 一个实例都没有——尽管
 * SystemView 里它是**完整实现**的:接近逻辑、三档下潜面板(浅层/深层/深渊,
 * 对应 encounters.ts 里真实存在的三个遭遇)、还有专门画的漩涡传送门。
 *
 * 更难看的是系统视图的提示文字一直写着「靠近空间站、矿场、残骸、**裂隙**和目标
 * 以进行交互」——指着一个地图上不存在的东西。新玩家读了这句去找,永远找不到。
 *
 * 而同一轮量出来的密度是:新手区 22 个点,后面每区只有 5–14 个。裂隙恰好是这个
 * 游戏唯一的无尽内容,却被埋在舰桥的一个按钮后面。 */

const ALL_POIS = GALAXIES.flatMap((g) => g.systems).flatMap((s) => s.pois);

/** types.ts 里 PoiKind 联合类型的成员。 */
function declaredKinds(): string[] {
  const m = TYPES_SRC.match(/export type PoiKind =([^;]*);/);
  expect(m, "找不到 PoiKind 的声明").toBeTruthy();
  return [...m![1].matchAll(/"(\w+)"/g)].map((x) => x[1]);
}

describe("声明了的 POI 类型必须真的出现在地图上", () => {
  const declared = declaredKinds();
  const placed = new Set<string>(ALL_POIS.map((p) => p.kind));

  it("读到了类型声明和地图数据", () => {
    expect(declared.length).toBeGreaterThan(4);
    expect(ALL_POIS.length).toBeGreaterThan(50);
  });

  it("每种在 SystemView 里实现了的类型,地图上至少有一个", () => {
    // storyMarker 没有交互实现,是纯标记用的预留,不在此列。
    const implemented = declared.filter((k) => SYSTEM_SRC.includes(`kind === "${k}"`));
    const missing = implemented.filter((k) => !placed.has(k));
    expect(
      missing,
      `这些类型代码里做完了、地图上一个都没有——玩家永远遇不到:\n${missing.join("\n")}`,
    ).toEqual([]);
  });

  it("提示文字里提到的东西,地图上要找得到", () => {
    // 「靠近空间站、矿场、残骸、裂隙和目标以进行交互」——这句里每样都得存在。
    // 直接读源码里英文表的那一行,免得为了测试把整张表 export 出去。
    const hint = STRINGS_SRC.match(/"system\.hint": "([^"]*)"/)?.[1] ?? "";
    expect(hint, "找不到系统视图的提示文案").toBeTruthy();
    if (/\brift/i.test(hint)) {
      expect(placed.has("riftPocket"), "提示让玩家去找裂隙,而地图上没有任何裂隙").toBe(true);
    }
  });

  it("裂隙囊分布在后期星区——那里正是内容最稀的地方", () => {
    const withPocket = GALAXIES.filter((g) => g.systems.some((s) => s.pois.some((p) => p.kind === "riftPocket")));
    expect(withPocket.length, "裂隙囊只放了一处或没放").toBeGreaterThan(2);
    expect(
      Math.min(...withPocket.map((g) => g.threat)),
      "裂隙囊放到了新手区——它是无尽内容,该落在后期",
    ).toBeGreaterThan(2);
  });
});
