import { describe, it, expect } from "vitest";
import { generateContent } from "./index.js";
import type { LLMConfig } from "./types.js";
import type { NarrativeInput } from "./types.js";

const MOCK_INPUT: NarrativeInput = {
  username: "testuser",
  avatarUrl: "https://example.com/avatar.png",
  dateRange: { from: "2026-03-28", to: "2026-04-03" },
  stats: { totalCommits: 10, totalAdditions: 100, totalDeletions: 20, prsOpened: 2, prsMerged: 1, prsReviewed: 3, issuesOpened: 1, issuesClosed: 0 },
  dailyCommits: [],
  repositories: [],
  pullRequests: [],
  issues: [],
  events: [],
  commitMessages: [],
  releases: [],
  externalContributions: [],
};

describe("generateContent", () => {
  it("throws when LLM call fails", async () => {
    const config: LLMConfig = { provider: "openai", apiKey: "invalid-key", model: "gpt-4o-mini" };

    await expect(generateContent(MOCK_INPUT, config)).rejects.toThrow(
      "LLM content generation failed",
    );
  });
});
