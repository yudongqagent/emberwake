import { describe, expect, it } from "vitest";
import { ACT1_SCENES } from "../../data/story/act1";
import { ACT2_SCENES } from "../../data/story/act2";
import { ACT3_SCENES } from "../../data/story/act3";
import { ACT4_SCENES } from "../../data/story/act4";
import { ACT5_SCENES } from "../../data/story/act5";
import { ACT1_SCENES_ZH } from "./act1";
import { ACT2_SCENES_ZH } from "./act2";
import { ACT3_SCENES_ZH } from "./act3";
import { ACT4_SCENES_ZH } from "./act4";
import { ACT5_SCENES_ZH } from "./act5";

const ACTS = [
  { en: ACT1_SCENES, zh: ACT1_SCENES_ZH, name: "act1" },
  { en: ACT2_SCENES, zh: ACT2_SCENES_ZH, name: "act2" },
  { en: ACT3_SCENES, zh: ACT3_SCENES_ZH, name: "act3" },
  { en: ACT4_SCENES, zh: ACT4_SCENES_ZH, name: "act4" },
  { en: ACT5_SCENES, zh: ACT5_SCENES_ZH, name: "act5" },
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
        expect(overlay.lines.length, `${name}/${scene.id}: line count mismatch`).toBe(scene.lines.length);
      }
    });
  }
});
