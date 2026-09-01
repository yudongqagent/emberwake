import { describe, expect, it } from "vitest";
import COMBAT_SRC from "./screens/Combat.tsx?raw";

/** 看不见的时候,战斗不能继续打。
 *
 * 2026-09-01(/loop 第 89 轮)。搜到的原话:"网页游戏在标签页非活动时应当暂停,
 * 以免玩家丢失进度或错过关键事件"。而这里原来是反过来的。
 *
 * 两件事叠在一起:
 *   1. combatTick 的 dt 是**写死的** COMBAT_TICK_SEC(0.15),不看真实经过时间
 *   2. 实测(隐藏的浏览器面板里,用和 combatTick 同周期的 150ms 定时器量):
 *      **6.7 次/秒,完全没有被节流** —— 21.2 秒真实时间里战斗推进了 21.1 秒
 *
 * 常规战斗实测 8~12 秒。切走十几秒回来,就可能已经是战败画面。
 *
 * 而第 84 轮把画面循环换成 rAF 之后,这个不对称更刺眼:**画面停了,模拟没停**。
 * 玩家什么都没看见就输了——那一轮修对了渲染,却把这条一直存在的裂缝照亮了。
 *
 * 注意别指望浏览器替你节流:后台定时器的节流策略各家不一,嵌入/合成的场景里
 * 干脆不节流(上面那个 6.7 次/秒就是量出来的)。公平性不能建立在这上面。 */

describe("看不见就不推进", () => {
  it("战斗心跳在没人看的时候直接返回", () => {
    const i = COMBAT_SRC.indexOf("const id = setInterval(() => {");
    expect(i, "找不到战斗心跳").toBeGreaterThan(0);
    const body = COMBAT_SRC.slice(i, i + 1800);
    expect(body, "战斗心跳没有闸门——切走之后战斗照打").toMatch(
      /if \(shouldPause\(\)\) return;\s*\n\s*combatTick\(\);/,
    );
  });

  /** 只信 document.hidden 是不安全的:某些嵌入/合成环境会**一直**报 hidden,
   * 而画面其实照常呈现——只信它,战斗会在那种环境里永久卡死。这个仓库的浏览器
   * 预览面板正是这样一个环境,所以这不是假想的情况:我先只写了 document.hidden,
   * 在那个面板里战斗就再也不动了。
   *
   * 所以要两个**互相独立**的信号同时成立才停:页面报不可见,**并且**最近一段
   * 时间内一帧都没画出来。任何一个信号出错都锁不住游戏。 */
  it("暂停要两个独立信号都同意,不能只信 document.hidden", () => {
    const i = COMBAT_SRC.indexOf("function shouldPause()");
    expect(i, "没有统一的暂停判断").toBeGreaterThan(0);
    const body = COMBAT_SRC.slice(i, i + 260);
    expect(body, "只看了可见性,没有交叉验证帧").toMatch(/document\.hidden && Date\.now\(\) - lastFrameAtRef\.current > \d+/);
    // 帧的时间戳必须真的在渲染循环里被更新,否则那个信号是死的。
    expect(COMBAT_SRC, "帧时间戳没有在画面循环里更新——交叉验证是假的").toMatch(
      /const frame = \(now: number\) => \{\s*\n\s*lastFrameAtRef\.current = Date\.now\(\);/,
    );
  });

  /** dt 写死意味着"暂停再回来"是安全的(不会补算),但也意味着**不能**靠
   * 浏览器节流来保证公平——节流只会让它变慢,不会让它停。 */
  it("dt 是定值,所以暂停后恢复不会跳一大步", () => {
    expect(COMBAT_SRC).toMatch(/const dt = COMBAT_TICK_SEC \* combatSpeedRef\.current;/);
    // 若有人改成按真实经过时间算,暂停恢复的那一刻会一次性补算——那时这条守卫
    // 的理由要重写,所以先钉住。
    expect(COMBAT_SRC, "dt 改成了按真实时间算,暂停/恢复的语义要重新想一遍").not.toMatch(
      /const dt = \(now - last\w*\) \/ 1000[\s\S]{0,40}combatTick/,
    );
  });

  /** 只挡逻辑,不要顺手把画面也挡了——画面本来就跟着 rAF 停(第 84 轮), 
   * 在这里再加一道只会让代码有两处真相。 */
  it("画面循环不靠 document.hidden,它跟着 rAF 自己停", () => {
    const i = COMBAT_SRC.indexOf("const frame = (now: number) => {");
    expect(i, "找不到画面循环").toBeGreaterThan(0);
    const body = COMBAT_SRC.slice(i, i + 300);
    expect(body, "画面循环里也塞了 document.hidden——重复的真相").not.toMatch(/document\.hidden/);
  });
});
