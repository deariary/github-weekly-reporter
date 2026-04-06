import { describe, it, expect } from "vitest";
import { loadTheme, readThemeTemplate, AVAILABLE_THEMES } from "./index.js";

describe("AVAILABLE_THEMES", () => {
  it("includes brutalist", () => {
    expect(AVAILABLE_THEMES).toContain("brutalist");
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
    expect(css).toContain("#050505");
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
});
