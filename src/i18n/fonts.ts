// Per-language font configuration for Google Fonts

import type { Language } from "../types.js";

export type FontConfig = {
  // Google Fonts @import URL
  importUrl: string;
  // CSS font-family for body text
  bodyFamily: string;
  // CSS font-family for monospace / labels (shared across all languages)
  monoFamily: string;
};

const MONO = "'Space Mono', monospace";

// Latin: Schibsted Grotesk (sharp, Nordic grotesk with character)
const LATIN_URL = "https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap";
const LATIN_BODY = "'Schibsted Grotesk', sans-serif";

const fonts: Record<Language, FontConfig> = {
  en: { importUrl: LATIN_URL, bodyFamily: LATIN_BODY, monoFamily: MONO },
  es: { importUrl: LATIN_URL, bodyFamily: LATIN_BODY, monoFamily: MONO },
  fr: { importUrl: LATIN_URL, bodyFamily: LATIN_BODY, monoFamily: MONO },
  de: { importUrl: LATIN_URL, bodyFamily: LATIN_BODY, monoFamily: MONO },
  pt: { importUrl: LATIN_URL, bodyFamily: LATIN_BODY, monoFamily: MONO },

  // Japanese: Zen Kaku Gothic New (editorial, refined gothic)
  ja: {
    importUrl: "https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap",
    bodyFamily: "'Zen Kaku Gothic New', sans-serif",
    monoFamily: MONO,
  },

  // Simplified Chinese: Noto Sans SC (best available on Google Fonts for SC)
  "zh-CN": {
    importUrl: "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap",
    bodyFamily: "'Noto Sans SC', sans-serif",
    monoFamily: MONO,
  },

  // Traditional Chinese: Noto Sans TC (best available on Google Fonts for TC)
  "zh-TW": {
    importUrl: "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap",
    bodyFamily: "'Noto Sans TC', sans-serif",
    monoFamily: MONO,
  },

  // Korean: IBM Plex Sans KR (technical, developer-oriented)
  ko: {
    importUrl: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap",
    bodyFamily: "'IBM Plex Sans KR', sans-serif",
    monoFamily: MONO,
  },

  // Russian: Urbanist (geometric with Cyrillic support)
  ru: {
    importUrl: "https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap",
    bodyFamily: "'Urbanist', sans-serif",
    monoFamily: MONO,
  },
};

export const getFontConfig = (language: Language): FontConfig =>
  fonts[language] ?? fonts.en;
