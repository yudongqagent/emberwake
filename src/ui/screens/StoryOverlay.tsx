import { useEffect, useState } from "preact/hooks";
import type { StoryScene } from "../../data/types";
import { playSfx } from "../../audio/engine";
import { t } from "../../i18n/strings";
import { localizedScene } from "../../i18n/story";
import { applyReactiveLines } from "../../data/story/reactive";
import { storyContext } from "../../state/store";
import { language } from "../../i18n/language";
import { getSettings, TEXT_SPEED_CPS } from "../../engine/settings";

export function StoryOverlay({ scene: rawScene, onComplete }: { scene: StoryScene; onComplete: (scene: StoryScene) => void }) {
  // 先本地化,再插"认得出玩家"的那句——插入用的是下标,而中文覆盖层和英文原文
  // 行数是一一对应的,所以顺序反过来也对;放在后面只是因为插进去的那句自带两种
  // 语言,不需要再过一次覆盖层。
  const scene = applyReactiveLines(localizedScene(rawScene), storyContext(), language.value === "zh" ? "zh" : "en");
  const [lineIdx, setLineIdx] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const line = scene.lines[lineIdx];

  /** Commercial-gap audit #1: the opening was 15 unskippable clicks and ~1,600
   * characters before the player did anything, with no skip and no text speed.
   * Text now types in at the player's chosen rate; the first tap completes the
   * line instead of advancing past it, so a fast reader is never punished for
   * tapping early and a slow one is never rushed. */
  const [shown, setShown] = useState(0);
  const cps = TEXT_SPEED_CPS[getSettings().textSpeed];
  const full = line?.text ?? "";
  const typing = shown < full.length;

  useEffect(() => {
    setShown(cps === Infinity ? full.length : 0);
    if (cps === Infinity) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const n = Math.min(full.length, Math.floor(((now - start) / 1000) * cps));
      setShown(n);
      if (n < full.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineIdx, full]);

  function advance() {
    if (typing) {
      // First tap finishes the line rather than skipping it.
      setShown(full.length);
      return;
    }
    playSfx("dialogue");
    if (lineIdx < scene.lines.length - 1) {
      setLineIdx(lineIdx + 1);
    } else if (scene.choices && scene.choices.length > 0 && !showChoices) {
      setShowChoices(true);
    } else {
      onComplete(scene);
    }
  }

  /** Jumps to the end of the scene. A scene with a choice still stops at the
   * choice — skipping past a decision would make it for the player. */
  function skip() {
    playSfx("click");
    if (scene.choices && scene.choices.length > 0) {
      setLineIdx(scene.lines.length - 1);
      setShown(full.length);
      setShowChoices(true);
    } else {
      onComplete(scene);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(180deg, rgba(3,5,9,0.35), rgba(3,5,9,0.94) 65%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        zIndex: 60,
      }}
      onClick={() => !showChoices && advance()}
    >
      <div style={{ padding: "0 1.25rem 0.6rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)", flex: "none" }} />
        <span className="eyebrow" style={{ color: "var(--cyan)" }}>{scene.chapter} — {scene.chapterTitle}</span>
        {!showChoices && (
          <button
            className="btn ghost"
            style={{ marginLeft: "auto", fontSize: "0.68rem", padding: "0.3em 0.7em" }}
            onClick={(e) => { e.stopPropagation(); skip(); }}
          >
            {t("story.skip")} ›
          </button>
        )}
      </div>
      <div className="panel scanline pop-in" key={lineIdx} style={{ margin: "0 1rem 1.25rem", padding: "1.35rem", minHeight: 150 }}>
        {!showChoices ? (
          <>
            {line.speaker && (
              <div
                style={{
                  display: "inline-block",
                  color: "var(--amber)",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  letterSpacing: "0.04em",
                  marginBottom: "0.6rem",
                  paddingBottom: "0.2rem",
                  borderBottom: "2px solid var(--amber)",
                }}
              >
                {line.speaker}
              </div>
            )}
            <div style={{ fontSize: "1.08rem", lineHeight: 1.55 }}>
              {full.slice(0, shown)}
              {typing && <span style={{ opacity: 0.5 }}>▌</span>}
            </div>
            <div style={{ marginTop: "1.1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "0.3rem" }}>
                {scene.lines.map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: i === lineIdx ? 14 : 5,
                      height: 5,
                      borderRadius: 3,
                      background: i <= lineIdx ? "var(--cyan)" : "rgba(255,255,255,0.15)",
                      transition: "width 150ms ease",
                    }}
                  />
                ))}
              </div>
              <span className="eyebrow" style={{ color: "var(--text-dim)" }}>{t("story.tapToContinue")}</span>
            </div>
          </>
        ) : (
          <div onClick={(e) => e.stopPropagation()}>
            <div className="eyebrow" style={{ color: "var(--text-mid)", marginBottom: "0.85rem" }}>{t("story.chooseApproach")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {scene.choices!.map((choice, i) => (
                <button
                  key={i}
                  className="btn ghost"
                  style={{ textAlign: "left", justifyContent: "flex-start", textTransform: "none", letterSpacing: "normal", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.92rem" }}
                  onClick={() => {
                    playSfx("click");
                    onComplete({ ...scene, onCompleteFlags: [...scene.onCompleteFlags, ...(choice.setFlags ?? [])] });
                  }}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
