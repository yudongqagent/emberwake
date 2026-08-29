import { useEffect, useRef, useState } from "preact/hooks";
import { t } from "../../i18n/strings";
import { language, setLanguage } from "../../i18n/language";
import { playSfx } from "../../audio/engine";
import { Settings } from "./Settings";

/** The title screen.
 *
 * Commercial-gap audit #1: the game had none. It dropped straight onto a dark
 * star map with a dialogue box already open — no logo, no New Game, no moment
 * that says what this is. Measured, 94.5% of that opening screen was black.
 *
 * Everything here is drawn rather than loaded, because the target is a free
 * browser game held to a paid-release quality bar: it has to look composed on
 * first frame without waiting on a single downloaded asset. The ember field is
 * canvas, the wordmark is type, and the whole screen is under a kilobyte of
 * state. */
export function TitleScreen({
  hasSave,
  onContinue,
  onNewGame,
}: {
  hasSave: boolean;
  onContinue: () => void;
  onNewGame: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Embers rising through the dark. Slow, sparse, and warm — the one warm
    // element against a cold palette, so the eye has somewhere to go.
    type Ember = { x: number; y: number; vy: number; r: number; a: number; hue: number };
    let embers: Ember[] = [];
    let raf = 0;

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = canvas!.clientWidth * dpr;
      canvas!.height = canvas!.clientHeight * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round((canvas!.clientWidth * canvas!.clientHeight) / 9000);
      embers = Array.from({ length: Math.max(40, Math.min(170, target)) }, () => spawn(true));
    }

    function spawn(anywhere: boolean): Ember {
      const w = canvas!.clientWidth, h = canvas!.clientHeight;
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : h + 10,
        vy: 4 + Math.random() * 16,
        r: 0.6 + Math.random() * 1.9,
        a: 0.15 + Math.random() * 0.6,
        hue: 18 + Math.random() * 26,
      };
    }

    let last = performance.now();
    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = canvas!.clientWidth, h = canvas!.clientHeight;

      const bg = ctx!.createRadialGradient(w * 0.5, h * 0.62, 0, w * 0.5, h * 0.62, Math.max(w, h) * 0.75);
      bg.addColorStop(0, "#140d1c");
      bg.addColorStop(1, "#04030a");
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, w, h);

      for (const e of embers) {
        e.y -= e.vy * dt;
        e.x += Math.sin((now / 1400) + e.y * 0.02) * 6 * dt;
        if (e.y < -12) Object.assign(e, spawn(false));
        ctx!.globalAlpha = e.a;
        ctx!.fillStyle = `hsl(${e.hue} 95% 62%)`;
        ctx!.shadowColor = `hsl(${e.hue} 95% 60%)`;
        ctx!.shadowBlur = 9;
        ctx!.beginPath();
        ctx!.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      ctx!.shadowBlur = 0;
      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div style={{ position: "relative", height: "100%", overflow: "hidden", background: "#04030a" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />

      <div
        style={{
          position: "relative", zIndex: 1, height: "100%",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "calc(2rem + var(--safe-top)) 1.25rem calc(2rem + var(--safe-bottom))",
          gap: "0.4rem", textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)", fontWeight: 900,
            fontSize: "clamp(2.6rem, 12vw, 5rem)", letterSpacing: "0.16em",
            color: "var(--text-hi)",
            textShadow: "0 0 34px rgba(255,150,60,0.55), 0 0 90px rgba(255,110,40,0.28)",
            lineHeight: 1,
            animation: "popIn 700ms cubic-bezier(0.2,1.2,0.3,1) both",
          }}
        >
          {t("title.name")}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)", letterSpacing: "0.42em",
            fontSize: "clamp(0.6rem, 2.6vw, 0.78rem)", color: "var(--amber)",
            marginTop: "0.35rem", opacity: 0.9,
            animation: "rewardIn 700ms ease-out both", animationDelay: "220ms",
          }}
        >
          {t("title.tagline")}
        </div>
        <div
          style={{
            maxWidth: 430, fontSize: "0.82rem", color: "var(--text-mid)",
            lineHeight: 1.6, marginTop: "1.1rem",
            animation: "rewardIn 700ms ease-out both", animationDelay: "380ms",
          }}
        >
          {t("title.pitch")}
        </div>

        <div
          style={{
            display: "flex", flexDirection: "column", gap: "0.55rem",
            marginTop: "1.6rem", width: "100%", maxWidth: 300,
            animation: "rewardIn 700ms ease-out both", animationDelay: "520ms",
          }}
        >
          {hasSave && (
            <button className="btn primary" style={{ padding: "0.75em" }} onClick={() => { playSfx("jump"); onContinue(); }}>
              {t("title.continue")}
            </button>
          )}
          {!confirmNew ? (
            <button
              className={hasSave ? "btn ghost" : "btn primary"}
              style={{ padding: "0.75em" }}
              onClick={() => { playSfx("click"); hasSave ? setConfirmNew(true) : onNewGame(); }}
            >
              {t("title.newGame")}
            </button>
          ) : (
            <div className="panel accent" style={{ padding: "0.7rem", ["--accent" as never]: "var(--red)" }}>
              <div style={{ fontSize: "0.76rem", color: "var(--text-mid)", lineHeight: 1.45 }}>{t("title.overwriteWarn")}</div>
              <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.55rem" }}>
                <button className="btn ghost" style={{ flex: 1 }} onClick={() => setConfirmNew(false)}>{t("common.cancel")}</button>
                <button className="btn danger" style={{ flex: 1 }} onClick={() => { playSfx("jump"); onNewGame(); }}>{t("title.overwriteConfirm")}</button>
              </div>
            </div>
          )}
          <button className="btn ghost" style={{ padding: "0.7em" }} onClick={() => { playSfx("click"); setSettingsOpen(true); }}>
            {t("settings.title")}
          </button>
          <button
            className="btn ghost"
            style={{ padding: "0.6em", fontSize: "0.72rem" }}
            onClick={() => { playSfx("click"); setLanguage(language.value === "zh" ? "en" : "zh"); }}
          >
            {t("nav.language")}
          </button>
        </div>
      </div>

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
