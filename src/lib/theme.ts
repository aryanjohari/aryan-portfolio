/** The two colour themes, named after Phosphene's palettes: paper (light) and phosphor (dark). */
export const THEMES = ["paper", "phosphor"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = "theme";

/** A saved choice wins; anything else (nothing saved, an old or bad value) follows the OS. */
export function resolveTheme(saved: string | null, osDark: boolean): Theme {
  if ((THEMES as readonly string[]).includes(saved ?? "")) return saved as Theme;
  return osDark ? "phosphor" : "paper";
}

/** The switch names the theme it goes TO, in words visitors know (the internal names stay paper/phosphor). */
export function themeSwitchLabel(current: Theme): { text: string; ariaLabel: string } {
  const word = current === "phosphor" ? "light" : "dark";
  return { text: word === "light" ? "Light" : "Dark", ariaLabel: `Switch to the ${word} theme` };
}

/**
 * Runs inline in <head>, before the page paints, so a saved theme doesn't flash
 * the other one first. Kept tiny and dependency-free; it only applies a valid saved value.
 */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(${JSON.stringify(THEMES)}.indexOf(t)>-1)document.documentElement.dataset.theme=t}catch(e){}`;
