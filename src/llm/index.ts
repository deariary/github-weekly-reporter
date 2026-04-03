// LLM module: auto-detect provider, generate narrative, handle errors gracefully

import type { LLMProvider as LLMProviderName } from "../types.js";
import type { NarrativeInput, LLMProviderConfig } from "./types.js";
import { buildPrompt } from "./prompt.js";
import { createOpenAIProvider } from "./providers/openai.js";
import { createAnthropicProvider } from "./providers/anthropic.js";
import { createGeminiProvider } from "./providers/gemini.js";

export type LLMKeys = {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
  model?: string;
};

type DetectedProvider = {
  name: LLMProviderName;
  config: LLMProviderConfig;
};

const PROVIDER_FACTORIES = {
  openai: createOpenAIProvider,
  anthropic: createAnthropicProvider,
  gemini: createGeminiProvider,
} as const;

const detectProvider = (keys: LLMKeys): DetectedProvider | null => {
  if (keys.openaiApiKey) {
    return { name: "openai", config: { apiKey: keys.openaiApiKey, model: keys.model } };
  }
  if (keys.anthropicApiKey) {
    return { name: "anthropic", config: { apiKey: keys.anthropicApiKey, model: keys.model } };
  }
  if (keys.geminiApiKey) {
    return { name: "gemini", config: { apiKey: keys.geminiApiKey, model: keys.model } };
  }
  return null;
};

export const generateNarrative = async (
  input: NarrativeInput,
  keys: LLMKeys,
): Promise<string | null> => {
  const detected = detectProvider(keys);
  if (!detected) return null;

  try {
    const factory = PROVIDER_FACTORIES[detected.name];
    const provider = factory(detected.config);
    const prompt = buildPrompt(input);
    const narrative = await provider.generate(prompt);
    return narrative || null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`LLM narrative generation failed (${detected.name}): ${message}`);
    return null;
  }
};
