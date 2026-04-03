import { describe, it, expect } from "vitest";
import { renderReport } from "./index.js";
import type { WeeklyReportData } from "../types.js";

const MOCK_DATA: WeeklyReportData = {
  username: "testuser",
  avatarUrl: "https://avatars.githubusercontent.com/u/12345",
  dateRange: { from: "2026-03-28", to: "2026-04-03" },
  stats: {
    totalCommits: 42,
    prsOpened: 5,
    prsMerged: 3,
    prsReviewed: 8,
    issuesOpened: 2,
    issuesClosed: 1,
  },
  dailyCommits: [
    { date: "2026-03-28", count: 5 },
    { date: "2026-03-29", count: 0 },
    { date: "2026-03-30", count: 12 },
    { date: "2026-03-31", count: 3 },
    { date: "2026-04-01", count: 8 },
    { date: "2026-04-02", count: 7 },
    { date: "2026-04-03", count: 7 },
  ],
  repositories: [
    {
      name: "org/repo-a",
      commits: 0,
      prsOpened: 3,
      prsMerged: 2,
      issuesOpened: 1,
      issuesClosed: 0,
      url: "https://github.com/org/repo-a",
    },
  ],
  languages: [
    { language: "TypeScript", bytes: 8000, percentage: 80, color: "#3178c6" },
    { language: "JavaScript", bytes: 2000, percentage: 20, color: "#f1e05a" },
  ],
  pullRequests: [],
  issues: [],
  aiNarrative: null,
};

describe("renderReport", () => {
  it("produces valid HTML with DOCTYPE", () => {
    const html = renderReport(MOCK_DATA);
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("</html>");
  });

  it("includes username and date range", () => {
    const html = renderReport(MOCK_DATA);
    expect(html).toContain("testuser");
    expect(html).toContain("2026-03-28");
    expect(html).toContain("2026-04-03");
  });

  it("includes stats values", () => {
    const html = renderReport(MOCK_DATA);
    expect(html).toContain("42");
    expect(html).toContain("Commits");
    expect(html).toContain("PRs Opened");
  });

  it("includes heatmap days", () => {
    const html = renderReport(MOCK_DATA);
    expect(html).toContain("heatmap-level-");
    expect(html).toContain("heatmap-day");
  });

  it("includes language breakdown", () => {
    const html = renderReport(MOCK_DATA);
    expect(html).toContain("TypeScript");
    expect(html).toContain("80.0%");
    expect(html).toContain("#3178c6");
  });

  it("includes repository table", () => {
    const html = renderReport(MOCK_DATA);
    expect(html).toContain("org/repo-a");
    expect(html).toContain("Active Repositories");
  });

  it("includes dofollow footer link with UTM params", () => {
    const html = renderReport(MOCK_DATA);
    expect(html).toContain("deariary.com?utm_source=github-weekly-reporter&utm_medium=footer");
    expect(html).not.toContain('rel="nofollow"');
    expect(html).not.toContain('rel="sponsored"');
  });

  it("includes OG meta tags", () => {
    const html = renderReport(MOCK_DATA);
    expect(html).toContain('og:title');
    expect(html).toContain('og:description');
    expect(html).toContain('og:image');
  });

  it("omits AI narrative section when null", () => {
    const html = renderReport(MOCK_DATA);
    expect(html).not.toContain("AI Summary");
  });

  it("includes AI narrative when provided", () => {
    const data = { ...MOCK_DATA, aiNarrative: "This week you focused on TypeScript." };
    const html = renderReport(data);
    expect(html).toContain("AI Summary");
    expect(html).toContain("This week you focused on TypeScript.");
  });

  it("renders dark theme without errors", () => {
    const html = renderReport(MOCK_DATA, "dark");
    expect(html).toContain("#0d1117");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("produces a single self-contained file (no external links)", () => {
    const html = renderReport(MOCK_DATA);
    // Should not have <link> or <script src=> tags
    expect(html).not.toMatch(/<link\s+rel="stylesheet"/);
    expect(html).not.toMatch(/<script\s+src=/);
  });
});
