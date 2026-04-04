import { describe, it, expect } from "vitest";
import { summarizePayload, dedupeEvents } from "./fetch-events.js";
import type { GitHubEvent } from "../types.js";

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
