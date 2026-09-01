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
  /** 关闭画面震动、命中顿帧与胜利闪光。
   *
   * 2026-08-31(/loop 第 72 轮):这个字段原来的注释写的是"跳过已看过场景的打字
   * 效果"——那是另一个功能。字段有类型、有默认值、有持久化、设置页有开关、
   * 中英文案都写着"关闭画面震动、顿帧与闪光",而它**一处都没有被消费**:开关
   * 是死的。需要它的玩家打开它、以为游戏安全了,实际什么都没变。 */
  reduceMotion: boolean;
}

/** 系统层面已经表达过"少放动画"的意愿时,默认就该跟着它走——无障碍规范推荐
 * 用 prefers-reduced-motion 打底,而不是让人先在设置里翻到这一项。
 * 玩家在游戏里改过之后,存下来的值优先。 */
function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
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
    if (!raw) return { ...DEFAULTS, reduceMotion: prefersReducedMotion() };
    const parsed = JSON.parse(raw);
    return {
      volume: typeof parsed.volume === "number" ? Math.max(0, Math.min(1, parsed.volume)) : DEFAULTS.volume,
      muted: !!parsed.muted,
      textSpeed: (["slow", "normal", "fast", "instant"] as const).includes(parsed.textSpeed) ? parsed.textSpeed : DEFAULTS.textSpeed,
      reduceMotion: typeof parsed.reduceMotion === "boolean" ? parsed.reduceMotion : prefersReducedMotion(),
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
