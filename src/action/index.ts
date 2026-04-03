// GitHub Action entrypoint: reads inputs, calls CLI modules

import * as core from "@actions/core";
import { writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { collectWeeklyData } from "../collector/index.js";
import { renderReport } from "../renderer/index.js";
import { generateNarrative } from "../llm/index.js";
import { renderIndexPage } from "../deployer/index-page.js";
import { getWeekId } from "../deployer/week.js";
import { deploy } from "../deployer/index.js";
import type { Theme, LLMProvider } from "../types.js";

const detectLLMConfig = () => {
  const provider = core.getInput("llm-provider") as LLMProvider | "";
  const openaiKey = core.getInput("openai-api-key");
  const anthropicKey = core.getInput("anthropic-api-key");
  const geminiKey = core.getInput("gemini-api-key");
  const model = core.getInput("llm-model");

  // Find the first available key
  const entries: { provider: LLMProvider; key: string }[] = [
    { provider: "openai", key: openaiKey },
    { provider: "anthropic", key: anthropicKey },
    { provider: "gemini", key: geminiKey },
  ];
  const found = entries.find((e) => e.key);

  if (!found) return null;

  const resolvedProvider = (provider || found.provider) as LLMProvider;
  if (!model) return null;

  return { provider: resolvedProvider, apiKey: found.key, model };
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

const run = async (): Promise<void> => {
  const token = core.getInput("github-token", { required: true });
  const username = core.getInput("username") || process.env.GITHUB_ACTOR || "";
  const theme = (core.getInput("theme") || "default") as Theme;

  if (!username) {
    throw new Error("Could not determine username. Set the 'username' input or GITHUB_ACTOR.");
  }

  const weekId = getWeekId();
  const outputDir = "./report";

  // Generate
  core.info(`Collecting data for ${username}...`);
  const data = await collectWeeklyData(token, username);

  const llmConfig = detectLLMConfig();
  if (llmConfig) {
    core.info(`Generating AI narrative (${llmConfig.provider}/${llmConfig.model})...`);
    data.aiNarrative = await generateNarrative(data, llmConfig);
  }

  core.info(`Rendering report (theme: ${theme})...`);
  const html = renderReport(data, theme);

  const reportDir = join(outputDir, weekId.path);
  await mkdir(reportDir, { recursive: true });
  await writeFile(join(reportDir, "index.html"), html, "utf-8");

  const allReports = await listReportDirs(outputDir);
  if (!allReports.includes(weekId.path)) allReports.push(weekId.path);
  await writeFile(join(outputDir, "index.html"), renderIndexPage(allReports, theme), "utf-8");

  // Deploy
  const repoUrl = `https://x-access-token:${token}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
  core.info("Deploying to gh-pages...");
  await deploy({ repoUrl, directory: outputDir, message: `report: ${weekId.path}` });

  core.info(`Deployed: ${weekId.path}`);
  core.setOutput("report-url", weekId.path);
};

run().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
