import { useState } from "preact/hooks";
import type { GameEvent, EventOption, EventOutcome } from "../../data/events";
import { rollOutcome } from "../../data/events";
import { language } from "../../i18n/language";
import { t } from "../../i18n/strings";
import { resourceLabel } from "../components/Icons";
import type { ResourceType } from "../../data/types";

/** 星图事件的面板。
 *
 * 排版刻意和剧情覆盖层一致(书页式旁白 + 选项按钮),因为对玩家来说它们是同一种
 * 东西:世界在跟你说话。区别只在于这里的选项立刻兑现成资源、船体、声望或一场仗。
 *
 * 两段式:先看正文选,再看结果。中间那一下停顿是这套东西的重点——FTL 的事件之所以
 * 记得住,是因为你按下去之后要等一秒才知道自己赌对没有。 */
export function EventOverlay({
  event,
  onResolve,
}: {
  event: GameEvent;
  onResolve: (outcome: EventOutcome) => void;
}) {
  const lang = language.value === "zh" ? "zh" : "en";
  const [result, setResult] = useState<EventOutcome | null>(null);

  function choose(opt: EventOption) {
    const outcome = rollOutcome(opt);
    setResult(outcome);
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 62, display: "flex",
        flexDirection: "column", justifyContent: "flex-end",
        background: "linear-gradient(rgba(3,5,9,0.35), rgba(3,5,9,0.94) 65%)",
      }}
    >
      <div className="panel scanline pop-in" style={{ margin: "0 1rem 1.25rem", padding: "1.35rem", minHeight: 150 }}>
        <div className="eyebrow" style={{ color: "var(--cyan)", marginBottom: "0.7rem" }}>
          {t("event.title")}
        </div>

        {/* 正文走和剧情散文一样的书页排版。 */}
        {(result ? [] : event[lang]).map((line, i) => (
          <div
            key={i}
            style={{
              fontSize: "1.02rem", lineHeight: 1.95, color: "var(--text-mid)",
              textIndent: "2em", paddingLeft: "0.9rem", borderLeft: "2px solid var(--line)",
              marginBottom: "0.6rem",
            }}
          >
            {line}
          </div>
        ))}

        {result ? (
          <>
            <div
              style={{
                fontSize: "1.02rem", lineHeight: 1.95, color: "var(--text-hi)",
                textIndent: "2em", paddingLeft: "0.9rem", borderLeft: "2px solid var(--cyan)",
              }}
            >
              {result[lang]}
            </div>
            <OutcomeSummary outcome={result} />
            <button
              className="btn primary"
              style={{ marginTop: "1rem" }}
              onClick={() => onResolve(result)}
            >
              {t("common.close")}
            </button>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginTop: "1rem" }}>
            {event.options.map((opt, i) => (
              <button
                key={i}
                className="btn"
                style={{
                  textAlign: "left", justifyContent: "flex-start", textTransform: "none",
                  letterSpacing: "normal", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.92rem",
                }}
                onClick={() => choose(opt)}
              >
                {opt[lang]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** 结果的机械后果,单独一行。
 *
 * 散文说的是"发生了什么",这一行说的是"你得到/失去了什么"——两者分开,免得玩家
 * 要从一段文学描写里去猜自己的资源变了多少。 */
function OutcomeSummary({ outcome }: { outcome: EventOutcome }) {
  const bits: string[] = [];
  for (const [k, v] of Object.entries(outcome.resources ?? {})) {
    if (v) bits.push(`${v > 0 ? "+" : ""}${v} ${resourceLabel(k as ResourceType)}`);
  }
  if (outcome.hull) bits.push(`${outcome.hull > 0 ? "+" : ""}${outcome.hull} ${t("event.hull")}`);
  for (const [f, v] of Object.entries(outcome.reputation ?? {})) {
    if (v) bits.push(`${t(`faction.${f}`)} ${v > 0 ? "+" : ""}${v}`);
  }
  if (outcome.kind === "combat") bits.push(t("event.combat"));
  if (bits.length === 0) return null;
  return (
    <div style={{ marginTop: "0.7rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
      {bits.map((b, i) => (
        <span
          key={i}
          style={{
            fontSize: "0.72rem", fontWeight: 700, padding: "0.2em 0.6em", borderRadius: 999,
            border: "1px solid var(--amber)", color: "var(--amber)",
          }}
        >
          {b}
        </span>
      ))}
    </div>
  );
}
