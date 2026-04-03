import { describe, it, expect } from "vitest";
import { getLocale, formatDate, formatNumber, llmLanguageInstruction, getFontConfig } from "./index.js";
import type { Language } from "../types.js";

const ALL_LANGUAGES: Language[] = ["en", "ja", "zh-CN", "zh-TW", "ko", "es", "fr", "de", "pt", "ru"];

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

  it("returns Simplified Chinese locale", () => {
    const locale = getLocale("zh-CN");
    expect(locale.sectionSummary).toBe("摘要");
    expect(locale.weekdaysShort).toHaveLength(7);
  });

  it("returns Korean locale", () => {
    const locale = getLocale("ko");
    expect(locale.sectionSummary).toBe("요약");
    expect(locale.weekdaysShort).toEqual(["일", "월", "화", "수", "목", "금", "토"]);
  });

  it("returns Russian locale", () => {
    const locale = getLocale("ru");
    expect(locale.sectionSummary).toBe("Итоги");
    expect(locale.weekdaysShort[1]).toBe("Пн");
  });

  it.each(ALL_LANGUAGES)("locale %s has all required string fields", (lang) => {
    const locale = getLocale(lang);
    expect(locale.weekdaysShort).toHaveLength(7);
    expect(locale.sectionSummary).toBeTruthy();
    expect(locale.sectionHighlights).toBeTruthy();
    expect(locale.allWeeks).toBeTruthy();
    expect(locale.poweredBy).toBeTruthy();
    expect(locale.weeklyReports).toBeTruthy();
    expect(locale.weeklyReport).toBeTruthy();
  });

  it.each(ALL_LANGUAGES)("locale %s has working formatter functions", (lang) => {
    const locale = getLocale(lang);
    expect(locale.sectionsCount(3)).toBeTruthy();
    expect(locale.itemsCount(5)).toBeTruthy();
    expect(locale.userWeek("alice")).toBeTruthy();
  });
});

describe("formatNumber", () => {
  it("formats with English locale", () => {
    expect(formatNumber(1234, "en")).toBe("1,234");
  });

  it.each(ALL_LANGUAGES)("formatNumber works for %s", (lang) => {
    const result = formatNumber(1234567, lang);
    expect(result).toBeTruthy();
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

  it.each(ALL_LANGUAGES)("formatDate works for %s", (lang) => {
    const result = formatDate("2026-04-03", lang);
    expect(result).toBeTruthy();
    expect(result).toContain("2026");
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

  it.each<Language>(["zh-CN", "zh-TW", "ko", "es", "fr", "de", "pt", "ru"])(
    "returns non-null instruction for %s",
    (lang) => {
      const instruction = llmLanguageInstruction(lang);
      expect(instruction).not.toBeNull();
      expect(instruction).toContain("IMPORTANT");
    },
  );
});

describe("getFontConfig", () => {
  it("returns Space Grotesk for English", () => {
    const config = getFontConfig("en");
    expect(config.bodyFamily).toContain("Space Grotesk");
    expect(config.monoFamily).toContain("JetBrains Mono");
    expect(config.importUrl).toContain("fonts.googleapis.com");
  });

  it("returns Noto Sans JP for Japanese", () => {
    const config = getFontConfig("ja");
    expect(config.bodyFamily).toContain("Noto Sans JP");
  });

  it("returns Noto Sans SC for Simplified Chinese", () => {
    const config = getFontConfig("zh-CN");
    expect(config.bodyFamily).toContain("Noto Sans SC");
  });

  it("returns Noto Sans TC for Traditional Chinese", () => {
    const config = getFontConfig("zh-TW");
    expect(config.bodyFamily).toContain("Noto Sans TC");
  });

  it("returns Noto Sans KR for Korean", () => {
    const config = getFontConfig("ko");
    expect(config.bodyFamily).toContain("Noto Sans KR");
  });

  it("returns Inter for Russian", () => {
    const config = getFontConfig("ru");
    expect(config.bodyFamily).toContain("Inter");
  });

  it.each(ALL_LANGUAGES)("font config for %s has all required fields", (lang) => {
    const config = getFontConfig(lang);
    expect(config.importUrl).toContain("fonts.googleapis.com");
    expect(config.bodyFamily).toBeTruthy();
    expect(config.monoFamily).toContain("JetBrains Mono");
  });
});
