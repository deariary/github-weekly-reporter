# CLI Reference

## Commands

### `setup`

Interactive one-command setup.

```bash
npx github-weekly-reporter setup
npx github-weekly-reporter setup --repo owner/existing-repo
```

### `daily-fetch` / `weekly-fetch`

Collect GitHub activity data.

```bash
github-weekly-reporter daily-fetch --token $GITHUB_TOKEN --username your-name
github-weekly-reporter weekly-fetch --token $GITHUB_TOKEN --username your-name
```

### `generate`

Generate AI narrative from collected data.

```bash
github-weekly-reporter generate --llm-provider groq --llm-model YOUR_MODEL_NAME
```

### `render`

Render HTML report from data.

```bash
github-weekly-reporter render --base-url https://user.github.io/weekly-report --language ja
```

### `deploy`

Deploy rendered report to GitHub Pages.

```bash
github-weekly-reporter deploy --repo owner/repo
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
