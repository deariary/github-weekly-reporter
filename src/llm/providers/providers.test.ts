import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LLMConfig } from "../types.js";

// Mock OpenAI SDK
const mockCreate = vi.fn();
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function () {
    return { chat: { completions: { create: mockCreate } } };
  }),
}));

// Mock Anthropic SDK
const mockAnthropicCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function () {
    return { messages: { create: mockAnthropicCreate } };
  }),
}));

// Mock Gemini SDK
const mockGenerateContent = vi.fn();
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function () {
    return { getGenerativeModel: () => ({ generateContent: mockGenerateContent }) };
  }),
}));

const baseConfig: LLMConfig = {
  provider: "openai",
  apiKey: "test-key",
  model: "gpt-4",
};

describe("OpenAI provider", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns trimmed response content", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "  hello world  " } }],
    });
    const { createOpenAIProvider } = await import("./openai.js");
    const provider = createOpenAIProvider(baseConfig);
    const result = await provider.generate("test prompt");
    expect(result).toBe("hello world");
  });

  it("returns empty string when no content", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: null } }] });
    const { createOpenAIProvider } = await import("./openai.js");
    const provider = createOpenAIProvider(baseConfig);
    const result = await provider.generate("test");
    expect(result).toBe("");
  });

  it("passes correct parameters to API", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "ok" } }],
    });
    const { createOpenAIProvider } = await import("./openai.js");
    const provider = createOpenAIProvider(baseConfig);
    await provider.generate("my prompt");
    expect(mockCreate).toHaveBeenCalledWith({
      model: "gpt-4",
      messages: [{ role: "user", content: "my prompt" }],
      max_tokens: 16384,
      temperature: 0.7,
    });
  });
});

describe("OpenRouter provider", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns trimmed response content", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "  openrouter response  " } }],
    });
    const { createOpenRouterProvider } = await import("./openrouter.js");
    const provider = createOpenRouterProvider({ ...baseConfig, provider: "openrouter" });
    const result = await provider.generate("test");
    expect(result).toBe("openrouter response");
  });
});

describe("Groq provider", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns trimmed response content", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "  groq response  " } }],
    });
    const { createGroqProvider } = await import("./groq.js");
    const provider = createGroqProvider({ ...baseConfig, provider: "groq" });
    const result = await provider.generate("test");
    expect(result).toBe("groq response");
  });
});

describe("Grok provider", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns trimmed response content", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "  grok response  " } }],
    });
    const { createGrokProvider } = await import("./grok.js");
    const provider = createGrokProvider({ ...baseConfig, provider: "grok" });
    const result = await provider.generate("test");
    expect(result).toBe("grok response");
  });
});

describe("Anthropic provider", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns text content from response", async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: "  anthropic response  " }],
    });
    const { createAnthropicProvider } = await import("./anthropic.js");
    const provider = createAnthropicProvider({ ...baseConfig, provider: "anthropic" });
    const result = await provider.generate("test");
    expect(result).toBe("anthropic response");
  });

  it("returns empty string for non-text block", async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: "image", text: "" }],
    });
    const { createAnthropicProvider } = await import("./anthropic.js");
    const provider = createAnthropicProvider({ ...baseConfig, provider: "anthropic" });
    const result = await provider.generate("test");
    expect(result).toBe("");
  });
});

describe("Gemini provider", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns trimmed text from response", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "  gemini response  " },
    });
    const { createGeminiProvider } = await import("./gemini.js");
    const provider = createGeminiProvider({ ...baseConfig, provider: "gemini" });
    const result = await provider.generate("test");
    expect(result).toBe("gemini response");
  });
});
