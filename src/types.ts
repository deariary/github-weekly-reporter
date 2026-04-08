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
  id: string;
  type: string;
  repo: string;
  createdAt: string;
  payload: EventPayload;
};

export type EventPayload =
  | PushEventPayload
  | PullRequestReviewEventPayload
  | ReleaseEventPayload
  | PullRequestEventPayload
  | IssuesEventPayload
  | GenericEventPayload;

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

export type PullRequestEventPayload = {
  kind: "pull_request";
  action: string;
  number: number;
  title: string;
};

export type IssuesEventPayload = {
  kind: "issues";
  action: string;
  number: number;
  title: string;
};

export type GenericEventPayload = {
  kind: "generic";
  action: string;
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

export type UserProfile = {
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  followers: number;
  following: number;
  publicRepos: number;
};

export type RepoCommitMessages = {
  repo: string;
  messages: string[];
};

export type Release = {
  repo: string;
  tag: string;
  name: string;
  body: string | null;
  url: string;
  publishedAt: string;
};

export type WeeklyReportData = {
  username: string;
  avatarUrl: string;
  profile?: UserProfile;
  dateRange: { from: string; to: string };
  stats: WeeklyStats;
  dailyCommits: DailyCommitCount[];
  repositories: RepositoryActivity[];
  pullRequests: PullRequest[];
  issues: Issue[];
  events: GitHubEvent[];
  commitMessages: RepoCommitMessages[];
  releases: Release[];
  externalContributions: ExternalContribution[];
  aiContent: AIContent;
};

// LLM structured output

// Predefined types get special visuals, custom types render with chips only
export type SummaryType = string;

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

export type TickerItem = {
  label: string; // short punchy badge label (e.g. "SHIPPED!", "CODE PURGE")
  text: string;  // headline text (e.g. "@user ships JWT to production")
};

export type AIContent = {
  title: string;
  subtitle: string;
  overview: string; // multi-paragraph long-form text
  summaries: SummarySection[];
  highlights: HighlightSection[];
  ticker?: TickerItem[]; // headline items for animated SVG news ticker card
};

// Configuration types

export type Theme = "brutalist" | "minimal" | "editorial" | "swiss";

export type LLMProvider = "openai" | "anthropic" | "gemini" | "openrouter" | "groq" | "grok";

export type Language =
  | "en"
  | "ja"
  | "zh-CN"
  | "zh-TW"
  | "ko"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "ru";

export type ReportConfig = {
  githubToken: string;
  llmProvider: LLMProvider | null;
  llmApiKey: string | null;
  llmModel: string | null;
  language: Language;
  timezone: string; // IANA timezone (e.g. "Asia/Tokyo", "UTC")
};
