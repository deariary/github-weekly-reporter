// generate command: read github-data.yaml and generate LLM content

import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml, stringify as toYaml } from "yaml";
import { generateContent } from "../../llm/index.js";
import { getWeekId } from "../../deployer/week.js";
import { loadConfig } from "../config.js";
import type { WeeklyReportData, LLMProvider } from "../../types.js";

const env = (key: string): string | undefined => process.env[key];

type GenerateOptions = {
  output: string;
  llmProvider: LLMProvider;
  llmApiKey: string;
  llmModel: string;
};

const resolveOptions = async (
  cli: Record<string, string | undefined>,
): Promise<GenerateOptions> => {
  const config = await loadConfig();

  const llmProvider = (cli.llmProvider ?? env("LLM_PROVIDER") ?? config.llm?.provider) as LLMProvider | undefined;
  if (!llmProvider) throw new Error("LLM provider required. Pass --llm-provider, set LLM_PROVIDER, or add to config file.");

  const llmApiKey = cli.llmApiKey
    ?? env("OPENAI_API_KEY")
    ?? env("ANTHROPIC_API_KEY")
    ?? env("GEMINI_API_KEY");
  if (!llmApiKey) throw new Error("LLM API key required. Pass --llm-api-key or set OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY.");

  const llmModel = cli.llmModel ?? env("LLM_MODEL") ?? config.llm?.model;
  if (!llmModel) throw new Error("LLM model required. Pass --llm-model, set LLM_MODEL, or add to config file.");

  return {
    output: cli.output ?? config.output ?? "./report",
    llmProvider,
    llmApiKey,
    llmModel,
  };
};

const run = async (options: GenerateOptions): Promise<void> => {
  const weekId = getWeekId();
  const reportDir = join(options.output, weekId.path);
  const dataPath = join(reportDir, "github-data.yaml");

  console.log(`Reading ${dataPath}...`);
  const raw = await readFile(dataPath, "utf-8");
  const data = parseYaml(raw) as WeeklyReportData;

  console.log(`Generating AI content (${options.llmProvider}/${options.llmModel})...`);
  const aiContent = await generateContent(data, {
    provider: options.llmProvider,
    apiKey: options.llmApiKey,
    model: options.llmModel,
  });

  if (!aiContent) {
    console.error("LLM returned no content.");
    process.exit(1);
  }

  const llmDataPath = join(reportDir, "llm-data.yaml");
  await writeFile(llmDataPath, toYaml(aiContent, { lineWidth: 120 }), "utf-8");
  console.log(`LLM data written to ${llmDataPath}`);
};

export const registerGenerate = (program: Command): void => {
  program
    .command("generate")
    .description("Generate AI content from fetched GitHub data")
    .option("-o, --output <dir>", "Output directory (config: output)")
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
