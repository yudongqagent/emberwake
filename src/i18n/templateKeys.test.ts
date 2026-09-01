import { describe, expect, it } from "vitest";
import STR from "./strings.ts?raw";
import { MODULE_DEFS } from "../data/modules";
import { PACT_IDS } from "../data/pacts";
import { SIGIL_NODES } from "../data/sigils";
import { COMBAT_UNLOCKS } from "../data/combatUnlocks";
import { RIFT_ANOMALIES } from "../data/rift";
import { CREW_DEFS } from "../data/crew";
import { rangeProfileMultiplier } from "../engine/combat";
import COMBAT_SRC from "../ui/screens/Combat.tsx?raw";
import MODULESTATS_SRC from "../ui/components/ModuleStats.tsx?raw";

const SOURCES: [string, string][] = [
  ["Combat.tsx", COMBAT_SRC],
  ["ModuleStats.tsx", MODULESTATS_SRC],
];

/** 用模板拼出来的文案 key,每一个可能的取值都得真的存在。
 *
 * 2026-09-01(/loop 第 87 轮)。已有的 strings.test.ts 查的是**中英对称**——两张表
 * 条数一样、键一样。那条很有用,但它有个盲区:一个 key 两边**都没有**,它照样过。
 *
 * 而代码里有 40 种 t(`x.${y}`) 的写法,y 是运行时才知道的。字面量 key 我扫了一遍
 * (627 条,零缺失),模板 key 展开之后抓到两处真的会把 raw key 显示给玩家:
 *
 *   1. combat.rangeBand.flat —— **裂隙系全部五把武器**都是 flat 射程,而武器状态
 *      条渲染的是 t(`combat.rangeBand.${profile}`)。玩家武器旁边显示的是
 *      「combat.rangeBand.flat」这串东西。(旧缺陷)
 *
 *   2. rift.anomaly.none —— 浅层深潜最常掷到的就是 none(权重 5),而它按设计
 *      没有名字也没有说明。RiftStakesBar 一直用 `anomaly !== "none"` 挡着,
 *      **第 81 轮我加的指令说明面板没挡**。(我自己引入的)
 *
 * 顺带一条自我纠正:我最初还以为 combat.role.siege 缺失,查下来角色 id 其实叫
 * artillery,键是齐的——猜枚举值不算数,得从真实数据里取。这条测试因此全部从
 * 真实数据源展开,不写死列表。 */

const EN = STR.slice(STR.indexOf("const EN: StringTable = {"), STR.indexOf('const ZH: StringTable = {'));
const ZH = STR.slice(STR.indexOf('const ZH: StringTable = {'));
const has = (seg: string, k: string) => new RegExp(`"${k.replace(/\./g, "\\.")}":`).test(seg);

/** 每一族模板 key 的所有取值,全部从真实数据源展开。 */
function expectedKeys(): string[] {
  const out: string[] = [];
  for (const f of new Set(MODULE_DEFS.map((m) => m.family))) out.push(`family.${f}`);
  for (const t of new Set(MODULE_DEFS.map((m) => m.type))) out.push(`moduleType.${t}`);
  // 射程档只有这三个能到达渲染点;"flat" 和 anomaly 的 "none" 一样,是**刻意
  // 没有文案**的哨兵值,由下面那条"每个渲染点都要挡住"来保证。
  for (const b of ["close", "mid", "long"]) out.push(`combat.rangeBand.${b}`);
  for (const p of PACT_IDS) out.push(`pact.${p}`, `pact.${p}.desc`);
  for (const n of SIGIL_NODES) out.push(`sigil.node.${n.id}`, `sigil.desc.${n.id}`);
  for (const u of COMBAT_UNLOCKS) out.push(`unlock.${u.id}`, `unlock.${u.id}.desc`);
  for (const a of RIFT_ANOMALIES) {
    // none 按设计没有文案,所以它必须在**每一个**渲染点都被挡住(见下面那条)。
    if (a.id !== "none") out.push(`rift.anomaly.${a.id}`, `rift.anomaly.${a.id}.desc`);
  }
  for (const r of new Set(CREW_DEFS.map((c) => c.role))) out.push(`crewRole.${r}`);
  for (const r of new Set(CREW_DEFS.map((c) => c.rarity))) out.push(`crewRarity.${r}`);
  for (const o of ["close", "hold", "retreat"]) out.push(`combat.stance.${o}`, `combat.stance.${o}Title`);
  for (const c of ["weapons", "shields", "engines"]) {
    out.push(`reactor.${c}`, `reactor.${c}Title`, `reactor.effect.${c}`);
  }
  return [...new Set(out)];
}

describe("模板拼出来的文案 key", () => {
  it("每一个可能的取值,中英两张表里都有", () => {
    const missing: string[] = [];
    for (const k of expectedKeys()) {
      if (!has(EN, k)) missing.push(`EN ${k}`);
      if (!has(ZH, k)) missing.push(`ZH ${k}`);
    }
    expect(
      missing,
      `这些 key 会以原样(raw key)显示给玩家:\n${missing.join("\n")}`,
    ).toEqual([]);
  });

  /** 哨兵值:有文案的反面。"flat"(各档一样)和 "none"(没有异常)都**刻意不给文案**,
   * 因为它们要表达的就是"没有这回事"。代价是每一个渲染点都必须自己挡住它们——
   * 漏一个,玩家就会看到一串 raw key。
   *
   * 我最初把 flat 判成了缺失并且真的补了一条文案,查下来四个渲染点全都挡着,
   * 那条文案是死的,又撤了。守卫的模型不对就会造出假阳性,而假阳性比没有守卫
   * 更糟(第 28 轮的教训)。所以这一条查的是**挡没挡**,不是**有没有文案**。 */
  it("flat 射程在每一个渲染点都被挡住", () => {
    const flat = MODULE_DEFS.filter((m) => m.rangeProfile === "flat");
    expect(flat.length, "没有 flat 武器了?那这条守卫的理由要重写").toBeGreaterThan(0);
    for (const band of ["close", "mid", "long"] as const) {
      expect(rangeProfileMultiplier("flat", band), "flat 的含义是各档一样").toBe(1);
    }
    for (const [name, src] of SOURCES) {
      const sites = [...src.matchAll(/t\(`combat\.rangeBand\.\$\{(\w[\w.]*)\}/g)];
      for (const m of sites) {
        // 只有拿 rangeProfile 去渲染的那些才可能是 flat;band 变量只有三档。
        if (!/profile|rangeProfile/i.test(m[1])) continue;
        // 挡它的地方可能在几十行之前(比如 showFit 那个布尔量),窗口要够宽。
        const before = src.slice(Math.max(0, m.index! - 2000), m.index!);
        expect(
          /!== "flat"/.test(before),
          `${name} 有一处用 rangeProfile 渲染档位却没挡住 flat——裂隙系武器会显示 raw key`,
        ).toBe(true);
      }
    }
  });

  /** none 没有文案是设计,所以它必须在每一个渲染点都被挡住。 */
  it("anomaly 为 none 时,每一处都挡住了,不会去取不存在的 key", () => {
    const sites = [...COMBAT_SRC.matchAll(/t\(`rift\.anomaly\.\$\{([\w.]+)\}/g)];
    expect(sites.length, "找不到任何渲染 anomaly 名字的地方").toBeGreaterThan(0);
    for (const m of sites) {
      const before = COMBAT_SRC.slice(Math.max(0, m.index! - 320), m.index!);
      expect(
        /!== "none"/.test(before),
        `有一处渲染 rift.anomaly.\${${m[1]}} 之前没有挡住 none——浅层深潜会显示 raw key`,
      ).toBe(true);
    }
  });
});
