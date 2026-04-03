import { describe, it, expect } from "vitest";
import { getWeekId } from "./week.js";

describe("getWeekId", () => {
  it("returns correct ISO week for 2026-04-04 (W14)", () => {
    const result = getWeekId(new Date("2026-04-04T12:00:00Z"));
    expect(result.year).toBe(2026);
    expect(result.week).toBe(14);
    expect(result.path).toBe("2026/W14");
  });

  it("returns correct ISO week for 2026-01-01 (W01)", () => {
    const result = getWeekId(new Date("2026-01-01T12:00:00Z"));
    expect(result.year).toBe(2026);
    expect(result.week).toBe(1);
    expect(result.path).toBe("2026/W01");
  });

  it("pads single-digit week numbers", () => {
    const result = getWeekId(new Date("2026-02-01T12:00:00Z"));
    expect(result.path).toMatch(/^\d{4}\/W\d{2}$/);
  });
});
