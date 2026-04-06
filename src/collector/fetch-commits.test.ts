import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchCommitMessages } from "./fetch-commits.js";
import type { DateRange } from "./date-range.js";

const range: DateRange = {
  from: new Date("2026-03-30T00:00:00Z"),
  to: new Date("2026-04-05T23:59:59Z"),
};

const makeRawCommit = (message: string) => ({
  sha: "abc123",
  commit: { message, author: { date: "2026-04-01T12:00:00Z" } },
});

// Helper to create a Response with a Link header for pagination
const pagedResponse = (commits: unknown[], nextUrl?: string) => {
  const headers: Record<string, string> = {};
  if (nextUrl) headers["link"] = `<${nextUrl}>; rel="next"`;
  return new Response(JSON.stringify(commits), { status: 200, headers });
};

describe("fetchCommitMessages", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches commit messages for multiple repos", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(pagedResponse([
        makeRawCommit("feat: add login"),
        makeRawCommit("fix: typo in header"),
      ]))
      .mockResolvedValueOnce(pagedResponse([
        makeRawCommit("chore: update deps"),
      ]));

    const result = await fetchCommitMessages("token", "user", ["org/repo-a", "org/repo-b"], range);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ repo: "org/repo-a", messages: ["feat: add login", "fix: typo in header"] });
    expect(result[1]).toEqual({ repo: "org/repo-b", messages: ["chore: update deps"] });
  });

  it("paginates through multiple pages", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => makeRawCommit(`page1-${i}`));
    const page2 = Array.from({ length: 50 }, (_, i) => makeRawCommit(`page2-${i}`));

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(pagedResponse(page1, "https://api.github.com/repos/org/repo/commits?page=2"))
      .mockResolvedValueOnce(pagedResponse(page2));

    const result = await fetchCommitMessages("token", "user", ["org/repo"], range);

    expect(result[0].messages).toHaveLength(150);
    expect(result[0].messages[0]).toBe("page1-0");
    expect(result[0].messages[100]).toBe("page2-0");
  });

  it("extracts only the first line of multi-line commit messages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      pagedResponse([makeRawCommit("feat: new feature\n\nLong description here\nMore details")]),
    );

    const result = await fetchCommitMessages("token", "user", ["org/repo"], range);

    expect(result[0].messages).toEqual(["feat: new feature"]);
  });

  it("truncates long commit messages to 200 characters", async () => {
    const longMessage = "a".repeat(300);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      pagedResponse([makeRawCommit(longMessage)]),
    );

    const result = await fetchCommitMessages("token", "user", ["org/repo"], range);

    expect(result[0].messages[0]).toBe("a".repeat(200) + "...");
    expect(result[0].messages[0].length).toBe(203);
  });

  it("skips repos with no commits", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(pagedResponse([]));

    const result = await fetchCommitMessages("token", "user", ["org/empty"], range);

    expect(result).toHaveLength(0);
  });

  it("skips repos returning 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { status: 404, statusText: "Not Found" }),
    );

    const result = await fetchCommitMessages("token", "user", ["org/deleted"], range);

    expect(result).toHaveLength(0);
  });

  it("skips repos returning 409 (empty repo)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { status: 409 }),
    );

    const result = await fetchCommitMessages("token", "user", ["org/empty-repo"], range);

    expect(result).toHaveLength(0);
  });

  it("returns empty array for empty repos list", async () => {
    const result = await fetchCommitMessages("token", "user", [], range);

    expect(result).toEqual([]);
  });

  it("retries on 429 rate limit", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("", { status: 429, headers: { "retry-after": "0" } }),
      )
      .mockResolvedValueOnce(pagedResponse([makeRawCommit("after retry")]));

    const result = await fetchCommitMessages("token", "user", ["org/repo"], range);

    expect(result[0].messages).toEqual(["after retry"]);
  });
});
