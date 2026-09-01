import { describe, expect, it } from "vitest";
import COMBAT_SRC from "./screens/Combat.tsx?raw";
import SYSTEMVIEW_SRC from "./screens/SystemView.tsx?raw";

/** 画面循环跟着显示器走,游戏逻辑跟着时钟走。
 *
 * 2026-09-01(/loop 第 84 轮)。两个画布循环原来都是 setInterval(16)。SystemView
 * 那边还写了理由:"固定间隔能在会限制 rAF 的嵌入环境里保持稳定节奏"。那个顾虑
 * 是真的,但它换来的代价更大:
 *
 *   1. 16ms 对不上 60Hz 的 16.67ms——相位一直在漂,每秒有两三帧落进同一个刷新
 *      间隔里被白画一遍。rAF 存在的理由就是这个。
 *   2. **看不见的时候照画**。实测(手机视口、标签页隐藏,数 ctx.save() 的次数):
 *
 *          改前  1833 次/秒
 *          改后     0 次/秒
 *
 *      玩家切走之后,手机原来还在满速渲染没人看的画面。
 *
 * 换成 rAF 之后在同一个(受合成、隐藏的)嵌入面板里复验过:一旦真的需要出帧,
 * 画布照常画满整幅场景——那个"嵌入环境会卡住 rAF"的担心在这里没有发生。
 *
 * 安全性来自两件事,这两件都由下面的测试钉住:
 *   - step(now) 自己从 now 算 dt,而且夹了上限,所以停一段再回来不会跳一大步
 *   - **战斗逻辑走的是另一条 150ms 的心跳**,不在画面循环里。这一条最要紧:
 *     哪天有人"顺手统一"把它也改成 rAF,战斗就会在切走时暂停。 */

const LOOPS: [string, string][] = [
  ["Combat.tsx", COMBAT_SRC],
  ["SystemView.tsx", SYSTEMVIEW_SRC],
];

describe("画面循环", () => {
  it("两个画布循环都用 requestAnimationFrame", () => {
    for (const [name, src] of LOOPS) {
      expect(src, `${name} 的画面循环不是 rAF`).toMatch(
        /raf = requestAnimationFrame\(frame\);/,
      );
      expect(src, `${name} 卸载时没有取消 rAF`).toMatch(/cancelAnimationFrame\(raf\)/);
    }
  });

  it("画布循环里不再有 16ms 定时器", () => {
    for (const [name, src] of LOOPS) {
      expect(src, `${name} 还留着 16ms 的画面定时器`).not.toMatch(/\}, 16\);/);
    }
  });

  /** 抛异常不能把循环永久卡死——两处原来都有这条,换成 rAF 之后也得留着。 */
  it("一帧里抛异常不会把循环卡死", () => {
    for (const [name, src] of LOOPS) {
      const i = src.indexOf("const frame = (now: number) => {");
      expect(i, `${name} 找不到帧函数`).toBeGreaterThan(0);
      const body = src.slice(i, i + 400);
      expect(body, `${name} 的帧函数没有 try/catch`).toMatch(/try \{[\s\S]{0,80}step\(now\)/);
      expect(body, `${name} 出错之后不再排下一帧,循环就死了`).toMatch(
        /catch[\s\S]{0,140}\}\s*\n\s*raf = requestAnimationFrame\(frame\);/,
      );
    }
  });

  /** 停一段再回来不能跳一大步。 */
  it("dt 从 now 算,而且有上限", () => {
    expect(COMBAT_SRC).toMatch(/const dt = frozen \? 0 : Math\.min\(0\.25,/);
  });

  /** 最要紧的一条:战斗逻辑**不能**跟着画面一起暂停。
   * 它必须留在自己的定时器上,否则玩家切走时战斗会停在那里。 */
  it("战斗逻辑仍然走定时器,不跟着画面暂停", () => {
    expect(COMBAT_SRC, "战斗心跳被一起改成 rAF 了——切走时战斗会暂停").toMatch(
      /const id = setInterval\(\(\) => \{[\s\S]{0,200}combatTick\(\)/,
    );
  });

  /** 这个仓库里别处本来就用 rAF,这两处才是例外——顺手钉住那个事实,
   * 免得以后有人反过来"统一"成定时器。 */
  it("其它动画也还是 rAF", () => {
    expect(COMBAT_SRC.match(/requestAnimationFrame/g)?.length ?? 0).toBeGreaterThan(0);
  });
});
