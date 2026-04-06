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

export const mapState = (state: string, mergedAt: string | null): PullRequest["state"] => {
  if (mergedAt) return "merged";
  return state === "closed" ? "closed" : "open";
};

export type PRRef = {
  repo: string;
  number: number;
};

const MAX_RETRIES = 3;
const REQUEST_DELAY_MS = 100;
const DEFAULT_RETRY_DELAY_MS = 5_000;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const parseRetryDelay = (response: Response): number => {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds)) return seconds * 1000;
  }
  return DEFAULT_RETRY_DELAY_MS;
};

const readErrorBody = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? "";
  } catch {
    return "";
  }
};

const toPullRequest = (pr: RawPR, repo: string): PullRequest => ({
  title: pr.title,
  body: cleanBody(pr.body),
  url: pr.html_url,
  repository: repo,
  state: mapState(pr.state, pr.merged_at),
  labels: pr.labels.map((l) => l.name),
  additions: pr.additions,
  deletions: pr.deletions,
  changedFiles: pr.changed_files,
  author: pr.user?.login ?? "unknown",
  createdAt: pr.created_at,
  mergedAt: pr.merged_at,
});

const fetchSinglePR = async (
  token: string,
  ref: PRRef,
): Promise<PullRequest | null> => {
  const url = `https://api.github.com/repos/${ref.repo}/pulls/${ref.number}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, { headers: GITHUB_HEADERS(token) });

    if (response.ok) {
      return toPullRequest((await response.json()) as RawPR, ref.repo);
    }

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const delay = parseRetryDelay(response);
      console.warn(`  ${ref.repo}#${ref.number}: 429, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(delay);
      continue;
    }

    const message = await readErrorBody(response);
    console.warn(`  Failed to fetch PR ${ref.repo}#${ref.number}: ${response.status} ${response.statusText}`);
    if (message) console.warn(`    ${message}`);
    return null;
  }

  return null;
};

const CONCURRENCY = 5;

const runWithConcurrency = async <T>(
  items: T[],
  fn: (item: T) => Promise<unknown>,
): Promise<void> => {
  const queue = [...items];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item) {
        await fn(item);
        await sleep(REQUEST_DELAY_MS);
      }
    }
  });
  await Promise.all(workers);
};

export const fetchPRsByRefs = async (
  token: string,
  refs: PRRef[],
): Promise<PullRequest[]> => {
  const unique = new Map<string, PRRef>();
  refs.forEach((ref) => {
    const key = `${ref.repo}#${ref.number}`;
    if (!unique.has(key)) unique.set(key, ref);
  });

  const prs: PullRequest[] = [];
  let failed = 0;

  await runWithConcurrency([...unique.values()], async (ref) => {
    const pr = await fetchSinglePR(token, ref);
    if (pr) prs.push(pr);
    else failed++;
  });

  if (failed > 0) {
    console.warn(`Warning: ${failed} of ${unique.size} PRs could not be fetched.`);
  }

  return prs;
};
