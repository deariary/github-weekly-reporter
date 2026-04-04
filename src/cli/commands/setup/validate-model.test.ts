import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateModel } from "./validate-model.js";

describe("validateModel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns valid for successful OpenAI response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 }),
    );
    const result = await validateModel("openai", "key", "gpt-4");
    expect(result.valid).toBe(true);
  });

  it("returns invalid for 404 model not found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('{"error": "model not found"}', { status: 404 }),
    );
    const result = await validateModel("openai", "key", "nonexistent");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("returns valid for 429 rate limit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("rate limited", { status: 429 }),
    );
    const result = await validateModel("openai", "key", "gpt-4");
    expect(result.valid).toBe(true);
  });

  it("validates groq provider", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 }),
    );
    await validateModel("groq", "key", "llama");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/chat/completions",
      expect.any(Object),
    );
  });

  it("validates openrouter provider", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 }),
    );
    await validateModel("openrouter", "key", "model");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.any(Object),
    );
  });

  it("validates grok provider", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 }),
    );
    await validateModel("grok", "key", "model");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.x.ai/v1/chat/completions",
      expect.any(Object),
    );
  });

  it("validates anthropic provider with special headers", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 }),
    );
    await validateModel("anthropic", "key", "claude-3");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-api-key": "key" }),
      }),
    );
  });

  it("validates gemini provider", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 }),
    );
    await validateModel("gemini", "key", "gemini-pro");
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("generativelanguage.googleapis.com"),
      expect.any(Object),
    );
  });

  it("returns valid for unknown provider", async () => {
    const result = await validateModel("unknown" as never, "key", "model");
    expect(result.valid).toBe(true);
  });

  it("returns connection error on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    const result = await validateModel("openai", "key", "gpt-4");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Connection error");
  });

  it("returns invalid for non-model API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("server error", { status: 500 }),
    );
    const result = await validateModel("openai", "key", "gpt-4");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("API error: 500");
  });
});
