// Internationalization: locale strings and date formatting

import type { Language } from "../types.js";

// Static strings that can be used directly in templates
export type LocaleStrings = {
  weekdaysShort: string[];
  sectionSummary: string;
  sectionHighlights: string;
  allWeeks: string;
  poweredBy: string;
  weeklyReports: string;
  weeklyReport: string;
};

// Dynamic strings that require arguments (registered as Handlebars helpers)
export type LocaleFormatters = {
  sectionsCount: (n: number) => string;
  itemsCount: (n: number) => string;
  userWeek: (username: string) => string;
};

export type Locale = LocaleStrings & LocaleFormatters;

const en: Locale = {
  weekdaysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  sectionSummary: "Summary",
  sectionHighlights: "Highlights",
  allWeeks: "All weeks",
  poweredBy: "Powered by",
  weeklyReports: "Weekly Reports",
  weeklyReport: "Weekly Report",
  sectionsCount: (n) => `${n} sections`,
  itemsCount: (n) => `${n} items`,
  userWeek: (username) => `${username}'s Week`,
};

const ja: Locale = {
  weekdaysShort: ["日", "月", "火", "水", "木", "金", "土"],
  sectionSummary: "サマリー",
  sectionHighlights: "ハイライト",
  allWeeks: "すべての週",
  poweredBy: "Powered by",
  weeklyReports: "ウィークリーレポート",
  weeklyReport: "ウィークリーレポート",
  sectionsCount: (n) => `${n} セクション`,
  itemsCount: (n) => `${n} 件`,
  userWeek: (username) => `${username} の一週間`,
};

const locales: Record<Language, Locale> = { en, ja };

export const getLocale = (language: Language): Locale =>
  locales[language] ?? locales.en;

// Format a date string (YYYY-MM-DD) for display, respecting locale and timezone
export const formatDate = (
  dateStr: string,
  language: Language,
  timezone: string = "UTC",
): string => {
  const date = new Date(dateStr + "T12:00:00Z");
  return date.toLocaleDateString(language === "ja" ? "ja-JP" : "en-US", {
    timeZone: timezone,
    year: "numeric",
    month: language === "ja" ? "numeric" : "short",
    day: "numeric",
  });
};

// Format number with locale grouping
export const formatNumber = (n: number, language: Language): string =>
  n.toLocaleString(language === "ja" ? "ja-JP" : "en-US");

// Language instruction for LLM prompt
export const llmLanguageInstruction = (language: Language): string | null => {
  const instructions: Record<Language, string | null> = {
    en: null,
    ja: "IMPORTANT: Write ALL text content in Japanese. Title, subtitle, overview, summaries, and highlights must all be written in natural Japanese.",
  };
  return instructions[language] ?? null;
};
