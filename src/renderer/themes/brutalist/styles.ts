// CSS definitions for the brutalist theme: bold typography, grain texture, geometric decorations
// Dark-first with automatic light mode via prefers-color-scheme and manual toggle

import type { Language } from "../../../types.js";
import { getFontConfig } from "../../../i18n/index.js";

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

export const colors = c;

const DARK_VARS = `
    --b-bg: #050505;
    --b-bg-hero: #0a0a0a;
    --b-text: #e0e0e0;
    --b-text-secondary: rgba(255,255,255,0.65);
    --b-text-tertiary: rgba(255,255,255,0.3);
    --b-heading: #ffffff;
    --b-border: rgba(255,255,255,0.08);
    --b-border-subtle: rgba(255,255,255,0.04);
    --b-accent: #39d353;
    --b-card-bg: rgba(255,255,255,0.02);
    --b-chip-bg: rgba(255,255,255,0.04);
    --b-chip-border: rgba(255,255,255,0.08);
    --b-green: #3fb950;
    --b-red: #f85149;
    --b-badge-pr: #8957e5;
    --b-badge-release: #238636;
    --b-badge-issue: #d29922;
    --b-badge-discussion: #58a6ff;
    --b-heatmap-0: rgba(255,255,255,0.03);
    --b-heatmap-1: #0e4429;
    --b-heatmap-2: #006d32;
    --b-heatmap-3: #26a641;
    --b-heatmap-4: #39d353;
    --b-heatmap-4-text: #000;
    --b-nav-bg: rgba(5,5,5,0.8);
    --b-nav-title: rgba(255,255,255,0.4);
    --b-sep: rgba(255,255,255,0.15);
    --b-hero-sub: rgba(255,255,255,0.5);
    --b-footer-text: rgba(255,255,255,0.3);
    --b-footer-link: rgba(255,255,255,0.5);
    --b-grain-opacity: 0.03;
`;

const LIGHT_VARS = `
    --b-bg: #fafafa;
    --b-bg-hero: #f0f0f0;
    --b-text: #1a1a1a;
    --b-text-secondary: rgba(0,0,0,0.6);
    --b-text-tertiary: rgba(0,0,0,0.35);
    --b-heading: #000000;
    --b-border: rgba(0,0,0,0.1);
    --b-border-subtle: rgba(0,0,0,0.05);
    --b-accent: #1a7f37;
    --b-card-bg: rgba(0,0,0,0.02);
    --b-chip-bg: rgba(0,0,0,0.04);
    --b-chip-border: rgba(0,0,0,0.1);
    --b-green: #1a7f37;
    --b-red: #cf222e;
    --b-badge-pr: #8250df;
    --b-badge-release: #1a7f37;
    --b-badge-issue: #9a6700;
    --b-badge-discussion: #0969da;
    --b-heatmap-0: rgba(0,0,0,0.04);
    --b-heatmap-1: #d0e8d0;
    --b-heatmap-2: #a0d0a0;
    --b-heatmap-3: #60b060;
    --b-heatmap-4: #1a7f37;
    --b-heatmap-4-text: #fff;
    --b-nav-bg: rgba(250,250,250,0.85);
    --b-nav-title: rgba(0,0,0,0.45);
    --b-sep: rgba(0,0,0,0.15);
    --b-hero-sub: rgba(0,0,0,0.45);
    --b-footer-text: rgba(0,0,0,0.35);
    --b-footer-link: rgba(0,0,0,0.5);
    --b-grain-opacity: 0.02;
`;

const COLOR_VARS = `
  :root { ${DARK_VARS} }
  @media (prefers-color-scheme: light) { :root { ${LIGHT_VARS} } }
  html[data-theme="dark"] { ${DARK_VARS} }
  html[data-theme="light"] { ${LIGHT_VARS} }
`;

const THEME_TOGGLE_CSS = `
  .theme-toggle-row {
    margin-bottom: 1rem;
  }
  .theme-toggle {
    background: none; border: none;
    color: var(--b-text-tertiary); cursor: pointer;
    font-size: 0.8125rem; line-height: 1;
    padding: 0; opacity: 0.4;
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
      || (matchMedia("(prefers-color-scheme:light)").matches?"light":"dark");
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

  return `
    ${COLOR_VARS}
    ${THEME_TOGGLE_CSS}

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
      opacity: var(--b-grain-opacity);
    }

    .skip-link {
      position: absolute; top: -100%; left: 1rem;
      padding: 0.5rem 1rem; background: var(--b-accent); color: var(--b-bg);
      border-radius: 0 0 6px 6px; z-index: 200; font-size: 0.875rem; text-decoration: none;
    }
    .skip-link:focus { top: 0; }
    :focus-visible { outline: 2px solid var(--b-accent); outline-offset: 2px; }

    body {
      font-family: ${f.bodyFamily};
      background: var(--b-bg);
      color: var(--b-text);
      line-height: ${f.lineHeight};
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      overflow-x: hidden;
    }

    code {
      font-family: ${f.monoFamily};
      font-size: 0.875em;
      padding: 0.15em 0.4em;
      border-radius: 4px;
      background: var(--b-chip-bg);
      border: 1px solid var(--b-chip-border);
    }

    /* ===== NAV (matches index 960px) ===== */
    nav[aria-label="Site navigation"] {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: var(--b-nav-bg);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--b-border);
    }
    .nav-inner {
      max-width: 960px; margin: 0 auto;
      padding: 0.75rem 3rem;
      display: flex; justify-content: space-between; align-items: center;
      min-height: 56px;
    }
    nav a { color: var(--b-text); text-decoration: none; }
    .nav-site-title {
      font-size: 0.75rem; font-weight: 600;
      letter-spacing: 0.2em; text-transform: uppercase;
      color: var(--b-nav-title);
      white-space: nowrap;
    }
    .nav-back {
      font-family: ${f.monoFamily}; font-size: 0.6875rem;
      color: var(--b-text-tertiary);
      padding: 0.375rem 0.75rem; border-radius: 6px;
      border: 1px solid var(--b-chip-border); transition: all 0.2s;
    }
    .nav-back:hover { color: var(--b-text); border-color: var(--b-accent); }

    /* ===== REPORT HERO ===== */
    .report-hero {
      position: relative;
      background: var(--b-bg-hero);
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
      background: radial-gradient(ellipse, var(--b-accent) / 0.06, transparent 70%);
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
      font-size: 0.8125rem; color: var(--b-text-tertiary);
    }
    .report-hero .header-sep { color: var(--b-sep); }
    .report-hero .header-date {
      font-family: ${f.monoFamily}; font-size: 0.6875rem;
      letter-spacing: 0.1em; text-transform: uppercase;
    }
    .report-hero .header-author {
      display: inline-flex; align-items: center; gap: 0.5rem;
      text-decoration: none; color: var(--b-text-secondary);
      font-weight: 500; transition: color 0.3s;
    }
    .report-hero .header-author:hover { color: var(--b-accent); }
    .report-hero .header-author img {
      width: 32px; height: 32px; border-radius: 50%;
      border: 2px solid color-mix(in srgb, var(--b-accent) 25%, transparent);
    }
    .report-hero .header-title {
      font-size: clamp(2.5rem, 6vw, 4rem);
      font-weight: 900;
      line-height: 1.05;
      letter-spacing: -0.05em;
      color: var(--b-heading);
      margin-bottom: 1.25rem;
      max-width: 80%;
    }
    .report-hero .header-sub {
      font-size: 1.25rem;
      color: var(--b-hero-sub);
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
      font-size: 1.0625rem; color: var(--b-text-secondary);
      line-height: 1.9; margin-bottom: 1.25rem;
    }
    .overview p:last-child { margin-bottom: 0; }
    .overview strong { color: var(--b-text); font-weight: 500; }

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
    .section-group-line { flex: 1; height: 1px; background: var(--b-border); }
    .section-group-count {
      font-family: ${f.monoFamily}; font-size: 0.75rem;
      color: var(--b-text-tertiary); letter-spacing: 0.15em;
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
      border-left: 2px solid var(--b-chip-border);
      background: none;
      max-width: 600px;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      animation: card-enter 0.4s ease both;
      position: relative;
    }
    .section-summary:hover {
      border-left-color: var(--b-accent);
    }
    .section-summary:first-child {
      max-width: 700px;
      padding: 2.5rem 0 2.5rem 3rem;
      border-left-width: 3px;
      border-left-color: color-mix(in srgb, var(--b-accent) 25%, transparent);
    }
    .section-summary:nth-child(even):not(:first-child) {
      margin-left: auto;
    }
    .section-summary:nth-child(odd):not(:first-child) {
      margin-right: auto;
    }
    .section-summary:hover {
      transform: translateX(4px);
    }
    .section-summary .section-heading {
      font-size: 2rem; font-weight: 900;
      letter-spacing: -0.04em;
      margin-left: -5rem;
      margin-bottom: 1rem;
      color: var(--b-heading);
    }
    .section-summary:first-child .section-heading {
      margin-left: -6rem;
      font-size: 2.75rem;
    }
    .section-summary .section-type {
      font-family: ${f.monoFamily}; font-size: 0.6875rem;
      text-transform: uppercase; letter-spacing: 0.2em;
      color: var(--b-accent); margin-bottom: 0.75rem;
    }
    .section-summary .section-body {
      font-size: 1rem; color: var(--b-text-secondary); line-height: 1.85;
    }

    /* DATA CHIPS */
    .data-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1.25rem; }
    .chip {
      font-family: ${f.monoFamily}; font-size: 0.75rem;
      padding: 0.3rem 0.65rem; border-radius: 6px;
      background: var(--b-chip-bg); border: 1px solid var(--b-chip-border);
      color: var(--b-text-secondary);
      display: inline-flex; align-items: center; gap: 0.375rem;
      transition: all 0.2s ease;
    }
    .chip:hover { border-color: color-mix(in srgb, var(--b-accent) 40%, transparent); }
    .chip-green { color: var(--b-green); font-weight: 600; }
    .chip-red { color: var(--b-red); font-weight: 600; }
    .chip-default { font-weight: 600; }

    /* HIGHLIGHT GRID */
    .highlight-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }

    /* HIGHLIGHT CARD */
    .highlight-card {
      background: var(--b-card-bg);
      border: 1px solid var(--b-chip-border);
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
      border-color: color-mix(in srgb, var(--b-badge-pr) 30%, transparent);
      transform: translateY(-4px);
      box-shadow: 0 12px 48px color-mix(in srgb, var(--b-badge-pr) 8%, transparent), 0 4px 16px rgba(0,0,0,0.2);
    }
    .highlight-badge {
      font-family: ${f.monoFamily}; font-size: 0.6875rem;
      text-transform: uppercase; letter-spacing: 0.15em;
      display: inline-block; padding: 0.2rem 0.5rem;
      border-radius: 4px; margin-bottom: 0.75rem; color: #fff;
    }
    .highlight-pr { background: var(--b-badge-pr); }
    .highlight-release { background: var(--b-badge-release); }
    .highlight-issue { background: var(--b-badge-issue); color: #000; }
    .highlight-discussion { background: var(--b-badge-discussion); color: #000; }
    .highlight-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.375rem; letter-spacing: -0.01em; }
    .highlight-meta {
      font-family: ${f.monoFamily}; font-size: 0.75rem;
      color: var(--b-text-tertiary); margin-bottom: 0.75rem; letter-spacing: 0.02em;
    }
    .highlight-title a { color: var(--b-text); text-decoration: none; transition: color 0.2s; }
    .highlight-title a:hover { color: var(--b-accent); }
    .highlight-body { font-size: 0.9375rem; color: var(--b-text-secondary); line-height: 1.75; }

    /* MINI HEATMAP */
    .mini-heatmap { display: flex; gap: 4px; margin-top: 1.25rem; }
    .mh-day { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .mh-block {
      width: 44px; height: 44px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-family: ${f.monoFamily}; font-size: 0.8125rem; font-weight: 600;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .mh-block:hover { transform: scale(1.15); }
    .mh-label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--b-text-tertiary); }
    .mh-level-0 { background: var(--b-heatmap-0); color: var(--b-text-tertiary); }
    .mh-level-1 { background: var(--b-heatmap-1); }
    .mh-level-2 { background: var(--b-heatmap-2); }
    .mh-level-3 { background: var(--b-heatmap-3); }
    .mh-level-4 { background: var(--b-heatmap-4); color: var(--b-heatmap-4-text); }

    /* DIFF BAR */
    .diff-bar { display: flex; height: 6px; border-radius: 3px; overflow: hidden; margin-top: 1.25rem; margin-bottom: 0.5rem; }
    .diff-add { background: var(--b-green); height: 100%; }
    .diff-del { background: var(--b-red); height: 100%; }
    .diff-labels { display: flex; justify-content: space-between; font-family: ${f.monoFamily}; font-size: 0.6875rem; }
    .diff-label-add { color: var(--b-green); }
    .diff-label-del { color: var(--b-red); }

    /* REPO BARS */
    .repo-bars { margin-top: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .repo-bar-item { font-size: 0.75rem; }
    .repo-bar-header { display: flex; justify-content: space-between; margin-bottom: 0.25rem; }
    .repo-bar-label { font-family: ${f.monoFamily}; color: var(--b-text-secondary); font-size: 0.6875rem; }
    .repo-bar-track { width: 100%; height: 4px; border-radius: 2px; background: var(--b-chip-bg); overflow: hidden; }
    .repo-bar-fill { height: 100%; border-radius: 2px; background: var(--b-accent); transition: width 0.5s ease; }
    .repo-bar-value { font-family: ${f.monoFamily}; color: var(--b-text-tertiary); font-size: 0.6875rem; }

    /* SHARE BAR */
    .share-bar { max-width: 960px; margin: 3rem auto 0; padding: 2rem 3rem; display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
    .share-label { font-family: ${f.monoFamily}; font-size: 0.75rem; color: var(--b-text-tertiary); text-transform: uppercase; letter-spacing: 0.2em; }
    .share-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 6px;
      border: 1px solid var(--b-chip-border); background: var(--b-chip-bg);
      color: var(--b-text-secondary); text-decoration: none;
      font-size: 0.75rem; font-weight: 600; transition: all 0.3s;
    }
    .share-btn:hover { border-color: var(--b-accent); color: var(--b-text); }

    /* WEEK NAV */
    .week-nav { max-width: 960px; margin: 0 auto; padding: 2rem; display: flex; justify-content: space-between; }
    .week-nav-link {
      font-family: ${f.monoFamily}; font-size: 0.6875rem; color: var(--b-text-tertiary);
      text-decoration: none; padding: 0.375rem 0.75rem; border-radius: 6px;
      border: 1px solid var(--b-chip-border); transition: all 0.2s;
    }
    .week-nav-link:hover { color: var(--b-text); border-color: var(--b-accent); }

    /* FOOTER */
    .footer {
      max-width: 960px; margin: 0 auto; text-align: center;
      padding: 4rem 3rem; font-size: 0.8125rem;
      color: var(--b-footer-text);
      border-top: 1px solid var(--b-border);
    }
    .footer a { color: var(--b-footer-link); text-decoration: none; transition: color 0.2s; }
    .footer a:hover { color: var(--b-accent); }

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
    }
  `;
};

export const buildIndexCSS = (language: Language = "en"): string => {
  const f = getFontConfig(language);

  return `
    body { background: var(--b-bg); color: var(--b-text); overflow-x: hidden; }

    /* GRAIN OVERLAY */
    body::after {
      content: '';
      position: fixed;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 9999;
      opacity: var(--b-grain-opacity);
    }

    /* NAV */
    .index-nav {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      background: var(--b-nav-bg);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--b-border);
    }
    .index-nav-inner {
      max-width: 960px;
      margin: 0 auto;
      padding: 0.75rem 3rem;
      display: flex;
      align-items: center;
      min-height: 56px;
    }
    .nav-site-title {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--b-nav-title);
      white-space: nowrap;
    }

    /* HERO */
    .hero {
      position: relative;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 0 3rem 6rem;
      overflow: hidden;
    }

    /* GEOMETRIC DECORATIONS */
    .geo-circle {
      position: absolute;
      border-radius: 50%;
      border: 1px solid var(--b-border-subtle);
    }
    .geo-circle-1 { width: 600px; height: 600px; top: -200px; right: -100px; }
    .geo-circle-2 { width: 400px; height: 400px; top: 10%; left: -150px; border-color: color-mix(in srgb, var(--b-accent) 8%, transparent); }
    .geo-circle-3 { width: 200px; height: 200px; bottom: 20%; right: 10%; background: color-mix(in srgb, var(--b-accent) 3%, transparent); }
    .geo-line {
      position: absolute;
      background: var(--b-border-subtle);
    }
    .geo-line-1 { width: 1px; height: 100%; top: 0; left: 33.33%; }
    .geo-line-2 { width: 1px; height: 100%; top: 0; left: 66.66%; }
    .geo-dot {
      position: absolute;
      width: 4px; height: 4px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--b-accent) 25%, transparent);
    }
    .geo-dot-1 { top: 30%; left: 33.33%; }
    .geo-dot-2 { top: 60%; left: 66.66%; }
    .geo-dot-3 { top: 45%; right: 15%; }

    .hero-inner {
      max-width: 960px;
      margin: 0 auto;
      width: 100%;
      position: relative;
      z-index: 1;
    }

    /* AVATAR */
    .hero-avatar-wrap {
      position: absolute;
      top: 25vh;
      right: 3rem;
      z-index: 2;
    }
    .hero-avatar {
      width: 180px; height: 180px;
      border-radius: 50%;
      border: 3px solid transparent;
      background-image: linear-gradient(var(--b-bg), var(--b-bg)), linear-gradient(135deg, var(--b-accent), #8957e5, #f78166);
      background-origin: border-box;
      background-clip: padding-box, border-box;
      transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .hero-avatar-wrap:hover .hero-avatar {
      transform: scale(1.08) rotate(3deg);
    }

    /* MASSIVE TITLE */
    .hero-title {
      font-size: clamp(4rem, 12vw, 9rem);
      font-weight: 900;
      letter-spacing: -0.06em;
      line-height: 0.85;
      color: var(--b-heading);
      margin-bottom: 3rem;
      max-width: 70%;
      white-space: pre-line;
    }

    /* PROFILE */
    .hero-profile {
      display: inline-flex;
      align-items: flex-start;
      gap: 4rem;
      text-decoration: none;
      color: inherit;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .hero-profile:hover .hero-display-name {
      color: var(--b-accent);
    }
    .hero-name-block {}
    .hero-display-name {
      font-size: 1.5rem;
      font-weight: 300;
      letter-spacing: 0.05em;
      color: var(--b-text);
      margin-bottom: 0.5rem;
      transition: all 0.4s ease;
    }
    .hero-handle {
      font-family: ${f.monoFamily};
      font-size: 0.6875rem;
      color: var(--b-accent);
      letter-spacing: 0.05em;
      transition: all 0.4s ease;
    }
    .hero-bio {
      font-size: 0.875rem;
      color: var(--b-text-tertiary);
      margin-top: 0.75rem;
      max-width: 300px;
      line-height: 1.6;
    }
    .hero-stats {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .hero-stat {
      font-family: ${f.monoFamily};
      font-size: 0.6875rem;
      color: var(--b-text-tertiary);
    }
    .hero-stat-value {
      display: block;
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--b-text);
      line-height: 1;
      margin-bottom: 0.125rem;
      transition: all 0.4s ease;
    }
    .hero-profile:hover .hero-stat-value {
      color: var(--b-accent);
    }

    /* CONTENT */
    .index-content {
      max-width: 960px;
      margin: 0 auto;
      padding: 0 3rem 6rem;
      position: relative;
    }

    .year-group { margin-bottom: 5rem; }
    .year-label {
      font-family: ${f.monoFamily};
      font-size: 6rem;
      font-weight: 900;
      letter-spacing: -0.05em;
      color: var(--b-border-subtle);
      line-height: 1;
      margin-bottom: 2rem;
      user-select: none;
    }

    /* WEEK ITEMS */
    .week-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .week-item {
      display: grid;
      grid-template-columns: 80px 1fr auto;
      gap: 2rem;
      align-items: baseline;
      padding: 2rem 0;
      text-decoration: none;
      color: inherit;
      border-top: 1px solid var(--b-border);
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    .week-item:last-child { border-bottom: 1px solid var(--b-border); }
    .week-item::before {
      content: '';
      position: absolute;
      left: -3rem; top: 0; bottom: 0;
      width: 2px;
      background: var(--b-accent);
      transform: scaleY(0);
      transform-origin: top;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .week-item:hover { padding-left: 1rem; }
    .week-item:hover::before { transform: scaleY(1); }

    .week-item-week {
      font-family: ${f.monoFamily};
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--b-accent);
      letter-spacing: 0.1em;
    }
    .week-item-content {}
    .week-item-title {
      font-size: 1.25rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      margin-bottom: 0.375rem;
      transition: color 0.3s;
    }
    .week-item:hover .week-item-title { color: var(--b-accent); }
    .week-item-subtitle {
      font-size: 0.875rem;
      color: var(--b-text-tertiary);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .week-item-date {
      font-family: ${f.monoFamily};
      font-size: 0.75rem;
      margin-top: 0.5rem;
      color: var(--b-text-tertiary);
      padding-top: 0.25rem;
    }
    .week-item-stat-value { font-weight: 700; }
    .stat-commits .week-item-stat-value { color: var(--b-green); }
    .stat-prs .week-item-stat-value { color: var(--b-badge-pr); }
    .stat-reviews .week-item-stat-value { color: var(--b-badge-discussion); }

    /* FOOTER */
    .footer {
      max-width: 960px;
      margin: 0 auto;
      text-align: center;
      padding: 4rem 3rem;
      font-size: 0.8125rem;
      color: var(--b-footer-text);
      border-top: 1px solid var(--b-border);
    }
    .footer a { color: var(--b-footer-link); text-decoration: none; transition: color 0.2s; }
    .footer a:hover { color: var(--b-accent); }

    @media (max-width: 768px) {
      .hero { padding: 0 1.5rem 4rem; min-height: auto; padding-top: 8rem; }
      .hero-title { font-size: clamp(3rem, 15vw, 5rem); max-width: 100%; }
      .hero-avatar-wrap { position: relative; top: auto; right: auto; margin-bottom: 2rem; }
      .hero-avatar { width: 100px; height: 100px; }
      .hero-profile { flex-direction: column; gap: 2rem; }
      .hero-stats { flex-direction: row; gap: 2rem; }
      .index-nav-inner { padding: 0.75rem 1.5rem; }
      .index-content { padding: 0 1.5rem 4rem; }
      .week-item { grid-template-columns: 1fr; gap: 0.5rem; }
      .week-item::before { left: -1.5rem; }
      .week-item-stats { margin-top: 0.5rem; }
      .year-label { font-size: 3rem; }
    }
  `;
};
