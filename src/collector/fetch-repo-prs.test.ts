import { describe, it, expect } from "vitest";
import { mapState } from "./fetch-repo-prs.js";

describe("mapState", () => {
  it("returns 'merged' when mergedAt is truthy", () => {
    expect(mapState("closed", "2026-04-01T12:00:00Z")).toBe("merged");
  });

  it("returns 'merged' even when state is open but mergedAt is set", () => {
    expect(mapState("open", "2026-04-01T12:00:00Z")).toBe("merged");
  });

  it("returns 'closed' when state is closed and mergedAt is null", () => {
    expect(mapState("closed", null)).toBe("closed");
  });

  it("returns 'open' when state is open and mergedAt is null", () => {
    expect(mapState("open", null)).toBe("open");
  });

  it("returns 'open' for any non-closed state without mergedAt", () => {
    expect(mapState("draft", null)).toBe("open");
  });
});
