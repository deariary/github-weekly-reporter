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

describe("fetchCommitMessages", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches commit messages for multiple repos", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify([
          makeRawCommit("feat: add login"),
          makeRawCommit("fix: typo in header"),
        ]), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([
          makeRawCommit("chore: update deps"),
        ]), { status: 200 }),
      );

    const result = await fetchCommitMessages("token", "user", ["org/repo-a", "org/repo-b"], range);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ repo: "org/repo-a", messages: ["feat: add login", "fix: typo in header"] });
    expect(result[1]).toEqual({ repo: "org/repo-b", messages: ["chore: update deps"] });
  });

  it("extracts only the first line of multi-line commit messages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([
        makeRawCommit("feat: new feature\n\nLong description here\nMore details"),
      ]), { status: 200 }),
    );

    const result = await fetchCommitMessages("token", "user", ["org/repo"], range);

    expect(result[0].messages).toEqual(["feat: new feature"]);
  });

  it("skips repos with no commits", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );

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

  it("respects per_page limit from API (10 per repo)", async () => {
    // API honors per_page=10, so even if repo has more commits, only 10 are returned
    const commits = Array.from({ length: 10 }, (_, i) => makeRawCommit(`commit ${i}`));
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(commits), { status: 200 }),
    );

    const result = await fetchCommitMessages("token", "user", ["org/busy"], range);

    expect(result[0].messages.length).toBe(10);
  });

  it("caps total messages at 50 across all repos", async () => {
    // 6 repos each returning 10 commits = 60 total, should be capped at 50
    const commits = Array.from({ length: 10 }, (_, i) => makeRawCommit(`msg ${i}`));
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => Promise.resolve(new Response(JSON.stringify(commits), { status: 200 })),
    );

    const repos = Array.from({ length: 6 }, (_, i) => `org/repo-${i}`);
    const result = await fetchCommitMessages("token", "user", repos, range);

    const totalMsgs = result.reduce((sum, r) => sum + r.messages.length, 0);
    expect(totalMsgs).toBeLessThanOrEqual(50);
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
      .mockResolvedValueOnce(
        new Response(JSON.stringify([makeRawCommit("after retry")]), { status: 200 }),
      );

    const result = await fetchCommitMessages("token", "user", ["org/repo"], range);

    expect(result[0].messages).toEqual(["after retry"]);
  });
});
