import { describe, it, expect } from "vitest";
import { generateOGImage, generateIndexOGImage } from "./og-image.js";

describe("generateOGImage", () => {
  const data = {
    title: "Auth refactor completed",
    subtitle: "A focused backend week",
    username: "testuser",
    dateRange: "2026-03-28 - 2026-04-03",
    language: "en" as const,
    stats: { commits: 42, prs: 5, reviews: 8 },
  };

  it("returns a Buffer", async () => {
    const result = await generateOGImage(data);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it("generates a valid PNG (magic bytes)", async () => {
    const result = await generateOGImage(data);
    // PNG magic bytes: 137 80 78 71 13 10 26 10
    expect(result[0]).toBe(0x89);
    expect(result[1]).toBe(0x50); // P
    expect(result[2]).toBe(0x4e); // N
    expect(result[3]).toBe(0x47); // G
  });

  it("works with Japanese language", async () => {
    const result = await generateOGImage({ ...data, language: "ja" });
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("works with Korean language", async () => {
    const result = await generateOGImage({ ...data, language: "ko" });
    expect(Buffer.isBuffer(result)).toBe(true);
  });
});

describe("generateIndexOGImage", () => {
  const data = {
    siteTitle: "Dev Pulse",
    username: "testuser",
    language: "en" as const,
    reportCount: 5,
  };

  it("returns a Buffer", async () => {
    const result = await generateIndexOGImage(data);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it("generates a valid PNG", async () => {
    const result = await generateIndexOGImage(data);
    expect(result[0]).toBe(0x89);
    expect(result[1]).toBe(0x50);
  });

  it("handles single report count", async () => {
    const result = await generateIndexOGImage({ ...data, reportCount: 1 });
    expect(Buffer.isBuffer(result)).toBe(true);
  });
});
