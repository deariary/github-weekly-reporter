import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";

// Mock fs/promises
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockReaddir = vi.fn();
const mockMkdir = vi.fn();
const mockAccess = vi.fn();

vi.mock("node:fs/promises", () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  readdir: (...args: unknown[]) => mockReaddir(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  access: (...args: unknown[]) => mockAccess(...args),
}));

// Mock renderer
const mockRenderReport = vi.fn().mockReturnValue("<html>report</html>");
vi.mock("../../renderer/index.js", () => ({
  renderReport: (...args: unknown[]) => mockRenderReport(...args),
}));

// Mock index page
const mockRenderIndexPage = vi.fn().mockReturnValue("<html>index</html>");
const mockBuildReportEntry = vi.fn().mockImplementation((path: string, title?: string) => ({
  path,
  title: title ?? path,
}));
vi.mock("../../deployer/index-page.js", () => ({
  renderIndexPage: (...args: unknown[]) => mockRenderIndexPage(...args),
  buildReportEntry: (...args: unknown[]) => mockBuildReportEntry(...args),
}));

// Mock OG image
const mockGenerateOGImage = vi.fn().mockResolvedValue(Buffer.from("png-data"));
const mockGenerateIndexOGImage = vi.fn().mockResolvedValue(Buffer.from("index-png-data"));
vi.mock("../../renderer/og-image.js", () => ({
  generateOGImage: (...args: unknown[]) => mockGenerateOGImage(...args),
  generateIndexOGImage: (...args: unknown[]) => mockGenerateIndexOGImage(...args),
}));

// Mock RSS
const mockBuildRSSFeed = vi.fn().mockReturnValue("<?xml version=\"1.0\"?><rss></rss>");
vi.mock("../../renderer/rss.js", () => ({
  buildRSSFeed: (...args: unknown[]) => mockBuildRSSFeed(...args),
}));

// Mock week
vi.mock("../../deployer/week.js", () => ({
  getWeekId: () => ({ year: 2026, week: 14, path: "2026/W14" }),
}));

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

const LLM_DATA_YAML = `
title: Weekly Summary
subtitle: A great week
overview: Good stuff.
summaries: []
highlights: []
`;

describe("registerRender", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    // Default: llm-data.yaml exists for all directories
    mockAccess.mockResolvedValue(undefined);
    vi.spyOn(process, "exit").mockImplementation((() => { throw new Error("process.exit"); }) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("renders report and writes output files", async () => {
    // Mock readFile to return github-data and llm-data
    mockReadFile.mockImplementation((path: string) => {
      if (path.includes("github-data.yaml")) return Promise.resolve(GITHUB_DATA_YAML);
      if (path.includes("llm-data.yaml")) return Promise.resolve(LLM_DATA_YAML);
      return Promise.reject(new Error("not found"));
    });

    // Mock readdir for listReportDirs
    mockReaddir.mockImplementation((dir: string) => {
      if (dir.endsWith("data")) return Promise.resolve(["2026"]);
      if (dir.includes("2026")) return Promise.resolve(["W14"]);
      return Promise.resolve([]);
    });

    const { registerRender } = await import("./render.js");
    const program = new Command();
    registerRender(program);

    await program.parseAsync([
      "node", "cli",
      "render",
      "--data-dir", "./data",
      "--output-dir", "./output",
      "--base-url", "https://user.github.io/repo",
      "--language", "en",
      "--timezone", "UTC",
      "--date", "2026-04-01",
    ]);

    // Should write report HTML
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("index.html"),
      expect.any(String),
      "utf-8",
    );

    // Should generate OG image
    expect(mockGenerateOGImage).toHaveBeenCalled();

    // Should write sitemap
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("sitemap.xml"),
      expect.stringContaining("<?xml"),
      "utf-8",
    );

    // Should write robots.txt
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("robots.txt"),
      expect.stringContaining("User-agent"),
      "utf-8",
    );

    // Should write RSS feed
    expect(mockBuildRSSFeed).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("feed.xml"),
      expect.stringContaining("<?xml"),
      "utf-8",
    );

    // Should render index page
    expect(mockRenderIndexPage).toHaveBeenCalled();

    // Should generate index OG image
    expect(mockGenerateIndexOGImage).toHaveBeenCalled();
  });

  it("exits when github-data.yaml is missing", async () => {
    mockReadFile.mockRejectedValue(new Error("not found"));
    mockReaddir.mockResolvedValue([]);

    const { registerRender } = await import("./render.js");
    const program = new Command();
    registerRender(program);

    await expect(
      program.parseAsync([
        "node", "cli", "render",
        "--data-dir", "./data",
        "--output-dir", "./output",
        "--base-url", "https://example.com",
      ]),
    ).rejects.toThrow("process.exit");
  });

  it("writes CNAME for custom domain", async () => {
    mockReadFile.mockImplementation((path: string) => {
      if (path.includes("github-data.yaml")) return Promise.resolve(GITHUB_DATA_YAML);
      if (path.includes("llm-data.yaml")) return Promise.resolve(LLM_DATA_YAML);
      return Promise.reject(new Error("not found"));
    });
    mockReaddir.mockImplementation((dir: string) => {
      if (dir.endsWith("data")) return Promise.resolve(["2026"]);
      if (dir.includes("2026")) return Promise.resolve(["W14"]);
      return Promise.resolve([]);
    });

    const { registerRender } = await import("./render.js");
    const program = new Command();
    registerRender(program);

    await program.parseAsync([
      "node", "cli", "render",
      "--data-dir", "./data",
      "--output-dir", "./output",
      "--base-url", "https://custom-domain.com",
      "--date", "2026-04-01",
    ]);

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("CNAME"),
      "custom-domain.com\n",
      "utf-8",
    );
  });

  it("does not write CNAME for github.io domains", async () => {
    mockReadFile.mockImplementation((path: string) => {
      if (path.includes("github-data.yaml")) return Promise.resolve(GITHUB_DATA_YAML);
      if (path.includes("llm-data.yaml")) return Promise.resolve(LLM_DATA_YAML);
      return Promise.reject(new Error("not found"));
    });
    mockReaddir.mockImplementation((dir: string) => {
      if (dir.endsWith("data")) return Promise.resolve(["2026"]);
      if (dir.includes("2026")) return Promise.resolve(["W14"]);
      return Promise.resolve([]);
    });

    const { registerRender } = await import("./render.js");
    const program = new Command();
    registerRender(program);

    await program.parseAsync([
      "node", "cli", "render",
      "--data-dir", "./data",
      "--output-dir", "./output",
      "--base-url", "https://user.github.io/repo",
      "--date", "2026-04-01",
    ]);

    const cnameCall = mockWriteFile.mock.calls.find(
      (call: unknown[]) => typeof call[0] === "string" && (call[0] as string).includes("CNAME"),
    );
    expect(cnameCall).toBeUndefined();
  });

  it("exits when llm-data.yaml is missing", async () => {
    mockReadFile.mockImplementation((path: string) => {
      if (path.includes("github-data.yaml")) return Promise.resolve(GITHUB_DATA_YAML);
      return Promise.reject(new Error("not found"));
    });
    mockReaddir.mockResolvedValue([]);

    const { registerRender } = await import("./render.js");
    const program = new Command();
    registerRender(program);

    await expect(
      program.parseAsync([
        "node", "cli", "render",
        "--data-dir", "./data",
        "--output-dir", "./output",
        "--base-url", "https://example.com",
      ]),
    ).rejects.toThrow("process.exit");
  });

  it("exits when --base-url is not provided", async () => {
    const { registerRender } = await import("./render.js");
    const program = new Command();
    registerRender(program);

    await expect(
      program.parseAsync([
        "node", "cli", "render",
        "--data-dir", "./data",
        "--output-dir", "./output",
      ]),
    ).rejects.toThrow("process.exit");
  });

  it("re-renders previous week with next-week link", async () => {
    const PREV_GITHUB_YAML = GITHUB_DATA_YAML.replace("2026-03-28", "2026-03-21").replace("2026-04-03", "2026-03-27");
    const PREV_LLM_YAML = LLM_DATA_YAML.replace("Weekly Summary", "Previous Week Summary");

    mockReadFile.mockImplementation((path: string) => {
      if (path.includes("W13") && path.includes("github-data.yaml")) return Promise.resolve(PREV_GITHUB_YAML);
      if (path.includes("W13") && path.includes("llm-data.yaml")) return Promise.resolve(PREV_LLM_YAML);
      if (path.includes("github-data.yaml")) return Promise.resolve(GITHUB_DATA_YAML);
      if (path.includes("llm-data.yaml")) return Promise.resolve(LLM_DATA_YAML);
      return Promise.reject(new Error("not found"));
    });

    // Two weeks exist: W13 and W14
    mockReaddir.mockImplementation((dir: string) => {
      if (dir.endsWith("data")) return Promise.resolve(["2026"]);
      if (dir.includes("2026")) return Promise.resolve(["W13", "W14"]);
      return Promise.resolve([]);
    });

    const { registerRender } = await import("./render.js");
    const program = new Command();
    registerRender(program);

    await program.parseAsync([
      "node", "cli", "render",
      "--data-dir", "./data",
      "--output-dir", "./output",
      "--base-url", "https://user.github.io/repo",
      "--date", "2026-04-01",
    ]);

    // renderReport should be called twice: once for current week, once for previous week
    expect(mockRenderReport).toHaveBeenCalledTimes(2);

    // Second call should include nextWeek link
    const prevWeekCall = mockRenderReport.mock.calls[1];
    expect(prevWeekCall[1]).toHaveProperty("nextWeek", "../../2026/W14/");
  });

  it("skips prev week re-render when prev week data is missing", async () => {
    mockReadFile.mockImplementation((path: string) => {
      // Only current week has data
      if (path.includes("W13")) return Promise.reject(new Error("not found"));
      if (path.includes("github-data.yaml")) return Promise.resolve(GITHUB_DATA_YAML);
      if (path.includes("llm-data.yaml")) return Promise.resolve(LLM_DATA_YAML);
      return Promise.reject(new Error("not found"));
    });

    // W13 has no llm-data.yaml
    mockAccess.mockImplementation((path: string) =>
      path.includes("W13") ? Promise.reject(new Error("not found")) : Promise.resolve(undefined),
    );

    mockReaddir.mockImplementation((dir: string) => {
      if (dir.endsWith("data")) return Promise.resolve(["2026"]);
      if (dir.includes("2026")) return Promise.resolve(["W13", "W14"]);
      return Promise.resolve([]);
    });

    const { registerRender } = await import("./render.js");
    const program = new Command();
    registerRender(program);

    await program.parseAsync([
      "node", "cli", "render",
      "--data-dir", "./data",
      "--output-dir", "./output",
      "--base-url", "https://user.github.io/repo",
      "--date", "2026-04-01",
    ]);

    // Only current week should be rendered (prev week data is missing)
    expect(mockRenderReport).toHaveBeenCalledTimes(1);
  });

  it("uses environment variables for options", async () => {
    vi.stubEnv("BASE_URL", "https://env-base.example.com");
    vi.stubEnv("DATA_DIR", "./env-data");
    vi.stubEnv("OUTPUT_DIR", "./env-output");
    vi.stubEnv("LANGUAGE", "ja");
    vi.stubEnv("TIMEZONE", "Asia/Tokyo");
    vi.stubEnv("SITE_TITLE", "My Reports");

    mockReadFile.mockImplementation((path: string) => {
      if (path.includes("github-data.yaml")) return Promise.resolve(GITHUB_DATA_YAML);
      if (path.includes("llm-data.yaml")) return Promise.resolve(LLM_DATA_YAML);
      return Promise.reject(new Error("not found"));
    });
    mockReaddir.mockImplementation((dir: string) => {
      if (dir.endsWith("env-data")) return Promise.resolve(["2026"]);
      if (dir.includes("2026")) return Promise.resolve(["W14"]);
      return Promise.resolve([]);
    });

    const { registerRender } = await import("./render.js");
    const program = new Command();
    registerRender(program);

    await program.parseAsync(["node", "cli", "render"]);

    expect(mockRenderReport).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ language: "ja", siteTitle: "My Reports" }),
    );
  });
});
