// Google Gemini provider implementation

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LLMProvider, LLMProviderConfig } from "../types.js";

const DEFAULT_MODEL = "gemini-2.0-flash";

export const createGeminiProvider = (config: LLMProviderConfig): LLMProvider => {
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({ model: config.model ?? DEFAULT_MODEL });

  return {
    generate: async (prompt: string): Promise<string> => {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    },
  };
};
