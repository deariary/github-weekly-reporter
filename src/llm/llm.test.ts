import { describe, it, expect, vi } from "vitest";
import { generateNarrative } from "./index.js";
import type { LLMConfig } from "./types.js";
import type { NarrativeInput } from "./types.js";

const MOCK_INPUT: NarrativeInput = {
  username: "testuser",
  avatarUrl: "https://example.com/avatar.png",
  dateRange: { from: "2026-03-28", to: "2026-04-03" },
  stats: { totalCommits: 10, totalAdditions: 100, totalDeletions: 20, prsOpened: 2, prsMerged: 1, prsReviewed: 3, issuesOpened: 1, issuesClosed: 0 },
  dailyCommits: [],
  repositories: [],
  languages: [],
  pullRequests: [],
  issues: [],
  events: [],
};

describe("generateNarrative", () => {
  it("returns null and logs warning when LLM call fails", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const config: LLMConfig = { provider: "openai", apiKey: "invalid-key", model: "gpt-4o-mini" };
    const result = await generateNarrative(MOCK_INPUT, config);

    expect(result).toBeNull();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("LLM narrative generation failed"),
    );

    spy.mockRestore();
  });
});
