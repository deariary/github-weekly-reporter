import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapState, fetchPRsByRefs } from "./fetch-repo-prs.js";
import type { PRRef } from "./fetch-repo-prs.js";

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

describe("fetchPRsByRefs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const makeRawPR = (number: number) => ({
    number,
    title: `PR #${number}`,
    state: "open",
    html_url: `https://github.com/owner/repo/pull/${number}`,
    body: "Some body",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-02T00:00:00Z",
    merged_at: null,
    additions: 10,
    deletions: 5,
    changed_files: 3,
    user: { login: "testuser" },
    labels: [{ name: "feature" }],
  });

  it("fetches and maps PRs correctly", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeRawPR(1)), { status: 200 }),
    );

    const refs: PRRef[] = [{ repo: "owner/repo", number: 1 }];
    const result = await fetchPRsByRefs("token", refs);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("PR #1");
    expect(result[0].repository).toBe("owner/repo");
    expect(result[0].state).toBe("open");
    expect(result[0].labels).toEqual(["feature"]);
    expect(result[0].additions).toBe(10);
    expect(result[0].deletions).toBe(5);
    expect(result[0].changedFiles).toBe(3);
  });

  it("deduplicates refs before fetching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeRawPR(1)), { status: 200 }),
    );

    const refs: PRRef[] = [
      { repo: "owner/repo", number: 1 },
      { repo: "owner/repo", number: 1 },
    ];
    await fetchPRsByRefs("token", refs);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("skips failed fetches", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 404, statusText: "Not Found" }))
      .mockResolvedValueOnce(new Response(JSON.stringify(makeRawPR(2)), { status: 200 }));

    const refs: PRRef[] = [
      { repo: "owner/repo", number: 1 },
      { repo: "owner/repo", number: 2 },
    ];
    const result = await fetchPRsByRefs("token", refs);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("PR #2");
  });

  it("returns empty array for empty refs", async () => {
    const result = await fetchPRsByRefs("token", []);
    expect(result).toEqual([]);
  });

  it("handles merged PR state correctly", async () => {
    const rawPR = { ...makeRawPR(1), state: "closed", merged_at: "2026-04-02T00:00:00Z" };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(rawPR), { status: 200 }),
    );

    const refs: PRRef[] = [{ repo: "owner/repo", number: 1 }];
    const result = await fetchPRsByRefs("token", refs);
    expect(result[0].state).toBe("merged");
    expect(result[0].mergedAt).toBe("2026-04-02T00:00:00Z");
  });

  it("handles null user as unknown author", async () => {
    const rawPR = { ...makeRawPR(1), user: null };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(rawPR), { status: 200 }),
    );

    const refs: PRRef[] = [{ repo: "owner/repo", number: 1 }];
    const result = await fetchPRsByRefs("token", refs);
    expect(result[0].author).toBe("unknown");
  });
});
