// LLM module: generate structured content with explicit provider/model config

import { parse as parseYaml } from "yaml";
import type {
  AIContent,
  HighlightType,
  PullRequest,
  Issue,
  GitHubEvent,
  ReleaseEventPayload,
} from "../types.js";
import type { NarrativeInput, LLMConfig } from "./types.js";
import { buildPrompt } from "./prompt.js";
import { createOpenAIProvider } from "./providers/openai.js";
import { createAnthropicProvider } from "./providers/anthropic.js";
import { createGeminiProvider } from "./providers/gemini.js";
import { createOpenRouterProvider } from "./providers/openrouter.js";
import { createGroqProvider } from "./providers/groq.js";
import { createGrokProvider } from "./providers/grok.js";

const PROVIDER_FACTORIES = {
  openai: createOpenAIProvider,
  anthropic: createAnthropicProvider,
  gemini: createGeminiProvider,
  openrouter: createOpenRouterProvider,
  groq: createGroqProvider,
  grok: createGrokProvider,
} as const;

export type { LLMConfig } from "./types.js";

const stripCodeFences = (text: string): string =>
  text.replace(/^```(?:ya?ml)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();

const fixUnquotedValues = (yaml: string): string =>
  yaml.replace(/: (\+[^\n"']*)/g, ': "$1"');

const buildReleaseUrl = (repo: string, tag: string): string =>
  `https://github.com/${repo}/releases/tag/${tag}`;

const resolveHighlightUrls = (
  content: AIContent,
  pullRequests: PullRequest[],
  issues: Issue[],
  events: GitHubEvent[],
): AIContent => ({
  ...content,
  highlights: content.highlights.map((h) => {
    if (h.url) return h;

    if (h.type === "pr") {
      const match = pullRequests.find(
        (pr) => pr.title === h.title || pr.title.includes(h.title),
      );
      return match ? { ...h, url: match.url } : h;
    }

    if (h.type === "issue") {
      const match = issues.find(
        (i) => i.title === h.title || i.title.includes(h.title),
      );
      return match ? { ...h, url: match.url } : h;
    }

    if (h.type === "release") {
      const match = events.find(
        (e) =>
          e.payload.kind === "release" &&
          e.repo === h.repo &&
          ((e.payload as ReleaseEventPayload).tag === h.title ||
            (e.payload as ReleaseEventPayload).name === h.title),
      );
      if (match) {
        const tag = (match.payload as ReleaseEventPayload).tag;
        return { ...h, url: buildReleaseUrl(match.repo, tag) };
      }
      return h;
    }

    return h;
  }),
});

const parseAIContent = (raw: string): AIContent => {
  const cleaned = fixUnquotedValues(stripCodeFences(raw));
  const parsed = parseYaml(cleaned) as Record<string, unknown>;

  return {
    title: String(parsed.title ?? ""),
    subtitle: String(parsed.subtitle ?? ""),
    overview: String(parsed.overview ?? ""),
    summaries: Array.isArray(parsed.summaries)
      ? parsed.summaries.map((s: Record<string, unknown>) => ({
          type: String(s.type),
          heading: String(s.heading),
          body: String(s.body),
          chips: Array.isArray(s.chips)
            ? s.chips.map((c: Record<string, unknown>) => ({
                label: String(c.label),
                value: String(c.value),
                color: (c.color as "green" | "red" | "default") ?? "default",
              }))
            : undefined,
        }))
      : [],
    highlights: Array.isArray(parsed.highlights)
      ? parsed.highlights.map((h: Record<string, unknown>) => ({
          type: String(h.type) as HighlightType,
          title: String(h.title),
          repo: String(h.repo),
          meta: String(h.meta),
          body: String(h.body),
        }))
      : [],
  };
};

/** Generate AI-powered narrative content from weekly GitHub activity data. Throws on failure. */
export const generateContent = async (
  input: NarrativeInput,
  config: LLMConfig,
): Promise<AIContent> => {
  try {
    const factory = PROVIDER_FACTORIES[config.provider];
    const provider = factory(config);
    const prompt = buildPrompt(input);
    const raw = await provider.generate(prompt);
    if (!raw) throw new Error("LLM returned empty content");
    const content = parseAIContent(raw);
    return resolveHighlightUrls(content, input.pullRequests, input.issues, input.events);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`LLM content generation failed (${config.provider}): ${message}`, { cause: error });
  }
};
