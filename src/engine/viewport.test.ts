import { describe, expect, it } from "vitest";
import { safeScale, safeToWorld } from "./viewport";

describe("safeScale", () => {
  it("computes the normal uniform-fit scale", () => {
    expect(safeScale(1000, 600, 1000, 600, 1)).toBe(1);
    expect(safeScale(500, 300, 1000, 600, 1)).toBe(0.5);
  });

  it("falls back to the last good scale instead of 0 when the container measures 0x0 — the exact scenario a mobile orientation-change/resize event produces mid-touch", () => {
    expect(safeScale(0, 0, 1000, 600, 0.8)).toBe(0.8);
  });

  it("falls back instead of NaN when only one dimension is 0", () => {
    expect(safeScale(1000, 0, 1000, 600, 0.8)).toBe(0.8);
  });

  it("falls back instead of a negative scale", () => {
    expect(safeScale(-50, 600, 1000, 600, 0.8)).toBe(0.8);
  });
});

describe("safeToWorld", () => {
  it("converts a client point to world space under a normal transform", () => {
    const p = safeToWorld(500, 300, 0, 0, 1, 0, 0, 1000, 600);
    expect(p.x).toBe(500);
    expect(p.y).toBe(300);
  });

  it("the specific bug this exists to prevent: a scale of 0 (before the safeScale guard ran) must not hand Infinity/NaN to a physics loop — falls back to the world center instead", () => {
    // If a caller ever passes an unguarded 0 scale through, safeToWorld is the last
    // line of defense — this is what used to permanently poison player velocity,
    // since Infinity/NaN propagate through every later frame's arithmetic forever.
    const p = safeToWorld(500, 300, 0, 0, 0, 0, 0, 1000, 600);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
    expect(p).toEqual({ x: 500, y: 300 }); // refW/2, refH/2
  });

  it("falls back to world center when offset math produces NaN", () => {
    const p = safeToWorld(NaN, 300, 0, 0, 1, 0, 0, 1000, 600);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(p.x).toBe(500);
  });
});
