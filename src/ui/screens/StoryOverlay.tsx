import { useState } from "preact/hooks";
import type { StoryScene } from "../../data/types";
import { playSfx } from "../../audio/engine";
import { t } from "../../i18n/strings";
import { localizedScene } from "../../i18n/story";

export function StoryOverlay({ scene: rawScene, onComplete }: { scene: StoryScene; onComplete: (scene: StoryScene) => void }) {
  const scene = localizedScene(rawScene);
  const [lineIdx, setLineIdx] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const line = scene.lines[lineIdx];

  function advance() {
    playSfx("dialogue");
    if (lineIdx < scene.lines.length - 1) {
      setLineIdx(lineIdx + 1);
    } else if (scene.choices && scene.choices.length > 0 && !showChoices) {
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
            <div style={{ fontSize: "1.08rem", lineHeight: 1.55 }}>{line.text}</div>
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
