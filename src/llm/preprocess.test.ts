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
});
