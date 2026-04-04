import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { resolveOptions } from "./generate.js";

// Mock fs/promises
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
vi.mock("node:fs/promises", () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
}));

// Mock LLM
const mockGenerateContent = vi.fn().mockResolvedValue({
  title: "Test",
  subtitle: "Sub",
  overview: "Overview",
  summaries: [],
  highlights: [],
});
vi.mock("../../llm/index.js", () => ({
  generateContent: (...args: unknown[]) => mockGenerateContent(...args),
}));

// Mock week
vi.mock("../../deployer/week.js", () => ({
  getWeekId: () => ({ year: 2026, week: 14, path: "2026/W14" }),
}));

describe("resolveOptions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when provider is missing", () => {
    vi.stubEnv("LLM_PROVIDER", "");
    expect(() => resolveOptions({})).toThrow("LLM provider required");
  });

  it("throws when API key is missing", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(() =>
      resolveOptions({ llmProvider: "openai", llmModel: "gpt-4o" }),
    ).toThrow("LLM API key required");
  });

  it("throws when model is missing", () => {
    vi.stubEnv("LLM_MODEL", "");
    expect(() =>
      resolveOptions({ llmProvider: "openai", llmApiKey: "sk-xxx" }),
    ).toThrow("LLM model required");
  });

  it("maps openai provider to OPENAI_API_KEY env var", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-env");
    const result = resolveOptions({
      llmProvider: "openai",
      llmModel: "gpt-4o",
    });
    expect(result.llmApiKey).toBe("sk-env");
  });

  it("maps anthropic provider to ANTHROPIC_API_KEY env var", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant");
    const result = resolveOptions({
      llmProvider: "anthropic",
      llmModel: "claude-3",
    });
    expect(result.llmApiKey).toBe("sk-ant");
  });

  it("maps groq provider to GROQ_API_KEY env var", () => {
    vi.stubEnv("GROQ_API_KEY", "gsk-xxx");
    const result = resolveOptions({
      llmProvider: "groq",
      llmModel: "llama3",
    });
    expect(result.llmApiKey).toBe("gsk-xxx");
  });

  it("maps openrouter provider to OPENROUTER_API_KEY env var", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "or-xxx");
    const result = resolveOptions({
      llmProvider: "openrouter",
      llmModel: "meta-llama/llama-3",
    });
    expect(result.llmApiKey).toBe("or-xxx");
  });

  it("maps gemini provider to GEMINI_API_KEY env var", () => {
    vi.stubEnv("GEMINI_API_KEY", "gem-xxx");
    const result = resolveOptions({
      llmProvider: "gemini",
      llmModel: "gemini-pro",
    });
    expect(result.llmApiKey).toBe("gem-xxx");
  });

  it("maps grok provider to GROK_API_KEY env var", () => {
    vi.stubEnv("GROK_API_KEY", "xai-xxx");
    const result = resolveOptions({
      llmProvider: "grok",
      llmModel: "grok-1",
    });
    expect(result.llmApiKey).toBe("xai-xxx");
  });

  it("uses defaults for language, timezone, and dataDir", () => {
    const result = resolveOptions({
      llmProvider: "openai",
      llmApiKey: "sk-xxx",
      llmModel: "gpt-4o",
    });
    expect(result.language).toBe("en");
    expect(result.timezone).toBe("UTC");
    expect(result.dataDir).toBe("./data");
  });

  it("CLI args take precedence over env", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-env");
    vi.stubEnv("LLM_MODEL", "env-model");
    const result = resolveOptions({
      llmProvider: "openai",
      llmApiKey: "sk-cli",
      llmModel: "cli-model",
    });
    expect(result.llmApiKey).toBe("sk-cli");
    expect(result.llmModel).toBe("cli-model");
  });

  it("reads provider from env", () => {
    vi.stubEnv("LLM_PROVIDER", "groq");
    vi.stubEnv("GROQ_API_KEY", "gsk-xxx");
    vi.stubEnv("LLM_MODEL", "llama3");
    const result = resolveOptions({});
    expect(result.llmProvider).toBe("groq");
  });

  it("parses date option", () => {
    const result = resolveOptions({
      llmProvider: "openai",
      llmApiKey: "sk-xxx",
      llmModel: "gpt-4o",
      date: "2026-04-01",
      timezone: "UTC",
    });
    expect(result.date).toBeInstanceOf(Date);
  });

  it("date is undefined when not provided", () => {
    const result = resolveOptions({
      llmProvider: "openai",
      llmApiKey: "sk-xxx",
      llmModel: "gpt-4o",
    });
    expect(result.date).toBeUndefined();
  });
});

describe("registerGenerate", () => {
  const GITHUB_DATA_YAML = `
username: testuser
avatarUrl: https://example.com/avatar.png
dateRange:
  from: "2026-03-28"
  to: "2026-04-03"
stats:
  totalCommits: 42
  totalAdditions: 1200
  totalDeletions: 300
  prsOpened: 5
  prsMerged: 3
  prsReviewed: 8
  issuesOpened: 2
  issuesClosed: 1
dailyCommits: []
repositories: []
pullRequests: []
issues: []
events: []
externalContributions: []
`;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFile.mockResolvedValue(GITHUB_DATA_YAML);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads github-data and calls generateContent", async () => {
    const { Command } = await import("commander");
    const { registerGenerate } = await import("./generate.js");
    const program = new Command();
    registerGenerate(program);

    await program.parseAsync([
      "node", "cli", "generate",
      "--data-dir", "./data",
      "--llm-provider", "openai",
      "--llm-api-key", "sk-test",
      "--llm-model", "gpt-4o",
      "--language", "en",
      "--timezone", "UTC",
      "--date", "2026-04-01",
    ]);

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({ username: "testuser", language: "en" }),
      expect.objectContaining({ provider: "openai", model: "gpt-4o" }),
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("llm-data.yaml"),
      expect.any(String),
      "utf-8",
    );
  });

  it("exits on error", async () => {
    mockReadFile.mockRejectedValue(new Error("file not found"));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => { throw new Error("process.exit"); }) as never);

    const { Command } = await import("commander");
    const { registerGenerate } = await import("./generate.js");
    const program = new Command();
    registerGenerate(program);

    await expect(
      program.parseAsync([
        "node", "cli", "generate",
        "--llm-provider", "openai",
        "--llm-api-key", "sk-test",
        "--llm-model", "gpt-4o",
        "--date", "2026-04-01",
      ]),
    ).rejects.toThrow("process.exit");

    exitSpy.mockRestore();
  });
});
