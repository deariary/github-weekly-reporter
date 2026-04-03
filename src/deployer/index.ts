// Prepare report files for deployment (file I/O only, no git operations)

import { writeFile, readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getWeekId, type WeekId } from "./week.js";
import { renderIndexPage } from "./index-page.js";
import type { Theme } from "../types.js";

export type PrepareOptions = {
  outputDir: string;
  reportHtml: string;
  theme?: Theme;
};

export type PrepareResult = {
  weekId: WeekId;
  reportPath: string;
  indexPath: string;
};

const listReportDirs = async (dir: string): Promise<string[]> => {
  const paths: string[] = [];

  let years: string[] = [];
  try {
    years = await readdir(dir);
  } catch {
    return paths;
  }

  for (const year of years.filter((name) => /^\d{4}$/.test(name))) {
    const weeks = await readdir(join(dir, year));
    weeks
      .filter((name) => /^W\d{2}$/.test(name))
      .forEach((w) => paths.push(`${year}/${w}`));
  }

  return paths;
};

export const prepareDeployment = async (options: PrepareOptions): Promise<PrepareResult> => {
  const { outputDir, reportHtml, theme = "default" } = options;
  const weekId = getWeekId();

  // Write report to weekly directory
  const reportDir = join(outputDir, weekId.path);
  await mkdir(reportDir, { recursive: true });
  const reportPath = join(reportDir, "index.html");
  await writeFile(reportPath, reportHtml, "utf-8");

  // Build index page from all existing report directories
  const allReports = await listReportDirs(outputDir);
  if (!allReports.includes(weekId.path)) allReports.push(weekId.path);
  const indexHtml = renderIndexPage(allReports, theme);
  const indexPath = join(outputDir, "index.html");
  await writeFile(indexPath, indexHtml, "utf-8");

  return { weekId, reportPath, indexPath };
};
