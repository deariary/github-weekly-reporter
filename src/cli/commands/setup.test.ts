import { describe, it, expect } from "vitest";
import { midnightCronUTC, buildDailyWorkflow, buildWeeklyWorkflow } from "./setup.js";
import type { WorkflowOpts } from "./setup.js";

// -------------------------------------------------------------------
// midnightCronUTC
// -------------------------------------------------------------------

describe("midnightCronUTC", () => {
  it("returns '0 0 * * *' for UTC (no offset)", () => {
    expect(midnightCronUTC("UTC")).toBe("0 0 * * *");
  });

  it("returns a valid cron expression for Asia/Tokyo (+9)", () => {
    // Midnight JST = 15:00 UTC previous day
    const cron = midnightCronUTC("Asia/Tokyo");
    expect(cron).toBe("0 15 * * *");
  });

  it("returns a valid cron expression for America/New_York", () => {
    // The offset depends on DST, so just verify format
    const cron = midnightCronUTC("America/New_York");
    const parts = cron.split(" ");
    expect(parts).toHaveLength(5);
    expect(parts[2]).toBe("*");
    expect(parts[3]).toBe("*");
    expect(parts[4]).toBe("*");
    // Minute and hour should be non-negative integers
    expect(Number(parts[0])).toBeGreaterThanOrEqual(0);
    expect(Number(parts[1])).toBeGreaterThanOrEqual(0);
    expect(Number(parts[1])).toBeLessThan(24);
  });

  it("handles half-hour offset (Asia/Kolkata +5:30)", () => {
    // Midnight IST = 18:30 UTC previous day
    const cron = midnightCronUTC("Asia/Kolkata");
    expect(cron).toBe("30 18 * * *");
  });
});

// -------------------------------------------------------------------
// buildDailyWorkflow
// -------------------------------------------------------------------

describe("buildDailyWorkflow", () => {
  const baseOpts: WorkflowOpts = {
    username: "alice",
    language: "en",
    timezone: "UTC",
    siteTitle: "DevPulse",
  };

  it("contains the workflow name", () => {
    const yaml = buildDailyWorkflow(baseOpts);
    expect(yaml).toContain("name: Daily Fetch");
  });

  it("contains the username", () => {
    const yaml = buildDailyWorkflow(baseOpts);
    expect(yaml).toContain("username: 'alice'");
  });

  it("contains the timezone", () => {
    const yaml = buildDailyWorkflow({ ...baseOpts, timezone: "Asia/Tokyo" });
    const yaml2 = buildDailyWorkflow(baseOpts);
    expect(yaml).toContain("timezone: 'Asia/Tokyo'");
    expect(yaml2).toContain("timezone: 'UTC'");
  });

  it("contains the cron schedule", () => {
    const yaml = buildDailyWorkflow(baseOpts);
    expect(yaml).toContain("cron:");
    expect(yaml).toContain("0 0 * * *");
  });

  it("contains the language", () => {
    const yaml = buildDailyWorkflow({ ...baseOpts, language: "ja" });
    expect(yaml).toContain("language: 'ja'");
  });

  it("contains mode: daily", () => {
    const yaml = buildDailyWorkflow(baseOpts);
    expect(yaml).toContain("mode: 'daily'");
  });
});

// -------------------------------------------------------------------
// buildWeeklyWorkflow
// -------------------------------------------------------------------

describe("buildWeeklyWorkflow", () => {
  const baseOpts: WorkflowOpts = {
    username: "alice",
    language: "en",
    timezone: "UTC",
    siteTitle: "DevPulse",
  };

  it("contains the workflow name", () => {
    const yaml = buildWeeklyWorkflow(baseOpts);
    expect(yaml).toContain("name: Weekly Report");
  });

  it("contains the username and language", () => {
    const yaml = buildWeeklyWorkflow(baseOpts);
    expect(yaml).toContain("username: 'alice'");
    expect(yaml).toContain("language: 'en'");
  });

  it("contains the site title in env", () => {
    const yaml = buildWeeklyWorkflow(baseOpts);
    expect(yaml).toContain("SITE_TITLE: 'DevPulse'");
  });

  it("schedules on Monday (day 1)", () => {
    const yaml = buildWeeklyWorkflow(baseOpts);
    // Cron should end with "1" for Monday
    const cronMatch = yaml.match(/cron:\s*'([^']+)'/);
    expect(cronMatch).not.toBeNull();
    const parts = cronMatch![1].split(" ");
    expect(parts[4]).toBe("1");
  });

  it("includes LLM inputs when provider, model, and secretName are provided", () => {
    const opts: WorkflowOpts = {
      ...baseOpts,
      llmProvider: "openai",
      llmModel: "gpt-4o",
      llmSecretName: "OPENAI_API_KEY",
    };
    const yaml = buildWeeklyWorkflow(opts);
    expect(yaml).toContain("llm-provider: 'openai'");
    expect(yaml).toContain("llm-model: 'gpt-4o'");
    expect(yaml).toContain("openai-api-key:");
    expect(yaml).toContain("secrets.OPENAI_API_KEY");
  });

  it("omits LLM inputs when not provided", () => {
    const yaml = buildWeeklyWorkflow(baseOpts);
    expect(yaml).not.toContain("llm-provider:");
    expect(yaml).not.toContain("llm-model:");
  });

  it("omits LLM inputs when only provider is provided (missing model/secret)", () => {
    const opts: WorkflowOpts = {
      ...baseOpts,
      llmProvider: "openai",
    };
    const yaml = buildWeeklyWorkflow(opts);
    expect(yaml).not.toContain("llm-provider:");
    expect(yaml).not.toContain("llm-model:");
  });

  it("uses correct API key input name per provider", () => {
    const opts: WorkflowOpts = {
      ...baseOpts,
      llmProvider: "groq",
      llmModel: "llama3",
      llmSecretName: "GROQ_API_KEY",
    };
    const yaml = buildWeeklyWorkflow(opts);
    expect(yaml).toContain("groq-api-key:");
    expect(yaml).toContain("secrets.GROQ_API_KEY");
  });
});
