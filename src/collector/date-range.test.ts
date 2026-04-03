import { describe, it, expect } from "vitest";
import { buildWeeklyRange, toISODate } from "./date-range.js";

describe("buildWeeklyRange", () => {
  it("returns a 7-day range ending on the given date", () => {
    const now = new Date("2026-04-03T12:00:00Z");
    const range = buildWeeklyRange(now);

    expect(toISODate(range.from)).toBe("2026-03-28");
    expect(toISODate(range.to)).toBe("2026-04-03");
  });

  it("sets from to midnight UTC and to to end of day UTC", () => {
    const now = new Date("2026-04-03T15:30:00Z");
    const range = buildWeeklyRange(now);

    expect(range.from.getUTCHours()).toBe(0);
    expect(range.from.getUTCMinutes()).toBe(0);
    expect(range.to.getUTCHours()).toBe(23);
    expect(range.to.getUTCMinutes()).toBe(59);
  });
});

describe("toISODate", () => {
  it("formats a date as YYYY-MM-DD", () => {
    const date = new Date("2026-04-03T12:00:00Z");
    expect(toISODate(date)).toBe("2026-04-03");
  });
});
