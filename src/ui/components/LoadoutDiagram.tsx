import { useEffect, useRef } from "preact/hooks";
import { drawPlayerHull } from "../render/shipArt";
import { MODULE_TYPE_COLOR } from "./Icons";
import type { ModuleType } from "../../data/types";

export interface DiagramSlot {
  index: number;
  type: ModuleType;
  filled: boolean;
  /** Highlighted because the player is currently picking a module for it. */
  active: boolean;
}

/** Player direction 2026-08-24: "内容应该在canvas里最合适的地方用图形方式展现".
 *
 * A ship's loadout is inherently spatial — a flat grid of identical cards throws
 * that away and reads as a settings form. This draws Whisper in the round with her
 * hardpoints arranged around the hull: weapons forward, armour amidships, engines
 * aft, utility high. Filled slots glow in their type colour, empty ones read as
 * hollow sockets, and the slot being edited pulses.
 *
 * It's a companion to the cards below it, not a replacement — the cards carry the
 * detail and the controls, this carries the shape of the ship at a glance. */
export function LoadoutDiagram({
  slots,
  onSelectSlot,
  width = 320,
  height = 190,
}: {
  slots: DiagramSlot[];
  onSelectSlot: (index: number) => void;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  /** Screen-space hit targets, rebuilt each frame so clicks track the layout. */
  const hitsRef = useRef<{ x: number; y: number; r: number; index: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    let raf = 0;
    function frame(now: number) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Hull, drawn nose-up so the fore/aft slot arrangement reads correctly.
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-Math.PI / 2);
      drawPlayerHull(ctx, 1.35, now, false);
      ctx.restore();

      // Group slots by type so each type occupies its own arc of the hull.
      const byType: Record<string, DiagramSlot[]> = {};
      for (const s of slotsRef.current) (byType[s.type] ||= []).push(s);

      // Angles are measured with 0 = straight up (nose). Weapons forward, engines
      // aft, armour and utility to the flanks.
      const ARC: Record<ModuleType, { start: number; end: number; radius: number }> = {
        weapon: { start: -0.85, end: 0.85, radius: 66 },
        armor: { start: 1.15, end: 2.0, radius: 58 },
        utility: { start: -2.0, end: -1.15, radius: 58 },
        engine: { start: 2.5, end: 3.8, radius: 62 },
      };

      const hits: typeof hitsRef.current = [];
      for (const type of Object.keys(byType) as ModuleType[]) {
        const group = byType[type];
        const arc = ARC[type];
        const color = MODULE_TYPE_COLOR[type];
        group.forEach((slot, i) => {
          const tRatio = group.length === 1 ? 0.5 : i / (group.length - 1);
          const ang = arc.start + (arc.end - arc.start) * tRatio;
          const x = cx + Math.sin(ang) * arc.radius;
          const y = cy - Math.cos(ang) * arc.radius;
          const pulse = slot.active ? 0.6 + 0.4 * Math.sin(now / 200) : 1;
          const r = 9;

          // Tether back to the hull, so a socket reads as mounted ON the ship.
          ctx.beginPath();
          ctx.moveTo(cx + Math.sin(ang) * 20, cy - Math.cos(ang) * 20);
          ctx.lineTo(x, y);
          ctx.strokeStyle = slot.filled ? color : "rgba(255,255,255,0.12)";
          ctx.globalAlpha = slot.filled ? 0.5 : 1;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.globalAlpha = 1;

          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          if (slot.filled) {
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.28 * pulse;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.shadowColor = color;
            ctx.shadowBlur = 8 * pulse;
          } else {
            ctx.strokeStyle = slot.active ? color : "rgba(255,255,255,0.28)";
            ctx.lineWidth = slot.active ? 2 : 1.2;
            ctx.setLineDash([3, 3]);
          }
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;

          hits.push({ x, y, r: r + 6, index: slot.index });
        });
      }
      hitsRef.current = hits;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, maxWidth: "100%", display: "block", margin: "0 auto", cursor: "pointer" }}
      onClick={(e) => {
        const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
        // The canvas is CSS-scaled on narrow screens; map the click back first.
        const px = ((e.clientX - rect.left) / rect.width) * width;
        const py = ((e.clientY - rect.top) / rect.height) * height;
        const hit = hitsRef.current.find((h) => Math.hypot(px - h.x, py - h.y) <= h.r);
        if (hit) onSelectSlot(hit.index);
      }}
    />
  );
}
