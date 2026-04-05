# FAQ

## Cost and Plans

### Is this completely free?

Yes. On a public repository, every component is free:

- **GitHub Actions**: public repos have unlimited free minutes. This tool uses roughly 80 minutes/month (daily fetch runs ~2 min/day, weekly report runs ~5 min/week).
- **LLM**: OpenRouter, Groq, and Google Gemini all offer free tiers. The tool makes one LLM call per week.
- **GitHub Pages**: free hosting for public repos.

### Does it work on a private repository?

Yes, but with caveats:

- GitHub Free gives 2,000 Actions minutes/month for private repos. This tool uses about 80, so that is fine.
- GitHub Pages on private repos requires a paid GitHub plan (Pro, Team, or Enterprise).

### How much does a paid LLM cost?

Roughly **$0.10-0.35/month**. Each report is a single LLM call with about 4-8K tokens. At OpenAI or Anthropic pricing, that is a few cents per report, four reports per month.

### Which LLM provider should I pick?

**OpenRouter** is the default recommendation. It offers 25+ free models with no credit card required. **Groq** is the second choice for its generous free tier and fast inference.

## Privacy

### Does the report include private repository activity?

No. The tool only collects public events from the GitHub Events API. Commits, PRs, and reviews from private repositories are not included, regardless of your token permissions.

### What data is sent to the LLM provider?

A summary of your public GitHub activity for the week: commit counts, PR titles and descriptions, review activity, and repository names. This is sent as a single prompt to generate the narrative.

No telemetry, analytics, or tracking is included in the tool or the generated reports.

### Are the reports public?

Yes, by default. The setup command creates a public repository and deploys to GitHub Pages. The generated HTML includes `robots.txt` with `Allow: /` and a `sitemap.xml` for search engines.

If you want private reports, you can run the CLI locally without the `deploy` step to generate HTML files on your machine.

## How It Works

### What is the daily fetch for?

The daily fetch runs at midnight and collects **yesterday's** GitHub activity events. GitHub's Events API only retains the most recent 300 events per user, so fetching daily ensures nothing is lost for active users. Events are stored in the ISO week folder that the day belongs to (e.g., Sunday's events go into the previous week's folder).

Running daily-fetch multiple times in a day is safe. Events are deduplicated by ID.

### What does the weekly report do?

The weekly report runs four steps in sequence:

1. **weekly-fetch**: collects the full week's data (accumulated events + PR search + contribution stats)
2. **generate**: sends the data to an LLM and gets back a narrative summary
3. **render**: produces the HTML report, OG images, sitemap, and index page
4. **deploy**: pushes everything to the `gh-pages` branch

### Which week does the report cover?

Always the **previous** ISO week (Monday to Sunday). If you run the workflow on Monday, it covers the week that just ended. This is by design: the tool waits for the week to finish before summarizing it.

Use the `--date` flag (or the `date` workflow input) to target a specific week. The date can be any day within the target week.

### Can I regenerate a past report?

Yes. Trigger the Weekly Report workflow manually and set the `date` input to any date within the target week (format: `YYYY-MM-DD`). The daily event data must still be in the `data/` directory.

## Limitations

### Some PRs or events are missing

The GitHub Events API has a hard limit of 300 events. If you generate more than 300 public events between daily fetches, some will be lost. The weekly-fetch partially compensates by searching for PRs via the GitHub Search API, but other event types cannot be recovered.

Run the daily fetch consistently to minimize data loss.

### Issues always show 0

Issue collection is not yet implemented. The `issues` field in the report data is always empty. This is a known limitation.

### LLM generation sometimes fails

There is no retry logic for LLM calls. If the provider is down, rate-limited, or the model returns unparseable output, the workflow fails. Re-trigger the Weekly Report workflow manually to try again.

### The default GITHUB_TOKEN does not work

The `GITHUB_TOKEN` provided automatically by GitHub Actions only has access to the current repository. This tool needs to read your activity across all repositories, which requires a personal access token (PAT) stored as the `GH_PAT` secret.

## Cleanup

### How do I stop using this tool?

1. Delete or disable the two workflow files (`daily-fetch.yml` and `weekly-report.yml`)
2. Optionally delete the `data/` directory from the repository
3. Delete the `gh-pages` branch to remove the published reports
4. Revoke the PAT and delete the repository secrets (`GH_PAT` and the LLM API key)

There is no external state or database. Everything is contained in the repository.

### Does data accumulate over time?

Yes, but slowly. Each week adds a few hundred KB of YAML data and one HTML report. Over a year (~52 weeks), expect roughly 10-50 MB. This is well within GitHub's repository and Pages limits.
