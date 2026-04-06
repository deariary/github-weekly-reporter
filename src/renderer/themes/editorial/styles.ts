// Editorial theme: continuous horizontal scroll with serif typography and warm palette
// Light-first with dark mode via prefers-color-scheme and manual toggle

import type { Language } from "../../../types.js";
import { getFontConfig } from "../../../i18n/index.js";

const c = {
  bg: "#faf8f5",
  text: "#1a1a1a",
  textSecondary: "#4a4a4a",
  textTertiary: "#8a8a8a",
  border: "#e4ddd5",
  accent: "#c45d3e",
  green: "#3d7a4a",
  red: "#b5382a",
  badgePr: "#6d4c9e",
  badgeRelease: "#3d7a4a",
  badgeIssue: "#8a6b2e",
  badgeDiscussion: "#2e6b9e",
};

export const colors = c;

const LIGHT_VARS = `
    --e-bg: #faf8f5;
    --e-text: #1a1a1a;
    --e-text-secondary: #4a4a4a;
    --e-text-tertiary: #8a8a8a;
    --e-heading: #111111;
    --e-border: #e4ddd5;
    --e-border-subtle: #f0ebe4;
    --e-accent: #c45d3e;
    --e-accent-light: #f5ebe7;
    --e-code-bg: #f0ebe4;
    --e-green: #3d7a4a;
    --e-red: #b5382a;
    --e-badge-pr: #6d4c9e;
    --e-badge-release: #3d7a4a;
    --e-badge-issue: #8a6b2e;
    --e-badge-discussion: #2e6b9e;
    --e-heatmap-0: #f0ebe4;
    --e-heatmap-1: #d4e4d4;
    --e-heatmap-2: #a8cda8;
    --e-heatmap-3: #6daa6d;
    --e-heatmap-4: #3d7a4a;
    --e-heatmap-4-text: #fff;
    --e-drop-cap: #c45d3e;
`;

const DARK_VARS = `
    --e-bg: #1a1816;
    --e-text: #d8d0c8;
    --e-text-secondary: #a8a098;
    --e-text-tertiary: #706860;
    --e-heading: #f0e8e0;
    --e-border: #302a24;
    --e-border-subtle: #252018;
    --e-accent: #e07858;
    --e-accent-light: #2a2018;
    --e-code-bg: #252018;
    --e-green: #5daa6d;
    --e-red: #e06050;
    --e-badge-pr: #9d7cd0;
    --e-badge-release: #5daa6d;
    --e-badge-issue: #d0a848;
    --e-badge-discussion: #5898d0;
    --e-heatmap-0: #252018;
    --e-heatmap-1: #1a3020;
    --e-heatmap-2: #205028;
    --e-heatmap-3: #307038;
    --e-heatmap-4: #5daa6d;
    --e-heatmap-4-text: #000;
    --e-drop-cap: #e07858;
`;

const COLOR_VARS = `
  :root { ${LIGHT_VARS} }
  @media (prefers-color-scheme: dark) { :root { ${DARK_VARS} } }
  html[data-theme="light"] { ${LIGHT_VARS} }
  html[data-theme="dark"] { ${DARK_VARS} }
`;

const THEME_TOGGLE_CSS = `
  .theme-toggle {
    background: none; border: none;
    color: var(--e-text-tertiary); cursor: pointer;
    font-family: inherit; font-size: 0.75rem; line-height: 1;
    padding: 0; opacity: 0.6;
    transition: opacity 0.2s;
  }
  .theme-toggle:hover { opacity: 1; }
`;

export const THEME_INIT_SCRIPT = `<script>
(function(){
  var s=localStorage.getItem("theme");
  if(s)document.documentElement.setAttribute("data-theme",s);
})();
</script>`;

export const THEME_TOGGLE_SCRIPT = `<script>
(function(){
  var btn=document.querySelector(".theme-toggle");
  if(!btn)return;
  function current(){
    return document.documentElement.getAttribute("data-theme")
      || (matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");
  }
  function update(){btn.textContent=current()==="dark"?"\\u2600\\uFE0E Light":"\\u263D\\uFE0E Dark";}
  update();
  btn.addEventListener("click",function(){
    var next=current()==="dark"?"light":"dark";
    document.documentElement.setAttribute("data-theme",next);
    localStorage.setItem("theme",next);
    update();
  });
})();
</script>`;

export const buildCSS = (language: Language = "en"): string => {
  const f = getFontConfig(language);
  const heading = `'Playfair Display', ${f.serifFamily}`;
  const body = `'Newsreader', ${f.serifFamily}`;
  const mono = f.monoFamily;

  return `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,700;1,6..72,400&display=swap');
    @import url('${f.importUrl}');

    ${COLOR_VARS}
    ${THEME_TOGGLE_CSS}

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html {
      overflow: hidden;
      height: 100%;
      font-size: 17px;
    }
    body {
      height: 100%;
      overflow: hidden;
      font-family: ${body};
      background: var(--e-bg);
      color: var(--e-text);
      line-height: ${f.lineHeight};
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    a {
      color: var(--e-accent);
      text-decoration: underline;
      text-decoration-color: var(--e-border);
      text-underline-offset: 0.15em;
      transition: text-decoration-color 0.2s, color 0.2s;
    }
    a:hover {
      text-decoration-color: var(--e-accent);
    }
    code {
      font-family: ${mono};
      font-size: 0.85em;
      padding: 0.15em 0.35em;
      border-radius: 3px;
      background: var(--e-code-bg);
    }

    /* ==================== SCROLL STRIP ==================== */
    .scroll-strip {
      display: flex;
      align-items: center;
      height: calc(100vh - 2.5rem);
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: var(--e-border) transparent;
    }
    .scroll-strip::-webkit-scrollbar { height: 4px; }
    .scroll-strip::-webkit-scrollbar-track { background: transparent; }
    .scroll-strip::-webkit-scrollbar-thumb {
      background: var(--e-border);
      border-radius: 2px;
    }
    .scroll-strip::-webkit-scrollbar-thumb:hover {
      background: var(--e-accent);
    }

    /* ==================== PANELS ==================== */
    .panel {
      flex: 0 0 auto;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 3rem;
      border-right: 1px solid var(--e-border-subtle);
    }

    /* COVER */
    .panel-cover {
      width: 50vw;
      min-width: 400px;
      max-width: 640px;
    }
    .cover-inner { max-width: 520px; }
    .header-meta {
      font-size: 0.8125rem; color: var(--e-text-tertiary);
      margin-bottom: 1.25rem;
      text-transform: uppercase; letter-spacing: 0.1em;
      display: flex; align-items: center; gap: 0.4rem;
    }
    .header-meta a {
      color: var(--e-text-tertiary); text-decoration: none;
      display: inline-flex; align-items: center; gap: 0.4rem;
    }
    .header-meta a:hover { color: var(--e-accent); text-decoration: none; }
    .header-meta img {
      width: 22px; height: 22px; border-radius: 50%;
      position: relative; top: -1px;
    }
    h1 {
      font-family: ${heading};
      font-size: clamp(2rem, 4vw, 3rem);
      font-weight: 700;
      line-height: 1.1; letter-spacing: -0.02em;
      color: var(--e-heading);
      margin-bottom: 0.75rem;
    }
    .cover-sub {
      font-size: 1.0625rem; color: var(--e-text-secondary);
    }

    /* TEXT (overview) */
    .panel-text {
      width: 38vw;
      min-width: 340px;
      max-width: 520px;
    }
    .text-inner {
      max-width: 440px;
    }
    .text-inner p {
      font-size: 0.9375rem;
      color: var(--e-text-secondary);
      margin-bottom: 1rem;
    }
    .text-inner p:last-child { margin-bottom: 0; }
    .text-inner p:first-child::first-letter {
      font-family: ${heading};
      float: left;
      font-size: 3rem;
      line-height: 0.8;
      font-weight: 600;
      color: var(--e-drop-cap);
      padding-right: 0.4rem;
      padding-top: 0.12rem;
    }

    /* COLUMN STACK: cards fill top-to-bottom then wrap into next column */
    .column-stack {
      flex: 0 0 auto;
      max-height: min(1080px, calc(100vh - 2.5rem));
      padding: 2rem 2.5rem;
      display: flex;
      flex-direction: column;
      flex-wrap: wrap;
      align-content: start;
      gap: 0 2.5rem;
    }
    .stack-card {
      break-inside: avoid;
      width: 280px;
      padding: 1rem 0 1.25rem;
      border-bottom: 1px solid var(--e-border-subtle);
    }
    .stack-card h3 {
      font-family: ${heading};
      font-size: 1.0625rem; font-weight: 500;
      letter-spacing: -0.01em;
      margin-bottom: 0.4rem;
      color: var(--e-heading);
    }
    .stack-card h3 a { color: var(--e-heading); text-decoration: none; }
    .stack-card h3 a:hover { color: var(--e-accent); }
    .stack-card p {
      font-size: 0.8125rem;
      color: var(--e-text-secondary);
    }


    /* CARD LABEL */
    .card-label {
      font-size: 0.625rem; color: var(--e-accent);
      text-transform: uppercase; letter-spacing: 0.15em;
      font-weight: 500; margin-bottom: 0.35rem;
    }

    /* SHARE + CREDITS CARDS */
    .stack-share, .stack-credits { border-bottom: none; }
    .stack-credits {
      font-size: 0.75rem;
      color: var(--e-text-tertiary);
    }
    .stack-credits p { margin-bottom: 0.25rem; }
    .stack-credits p:last-child { margin-bottom: 0; }
    .stack-credits a { color: var(--e-accent); }
    .share-links {
      display: flex; gap: 0.75rem; margin-top: 0.5rem;
    }
    .share-links a {
      color: var(--e-accent);
      font-size: 0.8125rem; font-weight: 500;
    }

    /* ==================== BADGES ==================== */
    .highlight-badge {
      font-size: 0.5625rem; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.1em;
      display: inline-flex; align-items: center;
      padding: 0.15rem 0.35rem; line-height: 1;
      border-radius: 2px; margin-bottom: 0.4rem; color: #fff;
    }
    .highlight-pr { background: var(--e-badge-pr); }
    .highlight-release { background: var(--e-badge-release); }
    .highlight-issue { background: var(--e-badge-issue); color: #000; }
    .highlight-discussion { background: var(--e-badge-discussion); }
    .highlight-meta {
      font-family: ${mono}; font-size: 0.625rem;
      color: var(--e-text-tertiary); margin-bottom: 0.4rem;
    }

    /* ==================== CHIPS ==================== */
    .data-chips {
      font-family: ${mono}; font-size: 0.625rem;
      color: var(--e-text-tertiary);
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--e-border-subtle);
      display: flex; flex-wrap: wrap; gap: 0.2rem 0.75rem;
    }
    .chip { padding: 0; border-radius: 0; background: none; color: var(--e-text-tertiary); }
    .chip-green { color: var(--e-green); font-weight: 600; }
    .chip-red { color: var(--e-red); font-weight: 600; }

    /* ==================== DATA VIZ ==================== */
    .diff-bar { display: flex; height: 4px; border-radius: 2px; overflow: hidden; margin-top: 0.75rem; margin-bottom: 0.3rem; background: var(--e-border-subtle); }
    .diff-add { background: var(--e-green); height: 100%; }
    .diff-del { background: var(--e-red); height: 100%; }
    .diff-labels { display: flex; justify-content: space-between; font-family: ${mono}; font-size: 0.6875rem; }
    .diff-label-add { color: var(--e-green); }
    .diff-label-del { color: var(--e-red); }

    .mini-heatmap { display: flex; gap: 3px; margin-top: 0.75rem; }
    .mh-day { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .mh-block {
      width: 32px; height: 32px; border-radius: 3px;
      display: flex; align-items: center; justify-content: center;
      font-family: ${mono}; font-size: 0.6875rem; font-weight: 500;
    }
    .mh-label { font-size: 0.5625rem; color: var(--e-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; }
    .mh-level-0 { background: var(--e-heatmap-0); color: var(--e-text-tertiary); }
    .mh-level-1 { background: var(--e-heatmap-1); }
    .mh-level-2 { background: var(--e-heatmap-2); }
    .mh-level-3 { background: var(--e-heatmap-3); color: #fff; }
    .mh-level-4 { background: var(--e-heatmap-4); color: var(--e-heatmap-4-text); }

    .repo-bars { display: flex; flex-direction: column; gap: 0.4rem; }
    .repo-bar-header { display: flex; justify-content: space-between; font-size: 0.6875rem; }
    .repo-bar-label { font-family: ${mono}; color: var(--e-text-secondary); }
    .repo-bar-value { font-family: ${mono}; color: var(--e-text-tertiary); }
    .repo-bar-track { width: 100%; height: 3px; border-radius: 2px; background: var(--e-border-subtle); overflow: hidden; }
    .repo-bar-fill { height: 100%; border-radius: 2px; background: var(--e-accent); }

    /* ==================== FIXED FOOTER ==================== */
    .fixed-footer {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      height: 2.5rem;
      line-height: 2.5rem;
      background: var(--e-bg);
      border-top: 1px solid var(--e-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2rem;
      font-size: 0.75rem;
      color: var(--e-text-tertiary);
      z-index: 100;
    }
    .fixed-footer a, .fixed-footer button, .fixed-footer span, .fixed-footer nav {
      line-height: 2.5rem;
      vertical-align: middle;
    }
    .fixed-footer a { color: var(--e-text-secondary); text-decoration: none; text-decoration-color: transparent; }
    .fixed-footer a:hover { color: var(--e-accent); text-decoration: underline; text-decoration-color: var(--e-accent); }
    .footer-breadcrumb {
      display: flex; align-items: center; gap: 0.4rem;
    }
    .footer-current {
      color: var(--e-text-tertiary);
    }
    .footer-right {
      display: flex; align-items: center; gap: 0.5rem;
    }
    .footer-sep { color: var(--e-border); }

    /* ==================== MOBILE: switch to normal vertical scroll ==================== */
    @media (max-width: 768px) {
      html { overflow: auto; }
      body { height: auto; overflow: auto; }
      .scroll-strip {
        display: block;
        height: auto;
        overflow-x: visible;
        overflow-y: visible;
      }
      .panel {
        height: auto;
        width: auto;
        padding: 2rem 1.5rem;
        border-right: none;
        border-bottom: 1px solid var(--e-border-subtle);
      }
      .panel-cover { width: auto; min-width: 0; max-width: none; }
      .panel-text { width: auto; min-width: 0; max-width: none; }
      .text-inner { max-width: none; }
      .column-stack {
        height: auto;
        flex-wrap: nowrap;
        padding: 1.5rem;
        gap: 0;
      }
      .stack-card { width: auto; }
      .fixed-footer {
        height: auto;
        line-height: 1.4;
        flex-direction: column;
        padding: 0.5rem 1rem;
        gap: 0.15rem;
        font-size: 0.625rem;
      }
      .fixed-footer a, .fixed-footer button, .fixed-footer span, .fixed-footer nav {
        line-height: 1.4;
      }
      .footer-right { flex-wrap: wrap; justify-content: center; }
      .scroll-strip { height: calc(100vh - 4rem); }
    }

    @media print {
      html, body { height: auto; overflow: visible; }
      .scroll-strip {
        display: block; height: auto;
        overflow: visible;
      }
      .panel {
        flex: none; width: auto; height: auto;
        border-right: none;
        page-break-inside: avoid;
      }
      .panel-lead { flex-direction: column; }
      .column-stack { height: auto; flex-wrap: wrap; }
      .stack-card { width: 45%; }
      .fixed-footer { display: none; }
    }
  `;
};

export const buildIndexCSS = (language: Language = "en"): string => {
  const f = getFontConfig(language);
  const heading = `'Playfair Display', ${f.serifFamily}`;
  const body = `'Newsreader', ${f.serifFamily}`;
  const mono = f.monoFamily;

  return `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,700;1,6..72,400&display=swap');
    @import url('${f.importUrl}');

    ${COLOR_VARS}
    ${THEME_TOGGLE_CSS}

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      max-width: 680px; margin: 0 auto; padding: 0 2rem;
      font-family: ${body};
      background: var(--e-bg);
      color: var(--e-text);
      line-height: ${f.lineHeight};
    }

    .index-header {
      padding: 3rem 0 2rem;
      border-bottom: 2px solid var(--e-heading);
      margin-bottom: 2.5rem;
    }
    .index-header h1 {
      font-family: ${heading};
      font-size: clamp(2.5rem, 8vw, 4rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.15;
      color: var(--e-heading);
      margin-bottom: 1.5rem;
    }
    .index-profile {
      display: flex; align-items: center; gap: 0.75rem;
      text-decoration: none; color: inherit;
    }
    .index-profile:hover { color: var(--e-accent); }
    .index-profile img { width: 48px; height: 48px; border-radius: 50%; }
    .index-profile-name {
      font-family: ${heading};
      font-size: 1.125rem; font-weight: 500;
    }
    .index-profile-handle { font-size: 0.8125rem; color: var(--e-text-tertiary); }
    .index-stats { font-size: 0.8125rem; color: var(--e-text-tertiary); margin-top: 0.5rem; }

    .year-group { margin-bottom: 3rem; }
    .year-label {
      font-family: ${heading};
      font-size: 1.25rem; font-weight: 500; font-style: italic;
      color: var(--e-text-tertiary);
      margin-bottom: 1rem;
    }

    .week-list { list-style: none; }
    .week-item {
      display: block; padding: 1.25rem 0;
      border-bottom: 1px solid var(--e-border);
      text-decoration: none; color: inherit;
    }
    .week-item:first-child { border-top: 1px solid var(--e-border); }
    .week-item:hover .week-item-title { color: var(--e-accent); }
    .week-item-header { display: flex; justify-content: space-between; align-items: baseline; }
    .week-item-title {
      font-family: ${heading};
      font-size: 1.125rem; font-weight: 500;
      transition: color 0.2s;
    }
    .week-item-week {
      font-family: ${mono}; font-size: 0.6875rem;
      color: var(--e-text-tertiary);
      letter-spacing: 0.05em;
    }
    .week-item-subtitle {
      font-size: 0.875rem; color: var(--e-text-secondary);
      margin-top: 0.25rem;
    }

    .footer {
      text-align: center; padding: 3rem 0;
      font-size: 0.8125rem; color: var(--e-text-tertiary);
      border-top: 1px solid var(--e-border);
    }
    .footer a { color: var(--e-text-secondary); text-decoration: none; }
    .footer a:hover { color: var(--e-accent); }

    @media (max-width: 600px) {
      body { padding: 0 1.25rem; }
      .index-header { padding: 2rem 0 1.5rem; }
    }

    @media print {
      body { background: #fff; }
    }
  `;
};
