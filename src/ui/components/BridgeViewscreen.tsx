import { useEffect, useRef } from "preact/hooks";
import { t } from "../../i18n/strings";

interface Star {
  x: number;
  y: number;
  z: number;
  r: number;
}

/** The bridge's forward viewport — a live starfield framed by console/strut
 * silhouettes, so the Bridge screen reads as standing on a ship rather than
 * reading a stat sheet. */
export function BridgeViewscreen({ systemName, galaxyName }: { systemName: string; galaxyName: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let w = 0, h = 0, dpr = 1;

    const stars: Star[] = Array.from({ length: 140 }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random(),
      r: 0.6 + Math.random() * 1.4,
    }));

    function resize() {
      const rect = canvas.parentElement!.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    function frame(now: number) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createRadialGradient(w * 0.62, h * 0.35, 0, w * 0.62, h * 0.35, Math.max(w, h) * 0.85);
      bg.addColorStop(0, "#0f2233");
      bg.addColorStop(0.55, "#081222");
      bg.addColorStop(1, "#02040a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // distant star glow, gives the viewport a focal point
      const sun = ctx.createRadialGradient(w * 0.66, h * 0.32, 0, w * 0.66, h * 0.32, 70);
      sun.addColorStop(0, "rgba(255,230,190,0.55)");
      sun.addColorStop(0.4, "rgba(255,190,120,0.14)");
      sun.addColorStop(1, "rgba(255,190,120,0)");
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, w, h);

      const drift = now / 26000;
      for (const s of stars) {
        const px = (((s.x + drift * (0.3 + s.z * 0.7)) % 1 + 1.5) % 1) * w;
        const py = ((s.y + 1) / 2) * h * 0.86;
        ctx.globalAlpha = 0.25 + s.z * 0.65;
        ctx.fillStyle = "#dfeeff";
        ctx.beginPath();
        ctx.arc(px, py, s.r * (0.6 + s.z), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // slow horizontal scan sweep across the glass
      const sweepX = ((now / 5200) % 1) * (w + 200) - 100;
      const sweep = ctx.createLinearGradient(sweepX - 60, 0, sweepX + 60, 0);
      sweep.addColorStop(0, "rgba(143,243,255,0)");
      sweep.addColorStop(0.5, "rgba(143,243,255,0.05)");
      sweep.addColorStop(1, "rgba(143,243,255,0)");
      ctx.fillStyle = sweep;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      className="panel flush"
      style={{
        position: "relative",
        height: 190,
        flex: "none",
        overflow: "hidden",
        padding: 0,
        border: "1px solid var(--line-bright)",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, display: "block" }} />

      {/* console / strut framing, sold as silhouette geometry over the live starfield */}
      <svg viewBox="0 0 400 190" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <polygon points="0,190 0,140 60,110 130,132 130,190" fill="rgba(4,8,14,0.92)" />
        <polygon points="400,190 400,140 340,110 270,132 270,190" fill="rgba(4,8,14,0.92)" />
        <polygon points="0,140 60,110 130,132 130,140" fill="none" stroke="rgba(75,232,255,0.4)" stroke-width="1" />
        <polygon points="400,140 340,110 270,132 270,140" fill="none" stroke="rgba(75,232,255,0.4)" stroke-width="1" />
        <rect x="150" y="176" width="100" height="14" fill="rgba(4,8,14,0.92)" />
        <rect x="150" y="176" width="100" height="2" fill="rgba(75,232,255,0.5)" />
        <circle cx="165" cy="183" r="1.6" fill="#ffb84d" />
        <circle cx="175" cy="183" r="1.6" fill="#5dffb0" />
        <circle cx="185" cy="183" r="1.6" fill="#8ff3ff" />
      </svg>

      <div style={{ position: "absolute", top: 10, left: 12, fontFamily: "var(--font-display)", fontSize: "0.62rem", letterSpacing: "0.08em", color: "var(--cyan)", textTransform: "uppercase", textShadow: "0 0 6px rgba(75,232,255,0.6)" }}>
        {t("bridge.forwardViewport")}
      </div>
      <div style={{ position: "absolute", top: 10, right: 12, textAlign: "right", fontFamily: "var(--font-display)", fontSize: "0.62rem", letterSpacing: "0.06em", color: "var(--text-mid)", textShadow: "0 0 6px rgba(0,0,0,0.8)" }}>
        <div style={{ color: "var(--text-hi)" }}>{systemName}</div>
        <div style={{ opacity: 0.75 }}>{galaxyName}</div>
      </div>
    </div>
  );
}
