import { describe, expect, it } from "vitest";
import STORE_SRC from "../state/store.ts?raw";
import COMBAT_SRC from "./screens/Combat.tsx?raw";
import MODULES_SRC from "./screens/Modules.tsx?raw";
import BRIDGE_SRC from "./screens/Bridge.tsx?raw";
import FLEET_SRC from "./screens/Fleet.tsx?raw";
import STRINGS_SRC from "../i18n/strings.ts?raw";

/** 功率抽取只有一份算法,而且每块屏幕都要写出「用了多少 / 有多少」。
 *
 * 2026-09-01(/loop 第 93 轮)。第 90 轮把战斗顶栏从"只有容量"改成"用量/容量",
 * 但只改了战斗那一处。功率一共出现在**五块屏幕**上:
 *
 *     模组页    用量/容量 + 超载警告     ✓
 *     战斗      用量/容量 + 惩罚百分比   ✓(第 90 轮)
 *     舰桥      **只有容量**            ✗
 *     舰队      **只有容量**            ✗
 *     进阶      只有容量 —— 这一处是对的:它比的是两个舰级的容量,不是当前负载
 *
 * 又是"规则对了,但没接全"——而且这次是我自己上一轮留下的。
 *
 * 更要紧的是算法**写了两份**,而且两份不一样:
 *     战斗    effectiveSignature(m) === "capacitor"   进化过的模组算得上
 *     模组页  d.signature === "capacitor"             进化过的模组**算漏**
 * 同一条船在两块屏幕上会算出不同的抽取量,而这个数决定超载惩罚(冷却最多 ×2.5)。
 * 战斗那一份是对的(它自己的注释写着"必须用 effectiveSignature,否则每个模组的
 * 定义性效果都会悄悄失效")。收成一份,按战斗那份的口径。 */

const SURFACES: [string, string][] = [
  ["Combat.tsx", COMBAT_SRC],
  ["Modules.tsx", MODULES_SRC],
  ["Bridge.tsx", BRIDGE_SRC],
  ["Fleet.tsx", FLEET_SRC],
];

describe("功率的显示与算法", () => {
  it("抽取量只有一处算法", () => {
    expect(STORE_SRC).toMatch(/export function effectiveShipPowerDraw\(ship: ShipInstance\): number \{/);
    for (const [name, src] of SURFACES) {
      expect(src, `${name} 又自己算了一遍抽取量`).not.toMatch(/1 - 0\.12 \* /);
      expect(src, `${name} 没有用共享的抽取函数`).toMatch(/effectiveShipPowerDraw\(ship\)/);
    }
  });

  /** 进化过的模组必须算得上——这正是两份实现分叉的地方。 */
  it("电容的判定用 effectiveSignature,不是原始定义", () => {
    const i = STORE_SRC.indexOf("export function effectiveShipPowerDraw");
    const body = STORE_SRC.slice(i, i + 900);
    expect(body, "回去读原始 signature 了——进化过的电容会被算漏").toMatch(
      /effectiveSignature\(m\) === "capacitor"/,
    );
    expect(body, "还在读 def.signature").not.toMatch(/\.signature === "capacitor"[^)]*\)\s*\|\|\s*m\.traits/);
  });

  /** 四块给玩家看的屏幕都要写出分子,不能只写分母。 */
  it("每块屏幕都写「用量/容量」", () => {
    for (const [name, src] of SURFACES) {
      expect(
        src,
        `${name} 只显示了容量——超载的时候玩家看不出自己超了`,
      ).toMatch(/\{effectiveShipPowerDraw\(ship\)\}\/\{computePowerCapacity\(ship\)\}|powerDrawUsed\}\/\{capacity|current=\{usedPower\} max=\{capacity\}/);
    }
  });

  it("超载时有视觉提示", () => {
    for (const [name, src] of [["Bridge.tsx", BRIDGE_SRC], ["Fleet.tsx", FLEET_SRC]] as const) {
      // 颜色必须落在**数值**上:StatReadout 的 color 只管图标,染错地方等于没染。
      expect(src, `${name} 超载时数值没有变红(color 只染到了图标)`).toMatch(
        /value=\{<span style=\{\{ color: effectiveShipPowerDraw\(ship\) > computePowerCapacity\(ship\) \? "var\(--red\)"/,
      );
    }
    expect(COMBAT_SRC).toMatch(/color: powerStrain > 1 \? "var\(--red\)"/);
    expect(MODULES_SRC).toMatch(/t\("modules\.overdrawn", \{ pct:/);
  });

  it("说明文案中英都在,而且写了惩罚上限", () => {
    for (const lang of ["EN", "ZH"] as const) {
      const seg = STRINGS_SRC.slice(STRINGS_SRC.indexOf(`const ${lang}: StringTable = {`));
      const v = seg.match(/"bridge\.stat\.powerTitle": "([^"]*)"/)?.[1];
      expect(v, `${lang} 缺少 bridge.stat.powerTitle`).toBeTruthy();
      expect(/2\.5/.test(v!), `${lang} 没写出惩罚上限:「${v}」`).toBe(true);
    }
  });
});
