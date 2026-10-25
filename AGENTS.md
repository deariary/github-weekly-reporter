# deariary/github-weekly-reporter

Public GitHub Action and CLI that generates AI-written weekly GitHub activity reports and deploys them to GitHub Pages.

## Purpose

A GitHub Action and CLI tool that collects a user's GitHub activity, writes a weekly narrative with an LLM, renders it as static HTML, and deploys it to GitHub Pages. Published to npm as `github-weekly-reporter`. This repository is public: never add private deariary internals to code, docs, or issues.

## Repository Layout

- `src/cli/` - CLI entry point and commands (`setup`, `daily-fetch`, `weekly-fetch`, `commit-msg`, `generate`, `render`, `deploy`)
- `src/cli/commands/setup/` - interactive setup helpers, including the generated user workflows
- `src/collector/` - GitHub API data collection (events, contributions, commits, PRs, releases)
- `src/llm/` - LLM content generation; `src/llm/providers/` holds the 6 providers (OpenRouter, Groq, Gemini, OpenAI, Anthropic, Grok)
- `src/renderer/` - Handlebars rendering, RSS, OG images, cards; `src/renderer/themes/` holds the themes (brutalist, editorial, minimal, swiss)
- `src/deployer/` - GitHub Pages deployment and index page generation
- `src/i18n/` - Internationalization (10 languages) and fonts
- `action.yml` - GitHub Action composite definition
- `assets/` - Fonts bundled into the npm package
- `docs/` - User-facing documentation (manual setup, CLI reference, customization, FAQ, security, troubleshooting)
- `example/` - Sample report data used by the preview site
- `scripts/` - Preview site generation and screenshots
- `video/` - Motion Canvas project for the demo video and OG image (separate `package.json`)

## Current Stack

- TypeScript (ESM, `"type": "module"`)
- Commander.js for the CLI
- Handlebars for HTML templates, satori + sharp for images
- OpenAI SDK for OpenAI-compatible providers (OpenAI, OpenRouter, Groq, Grok); Anthropic SDK and Google Generative AI SDK for Anthropic and Gemini
- Vitest for tests, ESLint for linting
- Node.js: `engines` requires >= 20; CI, Publish, and the action run Node 24

See `package.json` for exact versions.

## Daily Commands

```bash
npm run build                               # compile TypeScript
npm run lint                                # lint src/
npm test                                    # run tests
npm run build && npm run lint && npm test   # full check
bash scripts/generate-preview.sh            # build the theme x language preview site (after build)
```

## Release Flow

Releases are triggered via the **Publish** workflow (Actions > Publish > Run workflow).

1. Select bump type: `patch`, `minor`, or `major`
2. The workflow runs lint and test, bumps the version, and publishes to npm (OIDC trusted publishing)
3. It commits the version bump, pushes the tag to `main`, and creates a GitHub Release with generated notes

Other workflows: **CI** (lint, test with coverage on PRs and `main`) and **Preview Site** (deploys the preview site to GitHub Pages on push to `main`).

## Working Rules For Agents

- Run `npm run build && npm run lint && npm test` before committing.
- Keep all 6 LLM providers consistent (`src/types.ts`, `src/llm/index.ts`, `src/llm/providers/`, `src/cli/commands/generate.ts`, `action.yml`, docs).
- OpenRouter should be listed first in all user-facing provider lists.
- Do not hardcode model names in code or docs (models change frequently).
- User report repositories get two workflows from `setup`: `daily-fetch.yml` and `weekly-report.yml`. Keep that split.
- `GITHUB_TOKEN` (automatic) is not sufficient for data collection. Use `GH_PAT` (user's PAT).
- Support both classic and fine-grained PATs.
- LLM content is required for report rendering, not optional.
- Keep README concise. Detailed docs go in `docs/`.
- Never push directly to `main`; every change goes through a pull request. Exception: the Publish workflow pushes the version bump commit and tag directly to `main`. Do not bump `package.json` versions by hand.
- Use Conventional Commits for commit messages and PR titles, and merge pull requests with a merge commit (never squash).
- Write code, comments, commit messages, PRs, issues, and docs in English; locale files hold each locale's language.
- Never commit secrets or tokens; they live in GitHub Actions secrets.
