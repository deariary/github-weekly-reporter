import { describe, it, expect } from "vitest";
import { renderIndexPage } from "./index-page.js";

describe("renderIndexPage", () => {
  it("produces valid HTML with report links", () => {
    const html = renderIndexPage(["2026/W13", "2026/W14"]);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("2026/W14/");
    expect(html).toContain("2026/W13/");
  });

  it("lists reports in reverse chronological order", () => {
    const html = renderIndexPage(["2026/W12", "2026/W14", "2026/W13"]);
    const w14Pos = html.indexOf("2026/W14");
    const w13Pos = html.indexOf("2026/W13");
    const w12Pos = html.indexOf("2026/W12");
    expect(w14Pos).toBeLessThan(w13Pos);
    expect(w13Pos).toBeLessThan(w12Pos);
  });

  it("includes dofollow footer link", () => {
    const html = renderIndexPage(["2026/W14"]);
    expect(html).toContain("deariary.com?utm_source=github-weekly-reporter");
    expect(html).not.toContain('rel="nofollow"');
  });

  it("handles empty report list", () => {
    const html = renderIndexPage([]);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Weekly Reports");
  });
});
