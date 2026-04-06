#!/usr/bin/env node
// Generate a landing page for the preview site

import { writeFileSync } from "node:fs";
import { join } from "node:path";

const [outDir, baseUrl, themesStr, langsStr] = process.argv.slice(2);
const themes = themesStr.split(" ");
const langs = langsStr.split(" ");

const langLabel = (l) => ({ en: "EN", ja: "JA" })[l] ?? l;

const themeData = {
  brutalist: {
    desc: "Bold, high-contrast dark theme with monospace typography and raw geometric layout. Self-contained HTML with no JavaScript. The default theme.",
  },
  minimal: {
    desc: "Clean lines, generous whitespace, and understated elegance. Light and dark modes with smooth transitions. Designed for readability.",
  },
  editorial: {
    desc: "Horizontal-scroll magazine layout inspired by print editorial design. Serif typography (Playfair Display + Newsreader), column-based content flow, and data visualizations woven into the narrative.",
  },
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GitHub Weekly Reporter</title>
  <meta name="description" content="Your GitHub activity, turned into a beautiful weekly report. Automatically." />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Rubik', system-ui, -apple-system, sans-serif;
      font-size: 18px;
      background: #0d0d0d; color: #ccc;
      line-height: 1.65;
      background-image:
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 60px 60px;
    }
    a { color: #e07858; transition: color 0.2s; }
    a:hover { color: #f0a080; }
    code {
      font-family: 'JetBrains Mono', 'SF Mono', monospace;
      font-size: 0.875em; background: #1a1a1a;
      padding: 0.15em 0.4em; border-radius: 3px;
    }

    /* GLOW */
    .glow {
      position: fixed; top: -200px; left: 50%; transform: translateX(-50%);
      width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(224,120,88,0.08) 0%, transparent 70%);
      pointer-events: none; z-index: -1;
      animation: glow-drift 12s ease-in-out infinite alternate;
    }
    @keyframes glow-drift {
      0% { top: -200px; left: 40%; }
      50% { top: -100px; left: 60%; }
      100% { top: -200px; left: 40%; }
    }

    /* FADE IN ON SCROLL */
    .fade-in {
      opacity: 0; transform: translateY(24px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .fade-in.visible {
      opacity: 1; transform: translateY(0);
    }

    /* HERO */
    .hero {
      padding: 7rem 2rem 6rem;
      max-width: 720px; margin: 0 auto;
      text-align: center;
      animation: hero-enter 0.8s ease both;
    }
    @keyframes hero-enter {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .hero h1 {
      font-size: clamp(1.75rem, 4vw, 2.75rem);
      font-weight: 700; letter-spacing: -0.02em;
      color: #f0f0f0;
      margin-bottom: 1.25rem;
    }
    .hero .tagline {
      font-size: 1.125rem; color: #888;
      margin-bottom: 2rem;
    }
    .hero .desc {
      font-size: 0.9375rem; color: #777;
      margin-bottom: 2.5rem; line-height: 1.7;
    }
    .hero-links {
      display: flex; gap: 1.5rem; justify-content: center;
      font-size: 0.9375rem;
    }
    .hero-links a { font-weight: 500; }

    /* SECTION */
    section {
      padding: 4rem 2rem;
      max-width: 720px; margin: 0 auto;
      border-top: 1px solid #1a1a1a;
    }
    section h2 {
      font-size: 1.25rem; font-weight: 600; color: #e0e0e0;
      margin-bottom: 0.5rem;
    }
    section .lead {
      font-size: 0.875rem; color: #666;
      margin-bottom: 2rem;
    }

    /* THEMES */
    .theme-list { list-style: none; }
    .theme-item {
      padding: 1.25rem 0;
      border-bottom: 1px solid #1a1a1a;
    }
    .theme-item:last-child { border-bottom: none; }
    .theme-head {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 0.375rem;
    }
    .theme-name {
      font-size: 1rem; font-weight: 600; color: #e0e0e0;
      text-transform: capitalize;
    }
    .theme-demos {
      font-size: 0.8125rem;
      display: flex; gap: 0.25rem;
    }
    .theme-demos span { color: #444; }
    .theme-desc {
      font-size: 0.8125rem; color: #666; line-height: 1.6;
      margin-bottom: 1rem;
    }
    .theme-shots {
      display: flex; gap: 0.75rem; overflow-x: auto;
      padding-bottom: 0.5rem;
      -webkit-overflow-scrolling: touch;
    }
    .theme-shots a {
      flex: 0 0 auto;
      border: 1px solid #222; border-radius: 4px; overflow: hidden;
      transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
    }
    .theme-shots a:hover {
      border-color: #e07858;
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(224,120,88,0.1);
    }
    .theme-shots img { display: block; height: 180px; width: auto; }
    .theme-shot-label {
      font-size: 0.625rem; color: #555; text-align: center;
      padding: 0.25rem 0; text-transform: uppercase; letter-spacing: 0.1em;
    }

    /* FEATURES */
    .feature-list { list-style: none; }
    .feature-item {
      padding: 0.75rem 0;
      border-bottom: 1px solid #1a1a1a;
      font-size: 0.875rem;
    }
    .feature-item:last-child { border-bottom: none; }
    .feature-item strong { color: #ddd; font-weight: 500; }
    .visible .feature-item,
    .visible .theme-item {
      animation: slide-up 0.5s ease both;
    }
    .visible .feature-item:nth-child(2),
    .visible .theme-item:nth-child(2) { animation-delay: 0.08s; }
    .visible .feature-item:nth-child(3),
    .visible .theme-item:nth-child(3) { animation-delay: 0.16s; }
    .visible .feature-item:nth-child(4) { animation-delay: 0.24s; }
    @keyframes slide-up {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* QUICKSTART */
    .code-block {
      background: #111; border: 1px solid #1a1a1a; border-radius: 6px;
      padding: 1.25rem 1.5rem; overflow-x: auto;
      font-family: 'JetBrains Mono', 'SF Mono', monospace;
      font-size: 0.8125rem; line-height: 1.7; color: #aaa;
    }
    .code-block .cm { color: #555; }
    .code-block .k { color: #79c0ff; }
    .code-block .v { color: #a5d6ff; }
    .code-block .s { color: #a5d6a7; }
    .qs-note {
      margin-top: 1rem; font-size: 0.8125rem; color: #555;
    }
    .qs-note a { color: #888; }

    /* FOOTER */
    .lp-footer {
      border-top: 1px solid #1a1a1a;
      padding: 2.5rem 2rem;
      text-align: center; font-size: 0.75rem; color: #444;
      max-width: 720px; margin: 0 auto;
    }
    .footer-links {
      display: flex; gap: 1.25rem; justify-content: center;
      margin-bottom: 0.5rem; font-size: 0.8125rem;
    }
    .footer-links a { color: #666; }

    @media (max-width: 640px) {
      .hero { padding: 4rem 1.5rem 3rem; }
      section { padding: 3rem 1.5rem; }
    }
  </style>
</head>
<body>

<div class="glow"></div>

<header class="hero">
  <h1>GitHub Weekly Reporter</h1>
  <p class="tagline">Your GitHub activity, turned into a beautiful weekly report. Automatically.</p>
  <video src="https://github.com/user-attachments/assets/96828826-d694-4338-89b9-974094b0950d" autoplay loop muted playsinline style="width:100%;max-width:640px;border-radius:6px;margin:0 auto 2rem;display:block;border:1px solid #222;"></video>
  <p class="desc">
    Collects your commits, pull requests, and code reviews throughout the week.
    An LLM writes a narrative summary. The result is a self-contained HTML report,
    deployed to GitHub Pages. Runs as a GitHub Action, costs nothing on public repos.
  </p>
  <div class="hero-links">
    <a href="https://github.com/deariary/github-weekly-reporter">GitHub</a>
    <a href="https://www.npmjs.com/package/github-weekly-reporter">npm</a>
  </div>
</header>

<section class="fade-in">
  <h2>Features</h2>
  <ul class="feature-list">
    <li class="feature-item"><strong>AI narratives</strong>: six LLM providers (OpenRouter, Anthropic, OpenAI, Gemini, Groq, Grok). One API call per week generates title, overview, summaries, and highlights.</li>
    <li class="feature-item"><strong>GitHub Action</strong>: daily event collection + weekly report pipeline. Drop two workflow files and your reports run on autopilot. Zero cost on public repos.</li>
    <li class="feature-item"><strong>10 languages</strong>: en, ja, zh-CN, zh-TW, ko, es, fr, de, pt, ru. UI text, date formatting, fonts, and LLM output all localized.</li>
    <li class="feature-item"><strong>SEO + archive</strong>: OG images, JSON-LD, sitemaps, RSS feeds, canonical URLs. All past reports preserved with weekly archive URLs.</li>
  </ul>
</section>

<section class="fade-in">
  <h2>What You Need</h2>
  <p class="lead">Two things to prepare before running setup.</p>
  <ul class="feature-list">
    <li class="feature-item"><strong>GitHub PAT</strong>: a personal access token to read your activity across all repositories. Fine-grained (<a href="https://github.com/settings/personal-access-tokens/new">create</a>) or classic with <code>repo</code> + <code>workflow</code> scopes (<a href="https://github.com/settings/tokens/new?scopes=repo,workflow">create</a>).</li>
    <li class="feature-item"><strong>LLM API key</strong>: from any supported provider. Free tiers available from <a href="https://openrouter.ai/settings/keys">OpenRouter</a>, <a href="https://console.groq.com/keys">Groq</a>, and <a href="https://aistudio.google.com/apikey">Google Gemini</a>. Paid providers: <a href="https://platform.openai.com/api-keys">OpenAI</a>, <a href="https://console.anthropic.com/settings/keys">Anthropic</a>, <a href="https://console.x.ai">Grok</a>.</li>
  </ul>
</section>

<section class="fade-in">
  <h2>Quick Start</h2>
  <p class="lead">One command sets up everything: repository, workflows, secrets, and GitHub Pages.</p>
  <pre class="code-block">npx github-weekly-reporter setup</pre>
  <p class="qs-note">
    The setup command walks you through interactively. Your first report will be live within 5 minutes.
    See <a href="https://github.com/deariary/github-weekly-reporter/blob/main/docs/manual-setup.md">manual setup</a> for full control.
  </p>
</section>

<section class="fade-in">
  <h2>Themes</h2>
  <p class="lead">Three built-in themes, each with light/dark mode and responsive layout.</p>
  <ul class="theme-list">
${themes
  .map(
    (theme) => `    <li class="theme-item">
      <div class="theme-head">
        <span class="theme-name">${theme}</span>
        <span class="theme-demos">Demo: ${langs.map((l) => `<a href="${theme}/${l}/2026/W14/index.html">${langLabel(l)}</a>`).join(' / ')}</span>
      </div>
      <p class="theme-desc">${themeData[theme]?.desc ?? ""}</p>
      <div class="theme-shots">
        <a href="${theme}/en/2026/W14/index.html">
          <img src="screenshots/${theme}-light.png" alt="${theme} light" loading="lazy" />
          <div class="theme-shot-label">Light</div>
        </a>
        <a href="${theme}/en/2026/W14/index.html">
          <img src="screenshots/${theme}-dark.png" alt="${theme} dark" loading="lazy" />
          <div class="theme-shot-label">Dark</div>
        </a>
      </div>
    </li>`
  )
  .join("\n")}
  </ul>
</section>

<footer class="lp-footer">
  <div class="footer-links">
    <a href="https://github.com/deariary/github-weekly-reporter">GitHub</a>
    <a href="https://www.npmjs.com/package/github-weekly-reporter">npm</a>
    <a href="https://github.com/deariary/github-weekly-reporter/blob/main/docs/cli-reference.md">CLI Reference</a>
  </div>
  <p>Powered by <a href="https://deariary.com">deariary</a></p>
</footer>

<script>
(function(){
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.fade-in').forEach(function(el) { obs.observe(el); });
})();
</script>

</body>
</html>`;

writeFileSync(join(outDir, "index.html"), html);
console.log(`Landing page written to ${join(outDir, "index.html")}`);
