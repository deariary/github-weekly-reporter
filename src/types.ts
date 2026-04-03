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
  url: string;
  repository: string;
  state: "open" | "merged" | "closed";
  createdAt: string;
  mergedAt: string | null;
};

export type Issue = {
  title: string;
  url: string;
  repository: string;
  state: "open" | "closed";
  createdAt: string;
  closedAt: string | null;
};

export type WeeklyStats = {
  totalCommits: number;
  prsOpened: number;
  prsMerged: number;
  prsReviewed: number;
  issuesOpened: number;
  issuesClosed: number;
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
  aiNarrative: string | null;
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
