// setup command: interactive one-command setup for GitHub Weekly Reporter

import { Command } from "commander";
import { input, select, password, confirm } from "@inquirer/prompts";
import type { LLMProvider, Language } from "../../types.js";

// GitHub API helpers using fetch (no extra dependency)

type GitHubHeaders = Record<string, string>;

const ghHeaders = (token: string): GitHubHeaders => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
});

const ghGet = async (token: string, path: string): Promise<Response> =>
  fetch(`https://api.github.com${path}`, { headers: ghHeaders(token) });

const ghPost = async (token: string, path: string, body: unknown): Promise<Response> =>
  fetch(`https://api.github.com${path}`, {
    method: "POST",
    headers: ghHeaders(token),
    body: JSON.stringify(body),
  });

const ghPut = async (token: string, path: string, body: unknown): Promise<Response> =>
  fetch(`https://api.github.com${path}`, {
    method: "PUT",
    headers: ghHeaders(token),
    body: JSON.stringify(body),
  });

// Token scope check

const checkTokenScopes = async (token: string): Promise<{ valid: boolean; missing: string[] }> => {
  const res = await ghGet(token, "/user");
  if (!res.ok) return { valid: false, missing: ["invalid token"] };

  const scopes = res.headers.get("x-oauth-scopes")?.split(",").map((s) => s.trim()) ?? [];
  const missing = ["repo", "workflow"].filter((s) => !scopes.includes(s));
  return { valid: missing.length === 0, missing };
};

// Set repository secret using sealed box encryption (tweetsodium)

const setRepoSecret = async (
  token: string,
  repo: string,
  name: string,
  value: string,
): Promise<void> => {
  const keyRes = await ghGet(token, `/repos/${repo}/actions/secrets/public-key`);
  if (!keyRes.ok) throw new Error(`Failed to get public key for ${repo}`);
  const { key, key_id } = (await keyRes.json()) as { key: string; key_id: string };

  const { seal } = await import("tweetsodium");
  const keyBytes = Uint8Array.from(atob(key), (c) => c.charCodeAt(0));
  const messageBytes = new TextEncoder().encode(value);
  const encrypted = seal(messageBytes, keyBytes);
  const encryptedB64 = btoa(String.fromCharCode(...encrypted));

  const res = await ghPut(token, `/repos/${repo}/actions/secrets/${name}`, {
    encrypted_value: encryptedB64,
    key_id,
  });
  if (!res.ok) throw new Error(`Failed to set secret ${name}: ${res.status}`);
};

// Workflow YAML template

const LLM_SECRET_NAMES: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  groq: "GROQ_API_KEY",
  grok: "GROK_API_KEY",
};

const buildWorkflow = (opts: {
  username: string;
  language: Language;
  timezone: string;
  llmProvider?: LLMProvider;
  llmModel?: string;
  llmSecretName?: string;
}): string => {
  const llmInputs = opts.llmProvider && opts.llmModel && opts.llmSecretName
    ? [
        `        llm-provider: '${opts.llmProvider}'`,
        `        llm-model: '${opts.llmModel}'`,
        `        ${opts.llmProvider === "openai" ? "openai-api-key" : opts.llmProvider === "anthropic" ? "anthropic-api-key" : opts.llmProvider === "gemini" ? "gemini-api-key" : opts.llmProvider === "openrouter" ? "openrouter-api-key" : opts.llmProvider === "groq" ? "groq-api-key" : "grok-api-key"}: \${{ secrets.${opts.llmSecretName} }}`,
      ].join("\n")
    : "";

  return `name: Weekly Report

on:
  schedule:
    - cron: '0 0 * * *'  # daily at midnight UTC
  workflow_dispatch:

permissions:
  contents: write
  pages: write

jobs:
  daily:
    if: github.event.schedule == '0 0 * * *' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: deariary/github-weekly-reporter@main
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
          username: '${opts.username}'
          mode: 'daily'
          language: '${opts.language}'
          timezone: '${opts.timezone}'

  weekly:
    if: github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: deariary/github-weekly-reporter@main
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
          username: '${opts.username}'
          mode: 'weekly'
          language: '${opts.language}'
          timezone: '${opts.timezone}'
${llmInputs}
`;
};

// Interactive prompts

type SetupConfig = {
  token: string;
  username: string;
  repo: string;
  language: Language;
  timezone: string;
  llmProvider?: LLMProvider;
  llmApiKey?: string;
  llmModel?: string;
};

const collectInputs = async (cliRepo?: string): Promise<SetupConfig> => {
  console.log("\n  GitHub Weekly Reporter Setup\n");

  const token = await password({
    message: "GitHub personal access token (repo + workflow scopes):",
  });

  console.log("  Checking token scopes...");
  const { valid, missing } = await checkTokenScopes(token);
  if (!valid) {
    throw new Error(
      `Token is missing required scopes: ${missing.join(", ")}.\n` +
        "Create a token at https://github.com/settings/tokens with 'repo' and 'workflow' scopes.",
    );
  }
  console.log("  Token OK.\n");

  const userRes = await ghGet(token, "/user");
  const userData = (await userRes.json()) as { login: string };

  const username = await input({
    message: "GitHub username:",
    default: userData.login,
  });

  const repo = cliRepo
    ? cliRepo
    : await input({
        message: "Repository name:",
        default: "weekly-report",
      });

  const language = (await select({
    message: "Report language:",
    choices: [
      { name: "English", value: "en" },
      { name: "Japanese", value: "ja" },
      { name: "Chinese (Simplified)", value: "zh-CN" },
      { name: "Korean", value: "ko" },
      { name: "Spanish", value: "es" },
      { name: "French", value: "fr" },
      { name: "German", value: "de" },
    ],
    default: "en",
  })) as Language;

  const timezone = await input({
    message: "IANA timezone:",
    default: "UTC",
  });

  const setupLlm = await confirm({
    message: "Configure LLM for AI-generated narratives?",
    default: true,
  });

  let llmProvider: LLMProvider | undefined;
  let llmApiKey: string | undefined;
  let llmModel: string | undefined;

  if (setupLlm) {
    llmProvider = (await select({
      message: "LLM provider:",
      choices: [
        { name: "Groq (free, fast)", value: "groq" },
        { name: "OpenRouter (free tier, many models)", value: "openrouter" },
        { name: "OpenAI", value: "openai" },
        { name: "Anthropic", value: "anthropic" },
        { name: "Google Gemini", value: "gemini" },
        { name: "Grok (xAI)", value: "grok" },
      ],
    })) as LLMProvider;

    llmApiKey = await password({ message: `${llmProvider} API key:` });

    const defaultModels: Record<string, string> = {
      groq: "meta-llama/llama-4-scout-17b-16e-instruct",
      openrouter: "stepfun/step-3.5-flash:free",
      openai: "gpt-4o",
      anthropic: "claude-sonnet-4-20250514",
      gemini: "gemini-2.0-flash",
      grok: "grok-3-mini",
    };

    llmModel = await input({
      message: "Model name:",
      default: defaultModels[llmProvider] ?? "",
    });
  }

  return { token, username, repo, language, timezone, llmProvider, llmApiKey, llmModel };
};

// Setup actions

const ensureRepo = async (token: string, fullRepo: string): Promise<boolean> => {
  const res = await ghGet(token, `/repos/${fullRepo}`);
  if (res.ok) return false; // already exists

  const [owner, name] = fullRepo.split("/");
  const userRes = await ghGet(token, "/user");
  const user = (await userRes.json()) as { login: string };

  const createRes =
    owner === user.login
      ? await ghPost(token, "/user/repos", { name, auto_init: true, private: false })
      : await ghPost(token, `/orgs/${owner}/repos`, { name, auto_init: true, private: false });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create repository ${fullRepo}: ${err}`);
  }
  return true;
};

const addWorkflowFile = async (
  token: string,
  repo: string,
  content: string,
): Promise<void> => {
  const path = ".github/workflows/weekly-report.yml";
  const existing = await ghGet(token, `/repos/${repo}/contents/${path}`);
  const sha = existing.ok ? ((await existing.json()) as { sha: string }).sha : undefined;

  const res = await ghPut(token, `/repos/${repo}/contents/${path}`, {
    message: "chore: add weekly report workflow",
    content: btoa(unescape(encodeURIComponent(content))),
    ...(sha ? { sha } : {}),
  });
  if (!res.ok) throw new Error(`Failed to add workflow: ${res.status}`);
};

const enablePages = async (token: string, repo: string): Promise<string> => {
  // Ensure gh-pages branch exists
  const refRes = await ghGet(token, `/repos/${repo}/git/ref/heads/main`);
  if (!refRes.ok) throw new Error("Cannot find main branch");
  const { object } = (await refRes.json()) as { object: { sha: string } };

  const ghPagesRes = await ghGet(token, `/repos/${repo}/git/ref/heads/gh-pages`);
  if (!ghPagesRes.ok) {
    await ghPost(token, `/repos/${repo}/git/refs`, {
      ref: "refs/heads/gh-pages",
      sha: object.sha,
    });
  }

  // Enable Pages
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

  // 1. Create or verify repo
  console.log(`\n  Setting up ${fullRepo}...`);
  const created = await ensureRepo(config.token, fullRepo);
  console.log(created ? `  Created repository ${fullRepo}` : `  Repository ${fullRepo} exists`);

  // 2. Set LLM secret
  if (config.llmProvider && config.llmApiKey) {
    const secretName = LLM_SECRET_NAMES[config.llmProvider] ?? "LLM_API_KEY";
    console.log(`  Setting secret ${secretName}...`);
    await setRepoSecret(config.token, fullRepo, secretName, config.llmApiKey);
    console.log(`  Secret ${secretName} set.`);
  }

  // 3. Add workflow file
  console.log("  Adding workflow...");
  const workflow = buildWorkflow({
    username: config.username,
    language: config.language,
    timezone: config.timezone,
    llmProvider: config.llmProvider,
    llmModel: config.llmModel,
    llmSecretName: config.llmProvider ? LLM_SECRET_NAMES[config.llmProvider] : undefined,
  });
  await addWorkflowFile(config.token, fullRepo, workflow);
  console.log("  Workflow added.");

  // 4. Enable GitHub Pages
  console.log("  Enabling GitHub Pages...");
  try {
    const url = await enablePages(config.token, fullRepo);
    console.log(`  Pages enabled: ${url}`);
  } catch {
    console.log("  Pages may already be enabled (or needs manual setup).");
  }

  // 5. Trigger first run
  console.log("  Triggering first daily fetch...");
  const dispatchRes = await ghPost(
    config.token,
    `/repos/${fullRepo}/actions/workflows/weekly-report.yml/dispatches`,
    { ref: "main" },
  );
  if (dispatchRes.ok) {
    console.log("  Workflow triggered.");
  } else {
    console.log("  Could not trigger workflow (you can run it manually from Actions tab).");
  }

  console.log(`
  Setup complete!

  Daily fetches run automatically at midnight UTC.
  To generate a weekly report, go to:
    https://github.com/${fullRepo}/actions
  and manually trigger the workflow.

  Your reports will appear at:
    https://${fullRepo.split("/")[0]}.github.io/${fullRepo.split("/")[1]}
`);
};

export const registerSetup = (program: Command): void => {
  program
    .command("setup")
    .description("Interactive setup: create repo, add workflow, configure secrets, enable Pages")
    .option("--repo <owner/repo>", "Use existing repository (skip repo creation prompt)")
    .action(async (opts: { repo?: string }) => {
      try {
        await run(opts.repo);
      } catch (error) {
        console.error("\n  Error:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};
