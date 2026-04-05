import { describe, it, expect, vi, beforeEach } from "vitest";
import { summarizePayload, dedupeEvents, fetchEvents, isInRange } from "./fetch-events.js";
import type { GitHubEvent } from "../types.js";
import type { DateRange } from "./date-range.js";

describe("summarizePayload", () => {
  it("extracts ref and commit messages for PushEvent", () => {
    const result = summarizePayload("PushEvent", {
      ref: "refs/heads/main",
      commits: [{ message: "fix: typo" }, { message: "feat: add login" }],
    });
    expect(result).toEqual({
      kind: "push",
      ref: "refs/heads/main",
      commits: ["fix: typo", "feat: add login"],
    });
  });

  it("handles PushEvent with missing commits", () => {
    const result = summarizePayload("PushEvent", {});
    expect(result).toEqual({ kind: "push", ref: "", commits: [] });
  });

  it("extracts prNumber, prTitle, state for PullRequestReviewEvent", () => {
    const result = summarizePayload("PullRequestReviewEvent", {
      action: "submitted",
      pull_request: { number: 42, title: "Add feature" },
      review: { state: "approved" },
    });
    expect(result).toEqual({
      kind: "review",
      action: "submitted",
      prNumber: 42,
      prTitle: "Add feature",
      state: "approved",
    });
  });

  it("handles PullRequestReviewEvent with missing fields", () => {
    const result = summarizePayload("PullRequestReviewEvent", {});
    expect(result).toEqual({
      kind: "review",
      action: "",
      prNumber: 0,
      prTitle: "",
      state: "",
    });
  });

  it("extracts tag, name, action for ReleaseEvent", () => {
    const result = summarizePayload("ReleaseEvent", {
      action: "published",
      release: { tag_name: "v1.0.0", name: "First release" },
    });
    expect(result).toEqual({
      kind: "release",
      action: "published",
      tag: "v1.0.0",
      name: "First release",
    });
  });

  it("handles ReleaseEvent with missing fields", () => {
    const result = summarizePayload("ReleaseEvent", {});
    expect(result).toEqual({
      kind: "release",
      action: "",
      tag: "",
      name: "",
    });
  });

  it("extracts number, title, action for PullRequestEvent", () => {
    const result = summarizePayload("PullRequestEvent", {
      action: "opened",
      pull_request: { number: 7, title: "Refactor auth" },
    });
    expect(result).toEqual({
      kind: "pull_request",
      action: "opened",
      number: 7,
      title: "Refactor auth",
    });
  });

  it("handles PullRequestEvent with missing fields", () => {
    const result = summarizePayload("PullRequestEvent", {});
    expect(result).toEqual({
      kind: "pull_request",
      action: "",
      number: 0,
      title: "",
    });
  });

  it("extracts number, title, action for IssuesEvent", () => {
    const result = summarizePayload("IssuesEvent", {
      action: "closed",
      issue: { number: 15, title: "Bug in parser" },
    });
    expect(result).toEqual({
      kind: "issues",
      action: "closed",
      number: 15,
      title: "Bug in parser",
    });
  });

  it("handles IssuesEvent with missing fields", () => {
    const result = summarizePayload("IssuesEvent", {});
    expect(result).toEqual({
      kind: "issues",
      action: "",
      number: 0,
      title: "",
    });
  });

  it("returns generic payload for unknown event types", () => {
    const result = summarizePayload("ForkEvent", { action: "created" });
    expect(result).toEqual({ kind: "generic", action: "created" });
  });

  it("returns generic payload with empty action when action is missing", () => {
    const result = summarizePayload("WatchEvent", {});
    expect(result).toEqual({ kind: "generic", action: "" });
  });
});

describe("dedupeEvents", () => {
  const makeEvent = (id: string): GitHubEvent => ({
    id,
    type: "PushEvent",
    repo: "org/repo",
    createdAt: "2026-04-01T00:00:00Z",
    payload: { kind: "push", ref: "refs/heads/main", commits: [] },
  });

  it("removes duplicate events by id", () => {
    const events = [makeEvent("1"), makeEvent("2"), makeEvent("1")];
    const result = dedupeEvents(events);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual(["1", "2"]);
  });

  it("preserves order of first occurrence", () => {
    const events = [makeEvent("b"), makeEvent("a"), makeEvent("b")];
    const result = dedupeEvents(events);
    expect(result.map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("returns empty array for empty input", () => {
    expect(dedupeEvents([])).toEqual([]);
  });

  it("returns same events when no duplicates exist", () => {
    const events = [makeEvent("1"), makeEvent("2"), makeEvent("3")];
    expect(dedupeEvents(events)).toEqual(events);
  });
});

describe("isInRange", () => {
  const range: DateRange = {
    from: new Date("2026-04-01T00:00:00Z"),
    to: new Date("2026-04-07T23:59:59Z"),
  };

  it("returns true for date within range", () => {
    expect(isInRange("2026-04-03T12:00:00Z", range)).toBe(true);
  });

  it("returns true for date at range start", () => {
    expect(isInRange("2026-04-01T00:00:00Z", range)).toBe(true);
  });

  it("returns false for date before range", () => {
    expect(isInRange("2026-03-31T23:59:59Z", range)).toBe(false);
  });

  it("returns false for date after range", () => {
    expect(isInRange("2026-04-08T00:00:00Z", range)).toBe(false);
  });
});

describe("fetchEvents", () => {
  const range: DateRange = {
    from: new Date("2026-04-01T00:00:00Z"),
    to: new Date("2026-04-07T23:59:59Z"),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const makeRawEvent = (id: string, date: string, type = "PushEvent") => ({
    id,
    type,
    public: true,
    repo: { name: "owner/repo" },
    created_at: date,
    payload: { ref: "refs/heads/main", commits: [{ message: "commit" }] },
  });

  it("fetches events within date range", async () => {
    const events = [
      makeRawEvent("1", "2026-04-03T12:00:00Z"),
      makeRawEvent("2", "2026-04-02T10:00:00Z"),
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(events), { status: 200 }),
    ).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    const result = await fetchEvents("token", "testuser", range);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("1");
  });

  it("filters out non-public events", async () => {
    const events = [
      { ...makeRawEvent("1", "2026-04-03T12:00:00Z"), public: false },
      makeRawEvent("2", "2026-04-03T12:00:00Z"),
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(events), { status: 200 }),
    ).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    const result = await fetchEvents("token", "testuser", range);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("stops pagination when oldest event is before range", async () => {
    const page1 = [
      makeRawEvent("1", "2026-04-03T12:00:00Z"),
      makeRawEvent("2", "2026-03-30T00:00:00Z"),
    ];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(page1), { status: 200 }),
    );

    const result = await fetchEvents("token", "testuser", range);
    expect(result).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("throws on 401 authentication error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { status: 401, statusText: "Unauthorized" }),
    );

    await expect(fetchEvents("token", "testuser", range)).rejects.toThrow(
      /GitHub API returned 401/,
    );
  });

  it("throws on 403 forbidden error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { status: 403, statusText: "Forbidden" }),
    );

    await expect(fetchEvents("token", "testuser", range)).rejects.toThrow(
      /GitHub API returned 403/,
    );
  });

  it("handles other API errors gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { status: 500, statusText: "Internal Server Error" }),
    );

    const result = await fetchEvents("token", "testuser", range);
    expect(result).toEqual([]);
  });

  it("paginates up to 3 pages max", async () => {
    const makePage = (startId: number) =>
      Array.from({ length: 100 }, (_, i) =>
        makeRawEvent(String(startId + i), "2026-04-03T12:00:00Z"),
      );

    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(makePage(1)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(makePage(101)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(makePage(201)), { status: 200 }));

    const result = await fetchEvents("token", "testuser", range);
    expect(result).toHaveLength(300);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});
