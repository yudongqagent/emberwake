import { describe, expect, it } from "vitest";
import { ACT1_SCENES } from "../../data/story/act1";
import { ACT2_SCENES } from "../../data/story/act2";
import { ACT3_SCENES } from "../../data/story/act3";
import { ACT4_SCENES } from "../../data/story/act4";
import { ACT5_SCENES } from "../../data/story/act5";
import { ACT6_SCENES } from "../../data/story/act6";
import { STANDING_SCENES } from "../../data/story/standing";
import { ACT1_SCENES_ZH } from "./act1";
import { ACT2_SCENES_ZH } from "./act2";
import { ACT3_SCENES_ZH } from "./act3";
import { ACT4_SCENES_ZH } from "./act4";
import { ACT5_SCENES_ZH } from "./act5";
import { ACT6_SCENES_ZH } from "./act6";
import { STANDING_SCENES_ZH } from "./standing";
import { localizedScene } from "./index";
import { language } from "../language";
import { SYSTEM_NAMES_ZH, GALAXY_NAMES_ZH } from "../data/places";
const PLACE_NAMES_ZH: Record<string, string> = { ...GALAXY_NAMES_ZH, ...SYSTEM_NAMES_ZH };
import ACT1_ZH_SRC from "./act1.ts?raw";
import ACT2_ZH_SRC from "./act2.ts?raw";
import ACT3_ZH_SRC from "./act3.ts?raw";
import ACT4_ZH_SRC from "./act4.ts?raw";
import ACT5_ZH_SRC from "./act5.ts?raw";
import ACT6_ZH_SRC from "./act6.ts?raw";
import STANDING_ZH_SRC from "./standing.ts?raw";
import PROSE_SRC from "../../data/story/prose.ts?raw";

const ACTS = [
  { en: ACT1_SCENES, zh: ACT1_SCENES_ZH, name: "act1" },
  { en: ACT2_SCENES, zh: ACT2_SCENES_ZH, name: "act2" },
  { en: ACT3_SCENES, zh: ACT3_SCENES_ZH, name: "act3" },
  { en: ACT4_SCENES, zh: ACT4_SCENES_ZH, name: "act4" },
  { en: ACT5_SCENES, zh: ACT5_SCENES_ZH, name: "act5" },
  { en: ACT6_SCENES, zh: ACT6_SCENES_ZH, name: "act6" },
  // 立场戏走同一套校验——中英一一对应、人名在册、不许混语言。
  { en: STANDING_SCENES, zh: STANDING_SCENES_ZH, name: "standing" },
];

// Issue #11: caught a real bug this way — a translated `choices` array that drops
// `setFlags` silently breaks every flag-gated branch downstream of that choice,
// with no error, only in the Chinese-language path. Every translated scene's
// choices must carry the exact same setFlags as the English original, in the same
// order, even though the label text itself differs.
describe("story translation overlays stay structurally in sync with the English originals", () => {
  for (const { en, zh, name } of ACTS) {
    it(`${name}: every translated scene's choices carry the same setFlags as the English original`, () => {
      for (const scene of en) {
        const overlay = zh[scene.id];
        if (!overlay || !overlay.choices) continue;
        expect(overlay.choices.length, `${name}/${scene.id}: choice count mismatch`).toBe(scene.choices?.length ?? 0);
        overlay.choices.forEach((choice, i) => {
          expect(choice.setFlags ?? [], `${name}/${scene.id}: choice[${i}] setFlags mismatch`).toEqual(scene.choices![i].setFlags ?? []);
        });
      }
    });

    it(`${name}: every translated scene id exists in the English original`, () => {
      const enIds = new Set(en.map((s) => s.id));
      for (const id of Object.keys(zh)) {
        expect(enIds.has(id), `${name}: translated scene id "${id}" has no matching English scene`).toBe(true);
      }
    });

    it(`${name}: every translated scene has the same number of dialogue lines as the English original`, () => {
      for (const scene of en) {
        const overlay = zh[scene.id];
        if (!overlay) continue;
        // An overlay that omits `lines` entirely is its own bug — it would render
        // the English dialogue under a Chinese chapter heading.
        expect(overlay.lines, `${name}/${scene.id}: overlay has no lines at all`).toBeDefined();
        expect(overlay.lines!.length, `${name}/${scene.id}: line count mismatch`).toBe(scene.lines.length);
      }
    });

    it(`${name}: every English scene has a Chinese translation (no silently-skipped scenes)`, () => {
      for (const scene of en) {
        expect(zh[scene.id], `${name}/${scene.id}: no Chinese translation at all`).toBeDefined();
      }
    });

    // Issue #11 (2026-08-23): caught a second real bug this way — act6.ts's
    // translation table existed, was fully correct, and passed every check above,
    // but was never spread into story/index.ts's SCENE_OVERLAYS registry, so
    // localizedScene() couldn't actually reach it at runtime — every Act VI scene
    // silently rendered in English despite the translation file being complete.
    // Only live-in-browser verification caught it; this test exists so the next
    // act can't repeat the same mistake undetected.
    it(`${name}: localizedScene() actually resolves the translation at runtime, not just the raw data table`, () => {
      const prevLang = language.value;
      language.value = "zh";
      try {
        for (const scene of en) {
          const overlay = zh[scene.id];
          if (!overlay?.chapterTitle) continue;
          expect(
            localizedScene(scene).chapterTitle,
            `${name}/${scene.id}: translation data exists but localizedScene() didn't apply it — is this act's _ZH table spread into SCENE_OVERLAYS in story/index.ts?`,
          ).toBe(overlay.chapterTitle);
        }
      } finally {
        language.value = prevLang;
      }
    });
  }
});

// 玩家反馈 (2026-08-29):「中文剧本简直垃圾，什么都看不懂」。两个具体成因:
// 音译人名读起来像劣质译制片,而且同一个角色在不同文件里有两个不同音译
// (卡恩·费洛斯 / 凯恩·费罗斯、奥莉·瓦什提 / 欧莉·瓦什蒂) —— 玩家会当成两个人。
// 这两条都是回归风险,所以用测试钉住。
describe("Chinese script uses Chinese names", () => {
  const ZH_SOURCES = [ACT1_SCENES_ZH, ACT2_SCENES_ZH, ACT3_SCENES_ZH, ACT4_SCENES_ZH, ACT5_SCENES_ZH, ACT6_SCENES_ZH];

  function allZhText(): string[] {
    const out: string[] = [];
    for (const table of ZH_SOURCES) {
      for (const scene of Object.values(table)) {
        out.push(scene.chapter ?? "", scene.chapterTitle ?? "");
        for (const l of scene.lines ?? []) out.push(l.speaker, l.text);
        for (const c of scene.choices ?? []) out.push(c.label);
      }
    }
    return out.filter(Boolean);
  }

  it("never reintroduces a transliterated Western name", () => {
    const banned = ["凯德", "卡恩", "凯恩", "费洛斯", "费罗斯", "奥莉", "欧莉", "瓦什", "阿尔泰因", "普里娅", "奥塞伊"];
    for (const text of allZhText()) {
      for (const b of banned) {
        expect(text.includes(b), `中文文本出现音译名「${b}」: ${text.slice(0, 40)}`).toBe(false);
      }
    }
  });

  it("uses the interpunct only for real compound names, never for transliteration", () => {
    // 「·」 in Chinese prose is the tell-tale of a transliterated foreign name.
    for (const text of allZhText()) {
      expect(text.includes("·"), `中文文本仍含音译间隔号: ${text.slice(0, 40)}`).toBe(false);
    }
  });

  it("only ever uses speakers from one approved cast", () => {
    // The original bug was one character with two spellings in different files.
    // A fuzzy similarity check was the first attempt and it was wrong — it
    // flagged 「安氏书记员」 vs 「安氏信使」, which are genuinely two different
    // people from the same house. An explicit cast list is precise: adding a
    // character is a deliberate act, and a second spelling of an existing one
    // fails immediately.
    const CAST = new Set([
      // 主要角色
      "余烬", "陆昭", "铁衡", "柳芸", "安鹤龄", "虎鲨",
      // 有名有姓之外的角色,按身份称呼
      "安氏书记员", "安氏信使", "掠夺者副官",
    ]);
    for (const table of ZH_SOURCES) {
      for (const scene of Object.values(table)) {
        for (const l of scene.lines ?? []) {
          if (!l.speaker) continue; // 旁白
          expect(CAST.has(l.speaker), `未登记的说话人「${l.speaker}」——是新角色,还是旧角色的另一种写法?`).toBe(true);
        }
      }
    }
  });
});

// 2026-08-31(/loop 第 14 轮):通关存档上,目标提示写着「跳转至铁境关」,而剧情和
// 散文里那个地方一直叫「铁门星域」。逐个核对之后,**九个星系/星区在地图上和剧情里
// 是两个名字**:
//
//   狮心扩域 / 狮心疆域    天鹅礁联合体 / 天鹅域商会   铁境关 / 铁门星域
//   空巢船坞 / 空壳船坞    浮游市集 / 漂流集市        帷幕之缘 / 帷幕边缘
//   蛹壳广域 / 蛹化星域    合唱门阶 / 合唱门槛        戴森合唱环 / 戴森合唱
//
// 玩家读到"去帷幕边缘",然后在写着"帷幕之缘"的地图上找。
describe("地图上的地名和剧情里的地名必须是同一个", () => {
  const STORY_TEXT = [
    ACT1_ZH_SRC, ACT2_ZH_SRC, ACT3_ZH_SRC, ACT4_ZH_SRC, ACT5_ZH_SRC, ACT6_ZH_SRC,
    STANDING_ZH_SRC, PROSE_SRC,
  ].join("\n");

  it("每个星系/星区的中文名都能在剧情文本里找到", () => {
    // 只查星系和星区——矿点、残骸这类 POI 剧情本来就不会点名。
    const SYSTEMS = [
      "bauhiniaReach", "lionsheartExpanse", "swanreachCombine", "fracturedVeil",
      "deepOrigin", "umbralLine", "chorusDeep",
      "amaranthBelt", "bauhiniaPrime", "kestrelsRest", "thornwake", "coldreachAnchorage",
      "ferrousGate", "ashenvale", "hollowFleetYard", "meridianExchange", "driftmarket",
      "veilsEdge", "chrysalisExpanse", "queenspire", "choirsThreshold", "dysonChoir",
    ];
    const missing: string[] = [];
    for (const id of SYSTEMS) {
      const name = PLACE_NAMES_ZH[id];
      if (!name) continue;
      // 允许包含关系:剧情里说「联合体」,地图上写「天鹅域联合体」是同一个东西的
      // 全称,不算对不上。真正的问题是**两个不同的词**(铁境关 vs 铁门星域)。
      const ok = STORY_TEXT.includes(name)
        || [2, 3, 4].some((n) => {
          for (let i = 0; i + n <= name.length; i++) {
            const part = name.slice(i, i + n);
            if (part.length >= 3 && STORY_TEXT.includes(part)) return true;
          }
          return false;
        });
      if (!ok) missing.push(`${id} = 「${name}」`);
    }
    expect(
      missing,
      `这些地名只存在于地图上,剧情里叫的是别的:\n${missing.join("\n")}`,
    ).toEqual([]);
  });
});
