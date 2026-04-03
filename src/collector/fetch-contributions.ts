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
): Promise<ContributionsSummary> => {
  const { user } = await gql<ContributionsResponse>(USER_CONTRIBUTIONS_QUERY, {
    username,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  });

  const fromDate = toISODate(range.from);
  const toDate = toISODate(range.to);

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
