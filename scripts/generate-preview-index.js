#!/usr/bin/env node
// Generate a top-level index.html for the preview site

import { writeFileSync } from "node:fs";
import { join } from "node:path";

const [outDir, baseUrl, themesStr, langsStr] = process.argv.slice(2);
const themes = themesStr.split(" ");
const langs = langsStr.split(" ");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Theme Preview - github-weekly-reporter</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f8f8f8; color: #1a1a1a;
      padding: 3rem 2rem; max-width: 960px; margin: 0 auto;
    }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .subtitle { color: #666; margin-bottom: 2.5rem; font-size: 0.9375rem; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    .card {
      background: #fff; border: 1px solid #e0e0e0; border-radius: 8px;
      padding: 1.5rem; text-decoration: none; color: inherit;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      border-color: #888;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .card-theme {
      font-size: 1.25rem; font-weight: 600; margin-bottom: 0.25rem;
      text-transform: capitalize;
    }
    .card-lang {
      font-size: 0.8125rem; color: #888; margin-bottom: 0.75rem;
    }
    .card-links { display: flex; gap: 0.75rem; font-size: 0.8125rem; }
    .card-links a { color: #c45d3e; }
    .card-links a:hover { text-decoration: underline; }
    footer {
      margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #e0e0e0;
      font-size: 0.8125rem; color: #888; text-align: center;
    }
    footer a { color: #666; }
  </style>
</head>
<body>
  <h1>Theme Preview</h1>
  <p class="subtitle">github-weekly-reporter: all themes and languages rendered from example data</p>
  <div class="grid">
${themes
  .flatMap((theme) =>
    langs.map(
      (lang) => `    <a class="card" href="${theme}/${lang}/index.html">
      <div class="card-theme">${theme}</div>
      <div class="card-lang">${lang === "ja" ? "Japanese" : "English"}</div>
      <div class="card-links">
        <span>Index</span>
      </div>
    </a>`
    )
  )
  .join("\n")}
  </div>
  <footer>
    <a href="https://github.com/deariary/github-weekly-reporter">github-weekly-reporter</a>
  </footer>
</body>
</html>`;

writeFileSync(join(outDir, "index.html"), html);
console.log(`Preview index written to ${join(outDir, "index.html")}`);
