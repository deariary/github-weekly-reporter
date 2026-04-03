// Main entry point for GitHub data collection

import { graphql } from "@octokit/graphql";
import { buildWeeklyRange, toISODate } from "./date-range.js";
import { fetchContributions } from "./fetch-contributions.js";
import { fetchPullRequests } from "./fetch-pull-requests.js";
import { fetchIssues } from "./fetch-issues.js";
import { fetchLanguages } from "./fetch-languages.js";
import { aggregateRepositories } from "./aggregate.js";
import type { WeeklyReportData } from "../types.js";

export const collectWeeklyData = async (
  token: string,
  username: string,
): Promise<WeeklyReportData> => {
  const gql = graphql.defaults({
    headers: { authorization: `token ${token}` },
  });

  const range = buildWeeklyRange();

  const [contributions, pullRequests, issues] = await Promise.all([
    fetchContributions(gql, username, range),
    fetchPullRequests(gql, username, range),
    fetchIssues(gql, username, range),
  ]);

  const activeRepoNames = [
    ...pullRequests.map((pr) => pr.repository),
    ...issues.map((i) => i.repository),
  ];

  const [languages, repositories] = await Promise.all([
    fetchLanguages(gql, activeRepoNames),
    Promise.resolve(aggregateRepositories(pullRequests, issues)),
  ]);

  return {
    username: contributions.username,
    avatarUrl: contributions.avatarUrl,
    dateRange: {
      from: toISODate(range.from),
      to: toISODate(range.to),
    },
    stats: {
      totalCommits: contributions.totalCommits,
      prsOpened: pullRequests.length,
      prsMerged: pullRequests.filter((pr) => pr.state === "merged").length,
      prsReviewed: contributions.prsReviewed,
      issuesOpened: issues.length,
      issuesClosed: issues.filter((i) => i.state === "closed").length,
    },
    dailyCommits: contributions.dailyCommits,
    repositories,
    languages,
    pullRequests,
    issues,
    aiNarrative: null,
  };
};
