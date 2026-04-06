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
  events: [],
  commitMessages: [],
  releases: [],
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
          events: [],
          pullRequests: [MOCK_INPUT.pullRequests[0]],
        },
      ],
    };
    const context = buildLLMContext(input);
    expect(context).toContain("external_contributions:");
    expect(context).toContain("external/lib");
  });

  it("includes commit messages when present", () => {
    const input: NarrativeInput = {
      ...MOCK_INPUT,
      commitMessages: [
        { repo: "org/repo-a", messages: ["feat: add OAuth flow", "fix: typo"] },
        { repo: "org/repo-b", messages: ["chore: update deps"] },
      ],
    };
    const context = buildLLMContext(input);
    expect(context).toContain("commit_messages:");
    expect(context).toContain("feat: add OAuth flow");
    expect(context).toContain("chore: update deps");
  });

  it("omits commit_messages when empty", () => {
    const context = buildLLMContext(MOCK_INPUT);
    expect(context).not.toContain("commit_messages:");
  });

  it("does not include push/generic events in LLM context", () => {
    const input: NarrativeInput = {
      ...MOCK_INPUT,
      events: [
        {
          id: "p1",
          type: "PushEvent",
          repo: "org/repo-a",
          createdAt: "2026-04-01T10:00:00Z",
          payload: { kind: "push", ref: "refs/heads/main", commits: [] },
        },
      ],
    };
    const context = buildLLMContext(input);
    expect(context).not.toContain("\nreviews:");
    expect(context).not.toContain("PushEvent");
  });

  it("includes review events in LLM context", () => {
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
    expect(context).toContain("reviews:");
    expect(context).toContain("Add feature");
    expect(context).toContain("approved");
  });

  it("includes releases with body in LLM context", () => {
    const input: NarrativeInput = {
      ...MOCK_INPUT,
      releases: [
        {
          repo: "org/repo-a",
          tag: "v2.0.0",
          name: "Major Release",
          body: "## What's Changed\n- Added OAuth2 flow\n- Fixed rate limiting",
          url: "https://github.com/org/repo-a/releases/tag/v2.0.0",
          publishedAt: "2026-04-01T10:00:00Z",
        },
      ],
    };
    const context = buildLLMContext(input);
    expect(context).toContain("releases:");
    expect(context).toContain("v2.0.0");
    expect(context).toContain("Major Release");
    expect(context).toContain("OAuth2 flow");
  });

  it("omits releases when empty", () => {
    const context = buildLLMContext(MOCK_INPUT);
    expect(context).not.toContain("releases:");
  });
});
