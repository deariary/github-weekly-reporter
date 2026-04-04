import { describe, it, expect } from "vitest";
import { cleanBody } from "./clean-body.js";

describe("cleanBody", () => {
  it("returns null for null input", () => {
    expect(cleanBody(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(cleanBody("")).toBeNull();
  });

  it("passes short text through unchanged", () => {
    expect(cleanBody("Fix typo in README")).toBe("Fix typo in README");
  });

  it("truncates text exceeding 300 characters", () => {
    const long = "a".repeat(400);
    const result = cleanBody(long);
    expect(result).toHaveLength(303); // 300 + "..."
    expect(result!.endsWith("...")).toBe(true);
  });

  it("does not add ellipsis for text exactly at the limit", () => {
    const exact = "a".repeat(300);
    const result = cleanBody(exact);
    expect(result).toBe(exact);
  });
});
