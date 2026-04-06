// Fetch releases per repository via GitHub REST API
// GET /repos/{owner}/{repo}/releases

import type { DateRange } from "./date-range.js";
import type { Release } from "../types.js";

type RawRelease = {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string | null;
};

const MAX_BODY_LENGTH = 500;
const MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 5_000;
const CONCURRENCY = 5;
const REQUEST_DELAY_MS = 100;

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

const truncateBody = (body: string | null): string | null => {
  if (!body) return null;
  return body.length > MAX_BODY_LENGTH
    ? `${body.slice(0, MAX_BODY_LENGTH)}...`
    : body;
};

const isInRange = (publishedAt: string | null, range: DateRange): boolean => {
  if (!publishedAt) return false;
  const t = new Date(publishedAt).getTime();
  return t >= range.from.getTime() && t <= range.to.getTime();
};

const fetchRepoReleases = async (
  token: string,
  repo: string,
  range: DateRange,
): Promise<Release[]> => {
  // Fetch recent releases (per_page=10 is enough for a single week)
  const url = `https://api.github.com/repos/${repo}/releases?per_page=10`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, { headers: GITHUB_HEADERS(token) });

    if (response.ok) {
      const raw = (await response.json()) as RawRelease[];
      return raw
        .filter((r) => isInRange(r.published_at, range))
        .map((r) => ({
          repo,
          tag: r.tag_name,
          name: r.name ?? r.tag_name,
          body: truncateBody(r.body),
          url: r.html_url,
          publishedAt: r.published_at ?? "",
        }));
    }

    if (response.status === 409 || response.status === 403 || response.status === 404) {
      return [];
    }

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const delay = parseRetryDelay(response);
      console.warn(`  ${repo}: 429, retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(delay);
      continue;
    }

    console.warn(`  Failed to fetch releases for ${repo}: ${response.status} ${response.statusText}`);
    return [];
  }

  return [];
};

const runWithConcurrency = async <T>(
  items: T[],
  fn: (item: T) => Promise<void>,
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

export const fetchReleases = async (
  token: string,
  repos: string[],
  range: DateRange,
): Promise<Release[]> => {
  const results: Release[] = [];

  await runWithConcurrency(repos, async (repo) => {
    const releases = await fetchRepoReleases(token, repo, range);
    results.push(...releases);
  });

  return results;
};
