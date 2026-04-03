// Generate the index.html that lists all archived reports

import Handlebars from "handlebars";
import type { Theme, Language } from "../types.js";
import { getLocale, getFontConfig } from "../i18n/index.js";
import { buildCSS } from "../renderer/themes.js";

export type IndexPageData = {
  username?: string;
  avatarUrl?: string;
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
  dateLabel: string;
  stats?: ReportEntryStats;
};

type YearGroup = {
  year: string;
  reports: ReportEntry[];
};

const TEMPLATE = `<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <title>{{siteTitle}}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="{{siteTitle}}" />
  <meta name="view-transition" content="same-origin" />
  <style>{{{css}}}</style>
  <style>
    /* INDEX NAV (matches report nav) */
    .index-nav {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      background: {{bgColor}}dd;
      backdrop-filter: blur(12px);
      border-bottom: 1px solid {{borderColor}};
    }
    .index-nav-inner {
      max-width: 720px;
      margin: 0 auto;
      padding: 0.75rem 2rem;
      display: flex;
      align-items: center;
      min-height: 56px;
    }
    .index-nav .nav-site-title {
      font-size: 0.875rem;
      font-weight: 600;
    }

    .index-page { max-width: 720px; margin: 0 auto; padding: 6rem 2rem 4rem; }

    /* AUTHOR */
    .author {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2.5rem;
      text-decoration: none;
      color: inherit;
    }
    .author:hover .author-name { color: {{accentColor}}; }
    .author img {
      width: 48px; height: 48px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .author-info { min-width: 0; }
    .author-name {
      font-size: 1.125rem;
      font-weight: 600;
      transition: color 0.2s;
    }
    .author-handle {
      font-size: 0.8125rem;
      color: {{tertiaryColor}};
    }

    .index-title {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 3rem;
    }

    .year-group { margin-bottom: 2.5rem; }
    .year-label {
      font-family: {{monoFamily}};
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: {{tertiaryColor}};
      margin-bottom: 1rem;
    }

    .week-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .week-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-radius: 10px;
      text-decoration: none;
      color: inherit;
      border: 1px solid {{borderColor}};
      background: {{cardBg}};
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    .week-item::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 10px;
      opacity: 0;
      transition: opacity 0.3s ease;
      background: linear-gradient(135deg, {{accentColor}}08, transparent 60%);
    }
    .week-item:hover {
      border-color: {{accentColor}};
      transform: translateX(4px);
      box-shadow: 0 0 20px {{accentColor}}15;
    }
    .week-item:hover::after { opacity: 1; }
    .week-item-left {
      display: flex;
      align-items: baseline;
      gap: 1rem;
      min-width: 0;
      flex: 1;
      position: relative;
      z-index: 1;
    }
    .week-item-week {
      font-family: {{monoFamily}};
      font-size: 0.875rem;
      font-weight: 600;
      color: {{accentColor}};
      flex-shrink: 0;
    }
    .week-item-content { min-width: 0; flex: 1; }
    .week-item-title {
      font-size: 1rem;
      font-weight: 500;
    }
    .week-item-subtitle {
      font-size: 0.8125rem;
      color: {{secondaryColor}};
      margin-top: 0.25rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .week-item-date {
      font-size: 0.8125rem;
      color: {{tertiaryColor}};
      display: block;
      margin-top: 0.25rem;
    }
    .week-item-stats {
      display: flex;
      gap: 1rem;
      font-family: {{monoFamily}};
      font-size: 0.6875rem;
      color: {{tertiaryColor}};
      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }
    .week-item-stat { white-space: nowrap; }
    .week-item-stat-value { font-weight: 600; }
    .stat-commits .week-item-stat-value { color: {{greenColor}}; }
    .stat-prs .week-item-stat-value { color: {{prColor}}; }
    .stat-reviews .week-item-stat-value { color: {{reviewColor}}; }

    @media (max-width: 600px) {
      .index-nav-inner { padding: 1rem 1.25rem; }
      .index-page { padding: 5rem 1.25rem 3rem; }
      .author img { width: 40px; height: 40px; }
      .week-item { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
      .week-item-stats { gap: 0.75rem; }
    }
  </style>
</head>
<body>

<nav class="index-nav">
  <div class="index-nav-inner">
    <span class="nav-site-title">{{siteTitle}}</span>
  </div>
</nav>

<div class="index-page">

  {{#if username}}
  <a href="https://github.com/{{username}}" class="author" target="_blank" rel="noopener nofollow">
    {{#if avatarUrl}}<img src="{{avatarUrl}}" alt="{{username}}" width="48" height="48" loading="lazy" />{{/if}}
    <div class="author-info">
      <div class="author-name">{{username}}</div>
      <div class="author-handle">github.com/{{username}}</div>
    </div>
  </a>
  {{/if}}

  <h1 class="index-title">{{weeklyReports}}</h1>

  {{#each yearGroups}}
  <div class="year-group">
    <div class="year-label">{{this.year}}</div>
    <div class="week-list">
      {{#each this.reports}}
      <a href="{{this.path}}/" class="week-item">
        <div class="week-item-left">
          <span class="week-item-week">{{this.week}}</span>
          <div class="week-item-content">
            <div class="week-item-title">{{#if this.title}}{{this.title}}{{else}}Week {{this.week}}{{/if}}</div>
            {{#if this.subtitle}}<div class="week-item-subtitle">{{this.subtitle}}</div>{{/if}}
            <span class="week-item-date">{{this.dateLabel}}</span>
          </div>
        </div>
        {{#if this.stats}}
        <div class="week-item-stats">
          <span class="week-item-stat stat-commits"><span class="week-item-stat-value">{{this.stats.commits}}</span> commits</span>
          <span class="week-item-stat stat-prs"><span class="week-item-stat-value">{{this.stats.prs}}</span> PRs</span>
          <span class="week-item-stat stat-reviews"><span class="week-item-stat-value">{{this.stats.reviews}}</span> reviews</span>
        </div>
        {{/if}}
      </a>
      {{/each}}
    </div>
  </div>
  {{/each}}

</div>

<footer class="footer">
  {{poweredBy}} <a href="https://deariary.com?utm_source=github-weekly-reporter&utm_medium=footer" target="_blank" rel="noopener">deariary</a>
  &nbsp;&middot;&nbsp;
  {{generatedWith}} <a href="https://github.com/deariary/github-weekly-reporter" target="_blank" rel="noopener">github-weekly-reporter</a>
</footer>

</body>
</html>`;

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
  theme: Theme = "default",
  pageData?: IndexPageData,
  language: Language = "en",
  siteTitle?: string,
): string => {
  const isDark = theme === "dark";
  const locale = getLocale(language);
  const fontConfig = getFontConfig(language);
  const resolvedSiteTitle = siteTitle ?? (pageData?.username ? `${pageData.username}'s ${locale.weeklyReports}` : locale.weeklyReports);
  const template = Handlebars.compile(TEMPLATE);
  return template({
    yearGroups: groupByYear(reports),
    css: buildCSS(theme, language),
    username: pageData?.username,
    avatarUrl: pageData?.avatarUrl,
    siteTitle: resolvedSiteTitle,
    lang: language,
    weeklyReports: locale.weeklyReports,
    poweredBy: locale.poweredBy,
    generatedWith: locale.generatedWith,
    monoFamily: fontConfig.monoFamily,
    bgColor: isDark ? "#050505" : "#ffffff",
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "#d0d7de",
    cardBg: isDark ? "rgba(255,255,255,0.02)" : "#f6f8fa",
    tertiaryColor: isDark ? "rgba(255,255,255,0.3)" : "#8b949e",
    secondaryColor: isDark ? "rgba(255,255,255,0.65)" : "#656d76",
    accentColor: isDark ? "#39d353" : "#0969da",
    greenColor: isDark ? "#3fb950" : "#1a7f37",
    prColor: isDark ? "#8957e5" : "#8250df",
    reviewColor: isDark ? "#58a6ff" : "#0969da",
  });
};

export const buildReportEntry = (
  path: string,
  title?: string,
  subtitle?: string,
  stats?: ReportEntryStats,
): ReportEntry => ({
  path,
  week: path.split("/")[1] ?? path,
  year: path.split("/")[0] ?? "",
  title,
  subtitle,
  dateLabel: weekToDateLabel(path),
  stats,
});
