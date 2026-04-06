// Generate the index.html that lists all archived reports

import Handlebars from "handlebars";
import type { Language, Theme, UserProfile } from "../types.js";
import { getLocale, getFontConfig } from "../i18n/index.js";
import { loadTheme, readThemeTemplate } from "../renderer/themes/index.js";

export type IndexPageData = {
  username?: string;
  avatarUrl?: string;
  profile?: UserProfile;
};

export type ReportEntryStats = {
  commits: number;
  prs: number;
  reviews: number;
};

export type ReportEntry = {
  path: string;
  week: string;
  year: string;
  title?: string;
  subtitle?: string;
  overview?: string; // LLM-generated multi-paragraph overview text
  dateLabel: string;
  dateTo?: string; // ISO date (YYYY-MM-DD) of the week's last day
  stats?: ReportEntryStats;
};

type YearGroup = {
  year: string;
  reports: ReportEntry[];
};

const weekToDateLabel = (path: string): string => {
  const [year, week] = path.split("/");
  return `${year} ${week}`;
};

const groupByYear = (reports: ReportEntry[]): YearGroup[] => {
  const sorted = [...reports].sort((a, b) => b.path.localeCompare(a.path));
  const groups = new Map<string, ReportEntry[]>();

  sorted.forEach((r) => {
    const existing = groups.get(r.year) ?? [];
    existing.push(r);
    groups.set(r.year, existing);
  });

  return [...groups.entries()].map(([year, reps]) => ({ year, reports: reps }));
};

export const renderIndexPage = (
  reports: ReportEntry[],
  pageData?: IndexPageData,
  language: Language = "en",
  siteTitle?: string,
  baseUrl?: string,
  themeName: Theme = "brutalist",
): string => {
  const locale = getLocale(language);
  const fontConfig = getFontConfig(language);
  const theme = loadTheme(themeName);
  const resolvedSiteTitle = (siteTitle ?? "Dev\nPulse").replace(/\\n/g, "\n");
  const siteTitleInline = resolvedSiteTitle.replace(/\n/g, " ");
  const username = pageData?.username ?? "";
  const description = `Weekly reports by @${username}`;
  const ogImageUrl = baseUrl ? `${baseUrl}/og.png` : "og.png";
  const indexTemplate = readThemeTemplate(theme, "index-page.hbs");
  const template = Handlebars.compile(indexTemplate);
  return template({
    yearGroups: groupByYear(reports),
    css: theme.buildCSS(language),
    indexCss: theme.buildIndexCSS(language),
    username,
    avatarUrl: pageData?.avatarUrl,
    profile: pageData?.profile,
    displayName: pageData?.profile?.name ?? username,
    siteTitle: resolvedSiteTitle,
    siteTitleInline,
    description,
    ogImageUrl,
    baseUrl,
    lang: language,
    weeklyReports: locale.weeklyReports,
    poweredBy: locale.poweredBy,
    generatedWith: locale.generatedWith,
    monoFamily: fontConfig.monoFamily,
    accentColor: theme.colors.accent,
    themeInitScript: theme.themeInitScript ?? "",
    themeToggleScript: theme.themeToggleScript ?? "",
  });
};

export const buildReportEntry = (
  path: string,
  title?: string,
  subtitle?: string,
  stats?: ReportEntryStats,
  dateTo?: string,
  overview?: string,
): ReportEntry => ({
  path,
  week: path.split("/")[1] ?? path,
  year: path.split("/")[0] ?? "",
  title,
  subtitle,
  overview,
  dateLabel: weekToDateLabel(path),
  dateTo,
  stats,
});
