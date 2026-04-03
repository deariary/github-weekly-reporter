import { describe, it, expect } from "vitest";
import { aggregateRepositories } from "./aggregate.js";
import type { PullRequest, Issue } from "../types.js";

const makePR = (overrides: Partial<PullRequest>): PullRequest => ({
  title: "",
  body: null,
  url: "",
  repository: "",
  state: "open",
  labels: [],
  additions: 0,
  deletions: 0,
  changedFiles: 0,
  author: "testuser",
  createdAt: "",
  mergedAt: null,
  ...overrides,
});

const makeIssue = (overrides: Partial<Issue>): Issue => ({
  title: "",
  body: null,
  url: "",
  repository: "",
  state: "open",
  labels: [],
  author: "testuser",
  createdAt: "",
  closedAt: null,
  ...overrides,
});

describe("aggregateRepositories", () => {
  it("aggregates PRs and issues by repository", () => {
    const prs: PullRequest[] = [
      makePR({ title: "Fix bug", repository: "org/repo-a", state: "merged", mergedAt: "2026-04-02" }),
      makePR({ title: "Add feature", repository: "org/repo-a", state: "open" }),
      makePR({ title: "Update docs", repository: "org/repo-b", state: "merged", mergedAt: "2026-04-01" }),
    ];

    const issues: Issue[] = [
      makeIssue({ title: "Bug report", repository: "org/repo-a", state: "closed", closedAt: "2026-04-02" }),
    ];

    const result = aggregateRepositories(prs, issues);

    expect(result).toHaveLength(2);

    const repoA = result.find((r) => r.name === "org/repo-a");
    expect(repoA).toBeDefined();
    expect(repoA!.prsOpened).toBe(2);
    expect(repoA!.prsMerged).toBe(1);
    expect(repoA!.issuesOpened).toBe(1);
    expect(repoA!.issuesClosed).toBe(1);

    const repoB = result.find((r) => r.name === "org/repo-b");
    expect(repoB).toBeDefined();
    expect(repoB!.prsOpened).toBe(1);
    expect(repoB!.prsMerged).toBe(1);
  });

  it("sorts by total activity (PRs + issues) descending", () => {
    const prs: PullRequest[] = [
      makePR({ repository: "org/less-active" }),
      makePR({ repository: "org/more-active" }),
      makePR({ repository: "org/more-active", state: "merged" }),
    ];

    const result = aggregateRepositories(prs, []);
    expect(result[0].name).toBe("org/more-active");
  });

  it("returns empty array when no activity", () => {
    expect(aggregateRepositories([], [])).toEqual([]);
  });
});
