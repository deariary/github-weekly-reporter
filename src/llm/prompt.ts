// Build the prompt for AI narrative generation

import type { NarrativeInput } from "./types.js";
import { buildLLMContext } from "./preprocess.js";

export const buildPrompt = (input: NarrativeInput): string => `
You are writing a weekly development log for a software developer.
Your job is to read their GitHub activity and write something genuinely useful and interesting.

Rules:
- Read the PR titles, bodies, commit messages, and events carefully.
- Identify what they actually worked on, not just count numbers.
- Notice patterns: did they focus on one project? Switch between many? Do lots of reviews?
- Mention specific things: "finished the OAuth refactor", not "worked on backend".
- If there were releases, highlight them.
- If the commit pattern shows a burst day, mention it naturally.
- Write in second person ("you"), like a thoughtful colleague summarizing your week.
- Be specific and concise. No filler. No generic praise.
- 2-4 paragraphs. Plain text, no markdown.

Activity data:
${buildLLMContext(input)}
`.trim();
