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

const summarizePayload = (type: string, raw: Record<string, unknown>): EventPayload => {
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

const fetchPage = async (
  token: string,
  username: string,
  page: number,
): Promise<RawEvent[]> => {
  const url = `https://api.github.com/users/${username}/events?per_page=${EVENTS_PER_PAGE}&page=${page}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "github-weekly-reporter",
    },
  });

  if (!response.ok) return [];
  return (await response.json()) as RawEvent[];
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

  for (let page = 1; page <= MAX_PAGES; page++) {
    const raw = await fetchPage(token, username, page);
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
