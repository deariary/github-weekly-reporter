import { describe, it, expect } from "vitest";
import { buildReadme } from "./workflows.js";

describe("buildReadme", () => {
  const baseOpts = {
    siteTitle: "Dev Pulse",
    username: "testuser",
    repo: "testuser/weekly-report",
    pagesUrl: "https://testuser.github.io/weekly-report",
    language: "en" as const,
    timezone: "UTC",
  };

  it("includes site title as heading", () => {
    const readme = buildReadme(baseOpts);
    expect(readme).toMatch(/^# Dev Pulse/);
  });

  it("includes username with link", () => {
    const readme = buildReadme(baseOpts);
    expect(readme).toContain("[@testuser](https://github.com/testuser)");
  });

  it("includes pages URL", () => {
    const readme = buildReadme(baseOpts);
    expect(readme).toContain("https://testuser.github.io/weekly-report");
  });

  it("includes timezone in description", () => {
    const readme = buildReadme({ ...baseOpts, timezone: "Asia/Tokyo" });
    expect(readme).toContain("Asia/Tokyo");
  });

  it("includes language in configuration table", () => {
    const readme = buildReadme(baseOpts);
    expect(readme).toContain("| `en` |");
  });

  it("includes LLM provider when specified", () => {
    const readme = buildReadme({
      ...baseOpts,
      llmProvider: "openai",
      llmModel: "gpt-4",
    });
    expect(readme).toContain("llm-provider");
    expect(readme).toContain("openai");
    expect(readme).toContain("gpt-4");
  });

  it("mentions AI narrative when provider is set", () => {
    const readme = buildReadme({ ...baseOpts, llmProvider: "groq", llmModel: "llama" });
    expect(readme).toContain("AI narrative");
  });

  it("omits LLM rows when no provider", () => {
    const readme = buildReadme(baseOpts);
    expect(readme).not.toContain("llm-provider");
  });

  it("includes base URL section", () => {
    const readme = buildReadme(baseOpts);
    expect(readme).toContain("BASE_URL");
    expect(readme).toContain("testuser.github.io/weekly-report");
  });

  it("includes correct secret name for provider", () => {
    const readme = buildReadme({ ...baseOpts, llmProvider: "groq", llmModel: "llama" });
    expect(readme).toContain("GROQ_API_KEY");
  });

  it("includes deariary footer", () => {
    const readme = buildReadme(baseOpts);
    expect(readme).toContain("deariary");
  });
});
