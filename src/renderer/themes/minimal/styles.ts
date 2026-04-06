// Minimal theme: radical reduction, system fonts, zero external resources
// Light-first with automatic dark mode via prefers-color-scheme

import type { Language } from "../../../types.js";

const c = {
  bg: "#ffffff",
  text: "#111111",
  textSecondary: "#555555",
  textTertiary: "#999999",
  border: "#e0e0e0",
  accent: "#0066cc",
  green: "#1a7f37",
  red: "#cf222e",
  badgePr: "#8250df",
  badgeRelease: "#1a7f37",
  badgeIssue: "#9a6700",
  badgeDiscussion: "#0969da",
};

export const colors = c;

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO = '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace';

const LIGHT_VARS = `
    --bg: #ffffff;
    --text: #111111;
    --text-secondary: #555555;
    --text-tertiary: #999999;
    --border: #e0e0e0;
    --border-subtle: #f0f0f0;
    --accent: #0066cc;
    --code-bg: #f6f6f6;
    --green: #1a7f37;
    --red: #cf222e;
    --badge-pr: #8250df;
    --badge-release: #1a7f37;
    --badge-issue: #9a6700;
    --badge-discussion: #0969da;
    --heatmap-0: #f0f0f0;
    --heatmap-1: #d0e8d0;
    --heatmap-2: #a0d0a0;
    --heatmap-3: #60b060;
    --heatmap-4: #1a7f37;
    --heatmap-text: #fff;
`;

const DARK_VARS = `
    --bg: #111111;
    --text: #e0e0e0;
    --text-secondary: #aaaaaa;
    --text-tertiary: #777777;
    --border: #333333;
    --border-subtle: #222222;
    --accent: #4d9eef;
    --code-bg: #1a1a1a;
    --green: #3fb950;
    --red: #f85149;
    --badge-pr: #a371f7;
    --badge-release: #3fb950;
    --badge-issue: #d29922;
    --badge-discussion: #58a6ff;
    --heatmap-0: #1a1a1a;
    --heatmap-1: #0e4429;
    --heatmap-2: #006d32;
    --heatmap-3: #26a641;
    --heatmap-4: #39d353;
    --heatmap-text: #000;
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
    color: var(--text-tertiary); cursor: pointer;
    font-size: 1rem; line-height: 1;
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

export const buildCSS = (_language: Language = "en"): string => `
  ${COLOR_VARS}
  ${THEME_TOGGLE_CSS}
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: ${FONT};
    background: var(--bg);
    color: var(--text);
    line-height: 1.8;
    max-width: 640px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  a { color: var(--accent); }
  a:hover { text-decoration: none; }

  code {
    font-family: ${MONO};
    font-size: 0.875em;
    padding: 0.1em 0.3em;
    background: var(--code-bg);
    border-radius: 3px;
  }

  /* NAV */
  nav { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  nav a { text-decoration: none; font-size: 0.875rem; }
  .nav-site-title { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); }

  /* HEADER */
  .header { margin-bottom: 2rem; }
  .header-meta { font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem; }
  .header-meta a { color: var(--text-secondary); text-decoration: none; }
  .header-meta a:hover { color: var(--accent); }
  .header-meta img { width: 20px; height: 20px; border-radius: 50%; vertical-align: middle; margin-right: 0.25rem; }
  h1 { font-size: 1.5rem; font-weight: 700; line-height: 1.3; margin-bottom: 0.25rem; }
  .header-sub { color: var(--text-secondary); font-size: 1rem; }

  /* OVERVIEW */
  .overview { margin-bottom: 2rem; }
  .overview p { margin-bottom: 1rem; color: var(--text-secondary); }
  .overview p:last-child { margin-bottom: 0; }

  /* SECTIONS */
  .section-group { margin-bottom: 2.5rem; }
  h2 { font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
  .section-group-count { font-size: 0.75rem; color: var(--text-tertiary); }

  /* SUMMARY */
  .section-summary { margin-bottom: 1.5rem; }
  .section-type { font-size: 0.75rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
  .section-heading { font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; }
  .section-body { color: var(--text-secondary); }

  /* CHIPS */
  .data-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
  .chip { font-family: ${MONO}; font-size: 0.75rem; color: var(--text-secondary); }
  .chip-label::after { content: ": "; }
  .chip-green { color: var(--green); }
  .chip-red { color: var(--red); }

  /* DIFF BAR */
  .diff-bar { display: flex; height: 4px; border-radius: 2px; overflow: hidden; margin-top: 0.75rem; margin-bottom: 0.25rem; background: var(--border-subtle); }
  .diff-add { background: var(--green); height: 100%; }
  .diff-del { background: var(--red); height: 100%; }
  .diff-labels { display: flex; justify-content: space-between; font-family: ${MONO}; font-size: 0.75rem; }
  .diff-label-add { color: var(--green); }
  .diff-label-del { color: var(--red); }

  /* HEATMAP */
  .mini-heatmap { display: flex; gap: 4px; margin-top: 0.75rem; }
  .mh-day { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .mh-block { width: 32px; height: 32px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-family: ${MONO}; font-size: 0.75rem; }
  .mh-label { font-size: 0.625rem; color: var(--text-tertiary); }
  .mh-level-0 { background: var(--heatmap-0); color: var(--text-tertiary); }
  .mh-level-1 { background: var(--heatmap-1); }
  .mh-level-2 { background: var(--heatmap-2); }
  .mh-level-3 { background: var(--heatmap-3); color: var(--heatmap-text); }
  .mh-level-4 { background: var(--heatmap-4); color: var(--heatmap-text); }

  /* REPO BARS */
  .repo-bars { margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .repo-bar-header { display: flex; justify-content: space-between; font-size: 0.75rem; }
  .repo-bar-label { font-family: ${MONO}; color: var(--text-secondary); }
  .repo-bar-value { font-family: ${MONO}; color: var(--text-tertiary); }
  .repo-bar-track { width: 100%; height: 3px; border-radius: 2px; background: var(--border-subtle); overflow: hidden; }
  .repo-bar-fill { height: 100%; border-radius: 2px; background: var(--accent); }

  /* HIGHLIGHTS */
  .highlight-list { list-style: none; }
  .highlight-item { margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-subtle); }
  .highlight-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .highlight-badge { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-right: 0.5rem; }
  .highlight-pr { color: var(--badge-pr); }
  .highlight-release { color: var(--badge-release); }
  .highlight-issue { color: var(--badge-issue); }
  .highlight-discussion { color: var(--badge-discussion); }
  .highlight-title { font-weight: 600; }
  .highlight-title a { color: var(--text); }
  .highlight-meta { font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.125rem; }
  .highlight-body { color: var(--text-secondary); margin-top: 0.25rem; }

  /* SHARE */
  .share-bar { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); font-size: 0.875rem; display: flex; gap: 1rem; align-items: center; }
  .share-label { color: var(--text-tertiary); font-size: 0.75rem; }
  .share-btn { color: var(--accent); text-decoration: none; font-size: 0.875rem; }
  .share-btn:hover { text-decoration: underline; }

  /* WEEK NAV */
  .week-nav { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); display: flex; justify-content: space-between; font-size: 0.875rem; }
  .week-nav a { color: var(--accent); text-decoration: none; }
  .week-nav a:hover { text-decoration: underline; }

  /* FOOTER */
  .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border); text-align: center; font-size: 0.8125rem; color: var(--text-tertiary); }
  .footer a { color: var(--text-secondary); }

  @media print {
    body { max-width: 100%; padding: 0; color-scheme: light; }
    nav, .share-bar, .week-nav { display: none; }
  }
`;

export const buildIndexCSS = (_language: Language = "en"): string => `
  body { max-width: 640px; }

  .index-header { margin-bottom: 2rem; }
  .index-header h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
  .index-profile { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem; text-decoration: none; color: inherit; }
  .index-profile:hover { color: var(--accent); }
  .index-profile img { width: 40px; height: 40px; border-radius: 50%; }
  .index-profile-name { font-weight: 600; }
  .index-profile-handle { font-size: 0.875rem; color: var(--text-tertiary); }
  .index-stats { font-size: 0.875rem; color: var(--text-tertiary); margin-top: 0.5rem; }

  .year-group { margin-bottom: 2rem; }
  .year-label { font-size: 0.875rem; font-weight: 600; color: var(--text-tertiary); margin-bottom: 0.5rem; }
  .week-list { list-style: none; }
  .week-item { display: block; padding: 0.75rem 0; border-bottom: 1px solid var(--border-subtle); text-decoration: none; color: inherit; }
  .week-item:first-child { border-top: 1px solid var(--border-subtle); }
  .week-item:hover .week-item-title { color: var(--accent); }
  .week-item-header { display: flex; justify-content: space-between; align-items: baseline; }
  .week-item-title { font-weight: 600; }
  .week-item-week { font-size: 0.75rem; color: var(--text-tertiary); }
  .week-item-subtitle { font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.125rem; }

  @media print {
    body { max-width: 100%; padding: 0; }
  }
`;
