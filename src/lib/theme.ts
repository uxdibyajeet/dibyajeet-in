export type Theme = "light" | "dark";

/** Reads the OS/browser UI preference. SSR-safe (defaults to light). */
export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Reads the theme currently applied to <html> (no persistence). */
export function getActiveTheme(): Theme {
  return typeof document !== "undefined" &&
    document.documentElement.dataset.theme === "dark"
    ? "dark"
    : "light";
}

/** Applies a theme to <html data-theme="...">. Never persists the choice. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
}

export function setTheme(theme: Theme): void {
  applyTheme(theme);
}

export function toggleTheme(): Theme {
  const next: Theme = getActiveTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

/**
 * Resolves the theme to the current system UI preference and applies it,
 * so the site always matches the user's OS setting on load.
 */
export function initTheme(): Theme {
  const theme = getSystemTheme();
  applyTheme(theme);
  return theme;
}

/**
 * Follows the system UI preference live (no persisted override, so the site
 * always tracks the OS/browser setting). Returns an unsubscribe function.
 */
export function watchSystemTheme(onChange: (theme: Theme) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (event: MediaQueryListEvent) => {
    const theme: Theme = event.matches ? "dark" : "light";
    applyTheme(theme);
    onChange(theme);
  };

  media.addEventListener("change", handler);
  return () => media.removeEventListener("change", handler);
}

/**
 * Bare-bones inline <head> script: applies the system theme before first
 * paint so there is no flash-of-wrong-theme on reload.
 */
export const themeInitScript = `(function(){try{var s=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var d=document.documentElement;d.setAttribute("data-theme",s);d.style.colorScheme=s;}catch(e){}})();`;