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

  it("strips HTML comments", () => {
    const body = "Before <!-- hidden comment --> After";
    expect(cleanBody(body)).toBe("Before After");
  });

  it("strips multi-line HTML comments", () => {
    const body = "Start\n<!-- \nmultiline\ncomment\n-->\nEnd";
    expect(cleanBody(body)).toBe("Start\n\nEnd");
  });

  it("strips markdown tables", () => {
    const body = "Intro\n| Col1 | Col2 |\n|------|------|\n| A | B |\nAfter";
    expect(cleanBody(body)).toBe("Intro\nAfter");
  });

  it("strips code blocks", () => {
    const body = "Before\n```js\nconsole.log('hi');\n```\nAfter";
    expect(cleanBody(body)).toBe("Before\n\nAfter");
  });

  it("collapses excessive whitespace", () => {
    const body = "A\n\n\n\nB   C";
    expect(cleanBody(body)).toBe("A\n\nB C");
  });

  it("extracts summary section when present", () => {
    const body = "## Summary\nThis is the summary.\n\n## Details\nSome details.";
    expect(cleanBody(body)).toBe("This is the summary.");
  });

  it("returns full text when no summary section", () => {
    const body = "No special sections here.";
    expect(cleanBody(body)).toBe("No special sections here.");
  });

  it("returns null when all content is stripped", () => {
    const body = "<!-- only a comment -->";
    expect(cleanBody(body)).toBeNull();
  });
});
