// OpenAI provider implementation

import OpenAI from "openai";
import type { LLMProvider, LLMProviderConfig } from "../types.js";

const DEFAULT_MODEL = "gpt-4o-mini";

export const createOpenAIProvider = (config: LLMProviderConfig): LLMProvider => {
  const client = new OpenAI({ apiKey: config.apiKey });
  const model = config.model ?? DEFAULT_MODEL;

  return {
    generate: async (prompt: string): Promise<string> => {
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512,
        temperature: 0.7,
      });
      return response.choices[0]?.message?.content?.trim() ?? "";
    },
  };
};
