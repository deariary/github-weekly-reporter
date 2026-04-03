# GitHub Weekly Reporter

Generate beautiful weekly GitHub activity reports with optional AI-powered narratives.

Collect your commits, pull requests, issues, and code reviews from the past week, render them as a polished static HTML page, and deploy to GitHub Pages.

## Quick Start

```bash
npx github-weekly-reporter generate \
  -t $GITHUB_TOKEN \
  -u your-username

npx github-weekly-reporter deploy \
  -d ./report \
  -r https://github.com/your-username/weekly-report.git
```

## Features

- Weekly stats: commits, PRs opened/merged, issues, reviews
- Top repositories by activity
- Language breakdown (CSS-only chart)
- 7-day contribution heatmap
- AI-generated narrative summary (optional, supports OpenAI / Anthropic / Gemini)
- Light and dark themes
- Self-contained HTML (no external requests, no JavaScript required)
- Deploys to GitHub Pages with weekly archive

## Installation

```bash
npm install -g github-weekly-reporter
```

Or run directly with npx:

```bash
npx github-weekly-reporter <command>
```

## Commands

### `generate`

Collect GitHub activity data and generate an HTML report.

```bash
github-weekly-reporter generate [options]
```

| Option | Env Variable | Config Key | Description |
|---|---|---|---|
| `-t, --token` | `GITHUB_TOKEN` | - | GitHub personal access token (required) |
| `-u, --username` | `GITHUB_USERNAME` | `username` | GitHub username (required) |
| `-o, --output` | - | `output` | Output directory (default: `./report`) |
| `--theme` | - | `theme` | `default` or `dark` |
| `--llm-provider` | `LLM_PROVIDER` | `llm.provider` | `openai`, `anthropic`, or `gemini` |
| `--llm-api-key` | `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | - | LLM API key |
| `--llm-model` | `LLM_MODEL` | `llm.model` | Model name (e.g. `gpt-4o-mini`) |

Priority: CLI flag > environment variable > config file.

### `deploy`

Push generated report files to the `gh-pages` branch.

```bash
github-weekly-reporter deploy [options]
```

| Option | Description |
|---|---|
| `-d, --directory` | Directory containing generated files (default: `./report`) |
| `-r, --repo` | Repository URL to push to |

## Config File

Create `.github-weekly-reporter.toml` in your project root:

```toml
username = "your-username"
theme = "dark"
output = "./report"

[llm]
provider = "openai"
model = "gpt-4o-mini"
```

Secrets (tokens, API keys) should be set via environment variables or CLI flags, not in the config file.

## Report Contents

| Section | Requires AI | Description |
|---|---|---|
| Weekly stats | No | Commits, PRs opened/merged, issues, reviews |
| Highlight repos | No | Most active repositories with counts |
| Language breakdown | No | CSS-only bar chart of languages used |
| Contribution graph | No | 7-day heatmap |
| AI narrative | Yes | Natural language summary of the week |
| Footer | - | "Powered by deariary" link |

## Themes

Two built-in themes:

- `default`: clean light theme
- `dark`: dark background, GitHub-inspired

## AI Narrative

When an LLM provider and API key are configured, the report includes an AI-generated summary. All three major providers are supported:

| Provider | Env Variable | Example Model |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | `gpt-4o-mini` |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` |
| Google Gemini | `GEMINI_API_KEY` | `gemini-2.0-flash` |

If the LLM call fails, the report is generated without the AI section. The action never fails due to LLM errors.

## GitHub Action Usage

```yaml
name: Weekly Report
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday 9:00 UTC
  workflow_dispatch:

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npx github-weekly-reporter generate -t ${{ secrets.GITHUB_TOKEN }} -u ${{ github.actor }}

      - run: npx github-weekly-reporter deploy -d ./report -r https://x-access-token:${{ secrets.GITHUB_TOKEN }}@github.com/${{ github.repository }}.git
```

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
