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

  it("skips falsy repo entries without calling fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await fetchReleases("token", [""], range);

    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
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

  it("uses default delay when retry-after header is missing", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("", { status: 429, statusText: "Too Many Requests" }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([
          makeRawRelease("v1.0.0", "2026-04-01T12:00:00Z"),
        ]), { status: 200 }),
      );

    const promise = fetchReleases("token", ["org/repo"], range);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
    vi.useRealTimers();
  });

  it("ignores invalid retry-after values and uses default delay", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("", {
          status: 429,
          statusText: "Too Many Requests",
          headers: { "retry-after": "not-a-number" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([
          makeRawRelease("v1.0.0", "2026-04-01T12:00:00Z"),
        ]), { status: 200 }),
      );

    const promise = fetchReleases("token", ["org/repo"], range);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
    vi.useRealTimers();
  });

  it("returns empty and warns on non-retryable failure status", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { status: 500, statusText: "Internal Server Error" }),
    );

    const result = await fetchReleases("token", ["org/repo"], range);

    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to fetch releases for org/repo"),
    );
  });

  it("returns empty when 429 retries are exhausted", async () => {
    vi.useFakeTimers();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", {
        status: 429,
        statusText: "Too Many Requests",
        headers: { "retry-after": "0" },
      }),
    );

    const promise = fetchReleases("token", ["org/repo"], range);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual([]);
    // MAX_RETRIES=3 → attempts 0..3 (4 total); the final attempt warns and returns []
    expect(fetchSpy).toHaveBeenCalledTimes(4);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to fetch releases for org/repo"),
    );
    vi.useRealTimers();
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

  it("filters out releases with null published_at (drafts)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([
        { tag_name: "v1.0.0", name: "v1.0.0", body: "ok", html_url: "https://example.com/1", published_at: null },
        makeRawRelease("v1.1.0", "2026-04-02T12:00:00Z"),
      ]), { status: 200 }),
    );

    const result = await fetchReleases("token", ["org/repo"], range);

    expect(result).toHaveLength(1);
    expect(result[0].tag).toBe("v1.1.0");
  });

  it("falls back to tag_name when name is null", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([
        { tag_name: "v2.0.0", name: null, body: "release", html_url: "https://example.com/2", published_at: "2026-04-02T12:00:00Z" },
      ]), { status: 200 }),
    );

    const result = await fetchReleases("token", ["org/repo"], range);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("v2.0.0");
  });
});
