// Preprocess WeeklyReportData into a compact YAML string for the LLM prompt.
// Goal: maximize context quality while minimizing token usage.

import { stringify as toYaml } from "yaml";
import type { NarrativeInput } from "./types.js";
import type { PullRequest, Issue, GitHubEvent, PullRequestReviewEventPayload, ReleaseEventPayload, RepoCommitMessages } from "../types.js";

const MAX_PRS = 20;
const MAX_ISSUES = 15;


const formatPR = (pr: PullRequest): Record<string, unknown> => ({
  title: pr.title,
  repo: pr.repository,
  state: pr.state,
  lines: `+${pr.additions} -${pr.deletions}`,
  files: pr.changedFiles,
  ...(pr.labels.length > 0 ? { labels: pr.labels } : {}),
  ...(pr.body ? { body: pr.body } : {}),
});

const formatIssue = (issue: Issue): Record<string, unknown> => ({
  title: issue.title,
  repo: issue.repository,
  state: issue.state,
  ...(issue.labels.length > 0 ? { labels: issue.labels } : {}),
  ...(issue.body ? { body: issue.body } : {}),
});

export const buildLLMContext = (input: NarrativeInput): string => {
  const context: Record<string, unknown> = {
    developer: input.username,
    period: `${input.dateRange.from} to ${input.dateRange.to}`,
    stats: {
      commits: input.stats.totalCommits,
      lines: `+${input.stats.totalAdditions} -${input.stats.totalDeletions}`,
      prs: `${input.stats.prsOpened} opened, ${input.stats.prsMerged} merged`,
      reviews: input.stats.prsReviewed,
      issues: `${input.stats.issuesOpened} opened, ${input.stats.issuesClosed} closed`,
    },
    daily_commits: input.dailyCommits
      .map((d) => `${d.date}: ${d.count}`)
      .join(", "),
  };

  if (input.pullRequests.length > 0) {
    context.pull_requests = input.pullRequests
      .slice(0, MAX_PRS)
      .map(formatPR);
  }

  if (input.issues.length > 0) {
    context.issues = input.issues
      .slice(0, MAX_ISSUES)
      .map(formatIssue);
  }

  // Include review and release events (other event types have empty payloads)
  const reviewsAndReleases = input.events
    .map((event: GitHubEvent) => {
      if (event.payload.kind === "review") {
        const r = event.payload as PullRequestReviewEventPayload;
        return { type: "review", repo: event.repo, pr: r.prTitle, state: r.state };
      }
      if (event.payload.kind === "release") {
        const rel = event.payload as ReleaseEventPayload;
        return { type: "release", repo: event.repo, tag: rel.tag, name: rel.name };
      }
      return null;
    })
    .filter(Boolean);
  if (reviewsAndReleases.length > 0) {
    context.reviews_and_releases = reviewsAndReleases;
  }

  if (input.repositories.length > 0) {
    context.repositories = input.repositories
      .slice(0, 8)
      .map((r) => `${r.name}: ${r.prsOpened} PRs, ${r.issuesOpened} issues`);
  }

  if (input.commitMessages && input.commitMessages.length > 0) {
    context.commit_messages = input.commitMessages
      .filter((r: RepoCommitMessages) => r.messages.length > 0);
  }

  if (input.externalContributions.length > 0) {
    context.external_contributions = input.externalContributions
      .slice(0, 5)
      .map((c) => ({
        repo: c.repo,
        events: c.events.length,
        prs: c.pullRequests.map((pr) => pr.title),
      }));
  }

  return toYaml(context, { lineWidth: 120 });
};
