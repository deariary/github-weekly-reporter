import { describe, it, expect } from "vitest";
import { buildPrompt } from "./prompt.js";
import type { NarrativeInput } from "./types.js";

const MOCK_INPUT: NarrativeInput = {
  username: "testuser",
  avatarUrl: "https://example.com/avatar.png",
  dateRange: { from: "2026-03-28", to: "2026-04-03" },
  stats: {
    totalCommits: 42,
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
  languages: [
    { language: "TypeScript", bytes: 8000, percentage: 80, color: "#3178c6" },
  ],
  pullRequests: [],
  issues: [],
};

describe("buildPrompt", () => {
  it("includes username and date range", () => {
    const prompt = buildPrompt(MOCK_INPUT);
    expect(prompt).toContain("testuser");
    expect(prompt).toContain("2026-03-28");
    expect(prompt).toContain("2026-04-03");
  });

  it("includes stats", () => {
    const prompt = buildPrompt(MOCK_INPUT);
    expect(prompt).toContain("42 commits");
    expect(prompt).toContain("5 PRs opened");
    expect(prompt).toContain("3 merged");
  });

  it("includes repository summary", () => {
    const prompt = buildPrompt(MOCK_INPUT);
    expect(prompt).toContain("org/repo-a");
  });

  it("includes language breakdown", () => {
    const prompt = buildPrompt(MOCK_INPUT);
    expect(prompt).toContain("TypeScript");
    expect(prompt).toContain("80.0%");
  });
});
