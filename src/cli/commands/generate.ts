// generate command: read github-data.yaml and generate LLM content

import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml, stringify as toYaml } from "yaml";
import { generateContent } from "../../llm/index.js";
import { getWeekId } from "../../deployer/week.js";
import { parseLocalDate } from "../../collector/date-range.js";
import type { WeeklyReportData, LLMProvider, Language } from "../../types.js";

const env = (key: string): string | undefined => process.env[key];

type GenerateOptions = {
  dataDir: string;
  llmProvider: LLMProvider;
  llmApiKey: string;
  llmModel: string;
  language: Language;
  timezone: string;
  date?: Date;
};

const resolveOptions = (
  cli: Record<string, string | undefined>,
): GenerateOptions => {
  const llmProvider = (cli.llmProvider ?? env("LLM_PROVIDER")) as LLMProvider | undefined;
  if (!llmProvider) throw new Error("LLM provider required. Pass --llm-provider or set LLM_PROVIDER.");

  const providerKeyMap: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    gemini: "GEMINI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    groq: "GROQ_API_KEY",
    grok: "GROK_API_KEY",
  };
  const llmApiKey = cli.llmApiKey
    ?? env(providerKeyMap[llmProvider] ?? "")
    ?? env("OPENAI_API_KEY")
    ?? env("ANTHROPIC_API_KEY")
    ?? env("GEMINI_API_KEY")
    ?? env("OPENROUTER_API_KEY")
    ?? env("GROQ_API_KEY")
    ?? env("GROK_API_KEY");
  if (!llmApiKey) throw new Error("LLM API key required. Pass --llm-api-key or set OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY / GROQ_API_KEY / GROK_API_KEY.");

  const llmModel = cli.llmModel ?? env("LLM_MODEL");
  if (!llmModel) throw new Error("LLM model required. Pass --llm-model or set LLM_MODEL.");

  const language = (cli.language ?? env("LANGUAGE") ?? "en") as Language;
  const timezone = cli.timezone ?? env("TIMEZONE") ?? "UTC";
  const date = cli.date ? parseLocalDate(cli.date, timezone) : undefined;

  return {
    dataDir: cli.dataDir ?? env("DATA_DIR") ?? "./data",
    llmProvider,
    llmApiKey,
    llmModel,
    language,
    timezone,
    date,
  };
};

const run = async (options: GenerateOptions): Promise<void> => {
  const weekId = getWeekId(options.date, options.timezone);
  const dataDir = join(options.dataDir, weekId.path);
  const dataPath = join(dataDir, "github-data.yaml");

  console.log(`Reading ${dataPath}...`);
  const raw = await readFile(dataPath, "utf-8");
  const data = parseYaml(raw) as WeeklyReportData;

  console.log(`Generating AI content (${options.llmProvider}/${options.llmModel}, lang: ${options.language})...`);
  const aiContent = await generateContent(
    { ...data, language: options.language },
    {
      provider: options.llmProvider,
      apiKey: options.llmApiKey,
      model: options.llmModel,
      language: options.language,
    },
  );

  if (!aiContent) {
    console.error("LLM returned no content.");
    process.exit(1);
  }

  const llmDataPath = join(dataDir, "llm-data.yaml");
  await writeFile(llmDataPath, toYaml(aiContent, { lineWidth: 120 }), "utf-8");
  console.log(`LLM data written to ${llmDataPath}`);
};

export const registerGenerate = (program: Command): void => {
  program
    .command("generate")
    .description("Generate AI content from fetched GitHub data")
    .option("--data-dir <dir>", "Data directory (env: DATA_DIR, default: ./data)")
    .option("--llm-provider <provider>", "LLM provider (env: LLM_PROVIDER)")
    .option("--llm-api-key <key>", "LLM API key (env: OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY)")
    .option("--llm-model <model>", "LLM model name (env: LLM_MODEL)")
    .option("--language <lang>", "Report language: en, ja (env: LANGUAGE, default: en)")
    .option("--timezone <tz>", "IANA timezone (env: TIMEZONE, default: UTC)")
    .option("--date <date>", "Date within the target week (YYYY-MM-DD, default: today)")
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
