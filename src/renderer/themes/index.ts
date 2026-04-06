// Theme loader: resolves theme directory and provides CSS/template access

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Language, Theme } from "../../types.js";
import {
  buildCSS as brutalistBuildCSS,
  buildIndexCSS as brutalistBuildIndexCSS,
  colors as brutalistColors,
  THEME_INIT_SCRIPT as brutalistInitScript,
  THEME_TOGGLE_SCRIPT as brutalistToggleScript,
} from "./brutalist/index.js";
import {
  buildCSS as minimalBuildCSS,
  buildIndexCSS as minimalBuildIndexCSS,
  colors as minimalColors,
  THEME_INIT_SCRIPT as minimalInitScript,
  THEME_TOGGLE_SCRIPT as minimalToggleScript,
} from "./minimal/index.js";

export type ThemeColors = {
  bg: string;
  accent: string;
  green: string;
  badgePr: string;
  badgeDiscussion: string;
};

export type ThemeModule = {
  buildCSS: (language: Language) => string;
  buildIndexCSS: (language: Language) => string;
  colors: ThemeColors;
  templatesDir: string;
  /** Inline script for <head> to prevent flash of wrong color scheme. */
  themeInitScript?: string;
  /** Inline script for end of <body> to handle theme toggle button. */
  themeToggleScript?: string;
};

const THEMES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "src", "renderer", "themes",
);

const themeModules: Record<Theme, Omit<ThemeModule, "templatesDir">> = {
  brutalist: {
    buildCSS: brutalistBuildCSS,
    buildIndexCSS: brutalistBuildIndexCSS,
    colors: brutalistColors,
    themeInitScript: brutalistInitScript,
    themeToggleScript: brutalistToggleScript,
  },
  minimal: {
    buildCSS: minimalBuildCSS,
    buildIndexCSS: minimalBuildIndexCSS,
    colors: minimalColors,
    themeInitScript: minimalInitScript,
    themeToggleScript: minimalToggleScript,
  },
};

export const AVAILABLE_THEMES: Theme[] = Object.keys(themeModules) as Theme[];

export const loadTheme = (theme: Theme = "brutalist"): ThemeModule => {
  const mod = themeModules[theme];
  if (!mod) {
    const available = AVAILABLE_THEMES.join(", ");
    throw new Error(`Unknown theme "${theme}". Available themes: ${available}`);
  }
  return {
    ...mod,
    templatesDir: join(THEMES_DIR, theme, "templates"),
  };
};

export const readThemeTemplate = (theme: ThemeModule, path: string): string =>
  readFileSync(join(theme.templatesDir, path), "utf-8");
