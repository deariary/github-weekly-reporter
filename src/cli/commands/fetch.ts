// fetch commands: daily-fetch (events) and weekly-fetch (full data)

import { Command } from "commander";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml, stringify as toYaml } from "yaml";
import { graphql } from "@octokit/graphql";
import { buildWeeklyRange, buildYesterdayRange, localDateParts, toISODate, parseLocalDate, type DateRange } from "../../collector/date-range.js";
import { fetchEvents, dedupeEvents } from "../../collector/fetch-events.js";
import { fetchContributions } from "../../collector/fetch-contributions.js";
import { fetchPRsByRefs, type PRRef } from "../../collector/fetch-repo-prs.js";
import { fetchCommitMessages } from "../../collector/fetch-commits.js";
import { aggregateRepositories } from "../../collector/aggregate.js";
import { getWeekId, getCurrentWeekId } from "../../deployer/week.js";
import type { GitHubEvent } from "../../types.js";

const env = (key: string): string | undefined => process.env[key];

export type BaseOptions = {
  token: string;
  username: string;
  dataDir: string;
  timezone: string;
  date?: Date;
};

export const resolveBaseOptions = (
  cli: Record<string, string | undefined>,
): BaseOptions => {
  const token = cli.token ?? env("GITHUB_TOKEN");
  if (!token) throw new Error("GitHub token required. Pass --token or set GITHUB_TOKEN.");
  const username = cli.username ?? env("GITHUB_USERNAME");
  if (!username) throw new Error("GitHub username required. Pass --username or set GITHUB_USERNAME.");
  const timezone = cli.timezone ?? env("TIMEZONE") ?? "UTC";
  const date = cli.date ? parseLocalDate(cli.date, timezone) : undefined;
  return { token, username, dataDir: cli.dataDir ?? env("DATA_DIR") ?? "./data", date, timezone };
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
export const extractPRRefs = (events: GitHubEvent[]): PRRef[] => {
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

// Resolved parameters for a fetch operation.
// Computed once from (now, timezone, dataDir) so that every downstream
// consumer (logging, file I/O, commit message) uses the same values.
export type FetchPlan = {
  targetDate: string;  // YYYY-MM-DD in local timezone
  rangeFrom: string;   // YYYY-MM-DD in local timezone
  rangeTo: string;     // YYYY-MM-DD in local timezone
  weekPath: string;    // e.g. "2026/W14"
  reportDir: string;   // e.g. "./data/2026/W14"
  range: DateRange;    // Date objects for API filtering
};

// Compute yesterday's noon (safe for week-ID calculation) in the given timezone.
const getYesterday = (now: Date, timezone: string): Date => {
  const { year, month, day } = localDateParts(now, timezone);
  const todayUTC = new Date(Date.UTC(year, month, day));
  const yesterdayUTC = new Date(todayUTC.getTime() - 86_400_000);
  const y = yesterdayUTC.getUTCFullYear();
  const m = String(yesterdayUTC.getUTCMonth() + 1).padStart(2, "0");
  const d = String(yesterdayUTC.getUTCDate()).padStart(2, "0");
  return parseLocalDate(`${y}-${m}-${d}`, timezone);
};

// Build a daily-fetch plan: yesterday's events stored in yesterday's week folder.
export const buildDailyPlan = (now: Date, timezone: string, dataDir: string): FetchPlan => {
  const yesterday = getYesterday(now, timezone);
  const weekId = getCurrentWeekId(yesterday, timezone);
  const range = buildYesterdayRange(now, timezone);
  return {
    targetDate: toISODate(yesterday, timezone),
    rangeFrom: toISODate(range.from, timezone),
    rangeTo: toISODate(range.to, timezone),
    weekPath: weekId.path,
    reportDir: join(dataDir, weekId.path),
    range,
  };
};

// Build a weekly-fetch plan: previous week's full Mon-Sun range.
export const buildWeeklyPlan = (now: Date, timezone: string, dataDir: string): FetchPlan => {
  const weekId = getWeekId(now, timezone);
  const range = buildWeeklyRange(now, timezone);
  return {
    targetDate: toISODate(now, timezone),
    rangeFrom: toISODate(range.from, timezone),
    rangeTo: toISODate(range.to, timezone),
    weekPath: weekId.path,
    reportDir: join(dataDir, weekId.path),
    range,
  };
};

const logPlan = (command: string, username: string, timezone: string, plan: FetchPlan): void => {
  console.log(`${command}: user=${username} timezone=${timezone}`);
  console.log(`  target date : ${plan.targetDate}`);
  console.log(`  date range  : ${plan.rangeFrom} .. ${plan.rangeTo}`);
  console.log(`  week        : ${plan.weekPath}`);
  console.log(`  data dir    : ${plan.reportDir}`);
};

// daily-fetch: collect yesterday's events and store in yesterday's week folder.
const runDailyFetch = async (options: BaseOptions): Promise<void> => {
  const now = options.date ?? new Date();
  const plan = buildDailyPlan(now, options.timezone, options.dataDir);
  await mkdir(plan.reportDir, { recursive: true });

  logPlan("daily-fetch", options.username, options.timezone, plan);
  const newEvents = await fetchEvents(options.token, options.username, plan.range);
  console.log(`Fetched ${newEvents.length} events.`);

  const eventsPath = join(plan.reportDir, "events.yaml");
  const existing = await tryReadYaml<GitHubEvent[]>(eventsPath) ?? [];
  const merged = dedupeEvents([...existing, ...newEvents]);

  await writeFile(eventsPath, toYaml(merged, { lineWidth: 120 }), "utf-8");
  console.log(`Events accumulated: ${merged.length} total (${eventsPath})`);
};

// Search PRs updated during the week via GitHub Search API (fallback for missing daily events)
const searchWeeklyPRs = async (
  token: string,
  username: string,
  range: DateRange,
): Promise<PRRef[]> => {
  const from = range.from.toISOString().split("T")[0];
  const to = range.to.toISOString().split("T")[0];
  const refs: PRRef[] = [];

  // Search PRs authored by or involving the user, updated during the week
  for (const qualifier of [`author:${username}`, `reviewed-by:${username}`]) {
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const q = encodeURIComponent(`is:pr is:public ${qualifier} updated:${from}..${to}`);
      const url = `https://api.github.com/search/issues?q=${q}&per_page=100&page=${page}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "github-weekly-reporter",
        },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error(
            `GitHub Search API returned ${res.status}. Check that your token (GH_PAT) is valid.`,
          );
        }
        console.warn(`  Search API error (${res.status}), some PRs may be missing.`);
        break;
      }
      const data = (await res.json()) as {
        items: { number: number; pull_request?: { url: string }; repository_url: string }[];
        total_count: number;
      };
      data.items
        .filter((item) => item.pull_request)
        .forEach((item) => {
          // repository_url is like "https://api.github.com/repos/owner/repo"
          const repo = item.repository_url.replace("https://api.github.com/repos/", "");
          refs.push({ repo, number: item.number });
        });
      hasMore = data.items.length === 100;
      page++;
    }
  }
  return refs;
};

// weekly-fetch: use accumulated events + search API to find PRs, fetch each individually
const runWeeklyFetch = async (options: BaseOptions): Promise<void> => {
  const now = options.date ?? new Date();
  const plan = buildWeeklyPlan(now, options.timezone, options.dataDir);
  await mkdir(plan.reportDir, { recursive: true });

  logPlan("weekly-fetch", options.username, options.timezone, plan);

  // Load accumulated events
  const eventsPath = join(plan.reportDir, "events.yaml");
  const events = await tryReadYaml<GitHubEvent[]>(eventsPath) ?? [];
  console.log(`Loaded ${events.length} accumulated events.`);

  // Extract PR refs from events
  const eventRefs = extractPRRefs(events);
  console.log(`Found ${eventRefs.length} PR references from events.`);

  // Search for PRs via GitHub Search API (catches PRs missed by daily fetch)
  console.log("Searching for PRs updated this week...");
  const searchRefs = await searchWeeklyPRs(options.token, options.username, plan.range);
  console.log(`Found ${searchRefs.length} PR references from search.`);

  // Merge and dedupe
  const allRefs = [...eventRefs, ...searchRefs];
  const uniqueRefs = new Map<string, PRRef>();
  allRefs.forEach((ref) => uniqueRefs.set(`${ref.repo}#${ref.number}`, ref));
  console.log(`Total unique PRs: ${uniqueRefs.size}`);

  // Fetch individual PRs
  console.log("Fetching PRs...");
  const pullRequests = await fetchPRsByRefs(options.token, [...uniqueRefs.values()]);
  console.log(`Fetched ${pullRequests.length} PRs.`);

  // Fetch contributions (GraphQL)
  console.log("Fetching contribution stats...");
  const gql = graphql.defaults({ headers: { authorization: `token ${options.token}` } });
  const contributions = await fetchContributions(gql, options.username, plan.range, options.timezone);

  const repositories = aggregateRepositories(pullRequests, []);
  const totalAdditions = pullRequests.reduce((sum, pr) => sum + pr.additions, 0);
  const totalDeletions = pullRequests.reduce((sum, pr) => sum + pr.deletions, 0);

  // Fetch commit messages per repository
  const repoNames = repositories.map((r) => r.name);
  console.log(`Fetching commit messages for ${repoNames.length} repositories...`);
  const commitMessages = await fetchCommitMessages(options.token, options.username, repoNames, plan.range);
  const totalMsgs = commitMessages.reduce((sum, r) => sum + r.messages.length, 0);
  console.log(`Collected ${totalMsgs} commit messages from ${commitMessages.length} repositories.`);

  const githubData = {
    username: contributions.username,
    avatarUrl: contributions.avatarUrl,
    profile: contributions.profile,
    dateRange: { from: plan.rangeFrom, to: plan.rangeTo },
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
    commitMessages,
    externalContributions: [],
  };
  const dataPath = join(plan.reportDir, "github-data.yaml");
  await writeFile(dataPath, toYaml(githubData, { lineWidth: 120 }), "utf-8");
  console.log(`GitHub data written to ${dataPath}`);
  console.log(`Total: ${pullRequests.length} PRs`);
};

const baseOptions = (cmd: Command): Command =>
  cmd
    .option("-t, --token <token>", "GitHub token (env: GITHUB_TOKEN)")
    .option("-u, --username <username>", "GitHub username (env: GITHUB_USERNAME)")
    .option("--data-dir <dir>", "Data directory (env: DATA_DIR, default: ./data)")
    .option("--timezone <tz>", "IANA timezone (env: TIMEZONE, default: UTC)")
    .option("--date <date>", "Date within the target week (YYYY-MM-DD, default: today)");

// Format a commit message from a plan. Used by the commit-msg
// subcommand so that action.yml produces consistent messages.
// Includes the UTC range timestamps so the commit is unambiguous
// regardless of the reader's timezone.
export const formatCommitMsg = (mode: string, plan: FetchPlan): string =>
  mode === "daily"
    ? `data: daily ${plan.weekPath} ${plan.range.from.toISOString()}..${plan.range.to.toISOString()}`
    : `data: weekly ${plan.weekPath} ${plan.range.from.toISOString()}..${plan.range.to.toISOString()}`;

export const registerFetch = (program: Command): void => {
  baseOptions(
    program
      .command("daily-fetch")
      .description("Fetch yesterday's GitHub events and accumulate (run daily via cron at midnight)"),
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

  program
    .command("commit-msg")
    .description("Print a commit message for the given mode (used by action.yml)")
    .argument("<mode>", "daily or weekly")
    .option("--timezone <tz>", "IANA timezone (env: TIMEZONE, default: UTC)")
    .option("--date <date>", "Target date (YYYY-MM-DD, default: today)")
    .option("--data-dir <dir>", "Data directory (default: ./data)")
    .action((mode: string, opts: Record<string, string | undefined>) => {
      const timezone = opts.timezone ?? env("TIMEZONE") ?? "UTC";
      const dataDir = opts.dataDir ?? env("DATA_DIR") ?? "./data";
      const now = opts.date ? parseLocalDate(opts.date, timezone) : new Date();
      const plan = mode === "daily"
        ? buildDailyPlan(now, timezone, dataDir)
        : buildWeeklyPlan(now, timezone, dataDir);
      process.stdout.write(formatCommitMsg(mode, plan));
    });
};
