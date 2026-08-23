import { lastError } from "../../engine/errorReporting";

/** A small non-blocking "something glitched, recovering" indicator — the counterpart
 * to ErrorBoundary for errors caught outside the render cycle (game loop ticks, input
 * handlers via safeCall). Never blocks input or covers the screen; it's a signal that
 * something was caught and handled, not a modal that demands attention. */
export function ErrorToast() {
  const err = lastError.value;
  if (!err) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(4.2rem + var(--safe-bottom))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      <div
        className="panel compact pop-in"
        style={{
          padding: "0.5rem 0.9rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          border: "1px solid var(--amber)",
          maxWidth: "min(90vw, 360px)",
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--amber)", flex: "none", boxShadow: "0 0 6px var(--amber)" }} />
        <span className="eyebrow" style={{ color: "var(--amber)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Something glitched — recovered
        </span>
      </div>
    </div>
  );
}
