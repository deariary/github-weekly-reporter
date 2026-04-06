// Per-language font configuration for Google Fonts

import type { Language } from "../types.js";

export type FontConfig = {
  // Google Fonts @import URL
  importUrl: string;
  // CSS font-family for body text (sans-serif)
  bodyFamily: string;
  // CSS font-family for serif/editorial contexts
  serifFamily: string;
  // CSS font-family for monospace / labels (shared across all languages)
  monoFamily: string;
  // Body text line-height (CJK needs wider spacing than Latin)
  lineHeight: number;
};

const MONO = "'Space Mono', monospace";

// Latin: Schibsted Grotesk (sharp, Nordic grotesk with character)
const LATIN_URL = "https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap";
const LATIN_BODY = "'Schibsted Grotesk', sans-serif";
const LATIN_SERIF = "Georgia, 'Times New Roman', serif";
const LATIN_LH = 1.65;
const CJK_LH = 1.9;

const fonts: Record<Language, FontConfig> = {
  en: { importUrl: LATIN_URL, bodyFamily: LATIN_BODY, serifFamily: LATIN_SERIF, monoFamily: MONO, lineHeight: LATIN_LH },
  es: { importUrl: LATIN_URL, bodyFamily: LATIN_BODY, serifFamily: LATIN_SERIF, monoFamily: MONO, lineHeight: LATIN_LH },
  fr: { importUrl: LATIN_URL, bodyFamily: LATIN_BODY, serifFamily: LATIN_SERIF, monoFamily: MONO, lineHeight: LATIN_LH },
  de: { importUrl: LATIN_URL, bodyFamily: LATIN_BODY, serifFamily: LATIN_SERIF, monoFamily: MONO, lineHeight: LATIN_LH },
  pt: { importUrl: LATIN_URL, bodyFamily: LATIN_BODY, serifFamily: LATIN_SERIF, monoFamily: MONO, lineHeight: LATIN_LH },

  // Japanese: Zen Kaku Gothic New (sans), Noto Serif JP (serif)
  ja: {
    importUrl: "https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@300;400;500;700&family=Noto+Serif+JP:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap",
    bodyFamily: "'Zen Kaku Gothic New', sans-serif",
    serifFamily: "'Noto Serif JP', Georgia, serif",
    monoFamily: MONO,
    lineHeight: CJK_LH,
  },

  // Simplified Chinese: Noto Sans SC (sans), Noto Serif SC (serif)
  "zh-CN": {
    importUrl: "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&family=Noto+Serif+SC:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap",
    bodyFamily: "'Noto Sans SC', sans-serif",
    serifFamily: "'Noto Serif SC', Georgia, serif",
    monoFamily: MONO,
    lineHeight: CJK_LH,
  },

  // Traditional Chinese: Noto Sans TC (sans), Noto Serif TC (serif)
  "zh-TW": {
    importUrl: "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;600;700&family=Noto+Serif+TC:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap",
    bodyFamily: "'Noto Sans TC', sans-serif",
    serifFamily: "'Noto Serif TC', Georgia, serif",
    monoFamily: MONO,
    lineHeight: CJK_LH,
  },

  // Korean: IBM Plex Sans KR (sans), Noto Serif KR (serif)
  ko: {
    importUrl: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@300;400;500;600;700&family=Noto+Serif+KR:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap",
    bodyFamily: "'IBM Plex Sans KR', sans-serif",
    serifFamily: "'Noto Serif KR', Georgia, serif",
    monoFamily: MONO,
    lineHeight: CJK_LH,
  },

  // Russian: Urbanist (sans), Georgia fallback (serif)
  ru: {
    importUrl: "https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap",
    bodyFamily: "'Urbanist', sans-serif",
    serifFamily: "Georgia, 'Times New Roman', serif",
    monoFamily: MONO,
    lineHeight: LATIN_LH,
  },
};

export const getFontConfig = (language: Language): FontConfig =>
  fonts[language] ?? fonts.en;
