// Setup command constants

import type { Language } from "../../../types.js";

export const TIMEZONE_CHOICES = [
  { name: "UTC",                            value: "UTC" },
  { name: "US/Pacific (Los Angeles)",       value: "America/Los_Angeles" },
  { name: "US/Mountain (Denver)",           value: "America/Denver" },
  { name: "US/Central (Chicago)",           value: "America/Chicago" },
  { name: "US/Eastern (New York)",          value: "America/New_York" },
  { name: "Europe/London",                  value: "Europe/London" },
  { name: "Europe/Paris",                   value: "Europe/Paris" },
  { name: "Europe/Berlin",                  value: "Europe/Berlin" },
  { name: "Europe/Moscow",                  value: "Europe/Moscow" },
  { name: "Asia/Dubai",                     value: "Asia/Dubai" },
  { name: "Asia/Kolkata (India)",           value: "Asia/Kolkata" },
  { name: "Asia/Bangkok",                   value: "Asia/Bangkok" },
  { name: "Asia/Shanghai (China)",          value: "Asia/Shanghai" },
  { name: "Asia/Tokyo (Japan)",             value: "Asia/Tokyo" },
  { name: "Asia/Seoul (Korea)",             value: "Asia/Seoul" },
  { name: "Australia/Sydney",               value: "Australia/Sydney" },
  { name: "Pacific/Auckland (New Zealand)", value: "Pacific/Auckland" },
  { name: "America/Sao_Paulo (Brazil)",     value: "America/Sao_Paulo" },
];

export const LANGUAGE_CHOICES: { name: string; value: Language }[] = [
  { name: "English",              value: "en" },
  { name: "Japanese (日本語)",     value: "ja" },
  { name: "Chinese Simplified (简体中文)", value: "zh-CN" },
  { name: "Chinese Traditional (繁體中文)", value: "zh-TW" },
  { name: "Korean (한국어)",       value: "ko" },
  { name: "Spanish (Español)",    value: "es" },
  { name: "French (Français)",    value: "fr" },
  { name: "German (Deutsch)",     value: "de" },
  { name: "Portuguese (Português)", value: "pt" },
  { name: "Russian (Русский)",    value: "ru" },
];

export const MODEL_LIST_URLS: Record<string, string> = {
  groq: "https://console.groq.com/docs/models",
  openrouter: "https://openrouter.ai/models",
  openai: "https://platform.openai.com/docs/models",
  anthropic: "https://docs.anthropic.com/en/docs/about-claude/models",
  gemini: "https://ai.google.dev/gemini-api/docs/models",
  grok: "https://docs.x.ai/docs/models",
};
