// Integration tests: verify the full pipeline of timezone-aware date handling.
// Covers: buildWeeklyRange -> isInRange / toISODate -> output dateRange / dailyCommits filter

import { describe, it, expect } from "vitest";
import { buildWeeklyRange, toISODate } from "./date-range.js";
import { isInRange } from "./fetch-events.js";

// ---------------------------------------------------------------------------
// isInRange: event filtering with timezone-aware ranges
// ---------------------------------------------------------------------------

describe("isInRange with timezone-aware ranges", () => {
  it("event exactly at range.from is included", () => {
    const range = buildWeeklyRange(new Date("2026-04-03T12:00:00Z"), "UTC");
    expect(isInRange(range.from.toISOString(), range)).toBe(true);
  });

  it("event exactly at range.to is included", () => {
    const range = buildWeeklyRange(new Date("2026-04-03T12:00:00Z"), "UTC");
    expect(isInRange(range.to.toISOString(), range)).toBe(true);
  });

  it("event 1ms before range.from is excluded", () => {
    const range = buildWeeklyRange(new Date("2026-04-03T12:00:00Z"), "UTC");
    const before = new Date(range.from.getTime() - 1).toISOString();
    expect(isInRange(before, range)).toBe(false);
  });

  it("event 1ms after range.to is excluded", () => {
    const range = buildWeeklyRange(new Date("2026-04-03T12:00:00Z"), "UTC");
    const after = new Date(range.to.getTime() + 1).toISOString();
    expect(isInRange(after, range)).toBe(false);
  });

  describe("JST range filters UTC events correctly", () => {
    // JST local: Apr 4 (Sat W14) -> prev W13: Mar 23 (Mon) - Mar 29 (Sun)
    // In JST: Mar 23 00:00 JST to Mar 29 23:59:59.999 JST
    // In UTC: Mar 22 15:00 to Mar 29 14:59:59.999
    const range = buildWeeklyRange(new Date("2026-04-03T23:00:00Z"), "Asia/Tokyo");

    it("event at Mar 22 15:00:00Z (= Mar 23 00:00 JST) is included", () => {
      expect(isInRange("2026-03-22T15:00:00Z", range)).toBe(true);
    });

    it("event at Mar 22 14:59:59Z (= Mar 22 23:59 JST) is excluded", () => {
      expect(isInRange("2026-03-22T14:59:59Z", range)).toBe(false);
    });

    it("event at Mar 29 14:59:59Z (= Mar 29 23:59 JST) is included", () => {
      expect(isInRange("2026-03-29T14:59:59Z", range)).toBe(true);
    });

    it("event at Mar 29 15:00:00Z (= Mar 30 00:00 JST) is excluded", () => {
      expect(isInRange("2026-03-29T15:00:00Z", range)).toBe(false);
    });
  });

  describe("NYC range filters UTC events correctly", () => {
    // NYC local: Apr 3 (Fri W14) -> prev W13: Mar 23 (Mon) - Mar 29 (Sun)
    // In EDT: Mar 23 00:00 EDT to Mar 29 23:59:59.999 EDT
    // In UTC: Mar 23 04:00 to Mar 30 03:59:59.999
    const range = buildWeeklyRange(new Date("2026-04-04T00:00:00Z"), "America/New_York");

    it("event at Mar 23 04:00:00Z (= Mar 23 00:00 EDT) is included", () => {
      expect(isInRange("2026-03-23T04:00:00Z", range)).toBe(true);
    });

    it("event at Mar 23 03:59:59Z (= Mar 22 23:59 EDT) is excluded", () => {
      expect(isInRange("2026-03-23T03:59:59Z", range)).toBe(false);
    });

    it("event at Mar 30 03:59:59Z (= Mar 29 23:59 EDT) is included", () => {
      expect(isInRange("2026-03-30T03:59:59Z", range)).toBe(true);
    });

    it("event at Mar 30 04:00:00Z (= Mar 30 00:00 EDT) is excluded", () => {
      expect(isInRange("2026-03-30T04:00:00Z", range)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Output dateRange: the YAML output uses toISODate with timezone
// ---------------------------------------------------------------------------

describe("output dateRange format (toISODate with timezone)", () => {
  it("UTC: dateRange matches local dates", () => {
    // Apr 3 (Fri W14) -> prev W13: Mar 23-29
    const range = buildWeeklyRange(new Date("2026-04-03T12:00:00Z"), "UTC");
    const output = {
      from: toISODate(range.from, "UTC"),
      to: toISODate(range.to, "UTC"),
    };

    expect(output.from).toBe("2026-03-23");
    expect(output.to).toBe("2026-03-29");
  });

  it("JST: dateRange shows JST local dates (not UTC dates)", () => {
    // 2026-04-03T23:00:00Z = Apr 4 08:00 JST (Sat W14) -> prev W13: Mar 23-29
    const range = buildWeeklyRange(new Date("2026-04-03T23:00:00Z"), "Asia/Tokyo");
    const output = {
      from: toISODate(range.from, "Asia/Tokyo"),
      to: toISODate(range.to, "Asia/Tokyo"),
    };

    expect(output.from).toBe("2026-03-23");
    expect(output.to).toBe("2026-03-29");
  });

  it("NYC: dateRange shows EDT local dates", () => {
    // 2026-04-04T00:00:00Z = Apr 3 20:00 EDT (Fri W14) -> prev W13: Mar 23-29
    const range = buildWeeklyRange(new Date("2026-04-04T00:00:00Z"), "America/New_York");
    const output = {
      from: toISODate(range.from, "America/New_York"),
      to: toISODate(range.to, "America/New_York"),
    };

    expect(output.from).toBe("2026-03-23");
    expect(output.to).toBe("2026-03-29");
  });

  it("dateRange without timezone falls back to UTC (potential bug if user expects local)", () => {
    // JST local: Apr 4 (Sat W14) -> prev W13: Mar 23-29
    // from = midnight Mar 23 JST = 2026-03-22 15:00 UTC
    const range = buildWeeklyRange(new Date("2026-04-03T23:00:00Z"), "Asia/Tokyo");
    const wrongOutput = toISODate(range.from); // no timezone = UTC
    const correctOutput = toISODate(range.from, "Asia/Tokyo");

    // UTC date of JST midnight is the previous day
    expect(wrongOutput).toBe("2026-03-22"); // UTC interpretation
    expect(correctOutput).toBe("2026-03-23"); // Correct JST date
    expect(wrongOutput).not.toBe(correctOutput);
  });
});

// ---------------------------------------------------------------------------
// dailyCommits filter: toISODate must use timezone for correct filtering
// ---------------------------------------------------------------------------

describe("dailyCommits date filtering with timezone", () => {
  // Simulate the filtering logic from fetchContributions:
  // filter((d) => d.date >= fromDate && d.date <= toDate)
  const filterDailyCommits = (
    days: { date: string; count: number }[],
    fromDate: string,
    toDate: string,
  ) => days.filter((d) => d.date >= fromDate && d.date <= toDate);

  it("UTC: filters correctly", () => {
    // Apr 3 (Fri W14) -> prev W13: Mar 23-29
    const range = buildWeeklyRange(new Date("2026-04-03T12:00:00Z"), "UTC");
    const fromDate = toISODate(range.from, "UTC");
    const toDate = toISODate(range.to, "UTC");

    const mockDays = [
      { date: "2026-03-22", count: 5 }, // before range
      { date: "2026-03-23", count: 3 }, // first day (Monday)
      { date: "2026-03-29", count: 7 }, // last day (Sunday)
      { date: "2026-03-30", count: 2 }, // after range
    ];

    const filtered = filterDailyCommits(mockDays, fromDate, toDate);
    expect(filtered).toHaveLength(2);
    expect(filtered[0].date).toBe("2026-03-23");
    expect(filtered[1].date).toBe("2026-03-29");
  });

  it("JST: filters with JST local dates, not UTC dates", () => {
    // JST local: Apr 4 (Sat W14) -> prev W13: Mar 23-29
    const range = buildWeeklyRange(new Date("2026-04-03T23:00:00Z"), "Asia/Tokyo");
    const fromDate = toISODate(range.from, "Asia/Tokyo");
    const toDate = toISODate(range.to, "Asia/Tokyo");

    expect(fromDate).toBe("2026-03-23");
    expect(toDate).toBe("2026-03-29");

    const mockDays = [
      { date: "2026-03-22", count: 5 }, // before range in JST
      { date: "2026-03-23", count: 3 }, // first day (Monday)
      { date: "2026-03-29", count: 7 }, // last day (Sunday)
      { date: "2026-03-30", count: 2 }, // after range
    ];

    const filtered = filterDailyCommits(mockDays, fromDate, toDate);
    expect(filtered).toHaveLength(2);
    expect(filtered[0].date).toBe("2026-03-23");
    expect(filtered[1].date).toBe("2026-03-29");
  });

  it("BUG scenario: using UTC toISODate for JST range gives wrong filter", () => {
    // JST local: Apr 4 (Sat W14) -> prev W13: Mar 23-29
    // from = midnight Mar 23 JST = 2026-03-22 15:00 UTC
    const range = buildWeeklyRange(new Date("2026-04-03T23:00:00Z"), "Asia/Tokyo");

    // Wrong: using UTC to format dates (the old bug)
    const wrongFrom = toISODate(range.from); // "2026-03-22" (UTC)

    // Correct: using timezone
    const correctFrom = toISODate(range.from, "Asia/Tokyo"); // "2026-03-23"

    // The from date is wrong (off by one day)
    expect(wrongFrom).not.toBe(correctFrom);
    expect(wrongFrom).toBe("2026-03-22"); // would include an extra day
    expect(correctFrom).toBe("2026-03-23");

    // to date: end of Mar 29 JST = Mar 29 14:59:59.999 UTC -> both show "2026-03-29"
    expect(toISODate(range.to)).toBe(toISODate(range.to, "Asia/Tokyo"));
  });
});

// ---------------------------------------------------------------------------
// GraphQL API: from/to parameters use .toISOString() (always correct)
// ---------------------------------------------------------------------------

describe("GraphQL API from/to parameters", () => {
  it("range boundaries are valid ISO 8601 DateTime strings", () => {
    const range = buildWeeklyRange(new Date("2026-04-03T23:00:00Z"), "Asia/Tokyo");

    const from = range.from.toISOString();
    const to = range.to.toISOString();

    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  it("from is always before to", () => {
    const timezones = ["UTC", "Asia/Tokyo", "America/New_York", "Pacific/Auckland", "Pacific/Honolulu"];
    timezones.forEach((tz) => {
      const range = buildWeeklyRange(new Date("2026-04-03T12:00:00Z"), tz);
      expect(range.from.getTime()).toBeLessThan(range.to.getTime());
    });
  });

  it("JST range boundaries are correct UTC instants", () => {
    // JST local: Apr 4 (Sat W14) -> prev W13: Mar 23-29
    // JST range: Mar 23 00:00 JST - Mar 29 23:59:59.999 JST
    // UTC: Mar 22 15:00 - Mar 29 14:59:59.999
    const range = buildWeeklyRange(new Date("2026-04-03T23:00:00Z"), "Asia/Tokyo");

    expect(range.from.toISOString()).toBe("2026-03-22T15:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-03-29T14:59:59.999Z");
  });
});
