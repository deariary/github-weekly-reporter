#!/usr/bin/env node
// Generate a landing page for the preview site

import { writeFileSync } from "node:fs";
import { join } from "node:path";

const [outDir, baseUrl, themesStr, langsStr] = process.argv.slice(2);
const themes = themesStr.split(" ");
const langs = langsStr.split(" ");

const langLabel = (l) => ({ en: "English", ja: "Japanese" })[l] ?? l;

const themeDesc = {
  brutalist: "Bold, raw typography with monospace accents and high-contrast layout.",
  minimal: "Clean lines, generous whitespace, and understated elegance.",
  editorial: "Horizontal-scroll magazine with serif typography and column-based flow.",
};

const features = [
  { icon: "&#9998;", title: "AI-Powered Narratives", desc: "LLM generates weekly summaries, highlights, and insights from your GitHub activity. Supports OpenRouter, Anthropic, OpenAI, Gemini, Groq, and Grok." },
  { icon: "&#127760;", title: "10 Languages", desc: "Full i18n support: English, Japanese, Chinese (Simplified/Traditional), Korean, Spanish, French, German, Portuguese, Russian." },
  { icon: "&#9881;", title: "GitHub Action", desc: "Drop a workflow file in your repo and get automated weekly reports deployed to GitHub Pages." },
  { icon: "&#127912;", title: "3 Themes", desc: "Brutalist, Minimal, and Editorial. Each with light/dark mode and responsive design." },
  { icon: "&#128200;", title: "Data Visualizations", desc: "Commit heatmaps, repository contribution bars, diff stats, and activity patterns embedded in reports." },
  { icon: "&#128269;", title: "SEO Ready", desc: "OG images, JSON-LD structured data, sitemaps, RSS feeds, and canonical URLs out of the box." },
];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>github-weekly-reporter</title>
  <meta name="description" content="Generate beautiful AI-powered weekly development reports from your GitHub activity." />
  <style>
    :root {
      --bg: #fafafa; --text: #1a1a1a; --text2: #555; --text3: #888;
      --accent: #c45d3e; --border: #e0e0e0; --card-bg: #fff;
      --hero-bg: #111; --hero-text: #f0f0f0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      background: var(--bg); color: var(--text);
      line-height: 1.6;
    }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* HERO */
    .hero {
      background: var(--hero-bg); color: var(--hero-text);
      padding: 6rem 2rem 5rem; text-align: center;
    }
    .hero h1 {
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 800; letter-spacing: -0.03em;
      margin-bottom: 1rem;
    }
    .hero h1 span { color: var(--accent); }
    .hero p {
      font-size: 1.125rem; color: #aaa;
      max-width: 600px; margin: 0 auto 2.5rem;
    }
    .hero-cta {
      display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
    }
    .btn {
      display: inline-block; padding: 0.75rem 1.75rem;
      border-radius: 6px; font-weight: 600; font-size: 0.9375rem;
      transition: opacity 0.2s;
    }
    .btn:hover { text-decoration: none; opacity: 0.85; }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-secondary { background: #333; color: #ddd; }

    /* SECTION */
    section { padding: 5rem 2rem; max-width: 1100px; margin: 0 auto; }
    .section-label {
      font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.15em;
      color: var(--accent); font-weight: 600; margin-bottom: 0.5rem;
    }
    .section-title {
      font-size: 2rem; font-weight: 700; letter-spacing: -0.02em;
      margin-bottom: 1rem;
    }
    .section-sub { color: var(--text2); margin-bottom: 3rem; max-width: 600px; }

    /* THEMES */
    .theme-grid { display: flex; flex-direction: column; gap: 3rem; }
    .theme-header {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 1rem;
    }
    .theme-name {
      font-size: 1.5rem; font-weight: 700; text-transform: capitalize;
    }
    .theme-links { display: flex; gap: 0.75rem; font-size: 0.8125rem; }
    .theme-desc { color: var(--text2); font-size: 0.9375rem; margin-bottom: 1rem; }
    .theme-screenshots {
      display: flex; gap: 0.75rem; overflow-x: auto;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 0.5rem;
    }
    .theme-screenshots a {
      flex: 0 0 auto; scroll-snap-align: start;
      border: 1px solid var(--border); border-radius: 6px; overflow: hidden;
      transition: border-color 0.2s;
    }
    .theme-screenshots a:hover { border-color: var(--accent); }
    .theme-screenshots img {
      display: block; height: 200px; width: auto;
    }

    /* FEATURES */
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 2rem;
    }
    .feature-card {
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 8px; padding: 1.5rem;
    }
    .feature-icon { font-size: 1.5rem; margin-bottom: 0.75rem; }
    .feature-title { font-size: 1.0625rem; font-weight: 600; margin-bottom: 0.375rem; }
    .feature-desc { font-size: 0.875rem; color: var(--text2); }

    /* QUICKSTART */
    .code-block {
      background: #1a1a1a; color: #e0e0e0; border-radius: 8px;
      padding: 1.5rem; overflow-x: auto;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 0.8125rem; line-height: 1.7;
    }
    .code-block .cm { color: #6a737d; }
    .code-block .k { color: #79c0ff; }
    .code-block .v { color: #a5d6ff; }
    .code-block .s { color: #a5d6a7; }

    /* FOOTER */
    .lp-footer {
      border-top: 1px solid var(--border);
      padding: 2.5rem 2rem;
      text-align: center; font-size: 0.8125rem; color: var(--text3);
    }
    .footer-links { display: flex; gap: 1.5rem; justify-content: center; margin-bottom: 0.75rem; }
    .footer-links a { color: var(--text2); font-weight: 500; }

    @media (max-width: 640px) {
      .hero { padding: 4rem 1.5rem 3rem; }
      section { padding: 3rem 1.5rem; }
      .theme-screenshots img { height: 140px; }
    }
  </style>
</head>
<body>

<header class="hero">
  <h1><span>github-weekly</span>-reporter</h1>
  <p>Generate beautiful AI-powered weekly development reports from your GitHub activity. Multiple themes, 10 languages, deployed to GitHub Pages.</p>
  <div class="hero-cta">
    <a href="https://github.com/deariary/github-weekly-reporter" class="btn btn-primary">GitHub</a>
    <a href="https://www.npmjs.com/package/@deariary/github-weekly-reporter" class="btn btn-secondary">npm install</a>
  </div>
</header>

<section>
  <div class="section-label">Themes</div>
  <h2 class="section-title">Pick your style</h2>
  <p class="section-sub">Each theme ships with light/dark mode, responsive layout, and full i18n support.</p>
  <div class="theme-grid">
${themes
  .map(
    (theme) => `    <div class="theme-item">
      <div class="theme-header">
        <span class="theme-name">${theme}</span>
        <div class="theme-links">
${langs.map((l) => `          <a href="${theme}/${l}/index.html">${langLabel(l)} demo</a>`).join("\n")}
        </div>
      </div>
      <p class="theme-desc">${themeDesc[theme] ?? ""}</p>
      <div class="theme-screenshots">
${langs
  .map(
    (l) =>
      `        <a href="${theme}/${l}/index.html"><img src="${theme}/${l}/2026/W14/og.png" alt="${theme} ${l}" loading="lazy" /></a>`
  )
  .join("\n")}
      </div>
    </div>`
  )
  .join("\n")}
  </div>
</section>

<section>
  <div class="section-label">Features</div>
  <h2 class="section-title">Everything you need</h2>
  <p class="section-sub">From data collection to deployment, one tool handles the entire pipeline.</p>
  <div class="feature-grid">
${features
  .map(
    (f) => `    <div class="feature-card">
      <div class="feature-icon">${f.icon}</div>
      <div class="feature-title">${f.title}</div>
      <div class="feature-desc">${f.desc}</div>
    </div>`
  )
  .join("\n")}
  </div>
</section>

<section>
  <div class="section-label">Quick Start</div>
  <h2 class="section-title">Add to your repo in 2 minutes</h2>
  <p class="section-sub">Create <code>.github/workflows/weekly-report.yml</code> and push.</p>
  <pre class="code-block"><span class="k">name</span>: <span class="s">Weekly Report</span>
<span class="k">on</span>:
  <span class="k">schedule</span>:
    - <span class="k">cron</span>: <span class="s">'0 9 * * 1'</span>  <span class="cm"># Every Monday 9am UTC</span>
  <span class="k">workflow_dispatch</span>:

<span class="k">jobs</span>:
  <span class="k">report</span>:
    <span class="k">runs-on</span>: <span class="s">ubuntu-latest</span>
    <span class="k">permissions</span>:
      <span class="k">contents</span>: <span class="s">write</span>
      <span class="k">pages</span>: <span class="s">write</span>
      <span class="k">id-token</span>: <span class="s">write</span>
    <span class="k">steps</span>:
      - <span class="k">uses</span>: <span class="v">deariary/github-weekly-reporter@v0</span>
        <span class="k">with</span>:
          <span class="k">gh-pat</span>: <span class="v">\${{ secrets.GH_PAT }}</span>
          <span class="k">llm-provider</span>: <span class="s">openrouter</span>
          <span class="k">llm-api-key</span>: <span class="v">\${{ secrets.OPENROUTER_API_KEY }}</span>
          <span class="k">theme</span>: <span class="s">editorial</span></pre>
</section>

<footer class="lp-footer">
  <div class="footer-links">
    <a href="https://github.com/deariary/github-weekly-reporter">GitHub</a>
    <a href="https://www.npmjs.com/package/@deariary/github-weekly-reporter">npm</a>
    <a href="https://deariary.com">deariary</a>
  </div>
  <p>Powered by <a href="https://deariary.com">deariary</a></p>
</footer>

</body>
</html>`;

writeFileSync(join(outDir, "index.html"), html);
console.log(`Landing page written to ${join(outDir, "index.html")}`);
