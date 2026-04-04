import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { midnightCronUTC, buildDailyWorkflow, buildWeeklyWorkflow } from "./setup.js";
import type { WorkflowOpts } from "./setup.js";

// ── Mocks for interactive setup ──────────────────────────────

const mockInput = vi.fn();
const mockSelect = vi.fn();
const mockPassword = vi.fn();
const mockConfirm = vi.fn();

vi.mock("@inquirer/prompts", () => ({
  input: (...args: unknown[]) => mockInput(...args),
  select: (...args: unknown[]) => mockSelect(...args),
  password: (...args: unknown[]) => mockPassword(...args),
  confirm: (...args: unknown[]) => mockConfirm(...args),
}));

const mockValidateToken = vi.fn();
const mockEnsureRepo = vi.fn();
const mockAddFileToRepo = vi.fn();
const mockEnablePages = vi.fn();
const mockSetRepoSecret = vi.fn();
const mockGhGet = vi.fn();
const mockGhPost = vi.fn();
const mockSleep = vi.fn();

vi.mock("./setup/github-api.js", () => ({
  validateToken: (...args: unknown[]) => mockValidateToken(...args),
  ensureRepo: (...args: unknown[]) => mockEnsureRepo(...args),
  addFileToRepo: (...args: unknown[]) => mockAddFileToRepo(...args),
  enablePages: (...args: unknown[]) => mockEnablePages(...args),
  setRepoSecret: (...args: unknown[]) => mockSetRepoSecret(...args),
  ghGet: (...args: unknown[]) => mockGhGet(...args),
  ghPost: (...args: unknown[]) => mockGhPost(...args),
  sleep: (...args: unknown[]) => mockSleep(...args),
}));

const mockValidateModel = vi.fn();
vi.mock("./setup/validate-model.js", () => ({
  validateModel: (...args: unknown[]) => mockValidateModel(...args),
}));

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

// -------------------------------------------------------------------
// registerSetup (interactive setup flow)
// -------------------------------------------------------------------

const setupPromptDefaults = () => {
  // password: token
  mockPassword
    .mockResolvedValueOnce("ghp_testtoken123")
    // password: LLM API key
    .mockResolvedValueOnce("sk-llm-key");

  // validateToken
  mockValidateToken.mockResolvedValue({ login: "testuser", tokenType: "classic" });

  // input: username, repo, site title, model name
  mockInput
    .mockResolvedValueOnce("testuser")   // username
    .mockResolvedValueOnce("my-reports") // repo
    .mockResolvedValueOnce("Dev Pulse")  // site title
    .mockResolvedValueOnce("gpt-4o");    // model

  // select: language, timezone, LLM provider
  mockSelect
    .mockResolvedValueOnce("en")         // language
    .mockResolvedValueOnce("UTC")        // timezone
    .mockResolvedValueOnce("openai");    // LLM provider

  // validateModel
  mockValidateModel.mockResolvedValue({ valid: true });

  // confirm: proceed
  mockConfirm.mockResolvedValue(true);

  // setup actions
  mockEnsureRepo.mockResolvedValue(true);
  mockSetRepoSecret.mockResolvedValue(true);
  mockAddFileToRepo.mockResolvedValue(undefined);
  mockEnablePages.mockResolvedValue("https://testuser.github.io/my-reports");
  mockSleep.mockResolvedValue(undefined);
  mockGhPost.mockResolvedValue({ ok: true });
  mockGhGet.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ workflow_runs: [{ html_url: "https://github.com/testuser/my-reports/actions/runs/123" }] }),
  });
};

describe("registerSetup (full flow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("completes full setup flow successfully", async () => {
    setupPromptDefaults();

    const { Command } = await import("commander");
    const { registerSetup } = await import("./setup.js");
    const program = new Command();
    registerSetup(program);
    await program.parseAsync(["node", "cli", "setup"]);

    // Validated token
    expect(mockValidateToken).toHaveBeenCalledWith("ghp_testtoken123");

    // Created repo
    expect(mockEnsureRepo).toHaveBeenCalledWith("ghp_testtoken123", "testuser/my-reports");

    // Set GH_PAT secret
    expect(mockSetRepoSecret).toHaveBeenCalledWith(
      "ghp_testtoken123", "testuser/my-reports", "GH_PAT", "ghp_testtoken123",
    );

    // Set LLM secret
    expect(mockSetRepoSecret).toHaveBeenCalledWith(
      "ghp_testtoken123", "testuser/my-reports", "OPENAI_API_KEY", "sk-llm-key",
    );

    // Added 3 files: daily workflow, weekly workflow, README
    expect(mockAddFileToRepo).toHaveBeenCalledTimes(3);
    expect(mockAddFileToRepo).toHaveBeenCalledWith(
      "ghp_testtoken123", "testuser/my-reports",
      ".github/workflows/daily-fetch.yml", expect.any(String), expect.any(String),
    );
    expect(mockAddFileToRepo).toHaveBeenCalledWith(
      "ghp_testtoken123", "testuser/my-reports",
      ".github/workflows/weekly-report.yml", expect.any(String), expect.any(String),
    );
    expect(mockAddFileToRepo).toHaveBeenCalledWith(
      "ghp_testtoken123", "testuser/my-reports",
      "README.md", expect.any(String), expect.any(String),
    );

    // Enabled pages
    expect(mockEnablePages).toHaveBeenCalledWith("ghp_testtoken123", "testuser/my-reports");

    // Triggered workflow dispatch
    expect(mockGhPost).toHaveBeenCalledWith(
      "ghp_testtoken123",
      "/repos/testuser/my-reports/actions/workflows/weekly-report.yml/dispatches",
      { ref: "main" },
    );
  });

  it("uses --repo flag to skip repo prompt", async () => {
    // Same prompts but no repo input (3 inputs instead of 4: username, siteTitle, model)
    mockPassword
      .mockResolvedValueOnce("ghp_token")
      .mockResolvedValueOnce("sk-key");
    mockValidateToken.mockResolvedValue({ login: "testuser", tokenType: "classic" });
    mockInput
      .mockResolvedValueOnce("testuser")  // username
      .mockResolvedValueOnce("Dev Pulse") // site title
      .mockResolvedValueOnce("gpt-4o");   // model
    mockSelect
      .mockResolvedValueOnce("en")
      .mockResolvedValueOnce("UTC")
      .mockResolvedValueOnce("openai");
    mockValidateModel.mockResolvedValue({ valid: true });
    mockConfirm.mockResolvedValue(true);
    mockEnsureRepo.mockResolvedValue(false);
    mockSetRepoSecret.mockResolvedValue(true);
    mockAddFileToRepo.mockResolvedValue(undefined);
    mockEnablePages.mockResolvedValue("https://testuser.github.io/existing-repo");
    mockSleep.mockResolvedValue(undefined);
    mockGhPost.mockResolvedValue({ ok: false });

    const { Command } = await import("commander");
    const { registerSetup } = await import("./setup.js");
    const program = new Command();
    registerSetup(program);
    await program.parseAsync(["node", "cli", "setup", "--repo", "testuser/existing-repo"]);

    expect(mockEnsureRepo).toHaveBeenCalledWith("ghp_token", "testuser/existing-repo");
  });

  it("cancels when user declines confirmation", async () => {
    mockPassword
      .mockResolvedValueOnce("ghp_token")
      .mockResolvedValueOnce("sk-key");
    mockValidateToken.mockResolvedValue({ login: "testuser", tokenType: "classic" });
    mockInput
      .mockResolvedValueOnce("testuser")
      .mockResolvedValueOnce("my-reports")
      .mockResolvedValueOnce("Dev Pulse")
      .mockResolvedValueOnce("gpt-4o");
    mockSelect
      .mockResolvedValueOnce("en")
      .mockResolvedValueOnce("UTC")
      .mockResolvedValueOnce("openai");
    mockValidateModel.mockResolvedValue({ valid: true });
    mockConfirm.mockResolvedValue(false); // decline

    const { Command } = await import("commander");
    const { registerSetup } = await import("./setup.js");
    const program = new Command();
    registerSetup(program);
    await program.parseAsync(["node", "cli", "setup"]);

    // Should not have called any setup actions
    expect(mockEnsureRepo).not.toHaveBeenCalled();
    expect(mockSetRepoSecret).not.toHaveBeenCalled();
    expect(mockAddFileToRepo).not.toHaveBeenCalled();
  });

  it("throws when GH_PAT secret fails", async () => {
    setupPromptDefaults();
    mockSetRepoSecret.mockResolvedValue(false); // fail on GH_PAT

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => { throw new Error("process.exit"); }) as never);

    const { Command } = await import("commander");
    const { registerSetup } = await import("./setup.js");
    const program = new Command();
    registerSetup(program);

    await expect(program.parseAsync(["node", "cli", "setup"])).rejects.toThrow("process.exit");
    exitSpy.mockRestore();
  });

  it("retries model validation on failure", async () => {
    mockPassword
      .mockResolvedValueOnce("ghp_token")
      .mockResolvedValueOnce("sk-key");
    mockValidateToken.mockResolvedValue({ login: "testuser", tokenType: "classic" });
    mockInput
      .mockResolvedValueOnce("testuser")
      .mockResolvedValueOnce("my-reports")
      .mockResolvedValueOnce("Dev Pulse")
      .mockResolvedValueOnce("bad-model")  // first attempt: invalid
      .mockResolvedValueOnce("good-model"); // second attempt: valid
    mockSelect
      .mockResolvedValueOnce("en")
      .mockResolvedValueOnce("UTC")
      .mockResolvedValueOnce("openai");
    mockValidateModel
      .mockResolvedValueOnce({ valid: false, error: "Model not found" })
      .mockResolvedValueOnce({ valid: true });
    mockConfirm
      .mockResolvedValueOnce(true)  // retry model
      .mockResolvedValueOnce(true); // proceed with setup
    mockEnsureRepo.mockResolvedValue(true);
    mockSetRepoSecret.mockResolvedValue(true);
    mockAddFileToRepo.mockResolvedValue(undefined);
    mockEnablePages.mockResolvedValue("https://testuser.github.io/my-reports");
    mockSleep.mockResolvedValue(undefined);
    mockGhPost.mockResolvedValue({ ok: true });
    mockGhGet.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ workflow_runs: [] }),
    });

    const { Command } = await import("commander");
    const { registerSetup } = await import("./setup.js");
    const program = new Command();
    registerSetup(program);
    await program.parseAsync(["node", "cli", "setup"]);

    // Should have called validateModel twice
    expect(mockValidateModel).toHaveBeenCalledTimes(2);
    expect(mockValidateModel).toHaveBeenCalledWith("openai", "sk-key", "bad-model");
    expect(mockValidateModel).toHaveBeenCalledWith("openai", "sk-key", "good-model");
  });

  it("handles custom timezone with __other__", async () => {
    mockPassword
      .mockResolvedValueOnce("ghp_token")
      .mockResolvedValueOnce("sk-key");
    mockValidateToken.mockResolvedValue({ login: "testuser", tokenType: "classic" });
    mockInput
      .mockResolvedValueOnce("testuser")
      .mockResolvedValueOnce("my-reports")
      .mockResolvedValueOnce("Dev Pulse")
      .mockResolvedValueOnce("Asia/Taipei") // custom timezone
      .mockResolvedValueOnce("gpt-4o");
    mockSelect
      .mockResolvedValueOnce("en")
      .mockResolvedValueOnce("__other__") // triggers manual timezone input
      .mockResolvedValueOnce("openai");
    mockValidateModel.mockResolvedValue({ valid: true });
    mockConfirm.mockResolvedValue(true);
    mockEnsureRepo.mockResolvedValue(true);
    mockSetRepoSecret.mockResolvedValue(true);
    mockAddFileToRepo.mockResolvedValue(undefined);
    mockEnablePages.mockResolvedValue("https://testuser.github.io/my-reports");
    mockSleep.mockResolvedValue(undefined);
    mockGhPost.mockResolvedValue({ ok: true });
    mockGhGet.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ workflow_runs: [] }),
    });

    const { Command } = await import("commander");
    const { registerSetup } = await import("./setup.js");
    const program = new Command();
    registerSetup(program);
    await program.parseAsync(["node", "cli", "setup"]);

    // The daily workflow should use the custom timezone
    const dailyCall = mockAddFileToRepo.mock.calls.find(
      (call: unknown[]) => (call[2] as string).includes("daily-fetch.yml"),
    );
    expect(dailyCall).toBeDefined();
    expect(dailyCall![3]).toContain("Asia/Taipei");
  });

  it("handles Pages enable failure gracefully", async () => {
    setupPromptDefaults();
    mockEnablePages.mockRejectedValue(new Error("Pages already enabled"));

    const { Command } = await import("commander");
    const { registerSetup } = await import("./setup.js");
    const program = new Command();
    registerSetup(program);

    // Should not throw
    await program.parseAsync(["node", "cli", "setup"]);
    expect(mockEnablePages).toHaveBeenCalled();
    // Setup continues after Pages failure
    expect(mockGhPost).toHaveBeenCalled();
  });
});
