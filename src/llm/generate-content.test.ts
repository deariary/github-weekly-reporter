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
});
