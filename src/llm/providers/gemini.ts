// Google Gemini provider implementation

import { GoogleGenerativeAI } from "@google/generative-ai";
import { DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE, type LLMProvider, type LLMConfig } from "../types.js";

export const createGeminiProvider = (config: LLMConfig): LLMProvider => {
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({
    model: config.model,
    generationConfig: {
      maxOutputTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
    },
  });

  return {
    generate: async (prompt: string): Promise<string> => {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    },
  };
};
