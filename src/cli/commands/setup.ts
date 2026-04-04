// setup command: interactive one-command setup for GitHub Weekly Reporter

import { Command } from "commander";
import { input, select, password, confirm } from "@inquirer/prompts";
import type { LLMProvider, Language } from "../../types.js";

// ── GitHub API helpers ───────────────────────────────────────

type GitHubHeaders = Record<string, string>;

const ghHeaders = (token: string): GitHubHeaders => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
});

const ghFetch = async (
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> =>
  fetch(`https://api.github.com${path}`, {
    method,
    headers: ghHeaders(token),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

const ghGet = (token: string, path: string) => ghFetch(token, "GET", path);
const ghPost = (token: string, path: string, body: unknown) => ghFetch(token, "POST", path, body);
const ghPut = (token: string, path: string, body: unknown) => ghFetch(token, "PUT", path, body);

// ── Token validation ─────────────────────────────────────────

const validateToken = async (
  token: string,
): Promise<{ login: string; tokenType: "classic" | "fine-grained" }> => {
  const res = await ghGet(token, "/user");
  if (res.status === 401) {
    throw new Error(
      "Invalid or expired token.\n\n" +
        "  Create a token at: https://github.com/settings/tokens\n\n" +
        "  Classic PAT scopes needed: repo, workflow\n" +
        "  Fine-grained PAT:\n" +
        "    Repository access: All repositories\n" +
        "    Permissions: Administration, Contents, Actions,\n" +
        "                 Secrets, Pages, Workflows (all Read & Write)",
    );
  }
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const { login } = (await res.json()) as { login: string };
  const scopeHeader = res.headers.get("x-oauth-scopes");

  // Fine-grained tokens do not return x-oauth-scopes header.
  // We cannot validate permissions upfront, so we validate lazily
  // when each API call is made and provide clear error messages.
  if (scopeHeader === null) {
    return { login, tokenType: "fine-grained" };
  }

  // Classic PAT: validate scopes
  const scopes = scopeHeader.split(",").map((s) => s.trim());
  const missing = ["repo", "workflow"].filter((s) => !scopes.includes(s));
  if (missing.length > 0) {
    throw new Error(
      `Token is missing required scopes: ${missing.join(", ")}\n\n` +
        "  Create a new token at: https://github.com/settings/tokens/new?scopes=repo,workflow\n" +
        "  Required scopes: repo, workflow",
    );
  }

  return { login, tokenType: "classic" };
};

// ── Secret encryption (sealed box via tweetsodium) ───────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const setRepoSecret = async (
  token: string,
  repo: string,
  name: string,
  value: string,
): Promise<boolean> => {
  const tweetsodium = await import("tweetsodium");
  const seal = tweetsodium.default.seal;

  // Retry up to 3 times with backoff (new repos may need time to propagate)
  for (let attempt = 0; attempt < 3; attempt++) {
    const keyRes = await ghGet(token, `/repos/${repo}/actions/secrets/public-key`);
    if (!keyRes.ok) {
      if (attempt < 2) {
        await sleep(3000 * (attempt + 1));
        continue;
      }
      return false;
    }

    const { key, key_id } = (await keyRes.json()) as {
      key: string;
      key_id: string;
    };
    const keyBytes = Uint8Array.from(atob(key), (c) => c.charCodeAt(0));
    const encrypted = seal(new TextEncoder().encode(value), keyBytes);
    const encryptedB64 = btoa(String.fromCharCode(...encrypted));

    const res = await ghPut(token, `/repos/${repo}/actions/secrets/${name}`, {
      encrypted_value: encryptedB64,
      key_id,
    });
    if (res.ok) return true;

    const body = await res.text().catch(() => "");
    console.log(`      Attempt ${attempt + 1}/3 failed: ${res.status} ${body.slice(0, 200)}`);

    if (attempt < 2) {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    return false;
  }
  return false;
};

// ── Constants ────────────────────────────────────────────────

const LLM_SECRET_NAMES: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  groq: "GROQ_API_KEY",
  grok: "GROK_API_KEY",
};

const LLM_API_KEY_INPUT_NAMES: Record<string, string> = {
  openai: "openai-api-key",
  anthropic: "anthropic-api-key",
  gemini: "gemini-api-key",
  openrouter: "openrouter-api-key",
  groq: "groq-api-key",
  grok: "grok-api-key",
};

const TIMEZONE_CHOICES = [
  { name: "UTC",                            value: "UTC" },
  { name: "US/Pacific (Los Angeles)",       value: "America/Los_Angeles" },
  { name: "US/Mountain (Denver)",           value: "America/Denver" },
  { name: "US/Central (Chicago)",           value: "America/Chicago" },
  { name: "US/Eastern (New York)",          value: "America/New_York" },
  { name: "Europe/London",                  value: "Europe/London" },
  { name: "Europe/Paris",                   value: "Europe/Paris" },
  { name: "Europe/Berlin",                  value: "Europe/Berlin" },
  { name: "Europe/Moscow",                  value: "Europe/Moscow" },
  { name: "Asia/Dubai",                     value: "Asia/Dubai" },
  { name: "Asia/Kolkata (India)",           value: "Asia/Kolkata" },
  { name: "Asia/Bangkok",                   value: "Asia/Bangkok" },
  { name: "Asia/Shanghai (China)",          value: "Asia/Shanghai" },
  { name: "Asia/Tokyo (Japan)",             value: "Asia/Tokyo" },
  { name: "Asia/Seoul (Korea)",             value: "Asia/Seoul" },
  { name: "Australia/Sydney",               value: "Australia/Sydney" },
  { name: "Pacific/Auckland (New Zealand)", value: "Pacific/Auckland" },
  { name: "America/Sao_Paulo (Brazil)",     value: "America/Sao_Paulo" },
];

const LANGUAGE_CHOICES: { name: string; value: Language }[] = [
  { name: "English",              value: "en" },
  { name: "Japanese (日本語)",     value: "ja" },
  { name: "Chinese Simplified (简体中文)", value: "zh-CN" },
  { name: "Chinese Traditional (繁體中文)", value: "zh-TW" },
  { name: "Korean (한국어)",       value: "ko" },
  { name: "Spanish (Español)",    value: "es" },
  { name: "French (Français)",    value: "fr" },
  { name: "German (Deutsch)",     value: "de" },
  { name: "Portuguese (Português)", value: "pt" },
  { name: "Russian (Русский)",    value: "ru" },
];

const MODEL_LIST_URLS: Record<string, string> = {
  groq: "https://console.groq.com/docs/models",
  openrouter: "https://openrouter.ai/models",
  openai: "https://platform.openai.com/docs/models",
  anthropic: "https://docs.anthropic.com/en/docs/about-claude/models",
  gemini: "https://ai.google.dev/gemini-api/docs/models",
  grok: "https://docs.x.ai/docs/models",
};

// Validate model by making a minimal API call

const validateModel = async (
  provider: LLMProvider,
  apiKey: string,
  model: string,
): Promise<{ valid: boolean; error?: string }> => {
  const openaiCompatible = (baseURL: string) =>
    fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1,
      }),
    });

  try {
    let res: Response;
    switch (provider) {
      case "openai":
        res = await openaiCompatible("https://api.openai.com/v1");
        break;
      case "groq":
        res = await openaiCompatible("https://api.groq.com/openai/v1");
        break;
      case "openrouter":
        res = await openaiCompatible("https://openrouter.ai/api/v1");
        break;
      case "grok":
        res = await openaiCompatible("https://api.x.ai/v1");
        break;
      case "anthropic":
        res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "hi" }],
            max_tokens: 1,
          }),
        });
        break;
      case "gemini":
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "hi" }] }],
              generationConfig: { maxOutputTokens: 1 },
            }),
          },
        );
        break;
      default:
        return { valid: true };
    }

    if (res.ok) return { valid: true };

    const body = await res.text();
    // 404 or "model not found" means wrong model name
    if (res.status === 404 || body.toLowerCase().includes("model")) {
      return { valid: false, error: `Model "${model}" not found (${res.status})` };
    }
    // Rate limit or other non-model errors are fine (model exists)
    if (res.status === 429) return { valid: true };
    return { valid: false, error: `API error: ${res.status} ${body.slice(0, 200)}` };
  } catch (e) {
    return { valid: false, error: `Connection error: ${e instanceof Error ? e.message : String(e)}` };
  }
};

// ── Cron calculation from timezone ───────────────────────────
// Daily fetch should run at midnight in the user's timezone.
// GitHub Actions cron is always UTC, so we calculate the offset.

const midnightCronUTC = (timezone: string): string => {
  const now = new Date();
  const utcMidnight = new Date(
    now.toLocaleString("en-US", { timeZone: "UTC" }),
  );
  const localMidnight = new Date(
    now.toLocaleString("en-US", { timeZone: timezone }),
  );
  const offsetMinutes = Math.round(
    (utcMidnight.getTime() - localMidnight.getTime()) / 60000,
  );
  const utcHour = ((offsetMinutes / 60 + 24) % 24) | 0;
  const utcMinute = ((offsetMinutes % 60) + 60) % 60;
  return `${utcMinute} ${utcHour} * * *`;
};

// ── Workflow YAML template ───────────────────────────────────

const buildWorkflow = (opts: {
  username: string;
  language: Language;
  timezone: string;
  siteTitle: string;
  llmProvider?: LLMProvider;
  llmModel?: string;
  llmSecretName?: string;
}): string => {
  const cron = midnightCronUTC(opts.timezone);
  const llmInputs =
    opts.llmProvider && opts.llmModel && opts.llmSecretName
      ? `          llm-provider: '${opts.llmProvider}'
          llm-model: '${opts.llmModel}'
          ${LLM_API_KEY_INPUT_NAMES[opts.llmProvider]}: \${{ secrets.${opts.llmSecretName} }}`
      : "";

  return `# Generated by: github-weekly-reporter setup
# Docs: https://github.com/deariary/github-weekly-reporter

name: Weekly Report

on:
  schedule:
    - cron: '${cron}'  # midnight ${opts.timezone}
  workflow_dispatch:
    inputs:
      mode:
        description: 'Run mode'
        type: choice
        options: [daily, weekly]
        default: daily

permissions:
  contents: write
  pages: write

env:
  SITE_TITLE: '${opts.siteTitle}'

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: deariary/github-weekly-reporter@main
        with:
          github-token: \${{ secrets.GH_PAT }}
          username: '${opts.username}'
          mode: \${{ github.event.inputs.mode || 'daily' }}
          language: '${opts.language}'
          timezone: '${opts.timezone}'
${llmInputs}
`;
};

// ── README template ──────────────────────────────────────────

const buildReadme = (opts: {
  siteTitle: string;
  username: string;
  repo: string;
  pagesUrl: string;
  language: Language;
  timezone: string;
  llmProvider?: LLMProvider;
  llmModel?: string;
}): string => `# ${opts.siteTitle}

Weekly GitHub activity reports for [@${opts.username}](https://github.com/${opts.username}), powered by [github-weekly-reporter](https://github.com/deariary/github-weekly-reporter).

## Live Reports

${opts.pagesUrl}

## How It Works

1. **Daily** (automatic): A scheduled workflow collects your GitHub events at midnight (${opts.timezone}).
2. **Weekly** (manual): Trigger the workflow with \`mode: weekly\` from the [Actions tab](https://github.com/${opts.repo}/actions) to generate a full report${opts.llmProvider ? " with AI narrative" : ""}.
3. The report is deployed to GitHub Pages automatically.

## Configuration

Edit \`.github/workflows/weekly-report.yml\` to change:

| Setting | Current | Description |
|---------|---------|-------------|
| \`username\` | \`${opts.username}\` | GitHub user to report on |
| \`language\` | \`${opts.language}\` | Report language (en, ja, zh-CN, zh-TW, ko, es, fr, de, pt, ru) |
| \`timezone\` | \`${opts.timezone}\` | IANA timezone for date calculations |
| \`SITE_TITLE\` | \`${opts.siteTitle}\` | Site title in the header and hero |
${opts.llmProvider ? `| \`llm-provider\` | \`${opts.llmProvider}\` | LLM provider for AI narrative |\n| \`llm-model\` | \`${opts.llmModel}\` | Model name |\n` : ""}
## Base URL

The report's canonical URL, OG images, and sitemap are generated using \`BASE_URL\`.
By default this is derived automatically from the repository name:

\`\`\`
https://${opts.repo.split("/")[0]}.github.io/${opts.repo.split("/")[1]}
\`\`\`

If you use a **custom domain**, add \`BASE_URL\` to the workflow env:

\`\`\`yaml
env:
  SITE_TITLE: '${opts.siteTitle}'
  BASE_URL: 'https://your-custom-domain.com'
\`\`\`

Then configure the custom domain in **Settings > Pages > Custom domain**.

## Changing the LLM API Key

1. Go to **Settings > Secrets and variables > Actions**
2. Update the \`${opts.llmProvider ? LLM_SECRET_NAMES[opts.llmProvider] : "LLM_API_KEY"}\` secret

## Manual Report Generation

Go to [Actions](https://github.com/${opts.repo}/actions), click **Weekly Report**, then **Run workflow** with \`mode: weekly\`.
`;

// ── Interactive prompts ──────────────────────────────────────

type SetupConfig = {
  token: string;
  username: string;
  repo: string;
  siteTitle: string;
  language: Language;
  timezone: string;
  llmProvider?: LLMProvider;
  llmApiKey?: string;
  llmModel?: string;
};

const collectInputs = async (cliRepo?: string): Promise<SetupConfig> => {
  console.log("\n  GitHub Weekly Reporter - Interactive Setup\n");
  console.log("  This will create a repository, add a workflow, and configure");
  console.log("  everything you need for automatic weekly reports.\n");

  // 1. Token
  console.log("  A personal access token (PAT) is required.\n");
  console.log("  Classic PAT (https://github.com/settings/tokens/new?scopes=repo,workflow):");
  console.log("    Scopes: repo, workflow\n");
  console.log("  Fine-grained PAT (https://github.com/settings/personal-access-tokens/new):");
  console.log("    Repository access: All repositories");
  console.log("    Permissions: Administration, Contents, Actions,");
  console.log("                 Secrets, Pages, Workflows (all Read & Write)\n");

  const token = await password({
    message: "GitHub personal access token:",
    validate: (v) => (v.length > 0 ? true : "Token is required"),
  });

  console.log("\n  Validating token...");
  const { login } = await validateToken(token);
  console.log(`  Authenticated as ${login}\n`);

  // 2. Username
  const username = await input({
    message: "GitHub username to report on:",
    default: login,
  });

  // 3. Repository
  const repo = cliRepo ?? await input({
    message: "Repository name (will be created if it doesn't exist):",
    default: "weekly-report",
    validate: (v) =>
      /^[a-zA-Z0-9._-]+$/.test(v) ? true : "Invalid repository name",
  });

  // 4. Site title
  const siteTitle = await input({
    message: "Site title (shown in header and hero):",
    default: "Dev\nPulse",
  });

  // 5. Language
  const language = (await select({
    message: "Report language:",
    choices: LANGUAGE_CHOICES,
    default: "en",
  })) as Language;

  // 6. Timezone
  const timezone = (await select({
    message: "Timezone (for scheduling and date calculations):",
    choices: [
      ...TIMEZONE_CHOICES,
      { name: "Other (enter manually)", value: "__other__" },
    ],
    default: "UTC",
  })) as string;

  const resolvedTimezone =
    timezone === "__other__"
      ? await input({
          message: "IANA timezone (e.g. Asia/Tokyo, Europe/London):",
          validate: (v) => {
            try {
              Intl.DateTimeFormat(undefined, { timeZone: v });
              return true;
            } catch {
              return "Invalid timezone. See: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones";
            }
          },
        })
      : timezone;

  // 7. LLM (required for report generation)
  console.log("\n  An LLM provider is required for report generation.");
  console.log("  Groq and OpenRouter offer generous free tiers (no credit card required).\n");

  let llmProvider: LLMProvider | undefined;
  let llmApiKey: string | undefined;
  let llmModel: string | undefined;

  {
    llmProvider = (await select({
      message: "LLM provider:",
      choices: [
        { name: "Groq        - Free tier, fast inference (recommended)", value: "groq" },
        { name: "OpenRouter   - Free tier, 25+ free models",            value: "openrouter" },
        { name: "Google Gemini - Free tier available",                   value: "gemini" },
        { name: "OpenAI       - Paid",                                   value: "openai" },
        { name: "Anthropic    - Paid",                                   value: "anthropic" },
        { name: "Grok (xAI)   - Paid",                                  value: "grok" },
      ],
    })) as LLMProvider;

    const keyUrls: Record<string, string> = {
      groq: "https://console.groq.com/keys",
      openrouter: "https://openrouter.ai/settings/keys",
      openai: "https://platform.openai.com/api-keys",
      anthropic: "https://console.anthropic.com/settings/keys",
      gemini: "https://aistudio.google.com/apikey",
      grok: "https://console.x.ai",
    };

    console.log(`\n  Get your API key at: ${keyUrls[llmProvider]}\n`);

    llmApiKey = await password({
      message: `${llmProvider} API key:`,
      validate: (v) => (v.length > 0 ? true : "API key is required"),
    });

    const modelListUrl = MODEL_LIST_URLS[llmProvider] ?? "";
    console.log(`\n  Available models: ${modelListUrl}\n`);

    let modelValidated = false;
    while (!modelValidated) {
      llmModel = await input({
        message: "Model name:",
        validate: (v) => (v.length > 0 ? true : "Model name is required"),
      });

      console.log("  Validating model...");
      const result = await validateModel(llmProvider, llmApiKey, llmModel);
      if (result.valid) {
        console.log("  Model OK.\n");
        modelValidated = true;
      } else {
        console.log(`  ${result.error}`);
        console.log(`  Check available models at: ${modelListUrl}\n`);
        const retry = await confirm({ message: "Try a different model?", default: true });
        if (!retry) {
          throw new Error("Setup cancelled: invalid model name.");
        }
      }
    }
  }

  return {
    token,
    username,
    repo,
    siteTitle,
    language,
    timezone: resolvedTimezone,
    llmProvider,
    llmApiKey,
    llmModel,
  };
};

// ── Setup actions ────────────────────────────────────────────

const step = (msg: string) => console.log(`\n  [*] ${msg}`);
const ok = (msg: string) => console.log(`      ${msg}`);

const ensureRepo = async (
  token: string,
  fullRepo: string,
): Promise<boolean> => {
  const res = await ghGet(token, `/repos/${fullRepo}`);
  if (res.ok) return false;

  const [owner, name] = fullRepo.split("/");
  const { login } = (await (await ghGet(token, "/user")).json()) as {
    login: string;
  };

  const createRes =
    owner === login
      ? await ghPost(token, "/user/repos", {
          name,
          auto_init: true,
          private: false,
          description: "Weekly GitHub activity reports",
        })
      : await ghPost(token, `/orgs/${owner}/repos`, {
          name,
          auto_init: true,
          private: false,
          description: "Weekly GitHub activity reports",
        });

  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(
      `Failed to create ${fullRepo}: ${createRes.status}\n  ${body}`,
    );
  }

  // Wait for repo to be ready
  await new Promise((r) => setTimeout(r, 2000));
  return true;
};

const addFileToRepo = async (
  token: string,
  repo: string,
  path: string,
  content: string,
  message: string,
): Promise<void> => {
  const existing = await ghGet(token, `/repos/${repo}/contents/${path}`);
  const sha = existing.ok
    ? ((await existing.json()) as { sha: string }).sha
    : undefined;

  const res = await ghPut(token, `/repos/${repo}/contents/${path}`, {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    ...(sha ? { sha } : {}),
  });
  if (!res.ok) {
    throw new Error(`Failed to add ${path}: ${res.status}`);
  }
};

const enablePages = async (
  token: string,
  repo: string,
): Promise<string> => {
  // Ensure gh-pages branch exists
  const mainRef = await ghGet(token, `/repos/${repo}/git/ref/heads/main`);
  if (!mainRef.ok) throw new Error("Cannot find main branch");
  const { object } = (await mainRef.json()) as { object: { sha: string } };

  const ghPagesRef = await ghGet(
    token,
    `/repos/${repo}/git/ref/heads/gh-pages`,
  );
  if (!ghPagesRef.ok) {
    const createRef = await ghPost(token, `/repos/${repo}/git/refs`, {
      ref: "refs/heads/gh-pages",
      sha: object.sha,
    });
    if (!createRef.ok) {
      throw new Error("Failed to create gh-pages branch");
    }
  }

  // Enable Pages (may already be enabled)
  await ghPost(token, `/repos/${repo}/pages`, {
    source: { branch: "gh-pages", path: "/" },
  });

  const [owner, name] = repo.split("/");
  return `https://${owner}.github.io/${name}`;
};

const run = async (cliRepo?: string): Promise<void> => {
  const config = await collectInputs(cliRepo);
  const fullRepo = config.repo.includes("/")
    ? config.repo
    : `${config.username}/${config.repo}`;
  const pagesUrl = `https://${fullRepo.split("/")[0]}.github.io/${fullRepo.split("/")[1]}`;
  const cron = midnightCronUTC(config.timezone);

  // Confirmation
  console.log("\n  ── Setup Summary ─────────────────────────────");
  console.log(`  Repository:    ${fullRepo}`);
  console.log(`  Username:      ${config.username}`);
  console.log(`  Site title:    ${config.siteTitle}`);
  console.log(`  Language:      ${config.language}`);
  console.log(`  Timezone:      ${config.timezone}`);
  console.log(`  Schedule:      Daily at midnight (cron: ${cron})`);
  if (config.llmProvider && config.llmModel) {
    console.log(`  LLM provider:  ${config.llmProvider}`);
    console.log(`  LLM model:     ${config.llmModel}`);
  } else {
    console.log("  LLM:           Not configured");
  }
  console.log(`  Pages URL:     ${pagesUrl}`);
  console.log("  ──────────────────────────────────────────────\n");

  const proceed = await confirm({ message: "Proceed with setup?", default: true });
  if (!proceed) {
    console.log("\n  Setup cancelled.\n");
    return;
  }

  // 1. Repository
  step("Setting up repository...");
  const created = await ensureRepo(config.token, fullRepo);
  ok(created ? `Created ${fullRepo}` : `Using existing ${fullRepo}`);

  // 2. PAT secret (needed to read activity across all repos)
  step("Setting secret GH_PAT...");
  const patOk = await setRepoSecret(config.token, fullRepo, "GH_PAT", config.token);
  if (!patOk) {
    throw new Error(
      "Failed to set GH_PAT secret.\n\n" +
        "  This is required for the workflow to read activity across all your repos.\n" +
        "  Possible causes:\n" +
        "    - Fine-grained PAT: make sure 'Secrets: Read and write' permission is granted\n" +
        "      and 'Repository access' is set to 'All repositories'\n" +
        "    - Classic PAT: make sure 'repo' scope is granted\n\n" +
        `  You can also set it manually at:\n    https://github.com/${fullRepo}/settings/secrets/actions`,
    );
  }
  ok("GH_PAT configured.");

  // 3. LLM secret
  if (config.llmProvider && config.llmApiKey) {
    const secretName = LLM_SECRET_NAMES[config.llmProvider];
    step(`Setting secret ${secretName}...`);
    const llmOk = await setRepoSecret(config.token, fullRepo, secretName, config.llmApiKey);
    if (!llmOk) {
      throw new Error(
        `Failed to set ${secretName} secret.\n\n` +
          "  This is required for AI narrative generation.\n" +
          `  You can set it manually at:\n    https://github.com/${fullRepo}/settings/secrets/actions`,
      );
    }
    ok("Secret configured.");
  }

  // 3. Workflow
  step("Adding workflow...");
  const workflow = buildWorkflow({
    username: config.username,
    language: config.language,
    timezone: config.timezone,
    siteTitle: config.siteTitle,
    llmProvider: config.llmProvider,
    llmModel: config.llmModel,
    llmSecretName: config.llmProvider
      ? LLM_SECRET_NAMES[config.llmProvider]
      : undefined,
  });
  await addFileToRepo(
    config.token,
    fullRepo,
    ".github/workflows/weekly-report.yml",
    workflow,
    "chore: add weekly report workflow",
  );
  ok("Workflow added.");

  // 4. README
  step("Adding README...");
  const readme = buildReadme({
    siteTitle: config.siteTitle,
    username: config.username,
    repo: fullRepo,
    pagesUrl,
    language: config.language,
    timezone: config.timezone,
    llmProvider: config.llmProvider,
    llmModel: config.llmModel,
  });
  await addFileToRepo(
    config.token,
    fullRepo,
    "README.md",
    readme,
    "docs: add README with configuration guide",
  );
  ok("README added.");

  // 5. GitHub Pages
  step("Enabling GitHub Pages...");
  try {
    const url = await enablePages(config.token, fullRepo);
    ok(`Pages enabled: ${url}`);
  } catch {
    ok("Pages may already be enabled or require manual setup.");
    ok(`Enable at: https://github.com/${fullRepo}/settings/pages`);
  }

  // 6. Trigger first weekly report
  step("Generating first weekly report...");
  const dispatchRes = await ghPost(
    config.token,
    `/repos/${fullRepo}/actions/workflows/weekly-report.yml/dispatches`,
    { ref: "main", inputs: { mode: "weekly" } },
  );
  if (dispatchRes.ok) {
    ok("Weekly report workflow triggered.");
    ok("This will take a few minutes. Check progress at:");
    ok(`https://github.com/${fullRepo}/actions`);
  } else {
    ok("Could not auto-trigger. Run manually from the Actions tab:");
    ok(`https://github.com/${fullRepo}/actions`);
    ok('Select mode: "weekly" and click "Run workflow".');
  }

  // Done
  console.log(`
  ──────────────────────────────────────────────
  Setup complete!
  ──────────────────────────────────────────────

  Repository:  https://github.com/${fullRepo}
  Reports:     ${pagesUrl}
  Actions:     https://github.com/${fullRepo}/actions

  Your first weekly report is being generated now.
  Daily fetches will run automatically at midnight ${config.timezone}.

  To change settings, edit:
    .github/workflows/weekly-report.yml
`);


};

// ── Command registration ─────────────────────────────────────

export const registerSetup = (program: Command): void => {
  program
    .command("setup")
    .description(
      "Interactive setup: create repo, add workflow, configure secrets, enable Pages",
    )
    .option(
      "--repo <owner/repo>",
      "Use existing repository (skip repo creation prompt)",
    )
    .action(async (opts: { repo?: string }) => {
      try {
        await run(opts.repo);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`\n  Error: ${msg}\n`);
        process.exit(1);
      }
    });
};
