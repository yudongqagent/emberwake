import { useState } from "preact/hooks";
import type { StoryScene } from "../../data/types";
import { playSfx } from "../../audio/engine";

export function StoryOverlay({ scene, onComplete }: { scene: StoryScene; onComplete: (scene: StoryScene) => void }) {
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
        background: "linear-gradient(180deg, rgba(3,5,9,0.4), rgba(3,5,9,0.92) 60%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        zIndex: 60,
      }}
      onClick={() => !showChoices && advance()}
    >
      <div style={{ padding: "0.5rem 1.25rem", color: "var(--cyan)", fontFamily: "var(--font-display)", fontSize: "0.75rem", letterSpacing: "0.08em" }}>
        {scene.chapter} — {scene.chapterTitle}
      </div>
      <div className="panel scanline" style={{ margin: "0 1rem 1.25rem", padding: "1.25rem", minHeight: 140 }}>
        {!showChoices ? (
          <>
            {line.speaker && <div style={{ color: "var(--amber)", fontFamily: "var(--font-display)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>{line.speaker}</div>}
            <div style={{ fontSize: "1.05rem", lineHeight: 1.5 }}>{line.text}</div>
            <div style={{ marginTop: "1rem", textAlign: "right", color: "var(--text-dim)", fontSize: "0.78rem" }}>
              Tap to continue ({lineIdx + 1}/{scene.lines.length})
            </div>
          </>
        ) : (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{ color: "var(--text-mid)", marginBottom: "0.75rem" }}>Choose your approach:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {scene.choices!.map((choice, i) => (
                <button
                  key={i}
                  className="btn"
                  style={{ textAlign: "left" }}
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
