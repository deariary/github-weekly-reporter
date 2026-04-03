import { describe, it, expect } from "vitest";
import { buildWeeklyRange, toISODate } from "./date-range.js";

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
      const now = new Date("2026-04-03T23:00:00Z");
      const range = buildWeeklyRange(now, "Asia/Tokyo");

      expect(toISODate(range.from, "Asia/Tokyo")).toBe("2026-03-29");
      expect(toISODate(range.to, "Asia/Tokyo")).toBe("2026-04-04");
    });

    it("same UTC instant gives different ranges in UTC vs JST", () => {
      // 2026-04-03 23:30 UTC = 2026-04-04 08:30 JST
      const now = new Date("2026-04-03T23:30:00Z");

      const utcRange = buildWeeklyRange(now, "UTC");
      const jstRange = buildWeeklyRange(now, "Asia/Tokyo");

      expect(toISODate(utcRange.to, "UTC")).toBe("2026-04-03");
      expect(toISODate(jstRange.to, "Asia/Tokyo")).toBe("2026-04-04");
    });

    it("just after midnight JST (00:01 JST = 15:01 UTC prev day)", () => {
      // 2026-04-04 00:01 JST = 2026-04-03 15:01 UTC
      const now = new Date("2026-04-03T15:01:00Z");
      const range = buildWeeklyRange(now, "Asia/Tokyo");

      // In JST it is already April 4
      expect(toISODate(range.to, "Asia/Tokyo")).toBe("2026-04-04");
      expect(toISODate(range.from, "Asia/Tokyo")).toBe("2026-03-29");
    });

    it("just before midnight JST (23:59 JST = 14:59 UTC same day)", () => {
      // 2026-04-03 23:59 JST = 2026-04-03 14:59 UTC
      const now = new Date("2026-04-03T14:59:00Z");
      const range = buildWeeklyRange(now, "Asia/Tokyo");

      // In JST it is still April 3
      expect(toISODate(range.to, "Asia/Tokyo")).toBe("2026-04-03");
      expect(toISODate(range.from, "Asia/Tokyo")).toBe("2026-03-28");
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
      const now = new Date("2026-04-04T00:00:00Z");
      const range = buildWeeklyRange(now, "America/New_York");

      // In NYC it is still April 3
      expect(toISODate(range.to, "America/New_York")).toBe("2026-04-03");
      expect(toISODate(range.from, "America/New_York")).toBe("2026-03-28");
    });

    it("just after midnight ET (00:01 ET = 04:01 UTC)", () => {
      // 2026-04-04 00:01 EDT = 2026-04-04 04:01 UTC
      const now = new Date("2026-04-04T04:01:00Z");
      const range = buildWeeklyRange(now, "America/New_York");

      expect(toISODate(range.to, "America/New_York")).toBe("2026-04-04");
      expect(toISODate(range.from, "America/New_York")).toBe("2026-03-29");
    });

    it("just before midnight ET (23:59 ET = 03:59 UTC next day)", () => {
      // 2026-04-03 23:59 EDT = 2026-04-04 03:59 UTC
      const now = new Date("2026-04-04T03:59:00Z");
      const range = buildWeeklyRange(now, "America/New_York");

      // In NYC it is still April 3
      expect(toISODate(range.to, "America/New_York")).toBe("2026-04-03");
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
      const now = new Date("2026-04-03T22:00:00Z");
      const range = buildWeeklyRange(now, "Pacific/Auckland");

      // NZ is April 4
      expect(toISODate(range.to, "Pacific/Auckland")).toBe("2026-04-04");
      expect(toISODate(range.from, "Pacific/Auckland")).toBe("2026-03-29");
    });

    it("Pacific/Honolulu (-10)", () => {
      // 2026-04-03 14:00 HST (-10) = 2026-04-04 00:00 UTC
      const now = new Date("2026-04-04T00:00:00Z");
      const range = buildWeeklyRange(now, "Pacific/Honolulu");

      // Hawaii is still April 3
      expect(toISODate(range.to, "Pacific/Honolulu")).toBe("2026-04-03");
      expect(toISODate(range.from, "Pacific/Honolulu")).toBe("2026-03-28");
    });

    it("NZ and Hawaii see different dates at same UTC instant", () => {
      // 2026-04-04 00:30 UTC
      // NZ (+12): April 4, 12:30
      // HI (-10): April 3, 14:30
      const now = new Date("2026-04-04T00:30:00Z");

      const nzRange = buildWeeklyRange(now, "Pacific/Auckland");
      const hiRange = buildWeeklyRange(now, "Pacific/Honolulu");

      expect(toISODate(nzRange.to, "Pacific/Auckland")).toBe("2026-04-04");
      expect(toISODate(hiRange.to, "Pacific/Honolulu")).toBe("2026-04-03");
    });
  });

  // -------------------------------------------------------------------
  // Half-hour / 45-minute offset timezones
  // -------------------------------------------------------------------

  describe("non-standard offsets", () => {
    it("Asia/Kolkata (+5:30)", () => {
      // 2026-04-04 01:00 IST = 2026-04-03 19:30 UTC
      const now = new Date("2026-04-03T19:30:00Z");
      const range = buildWeeklyRange(now, "Asia/Kolkata");

      // India is April 4 (01:00 IST)
      expect(toISODate(range.to, "Asia/Kolkata")).toBe("2026-04-04");
      expect(toISODate(range.from, "Asia/Kolkata")).toBe("2026-03-29");
    });

    it("Asia/Kathmandu (+5:45)", () => {
      // 2026-04-04 00:30 NPT = 2026-04-03 18:45 UTC
      const now = new Date("2026-04-03T18:45:00Z");
      const range = buildWeeklyRange(now, "Asia/Kathmandu");

      // Nepal is April 4
      expect(toISODate(range.to, "Asia/Kathmandu")).toBe("2026-04-04");
    });

    it("Australia/Adelaide (+9:30 / +10:30 DST)", () => {
      // 2026-04-04 at some time ACST (+9:30 in April, no DST in April for Adelaide)
      // Actually Adelaide is +10:30 ACDT in April (DST ends first Sun of April)
      // Use a clear date: 2026-01-15 (clearly in ACDT +10:30)
      // 2026-01-15 00:30 ACDT = 2026-01-14 14:00 UTC
      const now = new Date("2026-01-14T14:00:00Z");
      const range = buildWeeklyRange(now, "Australia/Adelaide");

      expect(toISODate(range.to, "Australia/Adelaide")).toBe("2026-01-15");
      expect(toISODate(range.from, "Australia/Adelaide")).toBe("2026-01-09");
    });
  });

  // -------------------------------------------------------------------
  // Year boundary
  // -------------------------------------------------------------------

  describe("year boundary", () => {
    it("range spans year boundary in UTC", () => {
      const now = new Date("2026-01-02T12:00:00Z");
      const range = buildWeeklyRange(now);

      expect(toISODate(range.from)).toBe("2025-12-27");
      expect(toISODate(range.to)).toBe("2026-01-02");
    });

    it("year boundary with JST: Jan 1 in JST but Dec 31 in UTC", () => {
      // 2026-01-01 02:00 JST = 2025-12-31 17:00 UTC
      const now = new Date("2025-12-31T17:00:00Z");
      const utcRange = buildWeeklyRange(now, "UTC");
      const jstRange = buildWeeklyRange(now, "Asia/Tokyo");

      // UTC: Dec 31
      expect(toISODate(utcRange.to, "UTC")).toBe("2025-12-31");
      // JST: Jan 1
      expect(toISODate(jstRange.to, "Asia/Tokyo")).toBe("2026-01-01");
      expect(toISODate(jstRange.from, "Asia/Tokyo")).toBe("2025-12-26");
    });

    it("year boundary with negative offset: Dec 31 in NYC but Jan 1 in UTC", () => {
      // 2026-01-01 02:00 UTC = 2025-12-31 21:00 EST
      const now = new Date("2026-01-01T02:00:00Z");
      const utcRange = buildWeeklyRange(now, "UTC");
      const nyRange = buildWeeklyRange(now, "America/New_York");

      expect(toISODate(utcRange.to, "UTC")).toBe("2026-01-01");
      expect(toISODate(nyRange.to, "America/New_York")).toBe("2025-12-31");
    });
  });

  // -------------------------------------------------------------------
  // Month boundary
  // -------------------------------------------------------------------

  describe("month boundary", () => {
    it("range spans February to March (non-leap year)", () => {
      // 2026 is not a leap year
      const now = new Date("2026-03-02T12:00:00Z");
      const range = buildWeeklyRange(now);

      expect(toISODate(range.from)).toBe("2026-02-24");
      expect(toISODate(range.to)).toBe("2026-03-02");
    });

    it("range spans February to March (leap year)", () => {
      // 2028 is a leap year (Feb has 29 days)
      const now = new Date("2028-03-02T12:00:00Z");
      const range = buildWeeklyRange(now);

      expect(toISODate(range.from)).toBe("2028-02-25");
      expect(toISODate(range.to)).toBe("2028-03-02");
    });

    it("Feb 29 in leap year as end date", () => {
      const now = new Date("2028-02-29T12:00:00Z");
      const range = buildWeeklyRange(now);

      expect(toISODate(range.from)).toBe("2028-02-23");
      expect(toISODate(range.to)).toBe("2028-02-29");
    });
  });

  // -------------------------------------------------------------------
  // DST transitions
  // -------------------------------------------------------------------

  describe("DST transitions", () => {
    it("spring forward (US): clocks skip 2:00 AM", () => {
      // US DST 2026 spring forward: March 8, 2026, 2:00 AM EST -> 3:00 AM EDT
      // Range ending March 8 spans the transition
      const now = new Date("2026-03-08T12:00:00Z");
      const range = buildWeeklyRange(now, "America/New_York");

      expect(toISODate(range.from, "America/New_York")).toBe("2026-03-02");
      expect(toISODate(range.to, "America/New_York")).toBe("2026-03-08");
    });

    it("fall back (US): clocks repeat 1:00 AM", () => {
      // US DST 2026 fall back: November 1, 2026, 2:00 AM EDT -> 1:00 AM EST
      const now = new Date("2026-11-01T12:00:00Z");
      const range = buildWeeklyRange(now, "America/New_York");

      expect(toISODate(range.from, "America/New_York")).toBe("2026-10-26");
      expect(toISODate(range.to, "America/New_York")).toBe("2026-11-01");
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
      const now = new Date("2026-04-04T00:00:00.000Z");
      const range = buildWeeklyRange(now, "UTC");

      expect(toISODate(range.to, "UTC")).toBe("2026-04-04");
    });

    it("JST midnight (= 15:00 UTC prev day) belongs to the new day", () => {
      // Midnight JST April 4 = 2026-04-03T15:00:00Z
      const now = new Date("2026-04-03T15:00:00Z");
      const range = buildWeeklyRange(now, "Asia/Tokyo");

      expect(toISODate(range.to, "Asia/Tokyo")).toBe("2026-04-04");
    });

    it("1ms before JST midnight stays on previous day", () => {
      // 23:59:59.999 JST April 3 = 2026-04-03T14:59:59.999Z
      const now = new Date("2026-04-03T14:59:59.999Z");
      const range = buildWeeklyRange(now, "Asia/Tokyo");

      expect(toISODate(range.to, "Asia/Tokyo")).toBe("2026-04-03");
    });
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
