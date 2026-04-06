// Fetch commit messages per repository via GitHub REST API
// GET /repos/{owner}/{repo}/commits?author={username}&since={from}&until={to}

import type { DateRange } from "./date-range.js";

export type RepoCommits = {
  repo: string;
  messages: string[];
};

type RawCommit = {
  sha: string;
  commit: {
    message: string;
    author: { date: string } | null;
  };
};

const MAX_MESSAGES_PER_REPO = 10;
const MAX_TOTAL_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 120;
const MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 5_000;

const GITHUB_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "github-weekly-reporter",
});

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const parseRetryDelay = (response: Response): number => {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds)) return seconds * 1000;
  }
  return DEFAULT_RETRY_DELAY_MS;
};

// Extract the first line of a commit message and truncate to MAX_MESSAGE_LENGTH
const firstLine = (message: string): string => {
  const subject = message.split("\n")[0]?.trim() ?? message.trim();
  return subject.length > MAX_MESSAGE_LENGTH
    ? `${subject.slice(0, MAX_MESSAGE_LENGTH)}...`
    : subject;
};

const fetchRepoCommits = async (
  token: string,
  repo: string,
  author: string,
  range: DateRange,
): Promise<string[]> => {
  const params = new URLSearchParams({
    author,
    since: range.from.toISOString(),
    until: range.to.toISOString(),
    per_page: String(MAX_MESSAGES_PER_REPO),
  });
  const url = `https://api.github.com/repos/${repo}/commits?${params}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, { headers: GITHUB_HEADERS(token) });

    if (response.ok) {
      const commits = (await response.json()) as RawCommit[];
      return commits.map((c) => firstLine(c.commit.message));
    }

    if (response.status === 409) {
      // Empty repository
      return [];
    }

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const delay = parseRetryDelay(response);
      console.warn(`  ${repo}: 429, retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(delay);
      continue;
    }

    if (response.status === 403 || response.status === 404) {
      // Permission denied or repo not found (private, deleted, etc.)
      return [];
    }

    console.warn(`  Failed to fetch commits for ${repo}: ${response.status} ${response.statusText}`);
    return [];
  }

  return [];
};

export const fetchCommitMessages = async (
  token: string,
  username: string,
  repos: string[],
  range: DateRange,
): Promise<RepoCommits[]> => {
  const results: RepoCommits[] = [];
  let totalMessages = 0;

  for (const repo of repos) {
    if (totalMessages >= MAX_TOTAL_MESSAGES) break;

    const messages = await fetchRepoCommits(token, repo, username, range);
    if (messages.length > 0) {
      const remaining = MAX_TOTAL_MESSAGES - totalMessages;
      const trimmed = messages.slice(0, remaining);
      results.push({ repo, messages: trimmed });
      totalMessages += trimmed.length;
    }

  }

  return results;
};
