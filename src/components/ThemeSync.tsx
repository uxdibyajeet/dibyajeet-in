"use client";

import { useEffect } from "react";
import {
  initTheme,
  watchSystemTheme,
} from "@/lib/theme";

/**
 * Applies the OS/browser UI preference on load and keeps following it live.
 * Renders nothing — the actual theme is driven by device detection only.
 */
export default function ThemeSync() {
  useEffect(() => {
    initTheme();
    return watchSystemTheme(() => {});
  }, []);

  return null;
}