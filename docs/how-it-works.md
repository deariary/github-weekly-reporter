# How It Works

## Overview

GitHub Weekly Reporter runs two automated workflows in your repository:

1. **Daily Fetch** runs every night, collecting your GitHub activity
2. **Weekly Report** runs every Monday, turning that activity into a report

```
Daily (Mon-Sun, midnight):

  GitHub Events API ──> daily-fetch ──> events.yaml (accumulated)

Weekly (Monday):

  events.yaml ──────────────────────┐
  GitHub Search API (PR discovery) ─┼──> weekly-fetch ──> github-data.yaml
  GitHub GraphQL API (stats) ───────┘
                                         │
                                         ▼
                                    generate ──> LLM ──> llm-data.yaml
                                         │
                                         ▼
                                    render ──> HTML, OG images, sitemap
                                         │
                                         ▼
                                    deploy ──> gh-pages branch
```

## Why Daily Fetch Exists

GitHub's Events API only keeps the most recent 300 events per user, and drops events older than 90 days. Active developers can easily produce more than 300 events in a week.

The daily fetch runs every night to capture events before they expire. Each run merges new events with previously saved ones, so nothing is lost even if the API window slides forward.

If you skip a few days of daily fetching, the weekly step compensates by searching the GitHub Search API for pull requests. But other activity (pushes, reviews, releases) can only be captured through the Events API, so consistent daily fetching gives the most complete report.

Running daily-fetch multiple times in a day is safe. Events are deduplicated by ID.

## The Weekly Pipeline

The Monday workflow runs four steps in sequence. Each step reads the previous step's output, so they must run in order. If any step fails, you can re-run from that step without repeating earlier ones.

### 1. Weekly Fetch

Builds the complete dataset for the week:

- Reads the accumulated daily events
- Searches GitHub for pull requests you authored or reviewed (catches PRs the daily fetch may have missed)
- Fetches detailed metadata for each PR (title, description, lines changed, labels)
- Queries your contribution stats via GraphQL (total commits, daily commit counts for the heatmap, PR review count)

Writes everything to `github-data.yaml`.

### 2. Generate

Sends the week's data to your chosen LLM provider and gets back a structured narrative:

- Title and subtitle for the report
- A multi-paragraph overview of the week
- Themed summaries (e.g., "what you built", "code reviews", "patterns")
- Highlights linking to specific PRs or releases

The data is preprocessed to fit within token limits (up to 20 PRs, 40 events, 8 repositories). The LLM returns YAML, which is parsed and saved as `llm-data.yaml`.

This is the only step that calls an external LLM API. It makes one API call per week.

### 3. Render

Combines the GitHub data and AI content into static files:

- A self-contained HTML report (all CSS inlined, no JavaScript)
- An OG image for social media sharing
- An index page listing all past reports
- A sitemap and robots.txt for search engines
- A CNAME file if you use a custom domain

The render step also re-renders the previous week's report to add a "next week" navigation link.

### 4. Deploy

Pushes the output to the `gh-pages` branch of your repository. Files from previous weeks are preserved, so all past reports remain accessible.

GitHub Pages serves the site from this branch.

## Which Week Does the Report Cover?

Always the **previous** ISO week (Monday through Sunday). When the workflow runs on Monday, it reports on the week that just ended.

For example, if the workflow runs on Monday April 6, 2026, the report covers March 30 through April 5 (ISO week 14) and is published at `2026/W14/`.

To generate a report for a different week, trigger the workflow manually and set the `date` input to any date within the target week.

## Data Storage

All data is stored in your repository under the `data/` directory:

```
data/
  2026/
    W14/
      events.yaml         # Daily events, accumulated throughout the week
      github-data.yaml    # Complete weekly dataset
      llm-data.yaml       # AI-generated content
    W15/
      events.yaml         # Events for the current week (still accumulating)
```

This data is committed to the main branch by the GitHub Action. It serves as an audit trail and means old reports can be re-rendered without re-fetching expired data.

Storage grows slowly: each week adds a few hundred KB. A year of reports is roughly 10-50 MB.

## What Data Is Collected

The report includes only your **public** GitHub activity:

- Push events (commit messages, branch names)
- Pull request events (opened, merged, closed)
- Code review events (approved, changes requested, commented)
- Issue events (opened, closed)
- Release events (published)
- Contribution calendar (daily commit counts, including private contributions if enabled in your GitHub settings)
- PR details: title, description (truncated to 300 characters), lines changed, labels

Private repository activity is not collected through the Events API, regardless of your token permissions.
