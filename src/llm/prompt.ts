// Build the prompt for AI structured content generation

import type { NarrativeInput } from "./types.js";
import { buildLLMContext } from "./preprocess.js";

export const buildPrompt = (input: NarrativeInput): string => `
You are generating structured content for a developer's personal weekly report.
This is like a development diary: written from the developer's own perspective.

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
- summaries: include ALL types that have data to talk about. Every type listed below
  should get a section unless there is genuinely zero relevant data for it.
  Each summary has a heading (short, punchy) and body (2-4 sentences).
  Add 2-4 chips per summary with key stats. Every chip MUST have a non-empty label and value.
- highlights: MUST include at least 2 items, ideally 3-5. Pick the most notable PRs, releases, or issues.
  Use exact PR titles from the data. Each highlight has 1-2 sentences explaining why it mattered.

Summary types (include ALL that apply):
- repo-summary: which repos were active and what the focus was
- commit-summary: commit patterns, volume, notable streaks
- review-summary: review activity, what kind of feedback was given/received
- language-summary: language mix and what each language was used for
- contribution-summary: contributions to repos outside own org (if any external data exists)
- collaboration-summary: who was worked with, review dynamics
- activity-pattern: daily rhythm, peak days, rest days

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
  - type: "commit-summary"
    heading: "heading"
    body: "2-4 sentences"
    chips:
      - label: "total"
        value: "354 commits"
        color: "default"
  - type: "review-summary"
    heading: "heading"
    body: "2-4 sentences"
    chips:
      - label: "reviews"
        value: "48"
        color: "default"
  - type: "language-summary"
    heading: "heading"
    body: "2-4 sentences"
    chips:
      - label: "TypeScript"
        value: "92%"
        color: "default"
  - type: "activity-pattern"
    heading: "heading"
    body: "2-4 sentences"
    chips:
      - label: "peak"
        value: "Tue 161"
        color: "green"
  - type: "collaboration-summary"
    heading: "heading"
    body: "2-4 sentences"
    chips:
      - label: "reviewed"
        value: "5 repos"
        color: "default"
highlights:
  - type: "pr"
    title: "exact PR title from data"
    repo: "owner/repo"
    meta: "merged Apr 2 · +320 -45 · 12 files"
    body: "1-2 sentences"
  - type: "pr"
    title: "another PR title"
    repo: "owner/repo"
    meta: "merged Apr 1 · +12 -3 · 2 files"
    body: "1-2 sentences"
  - type: "release"
    title: "v1.2.0"
    repo: "owner/repo"
    meta: "released Apr 3"
    body: "1-2 sentences"

Activity data:
${buildLLMContext(input)}
`.trim();
