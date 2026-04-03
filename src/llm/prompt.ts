// Build the prompt for AI structured content generation

import type { NarrativeInput } from "./types.js";
import { buildLLMContext } from "./preprocess.js";

export const buildPrompt = (input: NarrativeInput): string => `
You are generating structured content for a developer's weekly report page.
Read the GitHub activity data below and produce a YAML response with the exact schema shown.

Rules for writing:
- Write in second person ("you"), like a thoughtful colleague.
- Be specific: mention actual PR titles, repos, and numbers. No generic filler.
- Identify what was actually accomplished, not just count things.
- Notice patterns: focus areas, burst days, collaboration, project switches.
- overview should be 2-4 paragraphs telling the story of the week.
- Each summary section should have a punchy heading and 2-4 sentence body.
- Highlights should each have a 1-2 sentence body explaining why it matters.
- Only include summary types and highlights that are meaningful for this data. Skip empty ones.
- chips: label is the display name, value is the number/stat, color is "green" for positive, "red" for negative, "default" otherwise.

Available summary types:
- commit-summary: commit volume, patterns, notable changes
- review-summary: review activity, what feedback was given
- language-summary: language mix and what it means
- repo-summary: which repos were active and why
- contribution-summary: contributions to repos outside own org
- collaboration-summary: who you worked with (reviewed, got reviewed by)
- activity-pattern: daily commit pattern, peak days, rest days

Available highlight types:
- pr: a notable pull request (include repo, merged/open, +/- lines)
- release: a release that shipped
- issue: a notable issue opened or closed
- discussion: a notable GitHub discussion

Respond with ONLY valid YAML, no markdown fences, no explanation. Schema:

title: "short catchy title for the week (one line)"
subtitle: "one sentence summary"
overview: |
  Multi-paragraph long-form text.
  Tell the story of the week.
summaries:
  - type: "commit-summary"
    heading: "short heading"
    body: "2-4 sentences"
    chips:
      - label: "label"
        value: "value"
        color: "green"
highlights:
  - type: "pr"
    title: "PR title from the data"
    repo: "owner/repo"
    meta: "merged Apr 2 · +320 -45 · 12 files"
    body: "1-2 sentences on why this matters"

Activity data:
${buildLLMContext(input)}
`.trim();
