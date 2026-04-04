import { describe, it, expect } from "vitest";
import { buildLLMContext } from "./preprocess.js";
import type { NarrativeInput } from "./types.js";

const MOCK_INPUT: NarrativeInput = {
  username: "testuser",
  avatarUrl: "https://example.com/avatar.png",
  dateRange: { from: "2026-03-28", to: "2026-04-03" },
  stats: {
    totalCommits: 42,
    totalAdditions: 1200,
    totalDeletions: 300,
    prsOpened: 5,
    prsMerged: 3,
    prsReviewed: 8,
    issuesOpened: 2,
    issuesClosed: 1,
  },
  dailyCommits: [
    { date: "2026-03-28", count: 5 },
    { date: "2026-03-29", count: 0 },
  ],
  repositories: [
    { name: "org/repo-a", commits: 0, prsOpened: 3, prsMerged: 2, issuesOpened: 1, issuesClosed: 0, url: "" },
  ],
  pullRequests: [
    {
      title: "feat: add OAuth flow",
      body: "Added OAuth2 PKCE flow for GitHub",
      url: "",
      repository: "org/repo-a",
      state: "merged",
      labels: ["feature"],
      additions: 320,
      deletions: 45,
      changedFiles: 12,
      author: "testuser",
      createdAt: "2026-04-01T00:00:00Z",
      mergedAt: "2026-04-02T00:00:00Z",
    },
  ],
  issues: [],
  events: [
    {
      id: "12345",
      type: "PushEvent",
      repo: "org/repo-a",
      createdAt: "2026-04-01T10:00:00Z",
      payload: { kind: "push", ref: "refs/heads/main", commits: ["fix typo", "update deps"] },
    },
  ],
  externalContributions: [],
};

describe("buildLLMContext", () => {
  it("produces valid YAML string", () => {
    const context = buildLLMContext(MOCK_INPUT);
    expect(context).toContain("developer: testuser");
    expect(context).toContain("period:");
  });

  it("includes PR details", () => {
    const context = buildLLMContext(MOCK_INPUT);
    expect(context).toContain("feat: add OAuth flow");
    expect(context).toContain("+320 -45");
    expect(context).toContain("OAuth2 PKCE");
  });

  it("includes events with commit messages", () => {
    const context = buildLLMContext(MOCK_INPUT);
    expect(context).toContain("fix typo");
    expect(context).toContain("update deps");
  });

  it("includes stats as compact strings", () => {
    const context = buildLLMContext(MOCK_INPUT);
    expect(context).toContain("+1200 -300");
    expect(context).toContain("5 opened, 3 merged");
  });

  it("omits empty sections", () => {
    const minimal: NarrativeInput = {
      ...MOCK_INPUT,
      pullRequests: [],
      issues: [],
      events: [],
      externalContributions: [],
      repositories: [],
    };
    const context = buildLLMContext(minimal);
    expect(context).not.toContain("pull_requests:");
    expect(context).not.toContain("\nissues:");
    expect(context).not.toContain("events:");
  });

  it("includes issues when present", () => {
    const input: NarrativeInput = {
      ...MOCK_INPUT,
      issues: [
        {
          title: "Bug in parser",
          body: "Parser crashes on empty input",
          url: "https://github.com/org/repo-a/issues/5",
          repository: "org/repo-a",
          state: "closed",
          labels: ["bug"],
          author: "testuser",
          createdAt: "2026-04-01T00:00:00Z",
          closedAt: "2026-04-02T00:00:00Z",
        },
      ],
    };
    const context = buildLLMContext(input);
    expect(context).toContain("Bug in parser");
    expect(context).toContain("Parser crashes");
  });

  it("truncates PRs to MAX_PRS limit", () => {
    const manyPRs = Array.from({ length: 25 }, (_, i) => ({
      ...MOCK_INPUT.pullRequests[0],
      title: `PR #${i}`,
    }));
    const context = buildLLMContext({ ...MOCK_INPUT, pullRequests: manyPRs });
    const matches = context.match(/PR #\d+/g) ?? [];
    expect(matches.length).toBeLessThanOrEqual(20);
  });

  it("truncates events to MAX_EVENTS limit", () => {
    const manyEvents = Array.from({ length: 50 }, (_, i) => ({
      ...MOCK_INPUT.events[0],
      id: String(i),
    }));
    const context = buildLLMContext({ ...MOCK_INPUT, events: manyEvents });
    const refMatches = context.match(/refs\/heads\/main/g) ?? [];
    expect(refMatches.length).toBeLessThanOrEqual(40);
  });

  it("truncates repositories to 8", () => {
    const manyRepos = Array.from({ length: 12 }, (_, i) => ({
      ...MOCK_INPUT.repositories[0],
      name: `org/repo-${i}`,
    }));
    const context = buildLLMContext({ ...MOCK_INPUT, repositories: manyRepos });
    const repoMatches = context.match(/org\/repo-\d+/g) ?? [];
    expect(repoMatches.length).toBeLessThanOrEqual(8);
  });

  it("includes external contributions when present", () => {
    const input: NarrativeInput = {
      ...MOCK_INPUT,
      externalContributions: [
        {
          repo: "external/lib",
          events: [MOCK_INPUT.events[0]],
          pullRequests: [MOCK_INPUT.pullRequests[0]],
        },
      ],
    };
    const context = buildLLMContext(input);
    expect(context).toContain("external_contributions:");
    expect(context).toContain("external/lib");
  });

  it("includes review events", () => {
    const input: NarrativeInput = {
      ...MOCK_INPUT,
      events: [
        {
          id: "r1",
          type: "PullRequestReviewEvent",
          repo: "org/repo-a",
          createdAt: "2026-04-01T10:00:00Z",
          payload: { kind: "review", action: "submitted", prNumber: 42, prTitle: "Add feature", state: "approved" },
        },
      ],
    };
    const context = buildLLMContext(input);
    expect(context).toContain("Add feature");
    expect(context).toContain("approved");
  });

  it("includes release events", () => {
    const input: NarrativeInput = {
      ...MOCK_INPUT,
      events: [
        {
          id: "rel1",
          type: "ReleaseEvent",
          repo: "org/repo-a",
          createdAt: "2026-04-01T10:00:00Z",
          payload: { kind: "release", action: "published", tag: "v2.0.0", name: "Major Release" },
        },
      ],
    };
    const context = buildLLMContext(input);
    expect(context).toContain("v2.0.0");
    expect(context).toContain("Major Release");
  });

  it("filters out non-push/review/release events", () => {
    const input: NarrativeInput = {
      ...MOCK_INPUT,
      events: [
        {
          id: "g1",
          type: "WatchEvent",
          repo: "org/repo-a",
          createdAt: "2026-04-01T10:00:00Z",
          payload: { kind: "generic", action: "started" },
        },
      ],
    };
    const context = buildLLMContext(input);
    expect(context).not.toContain("events:");
  });

  it("truncates commits per push event", () => {
    const input: NarrativeInput = {
      ...MOCK_INPUT,
      events: [
        {
          id: "p1",
          type: "PushEvent",
          repo: "org/repo-a",
          createdAt: "2026-04-01T10:00:00Z",
          payload: {
            kind: "push",
            ref: "refs/heads/main",
            commits: Array.from({ length: 10 }, (_, i) => `commit ${i}`),
          },
        },
      ],
    };
    const context = buildLLMContext(input);
    const commitMatches = context.match(/commit \d+/g) ?? [];
    expect(commitMatches.length).toBeLessThanOrEqual(5);
  });
});
