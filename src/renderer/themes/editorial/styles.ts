// Editorial theme: high-end magazine, serif headlines, warm palette, generous whitespace
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
  .theme-toggle-row {
    margin-bottom: 0.75rem;
  }
  .theme-toggle {
    background: none; border: none;
    color: var(--e-text-tertiary); cursor: pointer;
    font-family: inherit; font-size: 0.8125rem; line-height: 1;
    padding: 0; opacity: 0.5;
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
    ${COLOR_VARS}
    ${THEME_TOGGLE_CSS}

    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,700;1,6..72,400&display=swap');
    @import url('${f.importUrl}');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: ${body};
      background: var(--e-bg);
      color: var(--e-text);
      line-height: 1.8;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    code {
      font-family: ${mono};
      font-size: 0.85em;
      padding: 0.15em 0.35em;
      border-radius: 3px;
      background: var(--e-code-bg);
    }

    /* NAV */
    nav {
      max-width: 680px; margin: 0 auto;
      padding: 1.5rem 2rem;
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid var(--e-border);
    }
    nav a { color: var(--e-text-secondary); text-decoration: none; font-size: 0.875rem; }
    nav a:hover { color: var(--e-accent); }
    .nav-site-title {
      font-family: ${heading}; font-size: 1rem; font-weight: 600;
      font-style: italic; color: var(--e-text-tertiary);
      letter-spacing: 0.02em;
    }

    /* HEADER */
    .header {
      max-width: 680px; margin: 0 auto;
      padding: 3rem 2rem 2rem;
    }
    .header-meta {
      font-size: 0.8125rem; color: var(--e-text-tertiary);
      margin-bottom: 1.5rem;
      text-transform: uppercase; letter-spacing: 0.1em;
    }
    .header-meta a { color: var(--e-text-tertiary); text-decoration: none; }
    .header-meta a:hover { color: var(--e-accent); }
    .header-meta img {
      width: 24px; height: 24px; border-radius: 50%;
      vertical-align: middle; margin-right: 0.375rem;
    }
    h1 {
      font-family: ${heading};
      font-size: clamp(2rem, 5vw, 3rem);
      font-weight: 700;
      line-height: 1.15; letter-spacing: -0.02em;
      color: var(--e-heading);
      margin-bottom: 0.75rem;
    }
    .header-sub {
      font-size: 1.125rem; color: var(--e-text-secondary);
      font-weight: 400; line-height: 1.6;
    }
    .header-rule {
      border: none; border-top: 1px solid var(--e-border);
      margin: 2rem 0 0;
    }

    /* OVERVIEW */
    .overview {
      max-width: 600px; margin: 2.5rem auto 3rem;
      padding: 0 2rem;
    }
    .overview p {
      font-size: 1.0625rem; color: var(--e-text-secondary);
      line-height: 1.9; margin-bottom: 1.25rem;
    }
    .overview p:last-child { margin-bottom: 0; }
    .overview p:first-child::first-letter {
      font-family: ${heading};
      float: left;
      font-size: 3.5rem;
      line-height: 0.8;
      font-weight: 600;
      color: var(--e-drop-cap);
      padding-right: 0.5rem;
      padding-top: 0.15rem;
    }

    /* SECTIONS */
    .section-group {
      max-width: 680px; margin: 0 auto 3.5rem;
      padding: 0 2rem;
    }
    .section-group-header {
      margin-bottom: 2rem;
      border-bottom: 2px solid var(--e-heading);
      padding-bottom: 0.5rem;
    }
    .section-group-title {
      font-family: ${heading};
      font-size: 2rem; font-weight: 500;
      letter-spacing: -0.02em;
    }
    .section-group-count {
      font-size: 0.75rem; color: var(--e-text-tertiary);
      letter-spacing: 0.1em; text-transform: uppercase;
      float: right; margin-top: 0.75rem;
    }

    /* SUMMARY */
    .section-summary {
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--e-border);
    }
    .section-summary:last-child { border-bottom: none; padding-bottom: 0; }
    .section-type {
      font-size: 0.6875rem; color: var(--e-accent);
      text-transform: uppercase; letter-spacing: 0.15em;
      font-weight: 500; margin-bottom: 0.375rem;
    }
    .section-heading {
      font-family: ${heading};
      font-size: 1.5rem; font-weight: 500;
      letter-spacing: -0.01em;
      margin-bottom: 0.5rem;
      color: var(--e-heading);
    }
    .section-body {
      color: var(--e-text-secondary);
      line-height: 1.85;
    }

    /* CHIPS */
    .data-chips {
      display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem;
    }
    .chip {
      font-family: ${mono}; font-size: 0.75rem;
      padding: 0.25rem 0.5rem; border-radius: 3px;
      background: var(--e-accent-light);
      color: var(--e-text-secondary);
    }
    .chip-green { color: var(--e-green); font-weight: 600; }
    .chip-red { color: var(--e-red); font-weight: 600; }

    /* DIFF BAR */
    .diff-bar { display: flex; height: 4px; border-radius: 2px; overflow: hidden; margin-top: 1rem; margin-bottom: 0.375rem; background: var(--e-border-subtle); }
    .diff-add { background: var(--e-green); height: 100%; }
    .diff-del { background: var(--e-red); height: 100%; }
    .diff-labels { display: flex; justify-content: space-between; font-family: ${mono}; font-size: 0.75rem; }
    .diff-label-add { color: var(--e-green); }
    .diff-label-del { color: var(--e-red); }

    /* HEATMAP */
    .mini-heatmap { display: flex; gap: 4px; margin-top: 1rem; }
    .mh-day { display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .mh-block {
      width: 36px; height: 36px; border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      font-family: ${mono}; font-size: 0.75rem; font-weight: 500;
    }
    .mh-label { font-size: 0.625rem; color: var(--e-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; }
    .mh-level-0 { background: var(--e-heatmap-0); color: var(--e-text-tertiary); }
    .mh-level-1 { background: var(--e-heatmap-1); }
    .mh-level-2 { background: var(--e-heatmap-2); }
    .mh-level-3 { background: var(--e-heatmap-3); color: #fff; }
    .mh-level-4 { background: var(--e-heatmap-4); color: var(--e-heatmap-4-text); }

    /* REPO BARS */
    .repo-bars { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .repo-bar-header { display: flex; justify-content: space-between; font-size: 0.75rem; }
    .repo-bar-label { font-family: ${mono}; color: var(--e-text-secondary); }
    .repo-bar-value { font-family: ${mono}; color: var(--e-text-tertiary); }
    .repo-bar-track { width: 100%; height: 3px; border-radius: 2px; background: var(--e-border-subtle); overflow: hidden; }
    .repo-bar-fill { height: 100%; border-radius: 2px; background: var(--e-accent); }

    /* HIGHLIGHTS */
    .highlight-section {
      max-width: 680px; margin: 0 auto 3rem;
      padding: 0 2rem;
    }
    .highlight-header {
      margin-bottom: 1.5rem;
      border-bottom: 2px solid var(--e-heading);
      padding-bottom: 0.5rem;
      display: flex; justify-content: space-between; align-items: baseline;
    }
    .highlight-header-title {
      font-family: ${heading};
      font-size: 2rem; font-weight: 500;
      letter-spacing: -0.02em;
    }
    .highlight-header-count {
      font-size: 0.75rem; color: var(--e-text-tertiary);
      letter-spacing: 0.1em; text-transform: uppercase;
    }
    .highlight-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .highlight-card {
      padding: 1.5rem 0;
      border-bottom: 1px solid var(--e-border);
    }
    .highlight-card:nth-last-child(-n+2) { border-bottom: none; }
    .highlight-badge {
      font-size: 0.625rem; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.1em;
      display: inline-block; padding: 0.15rem 0.4rem;
      border-radius: 2px; margin-bottom: 0.5rem; color: #fff;
    }
    .highlight-pr { background: var(--e-badge-pr); }
    .highlight-release { background: var(--e-badge-release); }
    .highlight-issue { background: var(--e-badge-issue); color: #000; }
    .highlight-discussion { background: var(--e-badge-discussion); }
    .highlight-title {
      font-family: ${heading};
      font-size: 1.125rem; font-weight: 500;
      margin-bottom: 0.25rem;
    }
    .highlight-title a { color: var(--e-heading); text-decoration: none; }
    .highlight-title a:hover { color: var(--e-accent); }
    .highlight-meta {
      font-family: ${mono}; font-size: 0.6875rem;
      color: var(--e-text-tertiary); margin-bottom: 0.5rem;
    }
    .highlight-body { font-size: 0.9375rem; color: var(--e-text-secondary); line-height: 1.7; }

    /* SHARE */
    .share-bar {
      max-width: 680px; margin: 2rem auto 0; padding: 1.5rem 2rem;
      border-top: 1px solid var(--e-border);
      display: flex; gap: 1rem; align-items: center; justify-content: center;
    }
    .share-label { font-size: 0.75rem; color: var(--e-text-tertiary); text-transform: uppercase; letter-spacing: 0.1em; }
    .share-btn {
      color: var(--e-text-secondary); text-decoration: none;
      font-size: 0.8125rem; font-weight: 500;
      transition: color 0.2s;
    }
    .share-btn:hover { color: var(--e-accent); }

    /* WEEK NAV */
    .week-nav {
      max-width: 680px; margin: 0 auto; padding: 1.5rem 2rem;
      display: flex; justify-content: space-between;
      border-top: 1px solid var(--e-border);
      font-size: 0.875rem;
    }
    .week-nav a { color: var(--e-text-secondary); text-decoration: none; }
    .week-nav a:hover { color: var(--e-accent); }

    /* FOOTER */
    .footer {
      max-width: 680px; margin: 0 auto; text-align: center;
      padding: 3rem 2rem; font-size: 0.8125rem;
      color: var(--e-text-tertiary);
      border-top: 1px solid var(--e-border);
    }
    .footer a { color: var(--e-text-secondary); text-decoration: none; }
    .footer a:hover { color: var(--e-accent); }

    @media (max-width: 600px) {
      .header { padding: 2rem 1.25rem 1.5rem; }
      .overview { padding: 0 1.25rem; }
      .section-group { padding: 0 1.25rem; }
      .highlight-section { padding: 0 1.25rem; }
      .highlight-grid { grid-template-columns: 1fr; }
      nav { padding: 1rem 1.25rem; }
    }

    @media print {
      body { background: #fff; }
      nav, .share-bar, .week-nav, .theme-toggle-row { display: none; }
    }
  `;
};

export const buildIndexCSS = (language: Language = "en"): string => {
  const f = getFontConfig(language);
  const heading = `'Playfair Display', ${f.serifFamily}`;
  const body = `'Newsreader', ${f.serifFamily}`;
  const mono = f.monoFamily;

  return `
    body { max-width: 680px; margin: 0 auto; padding: 0 2rem; font-family: ${body}; }

    /* HEADER */
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
      line-height: 0.95;
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

    /* YEAR */
    .year-group { margin-bottom: 3rem; }
    .year-label {
      font-family: ${heading};
      font-size: 1.25rem; font-weight: 500; font-style: italic;
      color: var(--e-text-tertiary);
      margin-bottom: 1rem;
    }

    /* WEEK LIST */
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
      margin-top: 0.25rem; line-height: 1.5;
    }

    /* FOOTER */
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
