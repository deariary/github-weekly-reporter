// setup command: interactive one-command setup for GitHub Weekly Reporter

import { Command } from "commander";
import { input, select, password, confirm } from "@inquirer/prompts";
import type { LLMProvider, Language } from "../../types.js";
import { validateToken, ensureRepo, setRepoTopics, addFileToRepo, enablePages, setRepoSecret, ghGet, ghPost, sleep } from "./setup/github-api.js";
import { midnightCronUTC, buildDailyWorkflow, buildWeeklyWorkflow, buildReadme, LLM_SECRET_NAMES } from "./setup/workflows.js";
import type { WorkflowOpts } from "./setup/workflows.js";
import { TIMEZONE_CHOICES, LANGUAGE_CHOICES, MODEL_LIST_URLS } from "./setup/constants.js";
import { validateModel } from "./setup/validate-model.js";
import { withSpinner } from "../spinner.js";

// Re-export for tests and external consumers
export { midnightCronUTC, buildDailyWorkflow, buildWeeklyWorkflow } from "./setup/workflows.js";
export type { WorkflowOpts } from "./setup/workflows.js";

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
  console.log("    Permissions: Actions, Administration, Contents,");
  console.log("                 Pages, Secrets, Workflows (all Read & Write)\n");

  const token = await password({
    message: "GitHub personal access token:",
    validate: (v) => (v.length > 0 ? true : "Token is required"),
  });

  const { login } = await withSpinner("Validating token...", () => validateToken(token));
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
    default: "Dev\\nPulse",
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
        { name: "OpenRouter   - Free tier, 25+ free models (recommended)", value: "openrouter" },
        { name: "Groq        - Free tier, fast inference",              value: "groq" },
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

      const result = await withSpinner("Validating model...", () => validateModel(llmProvider, llmApiKey!, llmModel!));
      if (result.valid) {
        console.log("");
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
  console.log(`  Site title:    ${config.siteTitle.replace(/\\n/g, " ")}`);
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
  await setRepoTopics(config.token, fullRepo);
  ok("Topics configured.");

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

  // 4. Workflows
  step("Adding workflows...");
  const workflowOpts: WorkflowOpts = {
    username: config.username,
    language: config.language,
    timezone: config.timezone,
    siteTitle: config.siteTitle,
    llmProvider: config.llmProvider,
    llmModel: config.llmModel,
    llmSecretName: config.llmProvider
      ? LLM_SECRET_NAMES[config.llmProvider]
      : undefined,
  };
  await addFileToRepo(
    config.token,
    fullRepo,
    ".github/workflows/daily-fetch.yml",
    buildDailyWorkflow(workflowOpts),
    "chore: add daily fetch workflow",
  );
  ok("daily-fetch.yml added.");
  await addFileToRepo(
    config.token,
    fullRepo,
    ".github/workflows/weekly-report.yml",
    buildWeeklyWorkflow(workflowOpts),
    "chore: add weekly report workflow",
  );
  ok("weekly-report.yml added.");

  // 5. README
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

  // 6. GitHub Pages
  step("Enabling GitHub Pages...");
  try {
    const url = await enablePages(config.token, fullRepo);
    ok(`Pages enabled: ${url}`);
  } catch {
    ok("Pages may already be enabled or require manual setup.");
    ok(`Enable at: https://github.com/${fullRepo}/settings/pages`);
  }

  // 7. Trigger first weekly report
  step("Generating first weekly report...");
  const dispatchRes = await ghPost(
    config.token,
    `/repos/${fullRepo}/actions/workflows/weekly-report.yml/dispatches`,
    { ref: "main" },
  );

  let runUrl = `https://github.com/${fullRepo}/actions`;
  if (dispatchRes.ok) {
    ok("Weekly report workflow triggered.");
    // Wait briefly then fetch the latest run URL
    await sleep(3000);
    const runsRes = await ghGet(
      config.token,
      `/repos/${fullRepo}/actions/workflows/weekly-report.yml/runs?per_page=1`,
    );
    if (runsRes.ok) {
      const runs = (await runsRes.json()) as { workflow_runs: { html_url: string }[] };
      if (runs.workflow_runs.length > 0) {
        runUrl = runs.workflow_runs[0].html_url;
      }
    }
    ok(`Progress: ${runUrl}`);
  } else {
    ok("Could not auto-trigger. Run manually:");
    ok(`${runUrl} > Weekly Report > Run workflow`);
  }

  // Done
  console.log(`
  ──────────────────────────────────────────────
  Setup complete!
  ──────────────────────────────────────────────

  Repository:         https://github.com/${fullRepo}
  Triggered build:    ${runUrl}

  Your first weekly report is being generated now.
  Once complete, it will be available at:
    ${pagesUrl}

  Daily fetches will run automatically at midnight ${config.timezone}.

  To change settings, edit:
    .github/workflows/daily-fetch.yml   (schedule, timezone)
    .github/workflows/weekly-report.yml (LLM, language, site title)
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
