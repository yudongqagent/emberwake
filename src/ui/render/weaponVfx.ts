/** Per-family weapon visual effects.
 *
 * Player report (2026-08-25): "武器没有特效". Strictly there *was* an effect — but
 * every weapon in the game drew the identical 0.3s tracer dash, varying only in
 * hue and line width, fired about once every 1.6s. A Paradox Cannon and a Coronet
 * Repeater were the same streak in different colours, so the screen read as
 * having no weapon effects at all.
 *
 * Each of the ten tech families now fires something structurally different —
 * different geometry, different motion, different impact. Derived from
 * `ModuleDef.family` rather than authored per module, so all 200 modules get the
 * right look automatically and it cannot drift as the roster changes. This is the
 * same principle docs/module-system.md already applies to effects: a module's
 * origin should be legible from how it behaves.
 */

export type WeaponVfx =
  | "lance"    // bauhinia  — disciplined sustained beam
  | "slug"     // lionsheart — single heavy kinetic round
  | "pulse"    // swanreach  — efficient burst of small bolts
  | "shred"    // reaver     — ragged shotgun spread
  | "swarm"    // swarm      — many small curving projectiles
  | "arc"      // construct  — jagged electrical arc
  | "drain"    // hollow     — dark tendril that recoils back
  | "warp"     // rift       — discontinuous, phase-stepped segments
  | "wave"     // choir      — expanding resonant rings
  | "prism";   // mayeth     — split multi-beam

const BY_FAMILY: Record<string, WeaponVfx> = {
  bauhinia: "lance",
  lionsheart: "slug",
  swanreach: "pulse",
  reaver: "shred",
  swarm: "swarm",
  construct: "arc",
  hollow: "drain",
  rift: "warp",
  choir: "wave",
  mayeth: "prism",
};

export function weaponVfxForFamily(family: string): WeaponVfx {
  return BY_FAMILY[family] ?? "pulse";
}

/** FactionId → archetype, so enemy fire is as legible as the player's. The ids
 * differ from the module family names in a few places (reavers/reaver,
 * constructs/construct, riftEchoes/rift), which is why this can't just reuse the
 * map above. */
const BY_FACTION: Record<string, WeaponVfx> = {
  bauhinia: "lance",
  lionsheart: "slug",
  swanreach: "pulse",
  reavers: "shred",
  swarm: "swarm",
  constructs: "arc",
  hollow: "drain",
  riftEchoes: "warp",
  choir: "wave",
};

export function weaponVfxForFaction(faction: string): WeaponVfx {
  return BY_FACTION[faction] ?? "slug";
}

/** Exposed for the test: the fallback above is a real archetype ("slug"), so
 * comparing a result against it cannot tell "deliberately mapped to slug" apart
 * from "fell through". Membership is the only honest check. */
export const VFX_MAPPED_FACTIONS: readonly string[] = Object.keys(BY_FACTION);
export const VFX_MAPPED_FAMILIES: readonly string[] = Object.keys(BY_FAMILY);

/** Deterministic per-shot jitter — a shot must look the same on every frame of
 * its own flight, so randomness is derived from the shot's seed and the index of
 * the sub-element, never from Math.random() at draw time. */
function noise(seed: number, i: number): number {
  const v = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface ShotCtx {
  fromX: number; fromY: number; toX: number; toY: number;
  t: number; color: string; weight: number; seed: number;
}

export function drawWeaponVfx(
  ctx: CanvasRenderingContext2D,
  vfx: WeaponVfx,
  shot: ShotCtx,
) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.shadowColor = shot.color;
  switch (vfx) {
    case "lance": drawLance(ctx, shot); break;
    case "slug": drawSlug(ctx, shot); break;
    case "pulse": drawPulse(ctx, shot); break;
    case "shred": drawShred(ctx, shot); break;
    case "swarm": drawSwarm(ctx, shot); break;
    case "arc": drawArc(ctx, shot); break;
    case "drain": drawDrain(ctx, shot); break;
    case "warp": drawWarp(ctx, shot); break;
    case "wave": drawWave(ctx, shot); break;
    case "prism": drawPrism(ctx, shot); break;
  }
  ctx.restore();
}

/** Muzzle flash at the firing ship — shared across families, scaled by weight,
 * so every shot has a visible origin instead of appearing in mid-air. */
function muzzle(ctx: CanvasRenderingContext2D, s: ShotCtx, scale = 1) {
  if (s.t > 0.3) return;
  const a = 1 - s.t / 0.3;
  const ang = Math.atan2(s.toY - s.fromY, s.toX - s.fromX);
  ctx.save();
  ctx.translate(s.fromX, s.fromY);
  ctx.rotate(ang);
  ctx.globalAlpha = a;
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(0, 0, (10 + s.weight * 6) * scale * a, (3.5 + s.weight * 2) * scale * a, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = s.color;
  ctx.globalAlpha = a * 0.7;
  ctx.beginPath();
  ctx.ellipse(0, 0, (18 + s.weight * 10) * scale * a, (5 + s.weight * 3) * scale * a, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Bauhinia — a clean lance that lases into existence, holds, then cuts out.
 * Reads as disciplined, precise fire: no travel time, full length immediately. */
function drawLance(ctx: CanvasRenderingContext2D, s: ShotCtx) {
  const env = s.t < 0.2 ? s.t / 0.2 : 1 - (s.t - 0.2) / 0.8;
  const w = Math.max(0, env);
  ctx.globalAlpha = 0.3 * w;
  ctx.shadowBlur = 22;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = (9 + s.weight * 5) * w;
  ctx.beginPath(); ctx.moveTo(s.fromX, s.fromY); ctx.lineTo(s.toX, s.toY); ctx.stroke();
  ctx.globalAlpha = w;
  ctx.lineWidth = (2 + s.weight * 1.4) * w;
  ctx.strokeStyle = "#ffffff";
  ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.moveTo(s.fromX, s.fromY); ctx.lineTo(s.toX, s.toY); ctx.stroke();
  muzzle(ctx, s, 1.2);
}

/** Lionsheart — one heavy slug with a long thin trail and a hard leading mass. */
function drawSlug(ctx: CanvasRenderingContext2D, s: ShotCtx) {
  const x = lerp(s.fromX, s.toX, s.t);
  const y = lerp(s.fromY, s.toY, s.t);
  const tailT = Math.max(0, s.t - 0.3);
  ctx.globalAlpha = 0.5;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = 1.5 + s.weight;
  ctx.beginPath();
  ctx.moveTo(lerp(s.fromX, s.toX, tailT), lerp(s.fromY, s.toY, tailT));
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(x, y, 3 + s.weight * 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = s.color;
  ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.arc(x, y, 6 + s.weight * 3.5, 0, Math.PI * 2); ctx.fill();
  muzzle(ctx, s, 1.4);
}

/** Swanreach — three compact bolts in a tight economical stream. */
function drawPulse(ctx: CanvasRenderingContext2D, s: ShotCtx) {
  ctx.shadowBlur = 12;
  for (let i = 0; i < 3; i++) {
    const bt = s.t - i * 0.13;
    if (bt <= 0 || bt > 1) continue;
    const x = lerp(s.fromX, s.toX, bt);
    const y = lerp(s.fromY, s.toY, bt);
    ctx.globalAlpha = 1 - i * 0.22;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(x, y, 2 + s.weight * 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = s.color;
    ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.arc(x, y, 4.5 + s.weight * 2, 0, Math.PI * 2); ctx.fill();
  }
  muzzle(ctx, s, 0.8);
}

/** Reaver — a ragged spread that fans out and lands scattered. Aggressive, messy. */
function drawShred(ctx: CanvasRenderingContext2D, s: ShotCtx) {
  const ang = Math.atan2(s.toY - s.fromY, s.toX - s.fromX);
  const dist = Math.hypot(s.toX - s.fromX, s.toY - s.fromY);
  ctx.shadowBlur = 8;
  for (let i = 0; i < 7; i++) {
    const spread = (noise(s.seed, i) - 0.5) * 0.34;
    const speed = 0.75 + noise(s.seed, i + 40) * 0.5;
    const bt = Math.min(1, s.t * speed);
    const a = ang + spread;
    const r = dist * bt;
    const x = s.fromX + Math.cos(a) * r;
    const y = s.fromY + Math.sin(a) * r;
    const tr = Math.max(0, r - 18 - s.weight * 8);
    ctx.globalAlpha = 0.85 * (1 - s.t * 0.5);
    ctx.strokeStyle = i % 2 ? "#ffffff" : s.color;
    ctx.lineWidth = 1 + s.weight * 0.7;
    ctx.beginPath();
    ctx.moveTo(s.fromX + Math.cos(a) * tr, s.fromY + Math.sin(a) * tr);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  muzzle(ctx, s, 1.5);
}

/** Chitin Swarm — a cloud of small drones on sine-offset paths. */
function drawSwarm(ctx: CanvasRenderingContext2D, s: ShotCtx) {
  const dx = s.toX - s.fromX, dy = s.toY - s.fromY;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  ctx.shadowBlur = 10;
  for (let i = 0; i < 9; i++) {
    const lag = noise(s.seed, i) * 0.25;
    const bt = s.t - lag;
    if (bt <= 0 || bt > 1) continue;
    // Converge on the target: lateral offset collapses as bt approaches 1.
    const amp = (12 + noise(s.seed, i + 9) * 26) * (1 - bt);
    const phase = noise(s.seed, i + 18) * Math.PI * 2;
    const off = Math.sin(bt * 7 + phase) * amp;
    const x = s.fromX + dx * bt + nx * off;
    const y = s.fromY + dy * bt + ny * off;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = i % 3 === 0 ? "#ffffff" : s.color;
    ctx.beginPath(); ctx.arc(x, y, 1.6 + s.weight * 0.8, 0, Math.PI * 2); ctx.fill();
  }
  muzzle(ctx, s, 0.7);
}

/** Mayeth Constructs — a forked electrical arc that re-randomises as it travels. */
function drawArc(ctx: CanvasRenderingContext2D, s: ShotCtx) {
  const reach = Math.min(1, s.t * 1.9);
  const fade = s.t > 0.55 ? 1 - (s.t - 0.55) / 0.45 : 1;
  const dx = s.toX - s.fromX, dy = s.toY - s.fromY;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const SEGS = 9;
  // Re-seeded per 60ms slice so the bolt crackles instead of sitting still.
  const flick = Math.floor(s.t * 16);
  const path = (jitter: number) => {
    ctx.beginPath();
    ctx.moveTo(s.fromX, s.fromY);
    for (let i = 1; i <= SEGS; i++) {
      const f = (i / SEGS) * reach;
      const off = (noise(s.seed + flick, i) - 0.5) * jitter * Math.sin((i / SEGS) * Math.PI);
      ctx.lineTo(s.fromX + dx * f + nx * off, s.fromY + dy * f + ny * off);
    }
    ctx.stroke();
  };
  ctx.globalAlpha = 0.35 * fade;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = 6 + s.weight * 3;
  path(30);
  ctx.globalAlpha = fade;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.4 + s.weight * 0.6;
  ctx.shadowBlur = 12;
  path(30);
  // a thinner secondary fork
  ctx.globalAlpha = 0.5 * fade;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = 1;
  path(52);
  muzzle(ctx, s, 1.1);
}

/** The Hollow — a dark tendril that reaches out, then drags light back home. */
function drawDrain(ctx: CanvasRenderingContext2D, s: ShotCtx) {
  const reach = Math.min(1, s.t * 2.2);
  const dx = s.toX - s.fromX, dy = s.toY - s.fromY;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  ctx.globalAlpha = 0.85;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = 2.5 + s.weight * 1.6;
  ctx.beginPath();
  ctx.moveTo(s.fromX, s.fromY);
  for (let i = 1; i <= 10; i++) {
    const f = (i / 10) * reach;
    const off = Math.sin(f * Math.PI * 2 + s.seed) * 9 * Math.sin(f * Math.PI);
    ctx.lineTo(s.fromX + dx * f + nx * off, s.fromY + dy * f + ny * off);
  }
  ctx.stroke();
  // motes travelling BACK toward the shooter — the drain made visible.
  if (s.t > 0.35) {
    const back = (s.t - 0.35) / 0.65;
    ctx.shadowBlur = 10;
    for (let i = 0; i < 4; i++) {
      const f = 1 - ((back + i * 0.25) % 1);
      ctx.globalAlpha = 0.9 * (1 - back * 0.4);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(s.fromX + dx * f, s.fromY + dy * f, 1.8 + s.weight, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  muzzle(ctx, s, 0.9);
}

/** Rift Echoes — the shot exists in discontinuous chunks, phase-stepping toward
 * the target rather than travelling through the space between. */
function drawWarp(ctx: CanvasRenderingContext2D, s: ShotCtx) {
  const STEPS = 5;
  const step = Math.floor(s.t * STEPS);
  const dx = s.toX - s.fromX, dy = s.toY - s.fromY;
  ctx.shadowBlur = 16;
  for (let i = 0; i <= step; i++) {
    const f = i / STEPS;
    const age = (step - i) / STEPS;
    const x = lerp(s.fromX, s.fromX + dx, f);
    const y = lerp(s.fromY, s.fromY + dy, f);
    ctx.globalAlpha = Math.max(0, 0.9 - age * 1.1);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2 + s.weight * 1.2;
    const h = 9 + s.weight * 5;
    // Each step is a short vertical tear, not a dot — reads as space splitting.
    ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x, y + h); ctx.stroke();
    ctx.globalAlpha = Math.max(0, 1 - age * 1.3);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y - h * 0.55); ctx.lineTo(x, y + h * 0.55); ctx.stroke();
  }
  muzzle(ctx, s, 1);
}

/** The Choir — concentric rings that travel outward and resonate on arrival. */
function drawWave(ctx: CanvasRenderingContext2D, s: ShotCtx) {
  const dx = s.toX - s.fromX, dy = s.toY - s.fromY;
  const ang = Math.atan2(dy, dx);
  ctx.shadowBlur = 14;
  for (let i = 0; i < 3; i++) {
    const bt = s.t - i * 0.16;
    if (bt <= 0 || bt > 1) continue;
    const x = s.fromX + dx * bt;
    const y = s.fromY + dy * bt;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.globalAlpha = (1 - i * 0.25) * (1 - bt * 0.35);
    ctx.strokeStyle = i === 0 ? "#ffffff" : s.color;
    ctx.lineWidth = 1.6 + s.weight * 0.9;
    ctx.beginPath();
    // A crescent facing travel direction, widening as it goes.
    ctx.arc(0, 0, 7 + s.weight * 4 + bt * 10, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();
    ctx.restore();
  }
  muzzle(ctx, s, 1);
}

/** Ancient Mayeth relics — one beam that splits into three chromatic components
 * and reconverges on the target. */
function drawPrism(ctx: CanvasRenderingContext2D, s: ShotCtx) {
  const dx = s.toX - s.fromX, dy = s.toY - s.fromY;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const env = s.t < 0.18 ? s.t / 0.18 : 1 - (s.t - 0.18) / 0.82;
  const w = Math.max(0, env);
  // Chromatic split — deliberately not the weapon's own colour, since the point
  // of the relic weapons is that they don't obey the faction palette.
  const tints = ["#ff6bd6", "#6bffd6", "#8fb4ff"];
  ctx.shadowBlur = 16;
  for (let i = 0; i < 3; i++) {
    const spread = (i - 1) * (10 + s.weight * 5);
    ctx.globalAlpha = 0.75 * w;
    ctx.strokeStyle = tints[i];
    ctx.lineWidth = (2 + s.weight) * w;
    ctx.beginPath();
    ctx.moveTo(s.fromX, s.fromY);
    // bow out at midpoint, reconverge at the target
    ctx.quadraticCurveTo(
      s.fromX + dx * 0.5 + nx * spread,
      s.fromY + dy * 0.5 + ny * spread,
      s.toX, s.toY,
    );
    ctx.stroke();
  }
  ctx.globalAlpha = w;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = (1.4 + s.weight * 0.7) * w;
  ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(s.fromX, s.fromY); ctx.lineTo(s.toX, s.toY); ctx.stroke();
  muzzle(ctx, s, 1.3);
}
