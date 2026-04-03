// Google Gemini provider implementation

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LLMProvider, LLMConfig } from "../types.js";

export const createGeminiProvider = (config: LLMConfig): LLMProvider => {
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({ model: config.model });

  return {
    generate: async (prompt: string): Promise<string> => {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    },
  };
};
