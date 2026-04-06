import { describe, it, expect } from "vitest";
import { loadTheme, readThemeTemplate, AVAILABLE_THEMES } from "./index.js";
import { renderReport } from "../index.js";
import type { WeeklyReportData } from "../../types.js";

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
  commitMessages: [],
  releases: [],
  externalContributions: [],
  aiContent: {
    title: "Auth refactor completed",
    subtitle: "A focused backend week",
    overview: "First paragraph.\n\nSecond paragraph.",
    summaries: [
      {
        type: "commit-summary",
        heading: "42 commits",
        body: "Lots of commits.",
        chips: [{ label: "lines", value: "+1200 -300", color: "green" }],
      },
    ],
    highlights: [
      {
        type: "pr",
        title: "feat: add OAuth flow",
        repo: "org/backend",
        meta: "merged Apr 2",
        body: "Big PR.",
      },
    ],
  },
};

describe("AVAILABLE_THEMES", () => {
  it("includes brutalist", () => {
    expect(AVAILABLE_THEMES).toContain("brutalist");
  });

  it("includes minimal", () => {
    expect(AVAILABLE_THEMES).toContain("minimal");
  });

  it("includes editorial", () => {
    expect(AVAILABLE_THEMES).toContain("editorial");
  });
});

describe("loadTheme", () => {
  it("loads brutalist theme by default", () => {
    const theme = loadTheme();
    expect(theme.buildCSS).toBeTypeOf("function");
    expect(theme.buildIndexCSS).toBeTypeOf("function");
    expect(theme.colors.bg).toBe("#050505");
    expect(theme.colors.accent).toBe("#39d353");
    expect(theme.templatesDir).toContain("themes/brutalist/templates");
  });

  it("loads brutalist theme explicitly", () => {
    const theme = loadTheme("brutalist");
    expect(theme.colors.bg).toBe("#050505");
  });

  it("brutalist has theme toggle scripts", () => {
    const theme = loadTheme("brutalist");
    expect(theme.themeInitScript).toContain("localStorage");
    expect(theme.themeToggleScript).toContain("theme-toggle");
  });

  it("brutalist buildCSS uses CSS custom properties", () => {
    const theme = loadTheme("brutalist");
    const css = theme.buildCSS("en");
    expect(css).toContain("var(--b-bg)");
    expect(css).toContain("var(--b-text)");
    expect(css).toContain("var(--b-accent)");
  });

  it("brutalist buildCSS includes light mode via prefers-color-scheme", () => {
    const theme = loadTheme("brutalist");
    const css = theme.buildCSS("en");
    expect(css).toContain("prefers-color-scheme: light");
    expect(css).toContain("--b-bg: #fafafa");
  });

  it("brutalist buildCSS supports data-theme attribute override", () => {
    const theme = loadTheme("brutalist");
    const css = theme.buildCSS("en");
    expect(css).toContain('html[data-theme="light"]');
    expect(css).toContain('html[data-theme="dark"]');
  });

  it("loads minimal theme", () => {
    const theme = loadTheme("minimal");
    expect(theme.buildCSS).toBeTypeOf("function");
    expect(theme.buildIndexCSS).toBeTypeOf("function");
    expect(theme.colors.bg).toBe("#ffffff");
    expect(theme.colors.accent).toBe("#0066cc");
    expect(theme.templatesDir).toContain("themes/minimal/templates");
  });

  it("throws for unknown theme", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => loadTheme("nonexistent" as any)).toThrow("Unknown theme");
  });

  it("buildCSS returns valid CSS string", () => {
    const theme = loadTheme("brutalist");
    const css = theme.buildCSS("en");
    expect(css).toContain("body");
    expect(css).toContain("#050505");
    expect(css).toContain("Schibsted");
  });

  it("buildIndexCSS returns valid CSS string", () => {
    const theme = loadTheme("brutalist");
    const css = theme.buildIndexCSS("en");
    expect(css).toContain(".hero");
    expect(css).toContain("var(--b-bg)");
  });
});

describe("minimal theme", () => {
  it("buildCSS uses system font stack (no Google Fonts)", () => {
    const theme = loadTheme("minimal");
    const css = theme.buildCSS("en");
    expect(css).toContain("-apple-system");
    expect(css).not.toContain("@import url");
    expect(css).not.toContain("fonts.googleapis.com");
  });

  it("buildCSS includes print styles", () => {
    const theme = loadTheme("minimal");
    const css = theme.buildCSS("en");
    expect(css).toContain("@media print");
  });

  it("buildCSS uses CSS custom properties for colors", () => {
    const theme = loadTheme("minimal");
    const css = theme.buildCSS("en");
    expect(css).toContain("var(--bg)");
    expect(css).toContain("var(--text)");
    expect(css).toContain("var(--accent)");
  });

  it("buildCSS defines light-first color scheme", () => {
    const theme = loadTheme("minimal");
    const css = theme.buildCSS("en");
    expect(css).toContain("--bg: #ffffff");
  });

  it("buildCSS includes dark mode via prefers-color-scheme", () => {
    const theme = loadTheme("minimal");
    const css = theme.buildCSS("en");
    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).toContain("--bg: #111111");
  });

  it("buildCSS supports data-theme attribute override", () => {
    const theme = loadTheme("minimal");
    const css = theme.buildCSS("en");
    expect(css).toContain('html[data-theme="light"]');
    expect(css).toContain('html[data-theme="dark"]');
  });

  it("provides theme init and toggle scripts", () => {
    const theme = loadTheme("minimal");
    expect(theme.themeInitScript).toContain("localStorage");
    expect(theme.themeInitScript).toContain("data-theme");
    expect(theme.themeToggleScript).toContain("theme-toggle");
    expect(theme.themeToggleScript).toContain("localStorage.setItem");
  });

  it("renders theme toggle button in report", () => {
    const html = renderReport(MOCK_DATA, { theme: "minimal" });
    expect(html).toContain("theme-toggle");
    expect(html).toContain("localStorage");
  });

  it("buildIndexCSS is concise", () => {
    const theme = loadTheme("minimal");
    const css = theme.buildIndexCSS("en");
    expect(css).toContain(".week-item");
    expect(css).toContain(".year-label");
  });

  it("renders report with minimal theme", () => {
    const html = renderReport(MOCK_DATA, { theme: "minimal" });
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("Auth refactor completed");
    expect(html).toContain("testuser");
    expect(html).toContain("var(--bg)");
  });

  it("renders highlights as list items", () => {
    const html = renderReport(MOCK_DATA, { theme: "minimal" });
    expect(html).toContain("highlight-list");
    expect(html).toContain("highlight-item");
    expect(html).toContain("feat: add OAuth flow");
  });

  it("includes dofollow footer links", () => {
    const html = renderReport(MOCK_DATA, { theme: "minimal" });
    expect(html).toContain("deariary.com?utm_source=github-weekly-reporter&utm_medium=footer");
    expect(html).not.toContain('rel="nofollow"');
  });

  it("renders Japanese locale", () => {
    const html = renderReport(MOCK_DATA, { theme: "minimal", language: "ja" });
    expect(html).toContain('lang="ja"');
  });
});

describe("readThemeTemplate", () => {
  it("reads report.hbs from brutalist theme", () => {
    const theme = loadTheme("brutalist");
    const content = readThemeTemplate(theme, "report.hbs");
    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("{{themeColor}}");
  });

  it("reads partials from brutalist theme", () => {
    const theme = loadTheme("brutalist");
    const header = readThemeTemplate(theme, "partials/header.hbs");
    expect(header).toContain("header-author");
  });

  it("reads index-page.hbs from brutalist theme", () => {
    const theme = loadTheme("brutalist");
    const content = readThemeTemplate(theme, "index-page.hbs");
    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("hero-title");
  });

  it("reads report.hbs from minimal theme", () => {
    const theme = loadTheme("minimal");
    const content = readThemeTemplate(theme, "report.hbs");
    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("{{themeColor}}");
  });

  it("reads index-page.hbs from minimal theme", () => {
    const theme = loadTheme("minimal");
    const content = readThemeTemplate(theme, "index-page.hbs");
    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("index-header");
  });

  it("reads report.hbs from editorial theme", () => {
    const theme = loadTheme("editorial");
    const content = readThemeTemplate(theme, "report.hbs");
    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("{{themeColor}}");
  });

  it("reads index-page.hbs from editorial theme", () => {
    const theme = loadTheme("editorial");
    const content = readThemeTemplate(theme, "index-page.hbs");
    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("index-header");
  });
});

describe("editorial theme", () => {
  it("loads editorial theme", () => {
    const theme = loadTheme("editorial");
    expect(theme.buildCSS).toBeTypeOf("function");
    expect(theme.colors.bg).toBe("#faf8f5");
    expect(theme.colors.accent).toBe("#c45d3e");
    expect(theme.templatesDir).toContain("themes/editorial/templates");
  });

  it("buildCSS includes serif font (Cormorant Garamond)", () => {
    const theme = loadTheme("editorial");
    const css = theme.buildCSS("en");
    expect(css).toContain("Cormorant Garamond");
    expect(css).toContain("DM Sans");
  });

  it("buildCSS uses CSS custom properties", () => {
    const theme = loadTheme("editorial");
    const css = theme.buildCSS("en");
    expect(css).toContain("var(--e-bg)");
    expect(css).toContain("var(--e-accent)");
    expect(css).toContain("var(--e-drop-cap)");
  });

  it("buildCSS includes drop cap styling", () => {
    const theme = loadTheme("editorial");
    const css = theme.buildCSS("en");
    expect(css).toContain("first-letter");
  });

  it("buildCSS includes dark mode", () => {
    const theme = loadTheme("editorial");
    const css = theme.buildCSS("en");
    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).toContain("--e-bg: #1a1816");
  });

  it("buildCSS supports data-theme override", () => {
    const theme = loadTheme("editorial");
    const css = theme.buildCSS("en");
    expect(css).toContain('html[data-theme="light"]');
    expect(css).toContain('html[data-theme="dark"]');
  });

  it("has theme toggle scripts", () => {
    const theme = loadTheme("editorial");
    expect(theme.themeInitScript).toContain("localStorage");
    expect(theme.themeToggleScript).toContain("theme-toggle");
  });

  it("renders report with editorial theme", () => {
    const html = renderReport(MOCK_DATA, { theme: "editorial" });
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("Auth refactor completed");
    expect(html).toContain("Cormorant Garamond");
    expect(html).toContain("first-letter");
  });

  it("renders highlights in grid", () => {
    const html = renderReport(MOCK_DATA, { theme: "editorial" });
    expect(html).toContain("highlight-grid");
    expect(html).toContain("highlight-card");
    expect(html).toContain("feat: add OAuth flow");
  });

  it("includes header rule", () => {
    const html = renderReport(MOCK_DATA, { theme: "editorial" });
    expect(html).toContain("header-rule");
  });
});
