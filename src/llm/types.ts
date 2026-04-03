// LLM provider abstraction types

import type { WeeklyReportData, LLMProvider as LLMProviderName } from "../types.js";

export type LLMConfig = {
  provider: LLMProviderName;
  apiKey: string;
  model: string;
};

export type LLMProvider = {
  generate: (prompt: string) => Promise<string>;
};

export type NarrativeInput = Omit<WeeklyReportData, "aiContent">;
