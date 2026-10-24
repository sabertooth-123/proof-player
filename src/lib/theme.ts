// Light ("notebook") is the default; dark ("graphite") is opt-in from the header toggle.
// The choice lives on <html data-theme> and in localStorage. index.html applies a saved
// choice before the first paint, so the page never flashes the wrong theme.

export type Theme = "light" | "dark";

const KEY = "pp-theme";
const THEME_COLOR: Record<Theme, string> = { light: "#f7f5f0", dark: "#0f1115" };

export function currentTheme(): Theme {
  return typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Private mode or blocked storage: the theme still applies for this visit.
  }
}
