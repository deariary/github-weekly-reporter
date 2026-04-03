// GraphQL queries for GitHub API data collection

export const USER_CONTRIBUTIONS_QUERY = `
  query($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
      login
      avatarUrl
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        totalPullRequestReviewContributions
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

export const SEARCH_PRS_QUERY = `
  query($searchQuery: String!, $cursor: String) {
    search(query: $searchQuery, type: ISSUE, first: 100, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on PullRequest {
          title
          body
          url
          state
          createdAt
          mergedAt
          additions
          deletions
          changedFiles
          author { login }
          labels(first: 10) { nodes { name } }
          repository {
            nameWithOwner
          }
        }
      }
    }
  }
`;

export const SEARCH_ISSUES_QUERY = `
  query($searchQuery: String!, $cursor: String) {
    search(query: $searchQuery, type: ISSUE, first: 100, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on Issue {
          title
          body
          url
          state
          createdAt
          closedAt
          author { login }
          labels(first: 10) { nodes { name } }
          repository {
            nameWithOwner
          }
        }
      }
    }
  }
`;
