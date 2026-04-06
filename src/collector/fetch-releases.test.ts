import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchReleases } from "./fetch-releases.js";
import type { DateRange } from "./date-range.js";

const range: DateRange = {
  from: new Date("2026-03-30T00:00:00Z"),
  to: new Date("2026-04-05T23:59:59Z"),
};

const makeRawRelease = (tag: string, publishedAt: string, body?: string) => ({
  tag_name: tag,
  name: tag,
  body: body ?? `Release ${tag}`,
  html_url: `https://github.com/org/repo/releases/tag/${tag}`,
  published_at: publishedAt,
});

describe("fetchReleases", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches releases within date range", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([
        makeRawRelease("v1.0.0", "2026-04-01T12:00:00Z"),
        makeRawRelease("v0.9.0", "2026-03-20T12:00:00Z"), // out of range
      ]), { status: 200 }),
    );

    const result = await fetchReleases("token", ["org/repo"], range);

    expect(result).toHaveLength(1);
    expect(result[0].tag).toBe("v1.0.0");
    expect(result[0].repo).toBe("org/repo");
    expect(result[0].body).toBe("Release v1.0.0");
  });

  it("fetches releases from multiple repos", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify([
          makeRawRelease("v2.0.0", "2026-04-02T12:00:00Z"),
        ]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([
          makeRawRelease("v3.0.0", "2026-04-03T12:00:00Z"),
        ]), { status: 200 }),
      );

    const result = await fetchReleases("token", ["org/repo-a", "org/repo-b"], range);

    expect(result).toHaveLength(2);
  });

  it("truncates long release bodies to 500 chars", async () => {
    const longBody = "a".repeat(600);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([
        makeRawRelease("v1.0.0", "2026-04-01T12:00:00Z", longBody),
      ]), { status: 200 }),
    );

    const result = await fetchReleases("token", ["org/repo"], range);

    expect(result[0].body).toBe("a".repeat(500) + "...");
  });

  it("skips repos returning 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { status: 404 }),
    );

    const result = await fetchReleases("token", ["org/deleted"], range);

    expect(result).toHaveLength(0);
  });

  it("returns empty array for repos with no releases in range", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([
        makeRawRelease("v0.1.0", "2026-01-01T12:00:00Z"), // out of range
      ]), { status: 200 }),
    );

    const result = await fetchReleases("token", ["org/repo"], range);

    expect(result).toHaveLength(0);
  });

  it("returns empty for empty repos list", async () => {
    const result = await fetchReleases("token", [], range);

    expect(result).toEqual([]);
  });

  it("retries on 429 rate limit", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("", { status: 429, headers: { "retry-after": "0" } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([
          makeRawRelease("v1.0.0", "2026-04-01T12:00:00Z"),
        ]), { status: 200 }),
      );

    const result = await fetchReleases("token", ["org/repo"], range);

    expect(result).toHaveLength(1);
  });

  it("handles null body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([
        { tag_name: "v1.0.0", name: "v1.0.0", body: null, html_url: "https://example.com", published_at: "2026-04-01T12:00:00Z" },
      ]), { status: 200 }),
    );

    const result = await fetchReleases("token", ["org/repo"], range);

    expect(result[0].body).toBeNull();
  });
});
