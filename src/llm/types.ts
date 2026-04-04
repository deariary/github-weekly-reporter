// LLM provider abstraction types

import type { WeeklyReportData, LLMProvider as LLMProviderName, Language } from "../types.js";

export const DEFAULT_MAX_TOKENS = 16384;
export const DEFAULT_TEMPERATURE = 0.7;

export type LLMConfig = {
  provider: LLMProviderName;
  apiKey: string;
  model: string;
  language?: Language;
};

export type LLMProvider = {
  generate: (prompt: string) => Promise<string>;
};

export type NarrativeInput = Omit<WeeklyReportData, "aiContent"> & {
  language?: Language;
};
