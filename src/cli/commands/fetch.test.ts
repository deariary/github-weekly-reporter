import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { resolveBaseOptions, extractPRRefs, buildDailyPlan, buildWeeklyPlan, formatCommitMsg } from "./fetch.js";
import type { GitHubEvent } from "../../types.js";

// Mock fs/promises
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockMkdir = vi.fn().mockResolvedValue(undefined);
vi.mock("node:fs/promises", () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
}));

// Mock collector modules
const mockFetchEvents = vi.fn().mockResolvedValue([]);
const mockDedupeEvents = vi.fn().mockImplementation((events: GitHubEvent[]) => events);
vi.mock("../../collector/fetch-events.js", () => ({
  fetchEvents: (...args: unknown[]) => mockFetchEvents(...args),
  dedupeEvents: (...args: unknown[]) => mockDedupeEvents(...args),
}));

vi.mock("../../collector/fetch-repo-prs.js", () => ({
  fetchPRsByRefs: vi.fn().mockResolvedValue([]),
  mapState: vi.fn(),
}));

const mockFetchContributions = vi.fn().mockResolvedValue({
  username: "testuser",
  avatarUrl: "https://example.com/avatar.png",
  profile: { name: null, bio: null, company: null, location: null, followers: 0, following: 0, publicRepos: 0 },
  totalCommits: 10,
  prsReviewed: 3,
  dailyCommits: [],
});
vi.mock("../../collector/fetch-contributions.js", () => ({
  fetchContributions: (...args: unknown[]) => mockFetchContributions(...args),
}));

vi.mock("../../collector/aggregate.js", () => ({
  aggregateRepositories: () => [],
}));

// Note: deployer/week.js is NOT mocked here. buildDailyPlan/buildWeeklyPlan
// call the real getWeekId/getCurrentWeekId (pure functions, no I/O) so that
// the plan tests verify actual week-ID calculations end-to-end.

vi.mock("@octokit/graphql", () => ({
  graphql: { defaults: () => vi.fn() },
}));

// -------------------------------------------------------------------
// resolveBaseOptions
// -------------------------------------------------------------------

describe("resolveBaseOptions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when token is missing", () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    expect(() => resolveBaseOptions({ username: "alice" })).toThrow(
      "GitHub token required",
    );
  });

  it("throws when username is missing", () => {
    vi.stubEnv("GITHUB_USERNAME", "");
    expect(() => resolveBaseOptions({ token: "ghp_xxx" })).toThrow(
      "GitHub username required",
    );
  });

  it("uses defaults for timezone and dataDir", () => {
    const result = resolveBaseOptions({
      token: "ghp_xxx",
      username: "alice",
    });
    expect(result.timezone).toBe("UTC");
    expect(result.dataDir).toBe("./data");
  });

  it("reads token and username from env when CLI args omitted", () => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_env");
    vi.stubEnv("GITHUB_USERNAME", "bob");
    const result = resolveBaseOptions({});
    expect(result.token).toBe("ghp_env");
    expect(result.username).toBe("bob");
  });

  it("CLI args take precedence over env", () => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_env");
    vi.stubEnv("GITHUB_USERNAME", "env_user");
    const result = resolveBaseOptions({
      token: "ghp_cli",
      username: "cli_user",
    });
    expect(result.token).toBe("ghp_cli");
    expect(result.username).toBe("cli_user");
  });

  it("parses date option correctly", () => {
    const result = resolveBaseOptions({
      token: "ghp_xxx",
      username: "alice",
      date: "2026-04-01",
      timezone: "UTC",
    });
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date!.toISOString()).toContain("2026-04-01");
  });

  it("date is undefined when not provided", () => {
    const result = resolveBaseOptions({
      token: "ghp_xxx",
      username: "alice",
    });
    expect(result.date).toBeUndefined();
  });

  it("respects env for timezone and dataDir", () => {
    vi.stubEnv("TIMEZONE", "Asia/Tokyo");
    vi.stubEnv("DATA_DIR", "/tmp/data");
    const result = resolveBaseOptions({
      token: "ghp_xxx",
      username: "alice",
    });
    expect(result.timezone).toBe("Asia/Tokyo");
    expect(result.dataDir).toBe("/tmp/data");
  });
});

// -------------------------------------------------------------------
// extractPRRefs
// -------------------------------------------------------------------

describe("extractPRRefs", () => {
  it("extracts refs from pull_request events", () => {
    const events: GitHubEvent[] = [
      {
        id: "1",
        type: "PullRequestEvent",
        repo: "owner/repo",
        createdAt: "2026-04-01T00:00:00Z",
        payload: { kind: "pull_request", action: "opened", number: 42, title: "feat: add X" },
      },
    ];
    const refs = extractPRRefs(events);
    expect(refs).toEqual([{ repo: "owner/repo", number: 42 }]);
  });

  it("extracts refs from review events", () => {
    const events: GitHubEvent[] = [
      {
        id: "2",
        type: "PullRequestReviewEvent",
        repo: "owner/repo",
        createdAt: "2026-04-01T00:00:00Z",
        payload: { kind: "review", action: "submitted", prNumber: 99, prTitle: "fix: Y", state: "approved" },
      },
    ];
    const refs = extractPRRefs(events);
    expect(refs).toEqual([{ repo: "owner/repo", number: 99 }]);
  });

  it("handles mixed event types", () => {
    const events: GitHubEvent[] = [
      {
        id: "1",
        type: "PullRequestEvent",
        repo: "a/b",
        createdAt: "2026-04-01T00:00:00Z",
        payload: { kind: "pull_request", action: "opened", number: 1, title: "pr1" },
      },
      {
        id: "2",
        type: "PushEvent",
        repo: "a/b",
        createdAt: "2026-04-01T01:00:00Z",
        payload: { kind: "push", ref: "refs/heads/main", commits: ["abc"] },
      },
      {
        id: "3",
        type: "PullRequestReviewEvent",
        repo: "c/d",
        createdAt: "2026-04-01T02:00:00Z",
        payload: { kind: "review", action: "submitted", prNumber: 5, prTitle: "review", state: "commented" },
      },
    ];
    const refs = extractPRRefs(events);
    expect(refs).toHaveLength(2);
    expect(refs).toEqual([
      { repo: "a/b", number: 1 },
      { repo: "c/d", number: 5 },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(extractPRRefs([])).toEqual([]);
  });

  it("skips events with number 0", () => {
    const events: GitHubEvent[] = [
      {
        id: "1",
        type: "PullRequestEvent",
        repo: "a/b",
        createdAt: "2026-04-01T00:00:00Z",
        payload: { kind: "pull_request", action: "opened", number: 0, title: "bad" },
      },
    ];
    expect(extractPRRefs(events)).toEqual([]);
  });
});

// -------------------------------------------------------------------
// buildDailyPlan
//
// Cron fires at midnight local time. The plan should collect
// yesterday's events and store them in yesterday's ISO week folder.
//
// Reference table (Asia/Tokyo, W14 = Mon 3/30 .. Sun 4/5):
//
//   cron (JST)        | yesterday | week | range
//   3/31 Mon 00:00    | 3/30 Mon  | W14  | 3/30 .. 3/30
//   4/1  Tue 00:00    | 3/31 Tue  | W14  | 3/31 .. 3/31
//   ...
//   4/6  Sun 00:00    | 4/5  Sun  | W14  | 4/5  .. 4/5
//   4/7  Mon 00:00    | 4/6  Mon  | W15  | 4/6  .. 4/6
// -------------------------------------------------------------------

describe("buildDailyPlan", () => {
  // Full week cycle (Asia/Tokyo, W14)
  const jstCases: [string, string, string, string, string][] = [
    // [cron UTC instant,           targetDate, range,       weekPath,    description]
    ["2026-03-30T15:00:00Z", "2026-03-30", "2026-03-30", "2026/W14", "Mon: yesterday=Mon(W14)"],
    ["2026-03-31T15:00:00Z", "2026-03-31", "2026-03-31", "2026/W14", "Tue: yesterday=Tue(W14)"],
    ["2026-04-01T15:00:00Z", "2026-04-01", "2026-04-01", "2026/W14", "Wed: yesterday=Wed(W14)"],
    ["2026-04-02T15:00:00Z", "2026-04-02", "2026-04-02", "2026/W14", "Thu: yesterday=Thu(W14)"],
    ["2026-04-03T15:00:00Z", "2026-04-03", "2026-04-03", "2026/W14", "Fri: yesterday=Fri(W14)"],
    ["2026-04-04T15:00:00Z", "2026-04-04", "2026-04-04", "2026/W14", "Sat: yesterday=Sat(W14)"],
    ["2026-04-05T15:00:00Z", "2026-04-05", "2026-04-05", "2026/W14", "Sun: yesterday=Sun(W14)"],
    ["2026-04-06T15:00:00Z", "2026-04-06", "2026-04-06", "2026/W15", "Mon: yesterday=Mon(W15), week boundary"],
  ];

  it.each(jstCases)("JST cron at %s: %s", (utcInstant, targetDate, rangeDate, weekPath, _desc) => {
    const plan = buildDailyPlan(new Date(utcInstant), "Asia/Tokyo", "./data");
    expect(plan.targetDate).toBe(targetDate);
    expect(plan.rangeFrom).toBe(rangeDate);
    expect(plan.rangeTo).toBe(rangeDate);
    expect(plan.weekPath).toBe(weekPath);
    expect(plan.reportDir).toBe(`data/${weekPath}`);
  });

  // UTC cycle (W14)
  const utcCases: [string, string, string][] = [
    ["2026-03-31T00:00:00Z", "2026-03-30", "2026/W14"],
    ["2026-04-06T00:00:00Z", "2026-04-05", "2026/W14"],
    ["2026-04-07T00:00:00Z", "2026-04-06", "2026/W15"],
  ];

  it.each(utcCases)("UTC cron at %s: yesterday=%s week=%s", (utcInstant, targetDate, weekPath) => {
    const plan = buildDailyPlan(new Date(utcInstant), "UTC", "./data");
    expect(plan.targetDate).toBe(targetDate);
    expect(plan.weekPath).toBe(weekPath);
  });

  it("year boundary: Jan 1 midnight -> yesterday is Dec 31", () => {
    const plan = buildDailyPlan(new Date("2026-01-01T00:00:00Z"), "UTC", "./data");
    expect(plan.targetDate).toBe("2025-12-31");
    expect(plan.rangeFrom).toBe("2025-12-31");
    expect(plan.rangeTo).toBe("2025-12-31");
    // Dec 31 2025 is Wednesday, ISO W01 of 2026
    expect(plan.weekPath).toBe("2026/W01");
  });

  it("range covers exactly one day (from and to are the same date)", () => {
    const plan = buildDailyPlan(new Date("2026-04-04T15:00:00Z"), "Asia/Tokyo", "./data");
    expect(plan.rangeFrom).toBe(plan.rangeTo);
  });
});

// -------------------------------------------------------------------
// buildWeeklyPlan
//
// Cron fires Monday 01:00 local time (1h after daily). The plan
// should target the previous ISO week (Mon-Sun).
//
// Reference table (Asia/Tokyo):
//
//   cron (JST)        | range             | week
//   4/7  Mon 01:00    | 3/30 .. 4/5       | W14
//   4/14 Mon 01:00    | 4/6  .. 4/12      | W15
// -------------------------------------------------------------------

describe("buildWeeklyPlan", () => {
  it("Monday JST: targets previous week W14 (3/30..4/5)", () => {
    // Mon Apr 7 01:00 JST = 2026-04-06T16:00:00Z
    const plan = buildWeeklyPlan(new Date("2026-04-06T16:00:00Z"), "Asia/Tokyo", "./data");
    expect(plan.rangeFrom).toBe("2026-03-30");
    expect(plan.rangeTo).toBe("2026-04-05");
    expect(plan.weekPath).toBe("2026/W14");
    expect(plan.reportDir).toBe("data/2026/W14");
  });

  it("Monday UTC: targets previous week W14 (3/30..4/5)", () => {
    const plan = buildWeeklyPlan(new Date("2026-04-07T01:00:00Z"), "UTC", "./data");
    expect(plan.rangeFrom).toBe("2026-03-30");
    expect(plan.rangeTo).toBe("2026-04-05");
    expect(plan.weekPath).toBe("2026/W14");
  });

  it("next Monday targets W15 (4/6..4/12)", () => {
    // Mon Apr 14 01:00 JST = 2026-04-13T16:00:00Z
    const plan = buildWeeklyPlan(new Date("2026-04-13T16:00:00Z"), "Asia/Tokyo", "./data");
    expect(plan.rangeFrom).toBe("2026-04-06");
    expect(plan.rangeTo).toBe("2026-04-12");
    expect(plan.weekPath).toBe("2026/W15");
  });

  it("range covers exactly 7 days", () => {
    const plan = buildWeeklyPlan(new Date("2026-04-07T01:00:00Z"), "UTC", "./data");
    expect(plan.rangeFrom).toBe("2026-03-30");
    expect(plan.rangeTo).toBe("2026-04-05");
  });

  it("year boundary: Mon Jan 5 (W02) targets previous W01 (Dec 29..Jan 4)", () => {
    // Mon Jan 5 2026 01:00 UTC is W02. Previous week is W01 (Dec 29..Jan 4).
    // ISO W01 of 2026 starts on Mon Dec 29 2025.
    const plan = buildWeeklyPlan(new Date("2026-01-05T01:00:00Z"), "UTC", "./data");
    expect(plan.rangeFrom).toBe("2025-12-29");
    expect(plan.rangeTo).toBe("2026-01-04");
    expect(plan.weekPath).toBe("2026/W01");
  });
});

// -------------------------------------------------------------------
// daily + weekly plan consistency
// -------------------------------------------------------------------

describe("daily/weekly plan consistency", () => {
  it("7 daily plans cover the same range as the weekly plan (UTC)", () => {
    // W14 daily crons: Tue 3/31 00:00 through Mon 4/7 00:00
    const dailyDates = [
      "2026-03-31T00:00:00Z", // yesterday = 3/30 Mon
      "2026-04-01T00:00:00Z", // yesterday = 3/31 Tue
      "2026-04-02T00:00:00Z", // yesterday = 4/1  Wed
      "2026-04-03T00:00:00Z", // yesterday = 4/2  Thu
      "2026-04-04T00:00:00Z", // yesterday = 4/3  Fri
      "2026-04-05T00:00:00Z", // yesterday = 4/4  Sat
      "2026-04-06T00:00:00Z", // yesterday = 4/5  Sun
    ];
    const dailyPlans = dailyDates.map((d) => buildDailyPlan(new Date(d), "UTC", "./data"));

    // All should target W14
    dailyPlans.forEach((p) => expect(p.weekPath).toBe("2026/W14"));

    // Collected dates should be Mon 3/30 through Sun 4/5
    const collectedDates = dailyPlans.map((p) => p.targetDate);
    expect(collectedDates).toEqual([
      "2026-03-30", "2026-03-31", "2026-04-01", "2026-04-02",
      "2026-04-03", "2026-04-04", "2026-04-05",
    ]);

    // Weekly plan should cover the same range
    const weeklyPlan = buildWeeklyPlan(new Date("2026-04-07T01:00:00Z"), "UTC", "./data");
    expect(weeklyPlan.rangeFrom).toBe(collectedDates[0]);
    expect(weeklyPlan.rangeTo).toBe(collectedDates[collectedDates.length - 1]);
    expect(weeklyPlan.weekPath).toBe("2026/W14");
  });

  it("7 daily plans cover the same range as the weekly plan (Asia/Tokyo)", () => {
    // JST midnight = 15:00 UTC previous day
    const dailyDates = [
      "2026-03-30T15:00:00Z", // JST 3/31 Mon, yesterday = 3/30
      "2026-03-31T15:00:00Z", // JST 4/1  Tue, yesterday = 3/31
      "2026-04-01T15:00:00Z", // JST 4/2  Wed, yesterday = 4/1
      "2026-04-02T15:00:00Z", // JST 4/3  Thu, yesterday = 4/2
      "2026-04-03T15:00:00Z", // JST 4/4  Fri, yesterday = 4/3
      "2026-04-04T15:00:00Z", // JST 4/5  Sat, yesterday = 4/4
      "2026-04-05T15:00:00Z", // JST 4/6  Sun, yesterday = 4/5
    ];
    const dailyPlans = dailyDates.map((d) => buildDailyPlan(new Date(d), "Asia/Tokyo", "./data"));

    dailyPlans.forEach((p) => expect(p.weekPath).toBe("2026/W14"));

    const collectedDates = dailyPlans.map((p) => p.targetDate);
    expect(collectedDates).toEqual([
      "2026-03-30", "2026-03-31", "2026-04-01", "2026-04-02",
      "2026-04-03", "2026-04-04", "2026-04-05",
    ]);

    // Weekly cron: Mon 4/7 01:00 JST = 2026-04-06T16:00:00Z
    const weeklyPlan = buildWeeklyPlan(new Date("2026-04-06T16:00:00Z"), "Asia/Tokyo", "./data");
    expect(weeklyPlan.rangeFrom).toBe(collectedDates[0]);
    expect(weeklyPlan.rangeTo).toBe(collectedDates[collectedDates.length - 1]);
    expect(weeklyPlan.weekPath).toBe("2026/W14");
  });
});

// -------------------------------------------------------------------
// formatCommitMsg
// -------------------------------------------------------------------

describe("formatCommitMsg", () => {
  it("daily: includes week path and UTC range", () => {
    // Sun Apr 6 00:00 JST = 2026-04-05T15:00:00Z, yesterday = Sat Apr 5 (W14)
    const plan = buildDailyPlan(new Date("2026-04-05T15:00:00Z"), "Asia/Tokyo", "./data");
    const msg = formatCommitMsg("daily", plan);
    // Apr 5 JST midnight = Apr 4 15:00 UTC, Apr 6 JST midnight - 1ms = Apr 5 14:59:59.999 UTC
    expect(msg).toBe(`data: daily 2026/W14 ${plan.range.from.toISOString()}..${plan.range.to.toISOString()}`);
    expect(msg).toMatch(/^data: daily 2026\/W14 2026-04-04T15:00:00\.000Z\.\.2026-04-05T14:59:59\.999Z$/);
  });

  it("weekly: includes week path and UTC range", () => {
    // Mon Apr 7 01:00 JST = 2026-04-06T16:00:00Z
    const plan = buildWeeklyPlan(new Date("2026-04-06T16:00:00Z"), "Asia/Tokyo", "./data");
    const msg = formatCommitMsg("weekly", plan);
    expect(msg).toBe(`data: weekly 2026/W14 ${plan.range.from.toISOString()}..${plan.range.to.toISOString()}`);
    // W14 in JST: Mon Mar 30 00:00 JST .. Sun Apr 5 23:59:59.999 JST
    expect(msg).toMatch(/^data: weekly 2026\/W14 2026-03-29T15:00:00\.000Z\.\.2026-04-05T14:59:59\.999Z$/);
  });

  it("daily at week boundary: Tue midnight, yesterday=Mon is new week", () => {
    // Tue Apr 8 00:00 JST = 2026-04-07T15:00:00Z, yesterday = Mon Apr 7 (W15)
    const plan = buildDailyPlan(new Date("2026-04-07T15:00:00Z"), "Asia/Tokyo", "./data");
    const msg = formatCommitMsg("daily", plan);
    expect(msg).toMatch(/^data: daily 2026\/W15 /);
  });
});

// -------------------------------------------------------------------
// registerFetch (daily-fetch and weekly-fetch commands)
// -------------------------------------------------------------------

describe("registerFetch (daily-fetch)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFile.mockRejectedValue(new Error("not found")); // no existing events
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("calls fetchEvents and writes events.yaml", async () => {
    const mockEvents: GitHubEvent[] = [
      {
        id: "1",
        type: "PushEvent",
        repo: "owner/repo",
        createdAt: "2026-04-01T00:00:00Z",
        payload: { kind: "push", ref: "refs/heads/main", commits: ["fix"] },
      },
    ];
    mockFetchEvents.mockResolvedValue(mockEvents);
    mockDedupeEvents.mockReturnValue(mockEvents);

    const { Command } = await import("commander");
    const { registerFetch } = await import("./fetch.js");
    const program = new Command();
    registerFetch(program);

    await program.parseAsync([
      "node", "cli", "daily-fetch",
      "--token", "ghp_test",
      "--username", "testuser",
      "--data-dir", "./data",
      "--timezone", "UTC",
      "--date", "2026-04-01",
    ]);

    expect(mockFetchEvents).toHaveBeenCalledWith("ghp_test", "testuser", expect.any(Object));
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("events.yaml"),
      expect.any(String),
      "utf-8",
    );
  });
});

describe("registerFetch (weekly-fetch)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("fetches PRs and contributions, writes github-data.yaml", async () => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    mockReadFile.mockRejectedValue(new Error("not found"));
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockFetchContributions.mockResolvedValue({
      username: "testuser",
      avatarUrl: "https://example.com/avatar.png",
      profile: { name: null, bio: null, company: null, location: null, followers: 0, following: 0, publicRepos: 0 },
      totalCommits: 10,
      prsReviewed: 3,
      dailyCommits: [],
    });
    const { fetchPRsByRefs } = await import("../../collector/fetch-repo-prs.js");
    vi.mocked(fetchPRsByRefs).mockResolvedValue([]);
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ items: [], total_count: 0 }), { status: 200 })),
    );

    const { Command } = await import("commander");
    const { registerFetch } = await import("./fetch.js");
    const program = new Command();
    registerFetch(program);

    await program.parseAsync([
      "node", "cli", "weekly-fetch",
      "--token", "ghp_test",
      "--username", "testuser",
      "--data-dir", "./data",
      "--timezone", "UTC",
      "--date", "2026-04-01",
    ]);

    expect(mockFetchContributions).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("github-data.yaml"),
      expect.any(String),
      "utf-8",
    );
  });
});
