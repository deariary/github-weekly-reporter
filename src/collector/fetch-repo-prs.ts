// Fetch individual PRs by repo + number via REST API

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
  additions: number;
  deletions: number;
  changed_files: number;
  user: { login: string } | null;
  labels: { name: string }[];
};

const GITHUB_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "github-weekly-reporter",
});

const mapState = (state: string, mergedAt: string | null): PullRequest["state"] => {
  if (mergedAt) return "merged";
  return state === "closed" ? "closed" : "open";
};

export type PRRef = {
  repo: string;
  number: number;
};

const fetchSinglePR = async (
  token: string,
  ref: PRRef,
): Promise<PullRequest | null> => {
  const url = `https://api.github.com/repos/${ref.repo}/pulls/${ref.number}`;
  const response = await fetch(url, { headers: GITHUB_HEADERS(token) });
  if (!response.ok) return null;

  const pr = (await response.json()) as RawPR;
  return {
    title: pr.title,
    body: cleanBody(pr.body),
    url: pr.html_url,
    repository: ref.repo,
    state: mapState(pr.state, pr.merged_at),
    labels: pr.labels.map((l) => l.name),
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changed_files,
    author: pr.user?.login ?? "unknown",
    createdAt: pr.created_at,
    mergedAt: pr.merged_at,
  };
};

export const fetchPRsByRefs = async (
  token: string,
  refs: PRRef[],
): Promise<PullRequest[]> => {
  // Dedupe refs
  const unique = new Map<string, PRRef>();
  refs.forEach((ref) => {
    const key = `${ref.repo}#${ref.number}`;
    if (!unique.has(key)) unique.set(key, ref);
  });

  const prs: PullRequest[] = [];

  // Sequential to avoid rate limits
  for (const ref of unique.values()) {
    const pr = await fetchSinglePR(token, ref);
    if (pr) prs.push(pr);
  }

  return prs;
};
