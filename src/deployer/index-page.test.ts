import { describe, it, expect } from "vitest";
import { renderIndexPage, buildReportEntry } from "./index-page.js";

const entries = (paths: string[]) => paths.map((p) => buildReportEntry(p));

describe("renderIndexPage", () => {
  it("produces valid HTML with report links", () => {
    const html = renderIndexPage(entries(["2026/W13", "2026/W14"]));
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("2026/W14/");
    expect(html).toContain("2026/W13/");
  });

  it("lists reports in reverse chronological order", () => {
    const html = renderIndexPage(entries(["2026/W12", "2026/W14", "2026/W13"]));
    const w14Pos = html.indexOf("2026/W14");
    const w13Pos = html.indexOf("2026/W13");
    const w12Pos = html.indexOf("2026/W12");
    expect(w14Pos).toBeLessThan(w13Pos);
    expect(w13Pos).toBeLessThan(w12Pos);
  });

  it("groups by year", () => {
    const html = renderIndexPage(entries(["2025/W52", "2026/W01", "2026/W02"]));
    const year2026Pos = html.indexOf("2026");
    const year2025Pos = html.indexOf("2025");
    // 2026 should come before 2025 (reverse chrono)
    expect(year2026Pos).toBeLessThan(year2025Pos);
  });

  it("includes dofollow footer link", () => {
    const html = renderIndexPage(entries(["2026/W14"]));
    expect(html).toContain("deariary.com?utm_source=github-weekly-reporter");
    expect(html).not.toContain('rel="nofollow"');
  });

  it("handles empty report list", () => {
    const html = renderIndexPage([]);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Weekly Reports");
  });

  it("shows AI title when provided", () => {
    const report = [buildReportEntry("2026/W14", "Shipped the auth refactor")];
    const html = renderIndexPage(report);
    expect(html).toContain("Shipped the auth refactor");
  });

  it("falls back to week number when no title", () => {
    const report = [buildReportEntry("2026/W14")];
    const html = renderIndexPage(report);
    expect(html).toContain("Week W14");
  });

  it("shows profile when provided", () => {
    const html = renderIndexPage(entries(["2026/W14"]), "dark", {
      username: "testuser",
      avatarUrl: "https://example.com/avatar.png",
    });
    expect(html).toContain("testuser");
    expect(html).toContain("https://example.com/avatar.png");
  });
});
