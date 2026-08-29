/** Player preferences, kept outside the save so they survive a reset and so a
 * corrupt save can never take the volume control down with it.
 *
 * Commercial-gap audit #6: there was no settings screen at all — mute was a bare
 * icon in the top bar, and there was no volume, no text speed, and no way to
 * start over. For a game that means to hold a paid-release quality bar, "I can't
 * turn it down and I can't restart" is not a small gap. */

const KEY = "emberwake.settings";

export type TextSpeed = "slow" | "normal" | "fast" | "instant";

export interface Settings {
  /** 0..1 master volume. Independent of mute so unmuting restores the level. */
  volume: number;
  muted: boolean;
  /** How fast dialogue types itself in. "instant" disables the effect. */
  textSpeed: TextSpeed;
  /** Skips already-seen scenes' typing and shows them whole. */
  reduceMotion: boolean;
}

const DEFAULTS: Settings = {
  volume: 0.35,
  muted: false,
  textSpeed: "normal",
  reduceMotion: false,
};

/** Characters per second for each speed. "instant" is handled by the caller. */
export const TEXT_SPEED_CPS: Record<TextSpeed, number> = {
  slow: 22,
  normal: 45,
  fast: 90,
  instant: Infinity,
};

let current: Settings = load();

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      volume: typeof parsed.volume === "number" ? Math.max(0, Math.min(1, parsed.volume)) : DEFAULTS.volume,
      muted: !!parsed.muted,
      textSpeed: (["slow", "normal", "fast", "instant"] as const).includes(parsed.textSpeed) ? parsed.textSpeed : DEFAULTS.textSpeed,
      reduceMotion: !!parsed.reduceMotion,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Storage unavailable — settings simply don't persist this session.
  }
  return current;
}
