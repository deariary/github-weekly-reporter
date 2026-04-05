// Fetch user events from GitHub REST API
// Daily fetch: grab all public events and accumulate

import type { DateRange } from "./date-range.js";
import type { GitHubEvent, EventPayload } from "../types.js";

type RawEvent = {
  id: string;
  type: string;
  public: boolean;
  repo: { name: string };
  created_at: string;
  payload: Record<string, unknown>;
};

const EVENTS_PER_PAGE = 100;
const MAX_PAGES = 3; // GitHub Events API hard limit is 300 events (3 pages)
const MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 5_000;

export const summarizePayload = (type: string, raw: Record<string, unknown>): EventPayload => {
  switch (type) {
    case "PushEvent": {
      const commits = Array.isArray(raw.commits)
        ? (raw.commits as { message: string }[]).map((c) => c.message)
        : [];
      return { kind: "push", ref: String(raw.ref ?? ""), commits };
    }
    case "PullRequestReviewEvent":
    case "PullRequestReviewCommentEvent": {
      const pr = (raw.pull_request ?? {}) as Record<string, unknown>;
      return {
        kind: "review",
        action: String(raw.action ?? ""),
        prNumber: Number(pr.number ?? 0),
        prTitle: String(pr.title ?? ""),
        state: String((raw.review as Record<string, unknown>)?.state ?? raw.action ?? ""),
      };
    }
    case "ReleaseEvent": {
      const release = (raw.release ?? {}) as Record<string, unknown>;
      return {
        kind: "release",
        action: String(raw.action ?? ""),
        tag: String(release.tag_name ?? ""),
        name: String(release.name ?? ""),
      };
    }
    case "PullRequestEvent": {
      const pr = (raw.pull_request ?? {}) as Record<string, unknown>;
      return {
        kind: "pull_request",
        action: String(raw.action ?? ""),
        number: Number(pr.number ?? raw.number ?? 0),
        title: String(pr.title ?? ""),
      };
    }
    case "IssuesEvent": {
      const issue = (raw.issue ?? {}) as Record<string, unknown>;
      return {
        kind: "issues",
        action: String(raw.action ?? ""),
        number: Number(issue.number ?? raw.number ?? 0),
        title: String(issue.title ?? ""),
      };
    }
    default:
      return { kind: "generic", action: String(raw.action ?? "") };
  }
};

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const parseRetryDelay = (response: Response): number => {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds)) return seconds * 1000;
  }
  return DEFAULT_RETRY_DELAY_MS;
};

const fetchPage = async (
  token: string,
  username: string,
  page: number,
): Promise<RawEvent[]> => {
  const url = `https://api.github.com/users/${username}/events?per_page=${EVENTS_PER_PAGE}&page=${page}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "github-weekly-reporter",
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, { headers });

    if (response.ok) {
      return (await response.json()) as RawEvent[];
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `GitHub API returned ${response.status} ${response.statusText}. ` +
        "Check that your token (GH_PAT) is valid and not expired.",
      );
    }

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const delay = parseRetryDelay(response);
      console.warn(`Rate limited on events page ${page}, retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(delay);
      continue;
    }

    console.warn(`Failed to fetch events page ${page}: ${response.status} ${response.statusText}`);
    return [];
  }

  return [];
};

export const isInRange = (eventDate: string, range: DateRange): boolean => {
  const t = new Date(eventDate).getTime();
  return t >= range.from.getTime() && t <= range.to.getTime();
};

export const fetchEvents = async (
  token: string,
  username: string,
  range: DateRange,
): Promise<GitHubEvent[]> => {
  const events: GitHubEvent[] = [];

  let lastPageSize = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const raw = await fetchPage(token, username, page);
    lastPageSize = raw.length;
    if (raw.length === 0) break;

    raw
      .filter((e) => e.public)
      .filter((e) => isInRange(e.created_at, range))
      .forEach((e) => {
        events.push({
          id: e.id,
          type: e.type,
          repo: e.repo.name,
          createdAt: e.created_at,
          payload: summarizePayload(e.type, e.payload),
        });
      });

    const oldest = raw[raw.length - 1];
    if (oldest && new Date(oldest.created_at).getTime() < range.from.getTime()) break;
  }

  if (lastPageSize === EVENTS_PER_PAGE) {
    console.warn("Warning: GitHub Events API limit reached (300 events). Some events may be missing.");
  }

  return events;
};

export const dedupeEvents = (events: GitHubEvent[]): GitHubEvent[] => {
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
};
