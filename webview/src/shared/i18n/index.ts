import { zhCommit } from "./zh/commit";
import { zhCommon } from "./zh/common";
import { zhConflicts } from "./zh/conflicts";
import { zhPanel } from "./zh/panel";
import { zhPush } from "./zh/push";
import { zhRollback } from "./zh/rollback";

export type Locale = "en" | "zh-cn";

/**
 * Translation dictionaries are keyed by their English source text. This keeps
 * the source readable and makes it obvious when a string is not translated yet
 * (it simply falls back to English).
 */
const dictionaries: Record<Exclude<Locale, "en">, Record<string, string>> = {
  "zh-cn": {
    ...zhCommon,
    ...zhPanel,
    ...zhCommit,
    ...zhConflicts,
    ...zhPush,
    ...zhRollback,
  },
};

function detectLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const root = document.getElementById("root");
  return normalizeLocale(root?.dataset.locale ?? navigator.language);
}

// Resolve the locale at module-evaluation time. Every module that uses `t`
// imports this file first, so module-level constants built with `t(...)` are
// already localized, even before the React tree mounts.
let currentLocale: Locale = detectLocale();
const warned = new Set<string>();

export function normalizeLocale(value: string | undefined | null): Locale {
  const v = (value ?? "").toLowerCase().replace("_", "-");
  return v === "zh-cn" || v === "zh" || v.startsWith("zh-") ? "zh-cn" : "en";
}

export function setLocale(value: string | undefined | null): void {
  currentLocale = normalizeLocale(value);
  if (typeof document !== "undefined") {
    document.documentElement.lang = currentLocale === "zh-cn" ? "zh-CN" : "en";
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function isZh(): boolean {
  return currentLocale === "zh-cn";
}

/**
 * Translate an English source string into the active locale.
 *
 * Usage:
 *   t("Commit")
 *   t("Reset '{branch}' to {hash}?", { branch, hash })
 *
 * In English the key itself is returned, so wrapping a string is always safe.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  let text = key;
  if (currentLocale !== "en") {
    const dict = dictionaries[currentLocale];
    const translated = dict[key];
    if (translated === undefined) {
      if (import.meta.env.DEV && !warned.has(key)) {
        warned.add(key);
        console.warn(`[i18n] missing ${currentLocale} translation: ${key}`);
      }
    } else {
      text = translated;
    }
  }
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

/** Translate a string that is only known at runtime (e.g. from git output). */
export function translateDynamic(text: string): string {
  return currentLocale === "en"
    ? text
    : (dictionaries[currentLocale][text] ?? text);
}
