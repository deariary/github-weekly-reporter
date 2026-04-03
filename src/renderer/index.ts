// Main report renderer: compiles Handlebars templates into a self-contained HTML file

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import type { WeeklyReportData, Theme, Language, DailyCommitCount } from "../types.js";
import { getLocale } from "../i18n/index.js";
import { buildCSS } from "./themes.js";
import { registerHelpers } from "./helpers.js";

// Templates live at src/renderer/templates/ (both dev and npm package)
const TEMPLATES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "src", "renderer", "templates",
);

const readTemplate = (path: string): string =>
  readFileSync(join(TEMPLATES_DIR, path), "utf-8");

const PARTIAL_NAMES = [
  "header",
  "overview",
  "summaries",
  "highlights",
  "footer",
] as const;

type DailyCommitWithLevel = DailyCommitCount & { level: number };

const computeHeatmapLevels = (dailyCommits: DailyCommitCount[]): DailyCommitWithLevel[] => {
  const max = Math.max(...dailyCommits.map((d) => d.count), 1);
  return dailyCommits.map((d) => {
    if (d.count === 0) return { ...d, level: 0 };
    const ratio = d.count / max;
    if (ratio <= 0.25) return { ...d, level: 1 };
    if (ratio <= 0.5) return { ...d, level: 2 };
    if (ratio <= 0.75) return { ...d, level: 3 };
    return { ...d, level: 4 };
  });
};

export type RenderOptions = {
  theme?: Theme;
  language?: Language;
  timezone?: string;
  baseUrl?: string;
  weekPath?: string;
  siteTitle?: string;
  prevWeek?: string;
  nextWeek?: string;
};

const createInstance = (language: Language, timezone: string): typeof Handlebars => {
  const hbs = Handlebars.create();
  registerHelpers(hbs, { language, timezone });

  PARTIAL_NAMES.forEach((name) => {
    hbs.registerPartial(name, readTemplate(`partials/${name}.hbs`));
  });

  return hbs;
};

export const renderReport = (
  data: WeeklyReportData,
  themeOrOptions: Theme | RenderOptions = "default",
): string => {
  const opts: RenderOptions = typeof themeOrOptions === "string"
    ? { theme: themeOrOptions }
    : themeOrOptions;
  const theme = opts.theme ?? "default";
  const language = opts.language ?? "en";
  const timezone = opts.timezone ?? "UTC";
  const locale = getLocale(language);

  const hbs = createInstance(language, timezone);
  const template = hbs.compile(readTemplate("report.hbs"));

  const baseUrl = opts.baseUrl?.replace(/\/+$/, "") ?? "";
  const weekPath = opts.weekPath ?? "";
  const canonicalUrl = baseUrl && weekPath ? `${baseUrl}/${weekPath}/` : undefined;
  const ogImageUrl = baseUrl && weekPath ? `${baseUrl}/${weekPath}/og.png` : "og.png";

  const siteTitle = opts.siteTitle ?? `${data.username}'s ${locale.weeklyReports}`;

  return template({
    ...data,
    dailyCommits: computeHeatmapLevels(data.dailyCommits),
    css: buildCSS(theme, language),
    lang: language,
    i18n: locale,
    baseUrl,
    canonicalUrl,
    ogImageUrl,
    siteTitle,
    prevWeek: opts.prevWeek,
    nextWeek: opts.nextWeek,
  });
};
