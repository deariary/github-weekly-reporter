import { describe, it, expect } from "vitest";
import { buildReadme, weeklyCronUTC } from "./workflows.js";

describe("weeklyCronUTC", () => {
  // day-of-week: 0=Sunday, 1=Monday
  // For east-of-UTC timezones, local Monday 01:00 falls on UTC Sunday,
  // so day-of-week should be 0.

  it("returns Monday (1) for UTC", () => {
    expect(weeklyCronUTC("UTC")).toBe("0 1 * * 1");
  });

  it("returns Sunday (0) for Asia/Tokyo (UTC+9)", () => {
    // daily: 0 15 * * *, weekly: Mon 01:00 JST = Sun 16:00 UTC
    expect(weeklyCronUTC("Asia/Tokyo")).toBe("0 16 * * 0");
  });

  it("returns Monday (1) for America/New_York (UTC-5)", () => {
    // daily: 0 5 * * *, weekly: Mon 01:00 EST = Mon 06:00 UTC
    expect(weeklyCronUTC("America/New_York")).toBe("0 6 * * 1");
  });

  it("returns Monday (1) for America/Los_Angeles (UTC-8)", () => {
    // daily: 0 8 * * *, weekly: Mon 01:00 PST = Mon 09:00 UTC
    expect(weeklyCronUTC("America/Los_Angeles")).toBe("0 9 * * 1");
  });

  it("returns Sunday (0) for Asia/Shanghai (UTC+8)", () => {
    // daily: 0 16 * * *, weekly: Mon 01:00 CST = Sun 17:00 UTC
    expect(weeklyCronUTC("Asia/Shanghai")).toBe("0 17 * * 0");
  });

  it("returns Monday (1) for Europe/Berlin (UTC+1, standard time)", () => {
    // daily: 0 23 * * *, weekly: Mon 01:00 CET = Mon 00:00 UTC
    expect(weeklyCronUTC("Europe/Berlin")).toBe("0 0 * * 1");
  });

  it("returns Sunday (0) for Pacific/Auckland (UTC+13)", () => {
    // daily: 0 11 * * *, weekly: Mon 01:00 NZDT = Sun 12:00 UTC
    expect(weeklyCronUTC("Pacific/Auckland")).toBe("0 12 * * 0");
  });
});

describe("buildReadme", () => {
  const baseOpts = {
    siteTitle: "Dev Pulse",
    username: "testuser",
    repo: "testuser/weekly-report",
    pagesUrl: "https://testuser.github.io/weekly-report",
    language: "en" as const,
    timezone: "UTC",
    theme: "brutalist" as const,
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
