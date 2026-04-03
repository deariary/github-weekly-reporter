// Anthropic provider implementation

import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMProviderConfig } from "../types.js";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export const createAnthropicProvider = (config: LLMProviderConfig): LLMProvider => {
  const client = new Anthropic({ apiKey: config.apiKey });
  const model = config.model ?? DEFAULT_MODEL;

  return {
    generate: async (prompt: string): Promise<string> => {
      const response = await client.messages.create({
        model,
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });
      const block = response.content[0];
      return block.type === "text" ? block.text.trim() : "";
    },
  };
};
