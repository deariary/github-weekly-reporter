// OpenAI provider implementation

import OpenAI from "openai";
import { DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE, type LLMProvider, type LLMConfig } from "../types.js";

export const createOpenAIProvider = (config: LLMConfig): LLMProvider => {
  const client = new OpenAI({ apiKey: config.apiKey });

  return {
    generate: async (prompt: string): Promise<string> => {
      const response = await client.chat.completions.create({
        model: config.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
      });
      return response.choices[0]?.message?.content?.trim() ?? "";
    },
  };
};
