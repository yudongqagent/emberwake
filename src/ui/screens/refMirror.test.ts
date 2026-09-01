import { describe, expect, it } from "vitest";
import COMBAT_SRC from "./Combat.tsx?raw";

/** 凡是"给冻结闭包看的" ref,都必须每次渲染重新镜像。
 *
 * 2026-09-01(/loop 第 100 轮)。搜到的说法点了名:陈旧闭包(stale closure)——
 * 闭包捕获了过期的变量,而修法是"用 ref 持有可变值,并小心维护依赖"。
 *
 * 这个文件被这一类咬过**三次**,每次都是真缺陷:
 *
 *     第 66 轮  同一 tick 里连点三次招募,三次都读到渲染闭包里的旧价格
 *     第 75 轮  finishCombat 从心跳里被调用,结算船体读到的是**开打前**的值
 *     第 93 轮  功率抽取两份实现分叉,模组页和战斗算出不同的数
 *
 * 战斗的心跳和画面循环都跑在挂载时就冻住的闭包里,所以任何随渲染变化的量都必须
 * 走 `xRef.current = x` 这条镜像。这条守卫把那个纪律本身钉死:
 * **有同名 state 的 ref,必须每次渲染赋值**。
 *
 * 反过来那些没有同名 state 的 ref(伤害累计、击杀数、开打时间、回血累加器……)
 * 是循环自己的账本,本来就没有可镜像的来源——它们不在这条规则里。 */

/** `const [x, setX] = useState(...)` 里的 x。 */
const stateNames = new Set(
  [...COMBAT_SRC.matchAll(/const \[(\w+), set\w+\] = useState/g)].map((m) => m[1]),
);

/** `const xRef = useRef(...)` 里的 xRef。 */
const refNames = [...COMBAT_SRC.matchAll(/const (\w+Ref) = useRef\(/g)].map((m) => m[1]);

/** 顶层(两个空格缩进)的镜像赋值。 */
const mirrored = new Set(
  [...COMBAT_SRC.matchAll(/^ {2}(\w+Ref)\.current = /gm)].map((m) => m[1]),
);

describe("冻结闭包看的 ref 必须每次渲染镜像", () => {
  it("确实扫到了一批 state 和 ref,否则下面是空转", () => {
    expect(stateNames.size).toBeGreaterThan(15);
    expect(refNames.length).toBeGreaterThan(20);
  });

  it("每个有同名 state 的 ref 都被镜像了", () => {
    const missing = refNames.filter((r) => {
      const base = r.slice(0, -3); // 去掉 "Ref"
      return stateNames.has(base) && !mirrored.has(r);
    });
    expect(
      missing,
      `这些 ref 有同名 state 却没有每次渲染镜像——心跳里读到的会是挂载那一刻的旧值:\n${missing.join("\n")}`,
    ).toEqual([]);
  });

  /** 那几个曾经真的出过事的,单独钉住。 */
  it("出过事的那几个都还在镜像", () => {
    for (const r of ["playerHullRef", "pactsRef", "stanceOrderRef", "rangeBandRef", "statusRef", "reactorRef"]) {
      expect(mirrored.has(r), `${r} 不再每次渲染镜像了`).toBe(true);
    }
  });

  /** 心跳和画面循环都必须只从 ref 读这些量,不能直接读渲染闭包里的变量。
   * finishCombat 那一处已经有专门的守卫(withdraw.test.ts),这里钉住入口本身。 */
  it("心跳跑在冻结的闭包里——这是这条纪律存在的原因", () => {
    expect(COMBAT_SRC).toMatch(/const id = setInterval\(\(\) => \{/);
    expect(COMBAT_SRC).toMatch(/const frame = \(now: number\) => \{/);
  });
});
