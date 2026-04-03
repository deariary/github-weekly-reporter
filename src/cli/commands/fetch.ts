// fetch command: collect GitHub data and save as YAML

import { Command } from "commander";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { stringify as toYaml } from "yaml";
import { collectWeeklyData } from "../../collector/index.js";
import { getWeekId } from "../../deployer/week.js";
import { loadConfig } from "../config.js";

const env = (key: string): string | undefined => process.env[key];

type FetchOptions = {
  token: string;
  username: string;
  output: string;
};

const resolveOptions = async (
  cli: Record<string, string | undefined>,
): Promise<FetchOptions> => {
  const config = await loadConfig();

  const token = cli.token ?? env("GITHUB_TOKEN");
  if (!token) throw new Error("GitHub token required. Pass --token or set GITHUB_TOKEN.");

  const username = cli.username ?? env("GITHUB_USERNAME") ?? config.username;
  if (!username) throw new Error("GitHub username required. Pass --username, set GITHUB_USERNAME, or add to config file.");

  return {
    token,
    username,
    output: cli.output ?? config.output ?? "./report",
  };
};

const run = async (options: FetchOptions): Promise<void> => {
  const weekId = getWeekId();

  console.log(`Collecting GitHub data for ${options.username}...`);
  const data = await collectWeeklyData(options.token, options.username);

  const reportDir = join(options.output, weekId.path);
  await mkdir(reportDir, { recursive: true });

  const { aiContent: _, ...githubData } = data;
  const dataPath = join(reportDir, "github-data.yaml");
  await writeFile(dataPath, toYaml(githubData, { lineWidth: 120 }), "utf-8");
  console.log(`GitHub data written to ${dataPath}`);
};

export const registerFetch = (program: Command): void => {
  program
    .command("fetch")
    .description("Collect GitHub activity data and save as YAML")
    .option("-t, --token <token>", "GitHub token (env: GITHUB_TOKEN)")
    .option("-u, --username <username>", "GitHub username (env: GITHUB_USERNAME, config: username)")
    .option("-o, --output <dir>", "Output directory (config: output)")
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
