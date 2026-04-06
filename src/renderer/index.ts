// Main report renderer: compiles Handlebars templates into a self-contained HTML file

import Handlebars from "handlebars";
import type { WeeklyReportData, Language, Theme, DailyCommitCount } from "../types.js";
import { getLocale } from "../i18n/index.js";
import { loadTheme, readThemeTemplate } from "./themes/index.js";
import { registerHelpers } from "./helpers.js";

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
  language?: Language;
  timezone?: string;
  baseUrl?: string;
  weekPath?: string;
  siteTitle?: string;
  prevWeek?: string;
  nextWeek?: string;
  theme?: Theme;
};

const createInstance = (language: Language, timezone: string, theme: ReturnType<typeof loadTheme>): typeof Handlebars => {
  const hbs = Handlebars.create();
  registerHelpers(hbs, { language, timezone });

  PARTIAL_NAMES.forEach((name) => {
    hbs.registerPartial(name, readThemeTemplate(theme, `partials/${name}.hbs`));
  });

  return hbs;
};

/** Render a weekly report as a self-contained HTML string. */
export const renderReport = (
  data: WeeklyReportData,
  options: RenderOptions = {},
): string => {
  const language = options.language ?? "en";
  const timezone = options.timezone ?? "UTC";
  const locale = getLocale(language);
  const theme = loadTheme(options.theme ?? "brutalist");

  const hbs = createInstance(language, timezone, theme);
  const template = hbs.compile(readThemeTemplate(theme, "report.hbs"));

  const baseUrl = options.baseUrl?.replace(/\/+$/, "") ?? "";
  const weekPath = options.weekPath ?? "";
  const canonicalUrl = baseUrl && weekPath ? `${baseUrl}/${weekPath}/` : undefined;
  const ogImageUrl = baseUrl && weekPath ? `${baseUrl}/${weekPath}/og.png` : "og.png";

  const siteTitle = (options.siteTitle ?? "Dev\nPulse").replace(/\\n/g, "\n");
  const siteTitleInline = siteTitle.replace(/\n/g, " ");

  return template({
    ...data,
    dailyCommits: computeHeatmapLevels(data.dailyCommits),
    css: theme.buildCSS(language),
    lang: language,
    i18n: locale,
    baseUrl,
    canonicalUrl,
    ogImageUrl,
    siteTitle,
    siteTitleInline,
    themeColor: theme.colors.bg,
    themeInitScript: theme.themeInitScript ?? "",
    themeToggleScript: theme.themeToggleScript ?? "",
    prevWeek: options.prevWeek,
    nextWeek: options.nextWeek,
  });
};
