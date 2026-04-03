// Build the prompt for AI structured content generation

import type { NarrativeInput } from "./types.js";
import { buildLLMContext } from "./preprocess.js";
import { llmLanguageInstruction } from "../i18n/index.js";

export const buildPrompt = (input: NarrativeInput): string => {
  const langInstruction = llmLanguageInstruction(input.language ?? "en");
  const langBlock = langInstruction ? `\n${langInstruction}\n` : "";

  return `
You are generating structured content for a developer's personal weekly report.
This is like a development diary: written from the developer's own perspective.
${langBlock}
Read the GitHub activity data and produce a YAML response matching the schema below.

Writing style:
- First person. This is the developer's own weekly log.
- Specific: reference actual PR titles, repo names, concrete numbers. No generic filler.
- Focus on WHAT was accomplished and WHY it matters, not just counting things.
- Natural and conversational, like a developer writing a blog post about their week.
- Notice patterns: focus shifts between projects, burst days, collaboration dynamics.

Section requirements:
- title: a punchy one-line title capturing the week's theme
- subtitle: one sentence expanding on the title
- overview: 2 short paragraphs MAX. Keep it tight. This is a brief intro, not an essay.
  Just set the scene and mention the key themes. Details go in summaries below.
- summaries: ORDER BY what's most interesting this week. Lead with the most compelling story.
  Skip types that would just repeat obvious stats with nothing insightful to say.
  Include 3-6 sections total. You can mix predefined types with custom free-form sections.
  Each summary has a heading (short, punchy) and body (2-4 sentences).
  Add 2-4 chips per summary with key stats. Every chip MUST have a non-empty label and value.
- highlights: pick 2-5 notable items. Use exact PR titles from the data.
  Each highlight has 1-2 sentences explaining why it mattered.

Predefined summary types (use when relevant):
- repo-summary: which repos were active and what the focus was
- commit-summary: commit patterns, volume, notable streaks
- review-summary: review activity, what kind of feedback was given/received
- contribution-summary: contributions to repos outside own org
- collaboration-summary: who was worked with, review dynamics
- activity-pattern: daily rhythm, peak days, rest days

Custom summary types:
You can also create free-form summary sections with any type name that fits the data.
Examples: "deep-dive", "tech-debt", "learning", "debugging-story", "architecture",
"testing", "devops", "content-creation", or anything else that captures a theme of the week.
Use custom types when the predefined ones don't capture something interesting about the week.

Available highlight types:
- pr: a notable pull request. meta format: "merged Apr 2 · +320 -45 · 12 files"
- release: a release that shipped. meta format: "released Apr 3"
- issue: a notable issue. meta format: "opened Apr 3" or "closed Apr 2"
- discussion: a GitHub discussion (if any)

YAML formatting rules:
- All string values MUST be quoted with double quotes
- Values starting with + MUST be quoted
- overview uses YAML block scalar (|) for multi-line text
- Respond with ONLY valid YAML. No markdown fences. No explanation before or after.

Schema:

title: "one-line title"
subtitle: "one sentence"
overview: |
  Brief paragraph setting the scene.

  Second paragraph with key themes.
summaries:
  - type: "repo-summary"
    heading: "heading"
    body: "2-4 sentences"
    chips:
      - label: "deariary/backend"
        value: "19 PRs"
        color: "default"
  - type: "deep-dive"
    heading: "heading about a specific technical topic"
    body: "2-4 sentences about something technically interesting"
    chips:
      - label: "topic"
        value: "OAuth2 PKCE"
        color: "default"
  - type: "activity-pattern"
    heading: "heading"
    body: "2-4 sentences"
    chips:
      - label: "peak"
        value: "Tue 161"
        color: "green"
highlights:
  - type: "pr"
    title: "exact PR title from data"
    repo: "owner/repo"
    meta: "merged Apr 2 · +320 -45 · 12 files"
    body: "1-2 sentences"
  - type: "release"
    title: "v1.2.0"
    repo: "owner/repo"
    meta: "released Apr 3"
    body: "1-2 sentences"

Activity data:
${buildLLMContext(input)}
`.trim();
};
