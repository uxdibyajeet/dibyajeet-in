export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "portfolio-theme";

const isTheme = (value: string | null): value is Theme =>
  value === "light" || value === "dark";

/** Reads the OS/browser UI preference. SSR-safe (defaults to light). */
export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(stored) ? stored : null;
}

/** Applies a theme to <html data-theme="..."> and keeps it in sync. */
export function applyTheme(theme: Theme, persist = true): void {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  if (persist) window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function setTheme(theme: Theme): void {
  applyTheme(theme);
}

export function toggleTheme(): Theme {
  const current = getStoredTheme() ?? getSystemTheme();
  const next: Theme = current === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

/**
 * Resolves the active theme: manual override from localStorage, falling back
 * to the system UI preference. Persists only when a manual override exists.
 */
export function initTheme(): Theme {
  const stored = getStoredTheme();
  const theme = stored ?? getSystemTheme();
  applyTheme(theme, stored !== null);
  return theme;
}

/**
 * Follows the system UI preference live — unless the user has a manual
 * override stored. Returns an unsubscribe function.
 */
export function watchSystemTheme(onChange: (theme: Theme) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (event: MediaQueryListEvent) => {
    const theme: Theme = event.matches ? "dark" : "light";
    if (getStoredTheme() === null) applyTheme(theme, false);
    onChange(theme);
  };

  media.addEventListener("change", handler);
  return () => media.removeEventListener("change", handler);
}

/**
 * Bare-bones inline <head> script: applies the theme before first paint so
 * there is no flash-of-wrong-theme on reload.
 */
export const themeInitScript = `(function(){try{var k="${THEME_STORAGE_KEY}";var s=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var t=localStorage.getItem(k);var r=(t==="light"||t==="dark")?t:s;var d=document.documentElement;d.setAttribute("data-theme",r);d.style.colorScheme=r;}catch(e){}})();`;