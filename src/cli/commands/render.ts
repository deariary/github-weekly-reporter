// render command: read github-data.yaml + llm-data.yaml and produce HTML

import { Command } from "commander";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { renderReport } from "../../renderer/index.js";
import { renderIndexPage, buildReportEntry, type ReportEntry } from "../../deployer/index-page.js";
import { getWeekId } from "../../deployer/week.js";
import { parseLocalDate } from "../../collector/date-range.js";
import { generateOGImage } from "../../renderer/og-image.js";
import type { WeeklyReportData, AIContent, Theme, Language } from "../../types.js";

const env = (key: string): string | undefined => process.env[key];

type RenderOptions = {
  dataDir: string;
  outputDir: string;
  baseUrl: string;
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
  dataDir: string,
  reportPaths: string[],
): Promise<ReportEntry[]> =>
  Promise.all(
    reportPaths.map(async (path) => {
      const llmData = await tryReadYaml<AIContent>(join(dataDir, path, "llm-data.yaml"));
      return buildReportEntry(path, llmData?.title);
    }),
  );

const run = async (options: RenderOptions): Promise<void> => {
  const weekId = getWeekId(options.date, options.timezone);
  const dataWeekDir = join(options.dataDir, weekId.path);
  const outputWeekDir = join(options.outputDir, weekId.path);

  const githubDataPath = join(dataWeekDir, "github-data.yaml");
  console.log(`Reading ${githubDataPath}...`);
  const githubData = await tryReadYaml<WeeklyReportData>(githubDataPath);
  if (!githubData) {
    console.error(`GitHub data not found at ${githubDataPath}. Run 'fetch' first.`);
    process.exit(1);
  }

  const llmDataPath = join(dataWeekDir, "llm-data.yaml");
  const aiContent = await tryReadYaml<AIContent>(llmDataPath);
  if (!aiContent) {
    console.error(`LLM data not found at ${llmDataPath}. Run 'generate' first.`);
    process.exit(1);
  }
  console.log("Loaded LLM data.");

  const data: WeeklyReportData = { ...githubData, aiContent };

  // Determine prev/next week paths for internal linking
  const allPaths = (await listReportDirs(options.dataDir)).sort();
  if (!allPaths.includes(weekId.path)) allPaths.push(weekId.path);
  allPaths.sort();
  const currentIdx = allPaths.indexOf(weekId.path);
  const prevWeek = currentIdx > 0 ? allPaths[currentIdx - 1] : undefined;
  const nextWeek = currentIdx < allPaths.length - 1 ? allPaths[currentIdx + 1] : undefined;

  const base = options.baseUrl.replace(/\/+$/, "");

  console.log(`Rendering report (theme: ${options.theme}, lang: ${options.language})...`);
  const html = renderReport(data, {
    theme: options.theme,
    language: options.language,
    timezone: options.timezone,
    baseUrl: base,
    weekPath: weekId.path,
    prevWeek: prevWeek ? `../../${prevWeek}/` : undefined,
    nextWeek: nextWeek ? `../../${nextWeek}/` : undefined,
  });

  await mkdir(outputWeekDir, { recursive: true });
  const reportPath = join(outputWeekDir, "index.html");
  await writeFile(reportPath, html, "utf-8");
  console.log(`Report written to ${reportPath}`);

  // Generate OG image
  const ogImage = await generateOGImage({
    title: aiContent.title,
    subtitle: aiContent.subtitle,
    username: githubData.username,
    dateRange: `${githubData.dateRange.from} - ${githubData.dateRange.to}`,
    stats: {
      commits: githubData.stats.totalCommits,
      prs: githubData.stats.prsOpened,
      reviews: githubData.stats.prsReviewed,
    },
  });
  const ogPath = join(outputWeekDir, "og.png");
  await writeFile(ogPath, ogImage);
  console.log(`OG image written to ${ogPath}`);

  // Write index page with titles from each week's LLM data
  const entries = await buildReportEntries(options.dataDir, allPaths);
  const indexHtml = renderIndexPage(
    entries,
    options.theme,
    { username: githubData.username, avatarUrl: githubData.avatarUrl },
    options.language,
  );
  const indexPath = join(options.outputDir, "index.html");
  await mkdir(options.outputDir, { recursive: true });
  await writeFile(indexPath, indexHtml, "utf-8");
  console.log(`Index written to ${indexPath}`);

  // Generate sitemap.xml
  const sitemapEntries = allPaths
    .map((p) => `  <url><loc>${base}/${p}/</loc></url>`)
    .join("\n");
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${base}/</loc></url>
${sitemapEntries}
</urlset>`;
  const sitemapPath = join(options.outputDir, "sitemap.xml");
  await writeFile(sitemapPath, sitemap, "utf-8");
  console.log(`Sitemap written to ${sitemapPath}`);

  // Generate robots.txt
  const robots = `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`;
  const robotsPath = join(options.outputDir, "robots.txt");
  await writeFile(robotsPath, robots, "utf-8");
  console.log(`robots.txt written to ${robotsPath}`);
};

export const registerRender = (program: Command): void => {
  program
    .command("render")
    .description("Render HTML report from fetched data and LLM content")
    .option("--data-dir <dir>", "Data directory (env: DATA_DIR, default: ./data)")
    .option("-o, --output-dir <dir>", "Output directory for HTML (env: OUTPUT_DIR, default: ./output)")
    .option("--base-url <url>", "Base URL for absolute links in OG tags, sitemap, canonical (env: BASE_URL)")
    .option("--theme <theme>", "Report theme (env: THEME, default: default)")
    .option("--language <lang>", "Report language: en, ja (env: LANGUAGE, default: en)")
    .option("--timezone <tz>", "IANA timezone (env: TIMEZONE, default: UTC)")
    .option("--date <date>", "Date within the target week (YYYY-MM-DD, default: today)")
    .action(async (opts) => {
      try {
        const baseUrl = opts.baseUrl ?? env("BASE_URL");
        if (!baseUrl) throw new Error("Base URL required. Pass --base-url or set BASE_URL (e.g. https://user.github.io/repo).");

        const options: RenderOptions = {
          dataDir: opts.dataDir ?? env("DATA_DIR") ?? "./data",
          outputDir: opts.outputDir ?? env("OUTPUT_DIR") ?? "./output",
          baseUrl,
          theme: (opts.theme ?? env("THEME") ?? "default") as Theme,
          language: (opts.language ?? env("LANGUAGE") ?? "en") as Language,
          timezone: opts.timezone ?? env("TIMEZONE") ?? "UTC",
          date: opts.date ? parseLocalDate(opts.date, opts.timezone ?? env("TIMEZONE") ?? "UTC") : undefined,
        };
        await run(options);
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};
