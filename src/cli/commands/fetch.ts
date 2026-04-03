// fetch commands: daily-fetch (events) and weekly-fetch (full data)

import { Command } from "commander";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml, stringify as toYaml } from "yaml";
import { graphql } from "@octokit/graphql";
import { buildWeeklyRange, toISODate } from "../../collector/date-range.js";
import { fetchEvents, dedupeEvents } from "../../collector/fetch-events.js";
import { fetchContributions } from "../../collector/fetch-contributions.js";
import { fetchPRsByRefs, type PRRef } from "../../collector/fetch-repo-prs.js";
import { aggregateRepositories } from "../../collector/aggregate.js";
import { getWeekId } from "../../deployer/week.js";
import type { GitHubEvent, WeeklyReportData } from "../../types.js";

const env = (key: string): string | undefined => process.env[key];

type BaseOptions = {
  token: string;
  username: string;
  output: string;
  timezone: string;
  date?: Date;
};

const resolveBaseOptions = (
  cli: Record<string, string | undefined>,
): BaseOptions => {
  const token = cli.token ?? env("GITHUB_TOKEN");
  if (!token) throw new Error("GitHub token required. Pass --token or set GITHUB_TOKEN.");
  const username = cli.username ?? env("GITHUB_USERNAME");
  if (!username) throw new Error("GitHub username required. Pass --username or set GITHUB_USERNAME.");
  const date = cli.date ? new Date(cli.date + "T12:00:00Z") : undefined;
  const timezone = cli.timezone ?? env("TIMEZONE") ?? "UTC";
  return { token, username, output: cli.output ?? env("OUTPUT_DIR") ?? "./report", date, timezone };
};

const tryReadYaml = async <T>(path: string): Promise<T | null> => {
  try {
    const raw = await readFile(path, "utf-8");
    return parseYaml(raw) as T;
  } catch {
    return null;
  }
};

// Extract PR references from events
const extractPRRefs = (events: GitHubEvent[]): PRRef[] => {
  const refs: PRRef[] = [];
  events.forEach((e) => {
    const p = e.payload;
    if (p.kind === "pull_request" && p.number > 0) {
      refs.push({ repo: e.repo, number: p.number });
    }
    if (p.kind === "review" && p.prNumber > 0) {
      refs.push({ repo: e.repo, number: p.prNumber });
    }
  });
  return refs;
};

// daily-fetch: accumulate events
const runDailyFetch = async (options: BaseOptions): Promise<void> => {
  const weekId = getWeekId(options.date, options.timezone);
  const range = buildWeeklyRange(options.date, options.timezone);
  const reportDir = join(options.output, weekId.path);
  await mkdir(reportDir, { recursive: true });

  console.log(`Fetching events for ${options.username} (${weekId.path})...`);
  const newEvents = await fetchEvents(options.token, options.username, range);
  console.log(`Fetched ${newEvents.length} events.`);

  const eventsPath = join(reportDir, "events.yaml");
  const existing = await tryReadYaml<GitHubEvent[]>(eventsPath) ?? [];
  const merged = dedupeEvents([...existing, ...newEvents]);

  await writeFile(eventsPath, toYaml(merged, { lineWidth: 120 }), "utf-8");
  console.log(`Events accumulated: ${merged.length} total (${eventsPath})`);
};

// weekly-fetch: use accumulated events to find PRs, fetch each individually
const runWeeklyFetch = async (options: BaseOptions): Promise<void> => {
  const weekId = getWeekId(options.date, options.timezone);
  const range = buildWeeklyRange(options.date, options.timezone);
  const reportDir = join(options.output, weekId.path);
  await mkdir(reportDir, { recursive: true });

  // Load accumulated events
  const eventsPath = join(reportDir, "events.yaml");
  const events = await tryReadYaml<GitHubEvent[]>(eventsPath) ?? [];
  console.log(`Loaded ${events.length} accumulated events.`);

  // Extract PR refs from events
  const prRefs = extractPRRefs(events);
  console.log(`Found ${prRefs.length} PR references (${new Set(prRefs.map((r) => `${r.repo}#${r.number}`)).size} unique).`);

  // Fetch individual PRs
  console.log("Fetching PRs...");
  const pullRequests = await fetchPRsByRefs(options.token, prRefs);
  console.log(`Fetched ${pullRequests.length} PRs.`);

  // Fetch contributions (GraphQL)
  console.log("Fetching contribution stats...");
  const gql = graphql.defaults({ headers: { authorization: `token ${options.token}` } });
  const contributions = await fetchContributions(gql, options.username, range, options.timezone);

  const repositories = aggregateRepositories(pullRequests, []);
  const totalAdditions = pullRequests.reduce((sum, pr) => sum + pr.additions, 0);
  const totalDeletions = pullRequests.reduce((sum, pr) => sum + pr.deletions, 0);

  const data: WeeklyReportData = {
    username: contributions.username,
    avatarUrl: contributions.avatarUrl,
    dateRange: {
      from: toISODate(range.from, options.timezone),
      to: toISODate(range.to, options.timezone),
    },
    stats: {
      totalCommits: contributions.totalCommits,
      totalAdditions,
      totalDeletions,
      prsOpened: pullRequests.filter((pr) => pr.author.toLowerCase() === options.username.toLowerCase()).length,
      prsMerged: pullRequests.filter((pr) => pr.state === "merged" && pr.author.toLowerCase() === options.username.toLowerCase()).length,
      prsReviewed: contributions.prsReviewed,
      issuesOpened: 0,
      issuesClosed: 0,
    },
    dailyCommits: contributions.dailyCommits,
    repositories,
    pullRequests,
    issues: [],
    events,
    externalContributions: [],
    aiContent: null,
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { aiContent: _, ...githubData } = data;
  const dataPath = join(reportDir, "github-data.yaml");
  await writeFile(dataPath, toYaml(githubData, { lineWidth: 120 }), "utf-8");
  console.log(`GitHub data written to ${dataPath}`);
  console.log(`Total: ${pullRequests.length} PRs`);
};

const baseOptions = (cmd: Command): Command =>
  cmd
    .option("-t, --token <token>", "GitHub token (env: GITHUB_TOKEN)")
    .option("-u, --username <username>", "GitHub username (env: GITHUB_USERNAME)")
    .option("-o, --output <dir>", "Output directory (env: OUTPUT_DIR, default: ./report)")
    .option("--timezone <tz>", "IANA timezone (env: TIMEZONE, default: UTC)")
    .option("--date <date>", "Date within the target week (YYYY-MM-DD, default: today)");

export const registerFetch = (program: Command): void => {
  baseOptions(
    program
      .command("daily-fetch")
      .description("Fetch today's GitHub events and accumulate (run daily via cron)"),
  ).action(async (opts) => {
    try {
      const options = resolveBaseOptions(opts);
      await runDailyFetch(options);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

  baseOptions(
    program
      .command("weekly-fetch")
      .description("Build full weekly data from accumulated events + individual PR fetches"),
  ).action(async (opts) => {
    try {
      const options = resolveBaseOptions(opts);
      await runWeeklyFetch(options);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
};
