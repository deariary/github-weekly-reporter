// Preprocess WeeklyReportData into a compact YAML string for the LLM prompt.
// Goal: maximize context quality while minimizing token usage.

import { stringify as toYaml } from "yaml";
import type { NarrativeInput } from "./types.js";
import type { PullRequest, Issue, GitHubEvent, PushEventPayload, PullRequestReviewEventPayload, ReleaseEventPayload } from "../types.js";

const MAX_PRS = 20;
const MAX_ISSUES = 15;
const MAX_EVENTS = 40;
const MAX_COMMITS_PER_PUSH = 5;

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

const formatEvent = (event: GitHubEvent): Record<string, unknown> | null => {
  const base = { type: event.type, repo: event.repo, at: event.createdAt.split("T")[0] };

  switch (event.payload.kind) {
    case "push": {
      const p = event.payload as PushEventPayload;
      const commits = p.commits.slice(0, MAX_COMMITS_PER_PUSH);
      return { ...base, ref: p.ref, commits };
    }
    case "review": {
      const r = event.payload as PullRequestReviewEventPayload;
      return { ...base, pr: r.prTitle, state: r.state };
    }
    case "release": {
      const rel = event.payload as ReleaseEventPayload;
      return { ...base, tag: rel.tag, name: rel.name };
    }
    case "create":
      return { ...base, refType: event.payload.refType, ref: event.payload.ref };
    default:
      return null; // skip generic events for LLM
  }
};

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

  const formattedEvents = input.events
    .slice(0, MAX_EVENTS)
    .map(formatEvent)
    .filter(Boolean);
  if (formattedEvents.length > 0) {
    context.events = formattedEvents;
  }

  if (input.languages.length > 0) {
    context.languages = input.languages
      .slice(0, 8)
      .map((l) => `${l.language} ${l.percentage.toFixed(0)}%`)
      .join(", ");
  }

  if (input.repositories.length > 0) {
    context.repositories = input.repositories
      .slice(0, 8)
      .map((r) => `${r.name}: ${r.prsOpened} PRs, ${r.issuesOpened} issues`);
  }

  return toYaml(context, { lineWidth: 120 });
};
