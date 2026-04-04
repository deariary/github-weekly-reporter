import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveBaseOptions, extractPRRefs } from "./fetch.js";
import type { GitHubEvent } from "../../types.js";

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
