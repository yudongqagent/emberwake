import { signal } from "@preact/signals";

/** Issue #11 (2026-08-23 playtest): the language preference is a device/browser
 * setting, not game state — it lives in its own localStorage key, separate from
 * `emberwake.save` (see engine/save.ts), so switching languages never touches the
 * save schema/migration path and a save can be carried across a language switch
 * with zero risk of corrupting either. */
export type Lang = "zh" | "en";

const LANG_KEY = "emberwake.language";

function loadLanguage(): Lang {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    return raw === "en" ? "en" : "zh"; // default: Chinese for anyone with no stored preference
  } catch {
    return "zh";
  }
}

export const language = signal<Lang>(loadLanguage());

export function setLanguage(lang: Lang): void {
  language.value = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // localStorage unavailable — language choice just won't persist across reloads.
  }
}
