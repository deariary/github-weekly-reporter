// Main report renderer: compiles Handlebars templates into a self-contained HTML file

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import type { WeeklyReportData, Theme, DailyCommitCount } from "../types.js";
import { buildCSS } from "./themes.js";
import { registerHelpers } from "./helpers.js";

// Templates live at src/renderer/templates/ (both dev and npm package)
const TEMPLATES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "src", "renderer", "templates",
);

const readTemplate = (path: string): string =>
  readFileSync(join(TEMPLATES_DIR, path), "utf-8");

const PARTIAL_NAMES = [
  "header",
  "overview",
  "summaries",
  "highlights",
  "footer",
] as const;

type DailyCommitWithLevel = DailyCommitCount & { level: number };

const computeHeatmapLevels = (dailyCommits: DailyCommitCount[]): DailyCommitWithLevel[] => {
  const max = Math.max(...dailyCommits.map((d) => d.count), 1);
  return dailyCommits.map((d) => {
    if (d.count === 0) return { ...d, level: 0 };
    const ratio = d.count / max;
    if (ratio <= 0.25) return { ...d, level: 1 };
    if (ratio <= 0.5) return { ...d, level: 2 };
    if (ratio <= 0.75) return { ...d, level: 3 };
    return { ...d, level: 4 };
  });
};

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
    dailyCommits: computeHeatmapLevels(data.dailyCommits),
    css: buildCSS(theme),
  });
};
