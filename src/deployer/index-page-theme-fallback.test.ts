import { describe, it, expect, vi } from "vitest";

vi.mock("../renderer/themes/index.js", () => ({
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
  readThemeTemplate: () =>
    "<!DOCTYPE html><html><head><script>{{themeInitScript}}</script></head><body>" +
    "{{#each yearGroups}}<h2>{{year}}</h2>{{/each}}" +
    "<script>{{themeToggleScript}}</script></body></html>",
}));

describe("renderIndexPage with theme missing init/toggle scripts", () => {
  it("falls back to empty string for themeInitScript and themeToggleScript", async () => {
    const { renderIndexPage, buildReportEntry } = await import("./index-page.js");
    const html = renderIndexPage([buildReportEntry("2026/W14")]);
    expect(html).toContain("<script></script>");
    expect(html).toContain("2026");
  });
});
