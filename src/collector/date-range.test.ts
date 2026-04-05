import { describe, it, expect } from "vitest";
import { buildWeeklyRange, buildCurrentWeekRange, toISODate, parseLocalDate } from "./date-range.js";

// Helper: verify the range covers exactly 7 calendar days.
// In non-DST zones this is 7 * 86400000 - 1 ms.
// Across DST transitions it may be +/- 1 hour.
const expectSevenCalendarDays = (
  from: Date,
  to: Date,
  tz: string,
): void => {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const fromParts = fmt.format(from).split("-").map(Number);
  const toParts = fmt.format(to).split("-").map(Number);
  const fromD = new Date(Date.UTC(fromParts[0], fromParts[1] - 1, fromParts[2]));
  const toD = new Date(Date.UTC(toParts[0], toParts[1] - 1, toParts[2]));
  const calendarDays = (toD.getTime() - fromD.getTime()) / 86_400_000;
  expect(calendarDays).toBe(6); // 6-day difference = 7 calendar days inclusive
};

describe("buildWeeklyRange", () => {
  // -------------------------------------------------------------------
  // Basic behavior
  // -------------------------------------------------------------------

  it("returns previous ISO week range for the given date (UTC)", () => {
    // 2026-04-03 is Friday W14 -> previous week W13 is Mar 23 (Mon) - Mar 29 (Sun)
    const now = new Date("2026-04-03T12:00:00Z");
    const range = buildWeeklyRange(now);

    expect(toISODate(range.from)).toBe("2026-03-23");
    expect(toISODate(range.to)).toBe("2026-03-29");
  });

  it("sets from to Monday midnight and to to Sunday end-of-day in UTC", () => {
    // 2026-04-03 is Friday W14 -> prev week Mon Mar 23 00:00 to Sun Mar 29 23:59:59.999 UTC
    const now = new Date("2026-04-03T15:30:00Z");
    const range = buildWeeklyRange(now);

    expect(range.from.getUTCHours()).toBe(0);
    expect(range.from.getUTCMinutes()).toBe(0);
    expect(range.to.getUTCHours()).toBe(23);
    expect(range.to.getUTCMinutes()).toBe(59);
    expect(range.to.getUTCSeconds()).toBe(59);
    expect(range.to.getUTCMilliseconds()).toBe(999);
  });

  it("range spans exactly 7 calendar days in UTC", () => {
    const range = buildWeeklyRange(new Date("2026-04-03T12:00:00Z"));
    expectSevenCalendarDays(range.from, range.to, "UTC");
  });

  // -------------------------------------------------------------------
  // Positive offset timezone (ahead of UTC): Asia/Tokyo (+9)
  // -------------------------------------------------------------------

  describe("Asia/Tokyo (+9)", () => {
    it("computes range in JST", () => {
      // 2026-04-04 08:00 JST = 2026-04-03 23:00 UTC
      // JST local: Apr 4 (Sat W14) -> prev week W13: Mar 23 (Mon) - Mar 29 (Sun)
      const now = new Date("2026-04-03T23:00:00Z");
      const range = buildWeeklyRange(now, "Asia/Tokyo");

      expect(toISODate(range.from, "Asia/Tokyo")).toBe("2026-03-23");
      expect(toISODate(range.to, "Asia/Tokyo")).toBe("2026-03-29");
    });

    it("same UTC instant gives same previous week when both dates are in same ISO week", () => {
      // 2026-04-03 23:30 UTC = 2026-04-04 08:30 JST
      // UTC: Apr 3 (Fri W14) -> prev W13: Mar 23-29
      // JST: Apr 4 (Sat W14) -> prev W13: Mar 23-29
      const now = new Date("2026-04-03T23:30:00Z");

      const utcRange = buildWeeklyRange(now, "UTC");
      const jstRange = buildWeeklyRange(now, "Asia/Tokyo");

      expect(toISODate(utcRange.to, "UTC")).toBe("2026-03-29");
      expect(toISODate(jstRange.to, "Asia/Tokyo")).toBe("2026-03-29");
    });

    it("just after midnight JST (00:01 JST = 15:01 UTC prev day)", () => {
      // 2026-04-04 00:01 JST = 2026-04-03 15:01 UTC
      // JST local: Apr 4 (Sat W14) -> prev W13: Mar 23-29
      const now = new Date("2026-04-03T15:01:00Z");
      const range = buildWeeklyRange(now, "Asia/Tokyo");

      expect(toISODate(range.to, "Asia/Tokyo")).toBe("2026-03-29");
      expect(toISODate(range.from, "Asia/Tokyo")).toBe("2026-03-23");
    });

    it("just before midnight JST (23:59 JST = 14:59 UTC same day)", () => {
      // 2026-04-03 23:59 JST = 2026-04-03 14:59 UTC
      // JST local: Apr 3 (Fri W14) -> prev W13: Mar 23-29
      const now = new Date("2026-04-03T14:59:00Z");
      const range = buildWeeklyRange(now, "Asia/Tokyo");

      expect(toISODate(range.to, "Asia/Tokyo")).toBe("2026-03-29");
      expect(toISODate(range.from, "Asia/Tokyo")).toBe("2026-03-23");
    });

    it("range spans exactly 7 calendar days in JST", () => {
      const range = buildWeeklyRange(new Date("2026-04-03T23:00:00Z"), "Asia/Tokyo");
      expectSevenCalendarDays(range.from, range.to, "Asia/Tokyo");
    });
  });

  // -------------------------------------------------------------------
  // Negative offset timezone (behind UTC): America/New_York (-4/-5)
  // -------------------------------------------------------------------

  describe("America/New_York (-4 EDT)", () => {
    it("computes range in EDT", () => {
      // 2026-04-03 20:00 EDT = 2026-04-04 00:00 UTC
      // NYC local: Apr 3 (Fri W14) -> prev W13: Mar 23-29
      const now = new Date("2026-04-04T00:00:00Z");
      const range = buildWeeklyRange(now, "America/New_York");

      expect(toISODate(range.to, "America/New_York")).toBe("2026-03-29");
      expect(toISODate(range.from, "America/New_York")).toBe("2026-03-23");
    });

    it("just after midnight ET (00:01 ET = 04:01 UTC)", () => {
      // 2026-04-04 00:01 EDT = 2026-04-04 04:01 UTC
      // NYC local: Apr 4 (Sat W14) -> prev W13: Mar 23-29
      const now = new Date("2026-04-04T04:01:00Z");
      const range = buildWeeklyRange(now, "America/New_York");

      expect(toISODate(range.to, "America/New_York")).toBe("2026-03-29");
      expect(toISODate(range.from, "America/New_York")).toBe("2026-03-23");
    });

    it("just before midnight ET (23:59 ET = 03:59 UTC next day)", () => {
      // 2026-04-03 23:59 EDT = 2026-04-04 03:59 UTC
      // NYC local: Apr 3 (Fri W14) -> prev W13: Mar 23-29
      const now = new Date("2026-04-04T03:59:00Z");
      const range = buildWeeklyRange(now, "America/New_York");

      expect(toISODate(range.to, "America/New_York")).toBe("2026-03-29");
    });

    it("range spans exactly 7 calendar days in EDT", () => {
      const range = buildWeeklyRange(new Date("2026-04-04T00:00:00Z"), "America/New_York");
      expectSevenCalendarDays(range.from, range.to, "America/New_York");
    });
  });

  // -------------------------------------------------------------------
  // UTC+12 / UTC-12: extreme offsets
  // -------------------------------------------------------------------

  describe("extreme offsets", () => {
    it("Pacific/Auckland (+12/+13)", () => {
      // 2026-04-04 10:00 NZST (+12) = 2026-04-03 22:00 UTC
      // NZ local: Apr 4 (Sat W14) -> prev W13: Mar 23-29
      const now = new Date("2026-04-03T22:00:00Z");
      const range = buildWeeklyRange(now, "Pacific/Auckland");

      expect(toISODate(range.to, "Pacific/Auckland")).toBe("2026-03-29");
      expect(toISODate(range.from, "Pacific/Auckland")).toBe("2026-03-23");
    });

    it("Pacific/Honolulu (-10)", () => {
      // 2026-04-03 14:00 HST (-10) = 2026-04-04 00:00 UTC
      // HI local: Apr 3 (Fri W14) -> prev W13: Mar 23-29
      const now = new Date("2026-04-04T00:00:00Z");
      const range = buildWeeklyRange(now, "Pacific/Honolulu");

      expect(toISODate(range.to, "Pacific/Honolulu")).toBe("2026-03-29");
      expect(toISODate(range.from, "Pacific/Honolulu")).toBe("2026-03-23");
    });

    it("NZ and Hawaii get same previous week when both local dates are in same ISO week", () => {
      // 2026-04-04 00:30 UTC
      // NZ (+12): April 4, 12:30 (Sat W14) -> prev W13: Mar 23-29
      // HI (-10): April 3, 14:30 (Fri W14) -> prev W13: Mar 23-29
      const now = new Date("2026-04-04T00:30:00Z");

      const nzRange = buildWeeklyRange(now, "Pacific/Auckland");
      const hiRange = buildWeeklyRange(now, "Pacific/Honolulu");

      expect(toISODate(nzRange.to, "Pacific/Auckland")).toBe("2026-03-29");
      expect(toISODate(hiRange.to, "Pacific/Honolulu")).toBe("2026-03-29");
    });
  });

  // -------------------------------------------------------------------
  // Half-hour / 45-minute offset timezones
  // -------------------------------------------------------------------

  describe("non-standard offsets", () => {
    it("Asia/Kolkata (+5:30)", () => {
      // 2026-04-04 01:00 IST = 2026-04-03 19:30 UTC
      // IST local: Apr 4 (Sat W14) -> prev W13: Mar 23-29
      const now = new Date("2026-04-03T19:30:00Z");
      const range = buildWeeklyRange(now, "Asia/Kolkata");

      expect(toISODate(range.to, "Asia/Kolkata")).toBe("2026-03-29");
      expect(toISODate(range.from, "Asia/Kolkata")).toBe("2026-03-23");
    });

    it("Asia/Kathmandu (+5:45)", () => {
      // 2026-04-04 00:30 NPT = 2026-04-03 18:45 UTC
      // NPT local: Apr 4 (Sat W14) -> prev W13: Mar 23-29
      const now = new Date("2026-04-03T18:45:00Z");
      const range = buildWeeklyRange(now, "Asia/Kathmandu");

      expect(toISODate(range.to, "Asia/Kathmandu")).toBe("2026-03-29");
    });

    it("Australia/Adelaide (+9:30 / +10:30 DST)", () => {
      // 2026-01-15 00:30 ACDT = 2026-01-14 14:00 UTC
      // Adelaide local: Jan 15 (Thu W3) -> prev W2: Jan 5 (Mon) - Jan 11 (Sun)
      const now = new Date("2026-01-14T14:00:00Z");
      const range = buildWeeklyRange(now, "Australia/Adelaide");

      expect(toISODate(range.to, "Australia/Adelaide")).toBe("2026-01-11");
      expect(toISODate(range.from, "Australia/Adelaide")).toBe("2026-01-05");
    });
  });

  // -------------------------------------------------------------------
  // Year boundary
  // -------------------------------------------------------------------

  describe("year boundary", () => {
    it("range spans year boundary in UTC", () => {
      // 2026-01-02 (Fri W1) -> prev W52 of 2025: Dec 22 (Mon) - Dec 28 (Sun)
      const now = new Date("2026-01-02T12:00:00Z");
      const range = buildWeeklyRange(now);

      expect(toISODate(range.from)).toBe("2025-12-22");
      expect(toISODate(range.to)).toBe("2025-12-28");
    });

    it("year boundary with JST: Jan 1 in JST but Dec 31 in UTC", () => {
      // 2026-01-01 02:00 JST = 2025-12-31 17:00 UTC
      // UTC local: Dec 31 (Wed, W1 of 2026) -> prev W52: Dec 22-28
      // JST local: Jan 1 (Thu, W1 of 2026) -> prev W52: Dec 22-28
      const now = new Date("2025-12-31T17:00:00Z");
      const utcRange = buildWeeklyRange(now, "UTC");
      const jstRange = buildWeeklyRange(now, "Asia/Tokyo");

      expect(toISODate(utcRange.to, "UTC")).toBe("2025-12-28");
      expect(toISODate(jstRange.to, "Asia/Tokyo")).toBe("2025-12-28");
      expect(toISODate(jstRange.from, "Asia/Tokyo")).toBe("2025-12-22");
    });

    it("year boundary with negative offset: Dec 31 in NYC but Jan 1 in UTC", () => {
      // 2026-01-01 02:00 UTC = 2025-12-31 21:00 EST
      // UTC local: Jan 1 (Thu, W1 of 2026) -> prev W52: Dec 22-28
      // NYC local: Dec 31 (Wed, W1 of 2026) -> prev W52: Dec 22-28
      const now = new Date("2026-01-01T02:00:00Z");
      const utcRange = buildWeeklyRange(now, "UTC");
      const nyRange = buildWeeklyRange(now, "America/New_York");

      expect(toISODate(utcRange.to, "UTC")).toBe("2025-12-28");
      expect(toISODate(nyRange.to, "America/New_York")).toBe("2025-12-28");
    });
  });

  // -------------------------------------------------------------------
  // Month boundary
  // -------------------------------------------------------------------

  describe("month boundary", () => {
    it("range spans February to March (non-leap year)", () => {
      // 2026-03-02 (Mon W10) -> prev W9: Feb 23 (Mon) - Mar 1 (Sun)
      const now = new Date("2026-03-02T12:00:00Z");
      const range = buildWeeklyRange(now);

      expect(toISODate(range.from)).toBe("2026-02-23");
      expect(toISODate(range.to)).toBe("2026-03-01");
    });

    it("range spans February to March (leap year)", () => {
      // 2028-03-02 (Thu W9) -> prev W8: Feb 21 (Mon) - Feb 27 (Sun)
      const now = new Date("2028-03-02T12:00:00Z");
      const range = buildWeeklyRange(now);

      expect(toISODate(range.from)).toBe("2028-02-21");
      expect(toISODate(range.to)).toBe("2028-02-27");
    });

    it("Feb 29 in leap year", () => {
      // 2028-02-29 (Tue W9) -> prev W8: Feb 21 (Mon) - Feb 27 (Sun)
      const now = new Date("2028-02-29T12:00:00Z");
      const range = buildWeeklyRange(now);

      expect(toISODate(range.from)).toBe("2028-02-21");
      expect(toISODate(range.to)).toBe("2028-02-27");
    });
  });

  // -------------------------------------------------------------------
  // DST transitions
  // -------------------------------------------------------------------

  describe("DST transitions", () => {
    it("spring forward (US): clocks skip 2:00 AM", () => {
      // US DST 2026 spring forward: March 8, 2026, 2:00 AM EST -> 3:00 AM EDT
      // NYC local: Mar 8 (Sun W10) -> prev W9: Feb 23 (Mon) - Mar 1 (Sun)
      const now = new Date("2026-03-08T12:00:00Z");
      const range = buildWeeklyRange(now, "America/New_York");

      expect(toISODate(range.from, "America/New_York")).toBe("2026-02-23");
      expect(toISODate(range.to, "America/New_York")).toBe("2026-03-01");
    });

    it("fall back (US): clocks repeat 1:00 AM", () => {
      // US DST 2026 fall back: November 1, 2026, 2:00 AM EDT -> 1:00 AM EST
      // NYC local: Nov 1 (Sun W44) -> prev W43: Oct 19 (Mon) - Oct 25 (Sun)
      const now = new Date("2026-11-01T12:00:00Z");
      const range = buildWeeklyRange(now, "America/New_York");

      expect(toISODate(range.from, "America/New_York")).toBe("2026-10-19");
      expect(toISODate(range.to, "America/New_York")).toBe("2026-10-25");
    });

    it("range is still 7 calendar days across spring forward DST", () => {
      // The actual duration in UTC ms is 1 hour less (23h day), but the
      // local date range should still be exactly 7 calendar days
      const now = new Date("2026-03-08T20:00:00Z");
      const range = buildWeeklyRange(now, "America/New_York");

      expectSevenCalendarDays(range.from, range.to, "America/New_York");
    });

    it("range is still 7 calendar days across fall back DST", () => {
      const now = new Date("2026-11-01T12:00:00Z");
      const range = buildWeeklyRange(now, "America/New_York");

      expectSevenCalendarDays(range.from, range.to, "America/New_York");
    });
  });

  // -------------------------------------------------------------------
  // Edge: midnight exactly
  // -------------------------------------------------------------------

  describe("exact midnight", () => {
    it("UTC midnight belongs to the new day", () => {
      // 2026-04-04 (Sat W14) -> prev W13: Mar 23-29
      const now = new Date("2026-04-04T00:00:00.000Z");
      const range = buildWeeklyRange(now, "UTC");

      expect(toISODate(range.to, "UTC")).toBe("2026-03-29");
    });

    it("JST midnight (= 15:00 UTC prev day) belongs to the new day", () => {
      // Midnight JST April 4 = 2026-04-03T15:00:00Z
      // JST local: Apr 4 (Sat W14) -> prev W13: Mar 23-29
      const now = new Date("2026-04-03T15:00:00Z");
      const range = buildWeeklyRange(now, "Asia/Tokyo");

      expect(toISODate(range.to, "Asia/Tokyo")).toBe("2026-03-29");
    });

    it("1ms before JST midnight stays on previous day", () => {
      // 23:59:59.999 JST April 3 = 2026-04-03T14:59:59.999Z
      // JST local: Apr 3 (Fri W14) -> prev W13: Mar 23-29
      const now = new Date("2026-04-03T14:59:59.999Z");
      const range = buildWeeklyRange(now, "Asia/Tokyo");

      expect(toISODate(range.to, "Asia/Tokyo")).toBe("2026-03-29");
    });
  });
});

// -------------------------------------------------------------------
// buildCurrentWeekRange
// -------------------------------------------------------------------

describe("buildCurrentWeekRange", () => {
  it("returns current ISO week range for the given date (UTC)", () => {
    // 2026-04-03 is Friday W14 -> current week W14: Mar 30 (Mon) - Apr 3 (today)
    const now = new Date("2026-04-03T12:00:00Z");
    const range = buildCurrentWeekRange(now);

    expect(toISODate(range.from)).toBe("2026-03-30");
    expect(toISODate(range.to)).toBe("2026-04-03");
  });

  it("on Monday, from and to are both Monday", () => {
    // 2026-03-30 is Monday W14
    const now = new Date("2026-03-30T12:00:00Z");
    const range = buildCurrentWeekRange(now);

    expect(toISODate(range.from)).toBe("2026-03-30");
    expect(toISODate(range.to)).toBe("2026-03-30");
  });

  it("on Sunday, covers full Mon-Sun", () => {
    // 2026-04-05 is Sunday W14
    const now = new Date("2026-04-05T12:00:00Z");
    const range = buildCurrentWeekRange(now);

    expect(toISODate(range.from)).toBe("2026-03-30");
    expect(toISODate(range.to)).toBe("2026-04-05");
  });

  it("respects Asia/Tokyo timezone", () => {
    // 2026-04-04 08:00 JST = 2026-04-03 23:00 UTC
    // JST local: Apr 4 (Sat W14) -> current week: Mar 30 (Mon) - Apr 4 (today)
    const now = new Date("2026-04-03T23:00:00Z");
    const range = buildCurrentWeekRange(now, "Asia/Tokyo");

    expect(toISODate(range.from, "Asia/Tokyo")).toBe("2026-03-30");
    expect(toISODate(range.to, "Asia/Tokyo")).toBe("2026-04-04");
  });

  it("respects America/New_York timezone", () => {
    // 2026-04-03 20:00 EDT = 2026-04-04 00:00 UTC
    // NYC local: Apr 3 (Fri W14) -> current week: Mar 30 (Mon) - Apr 3 (today)
    const now = new Date("2026-04-04T00:00:00Z");
    const range = buildCurrentWeekRange(now, "America/New_York");

    expect(toISODate(range.from, "America/New_York")).toBe("2026-03-30");
    expect(toISODate(range.to, "America/New_York")).toBe("2026-04-03");
  });

  it("year boundary: first week of 2026", () => {
    // 2026-01-01 is Thursday W1. Current week: Dec 29 (Mon) - Jan 1 (today)
    const now = new Date("2026-01-01T12:00:00Z");
    const range = buildCurrentWeekRange(now);

    expect(toISODate(range.from)).toBe("2025-12-29");
    expect(toISODate(range.to)).toBe("2026-01-01");
  });
});

// -------------------------------------------------------------------
// toISODate
// -------------------------------------------------------------------

describe("toISODate", () => {
  it("formats a date as YYYY-MM-DD in UTC", () => {
    const date = new Date("2026-04-03T12:00:00Z");
    expect(toISODate(date)).toBe("2026-04-03");
  });

  it("formats a date as YYYY-MM-DD in Asia/Tokyo", () => {
    const date = new Date("2026-04-03T23:00:00Z");
    expect(toISODate(date, "Asia/Tokyo")).toBe("2026-04-04");
  });

  it("same instant shows different dates in different timezones", () => {
    const date = new Date("2026-04-04T00:30:00Z");
    expect(toISODate(date, "Pacific/Auckland")).toBe("2026-04-04");
    expect(toISODate(date, "Pacific/Honolulu")).toBe("2026-04-03");
  });

  it("handles half-hour offset (Asia/Kolkata)", () => {
    // 2026-04-03 23:00 UTC = 2026-04-04 04:30 IST
    const date = new Date("2026-04-03T23:00:00Z");
    expect(toISODate(date, "Asia/Kolkata")).toBe("2026-04-04");
  });
});

describe("parseLocalDate", () => {
  it("returns noon in the given timezone (UTC)", () => {
    const result = parseLocalDate("2026-04-16", "UTC");
    expect(result.toISOString()).toBe("2026-04-16T12:00:00.000Z");
  });

  it("returns noon in Asia/Tokyo (UTC+9)", () => {
    const result = parseLocalDate("2026-04-16", "Asia/Tokyo");
    // Tokyo noon = UTC 03:00
    expect(result.toISOString()).toBe("2026-04-16T03:00:00.000Z");
  });

  it("returns noon in America/New_York (UTC-4 in April / EDT)", () => {
    const result = parseLocalDate("2026-04-16", "America/New_York");
    // NYC noon = UTC 16:00
    expect(result.toISOString()).toBe("2026-04-16T16:00:00.000Z");
  });

  it("resolves to the correct local date in UTC+14 (Pacific/Kiritimati)", () => {
    const result = parseLocalDate("2026-04-16", "Pacific/Kiritimati");
    // Kiritimati noon = UTC 22:00 on Apr 15
    expect(toISODate(result, "Pacific/Kiritimati")).toBe("2026-04-16");
  });

  it("resolves to the correct local date in UTC-12 (Etc/GMT+12)", () => {
    const result = parseLocalDate("2026-04-16", "Etc/GMT+12");
    // UTC-12 noon = UTC 00:00 on Apr 17
    expect(toISODate(result, "Etc/GMT+12")).toBe("2026-04-16");
  });

  it("handles year boundary (2025-12-31 in Asia/Tokyo)", () => {
    const result = parseLocalDate("2025-12-31", "Asia/Tokyo");
    expect(toISODate(result, "Asia/Tokyo")).toBe("2025-12-31");
  });

  it("handles year boundary (2026-01-01 in America/New_York)", () => {
    const result = parseLocalDate("2026-01-01", "America/New_York");
    expect(toISODate(result, "America/New_York")).toBe("2026-01-01");
  });

  it("handles half-hour offset (Asia/Kolkata)", () => {
    const result = parseLocalDate("2026-04-16", "Asia/Kolkata");
    // Kolkata noon (UTC+5:30) = UTC 06:30
    expect(result.toISOString()).toBe("2026-04-16T06:30:00.000Z");
  });

  it("throws on invalid format", () => {
    expect(() => parseLocalDate("abc", "UTC")).toThrow("Invalid date format");
    expect(() => parseLocalDate("2026-13-01", "UTC")).not.toThrow(); // valid format, invalid date handled by midnightInTz
    expect(() => parseLocalDate("2026/04/16", "UTC")).toThrow("Invalid date format");
  });
});
