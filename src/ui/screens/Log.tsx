import { useState } from "preact/hooks";
import { storyLog, type LogEntry } from "../../state/store";
import { t } from "../../i18n/strings";
import { playSfx } from "../../audio/engine";

/** 航行日志 — 已经演过的每一幕,可以重看。
 *
 * 2026-09-01(/loop 第 83 轮)。这个游戏自称 story-driven,46 幕戏、六幕结构、
 * 一个会写进声望的抉择系统——而且每一幕上都摆着一个「跳过本节」按钮。演完就没了:
 * 没有日志、没有回看、没有任何地方能查"我当时选了什么"。
 *
 * 内容全部从已有的 flag 推出来(见 store.ts 的 storyLog),所以老存档一进来就是
 * 满的,不需要迁移。 */
export function Log() {
  const entries = storyLog();
  const [open, setOpen] = useState<string | null>(entries.length ? entries[entries.length - 1].scene.id : null);

  if (entries.length === 0) {
    return (
      <div style={{ padding: "1.2rem", color: "var(--text-mid)", fontSize: "0.85rem" }}>
        {t("log.empty")}
      </div>
    );
  }

  // 按章分组,保持剧情顺序。
  const chapters: { chapter: string; title: string; items: LogEntry[] }[] = [];
  for (const e of entries) {
    const last = chapters[chapters.length - 1];
    if (last && last.chapter === e.chapter) last.items.push(e);
    else chapters.push({ chapter: e.chapter, title: e.chapterTitle, items: [e] });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem", padding: "0.2rem 0 1rem" }}>
      <div style={{ color: "var(--text-mid)", fontSize: "0.8rem" }}>
        {t("log.count", { n: entries.length })}
      </div>
      {chapters.map((ch) => (
        <div key={ch.chapter}>
          <div className="eyebrow" style={{ color: "var(--text-dim)", marginBottom: "0.35rem" }}>
            {ch.chapter} · {ch.title}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {ch.items.map((e) => {
              const isOpen = open === e.scene.id;
              return (
                <div key={e.scene.id} className="panel compact" style={{ padding: "0.55rem 0.7rem" }}>
                  <button
                    className="btn ghost"
                    style={{
                      width: "100%", justifyContent: "space-between", fontSize: "0.72rem",
                      border: "none", padding: "0.2em 0", textAlign: "left",
                    }}
                    onClick={() => { setOpen(isOpen ? null : e.scene.id); playSfx("click"); }}
                    aria-expanded={isOpen}
                  >
                    <span>{e.scene.chapterTitle}</span>
                    <span style={{ color: "var(--text-dim)" }}>{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && (
                    <div style={{ marginTop: "0.45rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      {e.scene.lines.map((line, i) => (
                        <div key={i}>
                          <span style={{ color: "var(--cyan)", fontSize: "0.7rem", fontWeight: 700 }}>{line.speaker}</span>
                          <div style={{ color: "var(--text-mid)", fontSize: "0.78rem", lineHeight: 1.5 }}>{line.text}</div>
                        </div>
                      ))}
                      {/* 「我当时选了什么」——抉择系统的后果写进了声望,而玩家
                          此前没有任何地方能回头确认自己做过什么。 */}
                      {e.choice && (
                        <div style={{ marginTop: "0.3rem", fontSize: "0.75rem", color: "var(--amber)" }}>
                          {t("log.yourChoice")} {e.choice}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
