// Fetch user contribution data from GitHub GraphQL API

import type { graphql } from "@octokit/graphql";
import { USER_CONTRIBUTIONS_QUERY } from "./queries.js";
import type { DateRange } from "./date-range.js";
import { toISODate } from "./date-range.js";
import type { DailyCommitCount } from "../types.js";

type ContributionsResponse = {
  user: {
    login: string;
    avatarUrl: string;
    contributionsCollection: {
      totalCommitContributions: number;
      totalPullRequestReviewContributions: number;
      contributionCalendar: {
        weeks: {
          contributionDays: {
            date: string;
            contributionCount: number;
          }[];
        }[];
      };
    };
  };
};

export type ContributionsSummary = {
  username: string;
  avatarUrl: string;
  totalCommits: number;
  prsReviewed: number;
  dailyCommits: DailyCommitCount[];
};

export const fetchContributions = async (
  gql: typeof graphql,
  username: string,
  range: DateRange,
  timezone: string = "UTC",
): Promise<ContributionsSummary> => {
  const { user } = await gql<ContributionsResponse>(USER_CONTRIBUTIONS_QUERY, {
    username,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  });

  // Filter daily commits by the local date range in the user's timezone.
  // contributionCalendar dates are YYYY-MM-DD strings (UTC-based from GitHub).
  // We compare against our range boundaries formatted in the user's timezone.
  const fromDate = toISODate(range.from, timezone);
  const toDate = toISODate(range.to, timezone);

  const dailyCommits = user.contributionsCollection.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .filter((d) => d.date >= fromDate && d.date <= toDate)
    .map((d) => ({ date: d.date, count: d.contributionCount }));

  return {
    username: user.login,
    avatarUrl: user.avatarUrl,
    totalCommits:
      user.contributionsCollection.totalCommitContributions,
    prsReviewed:
      user.contributionsCollection.totalPullRequestReviewContributions,
    dailyCommits,
  };
};
