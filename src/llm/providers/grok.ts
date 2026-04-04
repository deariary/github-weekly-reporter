// Grok (xAI) provider implementation (OpenAI-compatible API)

import OpenAI from "openai";
import type { LLMProvider, LLMConfig } from "../types.js";

const BASE_URL = "https://api.x.ai/v1";

export const createGrokProvider = (config: LLMConfig): LLMProvider => {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: BASE_URL });

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
