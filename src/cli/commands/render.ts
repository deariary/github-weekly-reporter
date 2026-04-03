// render command: read github-data.yaml + llm-data.yaml and produce HTML

import { Command } from "commander";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { renderReport } from "../../renderer/index.js";
import { renderIndexPage, buildReportEntry, type ReportEntry } from "../../deployer/index-page.js";
import { getWeekId } from "../../deployer/week.js";
import type { WeeklyReportData, AIContent, Theme, Language } from "../../types.js";

const env = (key: string): string | undefined => process.env[key];

type RenderOptions = {
  output: string;
  theme: Theme;
  language: Language;
  timezone: string;
  date?: Date;
};

const listReportDirs = async (dir: string): Promise<string[]> => {
  const paths: string[] = [];
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return paths;
  }
  for (const year of entries.filter((n) => /^\d{4}$/.test(n))) {
    const weeks = await readdir(join(dir, year));
    weeks
      .filter((n) => /^W\d{2}$/.test(n))
      .forEach((w) => paths.push(`${year}/${w}`));
  }
  return paths;
};

const tryReadYaml = async <T>(path: string): Promise<T | null> => {
  try {
    const raw = await readFile(path, "utf-8");
    return parseYaml(raw) as T;
  } catch {
    return null;
  }
};

const buildReportEntries = async (
  outputDir: string,
  reportPaths: string[],
): Promise<ReportEntry[]> =>
  Promise.all(
    reportPaths.map(async (path) => {
      const llmData = await tryReadYaml<AIContent>(join(outputDir, path, "llm-data.yaml"));
      return buildReportEntry(path, llmData?.title);
    }),
  );

const run = async (options: RenderOptions): Promise<void> => {
  const weekId = getWeekId(options.date, options.timezone);
  const reportDir = join(options.output, weekId.path);

  const githubDataPath = join(reportDir, "github-data.yaml");
  console.log(`Reading ${githubDataPath}...`);
  const githubData = await tryReadYaml<WeeklyReportData>(githubDataPath);
  if (!githubData) {
    console.error(`GitHub data not found at ${githubDataPath}. Run 'fetch' first.`);
    process.exit(1);
  }

  const llmDataPath = join(reportDir, "llm-data.yaml");
  const aiContent = await tryReadYaml<AIContent>(llmDataPath);
  if (aiContent) {
    console.log("Loaded LLM data.");
  } else {
    console.log("No LLM data found. Rendering without AI content.");
  }

  const data: WeeklyReportData = { ...githubData, aiContent };

  console.log(`Rendering report (theme: ${options.theme}, lang: ${options.language})...`);
  const html = renderReport(data, {
    theme: options.theme,
    language: options.language,
    timezone: options.timezone,
  });

  const reportPath = join(reportDir, "index.html");
  await writeFile(reportPath, html, "utf-8");
  console.log(`Report written to ${reportPath}`);

  // Write index page with titles from each week's LLM data
  const allPaths = await listReportDirs(options.output);
  if (!allPaths.includes(weekId.path)) allPaths.push(weekId.path);
  const entries = await buildReportEntries(options.output, allPaths);
  const indexHtml = renderIndexPage(
    entries,
    options.theme,
    { username: githubData.username, avatarUrl: githubData.avatarUrl },
    options.language,
  );
  const indexPath = join(options.output, "index.html");
  await writeFile(indexPath, indexHtml, "utf-8");
  console.log(`Index written to ${indexPath}`);
};

export const registerRender = (program: Command): void => {
  program
    .command("render")
    .description("Render HTML report from fetched data and LLM content")
    .option("-o, --output <dir>", "Output directory (env: OUTPUT_DIR, default: ./report)")
    .option("--theme <theme>", "Report theme (env: THEME, default: default)")
    .option("--language <lang>", "Report language: en, ja (env: LANGUAGE, default: en)")
    .option("--timezone <tz>", "IANA timezone (env: TIMEZONE, default: UTC)")
    .option("--date <date>", "Date within the target week (YYYY-MM-DD, default: today)")
    .action(async (opts) => {
      try {
        const options: RenderOptions = {
          output: opts.output ?? env("OUTPUT_DIR") ?? "./report",
          theme: (opts.theme ?? env("THEME") ?? "default") as Theme,
          language: (opts.language ?? env("LANGUAGE") ?? "en") as Language,
          timezone: opts.timezone ?? env("TIMEZONE") ?? "UTC",
          date: opts.date ? new Date(opts.date + "T12:00:00Z") : undefined,
        };
        await run(options);
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};
