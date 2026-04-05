import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { buildRepoUrl } from "./deploy.js";

// Mock deploy module
const mockDeploy = vi.fn().mockResolvedValue(undefined);
vi.mock("../../deployer/index.js", () => ({
  deploy: (...args: unknown[]) => mockDeploy(...args),
}));

vi.mock("../../deployer/week.js", () => ({
  getWeekId: () => ({ year: 2026, week: 14, path: "2026/W14" }),
}));

describe("buildRepoUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds authenticated URL from slug when token is set", () => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_abc123");
    const url = buildRepoUrl("owner/repo");
    expect(url).toBe(
      "https://x-access-token:ghp_abc123@github.com/owner/repo.git",
    );
  });

  it("builds public URL from slug when no token", () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    const url = buildRepoUrl("owner/repo");
    expect(url).toBe("https://github.com/owner/repo.git");
  });

  it("passes through full HTTPS URL without token", () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    const url = buildRepoUrl("https://github.com/owner/repo");
    expect(url).toBe("https://github.com/owner/repo");
  });

  it("injects token into full GitHub HTTPS URL", () => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_xyz");
    const url = buildRepoUrl("https://github.com/owner/repo");
    expect(url).toBe(
      "https://x-access-token:ghp_xyz@github.com/owner/repo",
    );
  });

  it("passes through git@ URL as-is", () => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_xyz");
    const url = buildRepoUrl("git@github.com:owner/repo.git");
    expect(url).toBe("git@github.com:owner/repo.git");
  });

  it("passes through non-GitHub HTTPS URL as-is", () => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_xyz");
    const url = buildRepoUrl("https://gitlab.com/owner/repo");
    expect(url).toBe("https://gitlab.com/owner/repo");
  });

  it("throws when no repo provided and GITHUB_REPOSITORY is unset", () => {
    vi.stubEnv("GITHUB_REPOSITORY", "");
    expect(() => buildRepoUrl(undefined)).toThrow("Repository required");
  });

  it("falls back to GITHUB_REPOSITORY env when repo arg is undefined", () => {
    vi.stubEnv("GITHUB_REPOSITORY", "env-owner/env-repo");
    vi.stubEnv("GITHUB_TOKEN", "");
    const url = buildRepoUrl(undefined);
    expect(url).toBe("https://github.com/env-owner/env-repo.git");
  });
});

describe("registerDeploy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, "exit").mockImplementation((() => { throw new Error("process.exit"); }) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("calls deploy with correct options", async () => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_test");
    const { Command } = await import("commander");
    const { registerDeploy } = await import("./deploy.js");
    const program = new Command();
    registerDeploy(program);

    await program.parseAsync([
      "node", "cli", "deploy",
      "--directory", "./output",
      "--repo", "owner/repo",
      "--timezone", "UTC",
      "--date", "2026-04-01",
    ]);

    expect(mockDeploy).toHaveBeenCalledWith({
      repoUrl: expect.stringContaining("owner/repo"),
      directory: "./output",
      message: "report: 2026/W14",
    });
  });

  it("exits on deploy error", async () => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_test");
    mockDeploy.mockRejectedValueOnce(new Error("deploy failed"));

    const { Command } = await import("commander");
    const { registerDeploy } = await import("./deploy.js");
    const program = new Command();
    registerDeploy(program);

    await expect(
      program.parseAsync([
        "node", "cli", "deploy",
        "--directory", "./output",
        "--repo", "owner/repo",
      ]),
    ).rejects.toThrow("process.exit");
  });

  it("uses environment variables for defaults", async () => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_env");
    vi.stubEnv("OUTPUT_DIR", "./env-output");
    vi.stubEnv("GITHUB_REPOSITORY", "env-owner/env-repo");
    vi.stubEnv("TIMEZONE", "Asia/Tokyo");

    const { Command } = await import("commander");
    const { registerDeploy } = await import("./deploy.js");
    const program = new Command();
    registerDeploy(program);

    await program.parseAsync(["node", "cli", "deploy"]);

    expect(mockDeploy).toHaveBeenCalledWith(
      expect.objectContaining({ directory: "./env-output" }),
    );
  });
});
