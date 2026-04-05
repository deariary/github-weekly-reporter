# Troubleshooting

## Workflow Failures

### "GitHub token required" or "GitHub username required"

The `GH_PAT` secret is not set in the repository. The default `GITHUB_TOKEN` provided by GitHub Actions only has access to the current repository and cannot collect your activity across all repos.

**Fix:** Add a PAT as a repository secret named `GH_PAT` in **Settings > Secrets and variables > Actions**. See [What You Need](../README.md#what-you-need) for token requirements.

### "LLM provider required" / "LLM model required" / "LLM API key required"

The weekly report workflow is missing the LLM configuration. All three are required for the `generate` step.

**Fix:** Edit `.github/workflows/weekly-report.yml` and make sure these inputs are set:

```yaml
with:
  llm-provider: 'openrouter'
  llm-model: 'your-model-name'
  openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
```

The API key must be stored as a repository secret with the correct name. See [Customization](customization.md#llm-provider-and-model) for provider-specific input and secret names.

### LLM generation fails

Several things can cause this:

| Symptom | Cause | Fix |
|---|---|---|
| `401 Unauthorized` | Invalid API key | Verify the API key in your repository secrets |
| `404 model not found` | Wrong model name | Check the provider's model list and use the exact name |
| `429 rate_limit_exceeded` | Free tier limits hit | Wait and re-trigger, or switch to a different model |
| `LLM returned empty content` | Model unavailable or response filtered | Retry, or try a different model |
| YAML parse error | Model returned malformed output | Retry, or try a larger/different model |

There is no automatic retry. Re-trigger the **Weekly Report** workflow manually from the **Actions** tab.

### "permission denied" or git push fails

The workflow does not have write permissions, or two workflows ran at the same time and caused a git conflict.

**Fix:**

1. Make sure both workflow files have the correct permissions:
   ```yaml
   permissions:
     contents: write   # both workflows need this
     pages: write       # weekly report needs this
   ```

2. Avoid running daily-fetch and weekly-report at the same time. The default schedule spaces them 1 hour apart to prevent this.

### "GitHub data not found" / "LLM data not found"

The render step cannot find the data files from previous steps. This means an earlier step (fetch or generate) did not run or failed silently.

**Fix:** Go to the **Actions** tab, find the failed run, and check which step failed. The pipeline must run in order: `weekly-fetch` then `generate` then `render`.

## Report Issues

### Report shows no activity or very little data

Several possible causes:

- **First week:** The daily fetch has not accumulated enough data yet. The first report may be sparse because only the weekly search API fallback was available. Reports improve after a full week of daily fetching.
- **Daily fetch not running:** Check the **Actions** tab to confirm the Daily Fetch workflow is running daily. If the cron never fires, trigger it manually once to verify it works.
- **Only public events:** The tool only collects public GitHub activity. Commits, PRs, and reviews in private repositories will not appear.
- **300-event limit:** GitHub's Events API returns at most 300 recent events. If you are very active and the daily fetch missed a day, some events may have been lost.

### Issues count always shows 0

Issue collection is not yet implemented. The report always shows 0 for issues opened/closed. This is a known limitation.

### The report covers the wrong week

The report always covers the **previous** ISO week (Monday through Sunday). If you run the workflow on Monday April 6, it reports on March 30 through April 5.

To generate a report for a specific week, trigger the Weekly Report workflow manually and set the `date` input to any date within the target week (format: `YYYY-MM-DD`).

## GitHub Pages

### Pages not showing after first deploy

- **Wait a few minutes.** The first GitHub Pages deployment can take 2-3 minutes to propagate.
- **Check that Pages is enabled:** go to **Settings > Pages** and verify the source is set to `gh-pages` branch, `/ (root)` folder.
- **Check the `gh-pages` branch exists:** the branch is created automatically on first deploy. If the deploy step failed, the branch may not exist yet.

### Pages shows old content

GitHub Pages has a CDN cache. After a deploy, it can take a few minutes for changes to appear. Hard-refresh the page (Ctrl+Shift+R) or wait.

## Setup Command

### "Invalid or expired token"

The PAT you entered is expired, revoked, or malformed.

**Fix:** Generate a new token. For fine-grained PATs: [create one](https://github.com/settings/personal-access-tokens/new) with `All repositories` access and the required permissions. For classic PATs: [create one](https://github.com/settings/tokens/new?scopes=repo,workflow) with `repo` and `workflow` scopes.

### "Token is missing required scopes"

Your classic PAT is missing `repo` or `workflow` scope.

**Fix:** Regenerate the PAT with both scopes enabled. This check does not apply to fine-grained PATs (their permissions are validated later).

### "Failed to set GH_PAT secret"

The setup command could not store the PAT as a repository secret. This usually means the token lacks the `Secrets` permission.

**Fix:**
- **Fine-grained PAT:** ensure `Secrets: Read and write` permission is granted and `Repository access` is set to `All repositories`.
- **Classic PAT:** ensure the `repo` scope is granted.
- **Alternative:** set the secret manually at `https://github.com/<user>/<repo>/settings/secrets/actions`.

### Model validation fails

During setup, the tool makes a test API call to verify the model exists. If it fails:

- **404:** the model name is wrong. Check the provider's model list (the URL is shown in the prompt).
- **Connection error:** the provider's API is unreachable. Check your network.
- **Other API error:** the provider may be down. Try again later.

### "Pages may already be enabled or require manual setup"

This is not a fatal error. Setup continues. Enable Pages manually: go to **Settings > Pages**, select `gh-pages` branch, `/ (root)` folder.

### "Could not auto-trigger"

The first weekly report could not be triggered automatically. This happens when the workflow file has not been indexed by GitHub yet (takes a few seconds).

**Fix:** Go to **Actions > Weekly Report > Run workflow** to trigger it manually.

## CLI (Local Usage)

### "Base URL required"

The render command needs a base URL for canonical links and sitemap generation. In GitHub Actions this is auto-derived, but for local usage you must provide it.

**Fix:** `--base-url https://username.github.io/repo-name` or `export BASE_URL=https://username.github.io/repo-name`.

### "Repository required"

The deploy command needs a target repository. In GitHub Actions this is auto-set, but for local usage you must provide it.

**Fix:** `--repo owner/repo` or `export GITHUB_REPOSITORY=owner/repo`.

### "Invalid date format"

The `--date` flag requires the format `YYYY-MM-DD` with zero-padded months and days.

**Fix:** Use `--date 2026-01-05`, not `--date 2026-1-5`.
