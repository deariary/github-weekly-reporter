// Fetch user events from GitHub REST API (Events API has no GraphQL equivalent)
// Focus on events that provide unique data not available from PR/Issue queries:
// - PullRequestReviewEvent: reviews on external repos
// - ReleaseEvent: releases published
// - PushEvent: commit messages (when available)

import type { DateRange } from "./date-range.js";
import type { GitHubEvent, EventPayload } from "../types.js";

type RawEvent = {
  type: string;
  public: boolean;
  repo: { name: string };
  created_at: string;
  payload: Record<string, unknown>;
};

const EVENTS_PER_PAGE = 100;
const MAX_PAGES = 3;

const USEFUL_TYPES = new Set([
  "PushEvent",
  "PullRequestReviewEvent",
  "PullRequestReviewCommentEvent",
  "ReleaseEvent",
]);

const summarizePayload = (type: string, raw: Record<string, unknown>): EventPayload | null => {
  switch (type) {
    case "PushEvent": {
      const commits = Array.isArray(raw.commits)
        ? (raw.commits as { message: string }[]).map((c) => c.message)
        : [];
      // Skip PushEvents without commit messages (merges, force-pushes)
      if (commits.length === 0) return null;
      return {
        kind: "push",
        ref: String(raw.ref ?? ""),
        commits,
      };
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
    default:
      return null;
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

const isInRange = (eventDate: string, range: DateRange): boolean => {
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
      .filter((e) => USEFUL_TYPES.has(e.type))
      .forEach((e) => {
        const payload = summarizePayload(e.type, e.payload);
        if (payload) {
          events.push({
            type: e.type,
            repo: e.repo.name,
            createdAt: e.created_at,
            payload,
          });
        }
      });

    const oldest = raw[raw.length - 1];
    if (oldest && new Date(oldest.created_at).getTime() < range.from.getTime()) break;
  }

  return events;
};
