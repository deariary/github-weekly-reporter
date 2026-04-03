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
    .requiredOption("-t, --token <token>", "GitHub personal access token (or set GITHUB_TOKEN)")
    .requiredOption("-u, --username <username>", "GitHub username")
    .option("-o, --output <dir>", "Output directory", "./report")
    .option("--theme <theme>", "Report theme (default, dark)", "default")
    .option("--llm-provider <provider>", "LLM provider (openai, anthropic, gemini)")
    .option("--llm-api-key <key>", "LLM API key")
    .option("--llm-model <model>", "LLM model name")
    .action(async (opts) => {
      try {
        await run({
          token: opts.token ?? process.env.GITHUB_TOKEN,
          username: opts.username,
          output: opts.output,
          theme: opts.theme as Theme,
          llmProvider: opts.llmProvider as LLMProvider | undefined,
          llmApiKey: opts.llmApiKey,
          llmModel: opts.llmModel,
        });
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};
