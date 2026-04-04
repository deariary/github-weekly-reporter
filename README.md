# GitHub Weekly Reporter

Generate beautiful weekly GitHub activity reports with AI-powered narratives.

Collect your commits, pull requests, issues, and code reviews from the past week, render them as a polished static HTML page, and deploy to GitHub Pages automatically.

## Prerequisites

Before running setup, have these ready:

1. **GitHub fine-grained PAT** with `All repositories` access and these permissions (all Read & Write):
   `Administration`, `Contents`, `Actions`, `Secrets`, `Pages`, `Workflows`
   ([Create one](https://github.com/settings/personal-access-tokens/new))

2. **LLM API key** from one of the supported providers.
   Groq and OpenRouter offer free tiers (no credit card required):
   - Groq: https://console.groq.com/keys
   - OpenRouter: https://openrouter.ai/settings/keys

3. **LLM model name** for your chosen provider.
   Check available models at the provider's docs:
   - Groq: https://console.groq.com/docs/models
   - OpenRouter: https://openrouter.ai/models

## Quick Start

```bash
npx github-weekly-reporter setup
```

The setup command will walk you through everything:
- Creates a repository
- Adds workflow files (daily fetch + weekly report)
- Configures secrets (PAT and LLM API key)
- Enables GitHub Pages
- Triggers your first weekly report

See [Manual Setup](docs/manual-setup.md) if you prefer to configure everything yourself.

## Features

- Weekly stats: commits, PRs opened/merged, issues, reviews
- Top repositories by activity
- Language breakdown (CSS-only chart)
- 7-day contribution heatmap
- AI-generated narrative summary (6 providers, free tiers available)
- Dark theme with responsive design
- Self-contained HTML (no external requests, no JavaScript required)
- SEO optimized (OG images, JSON-LD, sitemap)
- Deploys to GitHub Pages with weekly archive
- Internationalization (10 languages)

## LLM Providers

AI narratives are required for report generation. Six providers are supported, including free tiers:

| Provider | Free Tier | Env Variable |
|---|---|---|
| **Groq** | Yes (generous) | `GROQ_API_KEY` |
| **OpenRouter** | Yes (25+ free models) | `OPENROUTER_API_KEY` |
| **Google Gemini** | Yes | `GEMINI_API_KEY` |
| OpenAI | No | `OPENAI_API_KEY` |
| Anthropic | No | `ANTHROPIC_API_KEY` |
| Grok (xAI) | No | `GROK_API_KEY` |

Groq and OpenRouter are recommended for free usage. Both offer high-quality models at no cost. For model selection, see each provider's documentation:

- Groq: https://console.groq.com/docs/models
- OpenRouter: https://openrouter.ai/models
- Gemini: https://ai.google.dev/gemini-api/docs/models
- OpenAI: https://platform.openai.com/docs/models
- Anthropic: https://docs.anthropic.com/en/docs/about-claude/models
- Grok: https://docs.x.ai/docs/models

If the LLM call fails, the report is still generated without the AI section.

## GitHub Action Usage

### Two-Mode Workflow

The action runs in two modes:
- **Daily** (scheduled): Collects events and saves them for later
- **Weekly** (manual trigger): Generates a full report from accumulated data

```yaml
name: Weekly Report

on:
  schedule:
    - cron: '0 15 * * *'  # Midnight JST (adjust for your timezone)
  workflow_dispatch:
    inputs:
      mode:
        description: 'Run mode'
        type: choice
        options: [daily, weekly]
        default: daily

permissions:
  contents: write
  pages: write

env:
  SITE_TITLE: 'Dev\nPulse'

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # github-token requires a PAT with 'repo' scope to read activity
      # across all your repositories. The default GITHUB_TOKEN only has
      # access to the current repository.
      # Set your PAT as a repository secret named GH_PAT.
      - uses: deariary/github-weekly-reporter@main
        with:
          github-token: ${{ secrets.GH_PAT }}
          username: 'your-username'
          mode: ${{ github.event.inputs.mode || 'daily' }}
          language: 'en'
          timezone: 'Asia/Tokyo'
          llm-provider: 'groq'
          llm-model: 'meta-llama/llama-4-scout-17b-16e-instruct'
          groq-api-key: ${{ secrets.GROQ_API_KEY }}
```

### Action Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `github-token` | Yes | - | GitHub PAT with `repo` scope (use `${{ secrets.GH_PAT }}`, **not** `GITHUB_TOKEN`) |
| `username` | No | `${{ github.actor }}` | GitHub username to report on |
| `mode` | No | `daily` | `daily` (collect events) or `weekly` (full report) |
| `language` | No | `en` | Report language |
| `timezone` | No | `UTC` | IANA timezone (e.g. `Asia/Tokyo`) |
| `llm-provider` | No | - | LLM provider name |
| `llm-model` | No | - | Model name |
| `openai-api-key` | No | - | OpenAI API key |
| `anthropic-api-key` | No | - | Anthropic API key |
| `gemini-api-key` | No | - | Gemini API key |
| `openrouter-api-key` | No | - | OpenRouter API key |
| `groq-api-key` | No | - | Groq API key |
| `grok-api-key` | No | - | Grok (xAI) API key |
| `date` | No | today | Target date (YYYY-MM-DD) |
| `version` | No | `latest` | CLI version |

### Scheduling Tips

GitHub Actions cron uses UTC. To run at midnight in your timezone:

| Timezone | Cron |
|---|---|
| UTC | `0 0 * * *` |
| US/Eastern (EST) | `0 5 * * *` |
| Europe/London (GMT) | `0 0 * * *` |
| Europe/Berlin (CET) | `0 23 * * *` |
| Asia/Tokyo (JST) | `0 15 * * *` |
| Australia/Sydney (AEST) | `0 14 * * *` |

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

- [Manual Setup](docs/manual-setup.md) - step-by-step guide without the setup command
- [CLI Reference](docs/cli-reference.md) - all commands and environment variables

## URL Structure

Reports are archived by ISO week:

```
https://<user>.github.io/<repo>/           # Index page (links to all reports)
https://<user>.github.io/<repo>/2026/W14/  # Weekly report
https://<user>.github.io/<repo>/2026/W13/  # Previous week
```

## License

See [LICENSE](./LICENSE) for details.

- Commercial use: "Powered by deariary" footer link must be retained
- Personal/non-commercial use: footer link may be removed
- Derivative works: same conditions apply
