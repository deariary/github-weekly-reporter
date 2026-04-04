import { describe, it, expect, vi, afterEach } from "vitest";
import { buildRepoUrl } from "./deploy.js";

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
