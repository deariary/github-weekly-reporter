import { describe, it, expect } from "vitest";
import { buildWeeklyRange, toISODate } from "./date-range.js";

describe("buildWeeklyRange", () => {
  it("returns a 7-day range ending on the given date (UTC)", () => {
    const now = new Date("2026-04-03T12:00:00Z");
    const range = buildWeeklyRange(now);

    expect(toISODate(range.from)).toBe("2026-03-28");
    expect(toISODate(range.to)).toBe("2026-04-03");
  });

  it("sets from to midnight and to to end of day in UTC", () => {
    const now = new Date("2026-04-03T15:30:00Z");
    const range = buildWeeklyRange(now);

    expect(range.from.getUTCHours()).toBe(0);
    expect(range.from.getUTCMinutes()).toBe(0);
    expect(range.to.getUTCHours()).toBe(23);
    expect(range.to.getUTCMinutes()).toBe(59);
  });

  it("computes range in Asia/Tokyo timezone", () => {
    // 2026-04-04 08:00 JST = 2026-04-03 23:00 UTC
    // In JST, "today" is April 4, so the range should be Mar 29 - Apr 4
    const now = new Date("2026-04-03T23:00:00Z");
    const range = buildWeeklyRange(now, "Asia/Tokyo");

    expect(toISODate(range.from, "Asia/Tokyo")).toBe("2026-03-29");
    expect(toISODate(range.to, "Asia/Tokyo")).toBe("2026-04-04");
  });

  it("UTC range differs from JST when crossing midnight", () => {
    // At 2026-04-03 23:30 UTC, it's 2026-04-04 08:30 in JST
    const now = new Date("2026-04-03T23:30:00Z");

    const utcRange = buildWeeklyRange(now, "UTC");
    const jstRange = buildWeeklyRange(now, "Asia/Tokyo");

    // UTC: today is Apr 3, range ends Apr 3
    expect(toISODate(utcRange.to, "UTC")).toBe("2026-04-03");
    // JST: today is Apr 4, range ends Apr 4
    expect(toISODate(jstRange.to, "Asia/Tokyo")).toBe("2026-04-04");
  });

  it("handles year boundary correctly", () => {
    const now = new Date("2026-01-02T12:00:00Z");
    const range = buildWeeklyRange(now);

    expect(toISODate(range.from)).toBe("2025-12-27");
    expect(toISODate(range.to)).toBe("2026-01-02");
  });
});

describe("toISODate", () => {
  it("formats a date as YYYY-MM-DD in UTC", () => {
    const date = new Date("2026-04-03T12:00:00Z");
    expect(toISODate(date)).toBe("2026-04-03");
  });

  it("formats a date as YYYY-MM-DD in Asia/Tokyo", () => {
    // 2026-04-03T23:00:00Z = 2026-04-04 08:00 JST
    const date = new Date("2026-04-03T23:00:00Z");
    expect(toISODate(date, "Asia/Tokyo")).toBe("2026-04-04");
  });
});
