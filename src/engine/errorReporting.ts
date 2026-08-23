import { signal } from "@preact/signals";

/** The most recent caught error, surfaced as a small non-blocking indicator instead
 * of a hard freeze or white screen. Cleared automatically a few seconds after it's set. */
export const lastError = signal<{ context: string; message: string; at: number } | null>(null);

let clearTimer: ReturnType<typeof setTimeout> | null = null;

/** Logs an error with context and surfaces it via the non-blocking toast. Call this
 * from any catch block instead of swallowing the error silently — visibility is the
 * point, not just survival. */
export function reportError(context: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.error(`[Emberwake] ${context}:`, err);
  lastError.value = { context, message, at: Date.now() };
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    lastError.value = null;
  }, 4000);
}

/** Runs fn and swallows+reports any throw instead of letting it propagate — for game
 * loop ticks and input handlers, where one bad frame or one bad tap should degrade
 * gracefully (skip this frame/action) rather than take down the whole interaction
 * loop. Returns fallback (default undefined) on failure. */
export function safeCall<T>(context: string, fn: () => T, fallback?: T): T | undefined {
  try {
    return fn();
  } catch (err) {
    reportError(context, err);
    return fallback;
  }
}
