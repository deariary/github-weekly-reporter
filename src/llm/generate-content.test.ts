import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NarrativeInput, LLMConfig } from "./types.js";

const mockGenerate = vi.fn();

vi.mock("./providers/openai.js", () => ({
  createOpenAIProvider: () => ({ generate: mockGenerate }),
}));
vi.mock("./providers/anthropic.js", () => ({
  createAnthropicProvider: () => ({ generate: mockGenerate }),
}));
vi.mock("./providers/gemini.js", () => ({
  createGeminiProvider: () => ({ generate: mockGenerate }),
}));
vi.mock("./providers/openrouter.js", () => ({
  createOpenRouterProvider: () => ({ generate: mockGenerate }),
}));
vi.mock("./providers/groq.js", () => ({
  createGroqProvider: () => ({ generate: mockGenerate }),
}));
vi.mock("./providers/grok.js", () => ({
  createGrokProvider: () => ({ generate: mockGenerate }),
}));

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
  repositories: [],
  pullRequests: [
    {
      title: "feat: add OAuth flow",
      body: "OAuth2 PKCE",
      url: "https://github.com/org/repo/pull/1",
      repository: "org/repo",
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
  issues: [
    {
      title: "Bug in parser",
      body: "Parser fails",
      url: "https://github.com/org/repo/issues/5",
      repository: "org/repo",
      state: "closed",
      labels: ["bug"],
      author: "testuser",
      createdAt: "2026-04-01T00:00:00Z",
      closedAt: "2026-04-02T00:00:00Z",
    },
  ],
  events: [
    {
      id: "e1",
      type: "ReleaseEvent",
      repo: "org/repo",
      createdAt: "2026-04-01T10:00:00Z",
      payload: { kind: "release", action: "published", tag: "v1.0.0", name: "First Release" },
    },
  ],
  commitMessages: [],
  releases: [],
  externalContributions: [],
};

const config: LLMConfig = {
  provider: "openai",
  apiKey: "test-key",
  model: "gpt-4",
};

const VALID_YAML = `title: Weekly Summary
subtitle: A great week
overview: This was a productive week.
summaries:
  - type: commit-summary
    heading: 42 commits
    body: Lots of commits.
    chips:
      - label: lines
        value: "+1200 -300"
        color: green
highlights:
  - type: pr
    title: "feat: add OAuth flow"
    repo: org/repo
    meta: merged Apr 2
    body: Big PR.
  - type: issue
    title: Bug in parser
    repo: org/repo
    meta: closed
    body: Fixed a parser bug.
  - type: release
    title: v1.0.0
    repo: org/repo
    meta: published
    body: First release.
`;

describe("generateContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses valid YAML response into AIContent", async () => {
    mockGenerate.mockResolvedValue(VALID_YAML);
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);

    expect(result.title).toBe("Weekly Summary");
    expect(result.subtitle).toBe("A great week");
    expect(result.overview).toBe("This was a productive week.");
    expect(result.summaries).toHaveLength(1);
    expect(result.summaries[0].chips).toHaveLength(1);
    expect(result.highlights).toHaveLength(3);
  });

  it("strips code fences from LLM response", async () => {
    mockGenerate.mockResolvedValue("```yaml\n" + VALID_YAML + "\n```");
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);
    expect(result.title).toBe("Weekly Summary");
  });

  it("resolves PR highlight URLs", async () => {
    mockGenerate.mockResolvedValue(VALID_YAML);
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);
    const prHighlight = result.highlights.find((h) => h.type === "pr");
    expect(prHighlight?.url).toBe("https://github.com/org/repo/pull/1");
  });

  it("resolves issue highlight URLs", async () => {
    mockGenerate.mockResolvedValue(VALID_YAML);
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);
    const issueHighlight = result.highlights.find((h) => h.type === "issue");
    expect(issueHighlight?.url).toBe("https://github.com/org/repo/issues/5");
  });

  it("resolves release highlight URLs from events", async () => {
    mockGenerate.mockResolvedValue(VALID_YAML);
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);
    const releaseHighlight = result.highlights.find((h) => h.type === "release");
    expect(releaseHighlight?.url).toBe("https://github.com/org/repo/releases/tag/v1.0.0");
  });

  it("handles empty LLM response with error", async () => {
    mockGenerate.mockResolvedValue("");
    const { generateContent } = await import("./index.js");
    await expect(generateContent(MOCK_INPUT, config)).rejects.toThrow("LLM content generation failed");
  });

  it("does not resolve URL for unmatched highlight title", async () => {
    const yamlNoMatch = VALID_YAML.replace(
      '"feat: add OAuth flow"',
      '"some unknown PR title"',
    );
    mockGenerate.mockResolvedValue(yamlNoMatch);
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);
    const prHighlight = result.highlights.find((h) => h.type === "pr");
    expect(prHighlight?.url).toBeUndefined();
  });

  it("fixes unquoted +values in YAML", async () => {
    const yamlWithPlus = VALID_YAML.replace('"+1200 -300"', "+1200 -300");
    mockGenerate.mockResolvedValue(yamlWithPlus);
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);
    expect(result.summaries[0].chips![0].value).toBe("+1200 -300");
  });

  it("returns empty arrays when summaries/highlights missing", async () => {
    mockGenerate.mockResolvedValue("title: Simple\nsubtitle: Week\noverview: Basic.");
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);
    expect(result.summaries).toEqual([]);
    expect(result.highlights).toEqual([]);
  });

  it("resolves PR URL by partial title match", async () => {
    const yamlPartial = VALID_YAML.replace(
      '"feat: add OAuth flow"',
      '"add OAuth flow"',
    );
    mockGenerate.mockResolvedValue(yamlPartial);
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);
    const prHighlight = result.highlights.find((h) => h.type === "pr");
    expect(prHighlight?.url).toBe("https://github.com/org/repo/pull/1");
  });

  it("does not resolve URL for unmatched issue title", async () => {
    const yamlNoMatch = VALID_YAML.replace("Bug in parser", "Unknown issue title");
    mockGenerate.mockResolvedValue(yamlNoMatch);
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);
    const issueHighlight = result.highlights.find((h) => h.type === "issue");
    expect(issueHighlight?.url).toBeUndefined();
  });

  it("does not resolve URL for unmatched release", async () => {
    const yamlNoMatch = VALID_YAML.replace("v1.0.0", "v99.0.0");
    mockGenerate.mockResolvedValue(yamlNoMatch);
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);
    const releaseHighlight = result.highlights.find((h) => h.type === "release");
    expect(releaseHighlight?.url).toBeUndefined();
  });

  it("resolves release by name fallback", async () => {
    const yamlReleaseName = VALID_YAML.replace("v1.0.0", "First Release");
    mockGenerate.mockResolvedValue(yamlReleaseName);
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);
    const releaseHighlight = result.highlights.find((h) => h.type === "release");
    expect(releaseHighlight?.url).toBe("https://github.com/org/repo/releases/tag/v1.0.0");
  });

  it("passes through unknown highlight types without URL", async () => {
    const yamlUnknownType = `title: Test
subtitle: Sub
overview: Overview.
summaries: []
highlights:
  - type: other
    title: Something
    repo: org/repo
    meta: note
    body: An unknown type.
`;
    mockGenerate.mockResolvedValue(yamlUnknownType);
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);
    expect(result.highlights[0].url).toBeUndefined();
  });

  it("wraps provider error with context", async () => {
    mockGenerate.mockRejectedValue(new Error("API rate limit"));
    const { generateContent } = await import("./index.js");
    await expect(generateContent(MOCK_INPUT, config)).rejects.toThrow(
      "LLM content generation failed (openai): API rate limit",
    );
  });

  it("wraps non-Error throw with context", async () => {
    mockGenerate.mockRejectedValue("string error");
    const { generateContent } = await import("./index.js");
    await expect(generateContent(MOCK_INPUT, config)).rejects.toThrow(
      "LLM content generation failed (openai): string error",
    );
  });

  it("handles null LLM response", async () => {
    mockGenerate.mockResolvedValue(null);
    const { generateContent } = await import("./index.js");
    await expect(generateContent(MOCK_INPUT, config)).rejects.toThrow("LLM content generation failed");
  });

  it("parses ticker items from YAML when present", async () => {
    const yamlWithTicker = `title: Test
subtitle: Sub
overview: Overview.
summaries: []
highlights: []
ticker:
  - label: SHIP
    text: Released v1.0.0
  - label: REVIEW
    text: Reviewed 8 PRs
  - text: Item with no label
`;
    mockGenerate.mockResolvedValue(yamlWithTicker);
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);
    expect(result.ticker).toHaveLength(3);
    expect(result.ticker?.[0]).toEqual({ label: "SHIP", text: "Released v1.0.0" });
    expect(result.ticker?.[1]).toEqual({ label: "REVIEW", text: "Reviewed 8 PRs" });
    expect(result.ticker?.[2]).toEqual({ label: "", text: "Item with no label" });
  });

  it("handles summaries without chips field", async () => {
    const yamlNoChips = `title: Test
subtitle: Sub
overview: Overview.
summaries:
  - type: commit-summary
    heading: 10 commits
    body: Some commits.
highlights: []
`;
    mockGenerate.mockResolvedValue(yamlNoChips);
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);
    expect(result.summaries[0].chips).toBeUndefined();
  });

  it("defaults title, subtitle, and overview to empty strings when missing", async () => {
    const yamlMissing = `summaries: []
highlights: []
`;
    mockGenerate.mockResolvedValue(yamlMissing);
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);
    expect(result.title).toBe("");
    expect(result.subtitle).toBe("");
    expect(result.overview).toBe("");
  });

  it("defaults chip color to 'default' when omitted", async () => {
    const yamlNoColor = `title: Test
subtitle: Sub
overview: Overview.
summaries:
  - type: commit-summary
    heading: 10 commits
    body: Some commits.
    chips:
      - label: lines
        value: "+10"
highlights: []
`;
    mockGenerate.mockResolvedValue(yamlNoColor);
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);
    expect(result.summaries[0].chips![0].color).toBe("default");
  });

  it("defaults ticker text to empty string when missing", async () => {
    const yamlTickerNoText = `title: Test
subtitle: Sub
overview: Overview.
summaries: []
highlights: []
ticker:
  - label: SHIP
`;
    mockGenerate.mockResolvedValue(yamlTickerNoText);
    const { generateContent } = await import("./index.js");
    const result = await generateContent(MOCK_INPUT, config);
    expect(result.ticker?.[0]).toEqual({ label: "SHIP", text: "" });
  });

  it("appends parse-error hint when provider error mentions parse", async () => {
    mockGenerate.mockRejectedValue(new Error("failed to parse response"));
    const { generateContent } = await import("./index.js");
    await expect(generateContent(MOCK_INPUT, config)).rejects.toThrow(
      /Retry the command, or try a larger\/different model\./,
    );
  });
});
