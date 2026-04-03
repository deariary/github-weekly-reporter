// Main report renderer: compiles Handlebars templates into a self-contained HTML file

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import type { WeeklyReportData, Theme } from "../types.js";
import { buildCSS } from "./themes.js";
import { registerHelpers } from "./helpers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "..", "..", "src", "renderer", "templates");

const readTemplate = (path: string): string =>
  readFileSync(join(TEMPLATES_DIR, path), "utf-8");

const PARTIAL_NAMES = [
  "header",
  "stats",
  "heatmap",
  "languages",
  "repositories",
  "narrative",
  "footer",
] as const;

const buildStatCards = (data: WeeklyReportData) => [
  { value: data.stats.totalCommits, label: "Commits" },
  { value: data.stats.prsOpened, label: "PRs Opened" },
  { value: data.stats.prsMerged, label: "PRs Merged" },
  { value: data.stats.prsReviewed, label: "Reviews" },
  { value: data.stats.issuesOpened, label: "Issues Opened" },
  { value: data.stats.issuesClosed, label: "Issues Closed" },
];

const createInstance = (): typeof Handlebars => {
  const hbs = Handlebars.create();
  registerHelpers(hbs);

  PARTIAL_NAMES.forEach((name) => {
    hbs.registerPartial(name, readTemplate(`partials/${name}.hbs`));
  });

  return hbs;
};

export const renderReport = (
  data: WeeklyReportData,
  theme: Theme = "default",
): string => {
  const hbs = createInstance();
  const template = hbs.compile(readTemplate("report.hbs"));

  return template({
    ...data,
    css: buildCSS(theme),
    statCards: buildStatCards(data),
  });
};
