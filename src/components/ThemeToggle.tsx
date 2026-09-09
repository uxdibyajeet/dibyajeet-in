"use client";

import { useEffect, useState } from "react";
import {
  initTheme,
  toggleTheme,
  watchSystemTheme,
} from "@/lib/theme";

/**
 * TEMPORARY dev-only switch — visualize and swap light/dark mode.
 * DELETE BEFORE LAUNCH.
 */
export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const theme = initTheme();

    const raf = window.requestAnimationFrame(() => {
      setIsDark(theme === "dark");
    });

    const unsubscribe = watchSystemTheme((next) => setIsDark(next === "dark"));

    return () => {
      window.cancelAnimationFrame(raf);
      unsubscribe();
    };
  }, []);

  const handleClick = () => {
    setIsDark(toggleTheme() === "dark");
  };

  return (
    <button
      type="button"
      className={`theme-toggle theme-toggle--${isDark ? "dark" : "light"}`}
      onClick={handleClick}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="theme-toggle__track">
        <span className="theme-toggle__label theme-toggle__label--light">
          Light
        </span>
        <span className="theme-toggle__label theme-toggle__label--dark">
          Dark
        </span>
        <span className="theme-toggle__knob" />
      </span>
    </button>
  );
}