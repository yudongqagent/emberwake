import { describe, expect, it } from "vitest";
import { GAME_EVENTS, eventsForGalaxy, rollOutcome, type EventOption } from "./events";
import { encounterById } from "./encounters";
import { DIPLOMATIC_FACTIONS } from "./reputation";
import { BAUHINIA_REACH } from "./galaxies/bauhiniaReach";
import { LIONSHEART_EXPANSE } from "./galaxies/lionsheartExpanse";
import { SWANREACH_COMBINE } from "./galaxies/swanreachCombine";
import { FRACTURED_VEIL } from "./galaxies/fracturedVeil";
import { DEEP_ORIGIN } from "./galaxies/deepOrigin";
import { UMBRAL_LINE } from "./galaxies/umbralLine";
import { CHORUS_DEEP } from "./galaxies/chorusDeep";

const GALAXIES = [BAUHINIA_REACH, LIONSHEART_EXPANSE, SWANREACH_COMBINE, FRACTURED_VEIL, DEEP_ORIGIN, UMBRAL_LINE, CHORUS_DEEP];
const RESOURCES = ["salvage", "sourcePoints", "alloy", "originEssence", "insight"];

describe("星图事件", () => {
  it("每个事件都至少有两个选项——一个选项不是选择", () => {
    for (const e of GAME_EVENTS) {
      expect(e.options.length, `事件 "${e.id}" 只有 ${e.options.length} 个选项`).toBeGreaterThanOrEqual(2);
    }
  });

  it("每个选项都有真实后果,不存在纯装饰的按钮", () => {
    // 这是整套东西的支点。一个点了什么都不发生的选项,会教会玩家"这些框可以
    // 直接点掉"——那比没有事件更糟。
    for (const e of GAME_EVENTS) {
      for (const [i, opt] of e.options.entries()) {
        const outs = opt.outcome ? [opt.outcome] : (opt.outcomes ?? []).map((o) => o.outcome);
        expect(outs.length, `${e.id} 选项 ${i} 没有任何结果`).toBeGreaterThan(0);
        for (const o of outs) {
          const real = o.kind !== "nothing"
            || o.resources || o.hull || o.reputation || o.encounterId;
          expect(Boolean(real) || o.kind === "nothing", `${e.id} 选项 ${i} 的结果是空的`).toBe(true);
        }
      }
    }
  });

  it("每个事件里至少有一个选项是真的有代价或有风险的", () => {
    // FTL 的事件之所以记得住,是因为按下去之前你不知道自己赌对没有。
    // 三个"白拿"的选项排在一起,那不是事件,是发钱。
    for (const e of GAME_EVENTS) {
      const risky = e.options.some((opt) => {
        if (opt.outcomes && opt.outcomes.length > 1) return true;      // 赌博
        const o = opt.outcome;
        if (!o) return false;
        if (o.kind === "combat") return true;                           // 开打
        if ((o.hull ?? 0) < 0) return true;                             // 掉血
        if (Object.values(o.resources ?? {}).some((v) => (v ?? 0) < 0)) return true;   // 花钱
        if (Object.values(o.reputation ?? {}).some((v) => (v ?? 0) < 0)) return true;  // 得罪人
        return false;
      });
      expect(risky, `事件 "${e.id}" 的每个选项都是白拿的`).toBe(true);
    }
  });

  it("引用的遭遇都真实存在", () => {
    for (const e of GAME_EVENTS) {
      for (const opt of e.options) {
        const outs = opt.outcome ? [opt.outcome] : (opt.outcomes ?? []).map((o) => o.outcome);
        for (const o of outs) {
          if (o.encounterId) {
            expect(() => encounterById(o.encounterId!), `${e.id} 引用了不存在的遭遇 "${o.encounterId}"`).not.toThrow();
          }
        }
      }
    }
  });

  it("引用的资源和派系都是真的", () => {
    for (const e of GAME_EVENTS) {
      for (const opt of e.options) {
        const outs = opt.outcome ? [opt.outcome] : (opt.outcomes ?? []).map((o) => o.outcome);
        for (const o of outs) {
          for (const k of Object.keys(o.resources ?? {})) {
            expect(RESOURCES, `${e.id} 用了不存在的资源 "${k}"`).toContain(k);
          }
          for (const f of Object.keys(o.reputation ?? {})) {
            expect(DIPLOMATIC_FACTIONS, `${e.id} 改了不可交涉派系 "${f}" 的声望`).toContain(f);
          }
        }
      }
    }
  });

  it("中英文完整,不会在界面上蹦出另一种语言", () => {
    for (const e of GAME_EVENTS) {
      expect(e.zh.length).toBe(e.en.length);
      for (const l of e.zh) expect(/[a-zA-Z]{4,}/.test(l), `${e.id} 的中文里混进了英文`).toBe(false);
      for (const l of e.en) expect(/[一-鿿]/.test(l), `${e.id} 的英文里混进了中文`).toBe(false);
      for (const opt of e.options) {
        expect(opt.zh.length).toBeGreaterThan(0);
        expect(opt.en.length).toBeGreaterThan(0);
        const outs = opt.outcome ? [opt.outcome] : (opt.outcomes ?? []).map((o) => o.outcome);
        for (const o of outs) {
          expect(o.zh.length, `${e.id} 的结果缺中文`).toBeGreaterThan(0);
          expect(o.en.length, `${e.id} 的结果缺英文`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("中文只用全角标点", () => {
    for (const e of GAME_EVENTS) {
      const all = [...e.zh, ...e.options.map((o) => o.zh)];
      for (const opt of e.options) {
        const outs = opt.outcome ? [opt.outcome] : (opt.outcomes ?? []).map((o) => o.outcome);
        for (const o of outs) all.push(o.zh);
      }
      for (const l of all) {
        expect(/[,;?!]/.test(l), `${e.id} 的中文里有半角标点:「${l.slice(0, 24)}…」`).toBe(false);
      }
    }
  });

  it("每个星区都有事件可发,不会有星区空着", () => {
    for (const g of GALAXIES) {
      expect(eventsForGalaxy(g.id).length, `星区 "${g.id}" 一个事件都没有`).toBeGreaterThan(0);
    }
  });

  it("每个星系都有能触发事件的点——事件遇不上就等于不存在", () => {
    for (const g of GALAXIES) {
      for (const sys of g.systems) {
        const has = sys.pois.some((p) => p.kind === "derelict");
        expect(has, `星系 "${sys.id}" 没有任何废弃船,里面永远不会发生事件`).toBe(true);
      }
    }
  });

  it("加权结果按权重分布,而不是永远第一个", () => {
    const opt: EventOption = {
      zh: "", en: "",
      outcomes: [
        { weight: 1, outcome: { kind: "nothing", zh: "a", en: "a" } },
        { weight: 1, outcome: { kind: "nothing", zh: "b", en: "b" } },
      ],
    };
    expect(rollOutcome(opt, 0.1).zh).toBe("a");
    expect(rollOutcome(opt, 0.9).zh).toBe("b");
  });

  it("单一结果的选项永远返回那一个", () => {
    const opt: EventOption = { zh: "", en: "", outcome: { kind: "nothing", zh: "only", en: "only" } };
    for (const r of [0, 0.5, 0.999]) expect(rollOutcome(opt, r).zh).toBe("only");
  });
});
