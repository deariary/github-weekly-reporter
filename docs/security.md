# Security

Best practices for keeping your GitHub Weekly Reporter setup secure.

## PAT Permissions

The `setup` command and the GitHub Action (runtime) need different levels of access.

### For the GitHub Action (runtime)

The Action reads your public activity and pushes to the `gh-pages` branch. This is all the PAT stored in the `GH_PAT` secret needs:

| | Fine-grained PAT | Classic PAT |
|---|---|---|
| Repository access | Your report repository only | - |
| Permissions / Scopes | `Contents: Read & Write` | `repo` |

Fine-grained PATs always include read-only access to all public repositories on GitHub, so selecting only the report repository is enough. `Contents: Write` is needed to push to the `gh-pages` branch.

### For `npx github-weekly-reporter setup`

The setup command creates a repository, stores secrets, adds workflow files, enables Pages, and triggers the first run. It needs broader permissions:

| | Fine-grained PAT | Classic PAT |
|---|---|---|
| Repository access | `All repositories` | - |
| Permissions / Scopes | `Actions`, `Administration`, `Contents`, `Pages`, `Secrets`, `Workflows` (all Read & Write) | `repo` + `workflow` |

After setup completes, you can replace the PAT stored in the `GH_PAT` secret with a runtime-only token. The setup-level permissions are not needed again unless you re-run the setup command.

### Why a PAT instead of GITHUB_TOKEN?

The `GITHUB_TOKEN` provided automatically by GitHub Actions only has access to the current repository. This tool reads your activity across all public repositories (events, PRs, contributions), which requires a personal access token.

## Pinning Versions

### Action Version

By default, the setup command and manual-setup examples reference the action with `@main`. For better security and reproducibility, pin the action to a specific commit SHA:

```yaml
# Before (tracks the main branch, picks up any future change automatically):
- uses: deariary/github-weekly-reporter@main

# After (pinned to a specific commit):
- uses: deariary/github-weekly-reporter@<full-commit-sha>   # v0.8.5
```

To find the SHA for a release, visit the [releases page](https://github.com/deariary/github-weekly-reporter/releases) and copy the full commit hash of the tagged commit. Adding a trailing comment with the version tag makes it easy to see which version you are on.

Dependabot and Renovate can automate SHA updates when new versions are released.

### CLI Version

By default, workflows use the latest version of the npm package (`npx github-weekly-reporter@latest`). To pin a specific version, add the `version` input:

```yaml
with:
  version: '0.8.5'
```
