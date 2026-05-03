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

// Mock week (keep real isoWeekToMonday)
vi.mock("../../deployer/week.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../deployer/week.js")>();
  return {
    ...actual,
    getWeekId: () => ({ year: 2026, week: 14, path: "2026/W14" }),
  };
});

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
commitMessages: []
releases: []
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

    // Should write card SVGs with correct date range from weekId (2026 W14 = Mar 30 - Apr 5)
    const cardCall = mockWriteFile.mock.calls.find(
      (call: unknown[]) => typeof call[0] === "string" && (call[0] as string).endsWith("card.svg"),
    );
    expect(cardCall).toBeDefined();
    const cardSvg = cardCall![1] as string;
    expect(cardSvg).toContain("Week 14");
    expect(cardSvg).toContain("Mar 30");
    expect(cardSvg).toContain("Apr 5");
    expect(cardSvg).toContain("2026");
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

  it("links nextWeek and prevPrev when current week sits in the middle", async () => {
    const PREV_GITHUB_YAML = GITHUB_DATA_YAML.replace("2026-03-28", "2026-03-21").replace("2026-04-03", "2026-03-27");
    const PREV_LLM_YAML = LLM_DATA_YAML.replace("Weekly Summary", "Previous Week Summary");

    mockReadFile.mockImplementation((path: string) => {
      if (path.includes("W13") && path.includes("github-data.yaml")) return Promise.resolve(PREV_GITHUB_YAML);
      if (path.includes("W13") && path.includes("llm-data.yaml")) return Promise.resolve(PREV_LLM_YAML);
      if (path.includes("github-data.yaml")) return Promise.resolve(GITHUB_DATA_YAML);
      if (path.includes("llm-data.yaml")) return Promise.resolve(LLM_DATA_YAML);
      return Promise.reject(new Error("not found"));
    });

    // Four weeks exist: W12, W13, W14 (current), W15 — current is not last and prev has its own predecessor
    mockReaddir.mockImplementation((dir: string) => {
      if (dir.endsWith("data")) return Promise.resolve(["2026"]);
      if (dir.includes("2026")) return Promise.resolve(["W12", "W13", "W14", "W15"]);
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

    expect(mockRenderReport).toHaveBeenCalledTimes(2);

    // Current call should reference nextWeek (W15) — covers `currentIdx < length-1` truthy branch
    const currentCall = mockRenderReport.mock.calls[0];
    expect(currentCall[1]).toHaveProperty("nextWeek", "../../2026/W15/");
    expect(currentCall[1]).toHaveProperty("prevWeek", "../../2026/W13/");

    // Prev re-render should reference prevPrev (W12) — covers `prevIdx > 0` and `prevPrev` truthy branches
    const prevWeekCall = mockRenderReport.mock.calls[1];
    expect(prevWeekCall[1]).toHaveProperty("prevWeek", "../../2026/W12/");
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

  it("skips prev re-render and emits index entry without stats when prev github-data is missing", async () => {
    const PREV_LLM_YAML = LLM_DATA_YAML.replace("Weekly Summary", "Previous Week Summary");

    mockReadFile.mockImplementation((path: string) => {
      // W13 has llm-data only; its github-data.yaml is missing.
      if (path.includes("W13") && path.includes("github-data.yaml"))
        return Promise.reject(new Error("not found"));
      if (path.includes("W13") && path.includes("llm-data.yaml"))
        return Promise.resolve(PREV_LLM_YAML);
      if (path.includes("github-data.yaml")) return Promise.resolve(GITHUB_DATA_YAML);
      if (path.includes("llm-data.yaml")) return Promise.resolve(LLM_DATA_YAML);
      return Promise.reject(new Error("not found"));
    });

    // mockAccess resolves for everything — W13 IS listed in allPaths via listCompletedReportDirs.
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

    // Current week renders, but prev re-render is skipped because prevGhData is null
    // (covers `if (prevGhData && prevAiContent)` false branch).
    expect(mockRenderReport).toHaveBeenCalledTimes(1);

    // buildReportEntry was invoked for W13 with stats=undefined
    // (covers `const stats = ghData ? {...} : undefined` false branch).
    const w13EntryCall = mockBuildReportEntry.mock.calls.find(
      (call: unknown[]) => (call[0] as string) === "2026/W13",
    );
    expect(w13EntryCall).toBeDefined();
    expect(w13EntryCall![3]).toBeUndefined();
  });

  it("filters index entries when llm-data fails to load", async () => {
    mockReadFile.mockImplementation((path: string) => {
      // W13's llm-data.yaml fails to parse — entry should be filtered out.
      if (path.includes("W13") && path.includes("llm-data.yaml"))
        return Promise.reject(new Error("parse error"));
      if (path.includes("github-data.yaml")) return Promise.resolve(GITHUB_DATA_YAML);
      if (path.includes("llm-data.yaml")) return Promise.resolve(LLM_DATA_YAML);
      return Promise.reject(new Error("not found"));
    });

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

    // W13 is included in allPaths (its llm-data.yaml passes the access check),
    // but its tryReadYaml fails inside buildReportEntries → entry filtered out
    // (covers `if (!llmData) return null` true branch).
    const w13EntryCall = mockBuildReportEntry.mock.calls.find(
      (call: unknown[]) => (call[0] as string) === "2026/W13",
    );
    expect(w13EntryCall).toBeUndefined();

    // Index page still receives the surviving entries.
    expect(mockRenderIndexPage).toHaveBeenCalled();
    const entries = mockRenderIndexPage.mock.calls[0][0] as Array<{ path: string }>;
    expect(entries.every((e) => e.path !== "2026/W13")).toBe(true);
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

  it("exits when --theme is unknown", async () => {
    const { registerRender } = await import("./render.js");
    const program = new Command();
    registerRender(program);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      program.parseAsync([
        "node", "cli", "render",
        "--data-dir", "./data",
        "--output-dir", "./output",
        "--base-url", "https://example.com",
        "--theme", "not-a-real-theme",
      ]),
    ).rejects.toThrow("process.exit");

    expect(errorSpy).toHaveBeenCalled();
    const errorMsg = errorSpy.mock.calls.flat().join(" ");
    expect(errorMsg).toContain("Unknown theme");
  });

  it("falls back to ./data and ./output defaults when no opts or env vars", async () => {
    const orig = {
      data: process.env.DATA_DIR,
      out: process.env.OUTPUT_DIR,
    };
    delete process.env.DATA_DIR;
    delete process.env.OUTPUT_DIR;
    try {
      mockReadFile.mockImplementation((path: string) => {
        if (path.includes("github-data.yaml")) return Promise.resolve(GITHUB_DATA_YAML);
        if (path.includes("llm-data.yaml")) return Promise.resolve(LLM_DATA_YAML);
        return Promise.reject(new Error("not found"));
      });
      mockReaddir.mockResolvedValue([]);

      const { registerRender } = await import("./render.js");
      const program = new Command();
      registerRender(program);

      await program.parseAsync([
        "node", "cli", "render",
        "--base-url", "https://user.github.io/repo",
        "--date", "2026-04-01",
      ]);

      // First readFile call should target ./data/2026/W14/github-data.yaml
      const readPaths = mockReadFile.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(readPaths.some((p) => p.startsWith("data/") || p.includes("/data/"))).toBe(true);
      // Output should land under ./output
      const writePaths = mockWriteFile.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(writePaths.some((p) => typeof p === "string" && p.includes("output/"))).toBe(true);
    } finally {
      if (orig.data !== undefined) process.env.DATA_DIR = orig.data;
      if (orig.out !== undefined) process.env.OUTPUT_DIR = orig.out;
    }
  });

  it("logs non-Error rejection via instanceof Error false branch", async () => {
    mockReadFile.mockImplementation((path: string) => {
      if (path.includes("github-data.yaml")) return Promise.resolve(GITHUB_DATA_YAML);
      if (path.includes("llm-data.yaml")) return Promise.resolve(LLM_DATA_YAML);
      return Promise.reject(new Error("not found"));
    });
    mockReaddir.mockResolvedValue([]);
    mockRenderReport.mockImplementationOnce(() => { throw "string-failure"; });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { registerRender } = await import("./render.js");
    const program = new Command();
    registerRender(program);

    await expect(
      program.parseAsync([
        "node", "cli", "render",
        "--data-dir", "./data",
        "--output-dir", "./output",
        "--base-url", "https://user.github.io/repo",
        "--date", "2026-04-01",
      ]),
    ).rejects.toThrow("process.exit");

    const logged = errorSpy.mock.calls.flat();
    expect(logged).toContain("string-failure");
  });

  it("uses GITHUB_REPOSITORY env to compute repoUrl for index page", async () => {
    vi.stubEnv("GITHUB_REPOSITORY", "octo/awesome");

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

    // renderIndexPage signature: (entries, profile, language, siteTitle, base, repoUrl, theme)
    const indexCall = mockRenderIndexPage.mock.calls[0];
    expect(indexCall[5]).toBe("https://github.com/octo/awesome");
  });

  it("renders successfully when data dir does not exist (readdir rejects)", async () => {
    mockReadFile.mockImplementation((path: string) => {
      if (path.includes("github-data.yaml")) return Promise.resolve(GITHUB_DATA_YAML);
      if (path.includes("llm-data.yaml")) return Promise.resolve(LLM_DATA_YAML);
      return Promise.reject(new Error("not found"));
    });
    // Simulate ENOENT on the dataDir lookup inside listCompletedReportDirs
    mockReaddir.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));

    const { registerRender } = await import("./render.js");
    const program = new Command();
    registerRender(program);

    await program.parseAsync([
      "node", "cli", "render",
      "--data-dir", "./missing-data",
      "--output-dir", "./output",
      "--base-url", "https://user.github.io/repo",
      "--date", "2026-04-01",
    ]);

    // Render still succeeds for the current week, no prev/next links
    expect(mockRenderReport).toHaveBeenCalledTimes(1);
    const opts = mockRenderReport.mock.calls[0][1];
    expect(opts).toMatchObject({ prevWeek: undefined, nextWeek: undefined });
  });
});
