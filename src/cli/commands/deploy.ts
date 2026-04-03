// deploy command: push generated report directory to gh-pages branch

import { Command } from "commander";
import { deploy } from "../../deployer/index.js";
import { getWeekId } from "../../deployer/week.js";

type DeployCommandOptions = {
  directory: string;
  repoUrl: string;
  timezone: string;
};

const env = (key: string): string | undefined => process.env[key];

const buildRepoUrl = (repo: string | undefined): string => {
  const repoSlug = repo ?? env("GITHUB_REPOSITORY");
  if (!repoSlug) {
    throw new Error("Repository required. Pass --repo or set GITHUB_REPOSITORY.");
  }

  // Already a full URL
  if (repoSlug.startsWith("http") || repoSlug.startsWith("git@")) {
    const token = env("GITHUB_TOKEN");
    if (token && repoSlug.startsWith("https://github.com/")) {
      return repoSlug.replace("https://github.com/", `https://x-access-token:${token}@github.com/`);
    }
    return repoSlug;
  }

  // owner/repo slug
  const token = env("GITHUB_TOKEN");
  if (token) {
    return `https://x-access-token:${token}@github.com/${repoSlug}.git`;
  }
  return `https://github.com/${repoSlug}.git`;
};

const run = async (options: DeployCommandOptions): Promise<void> => {
  const weekId = getWeekId(undefined, options.timezone);

  console.log(`Deploying ${options.directory} to gh-pages...`);
  await deploy({
    repoUrl: options.repoUrl,
    directory: options.directory,
    message: `report: ${weekId.path}`,
  });
  console.log("Deployed successfully!");
};

export const registerDeploy = (program: Command): void => {
  program
    .command("deploy")
    .description("Deploy generated report to GitHub Pages (gh-pages branch)")
    .option("-d, --directory <dir>", "Directory containing generated report files (env: OUTPUT_DIR, default: ./report)")
    .option("-r, --repo <slug>", "Repository (owner/repo or full URL, env: GITHUB_REPOSITORY)")
    .option("--timezone <tz>", "IANA timezone (env: TIMEZONE, default: UTC)")
    .action(async (opts) => {
      try {
        const timezone = opts.timezone ?? env("TIMEZONE") ?? "UTC";
        const repoUrl = buildRepoUrl(opts.repo);
        await run({
          directory: opts.directory ?? env("OUTPUT_DIR") ?? "./report",
          repoUrl,
          timezone,
        });
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};
