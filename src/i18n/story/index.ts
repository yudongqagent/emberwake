import type { StoryScene } from "../../data/types";
import { language } from "../language";
import { ACT1_SCENES_ZH } from "./act1";
import { ACT2_SCENES_ZH } from "./act2";
import { ACT3_SCENES_ZH } from "./act3";
import { ACT4_SCENES_ZH } from "./act4";
import { ACT5_SCENES_ZH } from "./act5";
import { ACT6_SCENES_ZH } from "./act6";

/** Issue #11 (2026-08-23 playtest): translated scenes keyed by scene id, one module
 * per act, registered here. An act with no entry (or a scene id missing from an
 * act's table) falls back to the English original untouched — same "missing key
 * degrades gracefully" contract as strings.ts's t(), so a partially-translated
 * campaign never shows a blank scene, only an English one. */
const SCENE_OVERLAYS: Record<string, Partial<Pick<StoryScene, "lines" | "choices" | "chapter" | "chapterTitle">>> = {
  ...ACT1_SCENES_ZH,
  ...ACT2_SCENES_ZH,
  ...ACT3_SCENES_ZH,
  ...ACT4_SCENES_ZH,
  ...ACT5_SCENES_ZH,
  ...ACT6_SCENES_ZH,
};

export function localizedScene(scene: StoryScene): StoryScene {
  if (language.value !== "zh") return scene;
  const overlay = SCENE_OVERLAYS[scene.id];
  if (!overlay) return scene;
  return { ...scene, ...overlay };
}
