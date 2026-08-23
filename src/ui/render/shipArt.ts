import type { FactionId } from "../../data/types";

export const FACTION_HULL_COLOR: Record<string, string> = {
  reavers: "#ff5c5c",
  lionsheart: "#5dd6ff",
  swarm: "#8cff9e",
  swanreach: "#ffb84d",
  bauhinia: "#b98cff",
  constructs: "#9fb8cc",
  hollow: "#e8d9ff",
};

/** Deterministic 0..1 hash so per-entity "random" art (rock shapes, tumble phase) stays
 * stable frame to frame instead of reshuffling every render. */
export function seededRand(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Player flagship — cyan salvage-lineage hull. Draws centered at the origin;
 * caller is responsible for translate/rotate. */
export function drawPlayerHull(ctx: CanvasRenderingContext2D, scale: number, now: number, thrusting: boolean) {
  ctx.save();
  ctx.scale(scale, scale);

  const enginePulse = 0.65 + 0.35 * Math.sin(now / 90);
  ctx.save();
  ctx.globalAlpha = thrusting ? enginePulse : 0.35;
  ctx.shadowColor = "#4be8ff";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#8ff3ff";
  ctx.beginPath();
  ctx.ellipse(-15, -7.5, 3, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-15, 7.5, 3, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // wing nacelles, behind the main fuselage
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#123f4a";
  ctx.strokeStyle = "rgba(143,243,255,0.55)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-5, -4);
  ctx.lineTo(-17, -10);
  ctx.lineTo(-11, -4.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-5, 4);
  ctx.lineTo(-17, 10);
  ctx.lineTo(-11, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // main fuselage
  ctx.shadowColor = "#4be8ff";
  ctx.shadowBlur = 14;
  const grad = ctx.createLinearGradient(-13, 0, 20, 0);
  grad.addColorStop(0, "#123f4a");
  grad.addColorStop(0.55, "#1c7d94");
  grad.addColorStop(1, "#c8fbff");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-10, -9);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-10, 9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // canopy
  ctx.shadowColor = "#fff";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "rgba(224,250,255,0.9)";
  ctx.beginPath();
  ctx.ellipse(6, 0, 3.4, 1.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // panel accent line
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-2, -3);
  ctx.lineTo(11, 0);
  ctx.lineTo(-2, 3);
  ctx.stroke();

  ctx.restore();
}

/** Enemy hull, styled per faction doctrine. Draws centered at the origin. */
export function drawEnemyHull(ctx: CanvasRenderingContext2D, faction: FactionId | string, scale: number, now: number) {
  ctx.save();
  ctx.scale(scale, scale);
  const color = FACTION_HULL_COLOR[faction] ?? "#ff9f4d";
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1;

  if (faction === "swarm") {
    const pulse = 1 + 0.09 * Math.sin(now / 260);
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 15 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = color;
    ctx.beginPath();
    const spikes = 8;
    const verts: { x: number; y: number }[] = [];
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2;
      const r = (i % 2 === 0 ? 16 : 9) * pulse;
      verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      if (i === 0) ctx.moveTo(verts[i].x, verts[i].y);
      else ctx.lineTo(verts[i].x, verts[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // chitin veins from core to alternating spike tips
    ctx.strokeStyle = "rgba(10,40,20,0.5)";
    ctx.lineWidth = 0.7;
    for (let i = 0; i < spikes; i += 2) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(verts[i].x * 0.9, verts[i].y * 0.9);
      ctx.stroke();
    }
    // pulsing core
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#e8ffe0";
    ctx.beginPath();
    ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (faction === "lionsheart") {
    const grad = ctx.createLinearGradient(-18, 0, 18, 0);
    grad.addColorStop(0, "#0d3a4a");
    grad.addColorStop(0.6, "#2c8fb0");
    grad.addColorStop(1, "#bdf3ff");
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(10, -9);
    ctx.lineTo(18, 0);
    ctx.lineTo(10, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(14, 0);
    ctx.stroke();
    const pulse = 0.6 + 0.4 * Math.sin(now / 150);
    ctx.globalAlpha = pulse;
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#bdf3ff";
    ctx.beginPath();
    ctx.ellipse(-12, -3.5, 1.6, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-12, 3.5, 1.6, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (faction === "reavers") {
    const grad = ctx.createLinearGradient(-16, -13, 20, 13);
    grad.addColorStop(0, "#3a0505");
    grad.addColorStop(0.55, "#c22e2e");
    grad.addColorStop(1, "#ff9a9a");
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-16, -13);
    ctx.lineTo(14, -5);
    ctx.lineTo(20, 0);
    ctx.lineTo(14, 5);
    ctx.lineTo(-16, 13);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // scarred spike details at the wingtips
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-16, -13);
    ctx.lineTo(-6, -8);
    ctx.moveTo(-16, 13);
    ctx.lineTo(-6, 8);
    ctx.stroke();
    // twin eye glints
    const flicker = seededRand(Math.floor(now / 120)) > 0.15 ? 1 : 0.3;
    ctx.globalAlpha = flicker;
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#ffe25d";
    ctx.beginPath();
    ctx.arc(10, -3, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10, 3, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (faction === "constructs") {
    ctx.save();
    ctx.rotate((now / 5200) % (Math.PI * 2));
    ctx.strokeStyle = `rgba(159,184,204,0.5)`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 22);
      ctx.lineTo(Math.cos(a) * 25, Math.sin(a) * 25);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.rotate((now / -4000) % (Math.PI * 2));
    const grad = ctx.createLinearGradient(-17, -17, 17, 17);
    grad.addColorStop(0, "#3a4553");
    grad.addColorStop(0.6, "#9fb8cc");
    grad.addColorStop(1, "#e8f2f8");
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const x = Math.cos(a) * 17, y = Math.sin(a) * 17;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // scanning ring ping
    const pingPhase = (now / 900) % 1;
    ctx.globalAlpha = Math.max(0, 1 - pingPhase * 1.4);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 4 + pingPhase * 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 6;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (faction === "hollow") {
    const glitchX = (seededRand(Math.floor(now / 90)) - 0.5) * 4;
    const glitchY = (seededRand(Math.floor(now / 90) + 91) - 0.5) * 4;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 17);
    coreGrad.addColorStop(0, "#0a0812");
    coreGrad.addColorStop(1, "#e8d9ff");
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(now / 130);
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.moveTo(-15 + glitchX, -15 + glitchY);
    ctx.lineTo(15 + glitchX, -6 + glitchY);
    ctx.lineTo(15 + glitchX, 6 + glitchY);
    ctx.lineTo(-15 + glitchX, 15 + glitchY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(-15 - glitchX, -15 - glitchY);
    ctx.lineTo(15 - glitchX, -6 - glitchY);
    ctx.lineTo(15 - glitchX, 6 - glitchY);
    ctx.lineTo(-15 - glitchX, 15 - glitchY);
    ctx.closePath();
    ctx.stroke();
    // scanline flicker bands
    if (seededRand(Math.floor(now / 160) + 5) > 0.6) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#fff";
      const by = (seededRand(Math.floor(now / 160)) - 0.5) * 24;
      ctx.fillRect(-15, by, 30, 1.4);
      ctx.globalAlpha = 1;
    }
  } else {
    // bauhinia / swanreach / default: utilitarian octagon hull with amber trim
    const grad = ctx.createLinearGradient(-15, 0, 15, 0);
    grad.addColorStop(0, "#3a2a10");
    grad.addColorStop(0.6, color);
    grad.addColorStop(1, "#fff3d6");
    ctx.shadowColor = color;
    ctx.shadowBlur = 9;
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      const x = Math.cos(a) * 15, y = Math.sin(a) * 15;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.lineTo(10, 5);
    ctx.moveTo(-10, 5);
    ctx.lineTo(10, -5);
    ctx.stroke();
    // radar dish nub
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(2, -14, 2.4, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** A weapon beam: soft outer glow + bright core + a brief muzzle flare at the origin
 * and a small flash at the leading edge, replacing a bare stroked line. */
export function drawWeaponBeam(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  t: number,
  color: string,
  /** Issue #4 (2026-08 playtest): every weapon used to draw an identical beam
   * regardless of what it was — this scales line width, muzzle flare, and tip flash
   * so a Railgun/Twin-Linked Cannon reads as a heavier weapon than an EMP Burst or
   * Ion Disruptor, not just a different color. 1 = Pulse Cannon baseline. */
  weight: number = 1,
) {
  const x = fromX + (toX - fromX) * t;
  const y = fromY + (toY - fromY) * t;
  const trailT = Math.max(0, t - 0.16);
  const trailX = fromX + (toX - fromX) * trailT;
  const trailY = fromY + (toY - fromY) * trailT;

  ctx.save();
  ctx.lineCap = "round";
  // outer glow
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.35;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14 + weight * 4;
  ctx.lineWidth = 5 * weight;
  ctx.beginPath();
  ctx.moveTo(trailX, trailY);
  ctx.lineTo(x, y);
  ctx.stroke();
  // bright core
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 10;
  ctx.lineWidth = Math.max(1, 1.6 * weight);
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(trailX, trailY);
  ctx.lineTo(x, y);
  ctx.stroke();

  // muzzle flare, fades fast at the start of flight
  if (t < 0.35) {
    ctx.globalAlpha = Math.max(0, 1 - t / 0.35);
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(fromX, fromY, 3.5 + weight * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // leading tip flash
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(x, y, 2 + weight * 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A forward-facing station: hub, three docking arms, and a slow rotating outer ring. */
export function drawStationArt(ctx: CanvasRenderingContext2D, radius: number, now: number) {
  ctx.save();
  const pulse = 0.85 + 0.15 * Math.sin(now / 500);

  // outer rotating tick ring
  ctx.save();
  ctx.rotate((now / 6000) % (Math.PI * 2));
  ctx.strokeStyle = "rgba(255,184,77,0.4)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (radius + 8), Math.sin(a) * (radius + 8));
    ctx.lineTo(Math.cos(a) * (radius + 13), Math.sin(a) * (radius + 13));
    ctx.stroke();
  }
  ctx.restore();

  // docking arms
  ctx.save();
  ctx.rotate((now / 9000) % (Math.PI * 2));
  ctx.strokeStyle = "#ffb84d";
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.5, Math.sin(a) * radius * 0.5);
    ctx.lineTo(Math.cos(a) * radius * 1.15, Math.sin(a) * radius * 1.15);
    ctx.stroke();
    const blink = seededRand(Math.floor(now / 400) + i * 17) > 0.4;
    ctx.fillStyle = blink ? "#fff3d6" : "#a86a1c";
    ctx.shadowColor = "#ffb84d";
    ctx.shadowBlur = blink ? 8 : 0;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * radius * 1.15, Math.sin(a) * radius * 1.15, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // hub
  ctx.shadowColor = "#ffb84d";
  ctx.shadowBlur = 10 * pulse;
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.62);
  grad.addColorStop(0, "#fff3d6");
  grad.addColorStop(0.5, "rgba(255,184,77,0.35)");
  grad.addColorStop(1, "rgba(255,184,77,0.08)");
  ctx.fillStyle = grad;
  ctx.strokeStyle = "#ffb84d";
  ctx.lineWidth = 2;
  drawHexPath(ctx, radius * 0.62);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  drawHexPath(ctx, radius * 0.34);
  ctx.strokeStyle = "rgba(255,220,160,0.85)";
  ctx.stroke();

  // window lights around the hub rim
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    const on = seededRand(Math.floor(now / 700) + i) > 0.3;
    ctx.fillStyle = on ? "#fff3d6" : "rgba(255,184,77,0.25)";
    ctx.beginPath();
    ctx.arc(Math.cos(a) * radius * 0.48, Math.sin(a) * radius * 0.48, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHexPath(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 3) * i - Math.PI / 6;
    const x = Math.cos(ang) * r;
    const y = Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** A cluster of irregular tumbling rocks, deterministic per POI id so the field
 * looks the same every visit rather than reshuffling each frame. */
export function drawAsteroidRocks(ctx: CanvasRenderingContext2D, poiId: string, active: boolean, now: number) {
  ctx.save();
  const base = hashId(poiId);
  const count = 7;
  for (let i = 0; i < count; i++) {
    const seed = base + i * 971;
    const ang = seededRand(seed) * Math.PI * 2;
    const r = 16 + seededRand(seed + 1) * 26;
    const cx = Math.cos(ang) * r;
    const cy = Math.sin(ang) * r * 0.85;
    const rockR = 4.5 + seededRand(seed + 2) * 5.5;
    const spin = now / (2200 + seededRand(seed + 3) * 1800) + seed;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spin);
    const verts = 6 + Math.floor(seededRand(seed + 4) * 3);
    ctx.beginPath();
    for (let v = 0; v < verts; v++) {
      const a = (v / verts) * Math.PI * 2;
      const jitter = 0.65 + seededRand(seed + 10 + v) * 0.5;
      const x = Math.cos(a) * rockR * jitter;
      const y = Math.sin(a) * rockR * jitter;
      if (v === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = active ? "#8496a8" : "#33404c";
    ctx.fill();
    ctx.strokeStyle = active ? "rgba(210,226,240,0.55)" : "rgba(120,140,160,0.25)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    if (active) {
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(-rockR * 0.25, -rockR * 0.25, rockR * 0.35, 0, Math.PI * 1.1);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (!active) {
    ctx.fillStyle = "rgba(160,180,200,0.55)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("recharging…", 0, 44);
  }
  ctx.restore();
}

/** A broken hull fragment — jagged cross-section with visible structural ribs. */
export function drawWreckArt(ctx: CanvasRenderingContext2D, poiId: string, now: number) {
  ctx.save();
  const seed = hashId(poiId);
  const pulse = 0.5 + 0.5 * Math.sin(now / 340);
  const drift = Math.sin(now / 3000 + seed) * 0.08;
  ctx.rotate(drift);
  ctx.shadowColor = "#b98cff";
  ctx.shadowBlur = 8 + pulse * 6;
  const grad = ctx.createLinearGradient(-18, -20, 18, 20);
  grad.addColorStop(0, "#1a1024");
  grad.addColorStop(0.6, "#4a2f66");
  grad.addColorStop(1, "#b98cff");
  ctx.fillStyle = grad;
  ctx.strokeStyle = "#b98cff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(18, -4);
  ctx.lineTo(14, 6);
  ctx.lineTo(0, 20);
  ctx.lineTo(-16, 8);
  ctx.lineTo(-18, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // structural ribs
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(220,200,255,0.4)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.lineTo(14, -1);
  ctx.moveTo(-12, 4);
  ctx.lineTo(10, 8);
  ctx.stroke();
  // spark flicker
  if (seededRand(Math.floor(now / 260) + seed) > 0.6) {
    ctx.fillStyle = "#fff3d6";
    ctx.shadowColor = "#ffd66a";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(4, -2, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A larger, more elaborate derelict hulk — several broken segments adrift together. */
export function drawDerelictArt(ctx: CanvasRenderingContext2D, poiId: string, now: number) {
  ctx.save();
  const seed = hashId(poiId);
  const drift = Math.sin(now / 4200 + seed) * 0.05;
  ctx.rotate(drift);
  const segments = [
    { x: -18, y: -6, w: 30, h: 12, a: 0.15 },
    { x: 12, y: 8, w: 22, h: 9, a: -0.22 },
    { x: -4, y: 18, w: 16, h: 7, a: 0.4 },
  ];
  for (const seg of segments) {
    ctx.save();
    ctx.translate(seg.x, seg.y);
    ctx.rotate(seg.a);
    ctx.shadowColor = "#5d7285";
    ctx.shadowBlur = 4;
    const grad = ctx.createLinearGradient(-seg.w / 2, 0, seg.w / 2, 0);
    grad.addColorStop(0, "#1a2028");
    grad.addColorStop(0.5, "#3a4553");
    grad.addColorStop(1, "#5d7285");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-seg.w / 2, -seg.h / 2);
    ctx.lineTo(seg.w / 2, -seg.h / 3);
    ctx.lineTo(seg.w / 2 - 3, seg.h / 2);
    ctx.lineTo(-seg.w / 2 + 4, seg.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(160,180,200,0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-seg.w / 2 + 4, 0);
    ctx.lineTo(seg.w / 2 - 4, 0);
    ctx.strokeStyle = "rgba(160,180,200,0.2)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.restore();
  }
  // dim emergency light, barely alive
  if (seededRand(Math.floor(now / 900) + seed) > 0.5) {
    ctx.fillStyle = "#ff5c5c";
    ctx.shadowColor = "#ff5c5c";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(-4, -4, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A multi-stage explosion burst: expanding shockwave ring + flash + colored debris,
 * layered over whatever particle system the caller already emits. */
export function drawExplosionRing(ctx: CanvasRenderingContext2D, x: number, y: number, age: number, maxAge: number) {
  const t = Math.min(1, age / maxAge);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = Math.max(0, 1 - t) * 0.8;
  ctx.strokeStyle = "#ffd66a";
  ctx.shadowColor = "#ffd66a";
  ctx.shadowBlur = 14;
  ctx.lineWidth = 2.5 * (1 - t) + 0.5;
  ctx.beginPath();
  ctx.arc(0, 0, 6 + t * 46, 0, Math.PI * 2);
  ctx.stroke();
  if (t < 0.25) {
    ctx.globalAlpha = 1 - t / 0.25;
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, 12 * (1 - t), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
