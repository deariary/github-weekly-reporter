// Deploy a directory to gh-pages branch

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

const git = (args: string[], cwd: string) =>
  exec("git", args, { cwd });

export type DeployOptions = {
  repoUrl: string;
  directory: string;
  message?: string;
};

export const deploy = async (options: DeployOptions): Promise<void> => {
  const { repoUrl, directory, message = "deploy" } = options;

  await git(["init"], directory);
  await git(["checkout", "--orphan", "gh-pages"], directory);
  await git(["add", "."], directory);
  await git(["config", "user.name", "github-weekly-reporter"], directory);
  await git(["config", "user.email", "github-weekly-reporter@users.noreply.github.com"], directory);
  await git(["commit", "-m", message], directory);
  await git(["push", repoUrl, "gh-pages", "--force"], directory);
};
