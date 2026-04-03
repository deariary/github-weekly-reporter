import { describe, it, expect } from "vitest";
import { renderReport } from "./index.js";
import type { WeeklyReportData } from "../types.js";

const MOCK_DATA: WeeklyReportData = {
  username: "testuser",
  avatarUrl: "https://avatars.githubusercontent.com/u/12345",
  dateRange: { from: "2026-03-28", to: "2026-04-03" },
  stats: {
    totalCommits: 42,
    totalAdditions: 1200,
    totalDeletions: 300,
    prsOpened: 5,
    prsMerged: 3,
    prsReviewed: 8,
    issuesOpened: 2,
    issuesClosed: 1,
  },
  dailyCommits: [],
  repositories: [],
  pullRequests: [],
  issues: [],
  events: [],
  externalContributions: [],
  aiContent: null,
};

const MOCK_WITH_AI: WeeklyReportData = {
  ...MOCK_DATA,
  aiContent: {
    title: "Auth refactor completed",
    subtitle: "A focused backend week",
    overview: "First paragraph about the week.\n\nSecond paragraph with details.",
    summaries: [
      {
        type: "commit-summary",
        heading: "47 commits",
        body: "Lots of commits this week.",
        chips: [
          { label: "lines", value: "+1200 -300", color: "green" },
        ],
      },
    ],
    highlights: [
      {
        type: "pr",
        title: "feat: add OAuth flow",
        repo: "org/backend",
        meta: "merged Apr 2",
        body: "Big PR for auth.",
      },
    ],
  },
};

describe("renderReport", () => {
  it("produces valid HTML with DOCTYPE", () => {
    const html = renderReport(MOCK_DATA);
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("</html>");
  });

  it("includes username in nav", () => {
    const html = renderReport(MOCK_DATA);
    expect(html).toContain("testuser");
  });

  it("includes date range in header", () => {
    const html = renderReport(MOCK_DATA);
    expect(html).toContain("2026-03-28");
    expect(html).toContain("2026-04-03");
  });

  it("renders AI content when provided", () => {
    const html = renderReport(MOCK_WITH_AI);
    expect(html).toContain("Auth refactor completed");
    expect(html).toContain("A focused backend week");
    expect(html).toContain("First paragraph about the week.");
    expect(html).toContain("Second paragraph with details.");
  });

  it("renders summary sections", () => {
    const html = renderReport(MOCK_WITH_AI);
    expect(html).toContain("Summary");
    expect(html).toContain("commit-summary");
    expect(html).toContain("47 commits");
    expect(html).toContain("+1200 -300");
  });

  it("renders highlight cards", () => {
    const html = renderReport(MOCK_WITH_AI);
    expect(html).toContain("Highlights");
    expect(html).toContain("feat: add OAuth flow");
    expect(html).toContain("org/backend");
  });

  it("includes dofollow footer links", () => {
    const html = renderReport(MOCK_DATA);
    expect(html).toContain("deariary.com?utm_source=github-weekly-reporter&utm_medium=footer");
    expect(html).toContain("github-weekly-reporter");
    expect(html).not.toContain('rel="nofollow"');
  });

  it("includes OG meta tags", () => {
    const html = renderReport(MOCK_WITH_AI);
    expect(html).toContain("og:title");
    expect(html).toContain("Auth refactor completed");
  });

  it("omits AI sections when aiContent is null", () => {
    const html = renderReport(MOCK_DATA);
    const body = html.split("<body>")[1] ?? "";
    expect(body).not.toContain("Summary");
    expect(body).not.toContain("Highlights");
    expect(body).not.toContain('class="overview"');
  });

  it("renders dark theme (string argument for backward compatibility)", () => {
    const html = renderReport(MOCK_DATA, "dark");
    expect(html).toContain("#050505");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("renders with RenderOptions object", () => {
    const html = renderReport(MOCK_DATA, { theme: "dark", language: "en" });
    expect(html).toContain("#050505");
    expect(html).toContain('lang="en"');
  });

  it("renders Japanese locale", () => {
    const html = renderReport(MOCK_WITH_AI, { language: "ja" });
    expect(html).toContain('lang="ja"');
    expect(html).toContain("サマリー");
    expect(html).toContain("ハイライト");
    expect(html).toContain("すべての週");
  });

  it("defaults to lang=en", () => {
    const html = renderReport(MOCK_DATA);
    expect(html).toContain('lang="en"');
    expect(html).toContain("All weeks");
  });

  it("uses Zen Kaku Gothic New for Japanese", () => {
    const html = renderReport(MOCK_DATA, { language: "ja" });
    expect(html).toContain("Zen+Kaku+Gothic+New");
    expect(html).toContain("Zen Kaku Gothic New");
  });

  it("uses Schibsted Grotesk for English", () => {
    const html = renderReport(MOCK_DATA, { language: "en" });
    expect(html).toContain("Schibsted+Grotesk");
    expect(html).toContain("Schibsted Grotesk");
  });

  it("uses Space Mono for monospace", () => {
    const html = renderReport(MOCK_DATA, { language: "en" });
    expect(html).toContain("Space Mono");
  });

  it("uses IBM Plex Sans KR for Korean", () => {
    const html = renderReport(MOCK_DATA, { language: "ko" });
    expect(html).toContain("IBM+Plex+Sans+KR");
    expect(html).toContain("IBM Plex Sans KR");
  });

  it("uses Urbanist for Russian", () => {
    const html = renderReport(MOCK_DATA, { language: "ru" });
    expect(html).toContain("Urbanist");
  });

  it("renders Simplified Chinese locale", () => {
    const html = renderReport(MOCK_WITH_AI, { language: "zh-CN" });
    expect(html).toContain('lang="zh-CN"');
    expect(html).toContain("摘要");
    expect(html).toContain("Noto Sans SC");
  });
});
