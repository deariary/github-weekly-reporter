# deariary/github-weekly-reporter

Agent guide for the GitHub Weekly Reporter project.

## Purpose

A GitHub Action and CLI tool that generates weekly activity reports with AI-powered narratives, rendered as static HTML and deployed to GitHub Pages.

## Repository Layout

- `src/cli/` - CLI commands (setup, daily-fetch, weekly-fetch, generate, render, deploy)
- `src/collector/` - GitHub API data collection (events, contributions, PRs)
- `src/llm/` - LLM provider integrations (OpenRouter, Groq, Gemini, OpenAI, Anthropic, Grok)
- `src/renderer/` - Handlebars templates and HTML rendering
- `src/deployer/` - GitHub Pages deployment and index page generation
- `src/i18n/` - Internationalization (10 languages)
- `action.yml` - GitHub Action composite definition
- `docs/` - User-facing documentation (manual-setup, cli-reference)

## Current Stack

- TypeScript (ESM, `"type": "module"`)
- Commander.js for CLI
- Handlebars for HTML templates
- OpenAI SDK (used for OpenAI-compatible providers: OpenRouter, Groq, Grok)
- Vitest for testing
- ESLint for linting
- Node.js 24+

## Daily Commands

```bash
npm run build          # compile TypeScript
npm run lint           # lint
npm test               # run tests
npm run build && npm test  # full check
```

## Release Flow

Releases are triggered via the **Publish** workflow (Actions > Publish > Run workflow).

1. Select bump type: `patch`, `minor`, or `major`
2. Workflow runs lint, test, then publishes to npm
3. Automatically creates git tag and GitHub Release with generated notes

## Delivery Rules For Agents

- Run `npm run build && npm run lint && npm test` before committing.
- Keep all 6 LLM providers consistent (types.ts, llm/index.ts, providers/, generate.ts, action.yml, docs).
- OpenRouter should be listed first in all user-facing provider lists.
- Do not hardcode model names in code or docs (models change frequently).
- Workflows are split into `daily-fetch.yml` and `weekly-report.yml`.
- `GITHUB_TOKEN` (automatic) is not sufficient for data collection. Use `GH_PAT` (user's PAT).
- LLM content is required for report rendering, not optional.
- Support both classic and fine-grained PATs.
- Keep README concise. Detailed docs go in `docs/`.

## Related Repositories

- `deariary/frontend` - user application
- `deariary/backend` - API and batch services
- `deariary/docs` - specs and operational docs
