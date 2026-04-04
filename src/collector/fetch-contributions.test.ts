import { describe, it, expect, vi } from "vitest";
import { fetchContributions } from "./fetch-contributions.js";
import type { DateRange } from "./date-range.js";
import type { graphql } from "@octokit/graphql";

const makeGqlMock = (overrides: Record<string, unknown> = {}) => {
  const defaultResponse = {
    user: {
      login: "testuser",
      name: "Test User",
      avatarUrl: "https://example.com/avatar.png",
      bio: "A developer",
      company: "ACME",
      location: "Tokyo",
      followers: { totalCount: 100 },
      following: { totalCount: 50 },
      repositories: { totalCount: 30 },
      contributionsCollection: {
        totalCommitContributions: 42,
        totalPullRequestReviewContributions: 8,
        contributionCalendar: {
          weeks: [
            {
              contributionDays: [
                { date: "2026-03-28", contributionCount: 5 },
                { date: "2026-03-29", contributionCount: 0 },
                { date: "2026-03-30", contributionCount: 3 },
                { date: "2026-03-31", contributionCount: 7 },
                { date: "2026-04-01", contributionCount: 10 },
                { date: "2026-04-02", contributionCount: 2 },
                { date: "2026-04-03", contributionCount: 15 },
              ],
            },
          ],
        },
      },
      ...overrides,
    },
  };

  return vi.fn().mockResolvedValue(defaultResponse) as unknown as typeof graphql;
};

describe("fetchContributions", () => {
  const range: DateRange = {
    from: new Date("2026-03-28T00:00:00Z"),
    to: new Date("2026-04-03T23:59:59Z"),
  };

  it("returns username and avatar", async () => {
    const gql = makeGqlMock();
    const result = await fetchContributions(gql, "testuser", range);
    expect(result.username).toBe("testuser");
    expect(result.avatarUrl).toBe("https://example.com/avatar.png");
  });

  it("maps profile fields correctly", async () => {
    const gql = makeGqlMock();
    const result = await fetchContributions(gql, "testuser", range);
    expect(result.profile).toEqual({
      name: "Test User",
      bio: "A developer",
      company: "ACME",
      location: "Tokyo",
      followers: 100,
      following: 50,
      publicRepos: 30,
    });
  });

  it("returns total commits and reviews", async () => {
    const gql = makeGqlMock();
    const result = await fetchContributions(gql, "testuser", range);
    expect(result.totalCommits).toBe(42);
    expect(result.prsReviewed).toBe(8);
  });

  it("filters daily commits within date range", async () => {
    const gql = makeGqlMock();
    const result = await fetchContributions(gql, "testuser", range);
    expect(result.dailyCommits).toHaveLength(7);
    expect(result.dailyCommits[0]).toEqual({ date: "2026-03-28", count: 5 });
    expect(result.dailyCommits[6]).toEqual({ date: "2026-04-03", count: 15 });
  });

  it("filters out days outside date range", async () => {
    const gql = makeGqlMock({
      contributionsCollection: {
        totalCommitContributions: 42,
        totalPullRequestReviewContributions: 8,
        contributionCalendar: {
          weeks: [
            {
              contributionDays: [
                { date: "2026-03-27", contributionCount: 1 },
                { date: "2026-03-28", contributionCount: 5 },
                { date: "2026-04-03", contributionCount: 15 },
                { date: "2026-04-04", contributionCount: 2 },
              ],
            },
          ],
        },
      },
    });
    const result = await fetchContributions(gql, "testuser", range);
    expect(result.dailyCommits).toHaveLength(2);
    expect(result.dailyCommits.map((d) => d.date)).toEqual(["2026-03-28", "2026-04-03"]);
  });

  it("passes correct variables to GraphQL", async () => {
    const gql = makeGqlMock();
    await fetchContributions(gql, "testuser", range);
    expect(gql).toHaveBeenCalledWith(
      expect.any(String),
      {
        username: "testuser",
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
    );
  });

  it("handles null profile fields", async () => {
    const gql = makeGqlMock({
      name: null,
      bio: null,
      company: null,
      location: null,
    });
    const result = await fetchContributions(gql, "testuser", range);
    expect(result.profile.name).toBeNull();
    expect(result.profile.bio).toBeNull();
  });
});
