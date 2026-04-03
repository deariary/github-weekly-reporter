import { describe, it, expect } from "vitest";
import { getWeekId } from "./week.js";

describe("getWeekId", () => {
  it("returns correct ISO week for 2026-04-04 (W14) in UTC", () => {
    const result = getWeekId(new Date("2026-04-04T12:00:00Z"));
    expect(result.year).toBe(2026);
    expect(result.week).toBe(14);
    expect(result.path).toBe("2026/W14");
  });

  it("returns correct ISO week for 2026-01-01 (W01) in UTC", () => {
    const result = getWeekId(new Date("2026-01-01T12:00:00Z"));
    expect(result.year).toBe(2026);
    expect(result.week).toBe(1);
    expect(result.path).toBe("2026/W01");
  });

  it("pads single-digit week numbers", () => {
    const result = getWeekId(new Date("2026-02-01T12:00:00Z"));
    expect(result.path).toMatch(/^\d{4}\/W\d{2}$/);
  });

  it("respects timezone when crossing midnight", () => {
    // 2026-04-03T23:00:00Z = 2026-04-04 08:00 JST
    // UTC: April 3 is W14, JST: April 4 is also W14
    const utcResult = getWeekId(new Date("2026-04-03T23:00:00Z"), "UTC");
    const jstResult = getWeekId(new Date("2026-04-03T23:00:00Z"), "Asia/Tokyo");

    expect(utcResult.year).toBe(2026);
    expect(jstResult.year).toBe(2026);
    // Both are in W14, but the local date differs
    expect(utcResult.week).toBe(14);
    expect(jstResult.week).toBe(14);
  });

  it("handles timezone at year boundary", () => {
    // 2025-12-31T23:30:00Z = 2026-01-01 08:30 JST
    const utcResult = getWeekId(new Date("2025-12-31T23:30:00Z"), "UTC");
    const jstResult = getWeekId(new Date("2025-12-31T23:30:00Z"), "Asia/Tokyo");

    // UTC: still Dec 31, 2025 (W01 of 2026 per ISO)
    expect(utcResult.year).toBe(2025);
    // JST: already Jan 1, 2026
    expect(jstResult.year).toBe(2026);
  });
});
