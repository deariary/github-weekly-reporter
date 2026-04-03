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

// JetBrains Mono is used for monospace across all languages
const MONO = "'JetBrains Mono', monospace";

const fonts: Record<Language, FontConfig> = {
  // Latin script: Space Grotesk works well
  en: {
    importUrl: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
    bodyFamily: "'Space Grotesk', sans-serif",
    monoFamily: MONO,
  },
  es: {
    importUrl: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
    bodyFamily: "'Space Grotesk', sans-serif",
    monoFamily: MONO,
  },
  fr: {
    importUrl: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
    bodyFamily: "'Space Grotesk', sans-serif",
    monoFamily: MONO,
  },
  de: {
    importUrl: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
    bodyFamily: "'Space Grotesk', sans-serif",
    monoFamily: MONO,
  },
  pt: {
    importUrl: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
    bodyFamily: "'Space Grotesk', sans-serif",
    monoFamily: MONO,
  },

  // Japanese: Noto Sans JP provides clean, modern CJK glyphs
  ja: {
    importUrl: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
    bodyFamily: "'Noto Sans JP', sans-serif",
    monoFamily: MONO,
  },

  // Simplified Chinese
  "zh-CN": {
    importUrl: "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
    bodyFamily: "'Noto Sans SC', sans-serif",
    monoFamily: MONO,
  },

  // Traditional Chinese
  "zh-TW": {
    importUrl: "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
    bodyFamily: "'Noto Sans TC', sans-serif",
    monoFamily: MONO,
  },

  // Korean
  ko: {
    importUrl: "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
    bodyFamily: "'Noto Sans KR', sans-serif",
    monoFamily: MONO,
  },

  // Russian (Cyrillic): Inter has excellent Cyrillic support
  ru: {
    importUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
    bodyFamily: "'Inter', sans-serif",
    monoFamily: MONO,
  },
};

export const getFontConfig = (language: Language): FontConfig =>
  fonts[language] ?? fonts.en;
