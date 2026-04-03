// Fetch issues authored by the user in the date range

import type { graphql } from "@octokit/graphql";
import { SEARCH_ISSUES_QUERY } from "./queries.js";
import type { DateRange } from "./date-range.js";
import { toISODate } from "./date-range.js";
import type { Issue } from "../types.js";

const MAX_BODY_LENGTH = 300;

type IssueNode = {
  title: string;
  body: string | null;
  url: string;
  state: "OPEN" | "CLOSED";
  createdAt: string;
  closedAt: string | null;
  author: { login: string } | null;
  labels: { nodes: { name: string }[] };
  repository: { nameWithOwner: string };
};

type SearchResponse = {
  search: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: IssueNode[];
  };
};

const mapState = (state: IssueNode["state"]): Issue["state"] =>
  state.toLowerCase() as Issue["state"];

const truncateBody = (body: string | null): string | null => {
  if (!body) return null;
  return body.length > MAX_BODY_LENGTH
    ? body.slice(0, MAX_BODY_LENGTH) + "..."
    : body;
};

const searchAllPages = async (
  gql: typeof graphql,
  query: string,
): Promise<IssueNode[]> => {
  const nodes: IssueNode[] = [];
  let cursor: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    const response: SearchResponse = await gql<SearchResponse>(
      SEARCH_ISSUES_QUERY,
      { query, cursor },
    );
    nodes.push(...response.search.nodes);
    hasNextPage = response.search.pageInfo.hasNextPage;
    cursor = response.search.pageInfo.endCursor ?? undefined;
  }

  return nodes;
};

export const fetchIssues = async (
  gql: typeof graphql,
  username: string,
  range: DateRange,
): Promise<Issue[]> => {
  const from = toISODate(range.from);
  const to = toISODate(range.to);
  const query = `author:${username} is:issue created:${from}..${to}`;

  const nodes = await searchAllPages(gql, query);

  return nodes.map((issue) => ({
    title: issue.title,
    body: truncateBody(issue.body),
    url: issue.url,
    repository: issue.repository.nameWithOwner,
    state: mapState(issue.state),
    labels: issue.labels.nodes.map((l) => l.name),
    author: issue.author?.login ?? "unknown",
    createdAt: issue.createdAt,
    closedAt: issue.closedAt,
  }));
};
