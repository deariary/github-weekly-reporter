# CLI Reference

## Commands

### `setup`

Interactive one-command setup. Use `--repo` to set up in an existing repository instead of creating a new one.

```bash
npx github-weekly-reporter setup
npx github-weekly-reporter setup --repo owner/existing-repo
```

### `daily-fetch` / `weekly-fetch`

Collect GitHub activity data.

`daily-fetch` collects **yesterday's** events and stores them in the corresponding ISO week folder. Designed to run at midnight via cron.

`weekly-fetch` builds the complete dataset for the **previous** ISO week (Mon-Sun) from accumulated events, PR search, and contribution stats.

Use `--date` to override the reference date (format: `YYYY-MM-DD`).

```bash
github-weekly-reporter daily-fetch --token $GITHUB_TOKEN --username your-name
github-weekly-reporter weekly-fetch --token $GITHUB_TOKEN --username your-name --date 2026-03-31
```

### `generate`

Generate AI narrative from collected data.

```bash
github-weekly-reporter generate --llm-provider openrouter --llm-model YOUR_MODEL_NAME
github-weekly-reporter generate --llm-provider groq --llm-model YOUR_MODEL_NAME --date 2026-03-31
```

### `render`

Render HTML report from data.

```bash
github-weekly-reporter render --base-url https://user.github.io/weekly-report --language ja
github-weekly-reporter render --date 2026-03-31
```

### `deploy`

Deploy rendered report to GitHub Pages.

```bash
github-weekly-reporter deploy --repo owner/repo
github-weekly-reporter deploy --date 2026-03-31
```

### `commit-msg`

Print a commit message for use by `action.yml`. Computes the same date range and week ID as `daily-fetch` or `weekly-fetch`, ensuring the commit message matches the data that was actually collected.

```bash
github-weekly-reporter commit-msg daily --timezone Asia/Tokyo
# => data: daily 2026-04-05 (2026/W14)

github-weekly-reporter commit-msg weekly --timezone Asia/Tokyo
# => data: weekly 2026/W14 (2026-03-30..2026-04-05)
```

## Environment Variables

| Variable | CLI Flag | Description |
|---|---|---|
| `GITHUB_TOKEN` | `--token` | GitHub API token |
| `GITHUB_USERNAME` | `--username` | GitHub username |
| `DATA_DIR` | `--data-dir` | Data directory (default: `./data`) |
| `OUTPUT_DIR` | `--output-dir` | Output directory (default: `./output`) |
| `BASE_URL` | `--base-url` | Base URL for canonical links |
| `SITE_TITLE` | `--site-title` | Site title (default: `Dev\nPulse`) |
| `LANGUAGE` | `--language` | Report language (default: `en`) |
| `TIMEZONE` | `--timezone` | IANA timezone (default: `UTC`) |
| `LLM_PROVIDER` | `--llm-provider` | LLM provider |
| `LLM_MODEL` | `--llm-model` | Model name |
| `OPENROUTER_API_KEY` | `--llm-api-key` | OpenRouter API key |
| `GROQ_API_KEY` | `--llm-api-key` | Groq API key |
| `GEMINI_API_KEY` | `--llm-api-key` | Gemini API key |
| `OPENAI_API_KEY` | `--llm-api-key` | OpenAI API key |
| `ANTHROPIC_API_KEY` | `--llm-api-key` | Anthropic API key |
| `GROK_API_KEY` | `--llm-api-key` | Grok (xAI) API key |
