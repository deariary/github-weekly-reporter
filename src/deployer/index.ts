// Deploy output directory by committing to the current branch and pushing

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

const git = (args: string[], cwd?: string) =>
  exec("git", args, { cwd });

export type DeployOptions = {
  repoUrl: string;
  directory: string;
  message?: string;
};

export const deploy = async (options: DeployOptions): Promise<void> => {
  const { directory, message = "deploy" } = options;

  // Stage output files and commit to current branch
  await git(["add", "-f", directory]);

  const { stdout } = await git(["status", "--porcelain"]);
  if (!stdout.trim()) {
    console.log("No changes to deploy.");
    return;
  }

  await git(["commit", "-m", message]);
  await git(["push"]);
};
