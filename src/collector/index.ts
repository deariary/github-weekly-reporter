// Main entry point for GitHub data collection

import { graphql } from "@octokit/graphql";
import { buildWeeklyRange, toISODate } from "./date-range.js";
import { fetchContributions } from "./fetch-contributions.js";
import { fetchPullRequests } from "./fetch-pull-requests.js";
import { fetchIssues } from "./fetch-issues.js";
import { fetchEvents } from "./fetch-events.js";
import { fetchExternalPRs } from "./fetch-external-prs.js";
import { fetchUserOrgs } from "./fetch-user-orgs.js";
import { detectExternalRepos } from "./detect-external.js";
import { aggregateRepositories } from "./aggregate.js";
import type { WeeklyReportData, ExternalContribution } from "../types.js";

export const collectWeeklyData = async (
  token: string,
  username: string,
): Promise<WeeklyReportData> => {
  const gql = graphql.defaults({
    headers: { authorization: `token ${token}` },
  });

  const range = buildWeeklyRange();

  const [contributions, pullRequests, issues, events, userOrgs] = await Promise.all([
    fetchContributions(gql, username, range),
    fetchPullRequests(gql, username, range),
    fetchIssues(gql, username, range),
    fetchEvents(token, username, range),
    fetchUserOrgs(token),
  ]);

  const externalRepoNames = detectExternalRepos(events, username, userOrgs);
  const externalPRs = await fetchExternalPRs(token, externalRepoNames, username, range);

  const externalContributions: ExternalContribution[] = externalRepoNames
    .map((repo) => ({
      repo,
      events: events.filter((e) => e.repo === repo),
      pullRequests: externalPRs.filter((pr) => pr.repository === repo),
    }))
    .filter((c) => c.events.length > 0 || c.pullRequests.length > 0);

  const ownOwners = new Set([
    username.toLowerCase(),
    ...userOrgs.map((o) => o.toLowerCase()),
  ]);
  const ownEvents = events.filter((e) => {
    const owner = e.repo.split("/")[0]?.toLowerCase() ?? "";
    return ownOwners.has(owner);
  });

  const repositories = aggregateRepositories(pullRequests, issues);
  const totalAdditions = pullRequests.reduce((sum, pr) => sum + pr.additions, 0);
  const totalDeletions = pullRequests.reduce((sum, pr) => sum + pr.deletions, 0);

  return {
    username: contributions.username,
    avatarUrl: contributions.avatarUrl,
    dateRange: {
      from: toISODate(range.from),
      to: toISODate(range.to),
    },
    stats: {
      totalCommits: contributions.totalCommits,
      totalAdditions,
      totalDeletions,
      prsOpened: pullRequests.length,
      prsMerged: pullRequests.filter((pr) => pr.state === "merged").length,
      prsReviewed: contributions.prsReviewed,
      issuesOpened: issues.length,
      issuesClosed: issues.filter((i) => i.state === "closed").length,
    },
    dailyCommits: contributions.dailyCommits,
    repositories,
    pullRequests,
    issues,
    events: ownEvents,
    externalContributions,
    aiContent: null,
  };
};
