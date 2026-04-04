import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveOptions } from "./generate.js";

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
