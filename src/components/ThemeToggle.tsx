"use client";

import { useSyncExternalStore } from "react";

import { resolveTheme, type Theme, THEME_STORAGE_KEY, themeSwitchLabel } from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  const media = matchMedia(DARK_QUERY);
  listeners.add(onChange);
  media.addEventListener("change", onChange);
  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onChange);
  };
}

/** <html data-theme> is the source of truth: the boot script sets it from a saved choice. */
function currentTheme(): Theme {
  return resolveTheme(document.documentElement.dataset.theme ?? null, matchMedia(DARK_QUERY).matches);
}

function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage blocked (private mode): the choice lasts until the page is left
  }
  listeners.forEach((onChange) => onChange());
}

/** Paper / phosphor switch. The server renders nothing, so with JS off the page just follows the OS. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => null);
  if (theme === null) return null;

  const other: Theme = theme === "phosphor" ? "paper" : "phosphor";
  const label = themeSwitchLabel(theme);
  return (
    <button className="theme-toggle" type="button" onClick={() => setTheme(other)} aria-label={label.ariaLabel}>
      ◐ {label.text}
    </button>
  );
}
