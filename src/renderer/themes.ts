// Theme CSS definitions for report rendering

import type { Theme } from "../types.js";

type ThemeColors = {
  bg: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderSubtle: string;
  accent: string;
  cardBg: string;
  chipBg: string;
  chipBorder: string;
  green: string;
  red: string;
  badgePr: string;
  badgeRelease: string;
  badgeIssue: string;
  badgeDiscussion: string;
  heatmap0: string;
  heatmap1: string;
  heatmap2: string;
  heatmap3: string;
  heatmap4: string;
  heatmap4Text: string;
};

const THEMES: Record<Theme, ThemeColors> = {
  default: {
    bg: "#ffffff",
    text: "#1f2328",
    textSecondary: "#656d76",
    textTertiary: "#8b949e",
    border: "#d0d7de",
    borderSubtle: "#e8ebef",
    accent: "#0969da",
    cardBg: "#f6f8fa",
    chipBg: "#f0f3f6",
    chipBorder: "#d0d7de",
    green: "#1a7f37",
    red: "#cf222e",
    badgePr: "#8250df",
    badgeRelease: "#1a7f37",
    badgeIssue: "#bf8700",
    badgeDiscussion: "#0969da",
    heatmap0: "#ebedf0",
    heatmap1: "#9be9a8",
    heatmap2: "#40c463",
    heatmap3: "#30a14e",
    heatmap4: "#216e39",
    heatmap4Text: "#fff",
  },
  dark: {
    bg: "#050505",
    text: "#e0e0e0",
    textSecondary: "rgba(255,255,255,0.65)",
    textTertiary: "rgba(255,255,255,0.3)",
    border: "rgba(255,255,255,0.08)",
    borderSubtle: "rgba(255,255,255,0.04)",
    accent: "#39d353",
    cardBg: "rgba(255,255,255,0.02)",
    chipBg: "rgba(255,255,255,0.04)",
    chipBorder: "rgba(255,255,255,0.08)",
    green: "#3fb950",
    red: "#f85149",
    badgePr: "#8957e5",
    badgeRelease: "#238636",
    badgeIssue: "#d29922",
    badgeDiscussion: "#58a6ff",
    heatmap0: "rgba(255,255,255,0.03)",
    heatmap1: "#0e4429",
    heatmap2: "#006d32",
    heatmap3: "#26a641",
    heatmap4: "#39d353",
    heatmap4Text: "#000",
  },
};

export const getThemeColors = (theme: Theme): ThemeColors =>
  THEMES[theme] ?? THEMES.dark;

export const buildCSS = (theme: Theme): string => {
  const c = getThemeColors(theme);

  return `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Space Grotesk', sans-serif;
      background: ${c.bg};
      color: ${c.text};
      line-height: 1.7;
    }

    /* NAV */
    nav {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2.5rem;
      background: ${c.bg}dd;
      backdrop-filter: blur(12px);
      border-bottom: 1px solid ${c.border};
    }
    nav a { color: ${c.text}; text-decoration: none; }
    .nav-left { display: flex; align-items: center; gap: 1rem; }
    .nav-left img { width: 28px; height: 28px; border-radius: 50%; }
    .nav-left span { font-size: 0.875rem; font-weight: 500; }
    .nav-back {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: ${c.textTertiary};
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      border: 1px solid ${c.chipBorder};
      transition: all 0.2s;
    }
    .nav-back:hover { color: ${c.text}; border-color: ${c.border}; }

    .page { max-width: 720px; margin: 0 auto; padding: 6rem 2rem 4rem; }

    /* HEADER */
    .header { margin-bottom: 3rem; }
    .header-week {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: ${c.textTertiary};
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin-bottom: 1.25rem;
    }
    .header-title {
      font-size: clamp(1.75rem, 4vw, 2.25rem);
      font-weight: 600;
      line-height: 1.35;
      letter-spacing: -0.02em;
      margin-bottom: 0.75rem;
    }
    .header-sub {
      font-size: 1.0625rem;
      color: ${c.textSecondary};
      font-weight: 300;
    }

    /* OVERVIEW */
    .overview {
      padding: 2.5rem 0 3rem;
      border-top: 1px solid ${c.border};
      margin-bottom: 4rem;
    }
    .overview p {
      font-size: 1.0625rem;
      color: ${c.textSecondary};
      line-height: 1.9;
      margin-bottom: 1.25rem;
    }
    .overview p:last-child { margin-bottom: 0; }
    .overview strong { color: ${c.text}; font-weight: 500; }

    /* SECTION GROUP */
    .section-group { margin-bottom: 5rem; }
    .section-group-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2.5rem;
    }
    .section-group-title {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .section-group-line {
      flex: 1;
      height: 1px;
      background: ${c.border};
    }
    .section-group-count {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      color: ${c.textTertiary};
      letter-spacing: 0.1em;
    }

    /* SUMMARY SECTION */
    .section-summary {
      margin-bottom: 1rem;
      padding: 1.5rem 1.75rem;
      border-radius: 12px;
      border: 1px solid ${c.chipBorder};
      background: ${c.cardBg};
      transition: all 0.3s ease;
    }
    .section-summary:hover {
      border-color: ${c.accent};
      box-shadow: 0 0 20px ${c.accent}22, inset 0 0 20px ${c.accent}08;
      transform: translateY(-2px);
    }
    .section-summary .section-type {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: ${c.accent};
      margin-bottom: 0.625rem;
    }
    .section-summary .section-heading {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      letter-spacing: -0.01em;
    }
    .section-summary .section-body {
      font-size: 1rem;
      color: ${c.textSecondary};
      line-height: 1.85;
    }

    /* DATA CHIPS */
    .data-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .chip {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      background: ${c.chipBg};
      border: 1px solid ${c.chipBorder};
      color: ${c.textSecondary};
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      transition: all 0.2s ease;
    }
    .chip:hover {
      border-color: ${c.accent};
      box-shadow: 0 0 8px ${c.accent}33;
    }
    .chip-green { color: ${c.green}; font-weight: 500; }
    .chip-red { color: ${c.red}; font-weight: 500; }
    .chip-default { font-weight: 500; }

    /* HIGHLIGHT CARD */
    .highlight-card {
      background: ${c.cardBg};
      border: 1px solid ${c.chipBorder};
      border-radius: 12px;
      padding: 1.5rem 1.75rem;
      margin-bottom: 1rem;
      transition: all 0.3s ease;
    }
    .highlight-card:hover {
      border-color: ${c.accent};
      box-shadow: 0 0 20px ${c.accent}22, inset 0 0 20px ${c.accent}08;
      transform: translateY(-2px);
    }
    .highlight-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.5625rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      margin-bottom: 0.75rem;
      color: #fff;
    }
    .highlight-pr { background: ${c.badgePr}; }
    .highlight-release { background: ${c.badgeRelease}; }
    .highlight-issue { background: ${c.badgeIssue}; color: #000; }
    .highlight-discussion { background: ${c.badgeDiscussion}; color: #000; }
    .highlight-title {
      font-size: 1.0625rem;
      font-weight: 600;
      margin-bottom: 0.375rem;
    }
    .highlight-meta {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      color: ${c.textTertiary};
      margin-bottom: 0.75rem;
    }
    .highlight-title a { color: ${c.text}; text-decoration: none; }
    .highlight-title a:hover { color: ${c.accent}; text-decoration: underline; }
    .highlight-body {
      font-size: 0.9375rem;
      color: ${c.textSecondary};
      line-height: 1.75;
    }

    /* MINI HEATMAP */
    .mini-heatmap { display: flex; gap: 4px; margin-top: 1rem; }
    .mh-day { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .mh-block {
      width: 44px; height: 44px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8125rem; font-weight: 600;
      transition: all 0.2s ease;
    }
    .mh-block:hover {
      transform: scale(1.15);
      box-shadow: 0 0 12px ${c.accent}44;
    }
    .mh-label { font-size: 0.5625rem; text-transform: uppercase; letter-spacing: 0.1em; color: ${c.textTertiary}; }
    .mh-level-0 { background: ${c.heatmap0}; color: ${c.textTertiary}; }
    .mh-level-1 { background: ${c.heatmap1}; }
    .mh-level-2 { background: ${c.heatmap2}; }
    .mh-level-3 { background: ${c.heatmap3}; }
    .mh-level-4 { background: ${c.heatmap4}; color: ${c.heatmap4Text}; }

    /* DIFF BAR (commit-summary) */
    .diff-bar {
      display: flex;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 1rem;
      margin-bottom: 0.5rem;
    }
    .diff-add { background: ${c.green}; height: 100%; }
    .diff-del { background: ${c.red}; height: 100%; }
    .diff-labels {
      display: flex;
      justify-content: space-between;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
    }
    .diff-label-add { color: ${c.green}; }
    .diff-label-del { color: ${c.red}; }

    /* REPO BARS (repo-summary) */
    .repo-bars {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .repo-bar-item { font-size: 0.75rem; }
    .repo-bar-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.25rem;
    }
    .repo-bar-label {
      font-family: 'JetBrains Mono', monospace;
      color: ${c.textSecondary};
      font-size: 0.75rem;
    }
    .repo-bar-track {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: ${c.chipBg};
      overflow: hidden;
    }
    .repo-bar-fill {
      height: 100%;
      border-radius: 3px;
      background: ${c.accent};
      transition: width 0.5s ease;
    }
    .repo-bar-value {
      font-family: 'JetBrains Mono', monospace;
      color: ${c.textTertiary};
      font-size: 0.75rem;
    }

    /* FOOTER */
    .footer {
      max-width: 720px;
      margin: 0 auto;
      text-align: center;
      padding: 3rem 2rem;
      font-size: 0.6875rem;
      color: ${c.textTertiary};
      border-top: 1px solid ${c.borderSubtle};
    }
    .footer a { color: ${c.accent}; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }

    /* VIEW TRANSITIONS */
    @view-transition {
      navigation: auto;
    }

    @media (max-width: 600px) {
      nav { padding: 1rem 1.25rem; }
      .page { padding: 5rem 1.25rem 3rem; }
    }
  `;
};
