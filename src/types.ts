// Weekly report data types

export type DailyCommitCount = {
  date: string; // ISO date string (YYYY-MM-DD)
  count: number;
};

export type RepositoryActivity = {
  name: string; // owner/repo
  commits: number;
  prsOpened: number;
  prsMerged: number;
  issuesOpened: number;
  issuesClosed: number;
  url: string;
};

export type LanguageBreakdown = {
  language: string;
  bytes: number;
  percentage: number;
  color: string;
};

export type PullRequest = {
  title: string;
  body: string | null;
  url: string;
  repository: string;
  state: "open" | "merged" | "closed";
  labels: string[];
  additions: number;
  deletions: number;
  changedFiles: number;
  author: string;
  createdAt: string;
  mergedAt: string | null;
};

export type Issue = {
  title: string;
  body: string | null;
  url: string;
  repository: string;
  state: "open" | "closed";
  labels: string[];
  author: string;
  createdAt: string;
  closedAt: string | null;
};

export type GitHubEvent = {
  type: string;
  repo: string;
  createdAt: string;
  payload: EventPayload;
};

export type EventPayload =
  | PushEventPayload
  | PullRequestReviewEventPayload
  | ReleaseEventPayload;

export type PushEventPayload = {
  kind: "push";
  ref: string;
  commits: string[];
};

export type PullRequestReviewEventPayload = {
  kind: "review";
  action: string;
  prNumber: number;
  prTitle: string;
  state: string; // approved, changes_requested, commented
};

export type ReleaseEventPayload = {
  kind: "release";
  action: string;
  tag: string;
  name: string;
};

export type WeeklyStats = {
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  prsOpened: number;
  prsMerged: number;
  prsReviewed: number;
  issuesOpened: number;
  issuesClosed: number;
};

export type ExternalContribution = {
  repo: string;
  events: GitHubEvent[];
  pullRequests: PullRequest[];
};

export type WeeklyReportData = {
  username: string;
  avatarUrl: string;
  dateRange: { from: string; to: string };
  stats: WeeklyStats;
  dailyCommits: DailyCommitCount[];
  repositories: RepositoryActivity[];
  languages: LanguageBreakdown[];
  pullRequests: PullRequest[];
  issues: Issue[];
  events: GitHubEvent[];
  externalContributions: ExternalContribution[];
  aiContent: AIContent | null;
};

// LLM structured output

export type SummaryType =
  | "commit-summary"
  | "review-summary"
  | "language-summary"
  | "repo-summary"
  | "contribution-summary"
  | "collaboration-summary"
  | "activity-pattern";

export type HighlightType = "pr" | "release" | "issue" | "discussion";

export type DataChip = {
  label: string;
  value: string;
  color?: "green" | "red" | "default";
};

export type SummarySection = {
  type: SummaryType;
  heading: string;
  body: string;
  chips?: DataChip[];
};

export type HighlightSection = {
  type: HighlightType;
  title: string;
  repo: string;
  meta: string;
  body: string;
  url?: string; // resolved from PR/Issue data, not from LLM
};

export type AIContent = {
  title: string;
  subtitle: string;
  overview: string; // multi-paragraph long-form text
  summaries: SummarySection[];
  highlights: HighlightSection[];
};

// Configuration types

export type LLMProvider = "openai" | "anthropic" | "gemini";

export type Theme = "default" | "dark";

export type ReportConfig = {
  githubToken: string;
  llmProvider: LLMProvider | null;
  llmApiKey: string | null;
  llmModel: string | null;
  theme: Theme;
};
