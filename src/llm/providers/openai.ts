// OpenAI provider implementation

import OpenAI from "openai";
import type { LLMProvider, LLMConfig } from "../types.js";

export const createOpenAIProvider = (config: LLMConfig): LLMProvider => {
  const client = new OpenAI({ apiKey: config.apiKey });

  return {
    generate: async (prompt: string): Promise<string> => {
      const response = await client.chat.completions.create({
        model: config.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
        temperature: 0.7,
      });
      return response.choices[0]?.message?.content?.trim() ?? "";
    },
  };
};
