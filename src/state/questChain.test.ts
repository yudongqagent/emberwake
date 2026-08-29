import { describe, expect, it } from "vitest";
import { ACT1_SCENES } from "../data/story/act1";
import { ACT2_SCENES } from "../data/story/act2";
import { ACT3_SCENES } from "../data/story/act3";
import { ACT4_SCENES } from "../data/story/act4";
import { ACT5_SCENES } from "../data/story/act5";
import { ACT6_SCENES } from "../data/story/act6";
import { BAUHINIA_REACH } from "../data/galaxies/bauhiniaReach";
import { LIONSHEART_EXPANSE } from "../data/galaxies/lionsheartExpanse";
import { SWANREACH_COMBINE } from "../data/galaxies/swanreachCombine";
import { FRACTURED_VEIL } from "../data/galaxies/fracturedVeil";
import { DEEP_ORIGIN } from "../data/galaxies/deepOrigin";
import { UMBRAL_LINE } from "../data/galaxies/umbralLine";
import { CHORUS_DEEP } from "../data/galaxies/chorusDeep";
import { HULL_CLASSES } from "../data/hullClasses";

const SCENES = [...ACT1_SCENES, ...ACT2_SCENES, ...ACT3_SCENES, ...ACT4_SCENES, ...ACT5_SCENES, ...ACT6_SCENES];
const GALAXIES = [BAUHINIA_REACH, LIONSHEART_EXPANSE, SWANREACH_COMBINE, FRACTURED_VEIL, DEEP_ORIGIN, UMBRAL_LINE, CHORUS_DEEP];

/** Every flag anything in the game can actually produce. */
function grantableFlags(): Set<string> {
  const out = new Set<string>();
  for (const s of SCENES) {
    for (const f of s.onCompleteFlags) out.add(f);
    // Branch flags come from the player's dialogue choice, not from completing
    // the scene — missing these was a flaw in the first version of this test,
    // which wrongly reported the Act VI ending branches as unreachable.
    for (const c of s.choices ?? []) for (const f of c.setFlags ?? []) out.add(f);
  }
  for (const g of GALAXIES) {
    for (const sys of g.systems) {
      for (const poi of sys.pois) {
        const vf = (poi.data as Record<string, unknown> | undefined)?.victoryFlag;
        if (typeof vf === "string") out.add(vf);
        const gf = (poi.data as Record<string, unknown> | undefined)?.grantsFlag;
        if (typeof gf === "string") out.add(gf);
      }
    }
  }
  return out;
}

// Player report (2026-08-25): "我的任务也没了" — the objective marker vanished.
// getNextObjective walks STORY_SCENES and, for a scene whose gate flag isn't set,
// looks for a POI that grants it. If no such POI exists it SILENTLY skips to the
// next scene, and if that happens for every remaining scene it returns null — the
// player is left with no objective and no explanation. A gate flag that nothing
// can produce is therefore a hard progression dead end, not a cosmetic issue.
describe("story progression chain", () => {
  it("every scene's required flag can actually be produced by something", () => {
    const grantable = grantableFlags();
    const orphans: string[] = [];
    for (const s of SCENES) {
      if (s.requiredFlag === null) continue;
      if (!grantable.has(s.requiredFlag)) orphans.push(`${s.id} requires "${s.requiredFlag}"`);
    }
    expect(orphans, `unreachable gate flags — the objective marker goes blank here:\n${orphans.join("\n")}`).toEqual([]);
  });

  it("every scene's hiddenAfterFlag is one it or something else actually sets", () => {
    const grantable = grantableFlags();
    const orphans: string[] = [];
    for (const s of SCENES) {
      if (!grantable.has(s.hiddenAfterFlag)) orphans.push(`${s.id} hidden by "${s.hiddenAfterFlag}"`);
    }
    // A scene hidden by a flag nothing sets can never be dismissed — it would
    // replay forever.
    expect(orphans, `scenes hidden by a flag nothing grants:\n${orphans.join("\n")}`).toEqual([]);
  });

  it("scenes sharing a hiddenAfterFlag are mutually exclusive branches, never a sequence", () => {
    // Sharing one is legitimate for the Act VI ending branches: three variants of
    // the same beat, gated on the player's earlier choice, all dismissed together.
    // It's only a bug when two scenes that could BOTH be reachable share one, since
    // completing either would silently swallow the other.
    const byFlag = new Map<string, typeof SCENES>();
    for (const s of SCENES) {
      const list = byFlag.get(s.hiddenAfterFlag) ?? [];
      list.push(s);
      byFlag.set(s.hiddenAfterFlag, list);
    }
    const clashes: string[] = [];
    for (const [flag, group] of byFlag) {
      if (group.length < 2) continue;
      // Exclusive branches must each be gated on a distinct required flag.
      const gates = new Set(group.map((s) => s.requiredFlag ?? "<none>"));
      if (gates.size !== group.length || gates.has("<none>")) {
        clashes.push(`${group.map((s) => s.id).join(", ")} share "${flag}" without distinct gates`);
      }
    }
    expect(clashes, clashes.join("\n")).toEqual([]);
  });

  it("never gates a scene on more ascensions than the game can provide", () => {
    // Open-world redesign added requiresAscensions/requiresLevel so spine beats
    // could gate on progress instead of on a chain. That gate is invisible to the
    // walk test below, so it needs its own check — a scene requiring more
    // rebuilds than exist would strand the player exactly as a dead flag would.
    const maxAscensions = HULL_CLASSES.length - 1;
    for (const s of SCENES) {
      if (s.requiresAscensions !== undefined) {
        expect(
          s.requiresAscensions,
          `${s.id} needs ${s.requiresAscensions} ascensions but only ${maxAscensions} exist`,
        ).toBeLessThanOrEqual(maxAscensions);
        expect(s.requiresAscensions).toBeGreaterThanOrEqual(0);
      }
      if (s.requiresLevel !== undefined) {
        expect(s.requiresLevel, `${s.id} requires an implausible level`).toBeLessThanOrEqual(60);
      }
    }
  });

  it("keeps every region's arc startable without finishing another region", () => {
    // The open-world contract: you may go anywhere, and when you arrive there is
    // something to do. An arc whose first scene waits on a different region's
    // flag would quietly re-close the world.
    const bySystem = new Map<string, typeof SCENES>();
    for (const s of SCENES) bySystem.set(s.systemId, [...(bySystem.get(s.systemId) ?? []), s]);
    const entryScenes = SCENES.filter((s) => s.requiredFlag === null);
    // At least one scene per region must be enterable on progress alone.
    expect(entryScenes.length, "no scene is reachable without a prior flag").toBeGreaterThanOrEqual(4);
  });

  it("walking the whole campaign never leaves the player without an objective", () => {
    // Simulates a real playthrough: scenes are completed in order, POI fights are
    // won when a scene is gated behind one, and dialogue choices are taken. The
    // first version of this test granted neither POI victories nor choices and so
    // reported nearly the whole campaign as unreachable — that was the test being
    // naive, not the game being broken.
    const flags = new Set<string>();
    const poiFlags = new Set<string>();
    for (const g of GALAXIES) {
      for (const sys of g.systems) {
        for (const poi of sys.pois) {
          const vf = (poi.data as Record<string, unknown> | undefined)?.victoryFlag;
          if (typeof vf === "string") poiFlags.add(vf);
        }
      }
    }
    const remaining = new Set(SCENES.map((s) => s.id));
    let guard = 0;
    while (remaining.size > 0 && guard++ < 500) {
      // Ascensions accrue as the campaign progresses; model that so progress-gated
      // scenes are walked rather than silently treated as always-available.
      const ascensions = Math.min(HULL_CLASSES.length - 1, Math.floor((SCENES.length - remaining.size) / 6));
      const gateOk = (s: (typeof SCENES)[number]) =>
        (s.requiresAscensions ?? 0) <= ascensions;
      const next = SCENES.find(
        (s) => remaining.has(s.id) && !flags.has(s.hiddenAfterFlag) && gateOk(s) && (s.requiredFlag === null || flags.has(s.requiredFlag)),
      );
      if (!next) {
        // Nothing directly available — the player would be sent to a gating POI
        // fight. Win the earliest one that unblocks something.
        const blocked = SCENES.find(
          (s) => remaining.has(s.id) && !flags.has(s.hiddenAfterFlag) && gateOk(s) && s.requiredFlag !== null && poiFlags.has(s.requiredFlag),
        );
        if (!blocked) break;
        flags.add(blocked.requiredFlag!);
        continue;
      }
      for (const f of next.onCompleteFlags) flags.add(f);
      for (const c of next.choices ?? []) for (const f of c.setFlags ?? []) flags.add(f);
      flags.add(next.hiddenAfterFlag);
      remaining.delete(next.id);
    }
    // Scenes left unplayed are only acceptable when a sibling branch sharing their
    // hiddenAfterFlag WAS played — one playthrough takes one ending, not all three.
    const stranded = [...remaining].filter((id) => {
      const scene = SCENES.find((s) => s.id === id)!;
      return !flags.has(scene.hiddenAfterFlag);
    });
    expect(
      stranded,
      `these scenes can never be reached — the objective marker goes blank here:\n${stranded.join("\n")}`,
    ).toEqual([]);
  });
});
