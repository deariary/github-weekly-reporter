# Customization

After running `setup`, all configuration lives in two workflow files in your repository:

- `.github/workflows/daily-fetch.yml`: schedule and data collection
- `.github/workflows/weekly-report.yml`: report generation, rendering, and deployment

Edit these files directly to change settings. There is no re-run setup command; just edit the YAML.

## Site Title

The title appears in the header, hero section, index page, and OG images.

Edit `weekly-report.yml`:

```yaml
env:
  SITE_TITLE: 'My Weekly Report'
```

The default is `Dev\nPulse`. Use `\n` for a line break in the hero section.

## Language

Controls UI text, date formatting, font, and the language the AI writes in.

Edit **both** workflow files, in the `with:` block:

```yaml
with:
  language: 'ja'
```

Supported values: `en`, `ja`, `zh-CN`, `zh-TW`, `ko`, `es`, `fr`, `de`, `pt`, `ru`.

Both files should use the same language for consistency.

## Timezone

Controls when the cron schedule runs and how dates are formatted.

Two things must be updated:

1. The `timezone` input in **both** workflow files:

   ```yaml
   with:
     timezone: 'Asia/Tokyo'
   ```

2. The `cron:` schedule in **both** workflow files. The cron runs in UTC, so convert your local midnight:

   | Timezone | Daily Cron (midnight local) |
   |---|---|
   | UTC | `0 0 * * *` |
   | America/New_York (UTC-5) | `0 5 * * *` |
   | America/Los_Angeles (UTC-8) | `0 8 * * *` |
   | Europe/Berlin (UTC+1/+2) | `0 23 * * *` or `0 22 * * *` |
   | Asia/Tokyo (UTC+9) | `0 15 * * *` |
   | Asia/Shanghai (UTC+8) | `0 16 * * *` |

   The weekly cron should be 1 hour after the daily cron, on the UTC day-of-week that corresponds to Monday in your timezone. For example, if the daily cron is `0 15 * * *` (Asia/Tokyo), the weekly cron is `0 16 * * 0` (Sunday in UTC = Monday 01:00 in JST).

## LLM Provider and Model

To switch providers, update three things in `weekly-report.yml`:

1. The `llm-provider` value
2. The `llm-model` value
3. The API key input name and corresponding secret

```yaml
with:
  llm-provider: 'groq'
  llm-model: 'llama-3.3-70b-versatile'
  groq-api-key: ${{ secrets.GROQ_API_KEY }}
```

Then add the new API key as a repository secret: **Settings > Secrets and variables > Actions > New repository secret**.

API key input names per provider:

| Provider | Input Name | Secret Name |
|---|---|---|
| OpenRouter | `openrouter-api-key` | `OPENROUTER_API_KEY` |
| Groq | `groq-api-key` | `GROQ_API_KEY` |
| Google Gemini | `gemini-api-key` | `GEMINI_API_KEY` |
| OpenAI | `openai-api-key` | `OPENAI_API_KEY` |
| Anthropic | `anthropic-api-key` | `ANTHROPIC_API_KEY` |
| Grok (xAI) | `grok-api-key` | `GROK_API_KEY` |

To change only the model (same provider), just update `llm-model`. No secret changes needed.

## Custom Domain

By default, reports are hosted at `https://<user>.github.io/<repo>/`.

To use a custom domain:

1. Add `BASE_URL` to the `env:` block in `weekly-report.yml`:

   ```yaml
   env:
     SITE_TITLE: 'My Reports'
     BASE_URL: 'https://reports.example.com'
   ```

2. Configure the domain in your repository: **Settings > Pages > Custom domain**.

3. Set up DNS records pointing to GitHub Pages ([GitHub docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)).

The render step automatically generates a `CNAME` file when the base URL is not a `.github.io` domain.

## Schedule

Both workflows use `workflow_dispatch`, so you can always trigger them manually from the **Actions** tab.

To change the automatic schedule, edit the `cron:` line. GitHub Actions cron uses UTC and follows standard cron syntax:

```
# ┌───── minute (0-59)
# │ ┌───── hour (0-23)
# │ │ ┌───── day of month (1-31)
# │ │ │ ┌───── month (1-12)
# │ │ │ │ ┌───── day of week (0-6, 0=Sunday)
# │ │ │ │ │
# * * * * *
```

The daily fetch should run every day. The weekly report should run once a week (typically Monday), after the daily fetch completes.

## Pinning Versions

Pin the action to a commit SHA and the CLI to a specific version for better security and reproducibility. See [Security: Pinning Versions](security.md#pinning-versions) for details.

## Theme

Four built-in themes are available, each with light/dark mode:

| Theme | Description |
|---|---|
| `brutalist` | Bold, high-contrast dark theme with monospace typography (default) |
| `minimal` | Clean lines, generous whitespace, understated elegance |
| `editorial` | Horizontal-scroll magazine with serif typography and column layout |
| `swiss` | International Typographic Style with asymmetric grid, Space Grotesk, and geometric motifs |

Edit `weekly-report.yml`:

```yaml
with:
  theme: 'editorial'
```

The `setup` command also lets you pick a theme interactively.

## What Cannot Be Customized

- **Deploy branch**: always deploys to `gh-pages`.
- **Report structure**: the HTML layout and sections are fixed per theme.
- **LLM parameters**: `max_tokens` (16384) and `temperature` (0.7) are not configurable.
