import { describe, expect, it } from "vitest";
import { REACTIVE_LINES, applyReactiveLines, type StoryContext } from "./reactive";
import { ACT1_SCENES } from "./act1";
import { ACT2_SCENES } from "./act2";
import { ACT3_SCENES } from "./act3";
import { ACT4_SCENES } from "./act4";
import { ACT5_SCENES } from "./act5";
import { ACT6_SCENES } from "./act6";

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
