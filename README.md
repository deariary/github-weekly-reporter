# GitHub Weekly Reporter

Generate beautiful weekly GitHub activity reports with AI-powered narratives.

Collect your commits, pull requests, issues, and code reviews from the past week, render them as a polished static HTML page, and deploy to GitHub Pages automatically.

## Prerequisites

Before running setup, have these ready:

1. **GitHub fine-grained PAT** with `All repositories` access and these permissions (all Read & Write):
   `Administration`, `Contents`, `Actions`, `Secrets`, `Pages`, `Workflows`
   ([Create one](https://github.com/settings/personal-access-tokens/new))

2. **LLM API key** from one of the supported providers.
   | Provider | Free Tier | Get API Key |
   |---|---|---|
   | OpenRouter | Yes | https://openrouter.ai/settings/keys |
   | Groq | Yes | https://console.groq.com/keys |
   | Google Gemini | Yes | https://aistudio.google.com/apikey |
   | OpenAI | No | https://platform.openai.com/api-keys |
   | Anthropic | No | https://console.anthropic.com/settings/keys |
   | Grok (xAI) | No | https://console.x.ai |

3. **LLM model name** for your chosen provider:

   | Provider | Models |
   |---|---|
   | OpenRouter | https://openrouter.ai/models |
   | Groq | https://console.groq.com/docs/models |
   | Google Gemini | https://ai.google.dev/gemini-api/docs/models |
   | OpenAI | https://platform.openai.com/docs/models |
   | Anthropic | https://docs.anthropic.com/en/docs/about-claude/models |
   | Grok (xAI) | https://docs.x.ai/docs/models |

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
| **OpenRouter** | Yes (25+ free models) | `OPENROUTER_API_KEY` |
| **Groq** | Yes (generous) | `GROQ_API_KEY` |
| **Google Gemini** | Yes | `GEMINI_API_KEY` |
| OpenAI | No | `OPENAI_API_KEY` |
| Anthropic | No | `ANTHROPIC_API_KEY` |
| Grok (xAI) | No | `GROK_API_KEY` |

OpenRouter and Groq are recommended for free usage. Both offer high-quality models at no cost. For model selection, see each provider's documentation:

- OpenRouter: https://openrouter.ai/models
- Groq: https://console.groq.com/docs/models
- Gemini: https://ai.google.dev/gemini-api/docs/models
- OpenAI: https://platform.openai.com/docs/models
- Anthropic: https://docs.anthropic.com/en/docs/about-claude/models
- Grok: https://docs.x.ai/docs/models

If the LLM call fails, the report is still generated without the AI section.

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
