import { describe, expect, it } from "vitest";
import { REACTIVE_LINES, applyReactiveLines, type StoryContext } from "./reactive";
import { ACT1_SCENES } from "./act1";
import { ACT2_SCENES } from "./act2";
import { ACT3_SCENES } from "./act3";
import { ACT4_SCENES } from "./act4";
import { ACT5_SCENES } from "./act5";
import { ACT6_SCENES } from "./act6";
import { STANDING_SCENES } from "./standing";
import { SCENE_PROSE, applyProse } from "./prose";
import { localizedScene } from "../../i18n/story";
import { language } from "../../i18n/language";
import { DIPLOMATIC_FACTIONS, repTier } from "../reputation";

const SCENES = [...ACT1_SCENES, ...ACT2_SCENES, ...ACT3_SCENES, ...ACT4_SCENES, ...ACT5_SCENES, ...ACT6_SCENES];

function ctx(over: Partial<StoryContext> = {}): StoryContext {
  return {
    level: 1,
    ascensions: 0,
    hullClassName: "Corvette-class",
    reputation: {},
    cinderTrust: 0,
    alliedShips: 0,
    capturedShips: 0,
    voluntaryLoad: 0,
    flags: {},
    ...over,
  };
}

describe("会看玩家的剧情", () => {
  it("插入的位置都是真实存在的场景和真实存在的行号", () => {
    // 场景 id 打错、或者场景被重写以后行数变少,插入会静静地掉到末尾去——
    // 不报错,只是台词出现在错的地方。
    for (const [id, inserts] of Object.entries(REACTIVE_LINES)) {
      const scene = SCENES.find((s) => s.id === id);
      expect(scene, `插入指向了不存在的场景 "${id}"`).toBeDefined();
      for (const ins of inserts) {
        expect(ins.after, `场景 "${id}" 的插入位置 ${ins.after} 超出了它的 ${scene!.lines.length} 行`)
          .toBeLessThan(scene!.lines.length);
      }
    }
  });

  it("中英两套都写全了,不会在中文界面里蹦出英文", () => {
    for (const [id, inserts] of Object.entries(REACTIVE_LINES)) {
      for (const ins of inserts) {
        expect(ins.speaker.zh, `${id}: 说话人缺中文名`).toBeTruthy();
        for (const v of ins.variants) {
          expect(v.en.length, `${id}: 缺英文`).toBeGreaterThan(0);
          expect(v.zh.length, `${id}: 缺中文`).toBeGreaterThan(0);
          expect(/[a-zA-Z]{4,}/.test(v.zh), `${id} 的中文里混进了英文: ${v.zh}`).toBe(false);
        }
      }
    }
  });

  it("没有任何条件命中时,场景一个字都不改", () => {
    // "没触发"必须是安全的降级。默认玩家(1 级、没重铸、谁也没得罪)在多数场景里
    // 就该什么都不多说。
    const scene = SCENES.find((s) => s.id === "seizingCommand")!;
    const out = applyReactiveLines(scene, ctx(), "zh");
    expect(out.lines).toEqual(scene.lines);
    expect(out).toBe(scene);
  });

  it("同一场戏,不同的玩家会听到不同的话", () => {
    // 这条就是整件事的意义所在:如果两个截然不同的玩家看到的是同一场戏,
    // 那这套东西白做了。
    const scene = SCENES.find((s) => s.id === "ridgeAndReach")!;
    const withConcord = applyReactiveLines(scene, ctx({ reputation: { lionsheart: 70 } }), "zh");
    const withCombine = applyReactiveLines(scene, ctx({ reputation: { swanreach: 70 } }), "zh");
    const enemyOfBoth = applyReactiveLines(scene, ctx({ reputation: { lionsheart: -80 } }), "zh");
    const texts = [withConcord, withCombine, enemyOfBoth].map((s) => s.lines.map((l) => l.text).join("|"));
    expect(new Set(texts).size, "三种截然不同的玩家听到了同一场戏").toBe(3);
    for (const s of [withConcord, withCombine, enemyOfBoth]) {
      expect(s.lines.length).toBe(scene.lines.length + 1);
    }
  });

  it("插进去的话落在指定的位置,而不是被后面的插入挤跑", () => {
    const scene = SCENES.find((s) => s.id === "ridgeAndReach")!;
    const out = applyReactiveLines(scene, ctx({ reputation: { lionsheart: 70 } }), "zh");
    // after: 1 => 插在下标 2
    expect(out.lines[0]).toEqual(scene.lines[0]);
    expect(out.lines[1]).toEqual(scene.lines[1]);
    expect(out.lines[2].speaker).toBe("柳芸");
    expect(out.lines[3]).toEqual(scene.lines[2]);
  });

  it("语言选哪个就出哪个", () => {
    const scene = SCENES.find((s) => s.id === "hollowFleet")!;
    const zh = applyReactiveLines(scene, ctx({ ascensions: 3 }), "zh");
    const en = applyReactiveLines(scene, ctx({ ascensions: 3 }), "en");
    expect(zh.lines[3].speaker).toBe("余烬");
    expect(en.lines[3].speaker).toBe("The Cinder");
    expect(/[一-鿿]/.test(en.lines[3].text), "英文行里混进了中文").toBe(false);
  });

  it("一个走完全程的玩家,至少有六场戏认得出他", () => {
    // 一两处彩蛋不算"剧情知道你是谁"。给一个玩到底的玩家定一条下限,
    // 免得以后场景重写时这套东西悄悄退化成两三处。
    const veteran = ctx({
      level: 40,
      ascensions: 5,
      cinderTrust: 3,
      alliedShips: 4,
      capturedShips: 2,
      voluntaryLoad: 2,
      reputation: { lionsheart: 80, bauhinia: -70, swanreach: 65 },
      flags: { tigerSharkAlliance: true },
    });
    const touched = SCENES.filter((s) => applyReactiveLines(s, veteran, "zh") !== s);
    expect(touched.length, `只有 ${touched.length} 场戏认得出这个玩家`).toBeGreaterThanOrEqual(6);
  });
});

// --- 立场戏 (data/story/standing.ts)
describe("因为立场才发生的戏", () => {
  it("每场都挂着声望门槛,否则它就只是六场随便什么时候都会跳的过场", () => {
    for (const s of STANDING_SCENES) {
      expect(s.requiresStanding, `"${s.id}" 没有声望门槛`).toBeDefined();
      const { min, max } = s.requiresStanding!;
      expect(min !== undefined || max !== undefined, `"${s.id}" 的门槛是空的`).toBe(true);
    }
  });

  it("门槛落在真实存在的档位上,不会写出一个永远够不到的数", () => {
    for (const s of STANDING_SCENES) {
      const { faction, min, max } = s.requiresStanding!;
      expect(DIPLOMATIC_FACTIONS, `"${s.id}" 挂在不可交涉的派系上`).toContain(faction);
      if (min !== undefined) expect(repTier(min)).toMatch(/friendly|allied/);
      if (max !== undefined) expect(repTier(max)).toBe("hostile");
    }
  });

  it("同一个星系里的两场戏不会同时满足条件", () => {
    // 盟友版和翻脸版都挂在同一个星系上。如果门槛写重叠了,玩家会连着看到
    // 两场互相矛盾的戏——而 availableScene 只取第一个,后一场会永远不出现。
    const bySystem: Record<string, typeof STANDING_SCENES> = {};
    for (const s of STANDING_SCENES) (bySystem[s.systemId] ??= []).push(s);
    for (const [sys, list] of Object.entries(bySystem)) {
      for (let v = -100; v <= 100; v++) {
        const hit = list.filter((s) => {
          const { min, max } = s.requiresStanding!;
          return (min === undefined || v >= min) && (max === undefined || v <= max);
        });
        expect(hit.length, `星系 "${sys}" 在声望 ${v} 时同时满足 ${hit.map((h) => h.id).join(", ")}`)
          .toBeLessThanOrEqual(1);
      }
    }
  });

  it("每场都是一次性的,不会在同一个星系里反复弹", () => {
    for (const s of STANDING_SCENES) {
      expect(s.onCompleteFlags, `"${s.id}" 完成后不设 flag`).toContain(s.hiddenAfterFlag);
    }
  });

  it("说话人只能是在册的角色", () => {
    const CAST = new Set(["", "Kade Ren", "The Cinder", "Kaan Ferrous", "Ori Vashti", "Sir Arthaine", "Tiger Shark"]);
    for (const s of STANDING_SCENES) {
      for (const l of s.lines) expect(CAST, `"${s.id}" 里出现了不在册的 "${l.speaker}"`).toContain(l.speaker);
    }
  });

  it("露脸太少的三个人,确实因此多了戏", () => {
    // 这批戏存在的理由就是这个。铁衡/柳芸/安鹤龄在主线上各自只有个位数台词。
    const count = (name: string) =>
      STANDING_SCENES.flatMap((s) => s.lines).filter((l) => l.speaker === name).length;
    expect(count("Kaan Ferrous")).toBeGreaterThanOrEqual(6);
    expect(count("Ori Vashti")).toBeGreaterThanOrEqual(6);
    expect(count("Sir Arthaine")).toBeGreaterThanOrEqual(3);
  });
});

// --- 开场散文 (data/story/prose.ts)
describe("开场散文", () => {
  it("散文指向的场景都真实存在", () => {
    for (const id of Object.keys(SCENE_PROSE)) {
      expect(SCENES.some((s) => s.id === id), `散文指向了不存在的场景 "${id}"`).toBe(true);
    }
  });

  it("中英两套段数一致", () => {
    for (const [id, p] of Object.entries(SCENE_PROSE)) {
      expect(p.zh.length, `${id}: 中英段数不一致`).toBe(p.en.length);
      expect(p.zh.length).toBeGreaterThan(0);
    }
  });

  it("不许混语言", () => {
    for (const [id, p] of Object.entries(SCENE_PROSE)) {
      for (const z of p.zh) expect(/[a-zA-Z]{4,}/.test(z), `${id} 的中文里混进了英文`).toBe(false);
      for (const e of p.en) expect(/[一-鿿]/.test(e), `${id} 的英文里混进了中文`).toBe(false);
    }
  });

  it("散文必须真的是散文——一句格言不算", () => {
    // 整件事的起点就是"每句平均 27.9 字,全篇都是一句接一句的格言"。如果新写的
    // 段落还是那个长度,那什么都没改变。
    const all = Object.values(SCENE_PROSE).flatMap((p) => p.zh);
    const avg = all.reduce((n, t) => n + t.length, 0) / all.length;
    expect(avg, `散文平均 ${avg.toFixed(1)} 字,和原来的台词一样短`).toBeGreaterThan(50);
  });

  it("散文不许和它替换的旁白说同一件事", () => {
    // 实测抓到的:「第一舰队的残骸」里"几百具船体,全都朝着同一个方向"连着出现两次。
    // 散文本来就是把原句展开写的,所以原句必须让位——这条会抓住以后所有同类重复。
    // 中英各查一遍。中文要先过覆盖层,否则等于拿中文散文去比英文台词。
    for (const lang of ["zh", "en"] as const) {
      for (const id of Object.keys(SCENE_PROSE)) {
        const base = SCENES.find((s) => s.id === id)!;
        language.value = lang;
        const out = applyProse(lang === "zh" ? localizedScene(base) : base, lang);
        // 只查旁白。台词之间的重复往往是刻意的呼应——英文里陆昭说
        // "Twenty years of that."、余烬原样接一句,那是写法,不是 bug。
        const texts = out.lines.filter((l) => l.speaker === "").map((l) => l.text);
        const n = lang === "zh" ? 12 : 24;
        for (let i = 0; i < texts.length; i++) {
          for (let j = i + 1; j < texts.length; j++) {
            const a = texts[i].slice(0, n);
            expect(texts[j].startsWith(a), `${lang}/${id}: 第 ${i} 句和第 ${j} 句开头相同 —— 「${a}…」`).toBe(false);
          }
        }
      }
    }
    language.value = "en";
  });

  it("只丢开头连续的旁白,绝不会误伤台词", () => {
    const scene = SCENES.find((s) => s.id === "coldWake")!;
    const out = applyProse(scene, "zh");
    const originalSpoken = scene.lines.filter((l) => l.speaker !== "");
    const keptSpoken = out.lines.filter((l) => l.speaker !== "");
    expect(keptSpoken).toEqual(originalSpoken);
  });

  it("没配散文的场景一个字都不改", () => {
    const scene = SCENES.find((s) => !SCENE_PROSE[s.id])!;
    expect(applyProse(scene, "zh")).toBe(scene);
  });

  it("散文把剧情的体量抬起来了", () => {
    // 原来 6,389 字。散文的意义之一就是让读者慢下来,而慢下来需要字数。
    const added = Object.values(SCENE_PROSE).flatMap((p) => p.zh).reduce((n, t) => n + t.length, 0);
    expect(added, `只加了 ${added} 字`).toBeGreaterThan(2500);
  });
});
