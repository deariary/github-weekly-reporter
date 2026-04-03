// Fetch PRs authored by the user on external repos via REST API

import type { DateRange } from "./date-range.js";
import { cleanBody } from "./clean-body.js";
import type { PullRequest } from "../types.js";

type RawPR = {
  number: number;
  title: string;
  state: string;
  html_url: string;
  body: string | null;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  user: { login: string } | null;
  labels: { name: string }[];
};

const isBot = (login: string): boolean => login.endsWith("[bot]");

const isInRange = (dateStr: string, range: DateRange): boolean => {
  const t = new Date(dateStr).getTime();
  return t >= range.from.getTime() && t <= range.to.getTime();
};

const mapState = (state: string, mergedAt: string | null): PullRequest["state"] => {
  if (mergedAt) return "merged";
  return state === "closed" ? "closed" : "open";
};

const fetchRepoPRs = async (
  token: string,
  repo: string,
  username: string,
  range: DateRange,
): Promise<PullRequest[]> => {
  const url = `https://api.github.com/repos/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=100`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "github-weekly-reporter",
    },
  });

  if (!response.ok) return [];
  const prs = (await response.json()) as RawPR[];

  return prs
    .filter((pr) => isInRange(pr.updated_at, range))
    .filter((pr) => {
      const author = pr.user?.login ?? "";
      // Keep user's own PRs, skip bots
      return author.toLowerCase() === username.toLowerCase() && !isBot(author);
    })
    .map((pr) => ({
      title: pr.title,
      body: cleanBody(pr.body),
      url: pr.html_url,
      repository: repo,
      state: mapState(pr.state, pr.merged_at),
      labels: pr.labels.map((l) => l.name),
      additions: pr.additions ?? 0,
      deletions: pr.deletions ?? 0,
      changedFiles: pr.changed_files ?? 0,
      author: pr.user?.login ?? "unknown",
      createdAt: pr.created_at,
      mergedAt: pr.merged_at,
    }));
};

export const fetchExternalPRs = async (
  token: string,
  externalRepos: string[],
  username: string,
  range: DateRange,
): Promise<PullRequest[]> => {
  const results: PullRequest[] = [];

  // Sequential to avoid rate limiting
  for (const repo of externalRepos) {
    const prs = await fetchRepoPRs(token, repo, username, range);
    results.push(...prs);
  }

  return results;
};
