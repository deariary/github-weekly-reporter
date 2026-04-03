// generate command: collect data, render HTML, write files to output directory

import { Command } from "commander";
import { writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { collectWeeklyData } from "../../collector/index.js";
import { renderReport } from "../../renderer/index.js";
import { generateNarrative } from "../../llm/index.js";
import { renderIndexPage } from "../../deployer/index-page.js";
import { getWeekId } from "../../deployer/week.js";
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

const resolveOptions = (opts: Record<string, string | undefined>): GenerateOptions => {
  const token = opts.token ?? env("GITHUB_TOKEN");
  if (!token) {
    throw new Error("GitHub token is required. Pass --token or set GITHUB_TOKEN environment variable.");
  }

  const username = opts.username ?? env("GITHUB_USERNAME");
  if (!username) {
    throw new Error("GitHub username is required. Pass --username or set GITHUB_USERNAME environment variable.");
  }

  const llmProvider = (opts.llmProvider ?? env("LLM_PROVIDER")) as LLMProvider | undefined;
  const llmApiKey = opts.llmApiKey
    ?? env("OPENAI_API_KEY")
    ?? env("ANTHROPIC_API_KEY")
    ?? env("GEMINI_API_KEY");
  const llmModel = opts.llmModel ?? env("LLM_MODEL");

  return {
    token,
    username,
    output: opts.output ?? "./report",
    theme: (opts.theme ?? "default") as Theme,
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

  // Write report to week directory
  const reportDir = join(options.output, weekId.path);
  await mkdir(reportDir, { recursive: true });
  const reportPath = join(reportDir, "index.html");
  await writeFile(reportPath, html, "utf-8");
  console.log(`Report written to ${reportPath}`);

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
    .option("-t, --token <token>", "GitHub token (or GITHUB_TOKEN env)")
    .option("-u, --username <username>", "GitHub username (or GITHUB_USERNAME env)")
    .option("-o, --output <dir>", "Output directory", "./report")
    .option("--theme <theme>", "Report theme (default, dark)", "default")
    .option("--llm-provider <provider>", "LLM provider (or LLM_PROVIDER env)")
    .option("--llm-api-key <key>", "LLM API key (or OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY env)")
    .option("--llm-model <model>", "LLM model name (or LLM_MODEL env)")
    .action(async (opts) => {
      try {
        const options = resolveOptions(opts);
        await run(options);
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};
