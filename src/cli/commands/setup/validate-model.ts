// Validate model by making a minimal API call

import type { LLMProvider } from "../../../types.js";

export const validateModel = async (
  provider: LLMProvider,
  apiKey: string,
  model: string,
): Promise<{ valid: boolean; error?: string }> => {
  const openaiCompatible = (baseURL: string) =>
    fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1,
      }),
    });

  try {
    let res: Response;
    switch (provider) {
      case "openai":
        res = await openaiCompatible("https://api.openai.com/v1");
        break;
      case "groq":
        res = await openaiCompatible("https://api.groq.com/openai/v1");
        break;
      case "openrouter":
        res = await openaiCompatible("https://openrouter.ai/api/v1");
        break;
      case "grok":
        res = await openaiCompatible("https://api.x.ai/v1");
        break;
      case "anthropic":
        res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "hi" }],
            max_tokens: 1,
          }),
        });
        break;
      case "gemini":
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "hi" }] }],
              generationConfig: { maxOutputTokens: 1 },
            }),
          },
        );
        break;
      default:
        return { valid: true };
    }

    if (res.ok) return { valid: true };

    const body = await res.text();
    // 404 or "model not found" means wrong model name
    if (res.status === 404 || body.toLowerCase().includes("model")) {
      return { valid: false, error: `Model "${model}" not found (${res.status})` };
    }
    // Rate limit or other non-model errors are fine (model exists)
    if (res.status === 429) return { valid: true };
    return { valid: false, error: `API error: ${res.status} ${body.slice(0, 200)}` };
  } catch (e) {
    return { valid: false, error: `Connection error: ${e instanceof Error ? e.message : String(e)}` };
  }
};
