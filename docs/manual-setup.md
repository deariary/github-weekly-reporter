# Manual Setup

This guide walks through setting up GitHub Weekly Reporter without the `setup` CLI command. Use this if you prefer full control or are setting up in an existing repository.

## Prerequisites

- A GitHub account
- A personal access token (PAT)
  - **Classic PAT**: scopes `repo` and `workflow` ([create one](https://github.com/settings/tokens/new?scopes=repo,workflow))
  - **Fine-grained PAT**: repository access **All repositories**, permissions `Administration`, `Contents`, `Actions`, `Secrets`, `Pages`, `Workflows` (all Read & Write) ([create one](https://github.com/settings/personal-access-tokens/new))
- An LLM API key for AI-generated narratives (free tiers available from Groq and OpenRouter)

## Step 1: Create a Repository

Create a new repository for your weekly reports (e.g. `weekly-report`).

```bash
gh repo create weekly-report --public --clone
cd weekly-report
```

Or create it via the GitHub web UI at https://github.com/new.

## Step 2: Add Workflow Files

Create two workflow files in your repository.

### `.github/workflows/daily-fetch.yml`

Runs every day at midnight (your timezone) to collect **yesterday's** GitHub events.

```yaml
name: Daily Fetch

on:
  schedule:
    # Run daily at midnight in your timezone (this example is midnight JST = 15:00 UTC)
    - cron: '0 15 * * *'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  daily:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # github-token requires a PAT to read activity across all your
      # repositories. The default GITHUB_TOKEN only has access to the
      # current repository.
      # Add your PAT as a repository secret named GH_PAT (see Step 3).
      - uses: deariary/github-weekly-reporter@main
        with:
          github-token: ${{ secrets.GH_PAT }}
          username: 'YOUR_USERNAME'
          mode: 'daily'
          language: 'en'
          timezone: 'UTC'
```

### `.github/workflows/weekly-report.yml`

Runs every Monday (1 hour after daily fetch) to generate the full report. Can also be triggered manually.

```yaml
name: Weekly Report

on:
  schedule:
    # Run Monday, 1 hour after daily fetch (this example is Mon 01:00 JST = Sun 16:00 UTC)
    - cron: '0 16 * * 0'
  workflow_dispatch:

permissions:
  contents: write
  pages: write

env:
  SITE_TITLE: 'Dev\nPulse'

jobs:
  weekly:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: deariary/github-weekly-reporter@main
        with:
          github-token: ${{ secrets.GH_PAT }}
          username: 'YOUR_USERNAME'
          mode: 'weekly'
          language: 'en'
          timezone: 'UTC'
          llm-provider: 'openrouter'
          llm-model: 'YOUR_MODEL_NAME'
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
```

### Scheduling

The daily fetch runs every day at midnight (your timezone) and collects the previous day's events. The weekly report runs every Monday, 1 hour later, and covers the previous ISO week (Mon-Sun). Both use UTC cron.

Calculate your local midnight for the daily fetch (then add 1 hour for weekly):

| Your Timezone | Cron for Midnight |
|---|---|
| UTC | `0 0 * * *` |
| US/Eastern (UTC-5) | `0 5 * * *` |
| US/Pacific (UTC-8) | `0 8 * * *` |
| Europe/London (UTC+0/+1) | `0 0 * * *` or `0 23 * * *` |
| Europe/Berlin (UTC+1/+2) | `0 23 * * *` or `0 22 * * *` |
| Asia/Tokyo (UTC+9) | `0 15 * * *` |
| Asia/Shanghai (UTC+8) | `0 16 * * *` |
| Australia/Sydney (UTC+10/+11) | `0 14 * * *` or `0 13 * * *` |

### Choosing an LLM Provider

For free usage, we recommend **OpenRouter** or **Groq**:

| Provider | Input Name | Secret Name | Models Page |
|---|---|---|---|
| OpenRouter | `openrouter-api-key` | `OPENROUTER_API_KEY` | https://openrouter.ai/models |
| Groq | `groq-api-key` | `GROQ_API_KEY` | https://console.groq.com/docs/models |
| Google Gemini | `gemini-api-key` | `GEMINI_API_KEY` | https://ai.google.dev/gemini-api/docs/models |
| OpenAI | `openai-api-key` | `OPENAI_API_KEY` | https://platform.openai.com/docs/models |
| Anthropic | `anthropic-api-key` | `ANTHROPIC_API_KEY` | https://docs.anthropic.com/en/docs/about-claude/models |
| Grok (xAI) | `grok-api-key` | `GROK_API_KEY` | https://docs.x.ai/docs/models |

Update the `llm-provider`, `llm-model`, and the corresponding API key input in your workflow.

## Step 3: Set Repository Secrets

### GitHub PAT (required)

The action needs a PAT to read activity across all your repositories. The default `GITHUB_TOKEN` only has access to the current repository and cannot collect events from other repos.

1. Go to your repository on GitHub
2. Navigate to **Settings > Secrets and variables > Actions**
3. Click **New repository secret**
4. Name: `GH_PAT`
5. Value: your personal access token (the same one from the Prerequisites)
6. Click **Add secret**

### LLM API Key (required)

Add your LLM provider's API key as a secret:

1. Click **New repository secret**
2. Name: the secret name from the table above (e.g. `GROQ_API_KEY`)
3. Value: your API key
4. Click **Add secret**

## Step 4: Enable GitHub Pages

1. Go to **Settings > Pages**
2. Under **Source**, select **Deploy from a branch**
3. Select the `gh-pages` branch and `/ (root)` folder

The `gh-pages` branch is created automatically on the first deploy.
4. Click **Save**

## Step 5: Run the Workflow

### Daily Fetch (Collect Events)

The daily fetch runs automatically on the cron schedule. You can also trigger it manually:

1. Go to **Actions** tab
2. Click **Daily Fetch** workflow
3. Click **Run workflow**

### Weekly Report (Generate Full Report)

The weekly report runs automatically every Monday. You can also trigger it manually:

1. Go to **Actions** tab
2. Click **Weekly Report** workflow
3. Click **Run workflow**

The report will be generated and deployed to GitHub Pages.

## Step 6: View Your Report

After the weekly workflow completes, your report is available at:

```
https://YOUR_USERNAME.github.io/weekly-report/
```

## Generating a Report Manually

After setup, daily fetches run automatically. To generate a weekly report anytime:

1. Go to your repository's **Actions** tab
2. Click **Weekly Report**
3. Click **Run workflow**
4. Optionally set the `date` input to target a specific week (format: `YYYY-MM-DD`)

The report will be built and deployed to GitHub Pages within a few minutes.

## Configuration Reference

### Workflow Environment Variables

Set these in the `env:` block of your workflow:

| Variable | Default | Description |
|---|---|---|
| `SITE_TITLE` | `Dev\nPulse` | Site title in the header and hero section |
| `BASE_URL` | (auto-derived) | Override if using a custom domain |

### Action Inputs

See the full list of inputs in [action.yml](../action.yml).

### Custom Domain

By default, the base URL is derived from your repository name:

```
https://YOUR_USERNAME.github.io/REPO_NAME
```

If you use a custom domain:

1. Add a `CNAME` file (the render command generates it automatically for custom domains)
2. Configure the custom domain in **Settings > Pages > Custom domain**
3. Add `BASE_URL` to your workflow env:

```yaml
env:
  SITE_TITLE: 'My Reports'
  BASE_URL: 'https://reports.example.com'
```

## Supported Languages

Set the `language` input in your workflow:

| Code | Language |
|---|---|
| `en` | English |
| `ja` | Japanese (日本語) |
| `zh-CN` | Chinese Simplified (简体中文) |
| `zh-TW` | Chinese Traditional (繁體中文) |
| `ko` | Korean (한국어) |
| `es` | Spanish (Español) |
| `fr` | French (Français) |
| `de` | German (Deutsch) |
| `pt` | Portuguese (Português) |
| `ru` | Russian (Русский) |

## Troubleshooting

### Workflow fails with "permission denied"

Make sure your workflow has the required permissions:

```yaml
permissions:
  contents: write
  pages: write
```

### LLM generation fails

LLM errors will cause the workflow to fail. Check:

- Is the API key set correctly as a repository secret?
- Is the model name correct? Check the provider's models page.
- Are you within the provider's rate limits?

### GitHub Pages not showing

- Make sure Pages is enabled in Settings > Pages
- Check that the `gh-pages` branch exists (created on first deploy)
- Wait a few minutes for the first deployment to propagate
