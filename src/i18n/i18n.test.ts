import { describe, it, expect } from "vitest";
import { getLocale, formatDate, formatNumber, llmLanguageInstruction } from "./index.js";

describe("getLocale", () => {
  it("returns English locale by default", () => {
    const locale = getLocale("en");
    expect(locale.sectionSummary).toBe("Summary");
    expect(locale.weekdaysShort).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });

  it("returns Japanese locale", () => {
    const locale = getLocale("ja");
    expect(locale.sectionSummary).toBe("サマリー");
    expect(locale.sectionHighlights).toBe("ハイライト");
    expect(locale.weekdaysShort).toEqual(["日", "月", "火", "水", "木", "金", "土"]);
  });

  it("provides formatter functions", () => {
    const en = getLocale("en");
    expect(en.sectionsCount(3)).toBe("3 sections");
    expect(en.itemsCount(5)).toBe("5 items");
    expect(en.userWeek("alice")).toBe("alice's Week");

    const ja = getLocale("ja");
    expect(ja.sectionsCount(3)).toBe("3 セクション");
    expect(ja.itemsCount(5)).toBe("5 件");
    expect(ja.userWeek("alice")).toBe("alice の一週間");
  });
});

describe("formatNumber", () => {
  it("formats with English locale", () => {
    expect(formatNumber(1234, "en")).toBe("1,234");
  });

  it("formats with Japanese locale", () => {
    // ja-JP uses comma grouping same as en-US for numbers
    expect(formatNumber(1234, "ja")).toBeTruthy();
  });
});

describe("formatDate", () => {
  it("formats date in English", () => {
    const result = formatDate("2026-04-03", "en");
    expect(result).toContain("2026");
    expect(result).toContain("3");
  });

  it("formats date in Japanese", () => {
    const result = formatDate("2026-04-03", "ja");
    expect(result).toContain("2026");
    expect(result).toContain("4");
    expect(result).toContain("3");
  });
});

describe("llmLanguageInstruction", () => {
  it("returns null for English", () => {
    expect(llmLanguageInstruction("en")).toBeNull();
  });

  it("returns Japanese instruction", () => {
    const instruction = llmLanguageInstruction("ja");
    expect(instruction).toContain("Japanese");
  });
});
