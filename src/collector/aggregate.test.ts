import { describe, it, expect } from "vitest";
import { aggregateRepositories } from "./aggregate.js";
import type { PullRequest, Issue } from "../types.js";

describe("aggregateRepositories", () => {
  it("aggregates PRs and issues by repository", () => {
    const prs: PullRequest[] = [
      {
        title: "Fix bug",
        url: "https://github.com/org/repo-a/pull/1",
        repository: "org/repo-a",
        state: "merged",
        createdAt: "2026-04-01T00:00:00Z",
        mergedAt: "2026-04-02T00:00:00Z",
      },
      {
        title: "Add feature",
        url: "https://github.com/org/repo-a/pull/2",
        repository: "org/repo-a",
        state: "open",
        createdAt: "2026-04-02T00:00:00Z",
        mergedAt: null,
      },
      {
        title: "Update docs",
        url: "https://github.com/org/repo-b/pull/1",
        repository: "org/repo-b",
        state: "merged",
        createdAt: "2026-04-01T00:00:00Z",
        mergedAt: "2026-04-01T00:00:00Z",
      },
    ];

    const issues: Issue[] = [
      {
        title: "Bug report",
        url: "https://github.com/org/repo-a/issues/1",
        repository: "org/repo-a",
        state: "closed",
        createdAt: "2026-04-01T00:00:00Z",
        closedAt: "2026-04-02T00:00:00Z",
      },
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
      {
        title: "PR1",
        url: "",
        repository: "org/less-active",
        state: "open",
        createdAt: "",
        mergedAt: null,
      },
      {
        title: "PR2",
        url: "",
        repository: "org/more-active",
        state: "open",
        createdAt: "",
        mergedAt: null,
      },
      {
        title: "PR3",
        url: "",
        repository: "org/more-active",
        state: "merged",
        createdAt: "",
        mergedAt: "",
      },
    ];

    const result = aggregateRepositories(prs, []);
    expect(result[0].name).toBe("org/more-active");
  });

  it("returns empty array when no activity", () => {
    expect(aggregateRepositories([], [])).toEqual([]);
  });
});
