import { describe, it, expect } from "vitest";
import { buildPrompt } from "./prompt.js";
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
  dailyCommits: [],
  repositories: [
    { name: "org/repo-a", commits: 0, prsOpened: 3, prsMerged: 2, issuesOpened: 1, issuesClosed: 0, url: "" },
  ],
  pullRequests: [
    {
      title: "feat: add OAuth flow",
      body: "Added OAuth2 PKCE",
      url: "",
      repository: "org/repo-a",
      state: "merged",
      labels: [],
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
  externalContributions: [],
};

describe("buildPrompt", () => {
  it("includes system instructions", () => {
    const prompt = buildPrompt(MOCK_INPUT);
    expect(prompt).toContain("structured content");
    expect(prompt).toContain("First person");
  });

  it("includes activity data as YAML", () => {
    const prompt = buildPrompt(MOCK_INPUT);
    expect(prompt).toContain("developer: testuser");
    expect(prompt).toContain("feat: add OAuth flow");
  });

  it("includes PR details in context", () => {
    const prompt = buildPrompt(MOCK_INPUT);
    expect(prompt).toContain("+320 -45");
    expect(prompt).toContain("org/repo-a");
  });

  it("does not include language instruction for English", () => {
    const prompt = buildPrompt({ ...MOCK_INPUT, language: "en" });
    expect(prompt).not.toContain("Write ALL text content in Japanese");
  });

  it("includes Japanese language instruction", () => {
    const prompt = buildPrompt({ ...MOCK_INPUT, language: "ja" });
    expect(prompt).toContain("Write ALL text content in Japanese");
  });
});
