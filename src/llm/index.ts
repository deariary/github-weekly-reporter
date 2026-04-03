// LLM module: generate narrative with explicit provider/model config

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

export const generateNarrative = async (
  input: NarrativeInput,
  config: LLMConfig,
): Promise<string | null> => {
  try {
    const factory = PROVIDER_FACTORIES[config.provider];
    const provider = factory(config);
    const prompt = buildPrompt(input);
    const narrative = await provider.generate(prompt);
    return narrative || null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`LLM narrative generation failed (${config.provider}): ${message}`);
    return null;
  }
};
