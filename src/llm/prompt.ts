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
- title: a specific one-line title that could ONLY describe THIS week.
  MUST reference a concrete detail: a repo name, feature name, PR topic, or technical concept.
  BAD (too generic): "A Productive Week", "Lots of Progress", "Bug Fixes and Features"
  GOOD (specific): "OAuth2 PKCE lands in the auth service", "ecma262 editorial sprint", "Migrating the payment flow to Stripe v3"
- subtitle: one sentence expanding on the title with additional concrete details
- overview: 2-3 paragraphs. Set the scene, describe the main narrative arc of the week,
  and mention what made it interesting. Each paragraph should be 2-4 sentences.
  This is the reader's first impression, so make it engaging and substantive.
- summaries: ORDER BY what's most interesting this week. Lead with the most compelling story.
  Skip types that would just repeat obvious stats with nothing insightful to say.
  Include 3-6 sections total. You can mix predefined types with custom free-form sections.
  Each summary has a heading (short, punchy) and body (2-4 sentences).
  Add 2-4 chips per summary with key stats. Every chip MUST have a non-empty label and value.
- highlights: pick 2-5 notable items. Use exact PR titles from the data.
  Each highlight has 1-2 sentences explaining why it mattered.
- ticker: a list of 5-8 items for an animated scrolling news-ticker card (GitHub Profile README).
  Each item has a label and text. Write like a dramatic, tongue-in-cheek TV news broadcast.
  Be funny, over-the-top, and entertaining while staying accurate to the actual data.
  - label: a short, dramatic, fun ALL-CAPS badge (1-3 words). Be creative and absurd.
    Think cable news chyrons meets developer humor.
    Examples: "ABSOLUTE CARNAGE", "SOURCES SAY", "DEVELOPING", "TREMENDOUS COMMITS",
    "HISTORIC MERGE", "KEYBOARD ON FIRE", "UNPRECEDENTED", "EXPERTS BAFFLED",
    "NO SURVIVORS", "RED ALERT", "JUST IN", "NOT A DRILL"
  - text: a headline (40-80 chars). Write like a breathless news anchor.
    Use the developer's username as subject. Present tense, active voice.
    Exaggerate the drama. Make it entertaining.
    BAD (boring): "@user pushes 42 commits" (just restating facts)
    BAD (boring): "@user completes OAuth2 migration" (corporate memo)
    GOOD: "@user goes on mass deletion spree, mass removing 1,204 lines of legacy code"
    GOOD: "@user spotted deploying to production at 2 AM. Witnesses report maniacal laughter."
    GOOD: "@user single-handedly mass-reviews 8 PRs before mass-lunch. Coworkers stunned."

Predefined summary types (use when relevant):
- repo-summary: which repos were active and what the focus was
- commit-summary: commit patterns, volume, notable streaks. Use actual commit messages when available.
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
  First paragraph setting the scene and describing what drove the week.

  Second paragraph diving into the main narrative arc. What shifted, what was interesting.

  Third paragraph (optional) wrapping up the themes or looking ahead.
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
ticker:
  - label: "ABSOLUTE CARNAGE"
    text: "@user goes on mass deletion spree, mass removing 1,204 lines of legacy auth code"
  - label: "NOT A DRILL"
    text: "@user deploys JWT sessions to prod on a Wednesday. Bold move."
  - label: "EXPERTS BAFFLED"
    text: "@user reviews 8 PRs before lunch. Coworkers reportedly stunned."
  - label: "DEVELOPING"
    text: "@user spotted mass pushing commits at an alarming rate. 42 this week alone."
  - label: "UNPRECEDENTED"
    text: "@user migrates three repos to OAuth2 PKCE in what sources call a historic sprint"

Activity data:
${buildLLMContext(input)}
`.trim();
};
