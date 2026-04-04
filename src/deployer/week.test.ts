import { describe, it, expect } from "vitest";
import { getWeekId } from "./week.js";

describe("getWeekId", () => {
  // -------------------------------------------------------------------
  // Basic behavior
  // -------------------------------------------------------------------

  it("returns previous ISO week for 2026-04-04 (W14) in UTC -> W13", () => {
    // 2026-04-04 is Sat W14 -> previous week = W13
    const result = getWeekId(new Date("2026-04-04T12:00:00Z"));
    expect(result.year).toBe(2026);
    expect(result.week).toBe(13);
    expect(result.path).toBe("2026/W13");
  });

  it("returns previous ISO week for 2026-01-01 (W01) in UTC -> W52 of 2025", () => {
    // 2026-01-01 is Thu W1 of 2026 -> previous week = W52 of 2025
    const result = getWeekId(new Date("2026-01-01T12:00:00Z"));
    expect(result.year).toBe(2025);
    expect(result.week).toBe(52);
    expect(result.path).toBe("2025/W52");
  });

  it("pads single-digit week numbers", () => {
    const result = getWeekId(new Date("2026-02-01T12:00:00Z"));
    expect(result.path).toMatch(/^\d{4}\/W\d{2}$/);
  });

  // -------------------------------------------------------------------
  // Timezone: same instant, different local date -> different week
  // -------------------------------------------------------------------

  describe("timezone-aware week resolution", () => {
    it("same instant gives same previous week when local dates are in same ISO week", () => {
      // 2026-04-03T23:00:00Z = Apr 3 UTC (Fri W14), Apr 4 JST (Sat W14)
      // Both in W14 -> previous = W13
      const utcResult = getWeekId(new Date("2026-04-03T23:00:00Z"), "UTC");
      const jstResult = getWeekId(new Date("2026-04-03T23:00:00Z"), "Asia/Tokyo");

      expect(utcResult.week).toBe(13);
      expect(jstResult.week).toBe(13);
    });

    it("same instant gives different previous weeks when local dates cross ISO week boundary", () => {
      // ISO week boundary: Sunday -> Monday
      // 2026-04-05 is Sunday (last day of W14), 2026-04-06 is Monday (first day of W15)
      // 2026-04-05T23:00:00Z = Apr 5 UTC (Sun W14), Apr 6 JST (Mon W15)
      // UTC: W14 -> prev W13; JST: W15 -> prev W14
      const utcResult = getWeekId(new Date("2026-04-05T23:00:00Z"), "UTC");
      const jstResult = getWeekId(new Date("2026-04-05T23:00:00Z"), "Asia/Tokyo");

      expect(utcResult.week).toBe(13); // Sunday W14 in UTC -> prev W13
      expect(jstResult.week).toBe(14); // Monday W15 in JST -> prev W14
    });

    it("negative offset: NYC behind UTC at week boundary", () => {
      // 2026-04-06 is Monday W15
      // 2026-04-06T03:00:00Z = Apr 5 23:00 EDT (Sun W14 in NYC), Apr 6 in UTC (Mon W15)
      // UTC: W15 -> prev W14; NYC: W14 -> prev W13
      const utcResult = getWeekId(new Date("2026-04-06T03:00:00Z"), "UTC");
      const nyResult = getWeekId(new Date("2026-04-06T03:00:00Z"), "America/New_York");

      expect(utcResult.week).toBe(14); // Monday W15 in UTC -> prev W14
      expect(nyResult.week).toBe(13);  // Sunday W14 in NYC -> prev W13
    });
  });

  // -------------------------------------------------------------------
  // Year boundary: ISO week year can differ from calendar year
  // -------------------------------------------------------------------

  describe("year boundary", () => {
    it("Dec 31 UTC vs Jan 1 JST", () => {
      // 2025-12-31T23:30:00Z = Dec 31 UTC (W1 of 2026), Jan 1 2026 JST (W1 of 2026)
      // Both in W1 -> previous = W52 of 2025
      const utcResult = getWeekId(new Date("2025-12-31T23:30:00Z"), "UTC");
      const jstResult = getWeekId(new Date("2025-12-31T23:30:00Z"), "Asia/Tokyo");

      expect(utcResult.year).toBe(2025);
      expect(jstResult.year).toBe(2025);
    });

    it("Jan 1 UTC vs Dec 31 in negative offset", () => {
      // 2026-01-01T02:00:00Z = Jan 1 UTC (W1), Dec 31 2025 in NYC (W1)
      // Both in W1 -> previous = W52 of 2025
      const utcResult = getWeekId(new Date("2026-01-01T02:00:00Z"), "UTC");
      const nyResult = getWeekId(new Date("2026-01-01T02:00:00Z"), "America/New_York");

      expect(utcResult.year).toBe(2025);
      expect(nyResult.year).toBe(2025);
    });

    it("ISO week 1 of 2026 starts on Monday Dec 29, 2025 -> prev is W52", () => {
      // Dec 29, 2025 is Monday W01 of 2026 -> previous week = W52 of 2025
      const result = getWeekId(new Date("2025-12-29T12:00:00Z"), "UTC");
      expect(result.week).toBe(52);
      expect(result.year).toBe(2025);
    });

    it("last week of year: Dec 28, 2025 is Sunday W52 -> prev W51", () => {
      // Dec 28 2025 (Sun W52) -> previous = W51
      const result = getWeekId(new Date("2025-12-28T12:00:00Z"), "UTC");
      expect(result.week).toBe(51);
    });
  });

  // -------------------------------------------------------------------
  // Extreme offsets
  // -------------------------------------------------------------------

  describe("extreme offsets", () => {
    it("Pacific/Auckland (+12) can be a full day ahead of UTC", () => {
      // 2026-04-06T12:00:00Z = Apr 7 00:00 NZST (Tue W15) -> prev W14
      const result12 = getWeekId(new Date("2026-04-06T12:00:00Z"), "Pacific/Auckland");
      expect(result12.week).toBe(14);
    });

    it("Pacific/Honolulu (-10) can be a day behind UTC", () => {
      // 2026-04-06T06:00:00Z = Apr 5 20:00 HST (Sun W14) -> prev W13
      const result = getWeekId(new Date("2026-04-06T06:00:00Z"), "Pacific/Honolulu");
      expect(result.week).toBe(13);
    });
  });

  // -------------------------------------------------------------------
  // Non-standard offset timezones
  // -------------------------------------------------------------------

  describe("non-standard offsets", () => {
    it("Asia/Kolkata (+5:30)", () => {
      // 2026-04-05T18:30:00Z = Apr 6 00:00 IST (Mon W15) -> prev W14
      const result = getWeekId(new Date("2026-04-05T18:30:00Z"), "Asia/Kolkata");
      expect(result.week).toBe(14);
    });

    it("Asia/Kathmandu (+5:45)", () => {
      // 2026-04-05T18:15:00Z = Apr 6 00:00 NPT (Mon W15) -> prev W14
      const result = getWeekId(new Date("2026-04-05T18:15:00Z"), "Asia/Kathmandu");
      expect(result.week).toBe(14);
    });
  });

  // -------------------------------------------------------------------
  // Exact midnight
  // -------------------------------------------------------------------

  describe("exact midnight", () => {
    it("UTC midnight: day belongs to new date", () => {
      // Monday 2026-04-06 00:00:00Z (W15) -> prev W14
      const result = getWeekId(new Date("2026-04-06T00:00:00.000Z"), "UTC");
      expect(result.week).toBe(14);
    });

    it("1ms before UTC midnight: still previous day", () => {
      // Sunday 2026-04-05 23:59:59.999Z (W14) -> prev W13
      const result = getWeekId(new Date("2026-04-05T23:59:59.999Z"), "UTC");
      expect(result.week).toBe(13);
    });

    it("JST midnight (15:00 UTC) belongs to new JST date", () => {
      // 2026-04-06 00:00 JST = 2026-04-05T15:00:00Z -> Mon W15 in JST -> prev W14
      const result = getWeekId(new Date("2026-04-05T15:00:00Z"), "Asia/Tokyo");
      expect(result.week).toBe(14);
    });

    it("1ms before JST midnight stays on previous day", () => {
      // 2026-04-05 23:59:59.999 JST = 2026-04-05T14:59:59.999Z -> Sun W14 in JST -> prev W13
      const result = getWeekId(new Date("2026-04-05T14:59:59.999Z"), "Asia/Tokyo");
      expect(result.week).toBe(13);
    });
  });
});
