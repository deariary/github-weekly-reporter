// Main report renderer: assembles a self-contained HTML file

import type { WeeklyReportData, Theme } from "../types.js";
import { buildCSS } from "./themes.js";
import {
  renderHeader,
  renderStats,
  renderHeatmap,
  renderLanguages,
  renderRepositories,
  renderNarrative,
  renderFooter,
} from "./html-parts.js";

const escape = (str: string): string =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildMetaTags = (data: WeeklyReportData): string => {
  const title = `${data.username}'s Weekly Report (${data.dateRange.from} - ${data.dateRange.to})`;
  const description = `GitHub activity report: ${data.stats.totalCommits} commits, ${data.stats.prsOpened} PRs, ${data.stats.issuesOpened} issues`;

  return `
    <title>${escape(title)}</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${escape(description)}" />
    <meta property="og:title" content="${escape(title)}" />
    <meta property="og:description" content="${escape(description)}" />
    <meta property="og:image" content="${escape(data.avatarUrl)}" />
    <meta property="og:type" content="website" />
  `;
};

export const renderReport = (
  data: WeeklyReportData,
  theme: Theme = "default",
): string => {
  const css = buildCSS(theme);
  const meta = buildMetaTags(data);

  const body = [
    renderHeader(data),
    renderStats(data),
    renderHeatmap(data.dailyCommits),
    renderLanguages(data.languages),
    renderRepositories(data.repositories),
    renderNarrative(data.aiNarrative),
    renderFooter(),
  ].join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
${meta}
<style>${css}</style>
</head>
<body>
<div class="container">
${body}
</div>
</body>
</html>`;
};
