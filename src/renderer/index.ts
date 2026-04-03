// Main report renderer: compiles Handlebars templates into a self-contained HTML file

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import type { WeeklyReportData, Theme } from "../types.js";
import { buildCSS } from "./themes.js";
import { registerHelpers } from "./helpers.js";

const getCurrentDir = (): string => {
  try {
    return dirname(fileURLToPath(import.meta.url));
  } catch {
    // CJS bundle fallback
    return __dirname;
  }
};

const resolveTemplatesDir = (): string => {
  const currentDir = getCurrentDir();
  const candidates = [
    join(currentDir, "..", "..", "src", "renderer", "templates"), // dev (src/)
    join(currentDir, "..", "templates"),                          // bundle
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("Templates directory not found");
  return found;
};

const TEMPLATES_DIR = resolveTemplatesDir();

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
