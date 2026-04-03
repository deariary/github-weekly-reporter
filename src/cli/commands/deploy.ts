// deploy command: push generated report directory to gh-pages branch

import { Command } from "commander";
import { deploy } from "../../deployer/index.js";
import { getWeekId } from "../../deployer/week.js";

type DeployCommandOptions = {
  directory: string;
  repo: string;
};

const run = async (options: DeployCommandOptions): Promise<void> => {
  const weekId = getWeekId();

  console.log(`Deploying ${options.directory} to gh-pages...`);
  await deploy({
    repoUrl: options.repo,
    directory: options.directory,
    message: `report: ${weekId.path}`,
  });
  console.log("Deployed successfully!");
};

export const registerDeploy = (program: Command): void => {
  program
    .command("deploy")
    .description("Deploy generated report to GitHub Pages (gh-pages branch)")
    .requiredOption("-d, --directory <dir>", "Directory containing generated report files", "./report")
    .requiredOption("-r, --repo <url>", "Repository URL to push to (e.g. https://github.com/user/repo.git)")
    .action(async (opts) => {
      try {
        await run({
          directory: opts.directory,
          repo: opts.repo,
        });
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
};
