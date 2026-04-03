// Generate the index.html that lists all archived reports

import Handlebars from "handlebars";
import type { Theme } from "../types.js";
import { buildCSS } from "../renderer/themes.js";

export type IndexPageData = {
  username: string;
  avatarUrl: string;
};

type ReportEntry = {
  path: string;
  week: string;
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
</head>
<body>

<div class="page" style="padding-top: 4rem;">

  {{#if username}}
  <div style="display:flex;align-items:center;gap:1.25rem;margin-bottom:4rem;">
    {{#if avatarUrl}}<img src="{{avatarUrl}}" alt="" style="width:56px;height:56px;border-radius:50%;" />{{/if}}
    <div>
      <div style="font-size:1.25rem;font-weight:600;">{{username}}</div>
    </div>
  </div>
  {{/if}}

  <h1 style="font-size:2rem;font-weight:700;letter-spacing:-0.02em;margin-bottom:3rem;">Weekly Reports</h1>

  <div style="display:flex;flex-direction:column;gap:0.5rem;">
    {{#each reports}}
    <a href="{{this.path}}/" style="display:flex;justify-content:space-between;align-items:center;padding:1.25rem 1.5rem;border-radius:10px;text-decoration:none;color:inherit;border:1px solid;transition:all 0.2s;" class="week-item">
      <div style="display:flex;align-items:baseline;gap:1rem;">
        <span style="font-family:'JetBrains Mono',monospace;font-size:0.875rem;font-weight:600;" class="week-accent">{{this.week}}</span>
        <div>
          <div style="font-size:1rem;font-weight:500;">{{this.dateLabel}}</div>
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
  // path is like "2026/W14"
  const [year, week] = path.split("/");
  return `${year} ${week}`;
};

export const renderIndexPage = (
  reportPaths: string[],
  theme: Theme = "default",
  pageData?: IndexPageData,
): string => {
  const reports: ReportEntry[] = reportPaths
    .sort()
    .reverse()
    .map((p) => ({
      path: p,
      week: p.split("/")[1] ?? p,
      dateLabel: weekToDateLabel(p),
    }));

  const template = Handlebars.compile(TEMPLATE);
  return template({
    reports,
    css: buildCSS(theme),
    username: pageData?.username,
    avatarUrl: pageData?.avatarUrl,
  });
};
