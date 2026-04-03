// generate command: collect data, render HTML, write files to output directory

import { Command } from "commander";
import { writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { stringify as toYaml } from "yaml";
import { collectWeeklyData } from "../../collector/index.js";
import { renderReport } from "../../renderer/index.js";
import { generateNarrative } from "../../llm/index.js";
import { renderIndexPage } from "../../deployer/index-page.js";
import { getWeekId } from "../../deployer/week.js";
import { loadConfig } from "../config.js";
import type { Theme, LLMProvider } from "../../types.js";

type GenerateOptions = {
  token: string;
  username: string;
  output: string;
  theme: Theme;
  llmProvider?: LLMProvider;
  llmApiKey?: string;
  llmModel?: string;
};

const env = (key: string): string | undefined => process.env[key];

// Priority: CLI flag > env var > config file
const resolveOptions = async (
  cli: Record<string, string | undefined>,
): Promise<GenerateOptions> => {
  const config = await loadConfig();

  const token = cli.token ?? env("GITHUB_TOKEN");
  if (!token) {
    throw new Error("GitHub token required. Pass --token or set GITHUB_TOKEN.");
  }

  const username = cli.username ?? env("GITHUB_USERNAME") ?? config.username;
  if (!username) {
    throw new Error("GitHub username required. Pass --username, set GITHUB_USERNAME, or add to config file.");
  }

  const llmProvider = (cli.llmProvider ?? env("LLM_PROVIDER") ?? config.llm?.provider) as LLMProvider | undefined;
  const llmApiKey = cli.llmApiKey
    ?? env("OPENAI_API_KEY")
    ?? env("ANTHROPIC_API_KEY")
    ?? env("GEMINI_API_KEY");
  const llmModel = cli.llmModel ?? env("LLM_MODEL") ?? config.llm?.model;

  return {
    token,
    username,
    output: cli.output ?? config.output ?? "./report",
    theme: (cli.theme ?? config.theme ?? "default") as Theme,
    llmProvider,
    llmApiKey,
    llmModel,
  };
};

const listReportDirs = async (dir: string): Promise<string[]> => {
  const paths: string[] = [];
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return paths;
  }

  for (const year of entries.filter((n) => /^\d{4}$/.test(n))) {
    const weeks = await readdir(join(dir, year));
    weeks
      .filter((n) => /^W\d{2}$/.test(n))
      .forEach((w) => paths.push(`${year}/${w}`));
  }
  return paths;
};

const run = async (options: GenerateOptions): Promise<void> => {
  const weekId = getWeekId();

  console.log(`Collecting data for ${options.username}...`);
  const data = await collectWeeklyData(options.token, options.username);

  if (options.llmProvider && options.llmApiKey && options.llmModel) {
    console.log(`Generating AI narrative (${options.llmProvider}/${options.llmModel})...`);
    data.aiNarrative = await generateNarrative(data, {
      provider: options.llmProvider,
      apiKey: options.llmApiKey,
      model: options.llmModel,
    });
  }

  console.log(`Rendering report (theme: ${options.theme})...`);
  const html = renderReport(data, options.theme);

  // Write report and raw data to week directory
  const reportDir = join(options.output, weekId.path);
  await mkdir(reportDir, { recursive: true });

  const reportPath = join(reportDir, "index.html");
  await writeFile(reportPath, html, "utf-8");
  console.log(`Report written to ${reportPath}`);

  const dataPath = join(reportDir, "data.yaml");
  await writeFile(dataPath, toYaml(data, { lineWidth: 120 }), "utf-8");
  console.log(`Raw data written to ${dataPath}`);

  // Write index page
  const allReports = await listReportDirs(options.output);
  if (!allReports.includes(weekId.path)) allReports.push(weekId.path);
  const indexHtml = renderIndexPage(allReports, options.theme);
  const indexPath = join(options.output, "index.html");
  await writeFile(indexPath, indexHtml, "utf-8");
  console.log(`Index written to ${indexPath}`);
};

export const registerGenerate = (program: Command): void => {
  program
    .command("generate")
    .description("Collect GitHub data and generate a weekly report")
    .option("-t, --token <token>", "GitHub token (env: GITHUB_TOKEN)")
    .option("-u, --username <username>", "GitHub username (env: GITHUB_USERNAME, config: username)")
    .option("-o, --output <dir>", "Output directory (config: output)")
    .option("--theme <theme>", "Report theme (config: theme)")
    .option("--llm-provider <provider>", "LLM provider (env: LLM_PROVIDER, config: llm.provider)")
    .option("--llm-api-key <key>", "LLM API key (env: OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY)")
    .option("--llm-model <model>", "LLM model name (env: LLM_MODEL, config: llm.model)")
    .action(async (opts) => {
      try {
        const options = await resolveOptions(opts);
        await run(options);
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};
