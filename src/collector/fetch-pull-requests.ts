// Fetch pull requests authored by the user in the date range

import type { graphql } from "@octokit/graphql";
import { SEARCH_PRS_QUERY } from "./queries.js";
import type { DateRange } from "./date-range.js";
import { toISODate } from "./date-range.js";
import { cleanBody } from "./clean-body.js";
import type { PullRequest } from "../types.js";

type PRNode = {
  title: string;
  body: string | null;
  url: string;
  state: "OPEN" | "MERGED" | "CLOSED";
  createdAt: string;
  mergedAt: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  author: { login: string } | null;
  labels: { nodes: { name: string }[] };
  repository: { nameWithOwner: string };
};

type SearchResponse = {
  search: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: PRNode[];
  };
};

const mapState = (state: PRNode["state"]): PullRequest["state"] =>
  state.toLowerCase() as PullRequest["state"];

const searchAllPages = async (
  gql: typeof graphql,
  query: string,
): Promise<PRNode[]> => {
  const nodes: PRNode[] = [];
  let cursor: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    const response: SearchResponse = await gql<SearchResponse>(
      SEARCH_PRS_QUERY,
      { searchQuery: query, cursor },
    );
    nodes.push(...response.search.nodes);
    hasNextPage = response.search.pageInfo.hasNextPage;
    cursor = response.search.pageInfo.endCursor ?? undefined;
  }

  return nodes;
};

export const fetchPullRequests = async (
  gql: typeof graphql,
  username: string,
  range: DateRange,
): Promise<PullRequest[]> => {
  const from = toISODate(range.from);
  const to = toISODate(range.to);
  const query = `author:${username} is:pr created:${from}..${to}`;

  const nodes = await searchAllPages(gql, query);

  return nodes.map((pr) => ({
    title: pr.title,
    body: cleanBody(pr.body),
    url: pr.url,
    repository: pr.repository.nameWithOwner,
    state: mapState(pr.state),
    labels: pr.labels.nodes.map((l) => l.name),
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changedFiles,
    author: pr.author?.login ?? "unknown",
    createdAt: pr.createdAt,
    mergedAt: pr.mergedAt,
  }));
};
