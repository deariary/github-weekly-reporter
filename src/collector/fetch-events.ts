// Fetch user events from GitHub REST API (Events API has no GraphQL equivalent)

import type { DateRange } from "./date-range.js";
import type { GitHubEvent, EventPayload } from "../types.js";

type RawEvent = {
  type: string;
  repo: { name: string };
  created_at: string;
  payload: Record<string, unknown>;
};

const EVENTS_PER_PAGE = 100;
const MAX_PAGES = 3;

const summarizePayload = (type: string, raw: Record<string, unknown>): EventPayload => {
  switch (type) {
    case "PushEvent":
      return {
        kind: "push",
        ref: String(raw.ref ?? ""),
        commits: Array.isArray(raw.commits)
          ? (raw.commits as { message: string }[]).map((c) => c.message)
          : [],
      };
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
    case "CreateEvent":
      return {
        kind: "create",
        refType: String(raw.ref_type ?? ""),
        ref: raw.ref ? String(raw.ref) : null,
      };
    default:
      return {
        kind: "generic",
        action: raw.action ? String(raw.action) : null,
      };
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

const isPullRequestEvent = (type: string): boolean =>
  type === "PullRequestEvent";

export const fetchEvents = async (
  token: string,
  username: string,
  range: DateRange,
): Promise<GitHubEvent[]> => {
  const events: GitHubEvent[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const raw = await fetchPage(token, username, page);
    if (raw.length === 0) break;

    const mapped = raw
      .filter((e) => isInRange(e.created_at, range))
      // Skip PullRequestEvent (data already in pullRequests)
      .filter((e) => !isPullRequestEvent(e.type))
      .map((e) => ({
        type: e.type,
        repo: e.repo.name,
        createdAt: e.created_at,
        payload: summarizePayload(e.type, e.payload),
      }));

    events.push(...mapped);

    // If the oldest event on this page is before our range, no need for more pages
    const oldest = raw[raw.length - 1];
    if (oldest && new Date(oldest.created_at).getTime() < range.from.getTime()) break;
  }

  return events;
};
