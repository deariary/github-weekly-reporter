// Build the prompt for AI narrative generation

import type { NarrativeInput } from "./types.js";

const formatRepoSummary = (input: NarrativeInput): string =>
  input.repositories
    .slice(0, 5)
    .map((r) => `- ${r.name}: ${r.prsOpened} PRs opened, ${r.prsMerged} merged, ${r.issuesOpened} issues`)
    .join("\n");

const formatLanguageSummary = (input: NarrativeInput): string =>
  input.languages
    .slice(0, 5)
    .map((l) => `- ${l.language}: ${l.percentage.toFixed(1)}%`)
    .join("\n");

export const buildPrompt = (input: NarrativeInput): string => `
You are writing a weekly activity summary for a software developer.
Write 2-3 short paragraphs summarizing the following GitHub activity.
Tone: professional but friendly, like a weekly standup summary written for the developer themselves.
Do not use markdown formatting. Write plain text only.

Developer: ${input.username}
Period: ${input.dateRange.from} to ${input.dateRange.to}

Stats:
- ${input.stats.totalCommits} commits
- ${input.stats.prsOpened} PRs opened, ${input.stats.prsMerged} merged
- ${input.stats.prsReviewed} PRs reviewed
- ${input.stats.issuesOpened} issues opened, ${input.stats.issuesClosed} closed

Top repositories:
${formatRepoSummary(input)}

Languages:
${formatLanguageSummary(input)}
`.trim();
