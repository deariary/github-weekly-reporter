// Generate the index.html that lists all archived reports

import Handlebars from "handlebars";
import type { Theme } from "../types.js";
import { buildCSS } from "../renderer/themes.js";

export type IndexPageData = {
  username?: string;
  avatarUrl?: string;
};

export type ReportEntry = {
  path: string;
  week: string;
  title?: string;
  dateLabel: string;
};

const TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Weekly Reports{{#if username}} — {{username}}{{/if}}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Archive of weekly GitHub activity reports" />
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
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8125rem;
      color: {{tertiaryColor}};
    }

    .index-title {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 3rem;
    }

    .week-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .week-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-radius: 10px;
      text-decoration: none;
      color: inherit;
      border: 1px solid {{borderColor}};
      background: {{cardBg}};
      transition: all 0.2s;
    }
    .week-item:hover {
      border-color: {{borderHoverColor}};
      background: {{cardHoverBg}};
    }
    .week-item-left {
      display: flex;
      align-items: baseline;
      gap: 1rem;
      min-width: 0;
    }
    .week-item-week {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      font-weight: 600;
      color: {{accentColor}};
      flex-shrink: 0;
    }
    .week-item-content { min-width: 0; }
    .week-item-title {
      font-size: 1rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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

  <h1 class="index-title">Weekly Reports</h1>

  <div class="week-list">
    {{#each reports}}
    <a href="{{this.path}}/" class="week-item">
      <div class="week-item-left">
        <span class="week-item-week">{{this.week}}</span>
        <div class="week-item-content">
          <div class="week-item-title">{{#if this.title}}{{this.title}}{{else}}{{this.dateLabel}}{{/if}}</div>
          <span class="week-item-date">{{this.dateLabel}}</span>
        </div>
      </div>
    </a>
    {{/each}}
  </div>

</div>

<footer class="footer">
  Powered by <a href="https://deariary.com?utm_source=github-weekly-reporter&utm_medium=footer">deariary</a>
  &nbsp;&middot;&nbsp;
  <a href="https://github.com/deariary/github-weekly-reporter">github-weekly-reporter</a>
</footer>

</body>
</html>`;

const weekToDateLabel = (path: string): string => {
  const [year, week] = path.split("/");
  return `${year} ${week}`;
};

export const renderIndexPage = (
  reports: ReportEntry[],
  theme: Theme = "default",
  pageData?: IndexPageData,
): string => {
  // Inline theme-specific colors for index page styles
  const isDark = theme === "dark";
  const template = Handlebars.compile(TEMPLATE);
  return template({
    reports: [...reports].sort((a, b) => b.path.localeCompare(a.path)),
    css: buildCSS(theme),
    username: pageData?.username,
    avatarUrl: pageData?.avatarUrl,
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "#d0d7de",
    borderHoverColor: isDark ? "rgba(255,255,255,0.12)" : "#8b949e",
    cardBg: isDark ? "rgba(255,255,255,0.02)" : "#f6f8fa",
    cardHoverBg: isDark ? "rgba(255,255,255,0.05)" : "#eef1f5",
    tertiaryColor: isDark ? "rgba(255,255,255,0.3)" : "#8b949e",
    accentColor: isDark ? "#39d353" : "#0969da",
  });
};

export const buildReportEntry = (path: string, title?: string): ReportEntry => ({
  path,
  week: path.split("/")[1] ?? path,
  title,
  dateLabel: weekToDateLabel(path),
});
