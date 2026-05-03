import { describe, it, expect, vi } from "vitest";
import type { WeeklyReportData } from "../types.js";

vi.mock("./themes/index.js", () => ({
  loadTheme: () => ({
    buildCSS: () => "",
    buildIndexCSS: () => "",
    colors: {
      bg: "#000",
      accent: "#fff",
      green: "#0f0",
      badgePr: "#00f",
      badgeDiscussion: "#f0f",
    },
    templatesDir: "/fake",
  }),
  readThemeTemplate: (_t: unknown, name: string) =>
    name.endsWith("report.hbs")
      ? "<!DOCTYPE html><html><head><script>{{themeInitScript}}</script></head>" +
        "<body>{{username}}<script>{{themeToggleScript}}</script></body></html>"
      : "",
}));

const MOCK_DATA: WeeklyReportData = {
  username: "fallbackuser",
  avatarUrl: "https://avatars.githubusercontent.com/u/1",
  dateRange: { from: "2026-03-28", to: "2026-04-03" },
  stats: {
    totalCommits: 0,
    totalAdditions: 0,
    totalDeletions: 0,
    prsOpened: 0,
    prsMerged: 0,
    prsReviewed: 0,
    issuesOpened: 0,
    issuesClosed: 0,
  },
  dailyCommits: [],
  repositories: [],
  pullRequests: [],
  issues: [],
  events: [],
  commitMessages: [],
  releases: [],
  externalContributions: [],
  aiContent: {
    title: "T",
    subtitle: "S",
    overview: "O",
    summaries: [],
    highlights: [],
  },
};

describe("renderReport with theme missing init/toggle scripts", () => {
  it("falls back to empty string for themeInitScript and themeToggleScript", async () => {
    const { renderReport } = await import("./index.js");
    const html = renderReport(MOCK_DATA);
    expect(html).toContain("<script></script>");
    expect(html).toContain("fallbackuser");
  });
});
