import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { resolveBaseOptions, extractPRRefs, getYesterday } from "./fetch.js";
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

vi.mock("../../deployer/week.js", () => ({
  getWeekId: () => ({ year: 2026, week: 14, path: "2026/W14" }),
  getCurrentWeekId: () => ({ year: 2026, week: 14, path: "2026/W14" }),
}));

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
// getYesterday
// -------------------------------------------------------------------

describe("getYesterday", () => {
  it("returns yesterday's noon in UTC", () => {
    // Today is Apr 4 -> yesterday is Apr 3
    const now = new Date("2026-04-04T00:05:00Z");
    const yesterday = getYesterday(now, "UTC");
    expect(yesterday.toISOString()).toBe("2026-04-03T12:00:00.000Z");
  });

  it("Monday midnight: yesterday is Sunday", () => {
    // Mon Apr 6 00:00 UTC -> yesterday is Sun Apr 5
    const now = new Date("2026-04-06T00:00:00Z");
    const yesterday = getYesterday(now, "UTC");
    expect(yesterday.toISOString()).toBe("2026-04-05T12:00:00.000Z");
  });

  it("respects Asia/Tokyo timezone", () => {
    // Mon Apr 6 00:00 JST = 2026-04-05T15:00:00Z
    // Yesterday in JST = Sun Apr 5 -> noon JST = 03:00 UTC
    const now = new Date("2026-04-05T15:00:00Z");
    const yesterday = getYesterday(now, "Asia/Tokyo");
    expect(yesterday.toISOString()).toBe("2026-04-05T03:00:00.000Z");
  });

  it("year boundary: Jan 1 -> yesterday is Dec 31", () => {
    const now = new Date("2026-01-01T00:05:00Z");
    const yesterday = getYesterday(now, "UTC");
    expect(yesterday.toISOString()).toBe("2025-12-31T12:00:00.000Z");
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
