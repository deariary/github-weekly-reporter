// CSS definitions for report rendering (dark artistic theme)

import type { Language } from "../types.js";
import { getFontConfig } from "../i18n/index.js";

const c = {
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
};

export const buildCSS = (language: Language = "en"): string => {
  const f = getFontConfig(language);

  return `
    @import url('${f.importUrl}');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* GRAIN */
    body::after {
      content: '';
      position: fixed;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 9999;
    }

    .skip-link {
      position: absolute; top: -100%; left: 1rem;
      padding: 0.5rem 1rem; background: ${c.accent}; color: ${c.bg};
      border-radius: 0 0 6px 6px; z-index: 200; font-size: 0.875rem; text-decoration: none;
    }
    .skip-link:focus { top: 0; }
    :focus-visible { outline: 2px solid ${c.accent}; outline-offset: 2px; }

    body {
      font-family: ${f.bodyFamily};
      background: ${c.bg};
      color: ${c.text};
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      overflow-x: hidden;
    }

    code {
      font-family: ${f.monoFamily};
      font-size: 0.875em;
      padding: 0.15em 0.4em;
      border-radius: 4px;
      background: ${c.chipBg};
      border: 1px solid ${c.chipBorder};
    }

    /* ===== NAV (matches index 960px) ===== */
    nav[aria-label="Site navigation"] {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: rgba(5,5,5,0.8);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid ${c.border};
    }
    .nav-inner {
      max-width: 960px; margin: 0 auto;
      padding: 0.75rem 3rem;
      display: flex; justify-content: space-between; align-items: center;
      min-height: 56px;
    }
    nav a { color: ${c.text}; text-decoration: none; }
    .nav-site-title {
      font-size: 0.75rem; font-weight: 600;
      letter-spacing: 0.2em; text-transform: uppercase;
      color: rgba(255,255,255,0.4);
      white-space: nowrap;
    }
    .nav-back {
      font-family: ${f.monoFamily}; font-size: 0.6875rem;
      color: ${c.textTertiary};
      padding: 0.375rem 0.75rem; border-radius: 6px;
      border: 1px solid ${c.chipBorder}; transition: all 0.2s;
    }
    .nav-back:hover { color: ${c.text}; border-color: ${c.accent}; }

    /* ===== REPORT HERO ===== */
    .report-hero {
      position: relative;
      background: #0a0a0a;
      padding: 8rem 3rem 4rem;
      margin-bottom: 4rem;
      overflow: hidden;
    }
    .report-hero::before {
      content: '';
      position: absolute;
      bottom: 0; left: 50%;
      width: 900px; height: 400px;
      transform: translateX(-50%);
      background: radial-gradient(ellipse, ${c.accent}10 0%, transparent 70%);
      pointer-events: none;
    }
    .report-hero-inner {
      max-width: 960px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }
    .report-hero .header-meta {
      display: flex; align-items: center; gap: 0.75rem;
      margin-bottom: 2rem;
      font-size: 0.8125rem; color: ${c.textTertiary};
    }
    .report-hero .header-sep { color: rgba(255,255,255,0.15); }
    .report-hero .header-date {
      font-family: ${f.monoFamily}; font-size: 0.6875rem;
      letter-spacing: 0.1em; text-transform: uppercase;
    }
    .report-hero .header-author {
      display: inline-flex; align-items: center; gap: 0.5rem;
      text-decoration: none; color: ${c.textSecondary};
      font-weight: 500; transition: color 0.3s;
    }
    .report-hero .header-author:hover { color: ${c.accent}; }
    .report-hero .header-author img {
      width: 32px; height: 32px; border-radius: 50%;
      border: 2px solid ${c.accent}40;
    }
    .report-hero .header-title {
      font-size: clamp(2.5rem, 6vw, 4rem);
      font-weight: 900;
      line-height: 1.05;
      letter-spacing: -0.05em;
      color: #ffffff;
      margin-bottom: 1.25rem;
      max-width: 80%;
    }
    .report-hero .header-sub {
      font-size: 1.25rem;
      color: rgba(255,255,255,0.5);
      font-weight: 300;
      line-height: 1.6;
      max-width: 600px;
    }

    /* ===== CONTENT ===== */
    .page {
      max-width: 960px; margin: 0 auto;
      padding: 0 3rem 4rem;
    }

    /* OVERVIEW */
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .overview {
      padding: 0 0 2rem;
      margin-bottom: 4rem;
      max-width: 640px;
      margin-left: auto;
      margin-right: auto;
      animation: fade-up 0.5s ease both;
    }
    .overview p {
      font-size: 1.0625rem; color: ${c.textSecondary};
      line-height: 1.9; margin-bottom: 1.25rem;
    }
    .overview p:last-child { margin-bottom: 0; }
    .overview strong { color: ${c.text}; font-weight: 500; }

    /* SECTION GROUP */
    .section-group { margin-bottom: 5rem; }
    .section-group-header {
      display: flex; align-items: center; gap: 1rem;
      margin-bottom: 2.5rem;
    }
    .section-group-title {
      font-size: clamp(3rem, 8vw, 5rem); font-weight: 900;
      letter-spacing: -0.06em;
    }
    .section-group-line { flex: 1; height: 1px; background: ${c.border}; }
    .section-group-count {
      font-family: ${f.monoFamily}; font-size: 0.75rem;
      color: ${c.textTertiary}; letter-spacing: 0.15em;
      text-transform: uppercase;
    }

    /* SUMMARY CARDS - alternating wide offset */
    @keyframes card-enter {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .section-summary:nth-child(2) { animation-delay: 0.05s; }
    .section-summary:nth-child(3) { animation-delay: 0.1s; }
    .section-summary:nth-child(4) { animation-delay: 0.15s; }
    .section-summary:nth-child(5) { animation-delay: 0.2s; }
    .section-summary:nth-child(6) { animation-delay: 0.25s; }
    .section-summary {
      margin-bottom: 2.5rem;
      padding: 2rem 0 2rem 2.5rem;
      border: none;
      border-left: 2px solid ${c.chipBorder};
      background: none;
      max-width: 600px;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      animation: card-enter 0.4s ease both;
      position: relative;
    }
    .section-summary:hover {
      border-left-color: ${c.accent};
    }
    /* first card: featured, wider */
    .section-summary:first-child {
      max-width: 700px;
      padding: 2.5rem 0 2.5rem 3rem;
      border-left-width: 3px;
      border-left-color: ${c.accent}40;
    }
    /* alternating offset */
    .section-summary:nth-child(even):not(:first-child) {
      margin-left: auto;
    }
    .section-summary:nth-child(odd):not(:first-child) {
      margin-right: auto;
    }
    .section-summary:hover {
      transform: translateX(4px);
    }
    /* heading breaks out left of card */
    .section-summary .section-heading {
      font-size: 2rem; font-weight: 900;
      letter-spacing: -0.04em;
      margin-left: -5rem;
      margin-bottom: 1rem;
      color: #ffffff;
    }
    .section-summary:first-child .section-heading {
      margin-left: -6rem;
      font-size: 2.75rem;
    }
    .section-summary .section-type {
      font-family: ${f.monoFamily}; font-size: 0.6875rem;
      text-transform: uppercase; letter-spacing: 0.2em;
      color: ${c.accent}; margin-bottom: 0.75rem;
    }
    .section-summary .section-body {
      font-size: 1rem; color: ${c.textSecondary}; line-height: 1.85;
    }

    /* DATA CHIPS */
    .data-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1.25rem; }
    .chip {
      font-family: ${f.monoFamily}; font-size: 0.75rem;
      padding: 0.3rem 0.65rem; border-radius: 6px;
      background: ${c.chipBg}; border: 1px solid ${c.chipBorder};
      color: ${c.textSecondary};
      display: inline-flex; align-items: center; gap: 0.375rem;
      transition: all 0.2s ease;
    }
    .chip:hover { border-color: ${c.accent}60; }
    .chip-green { color: ${c.green}; font-weight: 600; }
    .chip-red { color: ${c.red}; font-weight: 600; }
    .chip-default { font-weight: 600; }

    /* HIGHLIGHT GRID */
    .highlight-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }

    /* HIGHLIGHT CARD */
    .highlight-card {
      background: ${c.cardBg};
      border: 1px solid ${c.chipBorder};
      border-radius: 12px;
      padding: 2rem;
      animation: card-enter 0.4s ease both;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .highlight-card:nth-child(2) { animation-delay: 0.05s; }
    .highlight-card:nth-child(3) { animation-delay: 0.1s; }
    .highlight-card:nth-child(4) { animation-delay: 0.15s; }
    .highlight-card:nth-child(5) { animation-delay: 0.2s; }
    .highlight-card:hover {
      border-color: ${c.badgePr}50;
      transform: translateY(-4px);
      box-shadow: 0 12px 48px ${c.badgePr}15, 0 4px 16px rgba(0,0,0,0.5);
    }
    .highlight-badge {
      font-family: ${f.monoFamily}; font-size: 0.6875rem;
      text-transform: uppercase; letter-spacing: 0.15em;
      display: inline-block; padding: 0.2rem 0.5rem;
      border-radius: 4px; margin-bottom: 0.75rem; color: #fff;
    }
    .highlight-pr { background: ${c.badgePr}; }
    .highlight-release { background: ${c.badgeRelease}; }
    .highlight-issue { background: ${c.badgeIssue}; color: #000; }
    .highlight-discussion { background: ${c.badgeDiscussion}; color: #000; }
    .highlight-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.375rem; letter-spacing: -0.01em; }
    .highlight-meta {
      font-family: ${f.monoFamily}; font-size: 0.75rem;
      color: ${c.textTertiary}; margin-bottom: 0.75rem; letter-spacing: 0.02em;
    }
    .highlight-title a { color: ${c.text}; text-decoration: none; transition: color 0.2s; }
    .highlight-title a:hover { color: ${c.accent}; }
    .highlight-body { font-size: 0.9375rem; color: ${c.textSecondary}; line-height: 1.75; }

    /* MINI HEATMAP */
    .mini-heatmap { display: flex; gap: 4px; margin-top: 1.25rem; }
    .mh-day { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .mh-block {
      width: 44px; height: 44px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-family: ${f.monoFamily}; font-size: 0.8125rem; font-weight: 600;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .mh-block:hover { transform: scale(1.15); box-shadow: 0 0 16px ${c.accent}44; }
    .mh-label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.15em; color: ${c.textTertiary}; }
    .mh-level-0 { background: ${c.heatmap0}; color: ${c.textTertiary}; }
    .mh-level-1 { background: ${c.heatmap1}; }
    .mh-level-2 { background: ${c.heatmap2}; }
    .mh-level-3 { background: ${c.heatmap3}; }
    .mh-level-4 { background: ${c.heatmap4}; color: ${c.heatmap4Text}; }

    /* DIFF BAR */
    .diff-bar { display: flex; height: 6px; border-radius: 3px; overflow: hidden; margin-top: 1.25rem; margin-bottom: 0.5rem; }
    .diff-add { background: ${c.green}; height: 100%; }
    .diff-del { background: ${c.red}; height: 100%; }
    .diff-labels { display: flex; justify-content: space-between; font-family: ${f.monoFamily}; font-size: 0.6875rem; }
    .diff-label-add { color: ${c.green}; }
    .diff-label-del { color: ${c.red}; }

    /* REPO BARS */
    .repo-bars { margin-top: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .repo-bar-item { font-size: 0.75rem; }
    .repo-bar-header { display: flex; justify-content: space-between; margin-bottom: 0.25rem; }
    .repo-bar-label { font-family: ${f.monoFamily}; color: ${c.textSecondary}; font-size: 0.6875rem; }
    .repo-bar-track { width: 100%; height: 4px; border-radius: 2px; background: ${c.chipBg}; overflow: hidden; }
    .repo-bar-fill { height: 100%; border-radius: 2px; background: ${c.accent}; transition: width 0.5s ease; }
    .repo-bar-value { font-family: ${f.monoFamily}; color: ${c.textTertiary}; font-size: 0.6875rem; }

    /* SHARE BAR */
    .share-bar { max-width: 960px; margin: 3rem auto 0; padding: 2rem 3rem; display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
    .share-label { font-family: ${f.monoFamily}; font-size: 0.75rem; color: ${c.textTertiary}; text-transform: uppercase; letter-spacing: 0.2em; }
    .share-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 6px;
      border: 1px solid ${c.chipBorder}; background: ${c.chipBg};
      color: ${c.textSecondary}; text-decoration: none;
      font-size: 0.75rem; font-weight: 600; transition: all 0.3s;
    }
    .share-btn:hover { border-color: ${c.accent}; color: ${c.text}; }

    /* WEEK NAV */
    .week-nav { max-width: 960px; margin: 0 auto; padding: 2rem; display: flex; justify-content: space-between; }
    .week-nav-link {
      font-family: ${f.monoFamily}; font-size: 0.6875rem; color: ${c.textTertiary};
      text-decoration: none; padding: 0.375rem 0.75rem; border-radius: 6px;
      border: 1px solid ${c.chipBorder}; transition: all 0.2s;
    }
    .week-nav-link:hover { color: ${c.text}; border-color: ${c.accent}; }

    /* FOOTER */
    .footer {
      max-width: 960px; margin: 0 auto; text-align: center;
      padding: 4rem 3rem; font-size: 0.8125rem;
      color: rgba(255,255,255,0.3);
      border-top: 1px solid ${c.border};
    }
    .footer a { color: rgba(255,255,255,0.5); text-decoration: none; transition: color 0.2s; }
    .footer a:hover { color: ${c.accent}; }

    @view-transition { navigation: auto; }

    @media (max-width: 600px) {
      .nav-inner { padding: 0.75rem 1.5rem; }
      .report-hero { padding: 6rem 1.5rem 3rem; }
      .report-hero .header-title { font-size: clamp(2rem, 10vw, 3rem); max-width: 100%; }
      .page { padding: 0 1.5rem 3rem; }
      .section-summary { max-width: 100%; }
      .section-summary:first-child { max-width: 100%; padding: 2rem; }
      .section-summary .section-heading { margin-left: -0.5rem; font-size: 1.25rem; }
      .section-summary:first-child .section-heading { margin-left: -0.5rem; font-size: 1.5rem; }
      .highlight-grid { grid-template-columns: 1fr; }
      .highlight-grid { grid-template-columns: 1fr; }
    }
  `;
};
