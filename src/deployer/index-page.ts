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
    /* HERO */
    .hero {
      position: relative;
      background: linear-gradient(135deg, {{heroGradientFrom}}, {{heroGradientTo}});
      padding: 7rem 2rem 3.5rem;
      margin-bottom: 3rem;
      overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute;
      top: -50%; right: -20%;
      width: 600px; height: 600px;
      border-radius: 50%;
      background: {{accentColor}}12;
      filter: blur(80px);
    }
    .hero-inner {
      max-width: 720px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }
    .hero-profile {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 2rem;
      text-decoration: none;
      color: inherit;
    }
    .hero-avatar {
      width: 72px; height: 72px;
      border-radius: 50%;
      border: 3px solid {{accentColor}}40;
      box-shadow: 0 0 30px {{accentColor}}25, 0 0 60px {{accentColor}}10;
      transition: all 0.4s ease;
    }
    .hero-profile:hover .hero-avatar {
      box-shadow: 0 0 40px {{accentColor}}40, 0 0 80px {{accentColor}}20;
      transform: scale(1.05);
    }
    .hero-name {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      transition: color 0.2s;
    }
    .hero-profile:hover .hero-name { color: {{accentColor}}; }
    .hero-handle {
      font-size: 0.875rem;
      color: {{heroHandleColor}};
      margin-top: 0.25rem;
    }
    .hero-title {
      font-size: clamp(2rem, 5vw, 2.75rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.15;
    }

    /* NAV */
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

    /* CONTENT */
    .index-content { max-width: 720px; margin: 0 auto; padding: 0 2rem 4rem; }

    .year-group { margin-bottom: 3rem; }
    .year-label {
      font-family: {{monoFamily}};
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: {{tertiaryColor}};
      margin-bottom: 1rem;
      padding-left: 0.25rem;
    }

    .week-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .week-item {
      display: block;
      padding: 1.5rem 1.75rem;
      border-radius: 12px;
      text-decoration: none;
      color: inherit;
      border: 1px solid {{borderColor}};
      background: {{cardBg}};
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    .week-item::before {
      content: '';
      position: absolute;
      top: 0; left: 0;
      width: 3px; height: 100%;
      background: {{accentColor}};
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .week-item:hover {
      border-color: {{accentColor}}60;
      box-shadow: 0 4px 24px {{accentColor}}12;
      transform: translateY(-2px);
    }
    .week-item:hover::before { opacity: 1; }

    .week-item-header {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }
    .week-item-week {
      font-family: {{monoFamily}};
      font-size: 0.75rem;
      font-weight: 700;
      color: {{accentColor}};
      background: {{accentColor}}12;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .week-item-date {
      font-family: {{monoFamily}};
      font-size: 0.6875rem;
      color: {{tertiaryColor}};
    }

    .week-item-title {
      font-size: 1.125rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      margin-bottom: 0.375rem;
    }
    .week-item-subtitle {
      font-size: 0.875rem;
      color: {{secondaryColor}};
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .week-item-stats {
      display: flex;
      gap: 1.25rem;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid {{borderColor}};
      font-family: {{monoFamily}};
      font-size: 0.6875rem;
      color: {{tertiaryColor}};
    }
    .week-item-stat-value { font-weight: 700; margin-right: 0.25rem; }
    .stat-commits .week-item-stat-value { color: {{greenColor}}; }
    .stat-prs .week-item-stat-value { color: {{prColor}}; }
    .stat-reviews .week-item-stat-value { color: {{reviewColor}}; }

    @media (max-width: 600px) {
      .hero { padding: 5.5rem 1.25rem 2.5rem; }
      .hero-profile { gap: 1rem; }
      .hero-avatar { width: 56px; height: 56px; }
      .hero-name { font-size: 1.25rem; }
      .index-nav-inner { padding: 0.75rem 1.25rem; }
      .index-content { padding: 0 1.25rem 3rem; }
      .week-item { padding: 1.25rem; }
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

<section class="hero">
  <div class="hero-inner">
    {{#if username}}
    <a href="https://github.com/{{username}}" class="hero-profile" target="_blank" rel="noopener nofollow">
      {{#if avatarUrl}}<img src="{{avatarUrl}}" alt="{{username}}" class="hero-avatar" width="72" height="72" loading="lazy" />{{/if}}
      <div>
        <div class="hero-name">{{username}}</div>
        <div class="hero-handle">github.com/{{username}}</div>
      </div>
    </a>
    {{/if}}
    <h1 class="hero-title">{{weeklyReports}}</h1>
  </div>
</section>

<div class="index-content">
  {{#each yearGroups}}
  <div class="year-group">
    <div class="year-label">{{this.year}}</div>
    <div class="week-list">
      {{#each this.reports}}
      <a href="{{this.path}}/" class="week-item">
        <div class="week-item-header">
          <span class="week-item-week">{{this.week}}</span>
          <span class="week-item-date">{{this.dateLabel}}</span>
        </div>
        <div class="week-item-title">{{#if this.title}}{{this.title}}{{else}}Week {{this.week}}{{/if}}</div>
        {{#if this.subtitle}}<div class="week-item-subtitle">{{this.subtitle}}</div>{{/if}}
        {{#if this.stats}}
        <div class="week-item-stats">
          <span class="week-item-stat stat-commits"><span class="week-item-stat-value">{{this.stats.commits}}</span>commits</span>
          <span class="week-item-stat stat-prs"><span class="week-item-stat-value">{{this.stats.prs}}</span>PRs</span>
          <span class="week-item-stat stat-reviews"><span class="week-item-stat-value">{{this.stats.reviews}}</span>reviews</span>
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
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e8ebef",
    cardBg: isDark ? "rgba(255,255,255,0.02)" : "#ffffff",
    tertiaryColor: isDark ? "rgba(255,255,255,0.3)" : "#8b949e",
    secondaryColor: isDark ? "rgba(255,255,255,0.65)" : "#656d76",
    accentColor: isDark ? "#39d353" : "#0969da",
    greenColor: isDark ? "#3fb950" : "#1a7f37",
    prColor: isDark ? "#8957e5" : "#8250df",
    reviewColor: isDark ? "#58a6ff" : "#0969da",
    heroGradientFrom: isDark ? "#050505" : "#f6f8fa",
    heroGradientTo: isDark ? "#0d1117" : "#ffffff",
    heroHandleColor: isDark ? "rgba(255,255,255,0.4)" : "#656d76",
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
