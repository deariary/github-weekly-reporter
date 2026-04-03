// Generate the index.html that lists all archived reports

import Handlebars from "handlebars";
import type { Theme, Language } from "../types.js";
import { getLocale, getFontConfig } from "../i18n/index.js";
import { buildCSS } from "../renderer/themes.js";

export type IndexPageData = {
  username?: string;
  avatarUrl?: string;
};

export type ReportEntry = {
  path: string;
  week: string;
  year: string;
  title?: string;
  dateLabel: string;
};

type YearGroup = {
  year: string;
  reports: ReportEntry[];
};

const TEMPLATE = `<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <title>{{weeklyReports}}{{#if username}} - {{username}}{{/if}}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Archive of weekly GitHub activity reports" />
  <meta name="view-transition" content="same-origin" />
  <style>{{{css}}}</style>
  <style>
    .index-page { max-width: 720px; margin: 0 auto; padding: 4rem 2rem 6rem; }

    .profile {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      margin-bottom: 4rem;
    }
    .profile img {
      width: 56px; height: 56px;
      border-radius: 50%;
      border: 2px solid {{borderColor}};
    }
    .profile-name { font-size: 1.25rem; font-weight: 600; }
    .profile-handle {
      font-family: {{monoFamily}};
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
    .week-item-content { min-width: 0; }
    .week-item-title {
      font-size: 1rem;
      font-weight: 500;
    }
    .week-item-date {
      font-size: 0.8125rem;
      color: {{tertiaryColor}};
      display: block;
      margin-top: 0.125rem;
    }
  </style>
</head>
<body>

<div class="index-page">

  {{#if username}}
  <div class="profile">
    {{#if avatarUrl}}<img src="{{avatarUrl}}" alt="{{username}}" />{{/if}}
    <div>
      <div class="profile-name">{{username}}</div>
      <div class="profile-handle">@{{username}}</div>
    </div>
  </div>
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
            <span class="week-item-date">{{this.dateLabel}}</span>
          </div>
        </div>
      </a>
      {{/each}}
    </div>
  </div>
  {{/each}}

</div>

<footer class="footer">
  {{poweredBy}} <a href="https://deariary.com?utm_source=github-weekly-reporter&utm_medium=footer" target="_blank" rel="noopener">deariary</a>
  &nbsp;&middot;&nbsp;
  <a href="https://github.com/deariary/github-weekly-reporter" target="_blank" rel="noopener">github-weekly-reporter</a>
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
): string => {
  const isDark = theme === "dark";
  const locale = getLocale(language);
  const fontConfig = getFontConfig(language);
  const template = Handlebars.compile(TEMPLATE);
  return template({
    yearGroups: groupByYear(reports),
    css: buildCSS(theme, language),
    username: pageData?.username,
    avatarUrl: pageData?.avatarUrl,
    lang: language,
    weeklyReports: locale.weeklyReports,
    poweredBy: locale.poweredBy,
    monoFamily: fontConfig.monoFamily,
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "#d0d7de",
    borderHoverColor: isDark ? "rgba(255,255,255,0.12)" : "#8b949e",
    cardBg: isDark ? "rgba(255,255,255,0.02)" : "#f6f8fa",
    tertiaryColor: isDark ? "rgba(255,255,255,0.3)" : "#8b949e",
    accentColor: isDark ? "#39d353" : "#0969da",
  });
};

export const buildReportEntry = (path: string, title?: string): ReportEntry => ({
  path,
  week: path.split("/")[1] ?? path,
  year: path.split("/")[0] ?? "",
  title,
  dateLabel: weekToDateLabel(path),
});
