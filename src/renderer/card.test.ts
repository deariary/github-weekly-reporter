import { describe, it, expect } from "vitest";
import { generateCard, generateDarkCard } from "./card.js";

const data = {
  username: "testuser",
  weekLabel: "Week 14",
  dateRange: "Mar 30 - Apr 5, 2026",
  title: "Auth refactor completed",
  summaries: [
    {
      type: "commit-summary" as const,
      heading: "Commit Summary",
      body: "Focused on auth refactoring.",
      chips: [{ label: "commits", value: "42", color: "green" as const }],
    },
    {
      type: "activity-pattern" as const,
      heading: "Activity Pattern",
      body: "Peak on Wednesday.",
      chips: [],
    },
  ],
};

describe("generateCard", () => {
  it("returns a valid SVG with 100% width", () => {
    const svg = generateCard(data);
    expect(svg).toContain("<svg");
    expect(svg).toContain('width="100%"');
    expect(svg).toContain("</svg>");
  });

  it("includes WEEKLY NEWS badge", () => {
    const svg = generateCard(data);
    expect(svg).toContain("WEEKLY NEWS");
  });

  it("includes week label and date range", () => {
    const svg = generateCard(data);
    expect(svg).toContain("Week 14");
    expect(svg).toContain("Mar 30 - Apr 5, 2026");
  });

  it("includes summary headings with fallback labels", () => {
    const svg = generateCard(data);
    expect(svg).toContain("Commit Summary");
    expect(svg).toContain("Activity Pattern");
    expect(svg).toContain("BREAKING");
  });

  it("includes CSS scroll animation", () => {
    const svg = generateCard(data);
    expect(svg).toContain("@keyframes scroll");
    expect(svg).toContain("translateX");
  });

  it("repeats ticker text many times", () => {
    const svg = generateCard(data);
    const matches = svg.match(/Commit Summary/g);
    expect(matches!.length).toBeGreaterThanOrEqual(10);
  });

  it("uses ticker items with custom labels when provided", () => {
    const svg = generateCard({
      ...data,
      ticker: [
        { label: "SHIPPED!", text: "@testuser deploys JWT to production" },
        { label: "CODE PURGE", text: "@testuser removes 1,204 lines" },
      ],
    });
    expect(svg).toContain("SHIPPED!");
    expect(svg).toContain("CODE PURGE");
    expect(svg).toContain("deploys JWT to production");
    expect(svg).not.toContain("Commit Summary");
  });

  it("falls back to title when no summaries", () => {
    const svg = generateCard({ ...data, summaries: [] });
    expect(svg).toContain("Auth refactor completed");
  });

  it("escapes XML special characters", () => {
    const svg = generateCard({
      ...data,
      ticker: [{ label: "FIX!", text: "Fix <script> & deploy" }],
    });
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("&amp;");
    expect(svg).not.toContain("<script>");
  });

  it("uses light colors by default", () => {
    const svg = generateCard(data);
    expect(svg).toContain("#ffffff");
  });
});

describe("generateDarkCard", () => {
  it("uses dark colors", () => {
    const svg = generateDarkCard(data);
    expect(svg).toContain("#0d1117");
  });

  it("includes the same ticker content", () => {
    const svg = generateDarkCard(data);
    expect(svg).toContain("Commit Summary");
    expect(svg).toContain("Week 14");
  });
});
