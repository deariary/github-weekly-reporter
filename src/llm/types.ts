// LLM provider abstraction types

import type { WeeklyReportData } from "../types.js";

export type LLMProviderConfig = {
  apiKey: string;
  model?: string;
};

export type LLMProvider = {
  generate: (prompt: string) => Promise<string>;
};

export type NarrativeInput = Omit<WeeklyReportData, "aiNarrative">;
