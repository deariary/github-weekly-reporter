// Anthropic provider implementation

import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE, type LLMProvider, type LLMConfig } from "../types.js";

export const createAnthropicProvider = (config: LLMConfig): LLMProvider => {
  const client = new Anthropic({ apiKey: config.apiKey });

  return {
    generate: async (prompt: string): Promise<string> => {
      const response = await client.messages.create({
        model: config.model,
        max_tokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        messages: [{ role: "user", content: prompt }],
      });
      const block = response.content[0];
      return block.type === "text" ? block.text.trim() : "";
    },
  };
};
