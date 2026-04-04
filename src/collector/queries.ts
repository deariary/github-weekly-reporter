// GraphQL queries for GitHub API data collection

export const USER_CONTRIBUTIONS_QUERY = `
  query($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
      login
      name
      avatarUrl
      bio
      company
      location
      followers { totalCount }
      following { totalCount }
      repositories(privacy: PUBLIC) { totalCount }
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
