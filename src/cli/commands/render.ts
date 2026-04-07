// render command: read github-data.yaml + llm-data.yaml and produce HTML

import { Command } from "commander";
import { readFile, writeFile, readdir, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { renderReport } from "../../renderer/index.js";
import { renderIndexPage, buildReportEntry, type ReportEntry } from "../../deployer/index-page.js";
import { getWeekId } from "../../deployer/week.js";
import { parseLocalDate } from "../../collector/date-range.js";
import { generateOGImage, generateIndexOGImage } from "../../renderer/og-image.js";
import { generateCard, generateDarkCard } from "../../renderer/card.js";
import { buildRSSFeed } from "../../renderer/rss.js";
import type { WeeklyReportData, AIContent, Language, Theme } from "../../types.js";
import { AVAILABLE_THEMES } from "../../renderer/themes/index.js";

const env = (key: string): string | undefined => process.env[key];

type RenderOptions = {
  dataDir: string;
  outputDir: string;
  baseUrl: string;
  siteTitle?: string;
  language: Language;
  timezone: string;
  theme: Theme;
  date?: Date;
};

const fileExists = async (path: string): Promise<boolean> => {
  try { await access(path); return true; } catch { return false; }
};

const listCompletedReportDirs = async (dir: string): Promise<string[]> => {
  const paths: string[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return paths;
  }
  for (const year of entries.filter((n) => /^\d{4}$/.test(n))) {
    const weeks = await readdir(join(dir, year));
    for (const w of weeks.filter((n) => /^W\d{2}$/.test(n))) {
      if (await fileExists(join(dir, year, w, "llm-data.yaml"))) {
        paths.push(`${year}/${w}`);
      }
    }
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
): Promise<ReportEntry[]> => {
  const entries = await Promise.all(
    reportPaths.map(async (path) => {
      const [llmData, ghData] = await Promise.all([
        tryReadYaml<AIContent>(join(dataDir, path, "llm-data.yaml")),
        tryReadYaml<WeeklyReportData>(join(dataDir, path, "github-data.yaml")),
      ]);
      if (!llmData) return null;
      const stats = ghData ? {
        commits: ghData.stats.totalCommits,
        prs: ghData.stats.prsOpened,
        reviews: ghData.stats.prsReviewed,
      } : undefined;
      const dateTo = ghData?.dateRange?.to;
      return buildReportEntry(path, llmData.title, llmData.subtitle, stats, dateTo, llmData.overview);
    }),
  );
  return entries.filter((e): e is ReportEntry => e !== null);
};

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
  const allPaths = (await listCompletedReportDirs(options.dataDir)).sort();
  if (!allPaths.includes(weekId.path)) allPaths.push(weekId.path);
  allPaths.sort();
  const currentIdx = allPaths.indexOf(weekId.path);
  const prevWeek = currentIdx > 0 ? allPaths[currentIdx - 1] : undefined;
  const nextWeek = currentIdx < allPaths.length - 1 ? allPaths[currentIdx + 1] : undefined;

  const base = options.baseUrl.replace(/\/+$/, "");

  console.log(`Rendering report (lang: ${options.language}, theme: ${options.theme})...`);
  const html = renderReport(data, {
    language: options.language,
    timezone: options.timezone,
    baseUrl: base,
    weekPath: weekId.path,
    siteTitle: options.siteTitle,
    theme: options.theme,
    prevWeek: prevWeek ? `../../${prevWeek}/` : undefined,
    nextWeek: nextWeek ? `../../${nextWeek}/` : undefined,
  });

  await mkdir(outputWeekDir, { recursive: true });
  const reportPath = join(outputWeekDir, "index.html");
  await writeFile(reportPath, html, "utf-8");
  console.log(`Report written to ${reportPath}`);

  // Re-render previous week's report so its "next week" link points here
  if (prevWeek) {
    const prevGhData = await tryReadYaml<WeeklyReportData>(join(options.dataDir, prevWeek, "github-data.yaml"));
    const prevAiContent = await tryReadYaml<AIContent>(join(options.dataDir, prevWeek, "llm-data.yaml"));
    if (prevGhData && prevAiContent) {
      const prevIdx = currentIdx - 1;
      const prevPrev = prevIdx > 0 ? allPaths[prevIdx - 1] : undefined;
      const prevHtml = renderReport({ ...prevGhData, aiContent: prevAiContent }, {
        language: options.language,
        timezone: options.timezone,
        baseUrl: base,
        weekPath: prevWeek,
        siteTitle: options.siteTitle,
        theme: options.theme,
        prevWeek: prevPrev ? `../../${prevPrev}/` : undefined,
        nextWeek: `../../${weekId.path}/`,
      });
      const prevOutputDir = join(options.outputDir, prevWeek);
      await mkdir(prevOutputDir, { recursive: true });
      await writeFile(join(prevOutputDir, "index.html"), prevHtml, "utf-8");
      console.log(`Updated previous week (${prevWeek}) with next-week link.`);
    }
  }

  // Generate OG image
  const ogImage = await generateOGImage({
    title: aiContent.title,
    subtitle: aiContent.subtitle,
    username: githubData.username,
    dateRange: `${githubData.dateRange.from} - ${githubData.dateRange.to}`,
    language: options.language,
    stats: {
      commits: githubData.stats.totalCommits,
      prs: githubData.stats.prsOpened,
      reviews: githubData.stats.prsReviewed,
    },
  });
  const ogPath = join(outputWeekDir, "og.png");
  await writeFile(ogPath, ogImage);
  console.log(`OG image written to ${ogPath}`);

  // Generate animated SVG summary cards (light + dark)
  const cardData = {
    username: githubData.username,
    weekLabel: `${weekId.year} Week ${weekId.path.split("/")[1].replace("W", "")}`,
    title: aiContent.title,
    summaries: aiContent.summaries,
    ticker: aiContent.ticker,
    reportUrl: `${base}/${weekId.path}/`,
  };
  const cardSvg = generateCard(cardData);
  const cardDarkSvg = generateDarkCard(cardData);
  const cardPath = join(options.outputDir, "card.svg");
  const cardDarkPath = join(options.outputDir, "card-dark.svg");
  await Promise.all([
    writeFile(cardPath, cardSvg, "utf-8"),
    writeFile(cardDarkPath, cardDarkSvg, "utf-8"),
  ]);
  console.log(`SVG cards written to ${cardPath} and ${cardDarkPath}`);

  // Write index page with titles from each week's LLM data
  const entries = await buildReportEntries(options.dataDir, allPaths);
  const ghRepo = env("GITHUB_REPOSITORY");
  const repoUrl = ghRepo ? `https://github.com/${ghRepo}` : undefined;
  const indexHtml = renderIndexPage(
    entries,
    { username: githubData.username, avatarUrl: githubData.avatarUrl, profile: githubData.profile },
    options.language,
    options.siteTitle,
    base,
    repoUrl,
    options.theme,
  );
  const indexPath = join(options.outputDir, "index.html");
  await mkdir(options.outputDir, { recursive: true });
  await writeFile(indexPath, indexHtml, "utf-8");
  console.log(`Index written to ${indexPath}`);

  // Generate index OG image
  const resolvedSiteTitle = (options.siteTitle ?? "Dev Pulse").replace(/\\n/g, " ");
  const indexOGImage = await generateIndexOGImage({
    siteTitle: resolvedSiteTitle,
    username: githubData.username,
    language: options.language,
    reportCount: allPaths.length,
  });
  const indexOGPath = join(options.outputDir, "og.png");
  await writeFile(indexOGPath, indexOGImage);
  console.log(`Index OG image written to ${indexOGPath}`);

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

  // Generate RSS feed
  const rssFeed = buildRSSFeed(entries, {
    title: resolvedSiteTitle,
    link: base,
    description: `Weekly reports by @${githubData.username}`,
    language: options.language,
    timezone: options.timezone,
  });
  const feedPath = join(options.outputDir, "feed.xml");
  await writeFile(feedPath, rssFeed, "utf-8");
  console.log(`RSS feed written to ${feedPath}`);

  // Generate robots.txt
  const robots = `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`;
  const robotsPath = join(options.outputDir, "robots.txt");
  await writeFile(robotsPath, robots, "utf-8");
  console.log(`robots.txt written to ${robotsPath}`);

  // Generate CNAME for custom domains (not *.github.io)
  const hostname = new URL(base).hostname;
  if (!hostname.endsWith(".github.io")) {
    const cnamePath = join(options.outputDir, "CNAME");
    await writeFile(cnamePath, hostname + "\n", "utf-8");
    console.log(`CNAME written to ${cnamePath}`);
  }
};

export const registerRender = (program: Command): void => {
  program
    .command("render")
    .description("Render HTML report from fetched data and LLM content")
    .option("--data-dir <dir>", "Data directory (env: DATA_DIR, default: ./data)")
    .option("-o, --output-dir <dir>", "Output directory for HTML (env: OUTPUT_DIR, default: ./output)")
    .option("--base-url <url>", "Base URL for absolute links in OG tags, sitemap, RSS feed, canonical (env: BASE_URL)")
    .option("--site-title <title>", "Site title for nav header (env: SITE_TITLE, default: {username}'s Weekly Reports)")
    .option("--language <lang>", "Report language: en, ja, zh-CN, zh-TW, ko, es, fr, de, pt, ru (env: LANGUAGE, default: en)")
    .option("--timezone <tz>", "IANA timezone (env: TIMEZONE, default: UTC)")
    .option("--theme <name>", `Theme name: ${AVAILABLE_THEMES.join(", ")} (env: THEME, default: brutalist)`)
    .option("--date <date>", "Date within the target week (YYYY-MM-DD, default: today)")
    .action(async (opts) => {
      try {
        const baseUrl = opts.baseUrl ?? env("BASE_URL");
        if (!baseUrl) throw new Error("Base URL required. Pass --base-url or set BASE_URL (e.g. https://user.github.io/repo).");

        const theme = (opts.theme ?? env("THEME") ?? "brutalist") as Theme;
        if (!AVAILABLE_THEMES.includes(theme)) {
          throw new Error(`Unknown theme "${theme}". Available: ${AVAILABLE_THEMES.join(", ")}`);
        }

        const options: RenderOptions = {
          dataDir: opts.dataDir ?? env("DATA_DIR") ?? "./data",
          outputDir: opts.outputDir ?? env("OUTPUT_DIR") ?? "./output",
          baseUrl,
          siteTitle: opts.siteTitle ?? env("SITE_TITLE"),
          language: (opts.language ?? env("LANGUAGE") ?? "en") as Language,
          timezone: opts.timezone ?? env("TIMEZONE") ?? "UTC",
          theme,
          date: opts.date ? parseLocalDate(opts.date, opts.timezone ?? env("TIMEZONE") ?? "UTC") : undefined,
        };
        await run(options);
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};
