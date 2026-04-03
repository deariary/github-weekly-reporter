// LLM module: generate structured content with explicit provider/model config

import { parse as parseYaml } from "yaml";
import type { AIContent, SummaryType, HighlightType } from "../types.js";
import type { NarrativeInput, LLMConfig } from "./types.js";
import { buildPrompt } from "./prompt.js";
import { createOpenAIProvider } from "./providers/openai.js";
import { createAnthropicProvider } from "./providers/anthropic.js";
import { createGeminiProvider } from "./providers/gemini.js";

const PROVIDER_FACTORIES = {
  openai: createOpenAIProvider,
  anthropic: createAnthropicProvider,
  gemini: createGeminiProvider,
} as const;

export type { LLMConfig } from "./types.js";

const stripCodeFences = (text: string): string =>
  text.replace(/^```(?:ya?ml)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();

const fixUnquotedValues = (yaml: string): string =>
  // Fix unquoted values that start with + or contain special chars
  yaml.replace(/: (\+[^\n"']*)/g, ': "$1"');

const parseAIContent = (raw: string): AIContent => {
  const cleaned = fixUnquotedValues(stripCodeFences(raw));
  const parsed = parseYaml(cleaned) as Record<string, unknown>;

  return {
    title: String(parsed.title ?? ""),
    subtitle: String(parsed.subtitle ?? ""),
    overview: String(parsed.overview ?? ""),
    summaries: Array.isArray(parsed.summaries)
      ? parsed.summaries.map((s: Record<string, unknown>) => ({
          type: String(s.type) as SummaryType,
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

export const generateContent = async (
  input: NarrativeInput,
  config: LLMConfig,
): Promise<AIContent | null> => {
  try {
    const factory = PROVIDER_FACTORIES[config.provider];
    const provider = factory(config);
    const prompt = buildPrompt(input);
    const raw = await provider.generate(prompt);
    if (!raw) return null;
    return parseAIContent(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`LLM content generation failed (${config.provider}): ${message}`);
    return null;
  }
};
