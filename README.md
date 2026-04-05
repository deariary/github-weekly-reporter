# GitHub Weekly Reporter

[![CI](https://github.com/deariary/github-weekly-reporter/actions/workflows/ci.yml/badge.svg)](https://github.com/deariary/github-weekly-reporter/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/deariary/github-weekly-reporter/graph/badge.svg)](https://codecov.io/gh/deariary/github-weekly-reporter)
[![npm](https://img.shields.io/npm/v/github-weekly-reporter)](https://www.npmjs.com/package/github-weekly-reporter)

**Your GitHub activity, turned into a beautiful weekly report. Automatically.**

<video src="https://github.com/user-attachments/assets/96828826-d694-4338-89b9-974094b0950d" autoplay loop muted playsinline></video>

Every week, this tool looks at everything you did on GitHub (commits, pull requests, code reviews) and generates a polished, shareable report page with AI-written summaries. It runs as a GitHub Action, deploys to GitHub Pages, and costs nothing.

[See a live example](https://unhappychoice.github.io/weekly-report/)

## What You Need

Have these two things ready before running setup:

1. **GitHub fine-grained PAT** with `All repositories` access and these permissions (all Read & Write):
   `Actions`, `Administration`, `Contents`,  `Pages`, `Secrets`, `Workflows`
   ([Create one](https://github.com/settings/personal-access-tokens/new))

2. **LLM API key** from any supported provider:

   | Provider | Free Tier | Get API Key |
   |---|---|---|
   | **OpenRouter** | Yes (25+ free models) | https://openrouter.ai/settings/keys |
   | **Groq** | Yes (generous limits) | https://console.groq.com/keys |
   | **Google Gemini** | Yes | https://aistudio.google.com/apikey |
   | OpenAI | No | https://platform.openai.com/api-keys |
   | Anthropic | No | https://console.anthropic.com/settings/keys |
   | Grok (xAI) | No | https://console.x.ai |

   You also need a **model name**. Find available models on your provider's page:
   [OpenRouter](https://openrouter.ai/models),
   [Groq](https://console.groq.com/docs/models),
   [Gemini](https://ai.google.dev/gemini-api/docs/models),
   [OpenAI](https://platform.openai.com/docs/models),
   [Anthropic](https://docs.anthropic.com/en/docs/about-claude/models),
   [Grok](https://docs.x.ai/docs/models)

## Quick Start

```bash
npx github-weekly-reporter setup
```

The setup command walks you through everything interactively:

1. Creates a repository for your reports
2. Adds workflow files (daily fetch + weekly report)
3. Stores secrets (PAT and LLM API key)
4. Enables GitHub Pages
5. Triggers your first report

Your first report will be live within 5 minutes.

See [Manual Setup](docs/manual-setup.md) if you prefer to configure everything yourself.

## Cost

**The entire stack runs at $0/month on a public repository.**

| Component | Cost | Details |
|---|---|---|
| GitHub Actions | Free | ~80 min/month (30 daily runs + 4 weekly runs). Public repos have unlimited free minutes. |
| LLM | Free | One API call per week. OpenRouter, Groq, and Gemini all offer free tiers. |
| GitHub Pages | Free | Hosting and deployment included for public repos. |
| npm package | Free | Runs via `npx`, no installation required. |

On paid LLM providers (OpenAI, Anthropic, Grok), the cost is roughly $0.10-0.35/month (one call per week, ~4-8K tokens each).

Private repositories work too. GitHub Free gives 2,000 Actions minutes/month (this tool uses ~4% of that), but GitHub Pages on private repos requires a paid GitHub plan.

## Features

- Weekly stats: commits, PRs opened/merged, reviews
- Top repositories by activity
- Language breakdown (CSS-only chart)
- 7-day contribution heatmap
- AI-generated narrative summary
- Dark theme with responsive design
- Self-contained HTML, no JavaScript
- SEO optimized (OG images, JSON-LD, sitemap)
- Deploys to GitHub Pages with weekly archive
- 10 languages supported

## Supported Languages

| Code | Language |
|---|---|
| `en` | English |
| `ja` | Japanese |
| `zh-CN` | Chinese (Simplified) |
| `zh-TW` | Chinese (Traditional) |
| `ko` | Korean |
| `es` | Spanish |
| `fr` | French |
| `de` | German |
| `pt` | Portuguese |
| `ru` | Russian |

## Documentation

- [How It Works](docs/how-it-works.md): the pipeline, data flow, and what gets collected
- [Manual Setup](docs/manual-setup.md): step-by-step guide without the setup command
- [Customization](docs/customization.md): change language, timezone, LLM provider, custom domain, and more
- [CLI Reference](docs/cli-reference.md): all commands and environment variables
- [FAQ](docs/faq.md): common questions about cost, privacy, and limitations
- [Troubleshooting](docs/troubleshooting.md): fixing workflow failures, missing data, and setup errors

## License

See [LICENSE](./LICENSE) for details.

- Commercial use: "Powered by deariary" footer link must be retained
- Personal/non-commercial use: footer link may be removed
- Derivative works: same conditions apply
