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
  query($query: String!, $cursor: String) {
    search(query: $query, type: ISSUE, first: 100, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on PullRequest {
          title
          url
          state
          createdAt
          mergedAt
          repository {
            nameWithOwner
          }
        }
      }
    }
  }
`;

export const SEARCH_ISSUES_QUERY = `
  query($query: String!, $cursor: String) {
    search(query: $query, type: ISSUE, first: 100, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on Issue {
          title
          url
          state
          createdAt
          closedAt
          repository {
            nameWithOwner
          }
        }
      }
    }
  }
`;

export const REPO_LANGUAGES_QUERY = `
  query($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      languages(first: 20, orderBy: { field: SIZE, direction: DESC }) {
        edges {
          size
          node {
            name
            color
          }
        }
      }
    }
  }
`;
